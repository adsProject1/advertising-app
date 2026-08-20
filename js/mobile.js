/**
 * mobile.js
 * Controller logic for the Mobile Agent application: login/OTP, and
 * the Add Photo flow (select elements -> capture photo -> repeat ->
 * submit all at once). State is shared with the Desktop Admin app via
 * app.js / localStorage, so a submission made here is immediately
 * visible in desktop Submissions.
 *
 * There is no agent roster: a field officer logs in with an Activity
 * Number + Team No + their own mobile number (mock OTP) and executes
 * that one Activity directly. Home starts empty except for an "Add
 * Photo" button; each round through the Add Photo flow tags a mock
 * photo with whichever elements were selected for it, and all
 * captured photos are submitted together in one go, auto-approved.
 */

const PENDING_LOGIN_KEY = 'promotrack_pending_login_v1';
const MOCK_OTP = '123456';

/* ================================================================ */
/* Shared mobile UI helpers                                          */
/* ================================================================ */

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
    { key: 'history', label: 'History', icon: '&#128336;', href: 'history.html' },
    { key: 'profile', label: 'Profile', icon: '&#128100;', href: 'profile.html' }
  ];
  el.innerHTML = `<nav class="mobile-bottomnav">${items.map(i => `<a href="${i.href}" class="${i.key === activeKey ? 'active' : ''}"><span class="nav-ic">${i.icon}</span>${i.label}</a>`).join('')}</nav>`;
}

/* ================================================================ */
/* Login                                                              */
/* ================================================================ */

function initLoginPage() {
  const existing = getAgentSession();
  if (existing) { window.location.href = 'home.html'; return; }

  document.getElementById('login-activity').value = '10001';
  document.getElementById('login-teamno').value = '1';
  document.getElementById('login-mobile').value = '9876543210';

  // Activity ID, Team No and Mobile Number are all numeric-only identifiers
  // — strip anything non-digit as the user types, same treatment as the
  // OTP boxes get.
  const teamNoInput = document.getElementById('login-teamno');
  teamNoInput.addEventListener('input', () => { teamNoInput.value = teamNoInput.value.replace(/[^0-9]/g, ''); });
  const activityInput = document.getElementById('login-activity');
  activityInput.addEventListener('input', () => { activityInput.value = activityInput.value.replace(/[^0-9]/g, ''); });

  document.getElementById('send-otp-btn').addEventListener('click', handleSendOtp);
}

// Access is scoped purely by Activity Number — there is no agent
// roster to cross-check the team no. or mobile number against.
function handleSendOtp() {
  const activityId = document.getElementById('login-activity').value.trim();
  const teamNo = document.getElementById('login-teamno').value.trim();
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

  // Team No is a serial number, not an arbitrary code — 1, 2, 3, ... —
  // so 0 and leading zeros (e.g. "01") aren't valid.
  const teamNoErrorEl = document.getElementById('login-teamno-error');
  if (!/^[1-9]\d*$/.test(teamNo)) {
    teamNoErrorEl.textContent = 'Please enter a Team No. starting from 1 (e.g. 1, 2, 3).';
    valid = false;
  } else {
    teamNoErrorEl.textContent = '';
  }

  const mobileErrorEl = document.getElementById('login-mobile-error');
  if (!/^\d{10}$/.test(mobile)) {
    mobileErrorEl.textContent = 'Please enter a valid 10-digit mobile number.';
    valid = false;
  } else {
    mobileErrorEl.textContent = '';
  }

  if (!valid) return;

  sessionStorage.setItem(PENDING_LOGIN_KEY, JSON.stringify({ activityId, teamNo, mobile }));
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
  setAgentSession({ activityId: pending.activityId, teamNo: pending.teamNo, mobile: pending.mobile });
  sessionStorage.removeItem(PENDING_LOGIN_KEY);
  clearInterval(otpTimerInterval);
  window.location.href = 'home.html';
}

/* ================================================================ */
/* Home — empty until the first photo is added, then a staging area   */
/* for captured batches with a single "Submit All" action             */
/* ================================================================ */

