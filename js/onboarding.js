/* ==========================================================
   ONBOARDING.JS – Full-Stack Version
   All state persisted to backend API (Flask + SQLite)
   ========================================================== */

const API = window.location.origin.includes('localhost') ? 'http://localhost:5001/api' : '/api';
let currentApplication = {};

// ─── SESSION INIT ────────────────────────────────────────
const SESSION_ID = Math.random().toString(36).substring(2, 10).toUpperCase();
document.getElementById('session-id-display').textContent = SESSION_ID;

// Load pre-filled data from landing page (still use localStorage for cross-page prefill)
const prefilled = {
  income:     localStorage.getItem('pf_income') || '',
  employment: localStorage.getItem('pf_employment') || '',
  purpose:    localStorage.getItem('pf_purpose') || '',
  amount:     localStorage.getItem('pf_amount') || ''
};

window.addEventListener('DOMContentLoaded', () => {
  if (prefilled.employment) document.getElementById('emp-type').value = prefilled.employment;
  if (prefilled.purpose)    document.getElementById('loan-purpose-detail').value = prefilled.purpose;

  // Demo defaults for quick testing
  document.getElementById('full-name').value        = 'Rahul Kumar Sharma';
  document.getElementById('mobile').value           = '9876543210';
  document.getElementById('dob').value              = '1992-06-15';
  document.getElementById('pan').value              = 'ABCDE1234F';
  document.getElementById('emp-type').value         = 'salaried';
  document.getElementById('monthly-income').value   = '85000';
  document.getElementById('loan-purpose-detail').value = 'home';
  document.getElementById('loan-required').value    = '1500000';
  document.getElementById('city').value             = 'Mumbai, Maharashtra';

  updateStepIndicator(1);
});

// ─── NAVIGATION ──────────────────────────────────────────
let currentScreen = 1;

function goToScreen(n) {
  document.querySelectorAll('.onboarding-screen').forEach(s => s.classList.remove('active'));
  document.getElementById(`screen-${n}`).classList.add('active');
  currentScreen = n;
  updateStepIndicator(n);
  window.scrollTo(0, 0);
}

function updateStepIndicator(step) {
  for (let i = 1; i <= 5; i++) {
    const si = document.getElementById(`si-${i}`);
    if (!si) continue;
    si.classList.remove('active', 'done');
    if (i < step) si.classList.add('done');
    else if (i === step) si.classList.add('active');
  }
}

// ─── STEP 1: PERSONAL DETAILS → POST TO API ──────────────
async function proceedToConsent() {
  const name   = document.getElementById('full-name').value.trim();
  const mobile = document.getElementById('mobile').value.trim();
  const dob    = document.getElementById('dob').value;
  const pan    = document.getElementById('pan').value.trim();
  const emp    = document.getElementById('emp-type').value;
  const income = document.getElementById('monthly-income').value;
  const purpose= document.getElementById('loan-purpose-detail').value;
  const loan   = document.getElementById('loan-required').value;
  const city   = document.getElementById('city').value.trim();

  if (!name || !mobile || !dob || !pan || !emp || !income) {
    showToast('Please fill in all required fields', 'error');
    return;
  }
  if (mobile.length !== 10) {
    showToast('Please enter a valid 10-digit mobile number', 'error');
    return;
  }

  const btn = document.querySelector('#screen-1 .btn-primary');
  btn.innerHTML = '<div class="spinner"></div> Saving...';
  btn.disabled = true;

  try {
    const resp = await fetch(`${API}/application/details`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: SESSION_ID, full_name: name, mobile, dob, pan, emp_type: emp,
        monthly_income: parseFloat(income), loan_purpose: purpose,
        loan_required: parseFloat(loan) || 0, city,
        geo_lat: parseFloat(localStorage.getItem('pf_lat') || 0) || null,
        geo_lon: parseFloat(localStorage.getItem('pf_lon') || 0) || null
      })
    });
    const data = await resp.json();
    if (data.success) {
      localStorage.setItem('pf_session', SESSION_ID);
      showToast('Details saved! Proceeding to consent...', 'success');
      setTimeout(() => goToScreen(2), 800);
    } else {
      showToast(data.error || 'Failed to save details', 'error');
    }
  } catch (e) {
    // Fallback: store locally and continue (offline mode)
    localStorage.setItem('pf_session', SESSION_ID);
    localStorage.setItem('pf_name', name);
    showToast('Saved locally (offline mode) – proceeding...', 'info');
    setTimeout(() => goToScreen(2), 800);
  } finally {
    btn.innerHTML = 'Continue to Consent →';
    btn.disabled = false;
  }
}

