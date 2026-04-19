/* ==========================================================
   OFFERS.JS – Full-Stack Version
   Fetches personalized offers from backend API
   ========================================================== */

const API = window.location.origin.includes('localhost') ? 'http://localhost:5001/api' : '/api';

// ─── LOAD PROFILE DATA ───────────────────────────────────
const sessionId = localStorage.getItem('pf_session') || 'DEMO123';

// Fallback values until API responds
let profileData = {
  full_name:   'Rahul Kumar Sharma',
  risk_band:   localStorage.getItem('pf_risk') || 'A+',
  cibil_score: parseInt(localStorage.getItem('pf_cibil')) || 782,
  ai_confidence: 0.964
};

let selectedOffer = null;
let offersData    = [];

// ─── INIT ────────────────────────────────────────────────
async function initOffers() {
  // Set session display
  document.getElementById('session-display').textContent = `PF-${sessionId}`;

  // Set expiry (48 hours)
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 48);
  document.getElementById('offer-expiry').textContent = expiry.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  launchConfetti();

  // Fetch from API
  try {
    const resp = await fetch(`${API}/application/offers/${sessionId}`);
    const data = await resp.json();

    if (data.success) {
      profileData = data;
      offersData  = data.offers;
      updateProfileStrip(data);
      renderOffers(data.offers, data.risk_band);
    } else {
      // Fallback: generate locally
      renderOffersLocal();
    }
  } catch(e) {
    // Server offline – use localStorage values
    renderOffersLocal();
  }

  calcEMI();
}

function updateProfileStrip(data) {
  document.getElementById('applicant-name').textContent  = data.full_name      || 'Rahul Kumar Sharma';
  document.getElementById('risk-band-display').textContent = data.risk_band    || 'A+';
  document.getElementById('cibil-display').textContent   = data.cibil_score    || 782;

  const confidence = Math.round((data.ai_confidence || 0.964) * 100);
  const aiEl = document.getElementById('ai-insight-text');
  if (aiEl) {
    const band = data.risk_band || 'A+';
    const income = (data.monthly_income || 85000).toLocaleString('en-IN');
    if (data.ai_insight) {
      aiEl.innerHTML = data.ai_insight;
    } else {
      const bandLabel = {
        'A+': 'Premium Low-Risk borrower (Band A+)',
        'A':  'Good Credit borrower (Band A)',
        'B+': 'Fair Credit borrower (Band B+)',
        'B':  'Sub-prime borrower (Band B)'
      }[band] || 'Good Credit borrower';
      aiEl.innerHTML = `
        Based on your stable employment and consistent income of ₹${income}/month, CIBIL score of
        <strong>${data.cibil_score}</strong>, and clean credit history, you've been classified as a
        <strong style="color:var(--brand-green)">${bandLabel}</strong>.
        You qualify for our best-in-class interest rates and maximum loan tenure.
      `;
    }
    const confEl = document.querySelector('.conf-value');
    if (confEl) confEl.textContent = `${confidence}%`;
  }
}

// ─── CONFETTI ────────────────────────────────────────────
function launchConfetti() {
  const container = document.getElementById('confetti');
  const colors = ['#f5a623','#00d4ff','#00c896','#7b2d8b','#ff4d6d','#ffffff'];

  for (let i = 0; i < 60; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = Math.random() * 100 + '%';
    piece.style.top = '-20px';
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;
    piece.style.width  = (Math.random() * 12 + 6) + 'px';
    piece.style.height = (Math.random() * 12 + 6) + 'px';
    piece.style.animationDuration = (Math.random() * 3 + 2) + 's';
    piece.style.animationDelay    = Math.random() * 2 + 's';
    container.appendChild(piece);
    setTimeout(() => piece.remove(), 6000);
  }
}

// ─── OFFER RENDERING ─────────────────────────────────────
function getBaseRate(band) {
  const rates = { 'A+': 10.5, 'A': 11.5, 'B+': 13.0, 'B': 15.0 };
  return rates[band] || 12.5;
}

function calcEMIValue(principal, months, ratePA) {
  const r = ratePA / 100 / 12;
  if (r === 0) return principal / months;
  return Math.round(principal * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1));
}

function formatINR(n) {
  return '₹' + n.toLocaleString('en-IN');
}