// The in-progress capture session for an activity: { activityId,
// captures: [{ elementNames, photo }, ...] }. Persisted in
// sessionStorage via app.js's task-execution helpers so it survives
// navigating between Home and the Add Photo flow.
function getCaptureSessionFor(activityId) {
  let exec = getTaskExecution();
  if (!exec || exec.activityId !== activityId) {
    exec = { activityId, captures: [] };
    setTaskExecution(exec);
  }
  return exec;
}

const MIN_SUBMISSION_PHOTOS = 3;

function initHomePage() {
  const session = requireAgentSession();
  if (!session) return;
  renderMobileBottomNav('home');

  const activity = getActivity(session.activityId);
  document.getElementById('home-activity-id').textContent = `${activity.id} — ${activity.name}`;

  const content = document.getElementById('home-content');
  const exec = getCaptureSessionFor(activity.id);

  // Submissions are never final: a field officer can keep starting fresh
  // submissions for the same activity, even after one already went
  // through. The staging area (Start [Another] Submission) is shown
  // above the submission history, not below it, so the action a
  // returning user most likely wants is the first thing they see. Every
  // past submission is its own permanent record — none of them are
  // overridden or hidden by a newer one, so all are listed, newest first.
  const allSubs = getSubmissionsForActivity(activity.id).slice().sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  content.innerHTML = renderHomeStaging(exec, allSubs.length > 0) + renderSubmissionHistory(allSubs);
  wireHomeActions(activity, exec);
}

function renderHomeStaging(exec, hasPriorSubmission) {
  const count = exec.captures.length;
  const startLabel = hasPriorSubmission ? 'Start Another Submission' : 'Start Submission';

  if (count === 0) {
    return `<div class="home-empty-cta">
      <div class="hec-icon">&#128247;</div>
      <p>No photos added yet. Tap below to select elements and capture your first photo.</p>
      <button class="btn btn-primary btn-block" id="add-photo-btn">${startLabel}</button>
    </div>`;
  }

  let html = `<div class="mobile-section-title">Captured So Far <span class="count-pill">${count}</span></div>`;
  html += exec.captures.map(c => `
    <div class="capture-batch-item">
      <div class="cb-icon">&#128247;</div>
      <div class="cb-tags">${c.elementNames.map(e => `<span class="tag">${escapeHtml(e)}</span>`).join('')}</div>
    </div>`).join('');

  html += `<button class="btn btn-secondary btn-block" id="add-photo-btn" style="margin-top:6px;">${startLabel}</button>`;

  const remainingRequired = MIN_SUBMISSION_PHOTOS - count;
  html += `<p class="form-hint" style="text-align:center; margin: 10px 0;">${remainingRequired > 0
    ? `Capture at least ${remainingRequired} more photo${remainingRequired > 1 ? 's' : ''} (minimum ${MIN_SUBMISSION_PHOTOS}) before you can submit.`
    : `Minimum of ${MIN_SUBMISSION_PHOTOS} photos reached &mdash; you can submit now, or keep adding more.`}</p>`;
  html += `<button class="btn btn-primary btn-block" id="submit-all-btn" ${remainingRequired > 0 ? 'disabled' : ''}>Submit All</button>`;
  return html;
}

function wireHomeActions(activity, exec) {
  const addBtn = document.getElementById('add-photo-btn');
  if (addBtn) addBtn.addEventListener('click', () => window.location.href = 'capture.html');

  const submitBtn = document.getElementById('submit-all-btn');
  if (submitBtn) submitBtn.addEventListener('click', () => {
    if (exec.captures.length < MIN_SUBMISSION_PHOTOS) return;
    const session = requireAgentSession();
    if (!session) return;
    confirmDialog({
      title: 'Submit all captured photos?',
      message: 'Once submitted, you may not be able to edit it.',
      confirmText: 'Submit',
      onConfirm: () => finalizeSubmission(activity, session)
    });
  });
}

// Every submission for this activity gets its own permanent card — none
// are overridden or replaced by a later one.
function renderSubmissionHistory(subs) {
  if (subs.length === 0) return '';
  return `<div class="mobile-section-title">Previous Submissions <span class="count-pill">${subs.length}</span></div>`
    + subs.map(renderSubmittedSummary).join('');
}

