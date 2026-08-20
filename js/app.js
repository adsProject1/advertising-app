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

const STORAGE_KEY = 'promotrack_state_v8';
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

// IDs are plain numeric strings (no letter prefix) — kept as strings, not
// JS numbers, so they compare correctly against query-param values, which
// always arrive from the URL as strings.
function nextId(type) {
  const state = getState();
  const n = state.nextIds[type];
  state.nextIds[type] = n + 1;
  saveState(state);
  return String(n);
}

/* ---------------------------------------------------------------- */
/* Lookups                                                           */
/* ---------------------------------------------------------------- */
/* There is no agent/user roster in this build: field officers are    */
/* assigned to activities offline and simply log into an Activity     */
/* Number. Submissions are attributed by the mobile number entered    */
/* at login, not by a stored identity.                                */

function getActivity(id) { return getState().activities.find(a => a.id === id) || null; }
function getSubmission(id) { return getState().submissions.find(s => s.id === id) || null; }

// The element master list is persisted (not a static lookup) so custom
// elements added from the Activity form's search stick around for future
// activities. addElement() dedupes case-insensitively on the English name
// and returns the existing entry instead of creating a near-duplicate.
function getElements() { return getState().elements; }

function addElement(en, hi) {
  en = en.trim(); hi = hi.trim();
  const existing = getElements().find(e => e.en.toLowerCase() === en.toLowerCase());
  if (existing) return existing;
  const el = { en, hi };
  updateState(s => { s.elements.push(el); });
  return el;
}

function getSubmissionsForActivity(activityId) { return getState().submissions.filter(s => s.activityId === activityId); }

function getLatestSubmissionForActivity(activityId) {
  const subs = getSubmissionsForActivity(activityId);
  if (subs.length === 0) return null;
  return subs.slice().sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0];
}

/* ---------------------------------------------------------------- */
/* Computed status                                                   */
/* ---------------------------------------------------------------- */

// An activity's execution status is shared across whoever is logged
// into it — there is no per-agent breakdown since activities are not
// assigned to individuals. Submissions are auto-approved on submit,
// so this simply reflects whether one has been submitted yet.
function computeActivitySubmissionStatus(activity) {
  return getLatestSubmissionForActivity(activity.id) ? 'Completed' : 'Pending';
}

// Lifecycle status derived from the activity's own Period dates
// relative to the fixed demo "today" — Upcoming / Ongoing / Completed.
function computeActivityLifecycle(activity) {
  if (DEMO_TODAY < activity.periodFrom) return 'Upcoming';
  if (DEMO_TODAY > activity.periodTo) return 'Completed';
  return 'Ongoing';
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
/* Element checkbox tiles — shared by the desktop Activity form and   */
/* the mobile Add Photo element-selection step.                      */
/* ---------------------------------------------------------------- */

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
  document.removeEventListener('keydown', handleLightboxKeydown);
  LIGHTBOX_STATE = null;
}

/* ---------------------------------------------------------------- */
/* Submission photo grid + fullscreen lightbox — shared by desktop's  */
/* Submission Detail and mobile's Submission Detail.                  */
/* ---------------------------------------------------------------- */

// Sample submission photos live in /assets — reused across submissions
// since this is a wireframe prototype with no real photo uploads. Both
// pages/desktop/*.html and pages/mobile/*.html sit one level under
// pages/, so the same relative path works from either.
const SUBMISSION_PHOTO_FILES = ['1.jpg', '2.jpg', '3.jpg', '4.jpg', '5.jpg', '6.jpg', '7.jpg'];
const SUBMISSION_PHOTO_BASE = '../../assets/';

function hashStringToInt(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Deterministic per-submission pick so a given submission's photos stay
// the same across re-renders. One photo per capture batch — the field
// officer captured one photo per group of elements selected, so the
// photo count mirrors sub.captures.length (falls back to 1 for
// older/seed shapes).
function getSubmissionPhotos(sub) {
  const h = hashStringToInt(sub.id);
  const count = (sub.captures && sub.captures.length) || 1;
  const files = [];
  for (let i = 0; i < count; i++) {
    files.push(SUBMISSION_PHOTO_FILES[(h + i * 7) % SUBMISSION_PHOTO_FILES.length]);
  }
  return files;
}

function renderPhotoGrid(sub) {
  const files = getSubmissionPhotos(sub);
  const srcs = files.map(f => SUBMISSION_PHOTO_BASE + f);
  const captures = sub.captures || [];
  return `<div class="photo-grid">
    ${srcs.map((src, i) => {
      const tags = captures[i] ? captures[i].elementNames.join(', ') : `Photo ${i + 1}`;
      return `
      <div class="photo-card" onclick='openImageLightbox(${JSON.stringify(srcs)}, ${i})'>
        <img src="${src}" alt="Submission photo ${i + 1}" loading="lazy">
        <div class="photo-card-label"><span>${escapeHtml(tags)}</span><span>&#128269;</span></div>
      </div>`;
    }).join('')}
  </div>`;
}

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

/* ---------------------------------------------------------------- */
/* Global lowercase-only text input enforcement                      */
/* ---------------------------------------------------------------- */

// Delegated on document (not per-field) so it automatically covers every
// text input/textarea on every page — desktop and mobile alike — including
// ones injected into the DOM later (e.g. the Add Element inputs rendered
// inside a search dropdown). toLowerCase() is a no-op on digits/Devanagari,
// so this is safe to run over OTP digits, phone numbers, etc. too.
function enforceLowercaseInputs() {
  document.addEventListener('input', (e) => {
    const el = e.target;
    if (!el.matches || !el.matches('input[type="text"], input[type="tel"], input[type="search"], textarea')) return;
    const pos = el.selectionStart;
    if (el.value === el.value.toLowerCase()) return;
    el.value = el.value.toLowerCase();
    if (typeof pos === 'number') el.setSelectionRange(pos, pos);
  });
}
enforceLowercaseInputs();
