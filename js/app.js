/**
 * app.js
 * Shared runtime for the PromoTrack prototype: persisted state, ID
 * generation, computed status/progress logic, formatting helpers and
 * small UI primitives (toast, modal, confirm dialog) used by both the
 * Desktop Admin app and the Mobile Agent app.
 *
 * No backend, no build step. State lives in localStorage so that
 * actions taken in the mobile flow are reflected when the reviewer
 * switches back to the desktop app in the same browser.
 */

const STORAGE_KEY = 'promotrack_state_v1';
const SESSION_KEY = 'promotrack_agent_session_v1';
const EXEC_KEY = 'promotrack_task_execution_v1';

// Fixed reference date used throughout the prototype to represent "today".
// The seed data (events/activities/tasks/submissions) is anchored to this
// date so that "Today's Activities" / "Today's Tasks" always have content
// to demonstrate, regardless of the real calendar date.
const DEMO_TODAY = '2026-08-20';

// Returns a Date anchored to DEMO_TODAY but using the real current wall-clock
// time, so freshly captured/submitted timestamps still tick forward like a
// live demo while remaining chronologically inside the seeded event's active
// window (and sorting above the fixed seed-data submission times on the
// same day).
function demoNow() {
  const real = new Date();
  const [y, m, d] = DEMO_TODAY.split('-').map(Number);
  return new Date(y, m - 1, d, real.getHours(), real.getMinutes(), real.getSeconds(), real.getMilliseconds());
}

// Seed data timestamps are naive local ISO strings (no trailing "Z"), which
// Date parses as local time. Date#toISOString() always emits UTC, so mixing
// the two formats would parse/display fine individually but break plain
// string sorting/comparison against seed rows. New timestamps must be
// generated in the same naive-local format to stay comparable.
function toNaiveIsoLocal(d) {
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/* ---------------------------------------------------------------- */
/* State                                                             */
/* ---------------------------------------------------------------- */

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function getState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = clone(MOCK_DATA);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    const seeded = clone(MOCK_DATA);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function updateState(mutator) {
  const state = getState();
  mutator(state);
  saveState(state);
  return state;
}

function resetDemoData() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(EXEC_KEY);
  getState();
}

function nextId(type) {
  const state = getState();
  const prefixes = { event: 'EVT', activity: 'ACT', task: 'TSK', agent: 'AGT', submission: 'SUB' };
  const n = state.nextIds[type];
  state.nextIds[type] = n + 1;
  saveState(state);
  return prefixes[type] + '-' + n;
}

/* ---------------------------------------------------------------- */
/* Lookups                                                           */
/* ---------------------------------------------------------------- */

function getEvent(id) { return getState().events.find(e => e.id === id) || null; }
function getActivity(id) { return getState().activities.find(a => a.id === id) || null; }
function getTask(id) { return getState().tasks.find(t => t.id === id) || null; }
function getAgent(id) { return getState().agents.find(a => a.id === id) || null; }
function getSubmission(id) { return getState().submissions.find(s => s.id === id) || null; }

function getActivitiesForEvent(eventId) { return getState().activities.filter(a => a.eventId === eventId); }
function getTasksForActivity(activityId) { return getState().tasks.filter(t => t.activityId === activityId); }
function getSubmissionsForTask(taskId) { return getState().submissions.filter(s => s.taskId === taskId); }
function getSubmissionsForActivity(activityId) { return getState().submissions.filter(s => s.activityId === activityId); }
function getSubmissionForTaskAgent(taskId, agentId) {
  return getState().submissions.find(s => s.taskId === taskId && s.agentId === agentId) || null;
}
function getActivitiesForAgent(agentId) { return getState().activities.filter(a => (a.agentIds || []).includes(agentId)); }
function getTasksForAgent(agentId) { return getState().tasks.filter(t => (t.agentIds || []).includes(agentId)); }

/* ---------------------------------------------------------------- */
/* Computed status / progress                                        */
/* ---------------------------------------------------------------- */