// Mobile always displays "Submitted", never the underlying sub.status
// ("Approved") — the field officer doesn't experience a review step, and
// desktop still needs the real status value, so only this display is
// hardcoded, not the stored data.
function renderSubmittedSummary(sub) {
  const elements = (sub.captures || []).reduce((acc, c) => acc.concat(c.elementNames), []);
  return `
    <div class="mobile-block">
      <div class="mobile-block-title">Submission #${escapeHtml(sub.id)} &mdash; ${formatDateTime(sub.submittedAt)}</div>
      <div class="mobile-kv"><span class="k">Status</span><span class="v">${badge('Submitted')}</span></div>
      <div class="mobile-kv"><span class="k">Submitted By</span><span class="v">${escapeHtml(sub.mobile)}</span></div>
      <div class="mobile-kv"><span class="k">Team No</span><span class="v">${escapeHtml(sub.teamNo || '—')}</span></div>
      <div class="mobile-kv"><span class="k">Location</span><span class="v">${escapeHtml(sub.location)}</span></div>
      <div class="mobile-kv"><span class="k">Photos</span><span class="v">${(sub.captures || []).length}</span></div>
      <div class="tag-list" style="margin-top:8px;">${elements.map(e => `<span class="tag">${escapeHtml(e)}</span>`).join('') || '&mdash;'}</div>
    </div>`;
}

/* ================================================================ */
/* Add Photo: select elements -> capture photo -> back to Home        */
/* ================================================================ */

let CAPTURE_UI_STATE = null;

function initCapturePage() {
  const session = requireAgentSession();
  if (!session) return;

  const activity = getActivity(session.activityId);
  const exec = getCaptureSessionFor(activity.id);

  renderMobileTopbar('mobile-topbar-mount', 'Start Submission', activity.name);
  document.getElementById('mobile-back-btn').addEventListener('click', () => handleCaptureBack(activity, exec));

  CAPTURE_UI_STATE = { step: 'select', selected: [] };
  renderCaptureStep(activity, exec);
}

function handleCaptureBack(activity, exec) {
  if (CAPTURE_UI_STATE.step === 'camera') {
    CAPTURE_UI_STATE.step = 'select';
    renderCaptureStep(activity, exec);
  } else {
    window.location.href = 'home.html';
  }
}

function renderCaptureStep(activity, exec) {
  const steps = ['select', 'camera'];
  const stepIdx = steps.indexOf(CAPTURE_UI_STATE.step);
  document.getElementById('capture-step-progress').innerHTML = steps.map((s, i) =>
    `<div class="step-dot ${i < stepIdx ? 'done' : (i === stepIdx ? 'current' : '')}"></div>`
  ).join('');

  const body = document.getElementById('capture-body');

  if (CAPTURE_UI_STATE.step === 'select') {
    // Elements can be picked again even if every element has already been
    // covered at least once this submission — always offer the full list.
    body.innerHTML = `
      <div class="mobile-section" style="padding-top:6px;"><div class="mobile-section-title">Select Elements</div></div>
      <div class="mobile-content" style="padding-top:0;">
        <div class="element-tiles" id="capture-elements-tiles"></div>
      </div>
      <div class="capture-actions"><button class="btn btn-primary" id="capture-select-next-btn">Capture Photo</button></div>
    `;
    renderElementTiles('capture-elements-tiles', activity.elementNames || [], CAPTURE_UI_STATE.selected);
    document.getElementById('capture-select-next-btn').addEventListener('click', () => {
      const selected = getCheckedValues('capture-elements-tiles');
      if (selected.length === 0) {
        showToast('Select at least one element', { type: 'error' });
        return;
      }
      CAPTURE_UI_STATE.selected = selected;
      CAPTURE_UI_STATE.step = 'camera';
      renderCaptureStep(activity, exec);
    });

  } else if (CAPTURE_UI_STATE.step === 'camera') {
    body.innerHTML = `
      <div class="mobile-section" style="padding-top:6px;"><div class="mobile-section-title">Capture Photo</div></div>
      <div class="tag-list" style="padding: 0 18px 14px;">${CAPTURE_UI_STATE.selected.map(e => `<span class="tag">${escapeHtml(e)}</span>`).join('')}</div>
      <div class="placeholder-box camera-placeholder">
        <div class="ph-icon">&#128247;</div>
        <div class="ph-label">Camera Preview</div>
      </div>
      <div class="capture-actions"><button class="btn btn-primary" id="capture-photo-btn">Capture Photo</button></div>
    `;
    document.getElementById('capture-photo-btn').addEventListener('click', () => {
      exec.captures.push({ elementNames: CAPTURE_UI_STATE.selected.slice(), photo: 'captured' });
      setTaskExecution(exec);
      window.location.href = 'home.html';
    });
  }
}

