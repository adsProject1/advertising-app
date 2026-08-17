/**
 * mobile.js
 * Controller logic for the Mobile Agent application: login/OTP,
 * activity home, task list, and the task execution wizard (capture ->
 * location -> details -> review -> submit -> success). State is
 * shared with the Desktop Admin app via app.js / localStorage, so a
 * task submitted here is immediately visible in desktop Submissions.
 *
 * There is no agent roster: a field officer logs in with an Activity
 * Number + their own mobile number (mock OTP). Access is scoped to
 * the Activity Number only — whoever holds it can see and execute
 * whatever tasks exist under that activity. Task status is therefore
 * shared across anyone logged into the same activity, not tracked
 * per person; submissions are attributed by mobile number.
 */

const PENDING_LOGIN_KEY = 'promotrack_pending_login_v1';
const MOCK_OTP = '123456';

/* ================================================================ */
/* Shared mobile UI helpers                                          */
/* ================================================================ */

function greetingWord() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function formatTimeSec(d) {
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12; if (h === 0) h = 12;
  return `${h}:${m}:${s} ${ap}`;
}

function emptyMobileState(message, title) {
  return `<div class="empty-state">
    <div class="empty-icon">&#128203;</div>
    <h3>${escapeHtml(title || 'Nothing Here Yet')}</h3>
    <p>${escapeHtml(message)}</p>
  </div>`;
}

function renderMobileTopbar(mountId, title, subtitle) {
  const el = document.getElementById(mountId);
  if (!el) return;
  el.innerHTML = `
    <div class="mobile-topbar">
      <button class="back-btn" id="mobile-back-btn" aria-label="Back">&#8592;</button>
      <div class="mobile-topbar-title">${escapeHtml(title)}${subtitle ? `<span class="sub">${escapeHtml(subtitle)}</span>` : ''}</div>
    </div>`;
}

function renderMobileBottomNav(activeKey) {
  const el = document.getElementById('mobile-bottomnav-mount');
  if (!el) return;
  const items = [
    { key: 'home', label: 'Home', icon: '&#8962;', href: 'home.html' },
    { key: 'tasks', label: 'Tasks', icon: '&#9989;', href: 'tasks.html' },
    { key: 'history', label: 'History', icon: '&#128336;', href: 'history.html' },
    { key: 'profile', label: 'Profile', icon: '&#128100;', href: 'profile.html' }
  ];
  el.innerHTML = `<nav class="mobile-bottomnav">${items.map(i => `<a href="${i.href}" class="${i.key === activeKey ? 'active' : ''}"><span class="nav-ic">${i.icon}</span>${i.label}</a>`).join('')}</nav>`;
}

// Task status is shared across the activity (not per-person), so the
// same card renders identically for whoever is logged into it.
function renderMobileTaskCard(task) {
  const status = computeTaskStatus(task);
  const reqTags = [];
  if (task.requirements.photo) reqTags.push('Photo Capture');
  if (task.requirements.gps) reqTags.push('GPS Required');
  if (task.requirements.timestamp) reqTags.push('Timestamp Required');
  if (task.requirements.comment) reqTags.push('Comment');
  if (task.requirements.customerDetails) reqTags.push('Customer Details');

  let actionBtn;
  if (status === 'Completed') actionBtn = `<a class="btn btn-secondary btn-sm" href="task-detail.html?id=${task.id}">View Submission</a>`;
  else if (status === 'Rejected') actionBtn = `<a class="btn btn-danger btn-sm" href="task-detail.html?id=${task.id}">Resubmit Task</a>`;
  else actionBtn = `<a class="btn btn-primary btn-sm" href="task-detail.html?id=${task.id}">Start Task</a>`;

  return `<div class="mobile-task-card">
    <div class="mobile-task-card-top">
      <div>
        <div class="mobile-task-name">${escapeHtml(task.name)}</div>
        <div class="mobile-task-time">${escapeHtml(task.scheduledTime || 'Unscheduled')}</div>
      </div>
      ${badge(status)}
    </div>
    <div class="mobile-task-tags">${reqTags.map(t => `<span class="mobile-task-tag">${t}</span>`).join('')}</div>
    <div class="mobile-task-card-footer">
      <span class="text-faint" style="font-size:12px;">${escapeHtml(task.type)}</span>
      ${actionBtn}
    </div>
  </div>`;
}