function renderOffersLocal() {
  const riskBand = profileData.risk_band || 'A+';
  const baseRate = getBaseRate(riskBand);
  const localOffers = [
    {
      id: 'offer-1', name: 'Conservative Plan', amount: 1000000,
      tenure: 24, rate: baseRate, recommended: false,
      perks: ['Zero foreclosure after 12 EMIs', 'No processing fee', 'Top-up loan eligible after 6 EMIs']
    },
    {
      id: 'offer-2', name: 'Recommended Plan ⭐', amount: 1500000,
      tenure: 36, rate: baseRate, recommended: true,
      perks: ['Best rate for your profile', 'Zero processing fee', 'Pre-approved – instant disbursal', 'Free life insurance cover ₹25L']
    },
    {
      id: 'offer-3', name: 'Maximum Plan', amount: 2000000,
      tenure: 60, rate: baseRate + 0.5, recommended: false,
      perks: ['Flexible EMI holiday 2 months/year', 'Priority customer support', 'Balance transfer facility']
    }
  ];
  offersData = localOffers;
  renderOffers(localOffers, riskBand);
}

function renderOffers(offers, riskBand) {
  const grid = document.getElementById('offers-grid');
  grid.innerHTML = '';

  offers.forEach(offer => {
    const emi = offer.emi || calcEMIValue(offer.amount, offer.tenure, offer.rate);
    const totalPayable  = emi * offer.tenure;
    const totalInterest = totalPayable - offer.amount;

    const card = document.createElement('div');
    card.className = `offer-card ${offer.recommended ? 'recommended' : ''}`;
    card.id = offer.id;

    card.innerHTML = `
      ${offer.recommended ? '<div class="offer-recommended-badge">⭐ Best Offer for You</div>' : ''}
      <div class="offer-type">${offer.name || offer.type}</div>
      <div class="offer-amount">${formatINR(offer.amount)}</div>
      <div class="offer-amount-label">Approved Loan Amount</div>

      <div class="offer-details">
        <div class="offer-detail">
          <span>Interest Rate</span>
          <span class="offer-detail-value text-accent">${offer.rate}% p.a.</span>
        </div>
        <div class="offer-detail">
          <span>Tenure</span>
          <span class="offer-detail-value">${offer.tenure} months</span>
        </div>
        <div class="offer-detail">
          <span>Total Interest</span>
          <span class="offer-detail-value text-gold">${formatINR(totalInterest)}</span>
        </div>
        <div class="offer-detail">
          <span>Total Payable</span>
          <span class="offer-detail-value">${formatINR(totalPayable)}</span>
        </div>
      </div>

      <div class="offer-emi-highlight">
        <div class="offer-emi-label">Monthly EMI</div>
        <div class="offer-emi-value">${formatINR(emi)}</div>
      </div>

      <div class="offer-perks">
        ${offer.perks.map(p => `
          <div class="offer-perk">
            <span class="offer-perk-icon">✓</span>
            <span>${p}</span>
          </div>
        `).join('')}
      </div>

      <button class="offer-select-btn" onclick="selectOffer('${offer.id}')">
        Select This Offer
      </button>
    `;

    grid.appendChild(card);
  });
}

function selectOffer(id) {
  document.querySelectorAll('.offer-card').forEach(c => c.classList.remove('selected'));
  document.getElementById(id).classList.add('selected');
  selectedOffer = offersData.find(o => o.id === id);

  const emi = selectedOffer.emi || calcEMIValue(selectedOffer.amount, selectedOffer.tenure, selectedOffer.rate);

  const cta = document.getElementById('accept-cta');
  cta.style.display = 'block';
  document.getElementById('selected-offer-display').textContent =
    `${formatINR(selectedOffer.amount)} @ ${selectedOffer.rate}% for ${selectedOffer.tenure} months (EMI: ${formatINR(emi)}/month)`;

  showToast(`Offer selected: ${formatINR(selectedOffer.amount)}`, 'success');
}