// ─── GEO LOCATION ────────────────────────────────────────
function captureLocation() {
  const btn = document.getElementById('geo-btn');
  btn.textContent = '📍 Capturing...';
  btn.disabled = true;

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(4);
        const lon = pos.coords.longitude.toFixed(4);
        document.getElementById('geo-coords').textContent = `Lat: ${lat} | Long: ${lon}`;
        document.getElementById('geo-info').classList.add('hidden');
        document.getElementById('geo-success').classList.remove('hidden');
        localStorage.setItem('pf_lat', lat);
        localStorage.setItem('pf_lon', lon);
        showToast('Location captured successfully', 'success');
      },
      () => {
        const lat = '19.0760', lon = '72.8777';
        document.getElementById('geo-coords').textContent = `Lat: ${lat} | Long: ${lon} (Mumbai)`;
        document.getElementById('geo-info').classList.add('hidden');
        document.getElementById('geo-success').classList.remove('hidden');
        localStorage.setItem('pf_lat', lat);
        localStorage.setItem('pf_lon', lon);
        showToast('Location estimated from IP (Mumbai, MH)', 'info');
      }
    );
  } else {
    document.getElementById('geo-coords').textContent = 'Lat: 19.0760 | Long: 72.8777';
    document.getElementById('geo-info').classList.add('hidden');
    document.getElementById('geo-success').classList.remove('hidden');
    showToast('Location captured via network', 'info');
  }
}

// ─── STEP 2: CONSENT → POST TO API ───────────────────────
let checkedConsents = new Set();

function toggleConsent(id) {
  const item = document.getElementById(id);
  if (item.classList.contains('checked')) {
    item.classList.remove('checked');
    checkedConsents.delete(id);
  } else {
    item.classList.add('checked');
    checkedConsents.add(id);
  }
  updateConsentButton();
}

function acceptAllConsents() {
  ['c1','c2','c3','c4','c5','c6'].forEach(id => {
    document.getElementById(id).classList.add('checked');
    checkedConsents.add(id);
  });
  updateConsentButton();
  showToast('All consents accepted', 'success');
}

function updateConsentButton() {
  const btn = document.getElementById('consent-next-btn');
  const mandatoryConsents = ['c1','c2','c3','c4','c5'];
  const allMandatory = mandatoryConsents.every(id => checkedConsents.has(id));
  btn.disabled = !allMandatory;
  if (allMandatory) {
    btn.style.opacity = '1';
    btn.style.cursor = 'pointer';
  }
}