// Per-agent execution status for a single task.
function computeTaskAgentStatus(taskId, agentId) {
  const sub = getSubmissionForTaskAgent(taskId, agentId);
  if (!sub) return 'Pending';
  if (sub.status === 'Rejected') return 'Rejected';
  return 'Completed';
}

// Aggregate status for a task across all assigned agents.
function computeTaskStatus(task) {
  const agentIds = task.agentIds || [];
  if (agentIds.length === 0) return 'Pending';
  const statuses = agentIds.map(id => computeTaskAgentStatus(task.id, id));
  const allDone = statuses.every(s => s === 'Completed');
  if (allDone) return 'Completed';
  const anyStarted = statuses.some(s => s === 'Completed' || s === 'Rejected');
  return anyStarted ? 'In Progress' : 'Pending';
}

function computeActivityStats(activity) {
  const tasks = getTasksForActivity(activity.id);
  const agentIds = activity.agentIds || [];
  let completed = 0;
  tasks.forEach(t => { if (computeTaskStatus(t) === 'Completed') completed++; });
  const pending = tasks.length - completed;
  const progress = tasks.length === 0 ? 0 : Math.round((completed / tasks.length) * 100);
  return { agents: agentIds.length, tasks: tasks.length, completed, pending, progress };
}

function computeEventStats(event) {
  const activities = getActivitiesForEvent(event.id);
  let totalTasks = 0, completedTasks = 0;
  const agentSet = new Set();
  activities.forEach(a => {
    const stats = computeActivityStats(a);
    totalTasks += stats.tasks;
    completedTasks += stats.completed;
    (a.agentIds || []).forEach(id => agentSet.add(id));
  });
  const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
  return { activities: activities.length, agents: agentSet.size, tasks: totalTasks, completed: completedTasks, progress };
}

function computeAgentStats(agentId) {
  const activities = getActivitiesForAgent(agentId);
  const tasks = getTasksForAgent(agentId);
  let completed = 0;
  tasks.forEach(t => { if (computeTaskAgentStatus(t.id, agentId) === 'Completed') completed++; });
  return { activities: activities.length, tasks: tasks.length, completed, active: tasks.length - completed };
}

/* ---------------------------------------------------------------- */
/* Formatting                                                        */
/* ---------------------------------------------------------------- */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${String(d).padStart(2, '0')} ${MONTHS[m - 1]} ${y}`;
}

function formatDateShort(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${String(d).padStart(2, '0')} ${MONTHS[m - 1]}`;
}

function formatDateRange(from, to) {
  return `${formatDateShort(from)} → ${formatDate(to)}`;
}

function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, '0');
  const month = MONTHS[d.getMonth()];
  const year = d.getFullYear();
  let h = d.getHours();
  const min = String(d.getMinutes()).padStart(2, '0');
  const sec = String(d.getSeconds()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12; if (h === 0) h = 12;
  return `${day} ${month} ${year}, ${h}:${min}:${sec} ${ampm}`;
}

function formatTimeOnly(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  let h = d.getHours();
  const min = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12; if (h === 0) h = 12;
  return `${h}:${min} ${ampm}`;
}

function slugify(str) {
  return String(str).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
}

function badge(status) {
  return `<span class="badge badge-${slugify(status)}">${escapeHtml(status)}</span>`;
}

function progressBar(pct, opts) {
  opts = opts || {};
  const label = opts.hideLabel ? '' : `<span class="progress-label">${pct}%</span>`;
  return `<div class="progress-wrap"><div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>${label}</div>`;
}

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

/* ---------------------------------------------------------------- */
/* Toast notifications                                               */
/* ---------------------------------------------------------------- */

function ensureToastRoot() {
  let root = document.getElementById('toast-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'toast-root';
    root.className = 'toast-root';
    document.body.appendChild(root);
  }
  return root;
}

