/**
 * desktop.js
 * Controller logic for the Desktop Admin application. Each page's
 * HTML contains static structure with a mount point (or fixed IDs for
 * list pages); this file renders dynamic content, wires up filters,
 * forms and actions, and reads/writes shared state via app.js.
 */

/* ================================================================ */
/* Shell: header + sidebar                                           */
/* ================================================================ */

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: '&#9638;', href: 'dashboard.html' },
  { key: 'events', label: 'Events', icon: '&#128197;', href: 'events.html' },
  { key: 'activities', label: 'Activities', icon: '&#128205;', href: 'activities.html' },
  { key: 'tasks', label: 'Tasks', icon: '&#9989;', href: 'tasks.html' },
  { key: 'agents', label: 'Agents', icon: '&#128100;', href: 'agents.html' },
  { key: 'submissions', label: 'Submissions', icon: '&#128247;', href: 'submissions.html' },
  { key: 'reports', label: 'Reports', icon: '&#128202;', href: 'reports.html' },
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
              <a href="agents.html">Manage Agents</a>
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

function renderMapPlaceholder(lat, lng, extraClass) {
  return `<div class="placeholder-box map-placeholder ${extraClass || ''}">
    <div class="ph-icon">&#128205;</div>
    <div class="ph-label">Map Placeholder</div>
    <div class="ph-coords">${(lat !== undefined && lat !== null && lat !== '') ? `${lat}, ${lng}` : 'Coordinates not set'}</div>
  </div>`;
}

function optionList(values, selected) {
  return values.map(v => `<option value="${escapeHtml(v)}" ${v === selected ? 'selected' : ''}>${escapeHtml(v)}</option>`).join('');
}

function formatTime12(t) {
  if (!t) return '';
  let [h, m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12; if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, '0')} ${ap}`;
}

function agentNames(ids) {
  return (ids || []).map(id => { const a = getAgent(id); return a ? a.name : id; });
}

/* Agent picker (checkbox list + chips), reused on activity-create,
   task-create and the "Edit Agents" modal on activity-detail. */

const AGENT_PICKER_LINKS = {};

function setupAgentPicker(pickerId, chipsId, selectedIds) {
  AGENT_PICKER_LINKS[pickerId] = chipsId;
  renderAgentPicker(pickerId, selectedIds);
  renderAgentChips(chipsId, pickerId);
}

function renderAgentPicker(pickerId, selectedIds) {
  const agents = getState().agents;
  const el = document.getElementById(pickerId);
  if (!el) return;
  el.innerHTML = agents.map(a => `
    <label class="agent-picker-row">
      <input type="checkbox" value="${a.id}" ${selectedIds.includes(a.id) ? 'checked' : ''} onchange="syncAgentChips('${pickerId}')">
      <span class="agent-avatar">${initials(a.name)}</span>
      <span class="agent-picker-name">${escapeHtml(a.name)}</span>
      <span class="agent-picker-mobile">${a.mobile}</span>
    </label>`).join('');
}

function getCheckedAgentIds(pickerId) {
  return Array.from(document.querySelectorAll('#' + pickerId + ' input[type=checkbox]:checked')).map(cb => cb.value);
}

function renderAgentChips(chipsId, pickerId) {
  const selected = getCheckedAgentIds(pickerId);
  const el = document.getElementById(chipsId);
  if (!el) return;
  if (selected.length === 0) {
    el.innerHTML = '<span class="text-faint" style="font-size:12.5px;">No agents selected</span>';
    return;
  }
  el.innerHTML = selected.map(id => {
    const a = getAgent(id);
    return `<span class="chip">${escapeHtml(a.name)}<button type="button" onclick="removeAgentFromPicker('${pickerId}','${id}','${chipsId}')">&times;</button></span>`;
  }).join('');
}

function syncAgentChips(pickerId) {
  renderAgentChips(AGENT_PICKER_LINKS[pickerId], pickerId);
}

function removeAgentFromPicker(pickerId, agentId, chipsId) {
  const cb = document.querySelector('#' + pickerId + ' input[value="' + agentId + '"]');
  if (cb) cb.checked = false;
  renderAgentChips(chipsId, pickerId);
}

/* Element tiles (checkbox grid), reused on event-create / activity-create */

function renderElementTiles(containerId, allElements, selected) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = allElements.map(e => `
    <label class="element-tile ${selected.includes(e) ? 'checked' : ''}">
      <input type="checkbox" value="${escapeHtml(e)}" ${selected.includes(e) ? 'checked' : ''} onchange="this.closest('.element-tile').classList.toggle('checked', this.checked)">
      ${escapeHtml(e)}
    </label>`).join('');
}

function getCheckedValues(containerId) {
  return Array.from(document.querySelectorAll('#' + containerId + ' input:checked')).map(cb => cb.value);
}

/* ================================================================ */
/* Cascade delete helpers                                            */
/* ================================================================ */

function deleteTaskCascade(taskId) {
  updateState(s => {
    s.tasks = s.tasks.filter(t => t.id !== taskId);
    s.submissions = s.submissions.filter(sub => sub.taskId !== taskId);
  });
}

function deleteActivityCascade(activityId) {
  const taskIds = getTasksForActivity(activityId).map(t => t.id);
  updateState(s => {
    s.activities = s.activities.filter(a => a.id !== activityId);
    s.tasks = s.tasks.filter(t => t.activityId !== activityId);
    s.submissions = s.submissions.filter(sub => !taskIds.includes(sub.taskId));
  });
}

function deleteEventCascade(eventId) {
  const activityIds = getActivitiesForEvent(eventId).map(a => a.id);
  const taskIds = getState().tasks.filter(t => activityIds.includes(t.activityId)).map(t => t.id);
  updateState(s => {
    s.events = s.events.filter(e => e.id !== eventId);
    s.activities = s.activities.filter(a => a.eventId !== eventId);
    s.tasks = s.tasks.filter(t => !activityIds.includes(t.activityId));
    s.submissions = s.submissions.filter(sub => !taskIds.includes(sub.taskId));
  });
}

/* ================================================================ */
/* Dashboard                                                          */
/* ================================================================ */

function initDashboardPage() {
  const state = getState();
  const totalEvents = state.events.length;
  const activeEvents = state.events.filter(e => e.status === 'Active').length;
  const totalActivities = state.activities.length;
  const assignedAgents = new Set(state.activities.flatMap(a => a.agentIds || [])).size;
  let pendingTasks = 0, completedTasks = 0;
  state.tasks.forEach(t => { computeTaskStatus(t) === 'Completed' ? completedTasks++ : pendingTasks++; });

  document.getElementById('stat-total-events').textContent = totalEvents;
  document.getElementById('stat-active-events').textContent = activeEvents;
  document.getElementById('stat-activities').textContent = totalActivities;
  document.getElementById('stat-agents').textContent = assignedAgents;
  document.getElementById('stat-pending-tasks').textContent = pendingTasks;
  document.getElementById('stat-completed-tasks').textContent = completedTasks;

  const tbody = document.getElementById('dashboard-events-tbody');
  tbody.innerHTML = state.events.map(ev => {
    const stats = computeEventStats(ev);
    return `<tr onclick="window.location='event-detail.html?id=${ev.id}'" style="cursor:pointer">
      <td><span class="table-link">${escapeHtml(ev.name)}</span><br><span class="text-faint mono">${ev.id}</span></td>
      <td>${formatDateRange(ev.dateFrom, ev.dateTo)}</td>
      <td class="num">${stats.activities}</td>
      <td class="num">${stats.agents}</td>
      <td class="num">${stats.tasks}</td>
      <td>${progressBar(stats.progress)}</td>
      <td>${badge(ev.status)}</td>
    </tr>`;
  }).join('');

  const todayActivities = state.activities.filter(a => a.startDate <= DEMO_TODAY && DEMO_TODAY <= a.endDate);
  const todayList = document.getElementById('today-activities-list');
  if (todayActivities.length === 0) {
    todayList.innerHTML = emptyState({ icon: '&#128197;', title: 'No Activities Today', message: 'There are no activities scheduled for today.' });
  } else {
    todayList.innerHTML = todayActivities.map(a => {
      const stats = computeActivityStats(a);
      return `<div class="today-activity-card">
        <div class="today-activity-main">
          <div class="today-activity-icon">&#128205;</div>
          <div>
            <div class="today-activity-id mono">${a.id}</div>
            <div class="today-activity-name">${escapeHtml(a.name)}</div>
          </div>
        </div>
        <div class="today-activity-stats">
          <span><strong>${stats.agents}</strong> Agents</span>
          <span><strong>${stats.tasks}</strong> Tasks</span>
          <span><strong>${stats.completed}</strong> Completed</span>
          <span><strong>${stats.pending}</strong> Pending</span>
        </div>
        <a class="btn btn-secondary btn-sm" href="activity-detail.html?id=${a.id}">View Activity</a>
      </div>`;
    }).join('');
  }
}

/* ================================================================ */
/* Events: List                                                       */
/* ================================================================ */

function initEventsListPage() {
  const state = getState();
  const citySel = document.getElementById('filter-city');
  const cities = [...new Set(state.events.map(e => e.city))].sort();
  citySel.innerHTML = '<option value="">All Cities</option>' + optionList(cities);
  document.getElementById('filter-status').innerHTML = '<option value="">All Statuses</option>' + optionList(EVENT_STATUSES);

  ['filter-search', 'filter-status', 'filter-date-from', 'filter-date-to', 'filter-city'].forEach(id => {
    document.getElementById(id).addEventListener('input', renderEventsTable);
    document.getElementById(id).addEventListener('change', renderEventsTable);
  });
  renderEventsTable();
}

function renderEventsTable() {
  const state = getState();
  const search = (document.getElementById('filter-search').value || '').toLowerCase();
  const status = document.getElementById('filter-status').value;
  const dateFrom = document.getElementById('filter-date-from').value;
  const dateTo = document.getElementById('filter-date-to').value;
  const city = document.getElementById('filter-city').value;

  let rows = state.events.filter(e => {
    if (search && !(e.name.toLowerCase().includes(search) || e.id.toLowerCase().includes(search))) return false;
    if (status && e.status !== status) return false;
    if (city && e.city !== city) return false;
    if (dateFrom && e.dateTo < dateFrom) return false;
    if (dateTo && e.dateFrom > dateTo) return false;
    return true;
  });

  const tbody = document.getElementById('events-tbody');
  const empty = document.getElementById('events-empty');
  const wrap = document.getElementById('events-table-wrap');

  if (rows.length === 0) {
    wrap.style.display = 'none';
    empty.style.display = 'block';
    empty.innerHTML = emptyState({ icon: '&#128197;', title: 'No Events Found', message: 'Try adjusting your filters, or create a new event.', actionLabel: '+ Create Event', actionHref: 'event-create.html' });
    return;
  }
  wrap.style.display = 'block';
  empty.style.display = 'none';

  tbody.innerHTML = rows.map(ev => {
    const stats = computeEventStats(ev);
    return `<tr>
      <td><a class="table-link" href="event-detail.html?id=${ev.id}">${escapeHtml(ev.name)}</a></td>
      <td class="mono">${ev.id}</td>
      <td>${formatDateShort(ev.dateFrom)}</td>
      <td>${formatDate(ev.dateTo)}</td>
      <td class="num">${stats.activities}</td>
      <td>${badge(ev.status)}</td>
      <td>
        <div class="row-actions">
          <a class="btn btn-secondary btn-sm" href="event-detail.html?id=${ev.id}">View</a>
          <a class="btn btn-secondary btn-sm" href="event-create.html?edit=${ev.id}">Edit</a>
          <button class="btn btn-ghost btn-sm" onclick="handleDeleteEvent('${ev.id}')">Delete</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function handleDeleteEvent(id) {
  const ev = getEvent(id);
  confirmDialog({
    title: 'Delete Event?',
    message: `Are you sure you want to delete <strong>${escapeHtml(ev.name)}</strong> (${id})? All activities, tasks and submissions under this event will also be removed. This action cannot be undone.`,
    confirmText: 'Delete',
    danger: true,
    onConfirm: () => {
      deleteEventCascade(id);
      closeModal();
      showToast('Event deleted');
      if (document.getElementById('events-tbody')) renderEventsTable();
      else window.location.href = 'events.html';
    }
  });
}