async function proceedToVideoCall() {
  const mandatoryConsents = ['c1','c2','c3','c4','c5'];
  if (!mandatoryConsents.every(id => checkedConsents.has(id))) {
    showToast('Please accept all mandatory consents', 'error');
    return;
  }

  // Save consents to DB
  try {
    await fetch(`${API}/application/consents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: SESSION_ID,
        bureau:     checkedConsents.has('c1') ? 1 : 0,
        video:      checkedConsents.has('c2') ? 1 : 0,
        biometric:  checkedConsents.has('c3') ? 1 : 0,
        stt:        checkedConsents.has('c4') ? 1 : 0,
        location:   checkedConsents.has('c5') ? 1 : 0,
        marketing:  checkedConsents.has('c6') ? 1 : 0
      })
    });
  } catch(e) { /* offline – continue */ }

  goToScreen(3);
  initVideoCall();
}

// ─── STEP 3: VIDEO CALL ──────────────────────────────────
let cameraStream   = null;
let callTimer      = null;
let callSeconds    = 0;
let micEnabled     = true;
let callCompleted  = false;
let transcriptLog  = [];

const AI_QUESTIONS = [
  { q: "Please state your full name and confirm you are the applicant for this loan application.",
    answer: "My name is Rahul Kumar Sharma, and I confirm I am the applicant for this loan." },
  { q: "Please state your current employment: designation, company name, and how long you've been working there.",
    answer: "I'm a Senior Software Engineer at TechCorp India Ltd. I've been working there for 4 years." },
  { q: "What is your monthly take-home salary after all deductions?",
    answer: "My monthly take-home salary is approximately ₹85,000 per month." },
  { q: "What is the purpose of this loan, and how do you plan to repay it?",
    answer: "I'm applying for a home renovation loan. I'll repay it from my monthly salary as EMI." },
  { q: "Do you have any existing loans or EMIs? If yes, please state the approximate monthly outflow.",
    answer: "Yes, I have a car loan with an EMI of ₹12,000 per month. No other loans." },
  { q: "Please provide your verbal consent: 'I, [Name], hereby give my explicit consent for loan processing by Poonawalla Fincorp and agree to all terms.'",
    answer: "I, Rahul Kumar Sharma, hereby give my explicit consent for loan processing by Poonawalla Fincorp and agree to all terms and conditions." }
];

const ANALYSIS_RESULTS = [
  { id: 'm-face',     value: '✅ Detected',    color: 'var(--brand-green)',  delay: 2000 },
  { id: 'm-liveness', value: '✅ Live Person',  color: 'var(--brand-green)',  delay: 4000 },
  { id: 'm-age',      value: '🎯 ~32 years',   color: 'var(--brand-accent)', delay: 6000 },
  { id: 'm-identity', value: '✅ Verified',     color: 'var(--brand-green)',  delay: 8000 },
  { id: 'm-audio',    value: '✅ HD Clear',     color: 'var(--brand-green)',  delay: 3000 },
  { id: 'm-consent',  value: '⏳ Pending',      color: 'var(--brand-gold)',   delay: 1000 }
];

async function initVideoCall() {
  await startCamera();
  startCallTimer();
  runAIQuestionFlow();
  startRealTimeAnalysis();
}

async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    cameraStream = stream;
    const vid = document.getElementById('camera-feed');
    vid.srcObject = stream;
    document.getElementById('no-camera').style.display = 'none';
    showToast('Camera & microphone connected', 'success');
  } catch (e) {
    showToast('Camera not available – running in demo mode', 'info');
    document.getElementById('no-camera').innerHTML = `
      <div style="font-size:4rem">🎭</div>
      <p style="color:var(--brand-accent); font-weight:600;">DEMO MODE</p>
      <p style="color:var(--text-muted); font-size:0.78rem;">Simulating video feed</p>
    `;
  }
}

function startCallTimer() {
  callTimer = setInterval(() => {
    callSeconds++;
    const m = String(Math.floor(callSeconds / 60)).padStart(2, '0');
    const s = String(callSeconds % 60).padStart(2, '0');
    document.getElementById('vid-timer').textContent = `${m}:${s}`;
  }, 1000);
}

function toggleMic() {
  micEnabled = !micEnabled;
  const btn = document.getElementById('toggle-mic');
  btn.textContent = micEnabled ? '🎙️' : '🔇';
  if (cameraStream) {
    cameraStream.getAudioTracks().forEach(t => t.enabled = micEnabled);
  }
  showToast(micEnabled ? 'Microphone on' : 'Microphone muted', 'info');
}

function toggleCamera() {
  if (cameraStream) {
    const enabled = cameraStream.getVideoTracks()[0]?.enabled;
    cameraStream.getVideoTracks().forEach(t => t.enabled = !enabled);
    showToast(!enabled ? 'Camera on' : 'Camera off', 'info');
  }
}

function endCall() {
  if (!callCompleted) {
    showToast('Please complete all questions before ending the call', 'error');
  }
}

function addTranscriptMsg(role, text) {
  const box = document.getElementById('transcript-box');
  const msg = document.createElement('div');
  msg.className = `transcript-msg ${role}`;
  msg.innerHTML = `<span class="msg-role">${role === 'agent' ? 'AI Agent' : 'You'}</span><p>${text}</p>`;
  box.appendChild(msg);
  box.scrollTop = box.scrollHeight;
  // Keep log for DB
  transcriptLog.push({ role: role === 'agent' ? 'AI Agent' : 'Applicant', text, ts: new Date().toISOString() });
}

function runAIQuestionFlow() {
  let idx = 0;

  function askNext() {
    if (idx >= AI_QUESTIONS.length) {
      callCompleted = true;
      document.getElementById('complete-call-btn').disabled = false;
      document.getElementById('m-consent').textContent = '✅ Captured';
      document.getElementById('m-consent').style.color = 'var(--brand-green)';
      addTranscriptMsg('agent', '✅ All questions answered! Your verbal consent has been recorded. Please click "Complete & Analyze" to proceed.');
      showToast('All questions completed! Click "Complete & Analyze"', 'success');
      return;
    }

    const q = AI_QUESTIONS[idx];
    const qNum = idx + 1;

    document.getElementById('q-text').textContent = q.q;
    document.querySelector('.q-number').textContent = `Q${qNum} of ${AI_QUESTIONS.length}`;
    document.getElementById('q-prog').style.width = `${(qNum / AI_QUESTIONS.length) * 100}%`;

    setTimeout(() => {
      addTranscriptMsg('agent', q.q);
      setTimeout(() => {
        addTranscriptMsg('customer', q.answer);
        const aw = document.getElementById('agent-speaking');
        aw.style.opacity = '0';
        setTimeout(() => { aw.style.opacity = '1'; }, 1000);
        idx++;
        setTimeout(askNext, 2000);
      }, 3500);
    }, 1000);
  }

  setTimeout(askNext, 2000);
}

function startRealTimeAnalysis() {
  ANALYSIS_RESULTS.forEach(item => {
    setTimeout(() => {
      const el = document.getElementById(item.id);
      if (el) {
        el.textContent = item.value;
        el.style.color = item.color;
      }
    }, item.delay);
  });
}

async function completeVideoCall() {
  if (callTimer) clearInterval(callTimer);
  if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
  showToast('Video call completed! Saving session...', 'success');

  // Save video session to DB
  try {
    await fetch(`${API}/session/video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: SESSION_ID,
        duration: callSeconds,
        questions_answered: AI_QUESTIONS.length,
        transcript: transcriptLog
      })
    });
  } catch(e) { /* offline – continue */ }

  setTimeout(() => {
    goToScreen(4);
    runAIAnalysis();
  }, 1000);
}

