/**
 * desktop.js
 * Controller logic for the Desktop Admin application. Each page's
 * HTML contains static structure with a mount point (or fixed IDs for
 * list pages); this file renders dynamic content, wires up filters,
 * forms and actions, and reads/writes shared state via app.js.
 *
 * Flat data model: Activity is the only entity ops manages on
 * desktop. There is no agent roster — a field officer logs into the
 * mobile app with an Activity Number + mobile number and executes
 * whatever Activity that number points to.
 */

/* ================================================================ */
/* Shell: header + sidebar                                           */
/* ================================================================ */

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: '&#9638;', href: 'dashboard.html' },
  { key: 'activities', label: 'Activities', icon: '&#128205;', href: 'activities.html' },
  { key: 'submissions', label: 'Submissions', icon: '&#128247;', href: 'submissions.html' },
  { key: 'settings', label: 'Settings', icon: '&#9881;', href: 'settings.html' }
];

function initShell(activeKey) {
  document.body.classList.add('desktop-app');

  const header = document.getElementById('shell-header');
  if (header) {
    header.innerHTML = `
      <header class="app-header">
        <div class="app-header-left">
          <div class="logo-mark">PT</div>
          <div class="brand-text">PromoTrack<span class="brand-sub">Campaign Management</span></div>
        </div>
        <div class="app-header-right">
          <a class="header-switch-link" href="../../index.html">&#8646; Prototype Switcher</a>
          <div class="user-menu">
            <div class="user-menu-trigger" id="user-menu-trigger">
              <span class="agent-avatar">OA</span>
              <span class="user-menu-name">Ops Admin</span>
              <span class="user-menu-caret">&#9662;</span>
            </div>
            <div class="user-menu-dropdown" id="user-menu-dropdown">
              <a href="settings.html">Settings</a>
              <div class="divider"></div>
              <a href="../../index.html">Switch Application</a>
            </div>
          </div>
        </div>
      </header>`;

    const trigger = document.getElementById('user-menu-trigger');
    const dropdown = document.getElementById('user-menu-dropdown');
    trigger.addEventListener('click', (e) => { e.stopPropagation(); dropdown.classList.toggle('open'); });
    document.addEventListener('click', () => dropdown.classList.remove('open'));
  }

  const sidebar = document.getElementById('shell-sidebar');
  if (sidebar) {
    sidebar.innerHTML = `
      <aside class="app-sidebar">
        <nav class="sidebar-nav">
          ${NAV_ITEMS.map(item => `<a href="${item.href}" class="${item.key === activeKey ? 'active' : ''}"><span class="nav-icon">${item.icon}</span>${item.label}</a>`).join('')}
        </nav>
      </aside>`;
  }
}

/* ================================================================ */
/* Small render helpers shared across pages                          */
/* ================================================================ */

function breadcrumbs(items) {
  return `<div class="breadcrumbs">${items.map((it, i) => {
    const sep = i > 0 ? '<span class="sep">/</span>' : '';
    const content = it.href ? `<a href="${it.href}">${escapeHtml(it.label)}</a>` : `<span class="current">${escapeHtml(it.label)}</span>`;
    return sep + content;
  }).join('')}</div>`;
}

function emptyState(opts) {
  const action = opts.actionHref
    ? `<a class="btn btn-primary" href="${opts.actionHref}">${escapeHtml(opts.actionLabel)}</a>`
    : (opts.actionOnClick ? `<button class="btn btn-primary" onclick="${opts.actionOnClick}">${escapeHtml(opts.actionLabel)}</button>` : '');
  return `<div class="empty-state">
    <div class="empty-icon">${opts.icon || '&#128193;'}</div>
    <h3>${escapeHtml(opts.title)}</h3>
    <p>${escapeHtml(opts.message)}</p>
    ${action}
  </div>`;
}

function optionList(values, selected) {
  return values.map(v => `<option value="${escapeHtml(v)}" ${v === selected ? 'selected' : ''}>${escapeHtml(v)}</option>`).join('');
}

/* ================================================================ */
/* Cascade delete                                                    */
/* ================================================================ */

function deleteActivityCascade(activityId) {
  updateState(s => {
    s.activities = s.activities.filter(a => a.id !== activityId);
    s.submissions = s.submissions.filter(sub => sub.activityId !== activityId);
  });
}

/* ================================================================ */
/* Dashboard                                                          */
/* ================================================================ */

const DASHBOARD_FILTER_LABELS = {
  all: 'Recent Activities',
  ongoing: 'Ongoing Activities',
  submissions: 'Activities With Submissions',
  completed: 'Completed Activities'
};

let DASHBOARD_FILTER = 'all';

function initDashboardPage() {
  DASHBOARD_FILTER = 'all';
  renderDashboardPage();
}

function setDashboardFilter(filter) {
  DASHBOARD_FILTER = filter;
  renderDashboardPage();
}

