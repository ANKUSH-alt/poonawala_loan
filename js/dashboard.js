/* ==========================================================
   DASHBOARD.JS – Full-Stack Version
   Fetches all monitoring and application data from Flask API
   ========================================================== */

const API = '/api';
let loadedApps = [];

// ─── CLOCK ────────────────────────────────────────────────
function updateClock() {
  const now = new Date();
  const el = document.getElementById('topbar-time');
  if (el) {
    el.textContent = now.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
    });
  }
}
setInterval(updateClock, 1000);
updateClock();

// ─── TAB NAVIGATION ──────────────────────────────────────
function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const tab = document.getElementById(`tab-${tabId}`);
  if (tab) tab.classList.add('active');

  const navItem = document.querySelector(`[data-tab="${tabId}"]`);
  if (navItem) navItem.classList.add('active');

  // Close mobile sidebar on link click
  document.querySelector('.sidebar')?.classList.remove('mobile-active');
  
  // Refresh specific tab data if needed
  if (tabId === 'audit') loadAuditLogs();
  if (tabId === 'sessions') loadSessions();
  if (tabId === 'policy') loadPolicy();
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    const tab = item.getAttribute('data-tab');
    switchTab(tab);
  });
});

// ─── DASHBOARD DATA LOADING ──────────────────────────────
async function initDashboard() {
  await loadOverview();
  await loadApplications();
  
  // Initial draw
  setTimeout(() => {
    drawBarChart();
    drawDonutChart();
    updateRiskBars();
  }, 500);
}

async function loadOverview() {
  try {
    const resp = await fetch(`${API}/dashboard/overview`);
    const data = await resp.json();
    if (data.success) {
      document.getElementById('kpi-total').textContent = data.total_applications;
      document.getElementById('kpi-approved').textContent = data.approved;
      document.getElementById('kpi-disbursed').textContent = formatINR(data.total_disbursed);
      document.getElementById('kpi-fraud').textContent = data.fraud_flags;
      
      // Store chart data globally for drawBarChart to use
      window.dashboardChartData = data.volume_chart;
      window.riskDistData = data.risk_distribution;
    }
  } catch (e) {
    showToast('Failed to load dashboard overview', 'error');
  }
}

async function loadApplications() {
  try {
    const resp = await fetch(`${API}/dashboard/applications`);
    const data = await resp.json();
    if (data.success) {
      loadedApps = data.applications;
      document.getElementById('app-count-badge').textContent = data.count;

      // Render recent table (latest 5)
      renderTable('recent-tbody', loadedApps.slice(0, 5), true);

      // Render full apps table
      renderTable('apps-tbody', loadedApps, false);
    }
  } catch (e) {
    showToast('Failed to load applications', 'error');
  }
}

function renderTable(tbodyId, apps, compact) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;

  if (!apps || apps.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${compact ? 8 : 11}" class="no-data">No applications found. <a href="onboarding.html" style="color:var(--brand-accent)">Submit one →</a></td></tr>`;
    return;
  }

  tbody.innerHTML = apps.map(a => {
    // Map backend keys to frontend expected keys
    const appNum = a.app_num || a.appNum;
    const name = a.full_name || a.name;
    const amount = a.offer_amount || a.amount;
    const rate = a.offer_rate || a.rate;
    const cibil = a.cibil_score || a.cibil;
    const riskBand = a.risk_band || a.riskBand;
    const status = a.status;
    const tenure = a.offer_tenure || a.tenure;
    const emi = a.offer_emi || a.emi;
    const timestamp = a.created_at || a.timestamp;

    const ts = new Date(timestamp).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true
    });
    const statusClass = status === 'Approved' ? 'status-approved'
      : status === 'Rejected' ? 'status-rejected' : 'status-pending';

    if (compact) {
      return `
        <tr>
          <td><span style="font-family:monospace; font-size:0.75rem;">${appNum}</span></td>
          <td>${name}</td>
          <td><strong>${formatINR(amount || 0)}</strong></td>
          <td class="text-accent">${rate || '-'}%</td>
          <td>${cibil || '-'}</td>
          <td><span class="badge ${riskBand === 'A+' ? 'badge-success' : riskBand === 'A' ? 'badge-accent' : 'badge-gold'}">${riskBand || 'N/A'}</span></td>
          <td><span class="status-badge ${statusClass}">${status}</span></td>
          <td class="text-muted" style="font-size:0.75rem;">${ts}</td>
        </tr>
      `;
    } else {
      return `
        <tr>
          <td><span style="font-family:monospace; font-size:0.75rem;">${appNum}</span></td>
          <td>${name}</td>
          <td><strong>${formatINR(amount || 0)}</strong></td>
          <td class="text-accent">${rate || '-'}%</td>
          <td>${tenure || '-'}m</td>
          <td>${emi ? formatINR(emi) + '/mo' : '-'}</td>
          <td>${cibil || '-'}</td>
          <td><span class="badge ${riskBand === 'A+' ? 'badge-success' : riskBand === 'A' ? 'badge-accent' : 'badge-gold'}">${riskBand || 'N/A'}</span></td>
          <td><span class="status-badge ${statusClass}">${status}</span></td>
          <td class="text-muted" style="font-size:0.75rem;">${ts}</td>
          <td>
            <button class="btn btn-ghost btn-sm" style="padding:0.2rem 0.5rem;" onclick="viewApp('${appNum}')">View</button>
          </td>
        </tr>
      `;
    }
  }).join('');
}

