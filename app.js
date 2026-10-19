'use strict';

if (window.location.protocol === 'file:') {
  window.location.replace('https://farhankhan-mis.github.io/GitHub-Portfolio/');
}

const $ = (selector) => document.querySelector(selector);
const STORAGE_KEY = 'public-opportunity-catalog-tracker-v1';
const TRACKING_STATUSES = ['Saved', 'Planning', 'Applied', 'Interviewing', 'Offer', 'Rejected', 'Withdrawn', 'Closed'];
const ARCHIVED_STATUSES = new Set(['Rejected', 'Withdrawn', 'Closed']);
const PRE_APPLICATION_STATUSES = new Set(['Saved', 'Planning']);
const state = { records: [], filtered: [], selected: null, view: 'catalog', trackerView: 'all', tracker: loadTracker() };
const fields = { query: $('#query'), audience: $('#audience'), major: $('#major'), field: $('#field'), role: $('#role'), opportunityType: $('#opportunityType'), mode: $('#mode'), schedule: $('#schedule'), region: $('#region'), term: $('#term'), status: $('#status'), sort: $('#sort') };
const STUDENT_TYPES = new Set(['Internship', 'Co-op', 'Fellowship', 'Apprenticeship', 'Research position', 'On-campus job', 'Volunteer or service opportunity']);
const CAREER_TYPES = new Set(['Full-time job', 'Part-time job', 'Entry-level job', 'Contract role', 'Temporary or seasonal job']);
const US_REGIONS = ['Remote', 'Multiple locations', 'International', 'AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];
const EXTRA_MAJORS = ['Advertising','African American Studies','Animal Science','Archaeology','Biomedical Sciences','Business Law','Communication Sciences and Disorders','Community Health','Elementary Education','Environmental Studies','Ethnic Studies','Event Management','Family and Consumer Sciences','Foreign Languages','Gender and Women’s Studies','Global Studies','Healthcare Management','Human Services','Interdisciplinary Studies','Interior Design','Labor Relations','Music Business','Organizational Leadership','Peace and Conflict Studies','Recreation Management','Religious Studies','Secondary Education','Social Sciences','Sport Analytics','Theatre Production','Undecided or exploring','Other or interdisciplinary program'];
const MAJOR_FIELD_GROUPS = {
  'Accounting & Finance': ['Accounting','Actuarial Science','Economics','Finance','Real Estate'],
  'Business & Management': ['Business Administration','Business Analytics','Engineering Management','Entrepreneurship','Human Resources Management','International Business','Management','Management Information Systems','Operations Management'],
  'Sales, Marketing & Customer Experience': ['Advertising','Marketing','Public Relations'],
  'Technology & Computing': ['Artificial Intelligence','Computer Engineering','Computer Information Systems','Computer Science','Cybersecurity','Game Design','Information Systems','Information Technology','Management Information Systems','Software Engineering','Web Development'],
  'Data, AI & Mathematics': ['Actuarial Science','Applied Mathematics','Artificial Intelligence','Business Analytics','Data Analytics','Data Science','Mathematics','Statistics'],
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
  'Transportation, Logistics & Supply Chain': ['Industrial Engineering','Operations Management','Supply Chain Management']
};

function el(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(options)) {
    if (key === 'className') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else node.setAttribute(key, value);
  }
  for (const child of children) node.append(child);
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
  catch { $('.local-note').textContent = 'Browser storage is unavailable, so saved items last only until this page closes'; }
  $('#trackedCount').textContent = String(Object.keys(state.tracker).length);
}