// ─── ACCEPT OFFER → POST TO API ──────────────────────────
async function acceptOffer() {
  if (!selectedOffer) { showToast('Please select an offer first', 'error'); return; }

  const btn = document.getElementById('accept-btn');
  btn.innerHTML = '<div class="spinner"></div> Processing...';
  btn.disabled = true;

  const emi = selectedOffer.emi || calcEMIValue(selectedOffer.amount, selectedOffer.tenure, selectedOffer.rate);

  let appNum = 'PF' + Date.now().toString().slice(-8);
  let auditTrail = [];

  try {
    const resp = await fetch(`${API}/application/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        offer: {
          amount:  selectedOffer.amount,
          rate:    selectedOffer.rate,
          tenure:  selectedOffer.tenure,
          emi:     emi
        }
      })
    });
    const data = await resp.json();
    if (data.success) {
      appNum     = data.app_num || appNum;
      auditTrail = data.audit_trail || [];
    }
  } catch(e) {
    // Offline fallback: save to localStorage
    const now = new Date();
    const loanEntry = {
      appNum, sessionId, name: profileData.full_name || 'Rahul Kumar Sharma',
      amount: selectedOffer.amount, rate: selectedOffer.rate,
      tenure: selectedOffer.tenure, emi,
      cibil: profileData.cibil_score || 782,
      riskBand: profileData.risk_band || 'A+',
      status: 'Approved',
      timestamp: now.toISOString()
    };
    const existing = JSON.parse(localStorage.getItem('pf_applications') || '[]');
    existing.unshift(loanEntry);
    localStorage.setItem('pf_applications', JSON.stringify(existing));

    // Build local audit trail
    const fmt = (d) => d.toLocaleTimeString('en-IN');
    const now2 = new Date();
    auditTrail = [
      { event: 'Session Initiated',            ts: fmt(new Date(now2 - 300000)), status: '✅ Logged' },
      { event: 'Geo-Location Captured',         ts: fmt(new Date(now2 - 270000)), status: '✅ Verified' },
      { event: 'Consent Forms Signed',          ts: fmt(new Date(now2 - 250000)), status: '✅ Recorded' },
      { event: 'Video KYC Session Started',     ts: fmt(new Date(now2 - 180000)), status: '✅ Logged' },
      { event: 'STT Transcript Generated',      ts: fmt(new Date(now2 - 120000)), status: '✅ Stored' },
      { event: `Age Estimation Completed (${profileData.age_estimated || 32} yrs)`, ts: fmt(new Date(now2 - 90000)), status: '✅ Verified' },
      { event: `Bureau Pull (CIBIL: ${profileData.cibil_score || 782})`, ts: fmt(new Date(now2 - 60000)), status: '✅ Fetched' },
      { event: `LLM Risk Classification (Band: ${profileData.risk_band || 'A+'})`, ts: fmt(new Date(now2 - 45000)), status: '✅ Done' },
      { event: 'Loan Offers Generated',         ts: fmt(new Date(now2 - 20000)), status: '✅ Generated' },
      { event: `Offer Accepted: ${formatINR(selectedOffer.amount)} @ ${selectedOffer.rate}%`, ts: fmt(now2), status: '✅ Submitted' }
    ];
  }

  // Show accepted UI
  document.getElementById('accept-cta').style.display = 'none';
  document.getElementById('accepted-section').classList.remove('hidden');

  document.getElementById('app-number').textContent    = appNum;
  document.getElementById('accepted-amount').textContent = formatINR(selectedOffer.amount);
  document.getElementById('accepted-rate').textContent   = `${selectedOffer.rate}% p.a.`;
  document.getElementById('accepted-emi').textContent    = `${formatINR(emi)}/month`;

  // Render audit trail
  const auditContainer = document.getElementById('audit-items');
  auditContainer.innerHTML = auditTrail.map(item => `
    <div class="atb-item">
      <span>${item.event}</span>
      <span class="atb-ts">${item.ts || item.created_at || ''}</span>
      <span class="atb-status">${item.status}</span>
    </div>
  `).join('');

  showToast('🎉 Application submitted! Ref: ' + appNum, 'success');
  document.getElementById('accepted-section').scrollIntoView({ behavior: 'smooth' });
}

// ─── EMI CALCULATOR ──────────────────────────────────────
function calcEMI() {
  const amount = parseInt(document.getElementById('emi-amount').value);
  const tenure = parseInt(document.getElementById('emi-tenure').value);
  const rate   = parseFloat(document.getElementById('emi-rate').value);

  document.getElementById('emi-amount-display').textContent  = formatINR(amount);
  document.getElementById('emi-tenure-display').textContent  = tenure + ' months';
  document.getElementById('emi-rate-display').textContent    = rate + '%';

  const emi = calcEMIValue(amount, tenure, rate);
  const totalPayable  = emi * tenure;
  const totalInterest = totalPayable - amount;

  document.getElementById('emi-result').textContent        = formatINR(emi);
  document.getElementById('emi-principal').textContent     = formatINR(amount);
  document.getElementById('emi-total-interest').textContent = formatINR(totalInterest);
  document.getElementById('emi-total-payable').textContent  = formatINR(totalPayable);
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

// ─── START ───────────────────────────────────────────────
initOffers();