/* ================================================================ */
/* Events: Create / Edit                                              */
/* ================================================================ */

let EVENT_ELEMENTS_STATE = [];

function initEventCreatePage() {
  const editId = getQueryParam('edit');
  const existing = editId ? getEvent(editId) : null;

  EVENT_ELEMENTS_STATE = [...EVENT_ELEMENTS];
  const selectedElements = existing ? existing.elements.slice() : ['Product Display', 'Branding'];
  (existing ? existing.elements : []).forEach(e => { if (!EVENT_ELEMENTS_STATE.includes(e)) EVENT_ELEMENTS_STATE.push(e); });

  renderElementTiles('event-elements-tiles', EVENT_ELEMENTS_STATE, selectedElements);

  if (existing) {
    document.getElementById('page-title').textContent = 'Edit Event';
    document.getElementById('event-name').value = existing.name;
    document.getElementById('event-description').value = existing.description || '';
    document.getElementById('event-brand').value = existing.brand || '';
    document.getElementById('event-product').value = existing.product || '';
    document.getElementById('event-date-from').value = existing.dateFrom;
    document.getElementById('event-date-to').value = existing.dateTo;
    document.getElementById('event-city').value = existing.city || '';
    document.getElementById('event-state').value = existing.state || '';
    document.getElementById('event-audience').value = existing.targetAudience || '';
    document.getElementById('event-footfall').value = existing.expectedFootfall || '';
    document.getElementById('event-instructions').value = existing.instructions || '';
    document.getElementById('create-event-btn').textContent = 'Save Changes';
  }

  document.getElementById('add-custom-element-btn').addEventListener('click', () => {
    const input = document.getElementById('custom-element-input');
    const val = input.value.trim();
    if (!val) return;
    if (!EVENT_ELEMENTS_STATE.includes(val)) EVENT_ELEMENTS_STATE.push(val);
    const currentlyChecked = getCheckedValues('event-elements-tiles');
    currentlyChecked.push(val);
    renderElementTiles('event-elements-tiles', EVENT_ELEMENTS_STATE, currentlyChecked);
    input.value = '';
  });

  document.getElementById('cancel-btn').addEventListener('click', () => {
    window.location.href = existing ? `event-detail.html?id=${existing.id}` : 'events.html';
  });
  document.getElementById('save-draft-btn').addEventListener('click', () => submitEventForm('Draft', existing));
  document.getElementById('create-event-btn').addEventListener('click', () => submitEventForm(existing ? existing.status : 'Scheduled', existing));
}

function submitEventForm(status, existing) {
  const valid = validateFields([
    { id: 'event-name', message: 'Event Name is required.' },
    { id: 'event-date-from', message: 'Date From is required.' },
    { id: 'event-date-to', message: 'Date To is required.' }
  ]);
  if (!valid) return;

  const dateFrom = document.getElementById('event-date-from').value;
  const dateTo = document.getElementById('event-date-to').value;
  if (dateTo < dateFrom) {
    document.getElementById('event-date-to-error').textContent = 'Date To must be after Date From.';
    return;
  }

  const data = {
    name: document.getElementById('event-name').value.trim(),
    description: document.getElementById('event-description').value.trim(),
    brand: document.getElementById('event-brand').value.trim(),
    product: document.getElementById('event-product').value.trim(),
    dateFrom, dateTo,
    city: document.getElementById('event-city').value.trim(),
    state: document.getElementById('event-state').value.trim(),
    targetAudience: document.getElementById('event-audience').value.trim(),
    expectedFootfall: Number(document.getElementById('event-footfall').value) || 0,
    instructions: document.getElementById('event-instructions').value.trim(),
    elements: getCheckedValues('event-elements-tiles'),
    status: status
  };

  if (existing) {
    updateState(s => { Object.assign(s.events.find(e => e.id === existing.id), data); });
    showToast('&#10003; Event updated successfully');
    window.location.href = `event-detail.html?id=${existing.id}`;
    return;
  }

  const id = nextId('event');
  updateState(s => { s.events.push(Object.assign({ id }, data)); });
  showEventSuccess(id);
}

function showEventSuccess(id) {
  document.getElementById('event-form-panel').style.display = 'none';
  const panel = document.getElementById('event-success-panel');
  panel.style.display = 'block';
  panel.innerHTML = `
    <div class="success-panel">
      <div class="success-icon">&#10003;</div>
      <h2>Event Created Successfully</h2>
      <div class="success-id mono">${id}</div>
      <p>Your event has been created. You can now add activities to it.</p>
      <div class="success-panel-actions">
        <a class="btn btn-secondary" href="events.html">Back to Events</a>
        <a class="btn btn-primary" href="event-detail.html?id=${id}">View Event</a>
      </div>
    </div>`;
}

/* ================================================================ */
/* Event Detail                                                       */
/* ================================================================ */

function initEventDetailPage() {
  const id = getQueryParam('id');
  const ev = getEvent(id);
  const root = document.getElementById('page-root');
  if (!ev) {
    root.innerHTML = emptyState({ icon: '&#10060;', title: 'Event Not Found', message: 'This event may have been deleted.', actionLabel: 'Back to Events', actionHref: 'events.html' });
    return;
  }
  renderEventDetail(ev);
}

