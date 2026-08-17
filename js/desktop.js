/**
 * desktop.js
 * Controller logic for the Desktop Admin application. Each page's
 * HTML contains static structure with a mount point (or fixed IDs for
 * list pages); this file renders dynamic content, wires up filters,
 * forms and actions, and reads/writes shared state via app.js.
 *
 * There is no agent roster in this build. Tasks are assigned offline
 * (by activity number); a field officer logs into the mobile app with
 * an Activity Number + mobile number and can see whatever tasks exist
 * under that activity. Desktop only lets ops optionally note a field
 * officer's name against an Activity for reference.
 */

/* ================================================================ */
/* Shell: header + sidebar                                           */
/* ================================================================ */

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: '&#9638;', href: 'dashboard.html' },
  { key: 'events', label: 'Events', icon: '&#128197;', href: 'events.html' },
  { key: 'activities', label: 'Activities', icon: '&#128205;', href: 'activities.html' },
  { key: 'tasks', label: 'Tasks', icon: '&#9989;', href: 'tasks.html' },
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

// No real map coordinates are collected in this build — the box is a
// purely decorative placeholder labeled with whatever location text
// is available (per the original wireframe brief: no Maps API).
function renderMapPlaceholder(labelText, extraClass) {
  return `<div class="placeholder-box map-placeholder ${extraClass || ''}">
    <div class="ph-icon">&#128205;</div>
    <div class="ph-label">Map Placeholder</div>
    <div class="ph-coords">${labelText ? escapeHtml(labelText) : 'Location not set'}</div>
  </div>`;
}

// Sample submission photos live in /assets — reused across submissions
// since this is a wireframe prototype with no real photo uploads.
const SUBMISSION_PHOTO_FILES = ['1.jpg', '2.jpg', '3.jpg', '4.jpg', '5.jpg', '6.jpg', '7.jpg'];
const SUBMISSION_PHOTO_BASE = '../../assets/';

