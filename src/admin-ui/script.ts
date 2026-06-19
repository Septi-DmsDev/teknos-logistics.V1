export const adminScript = `const TOKEN_KEY = 'teknos-logistics-admin-token'
const DEFAULT_ROUTE = '/dashboard'
const ROUTES = new Set([
  '/dashboard',
  '/merchants',
  '/stores-origins',
  '/courier-services',
  '/shipments',
  '/webhook-relays',
  '/audit-logs',
])

const state = {
  adminToken: sessionStorage.getItem(TOKEN_KEY) || '',
  currentRoute: DEFAULT_ROUTE,
  selectedMerchantId: '',
  loading: false,
  lastError: '',
  lastSuccess: '',
}

const elements = {
  form: document.getElementById('token-form'),
  tokenInput: document.getElementById('admin-token'),
  loginPanel: document.getElementById('login-panel'),
  contentPanel: document.getElementById('content-panel'),
  authStatus: document.getElementById('auth-status'),
  logoutButton: document.getElementById('logout-button'),
  notice: document.getElementById('notice'),
  pageTitle: document.getElementById('page-title'),
}

function bootstrap() {
  elements.form?.addEventListener('submit', (event) => {
    event.preventDefault()
    const token = elements.tokenInput?.value.trim() || ''
    if (!token) {
      showNotice('Admin token wajib diisi.', 'error')
      return
    }

    state.adminToken = token
    state.lastError = ''
    state.lastSuccess = 'Token tersimpan untuk sesi browser ini.'
    sessionStorage.setItem(TOKEN_KEY, token)
    if (elements.tokenInput) elements.tokenInput.value = ''
    renderAuthState()
    renderRoute()
    showNotice(state.lastSuccess, 'success')
  })

  elements.logoutButton?.addEventListener('click', () => {
    logout('Token admin dihapus dari sesi browser.')
  })

  if (!window.location.hash) {
    window.location.hash = '#' + DEFAULT_ROUTE
  }

  renderAuthState()
  parseRoute()
  renderRoute()
  window.addEventListener('hashchange', () => {
    parseRoute()
    renderRoute()
  })
}

function parseRoute() {
  const rawRoute = (window.location.hash || '#' + DEFAULT_ROUTE).slice(1) || DEFAULT_ROUTE
  const normalizedRoute = rawRoute.startsWith('/') ? rawRoute : '/' + rawRoute
  const merchantMatch = normalizedRoute.match(/^\\/merchant\\/([^/?#]+)$/)

  if (merchantMatch) {
    state.currentRoute = '/merchant/:id'
    state.selectedMerchantId = safeDecode(merchantMatch[1])
    return
  }

  state.currentRoute = ROUTES.has(normalizedRoute) ? normalizedRoute : DEFAULT_ROUTE
  if (state.currentRoute !== '/merchant/:id') {
    state.selectedMerchantId = ''
  }
}

function safeDecode(value) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function renderAuthState() {
  const authenticated = state.adminToken.length > 0
  if (elements.loginPanel) elements.loginPanel.hidden = authenticated
  if (elements.contentPanel) elements.contentPanel.hidden = !authenticated
  if (elements.logoutButton) elements.logoutButton.hidden = !authenticated
  if (elements.authStatus) {
    elements.authStatus.textContent = authenticated ? 'Token active' : 'Token required'
    elements.authStatus.className = authenticated
      ? 'status-badge status-success'
      : 'status-badge status-muted'
  }
}

function renderRoute() {
  highlightActiveRoute()

  if (!elements.contentPanel || !state.adminToken) return

  state.loading = false
  state.lastError = ''
  state.lastSuccess = state.lastSuccess || ''

  const route = routeConfig(state.currentRoute)
  if (elements.pageTitle) elements.pageTitle.textContent = route.title

  elements.contentPanel.innerHTML = renderPageShell(route)
}

function routeConfig(route) {
  if (route === '/dashboard') {
    return {
      title: 'Dashboard',
      eyebrow: 'Overview',
      description: 'Ringkasan admin logistics akan ditambahkan pada task berikutnya.',
      badge: 'Foundation',
      content: renderDashboardPlaceholder(),
    }
  }

  if (route === '/merchants') {
    return {
      title: 'Merchants',
      eyebrow: 'Merchant Config',
      description: 'Daftar dan detail merchant akan memakai endpoint admin pada task lanjutan.',
      badge: 'Placeholder',
      content: renderTable({
        columns: ['Area', 'Status', 'Next step'],
        rows: [['Merchant list', 'Planned', 'Load /admin/merchants safely']],
      }),
    }
  }

  if (route === '/merchant/:id') {
    return {
      title: 'Merchant Detail',
      eyebrow: 'Merchant Config',
      description: 'Detail merchant terpilih. ID disimpan di state browser, bukan URL query token.',
      badge: 'Selected',
      content: renderForm({
        title: 'Selected merchant',
        fields: [{ label: 'Merchant ID', value: state.selectedMerchantId || '-' }],
      }),
    }
  }

  if (route === '/stores-origins') {
    return placeholderPage('Stores & Origins', 'Konfigurasi store dan origin akan ditambahkan tanpa aksi booking resi.')
  }

  if (route === '/courier-services') {
    return placeholderPage('Courier Services', 'Mapping layanan kurir akan memakai data admin dan tidak mengekspos env.')
  }

  if (route === '/shipments') {
    return placeholderPage('Shipments', 'Monitoring shipment hanya baca data; tidak ada tombol booking atau AWB.')
  }

  if (route === '/webhook-relays') {
    return placeholderPage('Webhook Relays', 'Status relay webhook merchant akan ditampilkan secara aman.')
  }

  if (route === '/audit-logs') {
    return placeholderPage('Audit Logs', 'Log audit admin akan ditampilkan dengan metadata tersanitasi.')
  }

  return placeholderPage('Dashboard', 'Route tidak dikenali, kembali ke dashboard.')
}

function placeholderPage(title, description) {
  return {
    title,
    eyebrow: 'Sprint 9',
    description,
    badge: 'Placeholder',
    content: renderTable({
      columns: ['Page', 'Implementation', 'Safety'],
      rows: [[title, 'Coming next', 'Read-only placeholder']],
    }),
  }
}

function renderPageShell(route) {
  return '<section class="panel route-panel">'
    + '<div class="route-header">'
    + '<div><p class="eyebrow">' + escapeHtml(route.eyebrow) + '</p>'
    + '<h2>' + escapeHtml(route.title) + '</h2>'
    + '<p class="muted">' + escapeHtml(route.description) + '</p></div>'
    + renderBadge(route.badge, 'info')
    + '</div>'
    + route.content
    + '</section>'
}

function renderDashboardPlaceholder() {
  return '<div class="card-grid">'
    + metricCard('Browser state', 'Ready', 'Token, route, merchant, loading, error, and success state are initialized.')
    + metricCard('API client', 'Ready', 'Bearer injection and sanitized error handling are available for page tasks.')
    + metricCard('Safety', 'No AWB Action', 'No JNE booking, AWB creation, or env exposure is implemented in this shell.')
    + '</div>'
}

function metricCard(label, value, description) {
  return '<article class="metric-card">'
    + '<span class="metric-label">' + escapeHtml(label) + '</span>'
    + '<strong>' + escapeHtml(value) + '</strong>'
    + '<p class="muted">' + escapeHtml(description) + '</p>'
    + '</article>'
}

function highlightActiveRoute() {
  const activeRoute = state.currentRoute === '/merchant/:id' ? 'merchants' : state.currentRoute.replace(/^\\//, '')
  document.querySelectorAll('[data-route]').forEach((item) => {
    item.classList.toggle('is-active', item.getAttribute('data-route') === activeRoute)
  })
}

async function apiGet(path, query) {
  const url = new URL(path, window.location.origin)
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value))
      }
    })
  }

  return requestJson(url.pathname + url.search, { method: 'GET' })
}

async function apiJson(method, path, body) {
  return requestJson(path, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

async function requestJson(path, options) {
  state.loading = true
  state.lastError = ''

  try {
    const response = await fetch(path, {
      ...options,
      headers: {
        ...(options.headers || {}),
        authorization: 'Bearer ' + state.adminToken,
      },
    })

    if (response.status === 401) {
      logout('Sesi admin tidak valid. Token dihapus dari browser.', 'error')
      throw new Error('Unauthorized')
    }

    const payload = await readJson(response)
    if (!response.ok) {
      const message = sanitizeErrorMessage(payload)
      state.lastError = message
      showNotice(message, 'error')
      throw new Error(message)
    }

    return payload
  } finally {
    state.loading = false
  }
}

async function readJson(response) {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function sanitizeErrorMessage(payload) {
  const fallback = 'Request admin gagal. Periksa input dan coba lagi.'
  const rawMessage = typeof payload?.error === 'string'
    ? payload.error
    : typeof payload?.message === 'string'
      ? payload.message
      : fallback

  return rawMessage
    .replace(/Bearer\\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [redacted]')
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}/g, '[redacted-email]')
    .replace(/([A-Za-z]:)?[\\\\/][^\\s]+/g, '[redacted-path]')
    .slice(0, 180)
}

function logout(message, type = 'success') {
  state.adminToken = ''
  state.lastError = type === 'error' ? message : ''
  state.lastSuccess = type === 'success' ? message : ''
  sessionStorage.removeItem(TOKEN_KEY)
  renderAuthState()
  if (elements.contentPanel) elements.contentPanel.innerHTML = ''
  showNotice(message, type)
}

function renderTable({ columns, rows, emptyMessage = 'Belum ada data.' }) {
  const safeColumns = columns.map((column) => '<th scope="col">' + escapeHtml(column) + '</th>').join('')
  const safeRows = rows.length > 0
    ? rows.map((row) => '<tr>' + row.map((cell) => '<td>' + escapeHtml(cell) + '</td>').join('') + '</tr>').join('')
    : '<tr><td colspan="' + columns.length + '">' + escapeHtml(emptyMessage) + '</td></tr>'

  return '<div class="table-wrap"><table><thead><tr>' + safeColumns + '</tr></thead><tbody>' + safeRows + '</tbody></table></div>'
}

function renderForm({ title, fields }) {
  const controls = fields.map((field) => '<label><span>'
    + escapeHtml(field.label)
    + '</span><input type="text" value="'
    + escapeHtml(field.value)
    + '" readonly /></label>').join('')

  return '<div class="form-card"><h3>' + escapeHtml(title) + '</h3><div class="form-grid">' + controls + '</div></div>'
}

function renderBadge(label, tone = 'muted') {
  const safeTone = ['success', 'warning', 'danger', 'info', 'muted'].includes(tone) ? tone : 'muted'
  return '<span class="status-badge status-' + safeTone + '">' + escapeHtml(label) + '</span>'
}

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function showNotice(message, type = 'success') {
  if (!elements.notice) return
  const safeMessage = sanitizeNoticeMessage(message)
  elements.notice.textContent = safeMessage
  elements.notice.hidden = false
  elements.notice.className = type === 'error' ? 'notice is-error' : 'notice is-success'
}

function sanitizeNoticeMessage(message) {
  return String(message || '')
    .replace(/Bearer\\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [redacted]')
    .slice(0, 180)
}

window.teknosAdmin = {
  apiGet,
  apiJson,
  formatDate,
  renderBadge,
  renderForm,
  renderTable,
  showNotice,
}

bootstrap()`