function safeHttps(value) { try { const url = new URL(value); return url.protocol === 'https:' ? url.href : null; } catch { return null; } }
function dateLabel(value) { if (!value) return 'Not listed'; const date = new Date(`${value}T12:00:00`); return Number.isNaN(date.getTime()) ? 'Not listed' : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
function ageInDays(value) { if (!value) return Infinity; return Math.floor((Date.now() - new Date(`${value}T12:00:00`).getTime()) / 86400000); }
function effectiveStatus(record) { return record.listing_status || 'Active'; }
function statusClass(record) { const status = effectiveStatus(record).toLowerCase(); if (status === 'active') return 'active'; if (status === 'closed' || status === 'expired') return 'closed'; return 'review'; }
function statusBadge(record) { return statusClass(record) === 'active' ? [] : [el('span', { className: `status ${statusClass(record)}`, text: effectiveStatus(record) })]; }
function addOptions(select, values) { values.filter(Boolean).sort((a, b) => a.localeCompare(b)).forEach((value) => select.append(el('option', { value, text: value }))); }
function searchText(record) {
  return [record.company, record.role, record.location, record.field_key, record.role_key, record.industry, record.description, record.details_eligibility, record.education_requirements, record.opportunity_type, record.employment_type, record.schedule_type, record.work_mode, record.term, ...(record.tags || [])].filter(Boolean).join(' ').toLowerCase();
}
function trackingFor(record) { return state.tracker[String(record.id)]; }
function opportunityType(record) { return record.opportunity_type || record.employment_type || ''; }
function majorMatches(record, major) {
  if (!major) return true;
  if (['Undecided or exploring', 'Other or interdisciplinary program'].includes(major)) return true;
  const direct = searchText(record).includes(major.toLowerCase());
  return direct || Object.entries(MAJOR_FIELD_GROUPS).some(([field, majors]) => majors.includes(major) && record.field_key === field);
}
function regionMatches(record, region) {
  if (!region) return true;
  if (region === 'Remote') return String(record.work_mode).toLowerCase().includes('remote') || String(record.location).toLowerCase().includes('remote');
  if (region === 'Multiple locations') return /multiple|multi|varies/i.test(record.location || '');
  if (region === 'International') return /international|global|worldwide/i.test(record.location || '');
  return record.state === region || new RegExp(`(?:,|/)\\s*${region}(?:\\b|/)`).test(record.location || '');
}
function refreshRoleOptions() {
  const selected = fields.role.value;
  const roles = fields.field.value ? (window.CAREER_TAXONOMY.fields[fields.field.value] || []) : Object.values(window.CAREER_TAXONOMY.fields).flat();
  fields.role.replaceChildren(el('option', { value: '', text: 'All role families' }));
  addOptions(fields.role, [...new Set(roles)]);
  if ([...fields.role.options].some((option) => option.value === selected)) fields.role.value = selected;
}

function updateTracking(record, changes) {
  const id = String(record.id);
  state.tracker[id] = { status: 'Saved', savedAt: new Date().toISOString(), notes: '', ...state.tracker[id], ...changes };
  saveTracker();
  applyFilters();
  state.selected = record.id;
  renderDetail(record);
}

function removeTracking(record) {
  delete state.tracker[String(record.id)];
  saveTracker();
  applyFilters();
  if (state.view === 'catalog') renderDetail(record);
}

function renderCard(record) {
  const tracking = trackingFor(record);
  const button = el('button', { className: `opportunity-card ${state.selected === record.id ? 'selected' : ''}`, type: 'button', dataset: { id: String(record.id) }, 'aria-label': `View details for ${record.role} at ${record.company}` });
  button.append(
    el('span', { className: 'card-top' }, [el('span', { className: 'company-mark', text: (record.company || '?').slice(0, 1).toUpperCase() }), el('span', {}, [el('strong', { text: record.role || 'Untitled opportunity' }), el('small', { text: record.company || 'Unknown company' })])]),
    el('span', { className: 'location', text: record.location || [record.city, record.state].filter(Boolean).join(', ') || 'Location not listed' }),
    el('span', { className: 'card-tags' }, [el('span', { text: record.opportunity_type || 'Opportunity' }), el('span', { text: record.work_mode || 'Mode not listed' }), ...statusBadge(record), ...(tracking ? [el('span', { className: 'tracking-badge', text: tracking.status })] : [])]),
    el('span', { className: 'card-footer' }, [el('span', { className: 'verified', text: `Last verified ${dateLabel(record.last_verified)}` }), el('span', { className: 'view-details', text: 'View details →' })]),
  );
  button.addEventListener('click', () => { state.selected = record.id; renderResults(); renderDetail(record); });
  return button;
}

function fact(label, value) { return el('div', {}, [el('dt', { text: label }), el('dd', { text: value || 'Not listed' })]); }

function renderDetail(record) {
  const panel = $('#detail');
  const url = safeHttps(record.posting_url || record.source_url);
  const tracking = trackingFor(record);
  panel.replaceChildren();
  panel.append(
    el('button', { className: 'detail-close', type: 'button', 'aria-label': 'Close opportunity details', text: '×' }),
    el('div', { className: 'detail-head' }, [el('div', {}, [el('p', { className: 'eyebrow', text: 'OPPORTUNITY DETAILS' }), el('h2', { text: record.role || 'Untitled opportunity' }), el('p', { text: `${record.company || 'Unknown company'} · ${record.location || 'Location not listed'}` })]), ...statusBadge(record)]),
    el('div', { className: 'detail-actions' }),
    el('dl', { className: 'facts' }, [fact('Field', record.field_key), fact('Role family', record.role_key || record.role_family), fact('Opportunity type', record.opportunity_type), fact('Work mode', record.work_mode), fact('Term', record.term), fact('Deadline', dateLabel(record.deadline)), fact('Listing status', effectiveStatus(record)), fact('Last verified', dateLabel(record.last_verified)), fact('Source type', record.link_type || record.source)]),
  );

  const actions = panel.querySelector('.detail-actions');
  if (url) {
    const apply = el('a', { className: 'primary-link', href: url, target: '_blank', rel: 'noopener noreferrer', text: 'Apply on source site ↗' });
    apply.addEventListener('click', () => {
      if (tracking && !PRE_APPLICATION_STATUSES.has(tracking.status)) return;
      updateTracking(record, { status: 'Applied', appliedAt: tracking?.appliedAt || new Date().toISOString() });
    });
    actions.append(apply);
  } else actions.append(el('p', { className: 'warning', text: 'No safe HTTPS source is available for this record.' }));
  const save = el('button', { className: tracking ? 'secondary-action saved' : 'secondary-action', type: 'button', text: tracking ? 'Saved ✓' : 'Save opportunity' });
  save.addEventListener('click', () => updateTracking(record, {}));
  actions.append(save);

  if (record.description || record.details_eligibility) panel.append(el('h3', { text: 'About this opportunity' }), el('p', { text: record.description || record.details_eligibility }));
  if (record.education_requirements) panel.append(el('h3', { text: 'Education requirements' }), el('p', { text: record.education_requirements }));
  if (record.tags?.length) panel.append(el('h3', { text: 'Highlights' }), el('ul', { className: 'highlights' }, record.tags.map((tag) => el('li', { text: tag }))));

  if (tracking) {
    const tracker = el('section', { className: 'application-editor', 'aria-label': 'Private application tracking' });
    const statusSelect = el('select', { 'aria-label': 'Application status' }, TRACKING_STATUSES.map((status) => el('option', { value: status, text: status })));
    statusSelect.value = tracking.status;
    statusSelect.addEventListener('change', () => updateTracking(record, { status: statusSelect.value }));
    const notes = el('textarea', { rows: '4', placeholder: 'Private notes about this application', 'aria-label': 'Application notes' });
    notes.value = tracking.notes || '';
    notes.addEventListener('change', () => updateTracking(record, { notes: notes.value.trim() }));
    const remove = el('button', { className: 'remove-action', type: 'button', text: 'Remove from my applications' });
    remove.addEventListener('click', () => removeTracking(record));
    tracker.append(el('div', { className: 'editor-title' }, [el('div', {}, [el('p', { className: 'eyebrow', text: 'PRIVATE · THIS BROWSER ONLY' }), el('h3', { text: 'My application tracker' })]), el('span', { className: 'tracking-badge', text: tracking.status })]), el('label', {}, [el('span', { text: 'Application status' }), statusSelect]), el('label', {}, [el('span', { text: 'Notes' }), notes]), remove);
    panel.append(tracker);
  }

  panel.querySelector('.detail-close').addEventListener('click', () => panel.close());
  if (!panel.open) panel.showModal();
}

function renderResults() {
  const results = $('#results');
  results.replaceChildren(...state.filtered.map(renderCard));
  if (!state.filtered.length) results.append(el('div', { className: 'empty', text: state.view === 'tracker' ? 'No saved opportunities match this status.' : 'No opportunities match every selected filter. Try clearing one or more filters. Coverage is still growing, so some categories have no listings yet.' }));
  $('#resultSummary').textContent = state.view === 'tracker' ? `${state.filtered.length} saved opportunities` : `${state.filtered.length} of ${state.records.length} public opportunities`;
}

function renderTrackerTabs() {
  const entries = Object.values(state.tracker);
  document.querySelectorAll('[data-tracking-view]').forEach((button) => {
    const view = button.dataset.trackingView;
    const count = view === 'all'
      ? entries.filter((item) => !ARCHIVED_STATUSES.has(item.status)).length
      : view === 'archive'
        ? entries.filter((item) => ARCHIVED_STATUSES.has(item.status)).length
        : entries.filter((item) => item.status === view).length;
    const label = view === 'all' ? 'Active' : view === 'archive' ? 'Archive' : view;
    button.textContent = `${label} ${count}`;
    button.classList.toggle('active', state.trackerView === view);
    button.setAttribute('aria-selected', String(state.trackerView === view));
  });
}

function applyFilters() {
  const query = fields.query.value.trim().toLowerCase();
  state.filtered = state.records.filter((record) => {
    const tracking = trackingFor(record);
    if (state.view === 'catalog' && tracking) return false;
    if (state.view === 'tracker') {
      if (!tracking) return false;
      if (state.trackerView === 'all' && ARCHIVED_STATUSES.has(tracking.status)) return false;
      if (state.trackerView === 'archive' && !ARCHIVED_STATUSES.has(tracking.status)) return false;
      if (!['all', 'archive'].includes(state.trackerView) && tracking.status !== state.trackerView) return false;
    }
    const type = opportunityType(record);
    const audienceMatch = !fields.audience.value || (fields.audience.value === 'student' ? STUDENT_TYPES.has(type) : CAREER_TYPES.has(type));
    const termMatch = !fields.term.value || String(record.term || '').toLowerCase().includes(fields.term.value.toLowerCase());
    return (!query || searchText(record).includes(query)) && audienceMatch && majorMatches(record, fields.major.value) && (!fields.field.value || record.field_key === fields.field.value) && (!fields.role.value || (record.role_key || record.role_family) === fields.role.value) && (!fields.opportunityType.value || type === fields.opportunityType.value) && (!fields.mode.value || record.work_mode === fields.mode.value) && (!fields.schedule.value || record.schedule_type === fields.schedule.value) && regionMatches(record, fields.region.value) && termMatch && (!fields.status.value || effectiveStatus(record) === fields.status.value);
  });
  const sort = fields.sort.value;
  state.filtered.sort((a, b) => sort === 'company' ? String(a.company).localeCompare(String(b.company)) : sort === 'deadline' ? String(a.deadline || '9999').localeCompare(String(b.deadline || '9999')) : String(b.last_verified || '').localeCompare(String(a.last_verified || '')));
  if (!state.filtered.some((record) => record.id === state.selected)) state.selected = null;
  renderResults();
  renderTrackerTabs();
}

function switchView(view) {
  state.view = view;
  $('#catalogTab').classList.toggle('active', view === 'catalog');
  $('#trackerTab').classList.toggle('active', view === 'tracker');
  $('#catalogTab').setAttribute('aria-selected', String(view === 'catalog'));
  $('#trackerTab').setAttribute('aria-selected', String(view === 'tracker'));
  $('#trackerControls').hidden = view !== 'tracker';
  applyFilters();
}

async function loadCatalog() {
  try {
    const response = await fetch('opportunities.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Catalog request failed (${response.status})`);
    const records = await response.json();
    if (!Array.isArray(records)) throw new Error('Catalog format is invalid');
    state.records = records.map((record, index) => ({ ...record, id: record.id ?? record.canonical_key ?? index }));
    addOptions(fields.major, [...new Set([...window.CAREER_TAXONOMY.majors, ...EXTRA_MAJORS])]);
    addOptions(fields.field, Object.keys(window.CAREER_TAXONOMY.fields));
    refreshRoleOptions();
    addOptions(fields.opportunityType, window.CAREER_TAXONOMY.opportunityTypes);
    addOptions(fields.mode, ['On-site','Hybrid','Remote','Hybrid/On-site','Hybrid/Remote','Remote/Hybrid','Varies']);
    addOptions(fields.schedule, ['Full-time','Part-time','Flexible','Seasonal','Weekends','Evenings','Not listed']);
    addOptions(fields.region, US_REGIONS);
    addOptions(fields.term, ['Spring','Summer','Fall','Winter','Academic year','Year-round','Rolling']);
    addOptions(fields.status, [...new Set(state.records.map(effectiveStatus))]);
    saveTracker();
    const statusCounts = [['Active', 'verified active'], ['Needs re-verification', 'need re-verification'], ['Closed', 'closed']].map(([status, label]) => `${state.records.filter((record) => effectiveStatus(record) === status).length} ${label}`);
    $('#catalogHealth').replaceChildren(el('strong', { text: String(state.records.length) }), el('span', { text: 'public opportunities' }), el('span', { text: statusCounts.join(' · ') }));
    applyFilters();
  } catch (error) {
    $('#resultSummary').textContent = 'The catalog could not be loaded.';
    $('#results').replaceChildren(el('div', { className: 'empty', text: 'Please try again later.' }));
    $('#catalogHealth').replaceChildren(el('span', { text: 'Catalog unavailable' }));
    console.error(error);
  }
}

Object.values(fields).forEach((control) => {
  if (control === fields.field) control.addEventListener('change', () => { refreshRoleOptions(); applyFilters(); });
  else control.addEventListener(control === fields.query ? 'input' : 'change', applyFilters);
});
$('#clearFilters').addEventListener('click', () => { $('#filters').reset(); applyFilters(); fields.query.focus(); });
$('#catalogTab').addEventListener('click', () => switchView('catalog'));
$('#trackerTab').addEventListener('click', () => switchView('tracker'));
$('#applicationStatusTabs').addEventListener('click', (event) => {
  const button = event.target.closest('[data-tracking-view]');
  if (!button) return;
  state.trackerView = button.dataset.trackingView;
  applyFilters();
});
$('#detail').addEventListener('click', (event) => { if (event.target === $('#detail')) $('#detail').close(); });
$('#detail').addEventListener('close', () => { state.selected = null; renderResults(); });
loadCatalog();