function renderMobileTaskSection(title, list) {
  if (list.length === 0) return '';
  return `<div class="mobile-section-title">${title} <span class="count-pill">${list.length}</span></div>${list.map(t => renderMobileTaskCard(t)).join('')}`;
}

/* ================================================================ */
/* Login                                                              */
/* ================================================================ */

function initLoginPage() {
  const existing = getAgentSession();
  if (existing) { window.location.href = 'home.html'; return; }

  document.getElementById('login-activity').value = 'ACT-10001';
  document.getElementById('login-mobile').value = '9876543210';
  document.getElementById('send-otp-btn').addEventListener('click', handleSendOtp);
}

// Access is scoped purely by Activity Number — there is no agent
// roster to cross-check the mobile number against. Any mobile number
// in a plausible 10-digit format can log into a valid activity.
function handleSendOtp() {
  const activityId = document.getElementById('login-activity').value.trim().toUpperCase();
  const mobile = document.getElementById('login-mobile').value.trim();
  let valid = true;

  const activity = getActivity(activityId);
  const activityErrorEl = document.getElementById('login-activity-error');
  if (!activity) {
    activityErrorEl.textContent = 'We could not find this Activity Number.';
    valid = false;
  } else {
    activityErrorEl.textContent = '';
  }

  const mobileErrorEl = document.getElementById('login-mobile-error');
  if (!/^\d{10}$/.test(mobile)) {
    mobileErrorEl.textContent = 'Please enter a valid 10-digit mobile number.';
    valid = false;
  } else {
    mobileErrorEl.textContent = '';
  }

  if (!valid) return;

  sessionStorage.setItem(PENDING_LOGIN_KEY, JSON.stringify({ activityId, mobile }));
  window.location.href = 'otp.html';
}

/* ================================================================ */
/* OTP                                                                */
/* ================================================================ */

let otpTimerInterval = null;
let otpSecondsLeft = 45;

function getPendingLogin() {
  try { return JSON.parse(sessionStorage.getItem(PENDING_LOGIN_KEY)); } catch (e) { return null; }
}

function initOtpPage() {
  const pending = getPendingLogin();
  if (!pending) { window.location.href = 'login.html'; return; }

  renderMobileTopbar('mobile-topbar-mount', 'Verify Mobile Number');
  document.getElementById('mobile-back-btn').addEventListener('click', () => window.location.href = 'login.html');
  document.getElementById('otp-target-mobile').textContent = '+91 ' + pending.mobile;

  const inputs = Array.from(document.querySelectorAll('.otp-inputs input'));
  inputs.forEach((inp, idx) => {
    inp.addEventListener('input', () => {
      inp.value = inp.value.replace(/[^0-9]/g, '').slice(0, 1);
      inp.classList.remove('input-invalid');
      document.getElementById('otp-error').textContent = '';
      if (inp.value && idx < inputs.length - 1) inputs[idx + 1].focus();
    });
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !inp.value && idx > 0) inputs[idx - 1].focus();
    });
  });
  inputs[0].focus();

  document.getElementById('verify-otp-btn').addEventListener('click', () => handleVerifyOtp(inputs, pending));
  document.getElementById('resend-otp-link').addEventListener('click', (e) => { e.preventDefault(); resendOtp(inputs); });

  startOtpTimer();
}