function renderDashboardPage() {
  const state = getState();
  const totalActivities = state.activities.length;
  const ongoingActivities = state.activities.filter(a => computeActivityLifecycle(a) === 'Ongoing').length;
  const totalSubmissions = state.submissions.length;
  const completedActivities = state.activities.filter(a => computeActivitySubmissionStatus(a) === 'Completed').length;

  document.getElementById('stat-total-activities').textContent = totalActivities;
  document.getElementById('stat-ongoing-activities').textContent = ongoingActivities;
  document.getElementById('stat-total-submissions').textContent = totalSubmissions;
  document.getElementById('stat-completed-activities').textContent = completedActivities;

  Object.keys(DASHBOARD_FILTER_LABELS).forEach(f => {
    document.getElementById('stat-card-' + f).classList.toggle('active', DASHBOARD_FILTER === f);
  });

  let rows = state.activities.slice().sort((a, b) => b.id.localeCompare(a.id));
  if (DASHBOARD_FILTER === 'ongoing') {
    rows = rows.filter(a => computeActivityLifecycle(a) === 'Ongoing');
  } else if (DASHBOARD_FILTER === 'submissions') {
    rows = rows.filter(a => getSubmissionsForActivity(a.id).length > 0);
  } else if (DASHBOARD_FILTER === 'completed') {
    rows = rows.filter(a => computeActivitySubmissionStatus(a) === 'Completed');
  } else {
    rows = rows.slice(0, 8);
  }

  document.getElementById('dashboard-activities-title').textContent = DASHBOARD_FILTER_LABELS[DASHBOARD_FILTER];

  const tbody = document.getElementById('dashboard-activities-tbody');
  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6">${emptyState({ icon: '&#128205;', title: 'No Activities Found', message: 'No activities match this filter.' })}</td></tr>`;
  } else {
    tbody.innerHTML = rows.map(a => {
      const subCount = getSubmissionsForActivity(a.id).length;
      return `<tr onclick="window.location='activity-detail.html?id=${a.id}'" style="cursor:pointer">
        <td><span class="table-link">${escapeHtml(a.name)}</span><br><span class="text-faint mono">${a.id}</span></td>
        <td>${escapeHtml(a.stateName)}</td>
        <td>${escapeHtml(a.aoName)}</td>
        <td>${formatDateRange(a.periodFrom, a.periodTo)}</td>
        <td class="num">${subCount}</td>
        <td>${badge(computeActivityLifecycle(a))}</td>
      </tr>`;
    }).join('');
  }

  const todayActivities = state.activities.filter(a => a.periodFrom <= DEMO_TODAY && DEMO_TODAY <= a.periodTo);
  const todayList = document.getElementById('today-activities-list');
  if (todayActivities.length === 0) {
    todayList.innerHTML = emptyState({ icon: '&#128205;', title: 'No Activities Today', message: 'There are no activities running today.' });
  } else {
    todayList.innerHTML = todayActivities.map(a => {
      const status = computeActivitySubmissionStatus(a);
      return `<div class="today-activity-card">
        <div class="today-activity-main">
          <div class="today-activity-icon">&#128205;</div>
          <div>
            <div class="today-activity-id mono">${a.id}</div>
            <div class="today-activity-name">${escapeHtml(a.name)}</div>
          </div>
        </div>
        <div class="today-activity-stats">
          <span>${escapeHtml(a.stateName)}</span>
          <span>${escapeHtml(a.teamVan)}</span>
          ${badge(status)}
        </div>
        <a class="btn btn-secondary btn-sm" href="activity-detail.html?id=${a.id}">View Activity</a>
      </div>`;
    }).join('');
  }
}

/* ================================================================ */
/* Activities: List                                                   */
/* ================================================================ */

function initActivitiesListPage() {
  const state = getState();
  document.getElementById('filter-state').innerHTML = '<option value="">All States</option>' + optionList(STATE_NAMES.filter(s => state.activities.some(a => a.stateName === s)));
  document.getElementById('filter-ao').innerHTML = '<option value="">All AO Names</option>' + optionList(AO_NAMES.filter(ao => state.activities.some(a => a.aoName === ao)));

  ['filter-search', 'filter-state', 'filter-ao'].forEach(id => {
    document.getElementById(id).addEventListener('input', renderActivitiesTable);
    document.getElementById(id).addEventListener('change', renderActivitiesTable);
  });
  renderActivitiesTable();
}