async function loadAuditLogs() {
  try {
    const type = document.getElementById('audit-filter-type')?.value || '';
    const from = document.getElementById('audit-date-from')?.value || '';
    const to   = document.getElementById('audit-date-to')?.value || '';
    
    const resp = await fetch(`${API}/dashboard/audit?type=${type}&from=${from}&to=${to}`);
    const data = await resp.json();
    if (data.success) {
      const tbody = document.getElementById('audit-tbody');
      if (!tbody) return;
      
      if (data.logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="no-data">No logs found</td></tr>';
        return;
      }

      tbody.innerHTML = data.logs.map(r => `
        <tr>
          <td style="font-family:monospace; font-size:0.72rem;">${new Date(r.created_at).toLocaleString('en-IN')}</td>
          <td style="font-family:monospace; font-size:0.72rem;">${r.session_id || r.app_num}</td>
          <td><span class="badge badge-accent" style="font-size:0.65rem;">${r.event_type}</span></td>
          <td>${r.event_detail}</td>
          <td>${r.actor}</td>
          <td style="font-family:monospace; font-size:0.72rem;">${r.ip_address}</td>
          <td class="text-green" style="font-size:0.75rem;">${r.status}</td>
          <td style="font-family:monospace; font-size:0.68rem; color:var(--text-muted);">${r.event_hash}</td>
        </tr>
      `).join('');
    }
  } catch (e) {
    showToast('Failed to load audit logs', 'error');
  }
}