/* ================================================================ */
/* Submit                                                              */
/* ================================================================ */

// No real activity coordinates are collected on desktop in this build,
// so the simulated GPS fix is derived from a small per-activity offset
// (deterministic hash of the Activity Number) plus jitter, rather than
// a real stored lat/lng. It is still entirely mock data. Location is
// captured silently once per submission rather than as its own step.
function baseCoordsForActivity(activityId) {
  let hash = 0;
  for (let i = 0; i < activityId.length; i++) hash = (hash * 31 + activityId.charCodeAt(i)) >>> 0;
  const lat = 18.5 + (hash % 1000) / 10000;
  const lng = 73.9 + (Math.floor(hash / 1000) % 1000) / 10000;
  return { lat, lng };
}

function finalizeSubmission(activity, session) {
  const exec = getTaskExecution();
  const now = demoNow();
  const serverNow = new Date(now.getTime() + 4000);
  const id = nextId('submission');

  const base = baseCoordsForActivity(activity.id);
  const jitter = () => (Math.random() - 0.5) * 0.0006;

  updateState(s => {
    s.submissions.push({
      id, activityId: activity.id, mobile: session.mobile, teamNo: session.teamNo,
      submittedAt: toNaiveIsoLocal(now),
      deviceTimestamp: formatTimeSec(now),
      serverTimestamp: formatTimeSec(serverNow),
      lat: Number((base.lat + jitter()).toFixed(4)),
      lng: Number((base.lng + jitter()).toFixed(4)),
      location: `${activity.name}, ${activity.stateName}`,
      accuracy: 8 + Math.floor(Math.random() * 12),
      captures: exec.captures,
      status: 'Approved'
    });
  });

  clearTaskExecution();
  closeModal();
  window.location.href = 'success.html';
}

/* ================================================================ */
/* Success                                                             */
/* ================================================================ */

function initSuccessPage() {
  const session = requireAgentSession();
  if (!session) return;

  const activity = getActivity(session.activityId);
  const sub = getLatestSubmissionForActivity(session.activityId);
  if (!activity || !sub) { window.location.href = 'home.html'; return; }

  document.getElementById('success-activity-name').textContent = activity.name;
  document.getElementById('success-time').textContent = formatTimeOnly(sub.submittedAt);
  document.getElementById('success-photo-count').textContent = (sub.captures || []).length;
  document.getElementById('back-to-home-btn').addEventListener('click', () => window.location.href = 'home.html');
}

/* ================================================================ */
/* History                                                             */
/* ================================================================ */

// History is personal: it lists what THIS mobile number submitted,
// even though the underlying submission status is shared with anyone
// else logged into the same activity.
function initHistoryPage() {
  const session = requireAgentSession();
  if (!session) return;
  renderMobileBottomNav('history');

  const subs = getState().submissions
    .filter(s => s.mobile === session.mobile && s.activityId === session.activityId)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

  const container = document.getElementById('history-list');
  if (subs.length === 0) {
    container.innerHTML = emptyMobileState('You have not submitted anything yet.');
    return;
  }

  const activity = getActivity(session.activityId);
  container.innerHTML = `<div class="history-group-label">Today</div>` + subs.map(s => {
    const photoCount = (s.captures || []).length;
    return `<a href="submission-detail.html?id=${s.id}" style="text-decoration:none; color:inherit; display:block;">
      <div class="history-item">
        <div class="hist-check">&#10003;</div>
        <div>
          <div class="hist-name">${activity ? escapeHtml(activity.name) : s.activityId}</div>
          <div class="hist-meta">${photoCount} photo${photoCount === 1 ? '' : 's'} &middot; ${formatTimeOnly(s.submittedAt)}</div>
        </div>
        <div style="margin-left:auto; display:flex; align-items:center; gap:8px;">
          ${badge('Submitted')}
          <span class="arrow">&rsaquo;</span>
        </div>
      </div>
    </a>`;
  }).join('');
}

