/* Smart Gate frontend: vanilla JS, httpOnly cookie auth, API-only operational data. */
const API_BASE = window.SMART_GATE_API_URL || '';
const API_PREFIX = '/api/v1';
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const state = { admin: null, currentPage: 'dashboard', timer: null, userPage: 1, logPage: 1, userQuery: '', logQuery: '', dashboard: null, logs: null };
const PAGE_TITLES = { dashboard: 'Dashboard', users: 'Pengguna & Kartu', logs: 'Riwayat Akses', settings: 'Pengaturan' };

class ApiError extends Error {
  constructor(status, body) {
    super(body?.detail || body?.message || `Permintaan gagal (${status})`);
    this.status = status;
    this.body = body;
  }
}
async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${API_PREFIX}${path}`, {
      method: options.method || 'GET',
      credentials: 'include',
      headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) },
      ...(options.body ? { body: JSON.stringify(options.body) } : {})
    });
  } catch {
    throw new Error('Tidak dapat terhubung ke backend. Pastikan server aktif di localhost:3000.');
  }
  if (response.status === 204) return null;
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, body);
  return body;
}
function explainError(error) {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Sesi berakhir. Silakan masuk kembali.';
    if (error.status === 403) return 'Akun Anda tidak memiliki izin untuk tindakan ini.';
    if (error.status === 404) return 'Fitur belum tersedia di backend.';
    if (error.status === 409) return error.message || 'Data tersebut sudah digunakan.';
    if (error.status === 422) return error.message || 'Periksa kembali data yang dimasukkan.';
    if (error.status >= 500) return 'Terjadi gangguan di backend. Coba lagi nanti.';
  }
  return error?.message || 'Terjadi kesalahan. Coba lagi.';
}
function toast(message, type = '') {
  const el = $('#toast'); if (!el) return;
  el.textContent = message; el.className = `toast show ${type}`;
  clearTimeout(toast.timer); toast.timer = setTimeout(() => { el.className = 'toast'; }, 3600);
}
function esc(value = '') {
  return String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
function initials(value = 'A') { return value.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'A'; }
function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? esc(value) : new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}
function showLogin() {
  clearInterval(state.timer); state.timer = null;
  $('#appView').hidden = true; $('#loginView').hidden = false;
  $('#loginError').textContent = '';
}
function showApp(admin) {
  state.admin = admin;
  $('#loginView').hidden = true; $('#appView').hidden = false;
  const name = admin?.username || 'Admin';
  $('#sideName').textContent = name; $('#sideRole').textContent = admin?.role === 'admin' ? 'Administrator' : 'Operator';
  $('#sideAvatar').textContent = initials(name); $('#topAvatar').textContent = initials(name);
  route();
}
async function bootstrap() {
  try {
    const response = await api('/auth/me');
    showApp(response.data);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return showLogin();
    showLogin(); toast(explainError(error), 'error');
  }
}
async function handleLogin(event) {
  event.preventDefault();
  const form = event.currentTarget; const submit = $('button[type="submit"]', form);
  const errorSlot = $('#loginError'); errorSlot.textContent = '';
  submit.disabled = true; submit.querySelector('span').textContent = 'Memeriksa akun...';
  try {
    const payload = Object.fromEntries(new FormData(form));
    const response = await api('/auth/login', { method: 'POST', body: payload });
    form.reset(); showApp(response.data); toast('Berhasil masuk ke Smart Gate.', 'success');
  } catch (error) {
    errorSlot.textContent = error instanceof ApiError && error.status === 401 ? 'Username atau password tidak sesuai.' : explainError(error);
  } finally {
    submit.disabled = false; submit.querySelector('span').textContent = 'Masuk ke Dashboard';
  }
}
async function doLogout() {
  try { await api('/auth/logout', { method: 'POST' }); }
  catch (error) {
    if (!(error instanceof ApiError && error.status === 401)) return toast(explainError(error), 'error');
  }
  state.admin = null; history.replaceState(null, '', location.pathname); showLogin(); toast('Anda telah keluar.', 'success');
}
function route() {
  if (!state.admin) return;
  const page = location.hash.replace(/^#\/?/, '').split('/')[0] || 'dashboard';
  state.currentPage = PAGE_TITLES[page] ? page : 'dashboard';
  $$('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.page === state.currentPage));
  $('#crumbTitle').textContent = PAGE_TITLES[state.currentPage];
  $('#sidebar').classList.remove('open');
  if (state.currentPage === 'dashboard') renderDashboard();
  if (state.currentPage === 'users') renderUsers();
  if (state.currentPage === 'logs') renderLogs();
  if (state.currentPage === 'settings') renderSettings();
}
function heading(title, subtitle, action = '') {
  return `<div class="page-heading"><div><h1>${title}</h1><p>${subtitle}</p></div><div class="heading-actions">${action}</div></div>`;
}
function apiUnavailable(title, endpointList) {
  return `<section class="notice-panel"><h3>${title} belum tersedia di backend</h3><p>Frontend tidak membuat data palsu atau memanggil URL yang belum diimplementasikan. Endpoint yang diperlukan:</p>${endpointList.map(ep => `<code class="code-label">${ep}</code>`).join('')}<p>Setelah route backend tersedia, halaman ini akan menampilkan data aktual dari MySQL.</p></section>`;
}
function renderDashboard() {
  clearInterval(state.timer);
  $('#pageContent').innerHTML = `${heading('Dashboard', 'Pantau aktivitas dan kondisi akses gerbang secara ringkas.', '<button class="button button-light button-sm" id="refreshDashboard">↻ &nbsp; Segarkan</button>')}
    <div class="stat-grid"><article class="stat-card"><div class="stat-head">Total Pengguna <span class="stat-icon">♙</span></div><div class="stat-value" id="statUsers">—</div><div class="stat-foot">Data tersedia setelah API pengguna aktif</div></article><article class="stat-card"><div class="stat-head">Akses Hari Ini <span class="stat-icon green">↗</span></div><div class="stat-value" id="statToday">—</div><div class="stat-foot">Menunggu endpoint statistik</div></article><article class="stat-card"><div class="stat-head">Akses Diizinkan <span class="stat-icon green">✓</span></div><div class="stat-value" id="statGranted">—</div><div class="stat-foot">Data log belum tersedia</div></article><article class="stat-card"><div class="stat-head">Akses Ditolak <span class="stat-icon red">⊘</span></div><div class="stat-value" id="statDenied">—</div><div class="stat-foot">Data log belum tersedia</div></article></div>
    <div class="dashboard-grid"><section class="panel"><div class="panel-header"><div><h3>Aktivitas Akses</h3><div class="panel-subtitle">Ringkasan aktivitas gerbang</div></div><select class="select" id="chartPeriod" aria-label="Periode grafik"><option value="7">7 hari</option><option value="30">30 hari</option></select></div><div class="chart-wrap"><canvas id="activityChart" aria-label="Grafik aktivitas akses"></canvas><div class="empty-chart" id="chartEmpty">Grafik menunggu data dari API statistik.<br>Belum ada endpoint statistik pada backend.</div></div></section>
    <section class="panel gate-panel"><div class="panel-header"><div><h3>Status Gerbang</h3><div class="panel-subtitle">Status aktual dari sistem</div></div><span class="pill neutral" id="gateBadge">BELUM TERHUBUNG</span></div><div class="gate-status-row"><div class="gate-status-dot" id="gateDot">⌑</div><div><strong id="gateLabel">Belum diketahui</strong><span id="gateUpdated">API status gerbang belum tersedia</span></div></div><div class="gate-visual" id="gateVisual"><div class="pole"></div><div class="beam"></div><div class="lamp"></div><div class="road"></div></div><button class="button button-light button-sm" id="gateAction" disabled>Kontrol gerbang belum tersedia</button><div class="gate-note">Status visual hanya diperbarui saat API tersedia</div></section></div>
    <section class="panel table-panel"><div class="panel-header"><div><h3>Aktivitas Terbaru</h3><div class="panel-subtitle">Log akses gerbang terbaru</div></div><a href="#logs" class="button button-light button-sm">Semua riwayat →</a></div><div class="table-scroll"><table class="data-table"><thead><tr><th>Pengguna</th><th>UID Kartu</th><th>Arah</th><th>Waktu</th><th>Hasil</th></tr></thead><tbody id="recentLogs"><tr><td colspan="5" class="table-empty">Belum ada endpoint riwayat akses.</td></tr></tbody></table></div></section>`;
  $('#refreshDashboard').addEventListener('click', () => loadDashboard(true));
  $('#chartPeriod').addEventListener('change', () => loadDashboard(true));
  loadDashboard(); state.timer = setInterval(() => { if (state.currentPage === 'dashboard') loadDashboard(); }, 15000);
}
async function loadDashboard(showMessage = false) {
  const requests = [api('/dashboard/summary'), api('/access-logs?perPage=5&page=1'), api('/gate/status')];
  const results = await Promise.allSettled(requests);
  const summary = results[0].status === 'fulfilled' ? results[0].value.data : null;
  const logsResponse = results[1].status === 'fulfilled' ? results[1].value : null;
  const gate = results[2].status === 'fulfilled' ? results[2].value.data : null;
  if (summary) {
    $('#statUsers').textContent = summary.totalUsers ?? '—';
    $('#statToday').textContent = summary.accessToday ?? '—';
    $('#statGranted').textContent = summary.grantedToday ?? '—';
    $('#statDenied').textContent = summary.deniedToday ?? '—';
  }
  if (logsResponse) {
    const rows = logsResponse.data || [];
    $('#recentLogs').innerHTML = rows.length ? rows.map(logRow).join('') : '<tr><td colspan="5" class="table-empty">Belum ada aktivitas akses.</td></tr>';
  }
  if (gate) {
    const isOpen = gate.status === 'open';
    $('#gateBadge').className = `pill ${isOpen ? 'success' : 'pending'}`; $('#gateBadge').textContent = isOpen ? 'TERBUKA' : 'TERTUTUP';
    $('#gateLabel').textContent = isOpen ? 'Gerbang terbuka' : 'Gerbang tertutup'; $('#gateUpdated').textContent = `Diperbarui ${formatDate(gate.changedAt)}`;
    $('#gateDot').classList.toggle('open', isOpen); $('#gateVisual').classList.toggle('open', isOpen);
    const button = $('#gateAction'); button.disabled = false; button.textContent = isOpen ? 'Tutup gerbang' : 'Buka gerbang'; button.dataset.status = isOpen ? 'closed' : 'open'; button.addEventListener('click', changeGate, { once: true });
  }
  const firstError = results.find(result => result.status === 'rejected');
  if (!summary) $('#chartEmpty').innerHTML = firstError ? `${esc(explainError(firstError.reason))}<br>Statistik akan aktif setelah API dashboard tersedia.` : 'Belum ada data statistik.';
  if (showMessage && firstError) toast(explainError(firstError.reason), 'error');
}
async function changeGate(event) {
  const button = event.currentTarget; button.disabled = true;
  try { await api('/gate/status', { method: 'PATCH', body: { status: button.dataset.status } }); toast('Status gerbang diperbarui.', 'success'); await loadDashboard(); }
  catch (error) { toast(explainError(error), 'error'); button.disabled = true; }
}
function logRow(log) {
  const granted = log.result === 'granted'; const user = log.userNameSnapshot || log.userName || 'Tidak dikenal';
  return `<tr><td><div class="table-user"><span class="mini-avatar">${esc(initials(user))}</span>${esc(user)}</div></td><td>${esc(log.uidSnapshot || log.uid || '—')}</td><td>${log.direction === 'entry' ? 'Masuk' : log.direction === 'exit' ? 'Keluar' : '—'}</td><td>${formatDate(log.occurredAt)}</td><td><span class="pill ${granted ? 'success' : 'denied'}">${granted ? 'Diizinkan' : 'Ditolak'}</span></td></tr>`;
}
function renderUsers() {
  $('#pageContent').innerHTML = `${heading('Pengguna & Kartu', 'Kelola data pengguna dan UID kartu RFID yang terdaftar.', '<button class="button button-primary button-sm" id="addUserBtn">＋ &nbsp; Tambah pengguna</button>')}<div class="section-toolbar"><label class="search-box"><span>⌕</span><input id="userSearch" placeholder="Cari nama, email, atau UID kartu..." value="${esc(state.userQuery)}"></label><select class="filter-select" id="userStatus"><option value="">Semua status</option><option value="active">Aktif</option><option value="inactive">Nonaktif</option></select><button class="button button-light button-sm" id="userRefresh">↻ Segarkan</button></div><section class="panel table-panel"><div class="table-scroll"><table class="data-table"><thead><tr><th>Pengguna</th><th>Email</th><th>No. Telepon</th><th>Kartu RFID</th><th>Status</th><th>Aksi</th></tr></thead><tbody id="usersTable"><tr><td colspan="6" class="table-empty">Memuat data…</td></tr></tbody></table></div><div class="pagination" id="userPagination"></div></section><p class="muted" style="font-size:10px;margin-top:12px">Manajemen pengguna/kartu akan aktif ketika endpoint API tersedia di backend.</p>`;
  $('#addUserBtn').addEventListener('click', () => toast('Belum dapat menambah pengguna: endpoint POST /users belum tersedia.', 'error'));
  $('#userRefresh').addEventListener('click', () => loadUsers());
  $('#userSearch').addEventListener('input', debounce(event => { state.userQuery = event.target.value; state.userPage = 1; loadUsers(); }, 350));
  $('#userStatus').addEventListener('change', () => loadUsers()); loadUsers();
}
async function loadUsers() {
  const body = $('#usersTable'); if (!body) return;
  body.innerHTML = '<tr><td colspan="6" class="table-empty">Memuat data…</td></tr>';
  const params = new URLSearchParams({ page: state.userPage, perPage: 10 });
  if (state.userQuery) params.set('q', state.userQuery);
  const status = $('#userStatus')?.value; if (status) params.set('status', status);
  try {
    const result = await api(`/users?${params}`); const rows = result.data || [];
    body.innerHTML = rows.length ? rows.map(user => `<tr><td><div class="table-user"><span class="mini-avatar">${esc(initials(user.fullName))}</span>${esc(user.fullName)}</div></td><td>${esc(user.email || '—')}</td><td>${esc(user.phone || '—')}</td><td>${user.uid ? `<code>${esc(user.uid)}</code>` : '—'}</td><td><span class="pill ${user.status === 'active' ? 'success' : 'neutral'}">${user.status === 'active' ? 'Aktif' : 'Nonaktif'}</span></td><td><button class="icon-button" disabled title="Belum tersedia">···</button></td></tr>`).join('') : '<tr><td colspan="6" class="table-empty">Belum ada data pengguna.</td></tr>';
    renderPagination($('#userPagination'), result.pagination, next => { state.userPage = next; loadUsers(); });
  } catch (error) { body.innerHTML = `<tr><td colspan="6" class="table-empty">${esc(explainError(error))}<br><small>Backend yang tersedia belum menyediakan GET /users.</small></td></tr>`; $('#userPagination').innerHTML = ''; }
}
function renderLogs() {
  $('#pageContent').innerHTML = `${heading('Riwayat Akses', 'Telusuri catatan akses gerbang dan hasil pemindaian kartu RFID.', '<button class="button button-light button-sm" id="logsRefresh">↻ &nbsp; Segarkan</button>')}<div class="section-toolbar"><label class="search-box"><span>⌕</span><input id="logSearch" placeholder="Cari nama atau UID kartu..." value="${esc(state.logQuery)}"></label><select class="filter-select" id="logDirection"><option value="">Semua arah</option><option value="entry">Masuk</option><option value="exit">Keluar</option></select><select class="filter-select" id="logResult"><option value="">Semua hasil</option><option value="granted">Diizinkan</option><option value="denied">Ditolak</option></select></div><section class="panel table-panel"><div class="table-scroll"><table class="data-table"><thead><tr><th>Pengguna</th><th>UID Kartu</th><th>Arah</th><th>Waktu</th><th>Hasil</th><th>Keterangan</th></tr></thead><tbody id="logsTable"><tr><td colspan="6" class="table-empty">Memuat riwayat…</td></tr></tbody></table></div><div class="pagination" id="logPagination"></div></section>`;
  $('#logsRefresh').addEventListener('click', loadLogs); $('#logSearch').addEventListener('input', debounce(event => { state.logQuery = event.target.value; state.logPage = 1; loadLogs(); }, 350));
  $('#logDirection').addEventListener('change', () => { state.logPage = 1; loadLogs(); }); $('#logResult').addEventListener('change', () => { state.logPage = 1; loadLogs(); }); loadLogs();
}
async function loadLogs() {
  const body = $('#logsTable'); if (!body) return;
  body.innerHTML = '<tr><td colspan="6" class="table-empty">Memuat riwayat…</td></tr>';
  const params = new URLSearchParams({ page: state.logPage, perPage: 20 }); const direction = $('#logDirection')?.value; const resultFilter = $('#logResult')?.value;
  if (direction) params.set('direction', direction); if (resultFilter) params.set('result', resultFilter);
  if (state.logQuery) params.set('q', state.logQuery);
  try {
    const result = await api(`/access-logs?${params}`); const rows = result.data || [];
    body.innerHTML = rows.length ? rows.map(log => `${logRow(log).replace('</tr>', `<td>${esc(log.reason || '—')}</td></tr>`)}`).join('') : '<tr><td colspan="6" class="table-empty">Tidak ada catatan akses.</td></tr>';
    renderPagination($('#logPagination'), result.pagination, next => { state.logPage = next; loadLogs(); });
  } catch (error) { body.innerHTML = `<tr><td colspan="6" class="table-empty">${esc(explainError(error))}<br><small>Backend yang tersedia belum menyediakan GET /access-logs.</small></td></tr>`; $('#logPagination').innerHTML = ''; }
}
function renderPagination(container, pageData, onPage) {
  if (!container) return;
  const page = pageData?.page || 1, total = pageData?.total || 0, totalPages = pageData?.totalPages || 1, perPage = pageData?.perPage || 10;
  container.innerHTML = `<span>Menampilkan ${total ? (page - 1) * perPage + 1 : 0}–${Math.min(page * perPage, total)} dari ${total}</span><div><button data-step="-1" ${page <= 1 ? 'disabled' : ''}>←</button><span>${page} / ${totalPages}</span><button data-step="1" ${page >= totalPages ? 'disabled' : ''}>→</button></div>`;
  $$('button[data-step]', container).forEach(button => button.addEventListener('click', () => onPage(page + Number(button.dataset.step))));
}
function renderSettings() {
  const admin = state.admin || {};
  $('#pageContent').innerHTML = `${heading('Pengaturan', 'Informasi akun dan konektivitas layanan Smart Gate.')}<div class="settings-grid"><section class="settings-card"><h3>Akun administrator</h3><div class="settings-row"><strong>Username</strong><span>${esc(admin.username || '—')}</span></div><div class="settings-row"><strong>Peran</strong><span>${esc(admin.role === 'admin' ? 'Administrator' : 'Operator')}</span></div><div class="settings-row"><strong>Manajemen akun</strong><span>Endpoint admin belum tersedia</span></div><button class="button button-light button-sm logout-button" style="margin-top:15px;color:#b34652">↪ &nbsp; Logout</button></section><section class="settings-card"><h3>Status integrasi</h3><div class="settings-row"><strong>REST API</strong><span id="apiHealth">Memeriksa…</span></div><div class="settings-row"><strong>Database</strong><span id="dbHealth">Memeriksa…</span></div><div class="settings-row"><strong>Base URL</strong><span>${esc(API_BASE)}</span></div><div class="settings-row"><strong>Otentikasi</strong><span>Cookie sesi httpOnly</span></div></section></div><div class="notice-panel" style="margin-top:17px"><h3>Fitur yang menunggu endpoint backend</h3><p>Pengaturan profil admin, manajemen admin lain, serta kontrol gerbang belum dapat diubah dari halaman ini. UI tidak mengirim request ke endpoint yang belum tersedia.</p><code class="code-label">GET /api/v1/admins</code><code class="code-label">PATCH /api/v1/admins/:id</code></div>`;
  $$('.logout-button').forEach(button => button.addEventListener('click', doLogout)); checkHealth();
}
async function checkHealth() {
  try {
    const response = await fetch(`${API_BASE}/health`, { credentials: 'include' }); if (!response.ok) throw new Error();
    $('#apiHealth').innerHTML = '<span class="pill success">Terhubung</span>';
  } catch { $('#apiHealth').innerHTML = '<span class="pill denied">Tidak terhubung</span>'; }
  try {
    const response = await fetch(`${API_BASE}/ready`, { credentials: 'include' }); const payload = await response.json();
    $('#dbHealth').innerHTML = payload.checks?.database?.status === 'ok' ? '<span class="pill success">Terhubung</span>' : '<span class="pill denied">Tidak tersedia</span>';
  } catch { $('#dbHealth').innerHTML = '<span class="pill denied">Tidak terhubung</span>'; }
}
function debounce(fn, delay) { let timer; return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); }; }

$('#loginForm').addEventListener('submit', handleLogin);
$('#togglePassword').addEventListener('click', event => {
  const input = $('#password'); const showing = input.type === 'text'; input.type = showing ? 'password' : 'text'; event.currentTarget.setAttribute('aria-label', showing ? 'Tampilkan password' : 'Sembunyikan password');
});
window.addEventListener('hashchange', route);
$('#menuToggle').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
$$('.logout-button').forEach(button => button.addEventListener('click', doLogout));
document.addEventListener('click', event => { const sidebar = $('#sidebar'); if (sidebar.classList.contains('open') && !sidebar.contains(event.target) && !$('#menuToggle').contains(event.target)) sidebar.classList.remove('open'); });
bootstrap();
