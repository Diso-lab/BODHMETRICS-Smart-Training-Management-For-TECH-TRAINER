import { io } from 'socket.io-client';
import { showToast } from './toast.js';

const API_BASE   = import.meta.env.VITE_API_BASE  || 'http://localhost:5000/api';
const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

/* ─── helpers ──────────────────────────────────────────────────────────────── */

function getUser()   { return JSON.parse(localStorage.getItem('bodhUser') || 'null'); }
function getToken()  { const u = getUser(); return u ? u.token : null; }

function getPerformance(score) {
  if (score > 80)  return 'good';
  if (score >= 50) return 'average';
  return 'needs-improvement';
}
function perfLabel(v) {
  if (v === 'good')    return 'High Performer';
  if (v === 'average') return 'Average';
  return 'Needs Improvement';
}
function progressClass(score) { return score > 80 ? 'good' : 'avg'; }

/* ─── auth guard ────────────────────────────────────────────────────────────── */

function logout() {
  localStorage.removeItem('bodhUser');
  window.location.href = 'index.html';
}

function ensureAuth() {
  const page = document.body.dataset.page;
  const user = getUser();

  if (!page) return; // login / register pages — no guard

  if (!user) { window.location.href = 'index.html'; return; }

  // Role-based redirect
  if (user.role === 'Trainee' && ['dashboard','employees','reports'].includes(page)) {
    window.location.href = 'trainee.html'; return;
  }
  if (user.role === 'Trainer' && page === 'trainee') {
    window.location.href = 'dashboard.html'; return;
  }
}

/* ─── socket ────────────────────────────────────────────────────────────────── */

let socket = null;
function getSocket() {
  if (socket) return socket;
  const token = getToken();
  if (!token) return null;
  socket = io(SOCKET_URL);
  return socket;
}

/* ─── API wrapper ────────────────────────────────────────────────────────────── */