function renderActivitiesTable() {
  const state = getState();
  const search = (document.getElementById('filter-search').value || '').toLowerCase();
  const stateName = document.getElementById('filter-state').value;
  const aoName = document.getElementById('filter-ao').value;

  let rows = state.activities.filter(a => {
    if (search && !(a.name.toLowerCase().includes(search) || a.id.toLowerCase().includes(search))) return false;
    if (stateName && a.stateName !== stateName) return false;
    if (aoName && a.aoName !== aoName) return false;
    return true;
  });

  const tbody = document.getElementById('activities-tbody');
  const empty = document.getElementById('activities-empty');
  const wrap = document.getElementById('activities-table-wrap');

  if (rows.length === 0) {
    wrap.style.display = 'none';
    empty.style.display = 'block';
    empty.innerHTML = emptyState({ icon: '&#128205;', title: 'No Activities Found', message: 'Try adjusting your filters, or add a new activity.', actionLabel: '+ Add Activity', actionHref: 'activity-create.html' });
    return;
  }
  wrap.style.display = 'block';
  empty.style.display = 'none';

  tbody.innerHTML = rows.map(a => `<tr>
    <td><a class="table-link mono" href="activity-detail.html?id=${a.id}">${a.id}</a></td>
    <td>${escapeHtml(a.stateName)}</td>
    <td>${escapeHtml(a.aoName)}</td>
    <td>${escapeHtml(a.name)}</td>
    <td>${formatDateRange(a.periodFrom, a.periodTo)}</td>
    <td>${escapeHtml(a.teamVan)}</td>
    <td>
      <div class="row-actions">
        <a class="btn btn-secondary btn-sm" href="activity-detail.html?id=${a.id}">View</a>
        <a class="btn btn-secondary btn-sm" href="activity-create.html?edit=${a.id}">Edit</a>
        <button class="btn btn-secondary btn-sm" onclick="handleDeleteActivity('${a.id}')">Delete</button>
      </div>
    </td>
  </tr>`).join('');
}

function handleDeleteActivity(id) {
  const a = getActivity(id);
  confirmDialog({
    title: 'Delete Activity?',
    message: `Are you sure you want to delete <strong>${a.id}</strong> &mdash; ${escapeHtml(a.name)}? All submissions under this activity will also be removed. This action cannot be undone.`,
    confirmText: 'Delete',
    danger: true,
    onConfirm: () => {
      deleteActivityCascade(id);
      closeModal();
      showToast('Activity deleted');
      if (document.getElementById('activities-tbody')) renderActivitiesTable();
      else window.location.href = 'activities.html';
    }
  });
}

/* ================================================================ */
/* Activities: Create / Edit                                          */
/* ================================================================ */

let SELECTED_ELEMENTS = [];
let TEAM_LOCATIONS = [];
let TEAM_LOCATIONS_REVEALED = 0;

function initActivityCreatePage() {
  const editId = getQueryParam('edit');
  const existing = editId ? getActivity(editId) : null;

  document.getElementById('activity-state').innerHTML = '<option value="">Select State</option>' + optionList(STATE_NAMES);
  document.getElementById('activity-ao').innerHTML = '<option value="">Select AO Name</option>' + optionList(AO_NAMES);

  SELECTED_ELEMENTS = existing ? existing.elementNames.slice() : [];
  renderSelectedElementChips();

  TEAM_LOCATIONS = existing && existing.teamVanLocations ? existing.teamVanLocations.slice() : [];
  document.getElementById('activity-teamvan').addEventListener('input', syncTeamVanCount);

  const searchInput = document.getElementById('element-search-input');
  searchInput.addEventListener('input', () => {
    forceLowercase(searchInput);
    renderElementSearchDropdown();
  });
  searchInput.addEventListener('focus', renderElementSearchDropdown);
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') document.getElementById('element-search-dropdown').style.display = 'none';
  });
  document.addEventListener('click', (e) => {
    const wrap = document.getElementById('element-search-wrap');
    // Selecting/adding an element replaces the dropdown's innerHTML while
    // this same click is still bubbling, which detaches e.target from the
    // document — wrap.contains(e.target) would then wrongly report false.
    // composedPath() is captured at dispatch time and stays accurate even
    // after the target node is removed later in the bubble phase.
    const path = e.composedPath ? e.composedPath() : [e.target];
    if (wrap && !path.includes(wrap)) document.getElementById('element-search-dropdown').style.display = 'none';
  });

  if (existing) {
    document.getElementById('page-title').textContent = 'Edit Activity';
    document.getElementById('activity-state').value = existing.stateName;
    document.getElementById('activity-ao').value = existing.aoName;
    document.getElementById('activity-name').value = existing.name;
    document.getElementById('activity-period-from').value = existing.periodFrom;
    document.getElementById('activity-period-to').value = existing.periodTo;
    document.getElementById('activity-teamvan').value = existing.teamVan;
    document.getElementById('create-activity-btn').textContent = 'Save Changes';
  }

  syncTeamVanCount();

  document.getElementById('cancel-btn').addEventListener('click', () => {
    window.location.href = existing ? `activity-detail.html?id=${existing.id}` : 'activities.html';
  });
  document.getElementById('create-activity-btn').addEventListener('click', () => submitActivityForm(existing));
}

