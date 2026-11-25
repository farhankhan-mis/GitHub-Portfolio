// Daily refresh: reads every employer feed in data/sources.json, keeps US student and early-career postings,
// classifies them, and merges them into opportunities.json.
//   - A feed posting that is still listed stays Active with today's last_verified date.
//   - A feed-tracked posting that disappeared from a feed that loaded successfully is marked Closed.
//   - A board that fails to load leaves its records untouched (no mass closures on an outage).
//   - Hand-entered records that no feed tracks are left exactly as they are.
// Usage: node scripts/refresh_catalog.mjs [--dry-run]
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { root, catalogPath, readCatalog, canonicalKey } from './catalog_core.mjs';
import { READERS, sourceIdFromUrl } from './lib/feeds.mjs';
import { isEarlyCareer, opportunityType, scheduleType, term, classifyRole, parseLocations, workMode } from './lib/classify.mjs';

const DRY_RUN = process.argv.includes('--dry-run');
const OUT = process.argv.find((a) => a.startsWith('--out='))?.slice(6);
const TODAY = process.env.CATALOG_TODAY || new Date().toISOString().slice(0, 10);
const PRUNE_CLOSED_AFTER_DAYS = 45;
const MAX_ACTIVE_DROP = 0.5;
const statusPath = path.join(root, 'data', 'refresh-status.json');

const { sources } = JSON.parse(await fs.readFile(path.join(root, 'data', 'sources.json'), 'utf8'));
const badSources = sources.filter((s) => !READERS[s.ats] || !/^[A-Za-z0-9._-]+$/.test(s.slug));
if (badSources.length) throw new Error(`data/sources.json has invalid entries: ${badSources.map((s) => `${s.ats}:${s.slug}`).join(', ')}`);
if (new Set(sources.map((s) => `${s.ats}:${s.slug.toLowerCase()}`)).size !== sources.length) throw new Error('data/sources.json lists the same board twice');
const records = await readCatalog();
const days = (from, to = TODAY) => Math.floor((new Date(`${to}T12:00:00Z`) - new Date(`${from}T12:00:00Z`)) / 86400000);

// 1. Read every feed with modest concurrency.
const boardResults = new Map();
let cursor = 0;
await Promise.all(Array.from({ length: 6 }, async () => {
  while (cursor < sources.length) {
    const source = sources[cursor++];
    const key = `${source.ats}:${source.slug}`;
    try {
      const postings = await READERS[source.ats](source);
      boardResults.set(key, { ok: true, source, postings });
    } catch (error) {
      boardResults.set(key, { ok: false, source, error: String(error.message || error) });
    }
  }
}));