async function request(path, opts = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res  = await fetch(`${API_BASE}${path}`, { headers, ...opts });
  const data = await res.json();

  if (res.status === 401 && !path.includes('/login')) { logout(); return; }
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

/* ─── sidebar ────────────────────────────────────────────────────────────────── */

function renderSidebar(page) {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  const user = getUser();
  const isTrainer = user && user.role === 'Trainer';

  const trainerLinks = `
    <a class="nav-link ${page==='dashboard'?'active':''}" href="dashboard.html">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
      Dashboard
    </a>
    <a class="nav-link ${page==='employees'?'active':''}" href="employee.html">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
      Trainees
    </a>
    <a class="nav-link ${page==='reports'?'active':''}" href="reports.html">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>
      Reports
    </a>`;

  const traineeLinks = `
    <a class="nav-link ${page==='trainee'?'active':''}" href="trainee.html">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      My Progress
    </a>`;

  sidebar.innerHTML = `
    <div class="sidebar-logo">
      <img src="logo.jpg" alt="BodhMetrics" style="width:42px;border-radius:10px;" />
      <div class="brand" style="margin-top:8px;">BODHMETRICS</div>
      <div class="sidebar-role-badge">${isTrainer ? 'Trainer' : 'Trainee'}</div>
    </div>
    <nav class="nav-links">
      ${isTrainer ? trainerLinks : traineeLinks}
    </nav>
    <div class="sidebar-footer">
      <h4>${user ? user.username : ''}</h4>
      <div style="font-size:13px;color:var(--muted);">${user ? user.role : ''}</div>
      <a href="#" class="signout" id="logoutBtn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        Sign Out
      </a>
    </div>`;

  document.getElementById('logoutBtn')?.addEventListener('click', e => { e.preventDefault(); logout(); });
  document.getElementById('logoutTop')?.addEventListener('click', e => { e.preventDefault(); logout(); });
}

/* ─── table markup ───────────────────────────────────────────────────────────── */

function tableMarkup(trainees, withActions = false) {
  if (!trainees.length) return '<p class="muted-text" style="padding:24px 0;">No trainees found.</p>';
  return `
    <div class="table-responsive">
    <table>
      <thead>
        <tr>
          <th>NAME</th>
          <th>ROLE</th>
          <th>SCORE</th>
          <th>PERFORMANCE</th>
          <th>JOINED</th>
          ${withActions ? '<th>ACTIONS</th>' : ''}
        </tr>
      </thead>
      <tbody>
        ${trainees.map(t => `
          <tr>
            <td class="name-cell">${t.username}</td>
            <td>${t.performanceRole}</td>
            <td class="score-cell">${t.score}</td>
            <td>
              <div style="display:flex;align-items:center;gap:12px;">
                <div class="progress ${progressClass(t.score)}">
                  <span style="width:${t.score}%"></span>
                </div>
                <span class="badge ${getPerformance(t.score) === 'good' ? 'good' : getPerformance(t.score) === 'average' ? 'avg' : 'low'}">
                  ${perfLabel(getPerformance(t.score))}
                </span>
              </div>
            </td>
            <td>${new Date(t.joiningDate).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}</td>
            ${withActions ? `
              <td>
                <div class="action-btns">
                  <button class="action-btn score-btn" onclick="openScorePanel('${t._id}','${t.username}')">Assign Score</button>
                  <button class="action-btn delete-btn" onclick="deleteTrainee('${t._id}')">Remove</button>
                </div>
              </td>` : ''}
          </tr>`).join('')}
      </tbody>
    </table>
    </div>`;
}

/* ═══════════════════ TRAINER DASHBOARD ═══════════════════════════════════════ */

async function loadDashboard(search = '') {
  try {
    const [data, report] = await Promise.all([
      request(`/trainees?search=${encodeURIComponent(search)}`),
      request('/reports/summary')
    ]);

    document.getElementById('statsGrid').innerHTML = `
      <div class="stat-card">
        <h3>TOTAL TRAINEES</h3>
        <div class="stat-value">${report.totalTrainees}</div>
        <div class="icon-box gold">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
      </div>
      <div class="stat-card">
        <h3>AVERAGE SCORE</h3>
        <div class="stat-value">${report.averageScore}<span style="font-size:22px;color:var(--muted)">/100</span></div>
        <div class="icon-box blue">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        </div>
      </div>
      <div class="stat-card">
        <h3>HIGH PERFORMERS</h3>
        <div class="stat-value">${report.highPerformers}</div>
        <div class="icon-box gold">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        </div>
      </div>`;

    document.getElementById('dashboardTable').innerHTML = tableMarkup(data.trainees, true);
  } catch(err) {
    showToast('Error', err.message, 'error');
  }
}

async function loadTrainerQueries() {
  try {
    const queries = await request('/queries');
    const el = document.getElementById('trainerQueryList');
    if (!el) return;
    if (!queries.length) { el.innerHTML = '<p class="muted-text">No queries yet.</p>'; return; }
    el.innerHTML = queries.map(q => `
      <div class="query-item">
        <div class="query-header">
          <span class="query-from">👤 ${q.sender?.username || 'Unknown'}</span>
          <span class="query-time">${new Date(q.createdAt).toLocaleString()}</span>
        </div>
        <div class="query-text">${q.text}</div>
      </div>`).join('');
  } catch(err) { /* silent */ }
}

window.openScorePanel = function(id, name) {
  document.getElementById('scorePanel').style.display = 'block';
  document.getElementById('scoreTargetId').value = id;
  document.getElementById('scoreTargetName').textContent = `Assigning score to: ${name}`;
  document.getElementById('scoreInput').value = '';
  document.getElementById('scoreInput').focus();
};

window.deleteTrainee = async function(id) {
  if (!confirm('Remove this trainee?')) return;
  try {
    await request(`/trainees/${id}`, { method: 'DELETE' });
    showToast('Removed', 'Trainee has been removed.', 'success');
  } catch(e) {
    showToast('Error', e.message, 'error');
  }
};

function initDashboard() {
  if (document.body.dataset.page !== 'dashboard') return;
  renderSidebar('dashboard');

  // Invite code
  const user = getUser();
  if (user) {
    document.getElementById('inviteId').textContent = user._id || user.id || '—';
  }
  document.getElementById('copyInviteId')?.addEventListener('click', () => {
    const id = document.getElementById('inviteId').textContent;
    navigator.clipboard.writeText(id).then(() => showToast('Copied!', 'Trainer ID copied to clipboard.', 'success'));
  });

  loadDashboard();
  loadTrainerQueries();

  document.getElementById('dashboardSearch').addEventListener('input', e => {
    loadDashboard(e.target.value);
  });

  document.getElementById('scoreForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const id    = document.getElementById('scoreTargetId').value;
    const score = document.getElementById('scoreInput').value;
    try {
      await request(`/trainees/${id}/score`, { method: 'POST', body: JSON.stringify({ score: Number(score) }) });
      showToast('Score Assigned!', `Score of ${score} has been saved.`, 'success');
      document.getElementById('scorePanel').style.display = 'none';
      loadDashboard(document.getElementById('dashboardSearch').value);
    } catch(err) {
      showToast('Error', err.message, 'error');
    }
  });

  document.getElementById('cancelScore')?.addEventListener('click', () => {
    document.getElementById('scorePanel').style.display = 'none';
  });

  // Real time
  const sock = getSocket();
  if (sock) {
    sock.on('trainees_updated', () => {
      loadDashboard(document.getElementById('dashboardSearch').value);
      showToast('Live Update', 'Trainee data has been updated.', 'info');
    });
    sock.on('new_query', () => {
      loadTrainerQueries();
      showToast('New Query!', 'A trainee submitted a new query.', 'info');
    });
  }
}