function startOtpTimer() {
  otpSecondsLeft = 45;
  updateOtpTimerDisplay();
  clearInterval(otpTimerInterval);
  otpTimerInterval = setInterval(() => {
    otpSecondsLeft--;
    updateOtpTimerDisplay();
    if (otpSecondsLeft <= 0) clearInterval(otpTimerInterval);
  }, 1000);
}

function updateOtpTimerDisplay() {
  const el = document.getElementById('otp-timer');
  if (otpSecondsLeft <= 0) { el.textContent = 'You can now resend the OTP.'; return; }
  const m = String(Math.floor(otpSecondsLeft / 60)).padStart(2, '0');
  const s = String(otpSecondsLeft % 60).padStart(2, '0');
  el.textContent = `${m}:${s}`;
}

function resendOtp(inputs) {
  inputs.forEach(i => { i.value = ''; i.classList.remove('input-invalid'); });
  inputs[0].focus();
  document.getElementById('otp-error').textContent = '';
  showToast('&#10003; OTP resent successfully');
  startOtpTimer();
}

function handleVerifyOtp(inputs, pending) {
  const code = inputs.map(i => i.value).join('');
  if (code.length < 6) {
    document.getElementById('otp-error').textContent = 'Please enter the complete 6-digit OTP.';
    inputs.forEach(i => { if (!i.value) i.classList.add('input-invalid'); });
    return;
  }
  if (code !== MOCK_OTP) {
    document.getElementById('otp-error').textContent = 'Invalid OTP. Please try again.';
    inputs.forEach(i => i.classList.add('input-invalid'));
    return;
  }
  setAgentSession({ activityId: pending.activityId, mobile: pending.mobile });
  sessionStorage.removeItem(PENDING_LOGIN_KEY);
  clearInterval(otpTimerInterval);
  window.location.href = 'home.html';
}

/* ================================================================ */
/* Home                                                                */
/* ================================================================ */

function initHomePage() {
  const session = requireAgentSession();
  if (!session) return;
  renderMobileBottomNav('home');

  const activity = getActivity(session.activityId);
  const event = getEvent(activity.eventId);
  const firstName = activity.fieldOfficerName ? activity.fieldOfficerName.split(' ')[0] : '';

  document.getElementById('greeting-word').textContent = firstName ? greetingWord() + ',' : greetingWord() + '!';
  document.getElementById('greeting-name').textContent = firstName;
  document.getElementById('home-activity-id').textContent = activity.id;
  document.getElementById('home-activity-location').textContent = `${activity.location.name}, ${activity.location.city}`;
  document.getElementById('home-event-name').textContent = event ? event.name : '';
  document.getElementById('home-event-dates').textContent = event ? formatDateRange(event.dateFrom, event.dateTo) : '';
  document.getElementById('home-event-status').innerHTML = badge(activity.status);

  const tasks = getTasksForActivity(activity.id);
  document.getElementById('home-tasks-count').textContent = tasks.length;
  const container = document.getElementById('home-tasks-list');
  container.innerHTML = tasks.length === 0
    ? emptyMobileState('No tasks have been created for this activity yet.')
    : tasks.map(t => renderMobileTaskCard(t)).join('');
}

/* ================================================================ */
/* Tasks (mobile tab)                                                  */
/* ================================================================ */

function initMobileTasksPage() {
  const session = requireAgentSession();
  if (!session) return;
  renderMobileBottomNav('tasks');

  const activity = getActivity(session.activityId);
  const tasks = getTasksForActivity(activity.id);

  const rejected = tasks.filter(t => computeTaskStatus(t) === 'Rejected');
  const pending = tasks.filter(t => computeTaskStatus(t) === 'Pending');
  const completed = tasks.filter(t => computeTaskStatus(t) === 'Completed');

  const content = document.getElementById('mobile-tasks-content');
  if (tasks.length === 0) {
    content.innerHTML = emptyMobileState('No tasks have been created for this activity yet.');
    return;
  }
  content.innerHTML =
    renderMobileTaskSection('Needs Resubmission', rejected) +
    renderMobileTaskSection('Pending', pending) +
    renderMobileTaskSection('Completed', completed);
}

