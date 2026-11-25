// Readers for documented public job-board APIs. Each returns normalized postings:
// { source_id, ats, board, company, title, department, locations[], remote, workplace, employment, posted_at, deadline, url }
// Only documented, unauthenticated posting APIs that exist for third-party job boards are used.

const USER_AGENT = 'OpportunityCatalog/1.0 (+https://github.com/farhankhan-mis/GitHub-Portfolio)';

async function getJson(url, attempt = 1) {
  try {
    const res = await fetch(url, { headers: { 'user-agent': USER_AGENT, accept: 'application/json' }, signal: AbortSignal.timeout(90000) });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return await res.json();
  } catch (error) {
    if (attempt < 2 && !/HTTP 404/.test(String(error.message))) return getJson(url, attempt + 1);
    throw error;
  }
}

const iso = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const d = new Date(typeof value === 'number' ? value : String(value));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

async function greenhouse({ slug, company }) {
  const data = await getJson(`https://boards-api.greenhouse.io/v1/boards/${slug}/departments`);
  const seen = new Set();
  const out = [];
  for (const dept of data.departments || []) {
    for (const job of dept.jobs || []) {
      if (seen.has(job.id)) continue;
      seen.add(job.id);
      out.push({
        source_id: `greenhouse:${slug}:${job.id}`, ats: 'greenhouse', board: slug,
        company: company || job.company_name, title: job.title.trim(), department: dept.name === 'No Department' ? '' : dept.name,
        locations: [job.location?.name || ''], remote: /remote/i.test(job.location?.name || ''), workplace: '', employment: '',
        posted_at: iso(job.first_published || job.updated_at), deadline: job.application_deadline ? String(job.application_deadline).slice(0, 10) : null,
        // Some employers list an http:// careers page; Greenhouse's own hosted posting page is always https.
        url: /^https:\/\//.test(job.absolute_url || '') ? job.absolute_url : `https://job-boards.greenhouse.io/${slug}/jobs/${job.id}`,
      });
    }
  }
  return out;
}

async function lever({ slug, company }) {
  const data = await getJson(`https://api.lever.co/v0/postings/${slug}?mode=json`);
  return data.map((job) => ({
    source_id: `lever:${slug}:${job.id}`, ats: 'lever', board: slug,
    company, title: job.text.trim(), department: [job.categories?.department, job.categories?.team].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(' / '),
    locations: job.categories?.allLocations?.length ? job.categories.allLocations : [job.categories?.location || ''],
    remote: job.workplaceType === 'remote', workplace: job.workplaceType || '', employment: job.categories?.commitment || '',
    posted_at: iso(job.createdAt), deadline: null, url: job.hostedUrl,
  }));
}

async function ashby({ slug, company }) {
  const data = await getJson(`https://api.ashbyhq.com/posting-api/job-board/${slug}`);
  return (data.jobs || []).filter((job) => job.isListed !== false).map((job) => ({
    source_id: `ashby:${slug}:${job.id}`, ats: 'ashby', board: slug,
    company, title: job.title.trim(), department: [job.department, job.team].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(' / '),
    locations: [job.location, ...(job.secondaryLocations || []).map((s) => s.location)].filter(Boolean),
    remote: Boolean(job.isRemote), workplace: job.workplaceType || '', employment: job.employmentType || '',
    posted_at: iso(job.publishedAt), deadline: null, url: job.jobUrl,
  }));
}

async function smartrecruiters({ slug, company }) {
  const out = [];
  for (let offset = 0; offset < 2000; offset += 100) {
    const data = await getJson(`https://api.smartrecruiters.com/v1/companies/${slug}/postings?limit=100&offset=${offset}&country=us`);
    for (const job of data.content || []) {
      const loc = job.location || {};
      out.push({
        source_id: `smartrecruiters:${slug}:${job.id}`, ats: 'smartrecruiters', board: slug,
        company: company || job.company?.name, title: job.name.trim(), department: [job.department?.label, job.function?.label].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(' / '),
        locations: [[loc.city, loc.region, loc.country === 'us' ? 'United States' : loc.country].filter(Boolean).join(', ')],
        remote: Boolean(loc.remote), workplace: loc.remote ? 'remote' : '', employment: job.typeOfEmployment?.label || '',
        experience: job.experienceLevel?.id || '',
        posted_at: iso(job.releasedDate), deadline: null, url: `https://jobs.smartrecruiters.com/${slug}/${job.id}`,
      });
    }
    if (!data.content || data.content.length < 100 || offset + 100 >= (data.totalFound || 0)) break;
  }
  return out;
}

export const READERS = { greenhouse, lever, ashby, smartrecruiters };

// Derives a feed source_id from a posting URL so older hand-entered records can be tracked by the feeds.
export function sourceIdFromUrl(url) {
  let u;
  try { u = new URL(url); } catch { return null; }
  let m;
  if (/(^|\.)greenhouse\.io$/.test(u.hostname) && (m = u.pathname.match(/^\/([^/]+)\/jobs\/(\d+)/))) return `greenhouse:${m[1]}:${m[2]}`;
  if (u.hostname === 'jobs.lever.co' && (m = u.pathname.match(/^\/([^/]+)\/([0-9a-f-]{36})/i))) return `lever:${m[1]}:${m[2]}`;
  if (u.hostname === 'jobs.ashbyhq.com' && (m = u.pathname.match(/^\/([^/]+)\/([0-9a-f-]{36})/i))) return `ashby:${m[1]}:${m[2]}`;
  if (u.hostname === 'jobs.smartrecruiters.com' && (m = u.pathname.match(/^\/([^/]+)\/(\d+)/))) return `smartrecruiters:${m[1]}:${m[2]}`;
  const gh = u.searchParams.get('gh_jid');
  return gh ? `greenhouse:?:${gh}` : null;
}