function renderEventDetail(ev) {
  const root = document.getElementById('page-root');
  const stats = computeEventStats(ev);
  const activities = getActivitiesForEvent(ev.id);

  root.innerHTML = `
    ${breadcrumbs([{ label: 'Events', href: 'events.html' }, { label: ev.name }])}
    <div class="detail-header">
      <div class="detail-header-top">
        <div>
          <div class="detail-eyebrow mono">${ev.id}</div>
          <h1>${escapeHtml(ev.name)}</h1>
          <div class="detail-sub">
            <span>${formatDateRange(ev.dateFrom, ev.dateTo)}</span>
            <span>&middot;</span>
            <span>${escapeHtml(ev.city)}${ev.state ? ', ' + escapeHtml(ev.state) : ''}</span>
            <span>&middot;</span>
            ${badge(ev.status)}
          </div>
        </div>
        <div class="detail-header-actions">
          <a class="btn btn-secondary" href="event-create.html?edit=${ev.id}">Edit Event</a>
          <a class="btn btn-primary" href="activity-create.html?eventId=${ev.id}">+ Add Activity</a>
        </div>
      </div>
    </div>

    <div class="stat-grid" style="grid-template-columns:repeat(4,1fr); margin-bottom: var(--sp-5);">
      <div class="stat-card"><div class="stat-label">Activities</div><div class="stat-value">${stats.activities}</div></div>
      <div class="stat-card"><div class="stat-label">Assigned Agents</div><div class="stat-value">${stats.agents}</div></div>
      <div class="stat-card"><div class="stat-label">Total Tasks</div><div class="stat-value">${stats.tasks}</div></div>
      <div class="stat-card"><div class="stat-label">Progress</div><div class="stat-value">${stats.progress}%</div></div>
    </div>

    <div class="detail-layout">
      <div>
        <div class="section-title-row"><h2>Activities</h2></div>
        <div id="event-activities-grid"></div>
      </div>
      <div>
        <div class="card">
          <div class="card-header"><h3>Event Information</h3></div>
          <div class="card-body">
            <div class="kv-grid" style="grid-template-columns:1fr;">
              <div class="kv-item"><div class="kv-label">Brand / Campaign</div><div class="kv-value">${escapeHtml(ev.brand || '&mdash;')}</div></div>
              <div class="kv-item"><div class="kv-label">Product</div><div class="kv-value">${escapeHtml(ev.product || '&mdash;')}</div></div>
              <div class="kv-item"><div class="kv-label">Target Audience</div><div class="kv-value">${escapeHtml(ev.targetAudience || '&mdash;')}</div></div>
              <div class="kv-item"><div class="kv-label">Expected Footfall</div><div class="kv-value">${ev.expectedFootfall ? ev.expectedFootfall.toLocaleString() : '&mdash;'}</div></div>
              <div class="kv-item"><div class="kv-label">Description</div><div class="kv-value">${escapeHtml(ev.description || '&mdash;')}</div></div>
              <div class="kv-item"><div class="kv-label">Special Instructions</div><div class="kv-value">${escapeHtml(ev.instructions || '&mdash;')}</div></div>
              <div class="kv-item">
                <div class="kv-label">Event Elements</div>
                <div class="tag-list" style="margin-top:4px;">${(ev.elements || []).map(e => `<span class="tag">${escapeHtml(e)}</span>`).join('') || '&mdash;'}</div>
              </div>
            </div>
          </div>
        </div>
        <div style="margin-top: var(--sp-4);">
          <button class="btn btn-ghost btn-sm" style="color:var(--color-red);" onclick="handleDeleteEvent('${ev.id}')">Delete Event</button>
        </div>
      </div>
    </div>
  `;

  const grid = document.getElementById('event-activities-grid');
  if (activities.length === 0) {
    grid.innerHTML = emptyState({ icon: '&#128205;', title: 'No Activities Found', message: 'This event does not have any activities yet.', actionLabel: '+ Create Activity', actionHref: `activity-create.html?eventId=${ev.id}` });
  } else {
    grid.innerHTML = `<div class="card-grid">${activities.map(a => {
      const astats = computeActivityStats(a);
      return `<div class="entity-card">
        <div class="entity-card-top">
          <div>
            <div class="entity-card-id mono">${a.id}</div>
            <div class="entity-card-title">${escapeHtml(a.name)}</div>
          </div>
          ${badge(a.status)}
        </div>
        <div class="entity-card-meta">
          <span>${formatDateRange(a.startDate, a.endDate)}</span>
          <span>${escapeHtml(a.location.city)}</span>
        </div>
        <div class="entity-card-stats">
          <span><strong>${astats.agents}</strong>Agents</span>
          <span><strong>${astats.tasks}</strong>Tasks</span>
          <span><strong>${astats.progress}%</strong>Complete</span>
        </div>
        <div class="entity-card-footer">
          ${progressBar(astats.progress, { hideLabel: true })}
          <a class="btn btn-secondary btn-sm" href="activity-detail.html?id=${a.id}">View Activity</a>
        </div>
      </div>`;
    }).join('')}</div>`;
  }
}

/* ================================================================ */
/* Activities: List                                                   */
/* ================================================================ */

function initActivitiesListPage() {
  const state = getState();
  document.getElementById('filter-event').innerHTML = '<option value="">All Events</option>' + state.events.map(e => `<option value="${e.id}">${escapeHtml(e.name)}</option>`).join('');
  document.getElementById('filter-city').innerHTML = '<option value="">All Cities</option>' + optionList([...new Set(state.activities.map(a => a.location.city))].sort());
  document.getElementById('filter-type').innerHTML = '<option value="">All Types</option>' + optionList(ACTIVITY_TYPES);
  document.getElementById('filter-status').innerHTML = '<option value="">All Statuses</option>' + optionList(ACTIVITY_STATUSES);
  document.getElementById('filter-agent').innerHTML = '<option value="">All Agents</option>' + state.agents.map(a => `<option value="${a.id}">${escapeHtml(a.name)}</option>`).join('');

  const presetEvent = getQueryParam('eventId');
  if (presetEvent) document.getElementById('filter-event').value = presetEvent;

  ['filter-search', 'filter-event', 'filter-city', 'filter-type', 'filter-status', 'filter-agent'].forEach(id => {
    document.getElementById(id).addEventListener('input', renderActivitiesTable);
    document.getElementById(id).addEventListener('change', renderActivitiesTable);
  });
  renderActivitiesTable();
}