async function loadSessions() {
  try {
    const resp = await fetch(`${API}/dashboard/sessions`);
    const data = await resp.json();
    if (data.success) {
      const grid = document.getElementById('sessions-grid');
      if (!grid) return;

      grid.innerHTML = data.sessions.map(s => {
        const ts = new Date(s.created_at).toLocaleDateString('en-IN', {
          day: '2-digit', month: 'short', year: 'numeric'
        });
        const dur = s.duration_seconds || 180;
        const m = String(Math.floor(dur / 60)).padStart(2, '0');
        const sec = String(dur % 60).padStart(2, '0');
        const statusClass = s.status === 'Approved' ? 'badge-success' : s.status === 'Rejected' ? 'badge-danger' : 'badge-gold';

        return `
          <div class="session-card">
            <div class="session-thumb">
              🎥
              <span class="session-duration">${m}:${sec}</span>
            </div>
            <div class="session-info">
              <div class="session-id">ID: ${s.session_id}</div>
              <div class="session-name">${s.applicant_name || s.full_name || 'Anonymous'}</div>
              <div class="session-meta">
                <span class="text-muted" style="font-size:0.72rem;">${ts}</span>
                <span class="badge ${statusClass}" style="font-size:0.68rem;">${s.status || 'Pending'}</span>
              </div>
              <div style="display:flex; gap:0.5rem; margin-top:0.75rem;">
                <button class="btn btn-ghost btn-sm" style="flex:1; font-size:0.72rem;" onclick="showToast('Loading playback...', 'info')">▶ Playback</button>
                <button class="btn btn-ghost btn-sm" style="font-size:0.72rem;" onclick="showToast('Transcript: ' + (s.transcript || 'No transcript available'), 'info')">📋 Transcript</button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
  } catch (e) {
    showToast('Failed to load sessions', 'error');
  }
}

async function loadPolicy() {
  try {
    const resp = await fetch(`${API}/policy`);
    const data = await resp.json();
    if (data.success) {
      // Map keys to inputs
      const config = data.config;
      if (!config) return;
      
      const mapping = {
        'min_age': 'p-min-age', 'max_age': 'p-max-age', 'min_cibil': 'p-min-cibil',
        'min_income': 'p-min-income', 'max_dti': 'p-max-dti', 'min_loan': 'p-min-loan',
        'max_loan': 'p-max-loan', 'min_tenure': 'p-min-tenure', 'max_tenure': 'p-max-tenure',
        'rate_aplus': 'p-rate-aplus', 'rate_a': 'p-rate-a', 'rate_bplus': 'p-rate-bplus',
        'rate_b': 'p-rate-b', 'geo_tolerance_km': 'p-geo-tol', 'age_variance': 'p-age-var',
        'stt_min_score': 'p-stt-min', 'liveness_min': 'p-live-min'
      };
      
      for (const [key, id] of Object.entries(mapping)) {
        const el = document.getElementById(id);
        if (el && config[key] !== undefined) el.value = config[key];
      }
    }
  } catch (e) {
    showToast('Failed to load policy rules', 'error');
  }
}

async function savePolicies() {
  const mapping = {
    'min_age': 'p-min-age', 'max_age': 'p-max-age', 'min_cibil': 'p-min-cibil',
    'min_income': 'p-min-income', 'max_dti': 'p-max-dti', 'min_loan': 'p-min-loan',
    'max_loan': 'p-max-loan', 'min_tenure': 'p-min-tenure', 'max_tenure': 'p-max-tenure',
    'rate_aplus': 'p-rate-aplus', 'rate_a': 'p-rate-a', 'rate_bplus': 'p-rate-bplus',
    'rate_b': 'p-rate-b', 'geo_tolerance_km': 'p-geo-tol', 'age_variance': 'p-age-var',
    'stt_min_score': 'p-stt-min', 'liveness_min': 'p-live-min'
  };

  const config = {};
  for (const [key, id] of Object.entries(mapping)) {
    const el = document.getElementById(id);
    if (el) config[key] = el.value;
  }

  try {
    const resp = await fetch(`${API}/policy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    const data = await resp.json();
    if (data.success) {
      showToast('Policy rules saved successfully', 'success');
    }
  } catch (e) {
    showToast('Failed to save policy rules', 'error');
  }
}

function filterApplications() {
  const search = document.getElementById('search-apps').value.toLowerCase();
  const statusFilter = document.getElementById('filter-status').value;

  const filtered = loadedApps.filter(a => {
    const name = (a.full_name || a.name || '').toLowerCase();
    const appNum = (a.app_num || a.appNum || '').toLowerCase();
    const matchSearch = !search || name.includes(search) || appNum.includes(search);
    const matchStatus = !statusFilter || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  renderTable('apps-tbody', filtered, false);
}

function viewApp(appNum) {
  const app = loadedApps.find(a => (a.app_num || a.appNum) === appNum);
  if (!app) return;
  
  switchTab('risk');
  
  const output = document.getElementById('ai-json-output');
  if (output) {
    const cleanApp = { ...app };
    delete cleanApp._id;
    output.innerHTML = `<pre class="llm-json">${JSON.stringify(cleanApp, null, 2)}</pre>`;
  }
  showToast(`Viewing analysis for ${appNum}`, 'info');
}

// ─── CHARTS ──────────────────────────────────────────────
function drawBarChart() {
  const canvas = document.getElementById('volumeCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = canvas.offsetWidth || 400;
  canvas.height = 200;

  const data = window.dashboardChartData || [];
  if (data.length === 0) {
    // If no data, show empty state or placeholder
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.textAlign = 'center';
    ctx.fillText('No activity data available', W/2, H/2);
    return;
  }

  const days = data.map(d => d.day);
  const applications = data.map(d => d.total);
  const approved = data.map(d => d.approved);

  const W = canvas.width;
  const H = canvas.height;
  const maxVal = Math.max(...applications, 10);
  const barW = (W - 60) / (days.length * 2 + days.length - 1);
  const gap = barW / 2;
  const chartH = H - 40;
  const offsetX = 30;

  ctx.clearRect(0, 0, W, H);

  for (let i = 0; i <= 5; i++) {
    const y = H - 30 - (i / 5) * chartH;
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.moveTo(offsetX, y);
    ctx.lineTo(W, y);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '9px Inter';
    ctx.fillText(Math.round(maxVal * i / 5), 0, y + 4);
  }

  days.forEach((day, i) => {
    const groupX = offsetX + i * (barW * 2 + gap + 4);

    const appH = (applications[i] / maxVal) * chartH;
    const grad1 = ctx.createLinearGradient(0, H - 30 - appH, 0, H - 30);
    grad1.addColorStop(0, 'rgba(0,212,255,0.9)');
    grad1.addColorStop(1, 'rgba(0,212,255,0.3)');
    ctx.fillStyle = grad1;
    if (ctx.roundRect) ctx.roundRect(groupX, H - 30 - appH, barW, appH, 3);
    else ctx.fillRect(groupX, H - 30 - appH, barW, appH);
    ctx.fill();

    const apprH = (approved[i] / maxVal) * chartH;
    const grad2 = ctx.createLinearGradient(0, H - 30 - apprH, 0, H - 30);
    grad2.addColorStop(0, 'rgba(0,200,150,0.9)');
    grad2.addColorStop(1, 'rgba(0,200,150,0.3)');
    ctx.fillStyle = grad2;
    ctx.fillRect(groupX + barW + 2, H - 30 - apprH, barW, apprH);

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '10px Inter';
    ctx.fillText(day, groupX + barW / 2 - 8, H - 10);
  });
}

function drawDonutChart() {
  const canvas = document.getElementById('riskCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = 150;
  canvas.height = 150;

  const rawData = window.riskDistData || {};
  const total = Object.values(rawData).reduce((a,b) => a+b, 0) || 0;
  if (total === 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.stroke();
  }
  const data = [rawData['A+'] || 0, rawData['A'] || 0, rawData['B+'] || 0, rawData['B'] || 0];
  const colors = ['#00c896', '#00d4ff', '#f5a623', '#ff4d6d'];
  let startAngle = -Math.PI / 2;
  const cx = 75, cy = 75, r = 55, innerR = 35;

  data.forEach((val, i) => {
    const slice = ((val || 0) / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle, startAngle + slice);
    ctx.closePath();
    ctx.fillStyle = colors[i];
    ctx.fill();
    startAngle += slice;
  });

  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.fillStyle = '#020b2e';
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = 'bold 14px Outfit';
  ctx.textAlign = 'center';
  ctx.fillText(total, cx, cy - 2);
  ctx.font = '9px Outfit';
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillText('Applications', cx, cy + 12);
}

// ─── UTILS ───────────────────────────────────────────────
function formatINR(n) {
  if (n >= 10000000) return '₹' + (n / 10000000).toFixed(1) + 'Cr';
  if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L';
  return '₹' + (n || 0).toLocaleString('en-IN');
}

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

function exportData() {
  window.open(`${API}/export/applications`);
  showToast('Report export started', 'success');
}

function exportAuditLog() {
  showToast('Audit log exported as CSV', 'success');
}

function refreshData() {
  initDashboard();
  showToast('Data refreshed', 'success');
}

// ─── INIT ─────────────────────────────────────────────────
initDashboard();

// Mobile sidebar toggle
document.getElementById('mobile-sidebar-toggle')?.addEventListener('click', () => {
  document.querySelector('.sidebar').classList.toggle('mobile-active');
});

function updateRiskBars() {
  const rawData = window.riskDistData || {};
  const total = Object.values(rawData).reduce((a,b) => a+b, 0) || 1;
  
  const bands = { 'aplus': 'A+', 'a': 'A', 'bplus': 'B+', 'b': 'B' };
  for (const [id, key] of Object.entries(bands)) {
    const count = rawData[key] || 0;
    const pct = Math.round((count / total) * 100);
    const fillEl = document.getElementById(`band-fill-${id}`);
    const countEl = document.getElementById(`band-count-${id}`);
    if (fillEl) {
      fillEl.style.width = pct + '%';
      fillEl.textContent = pct + '%';
    }
    if (countEl) countEl.textContent = count;
  }
}

window.addEventListener('resize', () => {
  drawBarChart();
  drawDonutChart();
});