/* ═══════════════════ TRAINEE PORTAL ═══════════════════════════════════════════ */

async function loadMyProgress() {
  const user = getUser();
  if (!user) return;
  try {
    // Fetch self info from the trainee list via trainer — we use the trainee's own data from localStorage & separate endpoint
    const me = await request('/trainees/me');
    renderTraineeHero(me);
  } catch (err) {
    // Fallback: show score from local profile endpoint or cached data
  }
}

function renderTraineeHero(trainee) {
  const score = trainee ? (trainee.score || 0) : 0;
  const perf  = getPerformance(score);

  const circumference = 2 * Math.PI * 52; // 326.7
  const offset = circumference - (score / 100) * circumference;
  const ringFill = document.getElementById('ringFill');
  if (ringFill) {
    ringFill.style.strokeDashoffset = offset;
    ringFill.style.stroke = perf === 'good' ? '#49df76' : perf === 'average' ? '#ff9736' : '#ff6f7f';
  }

  const heroScore = document.getElementById('heroScore');
  if (heroScore) heroScore.textContent = score;

  const user = getUser();
  const welcome = document.getElementById('traineeWelcome');
  if (welcome) welcome.textContent = `Hello, ${user?.username || 'Trainee'}!`;

  const badge = document.getElementById('perfBadge');
  if (badge) {
    badge.textContent = perfLabel(perf);
    badge.className = `badge-lg ${perf === 'good' ? 'good' : perf === 'average' ? 'avg' : 'low'}`;
  }

  const myId = document.getElementById('myTraineeId');
  if (myId) myId.textContent = user?._id || user?.id || '—';
}

async function loadMyQueries() {
  try {
    const queries = await request('/queries');
    const el = document.getElementById('myQueryList');
    if (!el) return;
    if (!queries.length) { el.innerHTML = '<p class="muted-text">No queries sent yet.</p>'; return; }
    el.innerHTML = queries.map(q => `
      <div class="query-item">
        <div class="query-header">
          <span class="query-from">📩 Sent to Trainer</span>
          <span class="query-time">${new Date(q.createdAt).toLocaleString()}</span>
        </div>
        <div class="query-text">${q.text}</div>
      </div>`).join('');
  } catch(err) { /* silent */ }
}