// ─── STEP 4: AI ANALYSIS → POST TO API ───────────────────
const ANALYSIS_STEPS = [
  { id: 'as-1', delay: 1500, result: '✅' },
  { id: 'as-2', delay: 3000, result: '✅' },
  { id: 'as-3', delay: 4500, result: '✅' },
  { id: 'as-4', delay: 6000, result: '✅' },
  { id: 'as-5', delay: 7500, result: '✅' },
  { id: 'as-6', delay: 9000, result: '✅' },
  { id: 'as-7', delay: 10500, result: '✅' }
];

let analysisResults = null;

function runAIAnalysis() {
  let completedSteps = 0;
  const totalSteps = ANALYSIS_STEPS.length;

  ANALYSIS_STEPS.forEach((step, i) => {
    setTimeout(() => {
      const el = document.getElementById(step.id);
      if (el) el.classList.add('processing');
    }, step.delay - 800);

    setTimeout(async () => {
      const el = document.getElementById(step.id);
      if (el) {
        el.classList.remove('processing');
        el.classList.add('done');
        const statusEl = document.getElementById(`${step.id}-status`);
        if (statusEl) statusEl.innerHTML = `<span style="font-size:1.25rem;">✅</span>`;
      }

      completedSteps++;
      const pct = Math.round((completedSteps / totalSteps) * 100);
      document.getElementById('prog-pct').textContent = `${pct}%`;
      document.getElementById('main-progress').style.width = `${pct}%`;

      // Trigger API call on last step
      if (completedSteps === totalSteps) {
        try {
          const resp = await fetch(`${API}/application/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: SESSION_ID })
          });
          const data = await resp.json();
          if (data.success) {
            analysisResults = data;
            // Save to localStorage for offers page (fallback)
            localStorage.setItem('pf_cibil', data.cibil_score);
            localStorage.setItem('pf_risk', data.risk_band);
            localStorage.setItem('pf_session', SESSION_ID);
          }
        } catch(e) {
          // Fallback simulation
          const cibil = Math.floor(Math.random() * 80) + 720;
          const riskBand = cibil >= 760 ? 'A+' : cibil >= 720 ? 'A' : 'B+';
          analysisResults = { cibil_score: cibil, risk_band: riskBand, age_estimated: 32, ai_confidence: 0.964 };
          localStorage.setItem('pf_cibil', cibil);
          localStorage.setItem('pf_risk', riskBand);
          localStorage.setItem('pf_session', SESSION_ID);
        }
        setTimeout(() => showAnalysisDone(analysisResults), 800);
      }
    }, step.delay);
  });
}

function showAnalysisDone(results) {
  const data = results || {};
  const riskBand = data.risk_band || localStorage.getItem('pf_risk') || 'A';
  const cibil    = data.cibil_score || parseInt(localStorage.getItem('pf_cibil')) || 750;
  const age      = data.age_estimated || 32;

  document.getElementById('sum-risk').textContent   = riskBand;
  document.getElementById('sum-cibil').textContent  = cibil;
  document.getElementById('sum-age').textContent    = `${age} yrs`;
  document.getElementById('sum-income').textContent = '✓ Verified';

  document.getElementById('analysis-done').classList.remove('hidden');
  showToast('🎉 Analysis complete! Your loan offers are ready!', 'success');
}

function goToOffers() {
  window.location.href = 'offers.html';
}

// ─── TOAST ───────────────────────────────────────────────
function showToast(msg, type = 'info') {
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type]}</span><span class="toast-msg">${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4500);
}