// 2. Keep US student and early-career postings and turn them into catalog records.
const skipped = { notEarlyCareer: 0, outsideUS: 0, unclearLocation: 0, deadlinePassed: 0, insecureUrl: 0 };
const fresh = new Map();
for (const { ok, source, postings } of boardResults.values()) {
  if (!ok) continue;
  for (const p of postings) {
    if (!isEarlyCareer(p.title)) { skipped.notEarlyCareer++; continue; }
    const loc = parseLocations(p.locations, p.remote);
    if (!loc.us) { skipped[loc.reason === 'outside the US' ? 'outsideUS' : 'unclearLocation']++; continue; }
    if (p.deadline && p.deadline < TODAY) { skipped.deadlinePassed++; continue; }
    if (!/^https:\/\//.test(p.url || '')) { skipped.insecureUrl++; continue; }
    const type = p.experience === 'internship' && !/co-?op|apprentice|fellow/i.test(p.title) ? 'Internship' : opportunityType(p.title, p.employment);
    const role = classifyRole(p.title, p.department, source.default_role ? { role_key: source.default_role, field_key: source.default_field } : null);
    fresh.set(p.source_id, { posting: p, source, type, role, loc });
  }
}

// 3. Merge with the existing catalog.
const bySourceId = new Map();
const greenhouseById = new Map();
for (const record of records) {
  const sid = record.source_id || sourceIdFromUrl(record.posting_url);
  if (!sid) continue;
  bySourceId.set(sid, record);
  if (sid.startsWith('greenhouse:')) greenhouseById.set(sid.split(':')[2], record);
}
// Every posting each successfully loaded board lists, filtered or not, so "still listed" is judged on the whole board.
const listed = new Set();
const listedGreenhouseIds = new Set();
for (const b of boardResults.values()) if (b.ok) for (const p of b.postings) {
  listed.add(p.source_id);
  if (p.ats === 'greenhouse') listedGreenhouseIds.add(p.source_id.split(':')[2]);
}
const boardOk = (sid) => {
  const [ats, slug, id] = sid.split(':');
  if (ats === 'greenhouse' && slug === '?') return false;
  return boardResults.get(`${ats}:${slug}`)?.ok === true && Boolean(id);
};
const stillListed = (sid) => listed.has(sid) || (sid.startsWith('greenhouse:') && listedGreenhouseIds.has(sid.split(':')[2]));

const describe = ({ posting: p, type, loc, role }) => {
  const where = /^Remote/.test(loc.label) ? 'remote within the US' : `in ${loc.label.replace(' · Remote option', '')}${loc.remote ? ', with a remote option' : ''}`;
  return `${type} at ${p.company} in ${role.role_key.toLowerCase()}, ${where}. Listed on ${p.company}'s own job board${p.department ? ` under ${p.department}` : ''}. Open the posting for the full description, eligibility and how to apply.`;
};
// Builds every derived field of a feed listing from the current rules, so rule fixes apply to old listings too.
function feedFields(sid, match) {
  const { posting: p, type, role, loc } = match;
  return {
    company: p.company, role: p.title, location: loc.label,
    city: loc.cities.length === 1 ? loc.cities[0] : loc.cities.length ? 'Multiple' : 'Remote',
    state: loc.states.length ? loc.states.join('/') : 'Remote',
    role_family: role.role_key, field_key: role.field_key, role_key: role.role_key, industry: match.source.industry || 'Not listed',
    opportunity_type: type, employment_type: type, schedule_type: scheduleType(p.title, p.employment),
    work_mode: workMode(p.locations.join(' '), p.workplace, loc.remote),
    posting_url: p.url, source: 'Public job feed', source_id: sid,
    department: p.department || null,
    tags: [role.role_key],
    deadline: p.deadline, term: term(p.title, type), listing_status: 'Active',
    details_eligibility: '', description: describe(match),
    link_type: 'Employer / ATS', posting_verification: 'Live employer job feed',
    last_verified: TODAY, posted_at: p.posted_at, classification: role.matched,
    is_active: true, is_demo: false,
  };
}
const counts = { added: 0, reverified: 0, reopened: 0, closed: 0, pruned: 0, outOfScope: 0 };
const output = [];

for (const record of records) {
  let sid = record.source_id || sourceIdFromUrl(record.posting_url);
  let match = sid && fresh.get(sid);
  if (!match && sid?.startsWith('greenhouse:')) {
    const id = sid.split(':')[2];
    for (const [key, value] of fresh) if (key.endsWith(`:${id}`) && key.startsWith('greenhouse:')) { match = value; sid = key; break; }
  }
  if (match && (match.posting.deadline || record.deadline || '9999') < TODAY) { fresh.delete(sid); match = null; }
  if (match) {
    fresh.delete(sid);
    const wasActive = record.listing_status === 'Active';
    if (record.source === 'Public job feed') {
      Object.assign(record, feedFields(sid, match));
    } else {
      // Hand-entered listing: keep its written details, update only what the feed confirms.
      Object.assign(record, {
        source_id: sid, listing_status: 'Active', is_active: true, last_verified: TODAY,
        posting_url: match.posting.url, posted_at: record.posted_at || match.posting.posted_at,
        deadline: match.posting.deadline || record.deadline || null,
        posting_verification: 'Live employer job feed',
      });
    }
    delete record.closed_on;
    record.canonical_key = canonicalKey({ ...record, canonical_key: null });
    counts[wasActive ? 'reverified' : 'reopened']++;
    output.push(record);
    continue;
  }
  const deadlinePassed = record.deadline && record.deadline < TODAY;
  if (record.source === 'Public job feed' && sid && stillListed(sid) && !deadlinePassed) {
    // Still posted but no longer passes the student/US filters (usually after a rule fix): it was never in scope.
    counts.outOfScope++;
    continue;
  }
  if (sid && stillListed(sid) && !deadlinePassed) {
    // Still on the employer's board but outside the automatic filters (often a hand-picked record): keep it and confirm it.
    if (record.listing_status !== 'Closed' || record.source !== 'Public job feed') {
      const wasActive = record.listing_status === 'Active';
      Object.assign(record, { source_id: sid, listing_status: 'Active', is_active: true, last_verified: TODAY, posting_verification: 'Live employer job feed' });
      delete record.closed_on;
      record.canonical_key = canonicalKey({ ...record, canonical_key: null });
      counts[wasActive ? 'reverified' : 'reopened']++;
    }
  } else if (sid && boardOk(sid) && record.listing_status !== 'Closed') {
    Object.assign(record, { source_id: sid, listing_status: 'Closed', is_active: false, closed_on: TODAY });
    record.canonical_key = canonicalKey({ ...record, canonical_key: null });
    counts.closed++;
  } else if (deadlinePassed && record.listing_status !== 'Closed') {
    Object.assign(record, { listing_status: 'Closed', is_active: false, closed_on: TODAY });
    counts.closed++;
  }
  if (record.listing_status === 'Closed' && record.closed_on && record.source === 'Public job feed' && days(record.closed_on) > PRUNE_CLOSED_AFTER_DAYS) { counts.pruned++; continue; }
  output.push(record);
}

for (const [sid, match] of fresh) {
  const record = { ...feedFields(sid, match), first_seen: TODAY };
  record.canonical_key = canonicalKey(record);
  record.id = crypto.createHash('sha256').update(record.canonical_key).digest('hex').slice(0, 16);
  output.push(record);
  counts.added++;
}

// 4. Safety checks before writing anything.
const failedBoards = [...boardResults.values()].filter((b) => !b.ok);
const activeBefore = records.filter((r) => r.listing_status === 'Active' && r.source_id).length;
const activeAfter = output.filter((r) => r.listing_status === 'Active' && r.source_id).length;
const problems = [];
if (failedBoards.length > sources.length / 3) problems.push(`${failedBoards.length} of ${sources.length} boards failed to load`);
if (activeBefore >= 50 && activeAfter < activeBefore * (1 - MAX_ACTIVE_DROP)) problems.push(`feed-tracked Active records fell from ${activeBefore} to ${activeAfter}`);

const seenIds = new Set();
for (const record of output) {
  while (seenIds.has(record.id)) record.id = crypto.createHash('sha256').update(`${record.id}:${record.canonical_key}`).digest('hex').slice(0, 16);
  seenIds.add(record.id);
}
output.sort((a, b) => (a.listing_status === 'Closed') - (b.listing_status === 'Closed') || String(a.company).localeCompare(String(b.company)) || String(a.role).localeCompare(String(b.role)));

const status = {
  last_run: new Date().toISOString(), run_date: TODAY, boards: sources.length, boards_failed: failedBoards.map((b) => ({ board: `${b.source.ats}:${b.source.slug}`, error: b.error.slice(0, 160) })),
  postings_read: [...boardResults.values()].reduce((sum, b) => sum + (b.postings?.length || 0), 0), skipped, ...counts,
  active_total: output.filter((r) => r.listing_status === 'Active').length,
  active_from_feeds: activeAfter, records_total: output.length,
};
console.log(JSON.stringify(status, null, 2));

if (problems.length) {
  console.error(`Refresh aborted, nothing written: ${problems.join('; ')}`);
  process.exit(1);
}
if (OUT) await fs.writeFile(OUT, `${JSON.stringify(output, null, 2)}\n`);
else if (!DRY_RUN) {
  await fs.writeFile(catalogPath, `${JSON.stringify(output, null, 2)}\n`);
  await fs.writeFile(statusPath, `${JSON.stringify(status, null, 2)}\n`);
}