/* ================================================================ */
/* Task Detail                                                        */
/* ================================================================ */

function initMobileTaskDetailPage() {
  const session = requireAgentSession();
  if (!session) return;

  const taskId = getQueryParam('id');
  const task = getTask(taskId);
  const root = document.getElementById('task-detail-root');

  renderMobileTopbar('mobile-topbar-mount', task ? task.name : 'Task', task ? task.id : '');
  document.getElementById('mobile-back-btn').addEventListener('click', () => window.location.href = 'tasks.html');

  if (!task || task.activityId !== session.activityId) {
    root.innerHTML = emptyMobileState('This task is not available for your current activity.');
    return;
  }

  const status = computeTaskStatus(task);

  const reqTags = [];
  if (task.requirements.photo) reqTags.push('Photo');
  if (task.requirements.gps) reqTags.push('GPS Location');
  if (task.requirements.timestamp) reqTags.push('Timestamp');
  if (task.requirements.comment) reqTags.push('Comment');
  if (task.requirements.customerDetails) reqTags.push('Customer Details');

  let html = `
    <div class="mobile-content">
      <div class="mobile-block">
        <div class="mobile-block-title">Task Information</div>
        <div class="mobile-kv"><span class="k">Task</span><span class="v">${task.id}</span></div>
        <div class="mobile-kv"><span class="k">Activity</span><span class="v">${task.activityId}</span></div>
        <div class="mobile-kv"><span class="k">Scheduled</span><span class="v">${escapeHtml(task.scheduledTime || 'Unscheduled')}</span></div>
        <div class="mobile-kv"><span class="k">Type</span><span class="v">${escapeHtml(task.type)}</span></div>
      </div>
      <div class="mobile-block">
        <div class="mobile-block-title">Required</div>
        <div class="req-list">${reqTags.map(r => `<div class="req-item"><span class="req-check">&#10003;</span>${r}</div>`).join('')}</div>
      </div>
  `;

  if (status === 'Pending') {
    html += `<button class="btn btn-primary btn-block" id="start-task-btn">Start Task</button>`;
  } else if (status === 'Rejected') {
    const sub = getLatestSubmissionForTask(task.id);
    html += `
      <div class="mobile-block" style="border-color:var(--color-red); background:var(--color-red-bg);">
        <div class="mobile-block-title" style="color:var(--color-red);">Rejected &mdash; Resubmission Needed</div>
        <p style="font-size:13px; color:var(--color-text); margin:0;">${escapeHtml(sub ? sub.rejectionReason || '' : '')}</p>
      </div>
      <button class="btn btn-primary btn-block" id="start-task-btn">Resubmit Task</button>`;
  } else {
    const sub = getLatestSubmissionForTask(task.id);
    html += `
      <div class="mobile-block">
        <div class="mobile-block-title">Submission</div>
        <div class="captured-photo-frame" style="height:170px; margin:0 0 12px;"><div class="cp-icon">&#128247;</div></div>
        <div class="mobile-kv"><span class="k">Status</span><span class="v">${badge(sub.status)}</span></div>
        <div class="mobile-kv"><span class="k">Submitted By</span><span class="v">${escapeHtml(sub.mobile)}</span></div>
        <div class="mobile-kv"><span class="k">Submitted</span><span class="v">${formatTimeOnly(sub.submittedAt)}</span></div>
        <div class="mobile-kv"><span class="k">Location</span><span class="v">${escapeHtml(sub.location)}</span></div>
        <div class="mobile-kv"><span class="k">Latitude</span><span class="v">${sub.lat}</span></div>
        <div class="mobile-kv"><span class="k">Longitude</span><span class="v">${sub.lng}</span></div>
        ${sub.comment ? `<div class="mobile-kv"><span class="k">Comment</span><span class="v">${escapeHtml(sub.comment)}</span></div>` : ''}
      </div>`;
  }

  html += `</div>`;
  root.innerHTML = html;

  const startBtn = document.getElementById('start-task-btn');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      setTaskExecution({ taskId: task.id, step: 'camera', photo: null, lat: null, lng: null, location: null, accuracy: null, capturedAt: null, comment: '' });
      window.location.href = `capture.html?taskId=${task.id}`;
    });
  }
}

/* ================================================================ */
/* Capture wizard: photo -> preview -> location -> details             */
/* ================================================================ */

function initCapturePage() {
  const session = requireAgentSession();
  if (!session) return;

  const taskId = getQueryParam('taskId');
  const task = getTask(taskId);
  const exec = getTaskExecution();

  if (!task || !exec || exec.taskId !== taskId) {
    window.location.href = `task-detail.html?id=${taskId}`;
    return;
  }

  renderMobileTopbar('mobile-topbar-mount', task.name, 'Capture Evidence');
  document.getElementById('mobile-back-btn').addEventListener('click', () => handleCaptureBack(task));

  renderCaptureStep(task, exec);
}

function handleCaptureBack(task) {
  const exec = getTaskExecution();
  const order = ['camera', 'preview', 'location', 'details'];
  const idx = order.indexOf(exec.step);
  if (idx <= 0) {
    clearTaskExecution();
    window.location.href = `task-detail.html?id=${task.id}`;
    return;
  }
  exec.step = order[idx - 1];
  setTaskExecution(exec);
  renderCaptureStep(task, exec);
}

function renderCaptureStep(task, exec) {
  const steps = ['camera', 'preview', 'location', 'details'];
  const stepIdx = steps.indexOf(exec.step);
  document.getElementById('capture-step-progress').innerHTML = steps.map((s, i) =>
    `<div class="step-dot ${i < stepIdx ? 'done' : (i === stepIdx ? 'current' : '')}"></div>`
  ).join('');

  const body = document.getElementById('capture-body');

  if (exec.step === 'camera') {
    body.innerHTML = `
      <div class="mobile-section" style="padding-top:6px;"><div class="mobile-section-title">Capture Evidence</div></div>
      <div class="placeholder-box camera-placeholder">
        <div class="ph-icon">&#128247;</div>
        <div class="ph-label">Camera Preview</div>
      </div>
      <div class="capture-actions"><button class="btn btn-primary" id="capture-photo-btn">Capture Photo</button></div>
    `;
    document.getElementById('capture-photo-btn').addEventListener('click', () => {
      exec.photo = 'captured';
      exec.step = 'preview';
      setTaskExecution(exec);
      renderCaptureStep(task, exec);
    });

  } else if (exec.step === 'preview') {
    body.innerHTML = `
      <div class="mobile-section" style="padding-top:6px;"><div class="mobile-section-title">Captured Photo</div></div>
      <div class="captured-photo-frame">
        <span class="cp-badge">Preview</span>
        <div class="cp-icon">&#128247;</div>
        <div class="cp-caption">Mock captured photo &mdash; ${escapeHtml(task.name)}</div>
      </div>
      <div class="capture-actions">
        <button class="btn btn-secondary" id="retake-btn">Retake</button>
        <button class="btn btn-primary" id="use-photo-btn">Use Photo</button>
      </div>
    `;
    document.getElementById('retake-btn').addEventListener('click', () => {
      exec.step = 'camera'; exec.photo = null;
      setTaskExecution(exec);
      renderCaptureStep(task, exec);
    });
    document.getElementById('use-photo-btn').addEventListener('click', () => {
      exec.step = 'location';
      setTaskExecution(exec);
      renderCaptureStep(task, exec);
    });

  } else if (exec.step === 'location') {
    renderLocationStep(task, exec, body);

  } else if (exec.step === 'details') {
    renderDetailsStep(task, exec, body);
  }
}

function renderLocationStep(task, exec, body) {
  body.innerHTML = `
    <div class="mobile-section" style="padding-top:6px;"><div class="mobile-section-title">Location</div></div>
    <div class="mobile-content" style="padding-top:0;">
      <div class="location-status loading" id="location-status-box">&#8987; Capturing location&hellip;</div>
      <div id="location-details" style="display:none;">
        <div class="mobile-block">
          <div class="mobile-kv"><span class="k">Latitude</span><span class="v" id="loc-lat"></span></div>
          <div class="mobile-kv"><span class="k">Longitude</span><span class="v" id="loc-lng"></span></div>
          <div class="mobile-kv"><span class="k">Location</span><span class="v" id="loc-name"></span></div>
          <div class="mobile-kv"><span class="k">Accuracy</span><span class="v" id="loc-accuracy"></span></div>
        </div>
      </div>
    </div>
    <div class="capture-actions">
      <button class="btn btn-secondary" id="refresh-location-btn">Refresh Location</button>
      <button class="btn btn-primary" id="location-continue-btn" disabled>Continue</button>
    </div>
  `;
  document.getElementById('refresh-location-btn').addEventListener('click', () => captureLocation(task, exec));
  document.getElementById('location-continue-btn').addEventListener('click', () => {
    exec.step = 'details';
    setTaskExecution(exec);
    renderCaptureStep(task, exec);
  });
  captureLocation(task, exec);
}

// No real activity coordinates are collected on desktop in this build,
// so the simulated GPS fix is derived from a small per-activity offset
// (deterministic hash of the Activity Number) plus jitter, rather than
// a real stored lat/lng. It is still entirely mock data.
function baseCoordsForActivity(activityId) {
  let hash = 0;
  for (let i = 0; i < activityId.length; i++) hash = (hash * 31 + activityId.charCodeAt(i)) >>> 0;
  const lat = 18.5 + (hash % 1000) / 10000;
  const lng = 73.9 + (Math.floor(hash / 1000) % 1000) / 10000;
  return { lat, lng };
}

function captureLocation(task, exec) {
  const activity = getActivity(task.activityId);
  const statusBox = document.getElementById('location-status-box');
  const detailsBox = document.getElementById('location-details');
  const continueBtn = document.getElementById('location-continue-btn');
  if (!statusBox) return;

  statusBox.className = 'location-status loading';
  statusBox.innerHTML = '&#8987; Capturing location&hellip;';
  detailsBox.style.display = 'none';
  if (continueBtn) continueBtn.disabled = true;

  setTimeout(() => {
    const base = baseCoordsForActivity(activity.id);
    const jitter = () => (Math.random() - 0.5) * 0.0006;
    const accuracy = 8 + Math.floor(Math.random() * 12);

    exec.lat = Number((base.lat + jitter()).toFixed(4));
    exec.lng = Number((base.lng + jitter()).toFixed(4));
    exec.location = `${activity.location.name}, ${activity.location.city}`;
    exec.accuracy = accuracy;
    setTaskExecution(exec);

    statusBox.className = 'location-status';
    statusBox.innerHTML = '&#10003; Location captured';
    document.getElementById('loc-lat').textContent = exec.lat;
    document.getElementById('loc-lng').textContent = exec.lng;
    document.getElementById('loc-name').textContent = exec.location;
    document.getElementById('loc-accuracy').textContent = accuracy + ' meters';
    detailsBox.style.display = 'block';
    if (continueBtn) continueBtn.disabled = false;
  }, 700);
}

function renderDetailsStep(task, exec, body) {
  const now = demoNow();
  exec.capturedAt = toNaiveIsoLocal(now);
  setTaskExecution(exec);

  body.innerHTML = `
    <div class="mobile-section" style="padding-top:6px;"><div class="mobile-section-title">Capture Information</div></div>
    <div class="mobile-content" style="padding-top:0;">
      <div class="mobile-block">
        <div class="mobile-kv"><span class="k">Captured At</span><span class="v">${formatDateTime(exec.capturedAt)}</span></div>
        <div class="mobile-kv"><span class="k">Device</span><span class="v">Android Device</span></div>
        <div class="mobile-kv"><span class="k">GPS</span><span class="v">Captured</span></div>
      </div>
      <div class="mobile-block">
        <div class="mobile-block-title">Comments (optional)</div>
        <textarea class="form-control" id="comment-input" rows="3" placeholder="Enter any observation...">${escapeHtml(exec.comment || '')}</textarea>
      </div>
      <button class="btn btn-primary btn-block" id="review-continue-btn">Continue to Review</button>
    </div>
  `;
  document.getElementById('review-continue-btn').addEventListener('click', () => {
    exec.comment = document.getElementById('comment-input').value.trim();
    setTaskExecution(exec);
    window.location.href = `review.html?taskId=${task.id}`;
  });
}

/* ================================================================ */
/* Review + Submit                                                     */
/* ================================================================ */

function initReviewPage() {
  const session = requireAgentSession();
  if (!session) return;

  const taskId = getQueryParam('taskId');
  const task = getTask(taskId);
  const exec = getTaskExecution();

  if (!task || !exec || exec.taskId !== taskId || !exec.lat) {
    window.location.href = `task-detail.html?id=${taskId}`;
    return;
  }

  renderMobileTopbar('mobile-topbar-mount', 'Review Submission', task.name);
  document.getElementById('mobile-back-btn').addEventListener('click', () => {
    exec.step = 'details';
    setTaskExecution(exec);
    window.location.href = `capture.html?taskId=${taskId}`;
  });

  document.getElementById('review-body').innerHTML = `
    <div class="mobile-content">
      <div class="mobile-block">
        <div class="mobile-block-title">Photo</div>
        <div class="captured-photo-frame" style="height:200px; margin:0;"><div class="cp-icon">&#128247;</div></div>
      </div>
      <div class="mobile-block">
        <div class="mobile-kv"><span class="k">Location</span><span class="v">${escapeHtml(exec.location)}</span></div>
        <div class="mobile-kv"><span class="k">Latitude</span><span class="v">${exec.lat}</span></div>
        <div class="mobile-kv"><span class="k">Longitude</span><span class="v">${exec.lng}</span></div>
        <div class="mobile-kv"><span class="k">Captured At</span><span class="v">${formatTimeOnly(exec.capturedAt)}</span></div>
        <div class="mobile-kv"><span class="k">Comment</span><span class="v">${exec.comment ? escapeHtml(exec.comment) : 'No comment added'}</span></div>
      </div>
      <button class="btn btn-primary btn-block" id="submit-task-btn">Submit Task</button>
    </div>
  `;

  document.getElementById('submit-task-btn').addEventListener('click', () => {
    confirmDialog({
      title: 'Submit this task evidence?',
      message: 'Once submitted, you may not be able to edit it.',
      confirmText: 'Submit',
      onConfirm: () => finalizeSubmission(task, session)
    });
  });
}

function finalizeSubmission(task, session) {
  const exec = getTaskExecution();
  const now = demoNow();
  const serverNow = new Date(now.getTime() + 4000);
  const id = nextId('submission');

  // Submissions are an append-only log per task (desktop's Task Detail
  // shows the full history), so a resubmission after a rejection is
  // simply a new row — the task's status is driven by whichever
  // submission is most recent.
  updateState(s => {
    s.submissions.push({
      id, taskId: task.id, activityId: task.activityId, mobile: session.mobile,
      submittedAt: toNaiveIsoLocal(now),
      deviceTimestamp: formatTimeSec(now),
      serverTimestamp: formatTimeSec(serverNow),
      lat: exec.lat, lng: exec.lng, location: exec.location, accuracy: exec.accuracy,
      comment: exec.comment || '', status: 'Pending Review'
    });
  });

  clearTaskExecution();
  closeModal();
  window.location.href = `success.html?taskId=${task.id}`;
}

/* ================================================================ */
/* Success                                                             */
/* ================================================================ */

function initSuccessPage() {
  const session = requireAgentSession();
  if (!session) return;

  const taskId = getQueryParam('taskId');
  const task = getTask(taskId);
  const sub = getSubmissionForTaskAndMobile(taskId, session.mobile);

  if (!task || !sub) { window.location.href = 'tasks.html'; return; }

  document.getElementById('success-task-name').textContent = task.name;
  document.getElementById('success-time').textContent = formatTimeOnly(sub.submittedAt);
  document.getElementById('back-to-tasks-btn').addEventListener('click', () => window.location.href = 'tasks.html');
}

/* ================================================================ */
/* History                                                             */
/* ================================================================ */

// History is personal: it lists what THIS mobile number submitted,
// even though the underlying task status is shared with anyone else
// logged into the same activity.
function initHistoryPage() {
  const session = requireAgentSession();
  if (!session) return;
  renderMobileBottomNav('history');

  const subs = getState().submissions
    .filter(s => s.mobile === session.mobile && s.activityId === session.activityId)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

  const container = document.getElementById('history-list');
  if (subs.length === 0) {
    container.innerHTML = emptyMobileState('You have not submitted any tasks yet.');
    return;
  }

  container.innerHTML = `<div class="history-group-label">Today</div>` + subs.map(s => {
    const task = getTask(s.taskId);
    const isRejected = s.status === 'Rejected';
    return `<a href="task-detail.html?id=${s.taskId}" style="text-decoration:none; color:inherit; display:block;">
      <div class="history-item">
        <div class="hist-check" style="${isRejected ? 'background:var(--color-red-bg); color:var(--color-red);' : ''}">${isRejected ? '!' : '&#10003;'}</div>
        <div>
          <div class="hist-name">${task ? escapeHtml(task.name) : s.taskId}</div>
          <div class="hist-meta">${formatTimeOnly(s.submittedAt)} &middot; ${escapeHtml(s.location)}</div>
        </div>
        <div style="margin-left:auto;">${badge(s.status)}</div>
      </div>
    </a>`;
  }).join('');
}

/* ================================================================ */
/* Profile                                                             */
/* ================================================================ */

function initProfilePage() {
  const session = requireAgentSession();
  if (!session) return;
  renderMobileBottomNav('profile');

  const activity = getActivity(session.activityId);
  const displayName = activity.fieldOfficerName || 'Field Officer';

  document.getElementById('profile-avatar').textContent = activity.fieldOfficerName ? initials(activity.fieldOfficerName) : 'FO';
  document.getElementById('profile-name').textContent = displayName;
  document.getElementById('profile-mobile').textContent = session.mobile;
  document.getElementById('profile-activity-id').textContent = activity.id;
  document.getElementById('profile-activity-location').textContent = `${activity.location.name}, ${activity.location.city}`;

  document.getElementById('help-row').addEventListener('click', () => {
    openModal(`
      <div class="modal-header"><h3>Help &amp; Support</h3></div>
      <div class="modal-body">
        <p>For assistance with the PromoTrack field app, contact your activity supervisor or reach the operations desk at <strong>ops@sparklinepromotions.example</strong>.</p>
        <p style="margin-top:10px;">This is a prototype build for demonstration purposes only.</p>
      </div>
      <div class="modal-footer"><button class="btn btn-primary" onclick="closeModal()">Got it</button></div>
    `);
  });

  document.getElementById('logout-row').addEventListener('click', () => {
    confirmDialog({
      title: 'Log Out?',
      message: 'You will need your Activity Number and mobile OTP to log back in.',
      confirmText: 'Log Out',
      danger: true,
      onConfirm: () => {
        clearAgentSession();
        closeModal();
        window.location.href = 'login.html';
      }
    });
  });
}