function submitActivityForm(existing) {
  const valid = validateFields([
    { id: 'activity-state', message: 'State Name is required.' },
    { id: 'activity-ao', message: 'AO Name is required.' },
    { id: 'activity-name', message: 'Activity Name is required.' },
    { id: 'activity-period-from', message: 'Period From is required.' },
    { id: 'activity-period-to', message: 'Period To is required.' },
    { id: 'activity-teamvan', message: 'Number of Team/Vans is required.' }
  ]);
  if (!valid) return;

  const elementError = document.getElementById('activity-elements-error');
  if (SELECTED_ELEMENTS.length === 0) {
    elementError.textContent = 'Select at least one element.';
    return;
  }
  elementError.textContent = '';

  const teamLocationsError = document.getElementById('team-locations-error');
  const teamVanCount = TEAM_LOCATIONS.length;
  if (teamVanCount === 0 || TEAM_LOCATIONS.some(loc => !loc || !loc.trim())) {
    teamLocationsError.textContent = `Enter a location for each of the ${teamVanCount || 'N'} team/vans, in order.`;
    return;
  }
  teamLocationsError.textContent = '';

  const periodFrom = document.getElementById('activity-period-from').value;
  const periodTo = document.getElementById('activity-period-to').value;
  if (periodTo < periodFrom) {
    document.getElementById('activity-period-to-error').textContent = 'Period To must be on or after Period From.';
    return;
  }

  const data = {
    stateName: document.getElementById('activity-state').value,
    aoName: document.getElementById('activity-ao').value,
    name: document.getElementById('activity-name').value.trim(),
    periodFrom, periodTo,
    elementNames: SELECTED_ELEMENTS.slice(),
    teamVan: Number(document.getElementById('activity-teamvan').value),
    teamVanLocations: TEAM_LOCATIONS.slice()
  };

  if (existing) {
    updateState(s => { Object.assign(s.activities.find(a => a.id === existing.id), data); });
    showToast('&#10003; Activity updated successfully');
    window.location.href = `activity-detail.html?id=${existing.id}`;
    return;
  }

  const id = nextId('activity');
  updateState(s => { s.activities.push(Object.assign({ id }, data)); });
  showActivitySuccess(id);
}

/* Team/Van location inputs: revealed one at a time, in serial order --- */

// Resizes TEAM_LOCATIONS to match the current "Number of Team/Vans" value
// (preserving already-typed locations by index) and recomputes how many
// boxes should be visible: the filled prefix from index 0, plus one more
// empty box to fill next — capped at the team/van count.
function syncTeamVanCount() {
  const n = Math.max(0, parseInt(document.getElementById('activity-teamvan').value, 10) || 0);
  const resized = TEAM_LOCATIONS.slice(0, n);
  while (resized.length < n) resized.push('');
  TEAM_LOCATIONS = resized;

  let filled = 0;
  while (filled < n && TEAM_LOCATIONS[filled] && TEAM_LOCATIONS[filled].trim()) filled++;
  TEAM_LOCATIONS_REVEALED = n === 0 ? 0 : Math.min(filled + 1, n);

  renderTeamLocationInputs();
}

function renderTeamLocationInputs(focusIndex) {
  const section = document.getElementById('team-locations-section');
  const list = document.getElementById('team-locations-list');
  if (TEAM_LOCATIONS.length === 0) {
    section.style.display = 'none';
    document.getElementById('team-locations-error').textContent = '';
    return;
  }
  section.style.display = '';
  list.innerHTML = TEAM_LOCATIONS.slice(0, TEAM_LOCATIONS_REVEALED).map((val, i) => `
    <div class="form-group">
      <label>Team ${i + 1} Location <span class="req">*</span></label>
      <input type="text" class="form-control team-location-input" data-index="${i}" placeholder="e.g. Mhow" value="${escapeHtml(val || '')}">
    </div>
  `).join('');
  list.querySelectorAll('.team-location-input').forEach(input => {
    input.addEventListener('input', () => onTeamLocationInput(Number(input.dataset.index), input));
  });
  if (focusIndex != null) {
    const target = list.querySelector(`.team-location-input[data-index="${focusIndex}"]`);
    if (target) {
      target.focus();
      target.setSelectionRange(target.value.length, target.value.length);
    }
  }
}

function onTeamLocationInput(i, input) {
  forceLowercase(input);
  TEAM_LOCATIONS[i] = input.value;

  // Reveal the next box only once the last-visible one is filled — keeps
  // the boxes appearing strictly one at a time, in serial order. Only
  // re-render (which rebuilds the input DOM) when the reveal count
  // actually changes, so mid-typing keystrokes never steal focus.
  const revealsNext = i === TEAM_LOCATIONS_REVEALED - 1 && input.value.trim() && TEAM_LOCATIONS_REVEALED < TEAM_LOCATIONS.length;
  if (revealsNext) {
    TEAM_LOCATIONS_REVEALED++;
    renderTeamLocationInputs(i);
  }
}

// Keeps an input's live value lowercased and, separately, strips any Latin
// a-z/A-Z characters so the Hindi field can't accidentally accept English
// typing — both preserve cursor position since neither changes text length
// per removed/changed character in a way that would visibly jump focus.
function forceLowercase(input) {
  const pos = input.selectionStart;
  input.value = input.value.toLowerCase();
  input.setSelectionRange(pos, pos);
}

function blockLatinLetters(input) {
  const pos = input.selectionStart;
  const before = input.value;
  input.value = input.value.replace(/[a-zA-Z]/g, '');
  input.setSelectionRange(pos - (before.length - input.value.length), pos - (before.length - input.value.length));
}

/* Element search + multi-select, with inline bilingual "add new" ---- */

