'use strict';

if (window.location.protocol === 'file:') {
  window.location.replace('https://farhankhan-mis.github.io/GitHub-Portfolio/');
}

const $ = (selector) => document.querySelector(selector);
const STORAGE_KEY = 'public-opportunity-catalog-tracker-v1';
const TRACKING_STATUSES = ['Saved', 'Planning', 'Applied', 'Interviewing', 'Offer', 'Rejected', 'Withdrawn', 'Closed'];
const state = { records: [], filtered: [], selected: null, view: 'catalog', tracker: loadTracker() };
const fields = { query: $('#query'), field: $('#field'), mode: $('#mode'), status: $('#status'), sort: $('#sort'), trackingStatus: $('#trackingStatus') };

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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tracker));
  $('#trackedCount').textContent = String(Object.keys(state.tracker).length);
}

function safeHttps(value) { try { const url = new URL(value); return url.protocol === 'https:' ? url.href : null; } catch { return null; } }
function dateLabel(value) { if (!value) return 'Not listed'; const date = new Date(`${value}T12:00:00`); return Number.isNaN(date.getTime()) ? 'Not listed' : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
function ageInDays(value) { if (!value) return Infinity; return Math.floor((Date.now() - new Date(`${value}T12:00:00`).getTime()) / 86400000); }
function effectiveStatus(record) { const current = record.listing_status || 'Needs review'; return current === 'Active' && ageInDays(record.last_verified) > 14 ? 'Needs re-verification' : current; }
function statusClass(record) { const status = effectiveStatus(record).toLowerCase(); if (status === 'active') return 'active'; if (status === 'closed' || status === 'expired') return 'closed'; return 'review'; }
function addOptions(select, values) { values.filter(Boolean).sort((a, b) => a.localeCompare(b)).forEach((value) => select.append(el('option', { value, text: value }))); }
function searchText(record) { return [record.company, record.role, record.location, record.field_key, record.role_key, record.industry, ...(record.tags || [])].join(' ').toLowerCase(); }
function trackingFor(record) { return state.tracker[String(record.id)]; }

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
    el('span', { className: 'card-tags' }, [el('span', { text: record.opportunity_type || 'Opportunity' }), el('span', { text: record.work_mode || 'Mode not listed' }), el('span', { className: `status ${statusClass(record)}`, text: effectiveStatus(record) }), ...(tracking ? [el('span', { className: 'tracking-badge', text: tracking.status })] : [])]),
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
    el('div', { className: 'detail-head' }, [el('div', {}, [el('p', { className: 'eyebrow', text: effectiveStatus(record).toUpperCase() }), el('h2', { text: record.role || 'Untitled opportunity' }), el('p', { text: `${record.company || 'Unknown company'} · ${record.location || 'Location not listed'}` })]), el('span', { className: `status ${statusClass(record)}`, text: effectiveStatus(record) })]),
    el('div', { className: 'detail-actions' }),
    el('dl', { className: 'facts' }, [fact('Field', record.field_key), fact('Role family', record.role_key || record.role_family), fact('Opportunity type', record.opportunity_type), fact('Work mode', record.work_mode), fact('Term', record.term), fact('Deadline', dateLabel(record.deadline)), fact('Last verified', dateLabel(record.last_verified)), fact('Source type', record.link_type || record.source)]),
  );

  const actions = panel.querySelector('.detail-actions');
  if (url) {
    const apply = el('a', { className: 'primary-link', href: url, target: '_blank', rel: 'noopener noreferrer', text: 'Apply on source site ↗' });
    apply.addEventListener('click', () => updateTracking(record, { status: 'Applied', appliedAt: tracking?.appliedAt || new Date().toISOString() }));
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
}

function renderResults() {
  const results = $('#results');
  results.replaceChildren(...state.filtered.map(renderCard));
  if (!state.filtered.length) results.append(el('div', { className: 'empty', text: state.view === 'tracker' ? 'No saved opportunities match this status.' : 'No opportunities match these filters.' }));
  $('#resultSummary').textContent = state.view === 'tracker' ? `${state.filtered.length} saved opportunities` : `${state.filtered.length} of ${state.records.length} public opportunities`;
}

function applyFilters() {
  const query = fields.query.value.trim().toLowerCase();
  state.filtered = state.records.filter((record) => {
    const tracking = trackingFor(record);
    if (state.view === 'tracker' && (!tracking || (fields.trackingStatus.value && tracking.status !== fields.trackingStatus.value))) return false;
    return (!query || searchText(record).includes(query)) && (!fields.field.value || record.field_key === fields.field.value) && (!fields.mode.value || record.work_mode === fields.mode.value) && (!fields.status.value || effectiveStatus(record) === fields.status.value);
  });
  const sort = fields.sort.value;
  state.filtered.sort((a, b) => sort === 'company' ? String(a.company).localeCompare(String(b.company)) : sort === 'deadline' ? String(a.deadline || '9999').localeCompare(String(b.deadline || '9999')) : String(b.last_verified || '').localeCompare(String(a.last_verified || '')));
  if (!state.filtered.some((record) => record.id === state.selected)) state.selected = state.filtered[0]?.id ?? null;
  renderResults();
  const selected = state.filtered.find((record) => record.id === state.selected);
  if (selected) renderDetail(selected); else $('#detail').replaceChildren(el('p', { className: 'empty', text: state.view === 'tracker' ? 'Save an opportunity to start tracking it.' : 'No opportunity matches these filters.' }));
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
    addOptions(fields.field, [...new Set(state.records.map((record) => record.field_key))]);
    addOptions(fields.mode, [...new Set(state.records.map((record) => record.work_mode))]);
    addOptions(fields.status, [...new Set(state.records.map(effectiveStatus))]);
    addOptions(fields.trackingStatus, TRACKING_STATUSES);
    saveTracker();
    const fresh = state.records.filter((record) => effectiveStatus(record) === 'Active').length;
    const review = state.records.filter((record) => statusClass(record) === 'review').length;
    const closed = state.records.filter((record) => statusClass(record) === 'closed').length;
    $('#catalogHealth').replaceChildren(el('strong', { text: String(state.records.length) }), el('span', { text: `records · ${fresh} current · ${review} need review · ${closed} closed` }));
    if (review) { const notice = $('#freshnessNotice'); notice.hidden = false; notice.textContent = `${review} listings are awaiting re-verification. Their source links remain available, but confirm availability with the employer before applying.`; }
    applyFilters();
  } catch (error) {
    $('#resultSummary').textContent = 'The catalog could not be loaded.';
    $('#results').replaceChildren(el('div', { className: 'empty', text: 'Please try again later.' }));
    $('#catalogHealth').replaceChildren(el('span', { text: 'Catalog unavailable' }));
    console.error(error);
  }
}

Object.values(fields).forEach((control) => control.addEventListener(control === fields.query ? 'input' : 'change', applyFilters));
$('#clearFilters').addEventListener('click', () => { $('#filters').reset(); applyFilters(); fields.query.focus(); });
$('#clearTrackerFilter').addEventListener('click', () => { fields.trackingStatus.value = ''; applyFilters(); });
$('#catalogTab').addEventListener('click', () => switchView('catalog'));
$('#trackerTab').addEventListener('click', () => switchView('tracker'));
loadCatalog();
