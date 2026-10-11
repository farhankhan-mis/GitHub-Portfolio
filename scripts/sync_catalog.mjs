import { readCatalog, canonicalKey } from './catalog_core.mjs';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in encrypted secrets.');

// Only send columns owned by the database schema. The public catalog's short
// display ID must not be sent to Supabase's UUID id column.
const catalogColumns = [
  'company', 'role', 'location', 'role_family', 'field_key', 'role_key',
  'industry', 'opportunity_type', 'employment_type', 'schedule_type',
  'work_mode', 'posting_url', 'source_url', 'source', 'tags', 'deadline',
  'term', 'city', 'state', 'listing_status', 'details_eligibility',
  'description', 'link_type', 'posting_verification', 'last_verified',
  'education_requirements', 'experience_level',
];

const source = await readCatalog();
const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
const now = new Date().toISOString();
const rows = source.map((item) => {
  const row = Object.fromEntries(catalogColumns.filter((column) => item[column] !== undefined).map((column) => [column, item[column]]));
  return { ...row, canonical_key: canonicalKey(item), source_url: item.source_url || item.posting_url, posting_url: item.posting_url || item.source_url, is_active: item.listing_status === 'Active', is_demo: false, updated_at: now };
});

const upsert = await fetch(`${url}/rest/v1/opportunities_catalog?on_conflict=canonical_key`, { method: 'POST', headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(rows) });
if (!upsert.ok) throw new Error(`Catalog upsert failed: ${upsert.status} ${await upsert.text()}`);

const existing = await fetch(`${url}/rest/v1/opportunities_catalog?select=canonical_key&is_demo=eq.false`, { headers });
if (!existing.ok) throw new Error(`Catalog reconciliation read failed: ${existing.status}`);

const live = new Set(rows.map((row) => row.canonical_key));
const missing = (await existing.json()).map((row) => row.canonical_key).filter((value) => value && !live.has(value));
for (const canonical of missing) {
  const response = await fetch(`${url}/rest/v1/opportunities_catalog?canonical_key=eq.${encodeURIComponent(canonical)}`, { method: 'PATCH', headers: { ...headers, Prefer: 'return=minimal' }, body: JSON.stringify({ listing_status: 'Closed', is_active: false, updated_at: now }) });
  if (!response.ok) throw new Error(`Failed to close removed record ${canonical}: ${response.status} ${await response.text()}`);
}
console.log(`Synced ${rows.length} public records; closed ${missing.length} removed records.`);
