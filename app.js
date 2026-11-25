'use strict';

if (window.location.protocol === 'file:') {
  window.location.replace('https://farhankhan-mis.github.io/GitHub-Portfolio/');
}

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const STORAGE_KEY = 'public-opportunity-catalog-tracker-v1';
const TRACKING_STATUSES = ['Saved', 'Planning', 'Applied', 'Interviewing', 'Offer', 'Rejected', 'Withdrawn', 'Closed'];
const ARCHIVED_STATUSES = new Set(['Rejected', 'Withdrawn', 'Closed']);
const PRE_APPLICATION_STATUSES = new Set(['Saved', 'Planning']);
const PAGE_SIZE = 25;
const MANUAL_FRESH_DAYS = 14;
const wide = window.matchMedia('(min-width: 960px)');

const TYPE_GROUPS = {
  internship: ['Internship'],
  coop: ['Co-op'],
  entry: ['Entry-level job', 'Full-time job'],
  fellowship: ['Fellowship', 'Research position'],
  parttime: ['Part-time job', 'On-campus job', 'Temporary or seasonal job', 'Contract role'],
  apprentice: ['Apprenticeship'],
};
const STATE_NAMES = { AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming' };
const EXTRA_MAJORS = ['Advertising','African American Studies','Animal Science','Archaeology','Biomedical Sciences','Business Law','Communication Sciences and Disorders','Community Health','Elementary Education','Environmental Studies','Ethnic Studies','Event Management','Family and Consumer Sciences','Foreign Languages','Gender and Women’s Studies','Global Studies','Healthcare Management','Human Services','Interdisciplinary Studies','Interior Design','Labor Relations','Music Business','Organizational Leadership','Peace and Conflict Studies','Recreation Management','Religious Studies','Secondary Education','Social Sciences','Sport Analytics','Theatre Production'];
const MAJOR_FIELD_GROUPS = {
  'Accounting & Finance': ['Accounting','Actuarial Science','Economics','Finance','Real Estate'],
  'Business & Management': ['Business Administration','Business Analytics','Engineering Management','Entrepreneurship','Human Resources Management','International Business','Management','Management Information Systems','Operations Management'],
  'Sales, Marketing & Customer Experience': ['Advertising','Marketing','Public Relations'],
  'Technology & Computing': ['Artificial Intelligence','Computer Engineering','Computer Information Systems','Computer Science','Cybersecurity','Game Design','Information Systems','Information Technology','Management Information Systems','Software Engineering','Web Development'],
  'Data, AI & Mathematics': ['Actuarial Science','Applied Mathematics','Artificial Intelligence','Business Analytics','Computer Science','Data Analytics','Data Science','Mathematics','Statistics'],
  'Engineering': ['Aerospace Engineering','Bioengineering','Biomedical Engineering','Chemical Engineering','Civil Engineering','Computer Engineering','Electrical Engineering','Engineering Management','Environmental Engineering','Industrial Engineering','Materials Science','Mechanical Engineering','Robotics'],
  'Physical Sciences': ['Astronomy','Chemistry','Forensic Science','Geology','Materials Science','Meteorology','Physics'],
  'Life Sciences & Biotechnology': ['Biochemistry','Bioengineering','Bioinformatics','Biology','Biotechnology','Marine Biology','Microbiology','Neuroscience','Veterinary Science','Wildlife Biology'],
  'Healthcare & Clinical': ['Athletic Training','Clinical Laboratory Science','Dental Hygiene','Health Administration','Health Informatics','Health Sciences','Nursing','Nutrition','Occupational Therapy','Pharmacy','Pre-Medicine','Radiologic Sciences'],
  'Public Health': ['Emergency Management','Global Health','Health Informatics','Health Sciences','Nutrition','Public Health'],
  'Education': ['Education','Library Science','Special Education'],
  'Social & Behavioral Sciences': ['American Studies','Anthropology','Economics','Geography','History','Linguistics','Philosophy','Political Science','Psychology','Social Work','Sociology'],
  'Government & Public Policy': ['Emergency Management','International Relations','Political Science','Public Administration','Public Policy','Urban Planning'],
  'Law, Compliance & Public Safety': ['Criminal Justice','Legal Studies','Paralegal Studies','Pre-Law'],
  'Arts, Design & Creative': ['Architecture','Art History','Fashion Design','Fine Arts','Game Design','Graphic Design','Industrial Design','Photography','Product Design','Theatre','User Experience Design'],
  'Media, Writing & Communications': ['Communications','English','Film & Media Studies','Journalism','Linguistics','Music','Photography','Public Relations','Theatre'],
  'Environment & Sustainability': ['Environmental Engineering','Environmental Science','Geography','Geology','Marine Biology','Sustainability','Urban Planning','Wildlife Biology'],
  'Agriculture, Food & Natural Resources': ['Agricultural Business','Agricultural Science','Food Science','Forestry','Veterinary Science','Wildlife Biology'],
  'Hospitality, Tourism & Events': ['Hospitality Management','Tourism Management'],
  'Sports, Fitness & Recreation': ['Athletic Training','Exercise Science','Kinesiology','Sports Management'],
  'Nonprofit & Community Services': ['Nonprofit Management','Public Administration','Social Work','Sociology'],
  'Architecture, Construction & Real Estate': ['Architecture','Civil Engineering','Construction Management','Real Estate','Urban Planning'],
  'Transportation, Logistics & Supply Chain': ['Industrial Engineering','Operations Management','Supply Chain Management'],
  'Skilled Trades & Technical Services': ['Engineering Technology','Construction Management'],
};

const controls = { query: $('#query'), where: $('#where'), posted: $('#posted'), field: $('#field'), major: $('#major'), term: $('#term'), sort: $('#sort') };
const state = {
  records: [], visible: [], filtered: [], shown: PAGE_SIZE, selected: null, view: 'catalog', trackerView: 'all',
  types: new Set(), modes: new Set(), tracker: loadTracker(), status: null, detailOpener: null,
};

// ---------- helpers ----------
function el(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(options)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'className') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else node.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children) if (child) node.append(child);
  return node;
}
function loadTracker() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
  } catch { return {}; }
}
function saveTracker() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tracker)); }
  catch { $('#localNote').textContent = 'Browser storage is unavailable, so saved jobs last only until this page closes.'; }
  $('#trackedCount').textContent = String(Object.keys(state.tracker).length);
}
const safeHttps = (value) => { try { const url = new URL(value); return url.protocol === 'https:' ? url.href : null; } catch { return null; } };
const localToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const toDate = (value) => { if (!value) return null; const d = new Date(String(value).length === 10 ? `${value}T12:00:00` : value); return Number.isNaN(d.getTime()) ? null : d; };
const daysSince = (value) => { const d = toDate(value); return d ? Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000)) : Infinity; };
const daysUntil = (value) => { const d = toDate(value); return d ? Math.ceil((d.getTime() - Date.now()) / 86400000) : Infinity; };
const dateLabel = (value) => { const d = toDate(value); return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not listed'; };
const plural = (n, word) => `${n.toLocaleString('en-US')} ${word}${n === 1 ? '' : 's'}`;
const isFeed = (record) => Boolean(record.source_id) || record.source === 'Public job feed';
// Only the employer's own posting date counts as "posted"; the date a listing was first seen here is not shown as one.
const postedOn = (record) => record.posted_at || null;
const trackingFor = (record) => state.tracker[String(record.id)];
function ageLabel(days) {
  if (!Number.isFinite(days)) return '';
  if (days === 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  return '30+ days ago';
}
function postedLabel(record) {
  const posted = postedOn(record);
  if (posted) return `Posted ${ageLabel(daysSince(posted))}`;
  return `Checked ${ageLabel(daysSince(record.last_verified))}`;
}
function placeAndMode(record) {
  const place = record.location || 'Location not listed';
  const mode = record.work_mode || '';
  return !mode || (/remote/i.test(place) && mode === 'Remote') ? place : `${place} · ${mode}`;
}
function toneFor(record) { return String([...String(record.company || '')].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 6); }
function companyMark(record, extraClass = '') { return el('span', { className: `company-mark ${extraClass}`.trim(), 'aria-hidden': 'true', dataset: { tone: toneFor(record) }, text: (record.company || '?').trim().slice(0, 1).toUpperCase() }); }

// A listing is shown in search only while it's open: feed listings are rechecked daily,
// hand-verified listings must have been verified within MANUAL_FRESH_DAYS.
function isOpen(record) {
  if (record.listing_status !== 'Active') return false;
  if (record.deadline && record.deadline < localToday()) return false;
  return isFeed(record) || daysSince(record.last_verified) <= MANUAL_FRESH_DAYS;
}
function searchText(record) {
  if (!record._text) record._text = [record.role, record.company, record.field_key, record.role_key, record.role_family, record.industry, record.opportunity_type, record.term, record.location, ...(record.tags || [])].filter(Boolean).join(' ').toLowerCase();
  return record._text;
}
function relevance(record, tokens) {
  if (!tokens.length) return 0;
  const title = String(record.role).toLowerCase();
  const company = String(record.company).toLowerCase();
  let score = 0;
  for (const t of tokens) score += title.includes(t) ? 3 : company.includes(t) ? 2 : 1;
  if (title.startsWith(tokens.join(' '))) score += 2;
  return score;
}
function whereMatches(record, where) {
  if (!where) return true;
  const w = where.trim().toLowerCase();
  if (/^(remote|anywhere)$/.test(w)) return /remote/i.test(`${record.work_mode} ${record.location}`);
  const code = w.length === 2 ? w.toUpperCase() : Object.entries(STATE_NAMES).find(([, name]) => name.toLowerCase() === w)?.[0];
  const states = String(record.state || '').split('/');
  if (code && STATE_NAMES[code]) return states.includes(code) || new RegExp(`(?:,|;|/)\\s*${code}\\b`).test(record.location || '');
  return `${record.location} ${record.city}`.toLowerCase().includes(w);
}
function majorMatches(record, major) {
  if (!major) return true;
  if (searchText(record).includes(major.toLowerCase())) return true;
  return Object.entries(MAJOR_FIELD_GROUPS).some(([field, majors]) => majors.includes(major) && record.field_key === field);
}

// ---------- filtering ----------
function readFilters() {
  const tokens = controls.query.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return { tokens, where: controls.where.value.trim(), posted: Number(controls.posted.value) || 0, field: controls.field.value, major: controls.major.value, term: controls.term.value, sort: controls.sort.value };
}
function applyFilters({ keepPage = false } = {}) {
  const f = readFilters();
  const typeSet = new Set([...state.types].flatMap((t) => TYPE_GROUPS[t]));
  let list;
  if (state.view === 'tracker') {
    list = state.records.filter((record) => {
      const tracking = trackingFor(record);
      if (!tracking) return false;
      if (state.trackerView === 'all') return !ARCHIVED_STATUSES.has(tracking.status);
      if (state.trackerView === 'archive') return ARCHIVED_STATUSES.has(tracking.status);
      return tracking.status === state.trackerView;
    });
    if (f.tokens.length) list = list.filter((record) => f.tokens.every((t) => searchText(record).includes(t)));
    list.sort((a, b) => String(trackingFor(b).savedAt || '').localeCompare(String(trackingFor(a).savedAt || '')));
  } else {
    list = state.visible.filter((record) => (
      (!f.tokens.length || f.tokens.every((t) => searchText(record).includes(t)))
      && whereMatches(record, f.where)
      && (!typeSet.size || typeSet.has(record.opportunity_type))
      && (!state.modes.size || [...state.modes].some((m) => String(record.work_mode).includes(m)))
      && (!f.posted || daysSince(postedOn(record) || record.last_verified) < f.posted)
      && (!f.field || record.field_key === f.field)
      && majorMatches(record, f.major)
      && (!f.term || String(record.term || '').includes(f.term))
    ));
    const recent = (a, b) => String(postedOn(b) || b.last_verified).localeCompare(String(postedOn(a) || a.last_verified));
    if (f.sort === 'deadline') list.sort((a, b) => String(a.deadline || '9999').localeCompare(String(b.deadline || '9999')) || recent(a, b));
    else if (f.sort === 'recent' || !f.tokens.length) list.sort(recent);
    else list.sort((a, b) => relevance(b, f.tokens) - relevance(a, f.tokens) || recent(a, b));
  }
  state.filtered = list;
  if (!keepPage) state.shown = PAGE_SIZE;
  if (!list.some((record) => record.id === state.selected)) state.selected = null;
  if (wide.matches && !state.selected && list.length) state.selected = list[0].id;
  renderResults();
  renderTrackerTabs();
  syncUrl();
  if (wide.matches) renderDetail(state.filtered.find((record) => record.id === state.selected) || null);
}

// ---------- rendering ----------
function card(record) {
  const tracking = trackingFor(record);
  const posted = postedOn(record);
  const fresh = posted && daysSince(posted) <= 3;
  const closing = daysUntil(record.deadline);
  const open = isOpen(record);
  const button = el('button', {
    className: `job-card${state.selected === record.id ? ' selected' : ''}`, type: 'button', dataset: { id: String(record.id) },
    'aria-current': state.selected === record.id ? 'true' : null,
  });
  button.append(
    el('span', { className: 'card-head' }, [
      companyMark(record),
      el('span', { className: 'card-title' }, [el('strong', { text: record.role || 'Untitled role' }), el('span', { className: 'card-company', text: record.company || 'Unknown employer' })]),
    ]),
    el('span', { className: 'card-meta', text: placeAndMode(record) }),
    el('span', { className: 'card-tags' }, [
      el('span', { className: 'tag', text: record.opportunity_type }),
      record.term && record.term !== 'Year-round' ? el('span', { className: 'tag', text: record.term }) : null,
      fresh ? el('span', { className: 'tag new', text: 'New' }) : null,
      closing >= 0 && closing <= 21 ? el('span', { className: 'tag urgent', text: closing === 0 ? 'Closes today' : `Closes in ${closing} day${closing === 1 ? '' : 's'}` }) : null,
      !open ? el('span', { className: 'tag closed', text: 'No longer open' }) : null,
      tracking ? el('span', { className: 'tag saved', text: tracking.status }) : null,
    ]),
    el('span', { className: 'card-foot', text: postedLabel(record) }),
  );
  button.addEventListener('click', () => select(record, button));
  return button;
}

function renderResults() {
  const results = $('#results');
  const total = state.filtered.length;
  const page = state.filtered.slice(0, state.shown);
  results.replaceChildren(...page.map(card));
  if (total > state.shown) {
    const more = el('button', { className: 'show-more', type: 'button', text: `Show ${Math.min(PAGE_SIZE, total - state.shown)} more of ${plural(total - state.shown, 'job')}` });
    more.addEventListener('click', () => { state.shown += PAGE_SIZE; renderResults(); results.querySelectorAll('.job-card')[state.shown - PAGE_SIZE]?.focus(); });
    results.append(more);
  }
  if (!total) results.append(emptyState());
  $('#resultSummary').textContent = state.view === 'tracker'
    ? plural(total, 'saved job')
    : `${plural(total, 'job')}${filtersActive() ? (total === 1 ? ' matches your search' : ' match your search') : ' open now'}`;
}

function emptyState() {
  if (state.view === 'tracker') {
    return el('div', { className: 'empty' }, [el('strong', { text: 'Nothing here yet' }), el('p', { text: 'Open any job and choose Save to track it. Your list stays in this browser only.' })]);
  }
  const box = el('div', { className: 'empty' }, [el('strong', { text: 'No open jobs match all of these filters' }), el('p', { text: 'Try fewer filters, a broader location, or a different keyword.' })]);
  const clear = el('button', { className: 'secondary-button', type: 'button', text: 'Clear all filters' });
  clear.addEventListener('click', clearFilters);
  box.append(clear);
  return box;
}

function fact(label, value) { return el('div', { className: 'fact' }, [el('dt', { text: label }), el('dd', { text: value || 'Not listed' })]); }

function renderDetail(record) {
  const pane = $('#detail');
  pane.replaceChildren();
  pane.classList.toggle('empty-pane', !record);
  if (!record) {
    pane.append(el('div', { className: 'pane-placeholder' }, [el('strong', { text: state.view === 'tracker' ? 'Pick a saved job' : 'Pick a job to see the details' }), el('p', { text: 'The full posting and the Apply button appear here.' })]));
    return;
  }
  const url = safeHttps(record.posting_url || record.source_url);
  const tracking = trackingFor(record);
  const open = isOpen(record);
  const posted = postedOn(record);
  const back = el('button', { className: 'back-button', type: 'button', text: '← Back to results' });
  back.addEventListener('click', closeDetailOnPhone);

  const actions = el('div', { className: 'detail-actions' });
  if (url && open) {
    const apply = el('a', { className: 'apply-button', href: url, target: '_blank', rel: 'noopener noreferrer', text: `Apply on ${record.company}'s site ↗` });
    apply.addEventListener('click', () => {
      if (tracking && !PRE_APPLICATION_STATUSES.has(tracking.status)) return;
      updateTracking(record, { status: 'Applied', appliedAt: tracking?.appliedAt || new Date().toISOString() });
    });
    actions.append(apply);
  } else if (url) {
    actions.append(el('a', { className: 'secondary-button', href: url, target: '_blank', rel: 'noopener noreferrer', text: 'View original posting ↗' }));
  }
  const save = el('button', { className: `save-button${tracking ? ' saved' : ''}`, type: 'button', 'aria-pressed': tracking ? 'true' : 'false', text: tracking ? 'Saved ✓' : 'Save' });
  save.addEventListener('click', () => (tracking ? removeTracking(record) : updateTracking(record, {})));
  actions.append(save);

  const trust = !open
    ? el('p', { className: 'trust closed', text: `This listing is no longer open${record.closed_on ? ` (closed ${dateLabel(record.closed_on)})` : ''}. It stays here because you saved it.` })
    : isFeed(record)
      ? el('p', { className: 'trust', text: `Confirmed on ${record.company}'s job board ${ageLabel(daysSince(record.last_verified))}.` })
      : el('p', { className: 'trust', text: `Verified by hand ${ageLabel(daysSince(record.last_verified))}. Confirm the details on the employer's page.` });

  pane.append(
    back,
    el('header', { className: 'detail-head' }, [
      companyMark(record, 'large'),
      el('div', {}, [el('h2', { id: 'detailTitle', text: record.role || 'Untitled role' }), el('p', { className: 'detail-company', text: `${record.company} · ${record.location || 'Location not listed'}` })]),
    ]),
    el('div', { className: 'card-tags' }, [
      el('span', { className: 'tag', text: record.opportunity_type }),
      el('span', { className: 'tag', text: record.work_mode }),
      record.term ? el('span', { className: 'tag', text: record.term }) : null,
      daysUntil(record.deadline) >= 0 && daysUntil(record.deadline) <= 21 ? el('span', { className: 'tag urgent', text: `Apply by ${dateLabel(record.deadline)}` }) : null,
    ]),
    actions,
    trust,
    el('dl', { className: 'facts' }, [
      fact('Career field', record.field_key), fact('Role', record.role_key), record.department ? fact('Team', record.department) : fact('Schedule', record.schedule_type),
      fact('Posted', posted ? dateLabel(posted) : null), fact('Deadline', record.deadline ? dateLabel(record.deadline) : 'Not listed'), fact('Last checked', dateLabel(record.last_verified)),
    ]),
  );
  const about = record.description || record.details_eligibility;
  if (about) pane.append(el('h3', { text: 'About this role' }), el('p', { className: 'about', text: about }));
  if (record.details_eligibility && record.details_eligibility !== about) pane.append(el('h3', { text: 'Who can apply' }), el('p', { className: 'about', text: record.details_eligibility }));
  const sameText = (x, y) => String(x || '').trim().toLowerCase() === String(y || '').trim().toLowerCase();
  const highlights = (record.tags || []).filter((tag) => tag && !sameText(tag, about) && !sameText(tag, record.role_key));
  if (highlights.length) pane.append(el('h3', { text: 'Highlights' }), el('ul', { className: 'highlights' }, highlights.map((tag) => el('li', { text: tag }))));

  if (tracking) {
    const editor = el('section', { className: 'tracker-editor', 'aria-label': 'Your application' });
    const statusSelect = el('select', { id: 'trackStatus' }, TRACKING_STATUSES.map((status) => el('option', { value: status, text: status })));
    statusSelect.value = tracking.status;
    statusSelect.addEventListener('change', () => updateTracking(record, { status: statusSelect.value }));
    const notes = el('textarea', { id: 'trackNotes', rows: '4', placeholder: 'Contacts, interview dates, follow-ups…' });
    notes.value = tracking.notes || '';
    notes.addEventListener('change', () => updateTracking(record, { notes: notes.value.trim() }, { keepFocus: true }));
    editor.append(
      el('div', { className: 'editor-title' }, [el('h3', { text: 'Your application' }), el('span', { className: 'private-note', text: 'Private · this browser only' })]),
      el('label', { for: 'trackStatus', text: 'Status' }), statusSelect,
      el('label', { for: 'trackNotes', text: 'Notes' }), notes,
    );
    pane.append(editor);
  }
  pane.scrollTop = 0;
}

function renderTrackerTabs() {
  const entries = Object.values(state.tracker);
  $$('[data-tracking-view]').forEach((button) => {
    const view = button.dataset.trackingView;
    const count = view === 'all' ? entries.filter((item) => !ARCHIVED_STATUSES.has(item.status)).length
      : view === 'archive' ? entries.filter((item) => ARCHIVED_STATUSES.has(item.status)).length
        : entries.filter((item) => item.status === view).length;
    button.textContent = `${view === 'all' ? 'Active' : view === 'archive' ? 'Archive' : view} ${count}`;
    button.classList.toggle('active', state.trackerView === view);
    button.setAttribute('aria-pressed', String(state.trackerView === view));
  });
}

// ---------- interactions ----------
function select(record, opener) {
  state.selected = record.id;
  $$('.job-card').forEach((c) => { const on = c.dataset.id === String(record.id); c.classList.toggle('selected', on); if (on) c.setAttribute('aria-current', 'true'); else c.removeAttribute('aria-current'); });
  renderDetail(record);
  syncUrl();
  if (!wide.matches) {
    state.detailOpener = opener || null;
    state.listScroll = window.scrollY;
    document.body.classList.add('detail-open');
    window.scrollTo(0, 0);
    $('#detail').focus({ preventScroll: true });
  }
}
function closeDetailOnPhone() {
  if (!document.body.classList.contains('detail-open')) return;
  document.body.classList.remove('detail-open');
  window.scrollTo(0, state.listScroll || 0);
  state.detailOpener?.focus({ preventScroll: true });
}
function updateTracking(record, changes, { keepFocus = false } = {}) {
  const id = String(record.id);
  state.tracker[id] = { status: 'Saved', savedAt: new Date().toISOString(), notes: '', ...state.tracker[id], ...changes };
  saveTracker();
  rerenderKeepingSelection(record, keepFocus);
}
function removeTracking(record) {
  delete state.tracker[String(record.id)];
  saveTracker();
  rerenderKeepingSelection(record, false);
}
function rerenderKeepingSelection(record, keepFocus) {
  const active = document.activeElement?.id;
  state.selected = record.id;
  const stillListed = state.view !== 'tracker' || trackingFor(record);
  applyFilters({ keepPage: true });
  if (stillListed && !wide.matches) renderDetail(record);
  if (!stillListed) closeDetailOnPhone();
  if (keepFocus && active) document.getElementById(active)?.focus();
}
function filtersActive() {
  const f = readFilters();
  return Boolean(f.tokens.length || f.where || f.posted || f.field || f.major || f.term || state.types.size || state.modes.size);
}
function clearFilters() {
  for (const key of ['query', 'where', 'posted', 'field', 'major', 'term']) controls[key].value = '';
  state.types.clear();
  state.modes.clear();
  syncChips();
  applyFilters();
}
function syncChips() {
  $$('[data-type]').forEach((chip) => chip.setAttribute('aria-pressed', String(state.types.has(chip.dataset.type))));
  $$('[data-mode]').forEach((chip) => chip.setAttribute('aria-pressed', String(state.modes.has(chip.dataset.mode))));
}
function switchView(view) {
  state.view = view;
  state.selected = null;
  document.body.classList.toggle('tracker-view', view === 'tracker');
  $('#browseTab').classList.toggle('active', view === 'catalog');
  $('#savedTab').classList.toggle('active', view === 'tracker');
  $('#browseTab').removeAttribute('aria-current');
  $('#savedTab').removeAttribute('aria-current');
  $(view === 'catalog' ? '#browseTab' : '#savedTab').setAttribute('aria-current', 'page');
  $('#trackerControls').hidden = view !== 'tracker';
  $('#filterBar').hidden = view === 'tracker';
  closeDetailOnPhone();
  applyFilters();
}

// Filters live in the URL so a search can be bookmarked or shared. Nothing is sent anywhere.
function syncUrl() {
  const params = new URLSearchParams();
  const f = readFilters();
  if (controls.query.value.trim()) params.set('q', controls.query.value.trim());
  if (f.where) params.set('where', f.where);
  if (state.types.size) params.set('type', [...state.types].join(','));
  if (state.modes.size) params.set('mode', [...state.modes].join(','));
  for (const key of ['posted', 'field', 'major', 'term']) if (controls[key].value) params.set(key, controls[key].value);
  if (controls.sort.value !== 'relevance') params.set('sort', controls.sort.value);
  if (state.view === 'tracker') params.set('view', 'saved');
  if (state.selected !== null) params.set('job', String(state.selected));
  const query = params.toString();
  history.replaceState(null, '', query ? `?${query}` : window.location.pathname);
}
function restoreFromUrl() {
  const params = new URLSearchParams(window.location.search);
  controls.query.value = params.get('q') || '';
  controls.where.value = params.get('where') || '';
  for (const t of (params.get('type') || '').split(',')) if (TYPE_GROUPS[t]) state.types.add(t);
  for (const m of (params.get('mode') || '').split(',')) if (['Remote', 'Hybrid', 'On-site'].includes(m)) state.modes.add(m);
  for (const key of ['posted', 'field', 'major', 'term', 'sort']) {
    const value = params.get(key);
    if (value && [...controls[key].options].some((o) => o.value === value)) controls[key].value = value;
  }
  syncChips();
  return { view: params.get('view') === 'saved' ? 'tracker' : 'catalog', job: params.get('job') };
}

function renderFreshness() {
  const open = state.visible.length;
  const employers = new Set(state.visible.map((r) => r.company)).size;
  const run = state.status?.last_run ? new Date(state.status.last_run) : null;
  const when = run ? (daysSince(run.toISOString()) === 0 ? `today at ${run.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : `on ${dateLabel(run.toISOString())}`) : null;
  $('#freshness').textContent = `${plural(open, 'open role')} from ${plural(employers, 'employer')}${when ? ` · Updated ${when}` : ''}`;
}
function fillOptions() {
  const fields = [...new Set(state.visible.map((r) => r.field_key))].sort();
  for (const field of fields) controls.field.append(el('option', { value: field, text: field }));
  const majors = [...new Set([...window.CAREER_TAXONOMY.majors, ...EXTRA_MAJORS])].sort((a, b) => a.localeCompare(b));
  for (const major of majors) controls.major.append(el('option', { value: major, text: major }));
  const places = new Set(['Remote', ...Object.values(STATE_NAMES)]);
  for (const r of state.visible) if (r.city && !/multiple|remote/i.test(r.city) && r.state && !r.state.includes('/')) places.add(`${r.city}, ${r.state}`);
  $('#whereOptions').replaceChildren(...[...places].sort().map((value) => el('option', { value })));
}

async function loadCatalog() {
  try {
    const [response, statusResponse] = await Promise.all([fetch('opportunities.json', { cache: 'no-store' }), fetch('data/refresh-status.json', { cache: 'no-store' }).catch(() => null)]);
    if (!response.ok) throw new Error(`Listings request failed (${response.status})`);
    const records = await response.json();
    if (!Array.isArray(records)) throw new Error('Listings file is invalid');
    if (statusResponse?.ok) state.status = await statusResponse.json().catch(() => null);
    state.records = records.map((record, index) => ({ ...record, id: record.id ?? record.canonical_key ?? String(index) }));
    state.visible = state.records.filter(isOpen);
    fillOptions();
    const { view, job } = restoreFromUrl();
    saveTracker();
    renderFreshness();
    if (view === 'tracker') switchView('tracker'); else applyFilters();
    const wanted = job && state.records.find((r) => String(r.id) === job);
    if (wanted) select(wanted);
  } catch (error) {
    $('#freshness').textContent = 'Listings could not be loaded.';
    $('#resultSummary').textContent = '';
    $('#results').replaceChildren(el('div', { className: 'empty' }, [el('strong', { text: 'Something went wrong loading jobs' }), el('p', { text: 'Please refresh the page in a moment.' })]));
    console.error(error);
  }
}

// ---------- wiring ----------
$('#searchForm').addEventListener('submit', (event) => { event.preventDefault(); applyFilters(); $('#results').focus(); });
let typing;
for (const input of [controls.query, controls.where]) input.addEventListener('input', () => { clearTimeout(typing); typing = setTimeout(applyFilters, 180); });
for (const key of ['posted', 'field', 'major', 'term', 'sort']) controls[key].addEventListener('change', () => applyFilters());
$$('[data-type]').forEach((chip) => chip.addEventListener('click', () => { const t = chip.dataset.type; state.types.has(t) ? state.types.delete(t) : state.types.add(t); syncChips(); applyFilters(); }));
$$('[data-mode]').forEach((chip) => chip.addEventListener('click', () => { const m = chip.dataset.mode; state.modes.has(m) ? state.modes.delete(m) : state.modes.add(m); syncChips(); applyFilters(); }));
$('#clearFilters').addEventListener('click', clearFilters);
$('#browseTab').addEventListener('click', () => switchView('catalog'));
$('#savedTab').addEventListener('click', () => switchView('tracker'));
$('#applicationStatusTabs').addEventListener('click', (event) => {
  const button = event.target.closest('[data-tracking-view]');
  if (!button) return;
  state.trackerView = button.dataset.trackingView;
  state.selected = null;
  applyFilters();
});
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && document.body.classList.contains('detail-open')) closeDetailOnPhone(); });
wide.addEventListener('change', () => { document.body.classList.remove('detail-open'); applyFilters({ keepPage: true }); });
loadCatalog();