function renderSelectedElementChips() {
  const el = document.getElementById('activity-elements-selected');
  if (SELECTED_ELEMENTS.length === 0) {
    el.innerHTML = '<span class="text-faint" style="font-size:13px;">No elements selected yet.</span>';
    return;
  }
  el.innerHTML = SELECTED_ELEMENTS.map(en => `
    <span class="tag tag-removable">${escapeHtml(en)}<button type="button" onclick='removeSelectedElement(${JSON.stringify(en)})' aria-label="Remove ${escapeHtml(en)}">&times;</button></span>
  `).join('');
}

function removeSelectedElement(en) {
  SELECTED_ELEMENTS = SELECTED_ELEMENTS.filter(x => x !== en);
  renderSelectedElementChips();
  renderElementSearchDropdown();
}

function renderElementSearchDropdown() {
  const query = document.getElementById('element-search-input').value.trim();
  const dropdown = document.getElementById('element-search-dropdown');
  const q = query.toLowerCase();
  const available = getElements().filter(e => !SELECTED_ELEMENTS.includes(e.en));
  const matches = query
    ? available.filter(e => e.en.toLowerCase().includes(q) || e.hi.includes(query))
    : available;

  dropdown.style.display = 'block';

  if (matches.length > 0) {
    dropdown.innerHTML = matches.map(e => `
      <div class="element-search-item" onclick='selectSearchedElement(${JSON.stringify(e.en)})'>
        <span>${escapeHtml(e.en)}</span><span class="element-hi">${escapeHtml(e.hi)}</span>
      </div>`).join('');
  } else if (query) {
    dropdown.innerHTML = `
      <div class="element-search-empty">No elements found for &ldquo;${escapeHtml(query)}&rdquo;</div>
      <div class="element-search-addnew">
        <div class="element-search-addnew-inputs">
          <input type="text" class="form-control" id="new-element-en" placeholder="English name" value="${escapeHtml(query)}">
          <input type="text" class="form-control" id="new-element-hi" placeholder="Hindi name (हिंदी)">
        </div>
        <button type="button" class="btn btn-primary btn-sm btn-block" onclick="handleAddNewElement()">+ Add as New Element</button>
      </div>`;
    const newEnInput = document.getElementById('new-element-en');
    const newHiInput = document.getElementById('new-element-hi');
    newEnInput.addEventListener('input', () => forceLowercase(newEnInput));
    newHiInput.addEventListener('input', () => { forceLowercase(newHiInput); blockLatinLetters(newHiInput); });
  } else {
    dropdown.innerHTML = `<div class="element-search-empty">All elements already selected.</div>`;
  }
}

function selectSearchedElement(en) {
  if (!SELECTED_ELEMENTS.includes(en)) SELECTED_ELEMENTS.push(en);
  document.getElementById('activity-elements-error').textContent = '';
  renderSelectedElementChips();
  document.getElementById('element-search-input').value = '';
  renderElementSearchDropdown();
  document.getElementById('element-search-input').focus();
}

function handleAddNewElement() {
  const enInput = document.getElementById('new-element-en');
  const hiInput = document.getElementById('new-element-hi');
  const en = enInput.value.trim();
  const hi = hiInput.value.trim();
  if (!en || !hi) {
    showToast('Enter both English and Hindi names', { type: 'error' });
    return;
  }
  const added = addElement(en, hi);
  selectSearchedElement(added.en);
  showToast('&#10003; Element added');
}

function showActivitySuccess(id) {
  document.getElementById('activity-form-panel').style.display = 'none';
  const panel = document.getElementById('activity-success-panel');
  panel.style.display = 'block';
  panel.innerHTML = `
    <div class="success-panel">
      <div class="success-icon">&#10003;</div>
      <h2>Activity Created Successfully</h2>
      <div class="success-id mono">Activity Number: ${id}</div>
      <p>Share this Activity Number with the field officer &mdash; they'll use it with their mobile number to log into the mobile app.</p>
      <div class="success-panel-actions">
        <a class="btn btn-secondary" href="activities.html">Back to Activities</a>
        <a class="btn btn-primary" href="activity-detail.html?id=${id}">View Activity</a>
      </div>
    </div>`;
}

/* ================================================================ */
/* Activity Detail                                                    */
/* ================================================================ */

function initActivityDetailPage() {
  const id = getQueryParam('id');
  const a = getActivity(id);
  const root = document.getElementById('page-root');
  if (!a) {
    root.innerHTML = emptyState({ icon: '&#10060;', title: 'Activity Not Found', message: 'This activity may have been deleted.', actionLabel: 'Back to Activities', actionHref: 'activities.html' });
    return;
  }
  renderActivityDetail(a);
}