function renderActivitiesTable() {
  const state = getState();
  const search = (document.getElementById('filter-search').value || '').toLowerCase();
  const eventId = document.getElementById('filter-event').value;
  const city = document.getElementById('filter-city').value;
  const type = document.getElementById('filter-type').value;
  const status = document.getElementById('filter-status').value;
  const agentId = document.getElementById('filter-agent').value;

  let rows = state.activities.filter(a => {
    if (search && !(a.name.toLowerCase().includes(search) || a.id.toLowerCase().includes(search))) return false;
    if (eventId && a.eventId !== eventId) return false;
    if (city && a.location.city !== city) return false;
    if (type && a.type !== type) return false;
    if (status && a.status !== status) return false;
    if (agentId && !(a.agentIds || []).includes(agentId)) return false;
    return true;
  });

  const tbody = document.getElementById('activities-tbody');
  const empty = document.getElementById('activities-empty');
  const wrap = document.getElementById('activities-table-wrap');

  if (rows.length === 0) {
    wrap.style.display = 'none';
    empty.style.display = 'block';
    empty.innerHTML = emptyState({ icon: '&#128205;', title: 'No Activities Found', message: 'Try adjusting your filters, or create a new activity.', actionLabel: '+ Create Activity', actionHref: 'activity-create.html' });
    return;
  }
  wrap.style.display = 'block';
  empty.style.display = 'none';

  tbody.innerHTML = rows.map(a => {
    const stats = computeActivityStats(a);
    const ev = getEvent(a.eventId);
    return `<tr>
      <td><a class="table-link mono" href="activity-detail.html?id=${a.id}">${a.id}</a></td>
      <td>${ev ? escapeHtml(ev.name) : '&mdash;'}</td>
      <td>${escapeHtml(a.location.name)}, ${escapeHtml(a.location.city)}</td>
      <td>${escapeHtml(a.type)}</td>
      <td class="num">${stats.agents}</td>
      <td class="num">${stats.tasks}</td>
      <td>${progressBar(stats.progress)}</td>
      <td>${badge(a.status)}</td>
      <td>
        <div class="row-actions">
          <a class="btn btn-secondary btn-sm" href="activity-detail.html?id=${a.id}">View</a>
          <a class="btn btn-secondary btn-sm" href="activity-create.html?edit=${a.id}">Edit</a>
          <button class="btn btn-ghost btn-sm" onclick="handleDeleteActivity('${a.id}')">Delete</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function handleDeleteActivity(id) {
  const a = getActivity(id);
  confirmDialog({
    title: 'Delete Activity?',
    message: `Are you sure you want to delete <strong>${a.id}</strong> &mdash; ${escapeHtml(a.name)}? All tasks and submissions under this activity will also be removed. This action cannot be undone.`,
    confirmText: 'Delete',
    danger: true,
    onConfirm: () => {
      const eventId = a.eventId;
      deleteActivityCascade(id);
      closeModal();
      showToast('Activity deleted');
      if (document.getElementById('activities-tbody')) renderActivitiesTable();
      else window.location.href = `event-detail.html?id=${eventId}`;
    }
  });
}

/* ================================================================ */
/* Activities: Create / Edit                                          */
/* ================================================================ */

function initActivityCreatePage() {
  const state = getState();
  const editId = getQueryParam('edit');
  const existing = editId ? getActivity(editId) : null;
  const presetEventId = getQueryParam('eventId');

  document.getElementById('activity-event').innerHTML = state.events.map(e => `<option value="${e.id}">${escapeHtml(e.name)}</option>`).join('');
  document.getElementById('activity-type').innerHTML = optionList(ACTIVITY_TYPES);

  renderElementTiles('activity-elements-tiles', ACTIVITY_ELEMENTS, existing ? existing.elements : ['Branding', 'Product Display']);
  setupAgentPicker('activity-agent-picker', 'activity-agent-chips', existing ? existing.agentIds : []);

  if (existing) {
    document.getElementById('page-title').textContent = 'Edit Activity';
    document.getElementById('activity-number-display').textContent = existing.id;
    document.getElementById('activity-event').value = existing.eventId;
    document.getElementById('activity-name').value = existing.name;
    document.getElementById('activity-description').value = existing.description || '';
    document.getElementById('activity-type').value = existing.type;
    document.getElementById('activity-location-name').value = existing.location.name;
    document.getElementById('activity-address').value = existing.location.address || '';
    document.getElementById('activity-city').value = existing.location.city;
    document.getElementById('activity-state').value = existing.location.state || '';
    document.getElementById('activity-pin').value = existing.location.pin || '';
    document.getElementById('activity-lat').value = existing.location.lat || '';
    document.getElementById('activity-lng').value = existing.location.lng || '';
    document.getElementById('activity-start-date').value = existing.startDate;
    document.getElementById('activity-end-date').value = existing.endDate;
    document.getElementById('activity-start-time').value = existing.startTime || '';
    document.getElementById('activity-end-time').value = existing.endTime || '';
    document.getElementById('create-activity-btn').textContent = 'Save Changes';
  } else {
    document.getElementById('activity-number-display').textContent = 'Auto-generated on save';
    if (presetEventId) document.getElementById('activity-event').value = presetEventId;
  }

  updateMapPreview();
  document.getElementById('activity-lat').addEventListener('input', updateMapPreview);
  document.getElementById('activity-lng').addEventListener('input', updateMapPreview);

  document.getElementById('cancel-btn').addEventListener('click', () => {
    window.location.href = existing ? `activity-detail.html?id=${existing.id}` : (presetEventId ? `event-detail.html?id=${presetEventId}` : 'activities.html');
  });
  document.getElementById('save-draft-btn').addEventListener('click', () => submitActivityForm('Draft', existing));
  document.getElementById('create-activity-btn').addEventListener('click', () => submitActivityForm(null, existing));
}

function updateMapPreview() {
  const lat = document.getElementById('activity-lat').value;
  const lng = document.getElementById('activity-lng').value;
  document.getElementById('activity-map-preview').innerHTML = renderMapPlaceholder(lat, lng);
}

function submitActivityForm(forcedStatus, existing) {
  const valid = validateFields([
    { id: 'activity-event', message: 'Event is required.' },
    { id: 'activity-name', message: 'Activity Name is required.' },
    { id: 'activity-type', message: 'Activity Type is required.' },
    { id: 'activity-location-name', message: 'Location Name is required.' },
    { id: 'activity-city', message: 'City is required.' },
    { id: 'activity-start-date', message: 'Start Date is required.' },
    { id: 'activity-end-date', message: 'End Date is required.' }
  ]);
  if (!valid) return;

  const startDate = document.getElementById('activity-start-date').value;
  const endDate = document.getElementById('activity-end-date').value;
  if (endDate < startDate) {
    document.getElementById('activity-end-date-error').textContent = 'End Date must be after Start Date.';
    return;
  }

  let status = forcedStatus;
  if (!status) {
    status = (startDate <= DEMO_TODAY && DEMO_TODAY <= endDate) ? 'Active' : 'Scheduled';
  }

  const data = {
    eventId: document.getElementById('activity-event').value,
    name: document.getElementById('activity-name').value.trim(),
    description: document.getElementById('activity-description').value.trim(),
    type: document.getElementById('activity-type').value,
    location: {
      name: document.getElementById('activity-location-name').value.trim(),
      address: document.getElementById('activity-address').value.trim(),
      city: document.getElementById('activity-city').value.trim(),
      state: document.getElementById('activity-state').value.trim(),
      pin: document.getElementById('activity-pin').value.trim(),
      lat: document.getElementById('activity-lat').value ? Number(document.getElementById('activity-lat').value) : null,
      lng: document.getElementById('activity-lng').value ? Number(document.getElementById('activity-lng').value) : null
    },
    startDate, endDate,
    startTime: document.getElementById('activity-start-time').value,
    endTime: document.getElementById('activity-end-time').value,
    elements: getCheckedValues('activity-elements-tiles'),
    agentIds: getCheckedAgentIds('activity-agent-picker'),
    status
  };

  if (existing) {
    updateState(s => { Object.assign(s.activities.find(a => a.id === existing.id), data); });
    showToast('&#10003; Activity updated successfully');
    window.location.href = `activity-detail.html?id=${existing.id}`;
    return;
  }

  const id = nextId('activity');
  updateState(s => { s.activities.push(Object.assign({ id }, data)); });
  showActivitySuccess(id, data.eventId);
}

function showActivitySuccess(id, eventId) {
  document.getElementById('activity-form-panel').style.display = 'none';
  const panel = document.getElementById('activity-success-panel');
  panel.style.display = 'block';
  panel.innerHTML = `
    <div class="success-panel">
      <div class="success-icon">&#10003;</div>
      <h2>Activity Created Successfully</h2>
      <div class="success-id mono">Activity Number: ${id}</div>
      <p>Agents can now be assigned and tasks can be created for this activity.</p>
      <div class="success-panel-actions">
        <a class="btn btn-secondary" href="event-detail.html?id=${eventId}">Back to Event</a>
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
  const ev = getEvent(a.eventId);
  const stats = computeActivityStats(a);
  const tasks = getTasksForActivity(a.id);

  root.innerHTML = `
    ${breadcrumbs([{ label: 'Activities', href: 'activities.html' }, { label: ev ? ev.name : a.eventId, href: `event-detail.html?id=${a.eventId}` }, { label: a.id }])}
    <div class="detail-header">
      <div class="detail-header-top">
        <div>
          <div class="detail-eyebrow mono">${a.id}</div>
          <h1>${escapeHtml(a.name)}</h1>
          <div class="detail-sub">
            <a href="event-detail.html?id=${a.eventId}">${ev ? escapeHtml(ev.name) : a.eventId}</a>
            <span>&middot;</span>
            <span>${formatDateRange(a.startDate, a.endDate)}</span>
            <span>&middot;</span>
            ${badge(a.status)}
          </div>
        </div>
        <div class="detail-header-actions">
          <a class="btn btn-secondary" href="activity-create.html?edit=${a.id}">Edit Activity</a>
          <a class="btn btn-primary" href="task-create.html?activityId=${a.id}">+ Add Task</a>
        </div>
      </div>
    </div>

    <div class="stat-grid" style="grid-template-columns:repeat(4,1fr); margin-bottom: var(--sp-5);">
      <div class="stat-card"><div class="stat-label">Assigned Agents</div><div class="stat-value">${stats.agents}</div></div>
      <div class="stat-card"><div class="stat-label">Total Tasks</div><div class="stat-value">${stats.tasks}</div></div>
      <div class="stat-card"><div class="stat-label">Completed</div><div class="stat-value">${stats.completed}</div></div>
      <div class="stat-card"><div class="stat-label">Pending</div><div class="stat-value">${stats.pending}</div></div>
    </div>

    <div class="detail-layout">
      <div>
        <div class="section-title-row"><h2>Assigned Agents</h2><button class="btn btn-secondary btn-sm" onclick="openEditAgentsModal('${a.id}')">Edit Agents</button></div>
        <div id="activity-agents-table"></div>

        <div class="section-title-row" style="margin-top: var(--sp-6);"><h2>Tasks</h2><a class="btn btn-secondary btn-sm" href="task-create.html?activityId=${a.id}">+ Add Task</a></div>
        <div id="activity-tasks-table"></div>
      </div>
      <div>
        <div class="card">
          <div class="card-header"><h3>Activity Details</h3></div>
          <div class="card-body">
            <div class="kv-grid" style="grid-template-columns:1fr;">
              <div class="kv-item"><div class="kv-label">Activity Type</div><div class="kv-value">${escapeHtml(a.type)}</div></div>
              <div class="kv-item"><div class="kv-label">Location</div><div class="kv-value">${escapeHtml(a.location.name)}</div></div>
              <div class="kv-item"><div class="kv-label">Address</div><div class="kv-value">${escapeHtml(a.location.address || '&mdash;')}, ${escapeHtml(a.location.city)} ${escapeHtml(a.location.pin || '')}</div></div>
              <div class="kv-item"><div class="kv-label">Schedule</div><div class="kv-value">${formatDateRange(a.startDate, a.endDate)}${a.startTime ? ` &middot; ${a.startTime}&ndash;${a.endTime}` : ''}</div></div>
              <div class="kv-item">
                <div class="kv-label">Activity Elements</div>
                <div class="tag-list" style="margin-top:4px;">${(a.elements || []).map(e => `<span class="tag">${escapeHtml(e)}</span>`).join('') || '&mdash;'}</div>
              </div>
            </div>
            <div class="divider"></div>
            ${renderMapPlaceholder(a.location.lat, a.location.lng)}
          </div>
        </div>
        <div style="margin-top: var(--sp-4);">
          <button class="btn btn-ghost btn-sm" style="color:var(--color-red);" onclick="handleDeleteActivity('${a.id}')">Delete Activity</button>
        </div>
      </div>
    </div>
  `;

  const agentsTableEl = document.getElementById('activity-agents-table');
  if ((a.agentIds || []).length === 0) {
    agentsTableEl.innerHTML = emptyState({ icon: '&#128100;', title: 'No Agents Assigned', message: 'Assign agents to this activity so they can execute tasks.', actionLabel: 'Edit Agents', actionOnClick: `openEditAgentsModal('${a.id}')` });
  } else {
    agentsTableEl.innerHTML = `<div class="table-wrap card"><table class="data-table"><thead><tr>
      <th>Agent</th><th>Mobile</th><th class="num">Tasks Assigned</th><th class="num">Completed</th><th>Status</th>
    </tr></thead><tbody>
      ${a.agentIds.map(id => {
        const agent = getAgent(id);
        if (!agent) return '';
        const agentTasks = tasks.filter(t => (t.agentIds || []).includes(id));
        const completed = agentTasks.filter(t => computeTaskAgentStatus(t.id, id) === 'Completed').length;
        return `<tr>
          <td><a class="table-link" href="agent-detail.html?id=${agent.id}">${escapeHtml(agent.name)}</a></td>
          <td class="mono">${agent.mobile}</td>
          <td class="num">${agentTasks.length}</td>
          <td class="num">${completed}</td>
          <td>${badge(agent.status)}</td>
        </tr>`;
      }).join('')}
    </tbody></table></div>`;
  }

  const tasksTableEl = document.getElementById('activity-tasks-table');
  if (tasks.length === 0) {
    tasksTableEl.innerHTML = emptyState({ icon: '&#9989;', title: 'No Tasks Found', message: 'Create the first task for this activity.', actionLabel: '+ Create Task', actionHref: `task-create.html?activityId=${a.id}` });
  } else {
    tasksTableEl.innerHTML = `<div class="table-wrap card"><table class="data-table"><thead><tr>
      <th>Task No.</th><th>Task Name</th><th>Type</th><th>Schedule</th><th class="num">Agents</th><th>Status</th><th></th>
    </tr></thead><tbody>
      ${tasks.map(t => `<tr>
        <td class="mono">${t.id}</td>
        <td><a class="table-link" href="task-detail.html?id=${t.id}">${escapeHtml(t.name)}</a></td>
        <td>${escapeHtml(t.type)}</td>
        <td>${escapeHtml(t.scheduledTime || '&mdash;')}</td>
        <td class="num">${(t.agentIds || []).length}</td>
        <td>${badge(computeTaskStatus(t))}</td>
        <td><a class="btn btn-secondary btn-sm" href="task-detail.html?id=${t.id}">View</a></td>
      </tr>`).join('')}
    </tbody></table></div>`;
  }
}

function openEditAgentsModal(activityId) {
  const a = getActivity(activityId);
  openModal(`
    <div class="modal-header"><h3>Edit Assigned Agents</h3></div>
    <div class="modal-body">
      <p style="margin-bottom: var(--sp-3);">Select the agents assigned to <strong>${a.id} &mdash; ${escapeHtml(a.name)}</strong>.</p>
      <div class="agent-picker" id="modal-agent-picker"></div>
      <div class="chip-row" id="modal-agent-chips" style="margin-top: var(--sp-3);"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveActivityAgents('${activityId}')">Save Agents</button>
    </div>
  `, { wide: true });
  setupAgentPicker('modal-agent-picker', 'modal-agent-chips', a.agentIds || []);
}

function saveActivityAgents(activityId) {
  const ids = getCheckedAgentIds('modal-agent-picker');
  updateState(s => { s.activities.find(a => a.id === activityId).agentIds = ids; });
  closeModal();
  showToast('&#10003; Assigned agents updated');
  renderActivityDetail(getActivity(activityId));
}

/* ================================================================ */
/* Tasks: List                                                        */
/* ================================================================ */

function initTasksListPage() {
  const state = getState();
  document.getElementById('filter-activity').innerHTML = '<option value="">All Activities</option>' + state.activities.map(a => `<option value="${a.id}">${a.id} &mdash; ${escapeHtml(a.name)}</option>`).join('');
  document.getElementById('filter-type').innerHTML = '<option value="">All Types</option>' + optionList(TASK_TYPES);
  document.getElementById('filter-status').innerHTML = '<option value="">All Statuses</option>' + optionList(TASK_STATUSES);

  const presetActivity = getQueryParam('activityId');
  if (presetActivity) document.getElementById('filter-activity').value = presetActivity;

  ['filter-search', 'filter-activity', 'filter-type', 'filter-status'].forEach(id => {
    document.getElementById(id).addEventListener('input', renderTasksTable);
    document.getElementById(id).addEventListener('change', renderTasksTable);
  });
  renderTasksTable();
}

function renderTasksTable() {
  const state = getState();
  const search = (document.getElementById('filter-search').value || '').toLowerCase();
  const activityId = document.getElementById('filter-activity').value;
  const type = document.getElementById('filter-type').value;
  const status = document.getElementById('filter-status').value;

  let rows = state.tasks.filter(t => {
    if (search && !(t.name.toLowerCase().includes(search) || t.id.toLowerCase().includes(search))) return false;
    if (activityId && t.activityId !== activityId) return false;
    if (type && t.type !== type) return false;
    if (status && computeTaskStatus(t) !== status) return false;
    return true;
  });

  const tbody = document.getElementById('tasks-tbody');
  const empty = document.getElementById('tasks-empty');
  const wrap = document.getElementById('tasks-table-wrap');

  if (rows.length === 0) {
    wrap.style.display = 'none';
    empty.style.display = 'block';
    empty.innerHTML = emptyState({ icon: '&#9989;', title: 'No Tasks Found', message: 'Try adjusting your filters, or create a new task.', actionLabel: '+ Create Task', actionHref: 'task-create.html' });
    return;
  }
  wrap.style.display = 'block';
  empty.style.display = 'none';

  tbody.innerHTML = rows.map(t => `<tr>
    <td class="mono"><a class="table-link" href="task-detail.html?id=${t.id}">${t.id}</a></td>
    <td class="mono"><a href="activity-detail.html?id=${t.activityId}">${t.activityId}</a></td>
    <td>${escapeHtml(t.name)}</td>
    <td>${escapeHtml(t.type)}</td>
    <td>${escapeHtml(t.scheduledTime || '&mdash;')}</td>
    <td class="num">${(t.agentIds || []).length}</td>
    <td>${badge(computeTaskStatus(t))}</td>
    <td>
      <div class="row-actions">
        <a class="btn btn-secondary btn-sm" href="task-detail.html?id=${t.id}">View</a>
        <a class="btn btn-secondary btn-sm" href="task-create.html?edit=${t.id}">Edit</a>
        <button class="btn btn-ghost btn-sm" onclick="handleDeleteTask('${t.id}')">Delete</button>
      </div>
    </td>
  </tr>`).join('');
}

function handleDeleteTask(id) {
  const t = getTask(id);
  confirmDialog({
    title: 'Delete Task?',
    message: `Are you sure you want to delete <strong>${t.id}</strong> &mdash; ${escapeHtml(t.name)}? Any submissions for this task will also be removed. This action cannot be undone.`,
    confirmText: 'Delete',
    danger: true,
    onConfirm: () => {
      const activityId = t.activityId;
      deleteTaskCascade(id);
      closeModal();
      showToast('Task deleted');
      if (document.getElementById('tasks-tbody')) renderTasksTable();
      else window.location.href = `activity-detail.html?id=${activityId}`;
    }
  });
}

/* ================================================================ */
/* Tasks: Create / Edit                                               */
/* ================================================================ */

let TASK_EXEC_WINDOWS = [];

function initTaskCreatePage() {
  const state = getState();
  const editId = getQueryParam('edit');
  const existing = editId ? getTask(editId) : null;
  const presetActivityId = getQueryParam('activityId');

  document.getElementById('task-event').innerHTML = state.events.map(e => `<option value="${e.id}">${escapeHtml(e.name)}</option>`).join('');
  document.getElementById('task-type').innerHTML = optionList(TASK_TYPES);

  let initialEventId = state.events[0] ? state.events[0].id : '';
  if (existing) {
    const act = getActivity(existing.activityId);
    initialEventId = act ? act.eventId : initialEventId;
  } else if (presetActivityId) {
    const act = getActivity(presetActivityId);
    initialEventId = act ? act.eventId : initialEventId;
  }
  document.getElementById('task-event').value = initialEventId;
  populateActivityDropdown(initialEventId, existing ? existing.activityId : presetActivityId);

  document.getElementById('task-event').addEventListener('change', () => {
    populateActivityDropdown(document.getElementById('task-event').value, null);
    refreshInheritedAgents();
  });
  document.getElementById('task-activity').addEventListener('change', refreshInheritedAgents);

  TASK_EXEC_WINDOWS = existing && existing.executionType === 'Multiple Times Per Day' && existing.executionWindows
    ? existing.executionWindows.slice()
    : [{ label: 'Morning', time: '10:00' }, { label: 'Afternoon', time: '14:00' }, { label: 'Evening', time: '18:00' }];
  renderExecutionWindows();

  const execType = existing ? existing.executionType : 'Once';
  document.querySelectorAll('input[name="exec-type"]').forEach(r => {
    r.checked = (r.value === execType);
    r.addEventListener('change', updateExecTypeUI);
  });
  updateExecTypeUI();

  if (existing) {
    document.getElementById('page-title').textContent = 'Edit Task';
    document.getElementById('task-number-display').textContent = existing.id;
    document.getElementById('task-name').value = existing.name;
    document.getElementById('task-description').value = existing.description || '';
    document.getElementById('task-type').value = existing.type;
    document.getElementById('task-scheduled-time').value = existing.scheduledTime24 || '';
    document.getElementById('req-photo').checked = !!existing.requirements.photo;
    document.getElementById('req-gps').checked = !!existing.requirements.gps;
    document.getElementById('req-timestamp').checked = !!existing.requirements.timestamp;
    document.getElementById('req-comment').checked = !!existing.requirements.comment;
    document.getElementById('req-customer').checked = !!existing.requirements.customerDetails;
    document.getElementById('create-task-btn').textContent = 'Save Changes';
    setupAgentPicker('task-agent-picker', 'task-agent-chips', existing.agentIds || []);
  } else {
    document.getElementById('task-number-display').textContent = 'Auto-generated on save';
    document.getElementById('task-type').addEventListener('change', applyDefaultRequirements);
    applyDefaultRequirements();
    refreshInheritedAgents();
  }

  document.getElementById('add-window-btn').addEventListener('click', () => {
    TASK_EXEC_WINDOWS.push({ label: 'Custom', time: '12:00' });
    renderExecutionWindows();
  });

  document.getElementById('cancel-btn').addEventListener('click', () => {
    window.location.href = existing ? `task-detail.html?id=${existing.id}` : (presetActivityId ? `activity-detail.html?id=${presetActivityId}` : 'tasks.html');
  });
  document.getElementById('save-draft-btn').addEventListener('click', () => submitTaskForm(existing));
  document.getElementById('create-task-btn').addEventListener('click', () => submitTaskForm(existing));
}

function populateActivityDropdown(eventId, selectedActivityId) {
  const activities = getActivitiesForEvent(eventId);
  const sel = document.getElementById('task-activity');
  sel.innerHTML = activities.map(a => `<option value="${a.id}">${a.id} &mdash; ${escapeHtml(a.name)}</option>`).join('');
  if (selectedActivityId && activities.some(a => a.id === selectedActivityId)) sel.value = selectedActivityId;
}

function refreshInheritedAgents() {
  const activityId = document.getElementById('task-activity').value;
  const act = getActivity(activityId);
  setupAgentPicker('task-agent-picker', 'task-agent-chips', act ? (act.agentIds || []) : []);
}

function applyDefaultRequirements() {
  const type = document.getElementById('task-type').value;
  const map = {
    'Photo Capture': { photo: true, gps: true, timestamp: true, comment: false, customerDetails: false },
    'Video Capture': { photo: false, gps: true, timestamp: true, comment: false, customerDetails: false },
    'Form Submission': { photo: false, gps: true, timestamp: true, comment: true, customerDetails: true },
    'Customer Interaction': { photo: false, gps: true, timestamp: true, comment: true, customerDetails: true },
    'Product Demo': { photo: true, gps: true, timestamp: true, comment: true, customerDetails: false },
    'Lead Collection': { photo: false, gps: true, timestamp: true, comment: true, customerDetails: true },
    'Checklist': { photo: true, gps: true, timestamp: true, comment: true, customerDetails: false },
    'Other': { photo: false, gps: true, timestamp: true, comment: true, customerDetails: false }
  };
  const req = map[type] || map['Other'];
  document.getElementById('req-photo').checked = req.photo;
  document.getElementById('req-gps').checked = req.gps;
  document.getElementById('req-timestamp').checked = req.timestamp;
  document.getElementById('req-comment').checked = req.comment;
  document.getElementById('req-customer').checked = req.customerDetails;
}

function updateExecTypeUI() {
  const type = document.querySelector('input[name="exec-type"]:checked').value;
  document.getElementById('exec-once-fields').style.display = (type === 'Once' || type === 'Daily' || type === 'Custom') ? 'block' : 'none';
  document.getElementById('exec-multi-fields').style.display = (type === 'Multiple Times Per Day') ? 'block' : 'none';
  document.getElementById('exec-recur-hint').style.display = (type === 'Daily' || type === 'Custom') ? 'block' : 'none';
}

function renderExecutionWindows() {
  const el = document.getElementById('exec-windows-list');
  document.getElementById('exec-count-display').textContent = TASK_EXEC_WINDOWS.length;
  el.innerHTML = TASK_EXEC_WINDOWS.map((w, i) => `
    <div class="form-grid" style="grid-template-columns: 2fr 2fr auto; align-items:end; gap:10px; margin-bottom:8px;">
      <div class="form-group" style="margin-bottom:0;">
        <label>Window Label</label>
        <input class="form-control" value="${escapeHtml(w.label)}" oninput="TASK_EXEC_WINDOWS[${i}].label=this.value">
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label>Time</label>
        <input type="time" class="form-control" value="${w.time}" oninput="TASK_EXEC_WINDOWS[${i}].time=this.value">
      </div>
      <button type="button" class="btn btn-ghost btn-sm" onclick="removeExecWindow(${i})">Remove</button>
    </div>
  `).join('');
}

function removeExecWindow(i) {
  TASK_EXEC_WINDOWS.splice(i, 1);
  renderExecutionWindows();
}

function submitTaskForm(existing) {
  const valid = validateFields([
    { id: 'task-event', message: 'Event is required.' },
    { id: 'task-activity', message: 'Activity is required.' },
    { id: 'task-name', message: 'Task Name is required.' },
    { id: 'task-type', message: 'Task Type is required.' }
  ]);
  if (!valid) return;

  const activityId = document.getElementById('task-activity').value;
  if (!activityId) {
    document.getElementById('task-activity-error').textContent = 'Selected event has no activities. Choose another event.';
    return;
  }

  const execType = document.querySelector('input[name="exec-type"]:checked').value;
  const requirements = {
    photo: document.getElementById('req-photo').checked,
    gps: document.getElementById('req-gps').checked,
    timestamp: document.getElementById('req-timestamp').checked,
    comment: document.getElementById('req-comment').checked,
    customerDetails: document.getElementById('req-customer').checked
  };
  const name = document.getElementById('task-name').value.trim();
  const description = document.getElementById('task-description').value.trim();
  const type = document.getElementById('task-type').value;
  const agentIds = getCheckedAgentIds('task-agent-picker');

  if (existing) {
    const scheduledTime24 = document.getElementById('task-scheduled-time').value;
    updateState(s => {
      const t = s.tasks.find(x => x.id === existing.id);
      Object.assign(t, {
        activityId, name, description, type, requirements, agentIds,
        executionType: execType,
        scheduledTime: scheduledTime24 ? formatTime12(scheduledTime24) : t.scheduledTime,
        scheduledTime24
      });
    });
    showToast('&#10003; Task updated successfully');
    window.location.href = `task-detail.html?id=${existing.id}`;
    return;
  }

  const createdIds = [];
  if (execType === 'Multiple Times Per Day' && TASK_EXEC_WINDOWS.length > 0) {
    TASK_EXEC_WINDOWS.forEach(w => {
      const id = nextId('task');
      createdIds.push(id);
      updateState(s => {
        s.tasks.push({
          id, activityId, name: `${name} (${w.label})`, description, type,
          scheduledTime: formatTime12(w.time), scheduledTime24: w.time,
          executionType: 'Once', requirements, agentIds
        });
      });
    });
  } else {
    const scheduledTime24 = document.getElementById('task-scheduled-time').value;
    const id = nextId('task');
    createdIds.push(id);
    updateState(s => {
      s.tasks.push({
        id, activityId, name, description, type,
        scheduledTime: scheduledTime24 ? formatTime12(scheduledTime24) : '',
        scheduledTime24, executionType: execType, requirements, agentIds
      });
    });
  }

  if (createdIds.length === 1) {
    showToast(`&#10003; Task created successfully &mdash; Task Number: ${createdIds[0]}`);
    window.location.href = `task-detail.html?id=${createdIds[0]}`;
  } else {
    showToast(`&#10003; ${createdIds.length} tasks created successfully (${createdIds.join(', ')})`);
    window.location.href = `activity-detail.html?id=${activityId}`;
  }
}

/* ================================================================ */
/* Task Detail                                                        */
/* ================================================================ */

function initTaskDetailPage() {
  const id = getQueryParam('id');
  const t = getTask(id);
  const root = document.getElementById('page-root');
  if (!t) {
    root.innerHTML = emptyState({ icon: '&#10060;', title: 'Task Not Found', message: 'This task may have been deleted.', actionLabel: 'Back to Tasks', actionHref: 'tasks.html' });
    return;
  }
  renderTaskDetail(t);
}

function renderTaskDetail(t) {
  const root = document.getElementById('page-root');
  const activity = getActivity(t.activityId);
  const status = computeTaskStatus(t);

  const reqTags = [];
  if (t.requirements.photo) reqTags.push('Photo');
  if (t.requirements.gps) reqTags.push('GPS Location');
  if (t.requirements.timestamp) reqTags.push('Timestamp');
  if (t.requirements.comment) reqTags.push('Comment');
  if (t.requirements.customerDetails) reqTags.push('Customer Details');

  root.innerHTML = `
    ${breadcrumbs([{ label: 'Tasks', href: 'tasks.html' }, { label: activity ? activity.name : t.activityId, href: `activity-detail.html?id=${t.activityId}` }, { label: t.name }])}
    <div class="detail-header">
      <div class="detail-header-top">
        <div>
          <div class="detail-eyebrow mono">${t.id}</div>
          <h1>${escapeHtml(t.name)}</h1>
          <div class="detail-sub">
            <a href="activity-detail.html?id=${t.activityId}">${t.activityId} &mdash; ${activity ? escapeHtml(activity.name) : ''}</a>
            <span>&middot;</span>
            <span>${escapeHtml(t.type)}</span>
            <span>&middot;</span>
            <span>${escapeHtml(t.scheduledTime || 'Unscheduled')}</span>
            <span>&middot;</span>
            ${badge(status)}
          </div>
        </div>
        <div class="detail-header-actions">
          <a class="btn btn-secondary" href="task-create.html?edit=${t.id}">Edit Task</a>
          <a class="btn btn-secondary" href="submissions.html?task=${t.id}">View Submissions</a>
          <button class="btn btn-ghost" style="color:var(--color-red);" onclick="handleDeleteTask('${t.id}')">Delete</button>
        </div>
      </div>
    </div>

    <div class="detail-layout">
      <div>
        <div class="card">
          <div class="card-header"><h3>Execution Status</h3></div>
          <div class="card-body" style="padding:0;">
            ${(t.agentIds || []).length === 0 ? `<div style="padding: var(--sp-5);">${emptyState({ icon: '&#128100;', title: 'No Agents Assigned', message: 'Assign agents to this task from the Edit Task form.' })}</div>` : `
            <table class="data-table"><thead><tr><th>Agent</th><th>Mobile</th><th>Status</th><th></th></tr></thead><tbody>
              ${t.agentIds.map(id => {
                const agent = getAgent(id);
                if (!agent) return '';
                const agentStatus = computeTaskAgentStatus(t.id, id);
                const sub = getSubmissionForTaskAgent(t.id, id);
                return `<tr>
                  <td>${escapeHtml(agent.name)}</td>
                  <td class="mono">${agent.mobile}</td>
                  <td>${badge(agentStatus === 'Completed' ? (sub.status) : agentStatus)}</td>
                  <td>${sub ? `<a class="btn btn-secondary btn-sm" href="submission-detail.html?id=${sub.id}">View Submission</a>` : '<span class="text-faint">&mdash;</span>'}</td>
                </tr>`;
              }).join('')}
            </tbody></table>`}
          </div>
        </div>
      </div>
      <div>
        <div class="card">
          <div class="card-header"><h3>Task Details</h3></div>
          <div class="card-body">
            <div class="kv-grid" style="grid-template-columns:1fr;">
              <div class="kv-item"><div class="kv-label">Description</div><div class="kv-value">${escapeHtml(t.description || '&mdash;')}</div></div>
              <div class="kv-item"><div class="kv-label">Execution Type</div><div class="kv-value">${escapeHtml(t.executionType || 'Once')}</div></div>
              <div class="kv-item">
                <div class="kv-label">Required Evidence</div>
                <div class="tag-list" style="margin-top:4px;">${reqTags.map(r => `<span class="tag">${r}</span>`).join('') || '&mdash;'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/* ================================================================ */
/* Agents: List + Detail                                              */
/* ================================================================ */

function initAgentsPage() {
  document.getElementById('filter-status').innerHTML = '<option value="">All Statuses</option>' + optionList(['Active', 'Inactive']);
  ['filter-search', 'filter-status'].forEach(id => {
    document.getElementById(id).addEventListener('input', renderAgentsTable);
    document.getElementById(id).addEventListener('change', renderAgentsTable);
  });
  renderAgentsTable();
}

function renderAgentsTable() {
  const state = getState();
  const search = (document.getElementById('filter-search').value || '').toLowerCase();
  const status = document.getElementById('filter-status').value;

  let rows = state.agents.filter(a => {
    if (search && !(a.name.toLowerCase().includes(search) || a.mobile.includes(search))) return false;
    if (status && a.status !== status) return false;
    return true;
  });

  const tbody = document.getElementById('agents-tbody');
  const empty = document.getElementById('agents-empty');
  const wrap = document.getElementById('agents-table-wrap');

  if (rows.length === 0) {
    wrap.style.display = 'none';
    empty.style.display = 'block';
    empty.innerHTML = emptyState({ icon: '&#128100;', title: 'No Agents Found', message: 'Try adjusting your search.' });
    return;
  }
  wrap.style.display = 'block';
  empty.style.display = 'none';

  tbody.innerHTML = rows.map(a => {
    const stats = computeAgentStats(a.id);
    return `<tr>
      <td><div style="display:flex;align-items:center;gap:10px;"><span class="agent-avatar">${initials(a.name)}</span><a class="table-link" href="agent-detail.html?id=${a.id}">${escapeHtml(a.name)}</a></div></td>
      <td class="mono">${a.mobile}</td>
      <td class="num">${stats.activities}</td>
      <td class="num">${stats.active}</td>
      <td>${badge(a.status)}</td>
      <td><a class="btn btn-secondary btn-sm" href="agent-detail.html?id=${a.id}">View</a></td>
    </tr>`;
  }).join('');
}

function initAgentDetailPage() {
  const id = getQueryParam('id');
  const agent = getAgent(id);
  const root = document.getElementById('page-root');
  if (!agent) {
    root.innerHTML = emptyState({ icon: '&#10060;', title: 'Agent Not Found', message: 'This agent may not exist.', actionLabel: 'Back to Agents', actionHref: 'agents.html' });
    return;
  }

  const activities = getActivitiesForAgent(id);
  const tasks = getTasksForAgent(id);
  const stats = computeAgentStats(id);
  const eventIds = [...new Set(activities.map(a => a.eventId))];

  root.innerHTML = `
    ${breadcrumbs([{ label: 'Agents', href: 'agents.html' }, { label: agent.name }])}
    <div class="detail-header">
      <div class="detail-header-top">
        <div style="display:flex; align-items:center; gap:14px;">
          <span class="agent-avatar" style="width:48px;height:48px;font-size:16px;">${initials(agent.name)}</span>
          <div>
            <h1>${escapeHtml(agent.name)}</h1>
            <div class="detail-sub"><span class="mono">${agent.mobile}</span><span>&middot;</span>${badge(agent.status)}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="stat-grid" style="grid-template-columns:repeat(4,1fr); margin-bottom: var(--sp-5);">
      <div class="stat-card"><div class="stat-label">Assigned Activities</div><div class="stat-value">${stats.activities}</div></div>
      <div class="stat-card"><div class="stat-label">Total Tasks</div><div class="stat-value">${stats.tasks}</div></div>
      <div class="stat-card"><div class="stat-label">Completed</div><div class="stat-value">${stats.completed}</div></div>
      <div class="stat-card"><div class="stat-label">Active</div><div class="stat-value">${stats.active}</div></div>
    </div>

    <div class="section-title-row"><h2>Assigned Events</h2></div>
    <div class="tag-list" style="margin-bottom: var(--sp-6);">
      ${eventIds.length ? eventIds.map(eid => { const e = getEvent(eid); return `<a class="tag" href="event-detail.html?id=${eid}" style="text-decoration:none;">${e ? escapeHtml(e.name) : eid}</a>`; }).join('') : '<span class="text-faint" style="font-size:13px;">No events assigned.</span>'}
    </div>

    <div class="section-title-row"><h2>Assigned Activities</h2></div>
    <div class="table-wrap card" style="margin-bottom: var(--sp-6);">
      <table class="data-table"><thead><tr><th>Activity No.</th><th>Name</th><th>Location</th><th>Status</th><th></th></tr></thead><tbody>
        ${activities.length ? activities.map(a => `<tr>
          <td class="mono">${a.id}</td><td>${escapeHtml(a.name)}</td><td>${escapeHtml(a.location.city)}</td><td>${badge(a.status)}</td>
          <td><a class="btn btn-secondary btn-sm" href="activity-detail.html?id=${a.id}">View</a></td>
        </tr>`).join('') : `<tr><td colspan="5"><div class="text-faint" style="padding:10px 0;">No activities assigned.</div></td></tr>`}
      </tbody></table>
    </div>

    <div class="section-title-row"><h2>Current Tasks</h2></div>
    <div class="table-wrap card">
      <table class="data-table"><thead><tr><th>Task No.</th><th>Task Name</th><th>Activity</th><th>Status</th></tr></thead><tbody>
        ${tasks.length ? tasks.map(t => `<tr>
          <td class="mono"><a class="table-link" href="task-detail.html?id=${t.id}">${t.id}</a></td>
          <td>${escapeHtml(t.name)}</td><td class="mono">${t.activityId}</td>
          <td>${badge(computeTaskAgentStatus(t.id, id) === 'Completed' ? 'Completed' : computeTaskAgentStatus(t.id, id))}</td>
        </tr>`).join('') : `<tr><td colspan="4"><div class="text-faint" style="padding:10px 0;">No tasks assigned.</div></td></tr>`}
      </tbody></table>
    </div>
  `;
}

/* ================================================================ */
/* Submissions: List + Detail                                         */
/* ================================================================ */

function initSubmissionsPage() {
  const state = getState();
  document.getElementById('filter-activity').innerHTML = '<option value="">All Activities</option>' + state.activities.map(a => `<option value="${a.id}">${a.id} &mdash; ${escapeHtml(a.name)}</option>`).join('');
  document.getElementById('filter-status').innerHTML = '<option value="">All Statuses</option>' + optionList(SUBMISSION_STATUSES);
  document.getElementById('filter-agent').innerHTML = '<option value="">All Agents</option>' + state.agents.map(a => `<option value="${a.id}">${escapeHtml(a.name)}</option>`).join('');

  const presetTask = getQueryParam('task');
  const presetActivity = getQueryParam('activity');
  if (presetActivity) document.getElementById('filter-activity').value = presetActivity;
  if (presetTask) document.getElementById('filter-search').value = presetTask;

  ['filter-search', 'filter-activity', 'filter-status', 'filter-agent'].forEach(id => {
    document.getElementById(id).addEventListener('input', renderSubmissionsTable);
    document.getElementById(id).addEventListener('change', renderSubmissionsTable);
  });
  renderSubmissionsTable();
}

function renderSubmissionsTable() {
  const state = getState();
  const search = (document.getElementById('filter-search').value || '').toLowerCase();
  const activityId = document.getElementById('filter-activity').value;
  const status = document.getElementById('filter-status').value;
  const agentId = document.getElementById('filter-agent').value;

  let rows = state.submissions.filter(s => {
    const task = getTask(s.taskId);
    const agent = getAgent(s.agentId);
    if (search && !((task && task.name.toLowerCase().includes(search)) || s.id.toLowerCase().includes(search) || s.taskId.toLowerCase().includes(search) || (agent && agent.name.toLowerCase().includes(search)))) return false;
    if (activityId && s.activityId !== activityId) return false;
    if (status && s.status !== status) return false;
    if (agentId && s.agentId !== agentId) return false;
    return true;
  }).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

  const tbody = document.getElementById('submissions-tbody');
  const empty = document.getElementById('submissions-empty');
  const wrap = document.getElementById('submissions-table-wrap');

  if (rows.length === 0) {
    wrap.style.display = 'none';
    empty.style.display = 'block';
    empty.innerHTML = emptyState({ icon: '&#128247;', title: 'No Submissions Found', message: 'No field evidence matches your filters yet.' });
    return;
  }
  wrap.style.display = 'block';
  empty.style.display = 'none';

  tbody.innerHTML = rows.map(s => {
    const agent = getAgent(s.agentId);
    const task = getTask(s.taskId);
    return `<tr>
      <td class="mono"><a class="table-link" href="submission-detail.html?id=${s.id}">${s.id}</a></td>
      <td>${agent ? escapeHtml(agent.name) : '&mdash;'}</td>
      <td class="mono">${s.activityId}</td>
      <td>${task ? escapeHtml(task.name) : s.taskId}</td>
      <td>${formatTimeOnly(s.submittedAt)}</td>
      <td>${escapeHtml(s.location)}</td>
      <td>${badge(s.status)}</td>
      <td><a class="btn btn-secondary btn-sm" href="submission-detail.html?id=${s.id}">View</a></td>
    </tr>`;
  }).join('');
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
  const agent = getAgent(sub.agentId);
  const task = getTask(sub.taskId);
  const activity = getActivity(sub.activityId);

  root.innerHTML = `
    ${breadcrumbs([{ label: 'Submissions', href: 'submissions.html' }, { label: sub.id }])}
    <div class="detail-header">
      <div class="detail-header-top">
        <div>
          <div class="detail-eyebrow mono">${sub.id}</div>
          <h1>${task ? escapeHtml(task.name) : sub.taskId}</h1>
          <div class="detail-sub"><span>${agent ? escapeHtml(agent.name) : sub.agentId}</span><span>&middot;</span><span>${formatDateTime(sub.submittedAt)}</span><span>&middot;</span>${badge(sub.status)}</div>
        </div>
        <div class="detail-header-actions" id="submission-actions"></div>
      </div>
    </div>

    <div class="detail-layout">
      <div>
        ${renderMapPlaceholder(null, null, 'photo-evidence')
          .replace('Map Placeholder', 'Submitted Photo')
          .replace('&#128205;', '&#128247;')
          .replace(/<div class="ph-coords">.*?<\/div>/, '')}
        <div class="card" style="margin-top: var(--sp-5);">
          <div class="card-header"><h3>Agent Comment</h3></div>
          <div class="card-body">
            <p>${escapeHtml(sub.comment || 'No comment provided.')}</p>
          </div>
        </div>
        <div id="rejection-reason-box"></div>
      </div>
      <div>
        <div class="card">
          <div class="card-header"><h3>Submission Details</h3></div>
          <div class="card-body">
            <div class="kv-grid" style="grid-template-columns:1fr;">
              <div class="kv-item"><div class="kv-label">Agent</div><div class="kv-value">${agent ? escapeHtml(agent.name) : '&mdash;'}</div></div>
              <div class="kv-item"><div class="kv-label">Activity</div><div class="kv-value"><a href="activity-detail.html?id=${sub.activityId}">${sub.activityId}${activity ? ' &mdash; ' + escapeHtml(activity.name) : ''}</a></div></div>
              <div class="kv-item"><div class="kv-label">Task</div><div class="kv-value"><a href="task-detail.html?id=${sub.taskId}">${sub.taskId}${task ? ' &mdash; ' + escapeHtml(task.name) : ''}</a></div></div>
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

  const actionsEl = document.getElementById('submission-actions');
  if (sub.status === 'Approved') {
    actionsEl.innerHTML = `<button class="btn btn-danger" onclick="openRejectModal('${sub.id}')">Reject</button>`;
  } else if (sub.status === 'Rejected') {
    actionsEl.innerHTML = `<button class="btn btn-primary" onclick="approveSubmission('${sub.id}')">Approve</button>`;
  } else {
    actionsEl.innerHTML = `<button class="btn btn-danger" onclick="openRejectModal('${sub.id}')">Reject</button><button class="btn btn-primary" onclick="approveSubmission('${sub.id}')">Approve</button>`;
  }

  const rejBox = document.getElementById('rejection-reason-box');
  rejBox.innerHTML = (sub.status === 'Rejected' && sub.rejectionReason) ? `
    <div class="rejection-box">
      <div class="rejection-label">Rejection Reason</div>
      <p>${escapeHtml(sub.rejectionReason)}</p>
    </div>` : '';
}

function approveSubmission(id) {
  updateState(s => { const sub = s.submissions.find(x => x.id === id); sub.status = 'Approved'; delete sub.rejectionReason; });
  showToast('&#10003; Submission approved');
  renderSubmissionDetail(id);
}

function openRejectModal(id) {
  openModal(`
    <div class="modal-header"><h3>Reject Submission</h3></div>
    <div class="modal-body">
      <p style="margin-bottom: var(--sp-3);">Please provide a reason for rejecting this submission. The agent will be able to see this feedback.</p>
      <div class="form-group full" style="margin-bottom:0;">
        <label>Rejection Reason <span class="req">*</span></label>
        <textarea class="form-control" id="rejection-reason-input" placeholder="e.g. Photo is blurred and branding is not visible."></textarea>
        <div class="field-error" id="rejection-reason-input-error"></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-danger" onclick="confirmRejectSubmission('${id}')">Reject Submission</button>
    </div>
  `);
}

function confirmRejectSubmission(id) {
  const valid = validateFields([{ id: 'rejection-reason-input', message: 'A rejection reason is required.' }]);
  if (!valid) return;
  const reason = document.getElementById('rejection-reason-input').value.trim();
  updateState(s => { const sub = s.submissions.find(x => x.id === id); sub.status = 'Rejected'; sub.rejectionReason = reason; });
  closeModal();
  showToast('Submission rejected');
  renderSubmissionDetail(id);
}

/* ================================================================ */
/* Reports                                                             */
/* ================================================================ */

function initReportsPage() {
  const state = getState();
  const root = document.getElementById('page-root');

  const taskByStatus = {};
  TASK_STATUSES.forEach(s => taskByStatus[s] = 0);
  state.tasks.forEach(t => taskByStatus[computeTaskStatus(t)]++);

  const subByStatus = {};
  SUBMISSION_STATUSES.forEach(s => subByStatus[s] = 0);
  state.submissions.forEach(s => subByStatus[s.status] = (subByStatus[s.status] || 0) + 1);

  const activityByType = {};
  state.activities.forEach(a => activityByType[a.type] = (activityByType[a.type] || 0) + 1);

  const eventByStatus = {};
  EVENT_STATUSES.forEach(s => eventByStatus[s] = 0);
  state.events.forEach(e => eventByStatus[e.status]++);

  function barRows(dataObj, total) {
    return Object.entries(dataObj).map(([label, count]) => {
      const pct = total ? Math.round((count / total) * 100) : 0;
      return `<div style="display:flex; align-items:center; gap:12px; padding:8px 0;">
        <div style="width:150px; font-size:13px; font-weight:600;">${escapeHtml(label)}</div>
        ${progressBar(pct, { hideLabel: true })}
        <div style="width:70px; text-align:right; font-size:12.5px; color:var(--color-text-muted);">${count} (${pct}%)</div>
      </div>`;
    }).join('');
  }

  root.innerHTML = `
    <div class="page-header"><div><h1>Reports</h1><div class="subtitle">Aggregate execution metrics across all events, activities and tasks.</div></div></div>
    <div class="detail-layout">
      <div>
        <div class="card" style="margin-bottom: var(--sp-5);">
          <div class="card-header"><h3>Tasks by Status</h3></div>
          <div class="card-body">${barRows(taskByStatus, state.tasks.length)}</div>
        </div>
        <div class="card">
          <div class="card-header"><h3>Submissions by Status</h3></div>
          <div class="card-body">${barRows(subByStatus, state.submissions.length)}</div>
        </div>
      </div>
      <div>
        <div class="card" style="margin-bottom: var(--sp-5);">
          <div class="card-header"><h3>Events by Status</h3></div>
          <div class="card-body">${barRows(eventByStatus, state.events.length)}</div>
        </div>
        <div class="card">
          <div class="card-header"><h3>Activities by Type</h3></div>
          <div class="card-body">${barRows(activityByType, state.activities.length)}</div>
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
      message: 'This will restore all events, activities, tasks and submissions to their original demo state. Any changes you have made, including mobile task submissions, will be lost.',
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

  document.querySelectorAll('.toggle').forEach(t => {
    t.addEventListener('click', () => t.classList.toggle('on'));
  });
}