function showToast(message, opts) {
  opts = opts || {};
  const root = ensureToastRoot();
  const el = document.createElement('div');
  el.className = 'toast toast-' + (opts.type || 'success');
  const icon = opts.type === 'error' ? '⚠' : '✓';
  el.innerHTML = `<span class="toast-icon">${icon}</span><span class="toast-message">${message}</span>`;
  root.appendChild(el);
  requestAnimationFrame(() => el.classList.add('toast-visible'));
  setTimeout(() => {
    el.classList.remove('toast-visible');
    setTimeout(() => el.remove(), 250);
  }, opts.duration || 3200);
}

/* ---------------------------------------------------------------- */
/* Modal + confirm dialog                                            */
/* ---------------------------------------------------------------- */

function ensureModalRoot() {
  let root = document.getElementById('modal-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'modal-root';
    document.body.appendChild(root);
  }
  return root;
}

function openModal(innerHtml, opts) {
  opts = opts || {};
  const root = ensureModalRoot();
  root.innerHTML = `
    <div class="modal-overlay" id="modal-overlay">
      <div class="modal-box ${opts.wide ? 'modal-wide' : ''}" role="dialog" aria-modal="true">
        ${innerHtml}
      </div>
    </div>`;
  const overlay = document.getElementById('modal-overlay');
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay && opts.dismissable !== false) closeModal();
  });
  document.body.classList.add('modal-open');
}

function closeModal() {
  const root = document.getElementById('modal-root');
  if (root) root.innerHTML = '';
  document.body.classList.remove('modal-open');
}

function confirmDialog(opts) {
  const danger = opts.danger ? 'btn-danger' : 'btn-primary';
  openModal(`
    <div class="modal-header">
      <h3>${escapeHtml(opts.title)}</h3>
    </div>
    <div class="modal-body">
      <p>${opts.message}</p>
      ${opts.extra || ''}
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" id="confirm-cancel-btn">${opts.cancelText || 'Cancel'}</button>
      <button class="btn ${danger}" id="confirm-ok-btn">${opts.confirmText || 'Confirm'}</button>
    </div>
  `);
  document.getElementById('confirm-cancel-btn').addEventListener('click', () => {
    closeModal();
    if (opts.onCancel) opts.onCancel();
  });
  document.getElementById('confirm-ok-btn').addEventListener('click', () => {
    if (opts.onConfirm) opts.onConfirm();
  });
}

/* ---------------------------------------------------------------- */
/* Simple form validation helper                                     */
/* ---------------------------------------------------------------- */

// fields: [{ id: 'input id', message: 'error text', validate: optional fn(value) => bool }]
function validateFields(fields) {
  let firstInvalid = null;
  let valid = true;
  fields.forEach(f => {
    const input = document.getElementById(f.id);
    const errorEl = document.getElementById(f.id + '-error');
    if (!input) return;
    const value = input.value ? input.value.trim() : '';
    const ok = f.validate ? f.validate(value) : value.length > 0;
    if (!ok) {
      valid = false;
      input.classList.add('input-invalid');
      if (errorEl) errorEl.textContent = f.message;
      if (!firstInvalid) firstInvalid = input;
    } else {
      input.classList.remove('input-invalid');
      if (errorEl) errorEl.textContent = '';
    }
  });
  if (firstInvalid) firstInvalid.focus();
  return valid;
}

/* ---------------------------------------------------------------- */
/* Mobile agent session (sessionStorage-backed)                      */
/* ---------------------------------------------------------------- */

function getAgentSession() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch (e) { return null; }
}

function setAgentSession(session) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearAgentSession() {
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(EXEC_KEY);
}

function getTaskExecution() {
  try { return JSON.parse(sessionStorage.getItem(EXEC_KEY)); } catch (e) { return null; }
}

function setTaskExecution(exec) {
  sessionStorage.setItem(EXEC_KEY, JSON.stringify(exec));
}

function clearTaskExecution() {
  sessionStorage.removeItem(EXEC_KEY);
}

function requireAgentSession() {
  const session = getAgentSession();
  if (!session) {
    window.location.href = 'login.html';
    return null;
  }
  return session;
}