function initTrainee() {
  if (document.body.dataset.page !== 'trainee') return;
  renderSidebar('trainee');

  // Show score
  const user = getUser();
  renderTraineeHero(user ? { score: user.score || 0 } : null);
  document.getElementById('myTraineeId').textContent = user?._id || user?.id || '—';
  loadMyQueries();

  document.getElementById('queryForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const text = document.getElementById('queryText').value.trim();
    if (!text) return;
    try {
      await request('/queries', { method: 'POST', body: JSON.stringify({ text }) });
      document.getElementById('queryText').value = '';
      showToast('Sent!', 'Query sent to your trainer.', 'success');
      loadMyQueries();
    } catch(err) {
      showToast('Error', err.message, 'error');
    }
  });

  // Real-time score update
  const sock = getSocket();
  if (sock) {
    sock.on('score_updated', async ({ traineeId, score }) => {
      const me = getUser();
      if (me && (me._id === traineeId || me.id === traineeId)) {
        // Update local cache
        const updated = { ...me, score };
        localStorage.setItem('bodhUser', JSON.stringify(updated));
        renderTraineeHero({ score });
        showToast('🎉 Score Updated!', `Your trainer assigned you a score of ${score}.`, 'success');
      }
    });
  }
}

/* ═══════════════════ EMPLOYEES PAGE ══════════════════════════════════════════ */

async function loadEmployees(search = '', filter = 'all') {
  try {
    const data = await request(`/trainees?search=${encodeURIComponent(search)}&performance=${encodeURIComponent(filter)}`);
    document.getElementById('employeeTable').innerHTML = tableMarkup(data.trainees, true);
    document.getElementById('employeeCount').textContent = `Showing ${data.trainees.length} of ${data.total} trainees`;
  } catch(err) {
    showToast('Error', err.message, 'error');
  }
}

function initEmployees() {
  if (document.body.dataset.page !== 'employees') return;
  renderSidebar('employees');
  loadEmployees();

  document.getElementById('employeeSearch').addEventListener('input', e => {
    const active = document.querySelector('.filter-chip.active')?.dataset.filter || 'all';
    loadEmployees(e.target.value, active);
  });

  document.querySelectorAll('.filter-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      loadEmployees(document.getElementById('employeeSearch').value, btn.dataset.filter);
    });
  });

  const sock = getSocket();
  if (sock) {
    sock.on('trainees_updated', () => {
      const active = document.querySelector('.filter-chip.active')?.dataset.filter || 'all';
      loadEmployees(document.getElementById('employeeSearch').value, active);
    });
  }
}

/* ═══════════════════ REPORTS PAGE ════════════════════════════════════════════ */