function renderActivityDetail(a) {
  const root = document.getElementById('page-root');
  const subs = getSubmissionsForActivity(a.id).sort((x, y) => y.submittedAt.localeCompare(x.submittedAt));

  root.innerHTML = `
    ${breadcrumbs([{ label: 'Activities', href: 'activities.html' }, { label: a.id }])}
    <div class="detail-header">
      <div class="detail-header-top">
        <div>
          <h1>${escapeHtml(a.name)}</h1>
          <div class="detail-sub">
            <span class="mono">${a.id}</span>
            <span>&middot;</span>
            <span>${escapeHtml(a.stateName)}</span>
            <span>&middot;</span>
            ${badge(computeActivityLifecycle(a))}
          </div>
        </div>
        <div class="detail-header-actions">
          <a class="btn btn-secondary" href="activity-create.html?edit=${a.id}">Edit Activity</a>
          <button class="btn btn-danger" onclick="handleDeleteActivity('${a.id}')">Delete Activity</button>
        </div>
      </div>
      <div class="kv-grid" style="margin-top: var(--sp-5);">
        <div class="kv-item"><div class="kv-label">State Name</div><div class="kv-value">${escapeHtml(a.stateName)}</div></div>
        <div class="kv-item"><div class="kv-label">AO Name</div><div class="kv-value">${escapeHtml(a.aoName)}</div></div>
        <div class="kv-item"><div class="kv-label">Period</div><div class="kv-value">${formatDateRange(a.periodFrom, a.periodTo)}</div></div>
        <div class="kv-item">
          <div class="kv-label">Element Name</div>
          <div class="tag-list" style="margin-top:4px;">${(a.elementNames || []).map(e => `<span class="tag">${escapeHtml(e)}</span>`).join('') || '&mdash;'}</div>
        </div>
        <div class="kv-item"><div class="kv-label">Number of Team/Vans</div><div class="kv-value">${escapeHtml(a.teamVan)}</div></div>
        <div class="kv-item">
          <div class="kv-label">Team/Van Locations</div>
          <div class="tag-list" style="margin-top:4px;">${(a.teamVanLocations || []).map((loc, i) => `<span class="tag">Team ${i + 1}: ${escapeHtml(loc)}</span>`).join('') || '&mdash;'}</div>
        </div>
      </div>
      <p class="form-hint" style="margin: var(--sp-3) 0 0;">Field officers log into the mobile app using this Activity Number and their mobile number &mdash; no separate agent assignment is required.</p>
    </div>

    <div class="section-title-row"><h2>Submissions</h2></div>
    <div id="activity-submissions-table"></div>
  `;

  const wrap = document.getElementById('activity-submissions-table');
  if (subs.length === 0) {
    wrap.innerHTML = emptyState({ icon: '&#128247;', title: 'No Submissions Yet', message: 'No field officer has submitted evidence for this activity yet.' });
  } else {
    wrap.innerHTML = `<div class="table-wrap card"><table class="data-table"><thead><tr>
      <th>Submission</th><th>Mobile</th><th>Team No</th><th>Submitted At</th><th>Location</th><th>Status</th><th></th>
    </tr></thead><tbody>
      ${subs.map(s => `<tr>
        <td class="mono"><a class="table-link" href="submission-detail.html?id=${s.id}">${s.id}</a></td>
        <td class="mono">${escapeHtml(s.mobile)}</td>
        <td>${s.teamNo ? escapeHtml(s.teamNo) : '<span class="text-faint">&mdash;</span>'}</td>
        <td>${formatDateTime(s.submittedAt)}</td>
        <td>${escapeHtml(s.location)}</td>
        <td>${badge(s.status)}</td>
        <td><a class="btn btn-secondary btn-sm" href="submission-detail.html?id=${s.id}">View</a></td>
      </tr>`).join('')}
    </tbody></table></div>`;
  }
}

/* ================================================================ */
/* Submissions: List + Detail                                         */
/* ================================================================ */

// Row-expand + cross-row photo-selection state for the Submissions list.
// Both persist across re-renders (filtering, toggling other rows) for the
// lifetime of the page — reset only on a fresh page load.
let EXPANDED_SUBMISSIONS = new Set();
let SELECTED_PHOTOS = new Set(); // keys are `${submissionId}::${photoIndex}`

function initSubmissionsPage() {
  const state = getState();
  document.getElementById('filter-activity').innerHTML = '<option value="">All Activities</option>' + state.activities.map(a => `<option value="${a.id}">${a.id} &mdash; ${escapeHtml(a.name)}</option>`).join('');

  const presetActivity = getQueryParam('activity');
  if (presetActivity) document.getElementById('filter-activity').value = presetActivity;

  ['filter-search', 'filter-activity'].forEach(id => {
    document.getElementById(id).addEventListener('input', renderSubmissionsTable);
    document.getElementById(id).addEventListener('change', renderSubmissionsTable);
  });
  document.getElementById('toggle-expand-all-btn').addEventListener('click', toggleExpandAllSubmissions);
  renderSubmissionsTable();
}