function hashStringToInt(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Deterministic per-submission pick so a given submission's photos stay
// the same across re-renders, while still looking random/repetitive
// across different submissions.
function getSubmissionPhotos(sub) {
  const h = hashStringToInt(sub.id);
  const count = 2 + (h % 3); // 2-4 photos per submission
  const files = [];
  for (let i = 0; i < count; i++) {
    files.push(SUBMISSION_PHOTO_FILES[(h + i * 7) % SUBMISSION_PHOTO_FILES.length]);
  }
  return files;
}

function renderPhotoGrid(sub) {
  const files = getSubmissionPhotos(sub);
  const srcs = files.map(f => SUBMISSION_PHOTO_BASE + f);
  return `<div class="photo-grid">
    ${srcs.map((src, i) => `
      <div class="photo-card" onclick='openImageLightbox(${JSON.stringify(srcs)}, ${i})'>
        <img src="${src}" alt="Submission photo ${i + 1}" loading="lazy">
        <div class="photo-card-label"><span>Photo ${i + 1}</span><span>&#128269;</span></div>
      </div>`).join('')}
  </div>`;
}

/* ---------------------------------------------------------------- */
/* Fullscreen image lightbox with click-to-zoom + drag-to-pan          */
/* ---------------------------------------------------------------- */

let LIGHTBOX_STATE = null;

function openImageLightbox(srcs, index) {
  LIGHTBOX_STATE = { srcs, index, zoomed: false, tx: 0, ty: 0 };
  const root = ensureModalRoot();
  root.innerHTML = `
    <div class="lightbox-overlay" id="lightbox-overlay">
      <button class="lightbox-close" onclick="closeModal()" aria-label="Close">&times;</button>
      <div class="lightbox-counter" id="lightbox-counter"></div>
      ${srcs.length > 1 ? `<button class="lightbox-nav lightbox-prev" onclick="lightboxStep(-1)" aria-label="Previous">&#8249;</button>
      <button class="lightbox-nav lightbox-next" onclick="lightboxStep(1)" aria-label="Next">&#8250;</button>` : ''}
      <div class="lightbox-stage" id="lightbox-stage">
        <img class="lightbox-img" id="lightbox-img" draggable="false">
      </div>
      <div class="lightbox-hint">Click image to zoom &middot; drag to pan while zoomed &middot; Esc to close</div>
    </div>`;
  document.body.classList.add('modal-open');
  document.getElementById('lightbox-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'lightbox-overlay' || e.target.id === 'lightbox-stage') closeModal();
  });
  document.addEventListener('keydown', handleLightboxKeydown);
  renderLightboxImage();
}

function renderLightboxImage() {
  if (!LIGHTBOX_STATE) return;
  const img = document.getElementById('lightbox-img');
  if (!img) return;
  img.src = LIGHTBOX_STATE.srcs[LIGHTBOX_STATE.index];
  img.classList.remove('zoomed');
  img.style.transform = '';
  LIGHTBOX_STATE.zoomed = false;
  img.onclick = (e) => { e.stopPropagation(); toggleLightboxZoom(e); };
  img.onmousedown = lightboxDragStart;
  document.getElementById('lightbox-counter').textContent = LIGHTBOX_STATE.srcs.length > 1
    ? `${LIGHTBOX_STATE.index + 1} / ${LIGHTBOX_STATE.srcs.length}` : '';
}

function toggleLightboxZoom(e) {
  const img = document.getElementById('lightbox-img');
  if (!img || !LIGHTBOX_STATE) return;
  LIGHTBOX_STATE.zoomed = !LIGHTBOX_STATE.zoomed;
  if (LIGHTBOX_STATE.zoomed) {
    img.classList.add('zoomed');
    img.style.transform = 'scale(2.2)';
  } else {
    img.classList.remove('zoomed');
    img.style.transform = '';
  }
}

function lightboxStep(delta) {
  if (!LIGHTBOX_STATE) return;
  const n = LIGHTBOX_STATE.srcs.length;
  LIGHTBOX_STATE.index = (LIGHTBOX_STATE.index + delta + n) % n;
  renderLightboxImage();
}

function handleLightboxKeydown(e) {
  if (!LIGHTBOX_STATE) return;
  if (e.key === 'Escape') closeModal();
  else if (e.key === 'ArrowLeft') lightboxStep(-1);
  else if (e.key === 'ArrowRight') lightboxStep(1);
}

function lightboxDragStart(e) {
  const img = document.getElementById('lightbox-img');
  if (!img || !LIGHTBOX_STATE || !LIGHTBOX_STATE.zoomed) return;
  e.preventDefault();
  const startX = e.clientX, startY = e.clientY;
  const startTx = LIGHTBOX_STATE.tx, startTy = LIGHTBOX_STATE.ty;
  function onMove(ev) {
    LIGHTBOX_STATE.tx = startTx + (ev.clientX - startX);
    LIGHTBOX_STATE.ty = startTy + (ev.clientY - startY);
    img.style.transform = `scale(2.2) translate(${LIGHTBOX_STATE.tx / 2.2}px, ${LIGHTBOX_STATE.ty / 2.2}px)`;
  }
  function onUp() {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  }
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

// Clickable stat-card row used above list-page filter bars. `cards` is
// [{ label, value, count, onclick }]; `activeValue` highlights the card
// whose `value` matches the current filter selection.
function renderStatFilterCards(containerId, cards, activeValue) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = cards.map(c => `
    <div class="stat-card stat-card-clickable ${c.value === activeValue ? 'active' : ''}" onclick="${c.onclick}">
      <div class="stat-label">${escapeHtml(c.label)}</div>
      <div class="stat-value">${c.count}</div>
    </div>`).join('');
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
  let pendingTasks = 0, completedTasks = 0;
  state.tasks.forEach(t => { computeTaskStatus(t) === 'Completed' ? completedTasks++ : pendingTasks++; });

  document.getElementById('stat-total-events').textContent = totalEvents;
  document.getElementById('stat-active-events').textContent = activeEvents;
  document.getElementById('stat-activities').textContent = totalActivities;
  document.getElementById('stat-pending-tasks').textContent = pendingTasks;
  document.getElementById('stat-completed-tasks').textContent = completedTasks;

  const tbody = document.getElementById('dashboard-events-tbody');
  tbody.innerHTML = state.events.map(ev => {
    const stats = computeEventStats(ev);
    return `<tr onclick="window.location='event-detail.html?id=${ev.id}'" style="cursor:pointer">
      <td><span class="table-link">${escapeHtml(ev.name)}</span><br><span class="text-faint mono">${ev.id}</span></td>
      <td>${formatDateRange(ev.dateFrom, ev.dateTo)}</td>
      <td class="num">${stats.activities}</td>
      <td class="num">${stats.tasks}</td>
      <td>${progressBar(stats.progress)}</td>
      <td>${badge(ev.status)}</td>
    </tr>`;
  }).join('');

  // Activities no longer carry their own dates — "today" is judged by
  // the parent Event's schedule.
  const todayActivities = state.activities.filter(a => {
    const ev = getEvent(a.eventId);
    return ev && ev.dateFrom <= DEMO_TODAY && DEMO_TODAY <= ev.dateTo;
  });
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
  document.getElementById('filter-status').innerHTML = '<option value="">All Statuses</option>' + optionList(EVENT_STATUSES);

  ['filter-search', 'filter-status', 'filter-date-from', 'filter-date-to'].forEach(id => {
    document.getElementById(id).addEventListener('input', renderEventsTable);
    document.getElementById(id).addEventListener('change', renderEventsTable);
  });
  renderEventsTable();
}

function setEventsStatusFilter(status) {
  document.getElementById('filter-status').value = status;
  renderEventsTable();
}

function renderEventsStatCards(state, activeStatus) {
  const statuses = EVENT_STATUSES.filter(s => s !== 'Draft');
  const cards = [
    { label: 'Total Events', value: '', count: state.events.length, onclick: "setEventsStatusFilter('')" },
    ...statuses.map(s => ({
      label: s, value: s, count: state.events.filter(e => e.status === s).length,
      onclick: `setEventsStatusFilter('${s}')`
    }))
  ];
  renderStatFilterCards('events-stat-cards', cards, activeStatus);
}

function renderEventsTable() {
  const state = getState();
  const search = (document.getElementById('filter-search').value || '').toLowerCase();
  const status = document.getElementById('filter-status').value;
  const dateFrom = document.getElementById('filter-date-from').value;
  const dateTo = document.getElementById('filter-date-to').value;

  renderEventsStatCards(state, status);

  let rows = state.events.filter(e => {
    if (search && !(e.name.toLowerCase().includes(search) || e.id.toLowerCase().includes(search))) return false;
    if (status && e.status !== status) return false;
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
          <button class="btn btn-danger btn-sm" onclick="handleDeleteEvent('${ev.id}')">Delete</button>
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
  const activities = getActivitiesForEvent(ev.id);

  root.innerHTML = `
    ${breadcrumbs([{ label: 'Events', href: 'events.html' }, { label: ev.name }])}
    <div class="detail-header">
      <div class="detail-header-top">
        <div>
          <h1>${escapeHtml(ev.name)}</h1>
          <div class="detail-sub">
            <span>${formatDateRange(ev.dateFrom, ev.dateTo)}</span>
            <span>&middot;</span>
            ${badge(ev.status)}
          </div>
        </div>
        <div class="detail-header-actions">
          <a class="btn btn-secondary" href="event-create.html?edit=${ev.id}">Edit Event</a>
          <a class="btn btn-primary" href="activity-create.html?eventId=${ev.id}">+ Add Activity</a>
          <button class="btn btn-danger" onclick="handleDeleteEvent('${ev.id}')">Delete Event</button>
        </div>
      </div>
      <div class="kv-grid" style="margin-top: var(--sp-5);">
        <div class="kv-item"><div class="kv-label">Brand / Product</div><div class="kv-value">${[ev.brand, ev.product].filter(Boolean).map(escapeHtml).join(' &mdash; ') || '&mdash;'}</div></div>
        <div class="kv-item"><div class="kv-label">Description</div><div class="kv-value">${ev.description ? escapeHtml(ev.description) : '&mdash;'}</div></div>
        <div class="kv-item">
          <div class="kv-label">Event Elements</div>
          <div class="tag-list" style="margin-top:4px;">${(ev.elements || []).map(e => `<span class="tag">${escapeHtml(e)}</span>`).join('') || '&mdash;'}</div>
        </div>
      </div>
    </div>

    <div class="section-title-row"><h2>Activities</h2></div>
    <div id="event-activities-table"></div>
  `;

  const wrap = document.getElementById('event-activities-table');
  if (activities.length === 0) {
    wrap.innerHTML = emptyState({ icon: '&#128205;', title: 'No Activities Found', message: 'This event does not have any activities yet.', actionLabel: '+ Create Activity', actionHref: `activity-create.html?eventId=${ev.id}` });
  } else {
    wrap.innerHTML = `<div class="table-wrap card">
      <table class="data-table">
        <thead><tr>
          <th>Activity No.</th><th>Location</th><th>Type</th><th>Field Officer</th><th class="num">Tasks</th><th>Progress</th><th>Status</th><th>Actions</th>
        </tr></thead>
        <tbody>${activities.map(a => {
          const astats = computeActivityStats(a);
          return `<tr>
            <td><a class="table-link mono" href="activity-detail.html?id=${a.id}">${a.id}</a></td>
            <td>${escapeHtml(a.location.name)}, ${escapeHtml(a.location.city)}</td>
            <td>${escapeHtml(a.type)}</td>
            <td>${a.fieldOfficerName ? escapeHtml(a.fieldOfficerName) : '<span class="text-faint">&mdash;</span>'}</td>
            <td class="num">${astats.tasks}</td>
            <td>${progressBar(astats.progress)}</td>
            <td>${badge(a.status)}</td>
            <td>
              <div class="row-actions">
                <a class="btn btn-secondary btn-sm" href="activity-detail.html?id=${a.id}">View</a>
                <a class="btn btn-secondary btn-sm" href="activity-create.html?edit=${a.id}">Edit</a>
                <button class="btn btn-danger btn-sm" onclick="handleDeleteActivity('${a.id}')">Delete</button>
              </div>
            </td>
          </tr>`;
        }).join('')}</tbody>
      </table>
    </div>`;
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

  const presetEvent = getQueryParam('eventId');
  if (presetEvent) document.getElementById('filter-event').value = presetEvent;

  ['filter-search', 'filter-event', 'filter-city', 'filter-type', 'filter-status'].forEach(id => {
    document.getElementById(id).addEventListener('input', renderActivitiesTable);
    document.getElementById(id).addEventListener('change', renderActivitiesTable);
  });
  renderActivitiesTable();
}

function setActivitiesStatusFilter(status) {
  document.getElementById('filter-status').value = status;
  renderActivitiesTable();
}

function renderActivitiesStatCards(state, activeStatus) {
  const statuses = ACTIVITY_STATUSES.filter(s => s !== 'Draft');
  const cards = [
    { label: 'Total Activities', value: '', count: state.activities.length, onclick: "setActivitiesStatusFilter('')" },
    ...statuses.map(s => ({
      label: s, value: s, count: state.activities.filter(a => a.status === s).length,
      onclick: `setActivitiesStatusFilter('${s}')`
    }))
  ];
  renderStatFilterCards('activities-stat-cards', cards, activeStatus);
}

function renderActivitiesTable() {
  const state = getState();
  const search = (document.getElementById('filter-search').value || '').toLowerCase();
  const eventId = document.getElementById('filter-event').value;
  const city = document.getElementById('filter-city').value;
  const type = document.getElementById('filter-type').value;
  const status = document.getElementById('filter-status').value;

  renderActivitiesStatCards(state, status);

  let rows = state.activities.filter(a => {
    if (search && !(a.name.toLowerCase().includes(search) || a.id.toLowerCase().includes(search))) return false;
    if (eventId && a.eventId !== eventId) return false;
    if (city && a.location.city !== city) return false;
    if (type && a.type !== type) return false;
    if (status && a.status !== status) return false;
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
      <td>${a.fieldOfficerName ? escapeHtml(a.fieldOfficerName) : '<span class="text-faint">&mdash;</span>'}</td>
      <td class="num">${stats.tasks}</td>
      <td>${progressBar(stats.progress)}</td>
      <td>${badge(a.status)}</td>
      <td>
        <div class="row-actions">
          <a class="btn btn-secondary btn-sm" href="activity-detail.html?id=${a.id}">View</a>
          <a class="btn btn-secondary btn-sm" href="activity-create.html?edit=${a.id}">Edit</a>
          <button class="btn btn-danger btn-sm" onclick="handleDeleteActivity('${a.id}')">Delete</button>
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

  if (existing) {
    document.getElementById('page-title').textContent = 'Edit Activity';
    document.getElementById('activity-event').value = existing.eventId;
    document.getElementById('activity-name').value = existing.name;
    document.getElementById('activity-description').value = existing.description || '';
    document.getElementById('activity-type').value = existing.type;
    document.getElementById('activity-location-name').value = existing.location.name;
    document.getElementById('activity-address-line1').value = existing.location.addressLine1 || '';
    document.getElementById('activity-address-line2').value = existing.location.addressLine2 || '';
    document.getElementById('activity-city').value = existing.location.city;
    document.getElementById('activity-pin').value = existing.location.pin || '';
    document.getElementById('activity-field-officer').value = existing.fieldOfficerName || '';
    document.getElementById('create-activity-btn').textContent = 'Save Changes';
  } else {
    if (presetEventId) document.getElementById('activity-event').value = presetEventId;
  }

  document.getElementById('cancel-btn').addEventListener('click', () => {
    window.location.href = existing ? `activity-detail.html?id=${existing.id}` : (presetEventId ? `event-detail.html?id=${presetEventId}` : 'activities.html');
  });
  document.getElementById('save-draft-btn').addEventListener('click', () => submitActivityForm('Draft', existing));
  document.getElementById('create-activity-btn').addEventListener('click', () => submitActivityForm(existing ? existing.status : 'Active', existing));
}

function submitActivityForm(status, existing) {
  const valid = validateFields([
    { id: 'activity-event', message: 'Event is required.' },
    { id: 'activity-name', message: 'Activity Name is required.' },
    { id: 'activity-type', message: 'Activity Type is required.' },
    { id: 'activity-location-name', message: 'Location Name is required.' },
    { id: 'activity-city', message: 'City is required.' }
  ]);
  if (!valid) return;

  const data = {
    eventId: document.getElementById('activity-event').value,
    name: document.getElementById('activity-name').value.trim(),
    description: document.getElementById('activity-description').value.trim(),
    type: document.getElementById('activity-type').value,
    location: {
      name: document.getElementById('activity-location-name').value.trim(),
      addressLine1: document.getElementById('activity-address-line1').value.trim(),
      addressLine2: document.getElementById('activity-address-line2').value.trim(),
      city: document.getElementById('activity-city').value.trim(),
      pin: document.getElementById('activity-pin').value.trim()
    },
    elements: getCheckedValues('activity-elements-tiles'),
    fieldOfficerName: document.getElementById('activity-field-officer').value.trim(),
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
      <p>Share this Activity Number with the field officer &mdash; they'll use it to log into the mobile app. Tasks can now be created for this activity.</p>
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
  const tasks = getTasksForActivity(a.id);

  root.innerHTML = `
    ${breadcrumbs([{ label: 'Activities', href: 'activities.html' }, { label: ev ? ev.name : a.eventId, href: `event-detail.html?id=${a.eventId}` }, { label: a.id }])}
    <div class="detail-header">
      <div class="detail-header-top">
        <div>
          <h1>${escapeHtml(a.name)}</h1>
          <div class="detail-sub">
            <a href="event-detail.html?id=${a.eventId}">${ev ? escapeHtml(ev.name) : a.eventId}</a>
            <span>&middot;</span>
            <span>${escapeHtml(a.location.city)}</span>
            <span>&middot;</span>
            <span>${escapeHtml(a.type)}</span>
            <span>&middot;</span>
            ${badge(a.status)}
          </div>
        </div>
        <div class="detail-header-actions">
          <a class="btn btn-secondary" href="activity-create.html?edit=${a.id}">Edit Activity</a>
          <a class="btn btn-primary" href="task-create.html?activityId=${a.id}">+ Add Task</a>
          <button class="btn btn-danger" onclick="handleDeleteActivity('${a.id}')">Delete Activity</button>
        </div>
      </div>
      <div class="kv-grid" style="margin-top: var(--sp-5);">
        <div class="kv-item"><div class="kv-label">Activity Number</div><div class="kv-value mono">${a.id}</div></div>
        <div class="kv-item"><div class="kv-label">Field Officer</div><div class="kv-value">${a.fieldOfficerName ? escapeHtml(a.fieldOfficerName) : '&mdash;'}</div></div>
        <div class="kv-item"><div class="kv-label">Location</div><div class="kv-value">${escapeHtml(a.location.name)}${[a.location.addressLine1, a.location.addressLine2].filter(Boolean).length ? ', ' + [a.location.addressLine1, a.location.addressLine2].filter(Boolean).map(escapeHtml).join(', ') : ''}, ${escapeHtml(a.location.city)} ${escapeHtml(a.location.pin || '')}</div></div>
        <div class="kv-item">
          <div class="kv-label">Activity Elements</div>
          <div class="tag-list" style="margin-top:4px;">${(a.elements || []).map(e => `<span class="tag">${escapeHtml(e)}</span>`).join('') || '&mdash;'}</div>
        </div>
      </div>
      <p class="form-hint" style="margin: var(--sp-3) 0 0;">Field officers log into the mobile app using this Activity Number and their mobile number &mdash; no separate agent assignment is required.</p>
    </div>

    <div class="section-title-row"><h2>Tasks</h2><a class="btn btn-secondary btn-sm" href="task-create.html?activityId=${a.id}">+ Add Task</a></div>
    <div id="activity-tasks-table"></div>
  `;

  const tasksTableEl = document.getElementById('activity-tasks-table');
  if (tasks.length === 0) {
    tasksTableEl.innerHTML = emptyState({ icon: '&#9989;', title: 'No Tasks Found', message: 'Create the first task for this activity.', actionLabel: '+ Create Task', actionHref: `task-create.html?activityId=${a.id}` });
  } else {
    tasksTableEl.innerHTML = `<div class="table-wrap card"><table class="data-table"><thead><tr>
      <th>Task No.</th><th>Task Name</th><th>Type</th><th>Schedule</th><th>Status</th><th></th>
    </tr></thead><tbody>
      ${tasks.map(t => `<tr>
        <td class="mono">${t.id}</td>
        <td><a class="table-link" href="task-detail.html?id=${t.id}">${escapeHtml(t.name)}</a></td>
        <td>${escapeHtml(t.type)}</td>
        <td>${t.scheduledTime ? escapeHtml(t.scheduledTime) : '&mdash;'}</td>
        <td>${badge(computeTaskStatus(t))}</td>
        <td><a class="btn btn-secondary btn-sm" href="task-detail.html?id=${t.id}">View</a></td>
      </tr>`).join('')}
    </tbody></table></div>`;
  }
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

function setTasksStatusFilter(status) {
  document.getElementById('filter-status').value = status;
  renderTasksTable();
}

function renderTasksStatCards(state, activeStatus) {
  const cards = [
    { label: 'Total Tasks', value: '', count: state.tasks.length, onclick: "setTasksStatusFilter('')" },
    ...TASK_STATUSES.map(s => ({
      label: s, value: s, count: state.tasks.filter(t => computeTaskStatus(t) === s).length,
      onclick: `setTasksStatusFilter('${s}')`
    }))
  ];
  renderStatFilterCards('tasks-stat-cards', cards, activeStatus);
}

function renderTasksTable() {
  const state = getState();
  const search = (document.getElementById('filter-search').value || '').toLowerCase();
  const activityId = document.getElementById('filter-activity').value;
  const type = document.getElementById('filter-type').value;
  const status = document.getElementById('filter-status').value;

  renderTasksStatCards(state, status);

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
    <td>${t.scheduledTime ? escapeHtml(t.scheduledTime) : '&mdash;'}</td>
    <td>${badge(computeTaskStatus(t))}</td>
    <td>
      <div class="row-actions">
        <a class="btn btn-secondary btn-sm" href="task-detail.html?id=${t.id}">View</a>
        <a class="btn btn-secondary btn-sm" href="task-create.html?edit=${t.id}">Edit</a>
        <button class="btn btn-danger btn-sm" onclick="handleDeleteTask('${t.id}')">Delete</button>
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
  });

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
  } else {
    document.getElementById('task-type').addEventListener('change', applyDefaultRequirements);
    applyDefaultRequirements();
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

  if (existing) {
    const scheduledTime24 = document.getElementById('task-scheduled-time').value;
    updateState(s => {
      const t = s.tasks.find(x => x.id === existing.id);
      Object.assign(t, {
        activityId, name, description, type, requirements,
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
          executionType: 'Once', requirements
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
        scheduledTime24, executionType: execType, requirements
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
  const subs = getSubmissionsForTask(t.id).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

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
          <h1>${escapeHtml(t.name)}</h1>
          <div class="detail-sub">
            <a href="activity-detail.html?id=${t.activityId}">${t.activityId} &mdash; ${activity ? escapeHtml(activity.name) : ''}</a>
            <span>&middot;</span>
            <span>${escapeHtml(t.type)}</span>
            <span>&middot;</span>
            <span>${escapeHtml(t.executionType || 'Once')}</span>
            <span>&middot;</span>
            <span>${escapeHtml(t.scheduledTime || 'Unscheduled')}</span>
            <span>&middot;</span>
            ${badge(status)}
          </div>
        </div>
        <div class="detail-header-actions">
          <a class="btn btn-secondary" href="task-create.html?edit=${t.id}">Edit Task</a>
          <button class="btn btn-danger" onclick="handleDeleteTask('${t.id}')">Delete Task</button>
        </div>
      </div>
      <div class="kv-grid" style="margin-top: var(--sp-5);">
        <div class="kv-item"><div class="kv-label">Description</div><div class="kv-value">${t.description ? escapeHtml(t.description) : '&mdash;'}</div></div>
        <div class="kv-item">
          <div class="kv-label">Required Evidence</div>
          <div class="tag-list" style="margin-top:4px;">${reqTags.map(r => `<span class="tag">${r}</span>`).join('') || '&mdash;'}</div>
        </div>
      </div>
    </div>

    <div class="section-title-row"><h2>Submissions</h2></div>
    <div class="card">
      <div class="card-body" style="padding:0;">
        ${subs.length === 0 ? `<div style="padding: var(--sp-5);">${emptyState({ icon: '&#128247;', title: 'No Submissions Yet', message: 'No field officer has submitted evidence for this task yet.' })}</div>` : `
        <table class="data-table"><thead><tr><th>Mobile</th><th>Submitted</th><th>Status</th><th></th></tr></thead><tbody>
          ${subs.map(s => `<tr>
            <td class="mono">${escapeHtml(s.mobile)}</td>
            <td>${formatDateTime(s.submittedAt)}</td>
            <td>${badge(s.status)}</td>
            <td><a class="btn btn-secondary btn-sm" href="submission-detail.html?id=${s.id}">View</a></td>
          </tr>`).join('')}
        </tbody></table>`}
      </div>
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

  const presetTask = getQueryParam('task');
  const presetActivity = getQueryParam('activity');
  if (presetActivity) document.getElementById('filter-activity').value = presetActivity;
  if (presetTask) document.getElementById('filter-search').value = presetTask;

  ['filter-search', 'filter-activity', 'filter-status'].forEach(id => {
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

  let rows = state.submissions.filter(s => {
    const task = getTask(s.taskId);
    if (search && !((task && task.name.toLowerCase().includes(search)) || s.id.toLowerCase().includes(search) || s.taskId.toLowerCase().includes(search) || s.mobile.includes(search))) return false;
    if (activityId && s.activityId !== activityId) return false;
    if (status && s.status !== status) return false;
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
    const task = getTask(s.taskId);
    return `<tr>
      <td class="mono"><a class="table-link" href="submission-detail.html?id=${s.id}">${s.id}</a></td>
      <td class="mono">${escapeHtml(s.mobile)}</td>
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
  const task = getTask(sub.taskId);
  const activity = getActivity(sub.activityId);

  root.innerHTML = `
    ${breadcrumbs([{ label: 'Submissions', href: 'submissions.html' }, { label: sub.id }])}
    <div class="detail-header">
      <div class="detail-header-top">
        <div>
          <div class="detail-eyebrow mono">${sub.id}</div>
          <h1>${task ? escapeHtml(task.name) : sub.taskId}</h1>
          <div class="detail-sub"><span class="mono">${escapeHtml(sub.mobile)}</span><span>&middot;</span><span>${formatDateTime(sub.submittedAt)}</span><span>&middot;</span>${badge(sub.status)}</div>
        </div>
        <div class="detail-header-actions" id="submission-actions"></div>
      </div>
    </div>

    <div class="detail-layout">
      <div>
        <div class="section-title-row"><h2>Photo Evidence</h2></div>
        ${renderPhotoGrid(sub)}
        <div class="card" style="margin-top: var(--sp-5);">
          <div class="card-header"><h3>Comment</h3></div>
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
              <div class="kv-item"><div class="kv-label">Submitted By (Mobile)</div><div class="kv-value mono">${escapeHtml(sub.mobile)}</div></div>
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
      <p style="margin-bottom: var(--sp-3);">Please provide a reason for rejecting this submission. The field officer will see this feedback and can resubmit.</p>
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
}