/* ================================================================ */
/* Submission Detail (reached from History)                           */
/* ================================================================ */

function initMobileSubmissionDetailPage() {
  const session = requireAgentSession();
  if (!session) return;

  const id = getQueryParam('id');
  const sub = getSubmission(id);

  renderMobileTopbar('mobile-topbar-mount', 'Submission Detail');
  document.getElementById('mobile-back-btn').addEventListener('click', () => window.location.href = 'history.html');

  const root = document.getElementById('submission-detail-root');

  // Scoped to this session's own mobile + activity, matching History's
  // own filtering — a field officer can only drill into their own
  // submissions for the activity they're currently logged into.
  if (!sub || sub.mobile !== session.mobile || sub.activityId !== session.activityId) {
    root.innerHTML = `<div class="mobile-content">${emptyMobileState('This submission is not available.', 'Not Found')}</div>`;
    return;
  }

  const activity = getActivity(sub.activityId);
  const elements = (sub.captures || []).reduce((acc, c) => acc.concat(c.elementNames), []);

  root.innerHTML = `
    <div class="mobile-content">
      <div class="mobile-block-title" style="margin-bottom:10px;">Photo Evidence</div>
      ${renderPhotoGrid(sub)}
      <div class="mobile-block">
        <div class="mobile-kv"><span class="k">Status</span><span class="v">${badge('Submitted')}</span></div>
        <div class="mobile-kv"><span class="k">Activity</span><span class="v">${activity ? escapeHtml(activity.name) : escapeHtml(sub.activityId)}</span></div>
        <div class="mobile-kv"><span class="k">Submitted By</span><span class="v">${escapeHtml(sub.mobile)}</span></div>
        <div class="mobile-kv"><span class="k">Team No</span><span class="v">${escapeHtml(sub.teamNo || '—')}</span></div>
        <div class="mobile-kv"><span class="k">Submitted</span><span class="v">${formatDateTime(sub.submittedAt)}</span></div>
        <div class="mobile-kv"><span class="k">Location</span><span class="v">${escapeHtml(sub.location)}</span></div>
        <div class="mobile-kv"><span class="k">Latitude</span><span class="v">${sub.lat}</span></div>
        <div class="mobile-kv"><span class="k">Longitude</span><span class="v">${sub.lng}</span></div>
        <div class="mobile-kv"><span class="k">GPS Accuracy</span><span class="v">${sub.accuracy ? sub.accuracy + ' meters' : '—'}</span></div>
      </div>
      <div class="mobile-block">
        <div class="mobile-block-title">Elements Covered</div>
        <div class="tag-list">${elements.map(e => `<span class="tag">${escapeHtml(e)}</span>`).join('') || '&mdash;'}</div>
      </div>
    </div>
  `;
}

/* ================================================================ */
/* Profile                                                             */
/* ================================================================ */

function initProfilePage() {
  const session = requireAgentSession();
  if (!session) return;
  renderMobileBottomNav('profile');

  const activity = getActivity(session.activityId);

  document.getElementById('profile-avatar').textContent = initials(session.teamNo || 'FO');
  document.getElementById('profile-name').textContent = session.teamNo || 'Field Officer';
  document.getElementById('profile-mobile').textContent = session.mobile;
  document.getElementById('profile-activity-id').textContent = activity.id;
  document.getElementById('profile-activity-meta').textContent = `${activity.stateName} · ${activity.aoName}`;
  document.getElementById('profile-activity-period').textContent = formatDateRange(activity.periodFrom, activity.periodTo);

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
      message: 'You will need your Activity Number, Team No and mobile OTP to log back in.',
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