function getFilteredSubmissions() {
  const state = getState();
  const search = (document.getElementById('filter-search').value || '').toLowerCase();
  const activityId = document.getElementById('filter-activity').value;

  return state.submissions.filter(s => {
    const activity = getActivity(s.activityId);
    if (search && !((activity && activity.name.toLowerCase().includes(search)) || s.id.toLowerCase().includes(search) || s.activityId.toLowerCase().includes(search) || s.mobile.includes(search) || (s.teamNo && s.teamNo.toLowerCase().includes(search)))) return false;
    if (activityId && s.activityId !== activityId) return false;
    return true;
  }).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

function renderSubmissionsTable() {
  const rows = getFilteredSubmissions();

  const tbody = document.getElementById('submissions-tbody');
  const empty = document.getElementById('submissions-empty');
  const wrap = document.getElementById('submissions-table-wrap');

  updateExpandAllButton(rows);
  renderSelectionBar();

  if (rows.length === 0) {
    wrap.style.display = 'none';
    empty.style.display = 'block';
    empty.innerHTML = emptyState({ icon: '&#128247;', title: 'No Submissions Found', message: 'No field evidence matches your filters yet.' });
    return;
  }
  wrap.style.display = 'block';
  empty.style.display = 'none';

  tbody.innerHTML = rows.map(s => {
    const activity = getActivity(s.activityId);
    const expanded = EXPANDED_SUBMISSIONS.has(s.id);
    const row = `<tr>
      <td class="expand-toggle-cell"><button type="button" class="expand-chevron ${expanded ? 'expanded' : ''}" onclick="toggleSubmissionRow('${s.id}')" aria-label="${expanded ? 'Collapse' : 'Expand'} photos for ${s.id}">&#9656;</button></td>
      <td class="mono"><a class="table-link" href="submission-detail.html?id=${s.id}">${s.id}</a></td>
      <td class="mono">${escapeHtml(s.mobile)}</td>
      <td>${s.teamNo ? escapeHtml(s.teamNo) : '<span class="text-faint">&mdash;</span>'}</td>
      <td>${activity ? escapeHtml(activity.name) : s.activityId}</td>
      <td>${formatTimeOnly(s.submittedAt)}</td>
      <td>${escapeHtml(s.location)}</td>
      <td><a class="btn btn-secondary btn-sm" href="submission-detail.html?id=${s.id}">View</a></td>
    </tr>`;
    const expandRow = expanded
      ? `<tr class="submission-expand-row"><td colspan="8"><div class="submission-photo-panel">${renderSubmissionRowPhotos(s)}</div></td></tr>`
      : '';
    return row + expandRow;
  }).join('');
}

function toggleSubmissionRow(id) {
  if (EXPANDED_SUBMISSIONS.has(id)) EXPANDED_SUBMISSIONS.delete(id);
  else EXPANDED_SUBMISSIONS.add(id);
  renderSubmissionsTable();
}

function toggleExpandAllSubmissions() {
  const rows = getFilteredSubmissions();
  const allExpanded = rows.length > 0 && rows.every(s => EXPANDED_SUBMISSIONS.has(s.id));
  rows.forEach(s => allExpanded ? EXPANDED_SUBMISSIONS.delete(s.id) : EXPANDED_SUBMISSIONS.add(s.id));
  renderSubmissionsTable();
}

function updateExpandAllButton(rows) {
  const btn = document.getElementById('toggle-expand-all-btn');
  if (!btn) return;
  const allExpanded = rows.length > 0 && rows.every(s => EXPANDED_SUBMISSIONS.has(s.id));
  btn.textContent = allExpanded ? 'Collapse All' : 'Expand All';
  btn.disabled = rows.length === 0;
}

// Per-row photo grid for the expanded Submissions-list row. Distinct from
// app.js's shared renderPhotoGrid (used on Submission Detail pages) because
// each thumbnail here also carries a select toggle for cross-row selection.
function renderSubmissionRowPhotos(sub) {
  const files = getSubmissionPhotos(sub);
  const srcs = files.map(f => SUBMISSION_PHOTO_BASE + f);
  const captures = sub.captures || [];
  return `<div class="photo-grid photo-grid-compact">
    ${srcs.map((src, i) => {
      const key = sub.id + '::' + i;
      const selected = SELECTED_PHOTOS.has(key);
      const tags = captures[i] ? captures[i].elementNames.join(', ') : `Photo ${i + 1}`;
      return `
      <div class="photo-card submission-photo-card ${selected ? 'selected' : ''}" data-photo-key="${key}" onclick='openImageLightbox(${JSON.stringify(srcs)}, ${i})'>
        <button type="button" class="photo-select-toggle" aria-label="${selected ? 'Deselect' : 'Select'} photo" onclick='event.stopPropagation(); togglePhotoSelection(${JSON.stringify(key)}, this.closest(".submission-photo-card"))'>${selected ? '&#10003;' : ''}</button>
        <img src="${src}" alt="Submission photo ${i + 1}" loading="lazy">
        <div class="photo-card-label"><span>${escapeHtml(tags)}</span><span>&#128269;</span></div>
      </div>`;
    }).join('')}
  </div>`;
}

function togglePhotoSelection(key, cardEl) {
  let selected;
  if (SELECTED_PHOTOS.has(key)) {
    SELECTED_PHOTOS.delete(key);
    selected = false;
  } else {
    SELECTED_PHOTOS.add(key);
    selected = true;
  }
  if (cardEl) {
    cardEl.classList.toggle('selected', selected);
    const toggleBtn = cardEl.querySelector('.photo-select-toggle');
    if (toggleBtn) {
      toggleBtn.innerHTML = selected ? '&#10003;' : '';
      toggleBtn.setAttribute('aria-label', (selected ? 'Deselect' : 'Select') + ' photo');
    }
  }
  renderSelectionBar();
}

function clearPhotoSelection() {
  SELECTED_PHOTOS.clear();
  document.querySelectorAll('.submission-photo-card.selected').forEach(el => {
    el.classList.remove('selected');
    const btn = el.querySelector('.photo-select-toggle');
    if (btn) { btn.innerHTML = ''; btn.setAttribute('aria-label', 'Select photo'); }
  });
  renderSelectionBar();
}

function renderSelectionBar() {
  const bar = document.getElementById('selection-bar');
  if (!bar) return;
  const count = SELECTED_PHOTOS.size;
  if (count === 0) {
    bar.style.display = 'none';
    bar.innerHTML = '';
    return;
  }
  const submissionCount = new Set(Array.from(SELECTED_PHOTOS).map(k => k.split('::')[0])).size;
  bar.style.display = 'flex';
  bar.innerHTML = `
    <span><strong>${count}</strong> photo${count !== 1 ? 's' : ''} selected across <strong>${submissionCount}</strong> submission${submissionCount !== 1 ? 's' : ''}</span>
    <button type="button" class="btn btn-secondary btn-sm" onclick="clearPhotoSelection()">Clear Selection</button>
  `;
}

function initSubmissionDetailPage() {
  const id = getQueryParam('id');
  const sub = getSubmission(id);
  const root = document.getElementById('page-root');
  if (!sub) {
    root.innerHTML = emptyState({ icon: '&#10060;', title: 'Submission Not Found', message: 'This submission may not exist.', actionLabel: 'Back to Submissions', actionHref: 'submissions.html' });
    return;
  }
  renderSubmissionDetail(id);
}

function renderSubmissionDetail(id) {
  const sub = getSubmission(id);
  const root = document.getElementById('page-root');
  const activity = getActivity(sub.activityId);

  root.innerHTML = `
    ${breadcrumbs([{ label: 'Submissions', href: 'submissions.html' }, { label: sub.id }])}
    <div class="detail-header">
      <div class="detail-header-top">
        <div>
          <div class="detail-eyebrow mono">${sub.id}</div>
          <h1>${activity ? escapeHtml(activity.name) : sub.activityId}</h1>
          <div class="detail-sub"><span class="mono">${escapeHtml(sub.mobile)}</span><span>&middot;</span><span>${formatDateTime(sub.submittedAt)}</span><span>&middot;</span>${badge(sub.status)}</div>
        </div>
      </div>
    </div>

    <div class="detail-layout">
      <div>
        <div class="section-title-row"><h2>Photo Evidence</h2></div>
        ${renderPhotoGrid(sub)}
      </div>
      <div>
        <div class="card">
          <div class="card-header"><h3>Submission Details</h3></div>
          <div class="card-body">
            <div class="kv-grid" style="grid-template-columns:1fr;">
              <div class="kv-item"><div class="kv-label">Submitted By (Mobile)</div><div class="kv-value mono">${escapeHtml(sub.mobile)}</div></div>
              <div class="kv-item"><div class="kv-label">Team No</div><div class="kv-value">${sub.teamNo ? escapeHtml(sub.teamNo) : '&mdash;'}</div></div>
              <div class="kv-item"><div class="kv-label">Activity</div><div class="kv-value"><a href="activity-detail.html?id=${sub.activityId}">${sub.activityId}${activity ? ' &mdash; ' + escapeHtml(activity.name) : ''}</a></div></div>
              <div class="kv-item"><div class="kv-label">Submitted</div><div class="kv-value">${formatDateTime(sub.submittedAt)}</div></div>
              <div class="kv-item"><div class="kv-label">Latitude</div><div class="kv-value mono">${sub.lat}</div></div>
              <div class="kv-item"><div class="kv-label">Longitude</div><div class="kv-value mono">${sub.lng}</div></div>
              <div class="kv-item"><div class="kv-label">Location</div><div class="kv-value">${escapeHtml(sub.location)}</div></div>
              <div class="kv-item"><div class="kv-label">GPS Accuracy</div><div class="kv-value">${sub.accuracy ? sub.accuracy + ' meters' : '&mdash;'}</div></div>
              <div class="kv-item"><div class="kv-label">Device Timestamp</div><div class="kv-value">${escapeHtml(sub.deviceTimestamp)}</div></div>
              <div class="kv-item"><div class="kv-label">Server Timestamp</div><div class="kv-value">${escapeHtml(sub.serverTimestamp)}</div></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/* ================================================================ */
/* Settings                                                            */
/* ================================================================ */

function initSettingsPage() {
  document.getElementById('reset-demo-btn').addEventListener('click', () => {
    confirmDialog({
      title: 'Reset Demo Data?',
      message: 'This will restore all activities and submissions to their original demo state. Any changes you have made, including mobile submissions, will be lost.',
      confirmText: 'Reset Data',
      danger: true,
      onConfirm: () => {
        resetDemoData();
        closeModal();
        showToast('&#10003; Demo data has been reset');
        setTimeout(() => window.location.href = 'dashboard.html', 700);
      }
    });
  });
}