async function loadReports() {
  try {
    const data = await request('/reports/summary');

    document.getElementById('distributionCard').innerHTML = `
      <div class="card-title">Performance Distribution</div>
      ${[
        { label:'High Performers (>80)', count: data.highPerformers, color: '#35d06b,#63e789' },
        { label:'Average (50–80)',        count: data.averagePerformers, color: '#ff8428,#ffab56' },
        { label:'Needs Improvement (<50)',count: data.lowPerformers,    color: '#ff5d72,#ff8a9a' }
      ].map(b => `
        <div class="report-bar">
          <div class="meta">
            <span>${b.label}</span>
            <strong>${b.count} (${data.totalTrainees ? Math.round(b.count/data.totalTrainees*100) : 0}%)</strong>
          </div>
          <div class="line"><span style="width:${data.totalTrainees ? b.count/data.totalTrainees*100 : 0}%;background:linear-gradient(90deg,${b.color})"></span></div>
        </div>`).join('')}`;

    document.getElementById('scoreStatsCard').innerHTML = `
      <div class="card-title">Score Statistics</div>
      <div class="stats-mini">
        ${[
          { label:'AVERAGE',  val: data.averageScore },
          { label:'TOTAL',    val: data.totalTrainees },
          { label:'HIGHEST',  val: data.highestScore },
          { label:'LOWEST',   val: data.lowestScore }
        ].map(s => `
          <div class="mini-card">
            <h4>${s.label}</h4>
            <div class="big">${s.val}</div>
          </div>`).join('')}
      </div>`;

    document.getElementById('topPerformersCard').innerHTML = `
      <div class="card-title">Top Performers</div>
      ${data.topPerformers.map((t, i) => `
        <div class="performer">
          <div class="rank-wrap">
            <div class="rank ${['one','two','three','four'][i]}">${i+1}</div>
            <div>
              <div style="font-size:17px;font-weight:700">${t.username}</div>
              <small>${t.performanceRole}</small>
            </div>
          </div>
          <div class="score-pill ${t.score>80?'good':'avg'}">${t.score}</div>
        </div>`).join('')}`;

    document.getElementById('roleScoresCard').innerHTML = `
      <div class="card-title">Score by Role</div>
      ${data.roleScores.map(r => `
        <div class="role-row" style="margin:22px 0;">
          <div class="meta">
            <span>${r.role}</span>
            <strong>Avg: ${r.average} (${r.count})</strong>
          </div>
          <div class="line">
            <span style="width:${r.average}%;background:${r.average>80?'linear-gradient(90deg,#35d06b,#63e789)':'linear-gradient(90deg,#ff8428,#ffab56)'}"></span>
          </div>
        </div>`).join('')}`;
  } catch(err) {
    showToast('Error', err.message, 'error');
  }
}

function initReports() {
  if (document.body.dataset.page !== 'reports') return;
  renderSidebar('reports');
  loadReports();
}

/* ═══════════════════ LOGIN ════════════════════════════════════════════════════ */

function initLogin() {
  const form = document.getElementById('loginForm');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const errorEl  = document.getElementById('loginError');

    try {
      const data = await request('/login', { method: 'POST', body: JSON.stringify({ username, password }) });
      localStorage.setItem('bodhUser', JSON.stringify(data.user));
      // Route by role
      window.location.href = data.user.role === 'Trainee' ? 'trainee.html' : 'dashboard.html';
    } catch(err) {
      errorEl.textContent = err.message;
    }
  });
}

/* ═══════════════════ REGISTER ═════════════════════════════════════════════════ */

function initRegister() {
  const form = document.getElementById('registerForm');
  if (!form) return;

  const roleSelect      = document.getElementById('reg-role');
  const trainerIdGroup  = document.getElementById('trainer-id-group');

  roleSelect?.addEventListener('change', () => {
    trainerIdGroup.style.display = roleSelect.value === 'Trainee' ? 'block' : 'none';
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const username    = document.getElementById('reg-username').value.trim();
    const password    = document.getElementById('reg-password').value.trim();
    const role        = roleSelect?.value || 'Trainer';
    const trainerId   = document.getElementById('reg-trainerid')?.value.trim();
    const errorEl     = document.getElementById('registerError');
    const successEl   = document.getElementById('registerSuccess');

    try {
      errorEl.textContent   = '';
      successEl.textContent = '';
      const payload = { username, password, role };
      if (role === 'Trainee') payload.trainerId = trainerId;

      const data = await request('/register', { method: 'POST', body: JSON.stringify(payload) });
      successEl.textContent = '✅ Registration successful! Redirecting…';
      localStorage.setItem('bodhUser', JSON.stringify(data.user));
      setTimeout(() => {
        window.location.href = data.user.role === 'Trainee' ? 'trainee.html' : 'dashboard.html';
      }, 1500);
    } catch(err) {
      errorEl.textContent = err.message;
    }
  });
}

/* ─── boot ─────────────────────────────────────────────────────────────────── */

ensureAuth();
initLogin();
initRegister();
initDashboard();
initEmployees();
initReports();
initTrainee();