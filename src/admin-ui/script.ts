export const adminScript = `const TOKEN_KEY = 'teknos-logistics-admin-token'
const AUTH_PROVIDER_KEY = 'teknos-logistics-auth-provider'
const DEFAULT_ROUTE = '/setup'
const ROUTES = new Set([
  '/setup',
  '/dashboard',
  '/merchants',
  '/stores-origins',
  '/destination-mappings',
  '/courier-services',
  '/shipments',
  '/webhook-relays',
  '/audit-logs',
])

const state = {
  adminToken: sessionStorage.getItem(TOKEN_KEY) || '',
  authProvider: sessionStorage.getItem(AUTH_PROVIDER_KEY) || 'static-token',
  supabaseUrl: '',
  supabaseAnonKey: '',
  currentRoute: DEFAULT_ROUTE,
  selectedMerchantId: '',
  loading: false,
  lastError: '',
  lastSuccess: '',
}

let providerOriginLookupTimer = 0

const elements = {
  appShell: document.getElementById('app'),
  form: document.getElementById('token-form'),
  tokenInput: document.getElementById('admin-token'),
  emailInput: document.getElementById('admin-email'),
  passwordInput: document.getElementById('admin-password'),
  loginHelp: document.getElementById('login-help'),
  loginSubmit: document.getElementById('login-submit'),
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
    void handleLoginSubmit()
  })

  elements.logoutButton?.addEventListener('click', () => {
    logout(state.authProvider === 'supabase' ? 'Sesi admin dihapus dari browser.' : 'Token admin dihapus dari sesi browser.')
  })

  elements.contentPanel?.addEventListener('submit', (event) => {
    const form = event.target
    if (!(form instanceof HTMLFormElement)) return
    event.preventDefault()
    void handleContentForm(form)
  })

  elements.contentPanel?.addEventListener('click', (event) => {
    const button = event.target instanceof Element ? event.target.closest('[data-action]') : null
    if (!(button instanceof HTMLElement)) return
    void handleContentAction(button)
  })

  elements.contentPanel?.addEventListener('input', (event) => {
    const input = event.target instanceof Element ? event.target.closest('[data-provider-origin-search]') : null
    if (!(input instanceof HTMLInputElement)) return
    scheduleProviderOriginLookup(input)
  })

  if (!window.location.hash) {
    window.location.hash = '#' + DEFAULT_ROUTE
  }

  void loadAdminUiConfig().finally(() => {
    configureLoginForm()
    renderAuthState()
    parseRoute()
    renderRoute()
  })
  window.addEventListener('hashchange', () => {
    parseRoute()
    renderRoute()
  })
}

async function loadAdminUiConfig() {
  try {
    const response = await fetch('/admin-ui/config.json', { cache: 'no-store' })
    if (!response.ok) throw new Error('Config unavailable')
    const config = await response.json()
    state.authProvider = config.authProvider === 'supabase' ? 'supabase' : 'static-token'
    state.supabaseUrl = typeof config.supabaseUrl === 'string' ? config.supabaseUrl.replace(new RegExp('/$'), '') : ''
    state.supabaseAnonKey = typeof config.supabaseAnonKey === 'string' ? config.supabaseAnonKey : ''
    sessionStorage.setItem(AUTH_PROVIDER_KEY, state.authProvider)
  } catch {
    state.authProvider = 'static-token'
    sessionStorage.setItem(AUTH_PROVIDER_KEY, state.authProvider)
  }
}

function configureLoginForm() {
  const isSupabase = state.authProvider === 'supabase'
  document.querySelectorAll('[data-auth-field="email"], [data-auth-field="password"]').forEach((element) => {
    element.hidden = !isSupabase
  })
  document.querySelectorAll('[data-auth-field="token"]').forEach((element) => {
    element.hidden = isSupabase
  })
  if (elements.emailInput) elements.emailInput.required = isSupabase
  if (elements.passwordInput) elements.passwordInput.required = isSupabase
  if (elements.tokenInput) elements.tokenInput.required = !isSupabase
  if (elements.loginHelp) {
    elements.loginHelp.textContent = isSupabase
      ? 'Gunakan email dan password Supabase. Akses admin tetap diverifikasi server-side lewat AdminOperator aktif.'
      : 'Token hanya digunakan di browser untuk memanggil endpoint admin. Jangan simpan token di file atau URL.'
  }
  if (elements.loginSubmit) {
    elements.loginSubmit.textContent = isSupabase ? 'Masuk dengan Supabase' : 'Masuk dengan token'
  }
}

async function handleLoginSubmit() {
  if (state.authProvider === 'supabase') {
    await loginWithSupabase()
    return
  }

  const token = elements.tokenInput?.value.trim() || ''
  if (!token) {
    showNotice('Admin token wajib diisi.', 'error')
    return
  }

  setAdminSession(token, 'Token tersimpan untuk sesi browser ini.')
  if (elements.tokenInput) elements.tokenInput.value = ''
}

async function loginWithSupabase() {
  const email = elements.emailInput?.value.trim() || ''
  const password = elements.passwordInput?.value || ''
  if (!email || !password) {
    showNotice('Email dan password wajib diisi.', 'error')
    return
  }
  if (!state.supabaseUrl || !state.supabaseAnonKey) {
    showNotice('Konfigurasi Supabase login belum tersedia.', 'error')
    return
  }

  const response = await fetch(state.supabaseUrl + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: {
      apikey: state.supabaseAnonKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })
  const payload = await readJson(response)
  if (!response.ok || typeof payload?.access_token !== 'string') {
    showNotice(sanitizeErrorMessage(payload) || 'Login Supabase gagal.', 'error')
    return
  }

  if (elements.passwordInput) elements.passwordInput.value = ''
  setAdminSession(payload.access_token, 'Login admin berhasil.')
}

function setAdminSession(token, message) {
  state.adminToken = token
  state.lastError = ''
  state.lastSuccess = message
  sessionStorage.setItem(TOKEN_KEY, token)
  sessionStorage.setItem(AUTH_PROVIDER_KEY, state.authProvider)
  renderAuthState()
  renderRoute()
  showNotice(message, 'success')
}

function parseRoute() {
  const rawRoute = (window.location.hash || '#' + DEFAULT_ROUTE).slice(1) || DEFAULT_ROUTE
  const routeOnly = rawRoute.split('?')[0] || DEFAULT_ROUTE
  const normalizedRoute = routeOnly.startsWith('/') ? routeOnly : '/' + routeOnly
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
  if (elements.appShell) elements.appShell.classList.toggle('is-unauthenticated', !authenticated)
  if (elements.loginPanel) elements.loginPanel.hidden = authenticated
  if (elements.contentPanel) elements.contentPanel.hidden = !authenticated
  if (elements.logoutButton) elements.logoutButton.hidden = !authenticated
  if (elements.pageTitle && !authenticated) elements.pageTitle.textContent = 'Masuk Admin'
  if (elements.authStatus) {
    elements.authStatus.textContent = authenticated ? (state.authProvider === 'supabase' ? 'Session active' : 'Token active') : (state.authProvider === 'supabase' ? 'Login required' : 'Token required')
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

  if (state.currentRoute === '/setup') {
    void loadSetupPage()
  }

  if (state.currentRoute === '/dashboard') {
    void loadDashboard()
  }

  if (state.currentRoute === '/merchants') {
    void loadMerchants()
  }

  if (state.currentRoute === '/merchant/:id') {
    void loadMerchantDetail(state.selectedMerchantId)
  }

  if (state.currentRoute === '/stores-origins') {
    void loadStoresOrigins()
  }

  if (state.currentRoute === '/destination-mappings') {
    void loadDestinationMappingsPage()
  }

  if (state.currentRoute === '/courier-services') {
    void loadCourierServicesPage()
  }

  if (state.currentRoute === '/shipments') {
    void loadShipmentsPage()
  }

  if (state.currentRoute === '/webhook-relays') {
    void loadWebhookRelaysPage()
  }

  if (state.currentRoute === '/audit-logs') {
    void loadAuditLogsPage()
  }
}

function routeConfig(route) {
  if (route === '/setup') {
    return {
      title: 'Setup Merchant',
      eyebrow: 'Configuration',
      description: 'Alur konfigurasi dari nol untuk menghubungkan aplikasi merchant ke teknos-logistics.',
      badge: 'Guided',
      content: renderSetupLoading(),
    }
  }

  if (route === '/dashboard') {
    return {
      title: 'Dashboard',
      eyebrow: 'Overview',
      description: 'Ringkasan health, readiness, merchant, shipment, relay webhook, dan audit terbaru.',
      badge: 'Live Overview',
      content: renderDashboardLoading(),
    }
  }

  if (route === '/merchants') {
    return {
      title: 'Merchants',
      eyebrow: 'Merchant Config',
      description: 'Kelola merchant, status aktif, dan buka detail API key/webhook endpoint.',
      badge: 'Manage',
      content: renderMerchantsLoading(),
    }
  }

  if (route === '/merchant/:id') {
    return {
      title: 'Merchant Detail',
      eyebrow: 'Merchant Config',
      description: 'Detail merchant, API key, dan webhook endpoint. Secret tidak pernah ditampilkan ulang.',
      badge: 'Selected',
      content: renderMerchantDetailLoading(),
    }
  }

  if (route === '/stores-origins') {
    return {
      title: 'Stores & Origins',
      eyebrow: 'Merchant Config',
      description: 'Kelola toko dan titik origin per merchant. Default origin tetap ditegakkan oleh backend.',
      badge: 'Manage',
      content: renderStoresOriginsLoading(),
    }
  }

  if (route === '/destination-mappings') {
    return {
      title: 'Mappings',
      eyebrow: 'Courier Config',
      description: 'Kelola mapping origin dan destination agar request merchant tidak perlu tahu kode internal kurir.',
      badge: 'Configure',
      content: renderDestinationMappingsLoading(),
    }
  }

  if (route === '/courier-services') {
    return {
      title: 'Courier Services',
      eyebrow: 'Courier Config',
      description: 'Kelola katalog layanan kurir dan assignment merchant tanpa credential provider.',
      badge: 'Manage',
      content: renderCourierServicesLoading(),
    }
  }

  if (route === '/shipments') {
    return {
      title: 'Shipments',
      eyebrow: 'Operations',
      description: 'Monitoring shipment read-only; tidak ada booking, retry, atau pembuatan AWB/resi.',
      badge: 'Read-only',
      content: renderReadOnlyLoading('Shipments'),
    }
  }

  if (route === '/webhook-relays') {
    return {
      title: 'Webhook Relays',
      eyebrow: 'Operations',
      description: 'Monitoring relay webhook read-only; tidak ada tombol retry pada Sprint 9.',
      badge: 'Read-only',
      content: renderReadOnlyLoading('Webhook relays'),
    }
  }

  if (route === '/audit-logs') {
    return {
      title: 'Audit Logs',
      eyebrow: 'Operations',
      description: 'Log audit admin tersanitasi untuk observability internal.',
      badge: 'Read-only',
      content: renderReadOnlyLoading('Audit logs'),
    }
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

function renderDashboardLoading() {
  return '<div id="dashboard-root" class="dashboard-grid">'
    + '<div class="dashboard-status">'
    + metricCard('Health', 'Loading', 'Mengecek proses aplikasi tanpa token admin.', 'info')
    + metricCard('Readiness', 'Loading', 'Mengecek koneksi database tanpa token admin.', 'info')
    + metricCard('Safety', 'No AWB Action', 'Dashboard ini hanya membaca data operasional.', 'success')
    + '</div>'
    + '<div class="dashboard-sections">'
    + dashboardSection('Merchants', 'Memuat merchant terbaru...', [])
    + dashboardSection('Shipments', 'Memuat shipment terbaru...', [])
    + dashboardSection('Webhook Relays', 'Memuat relay terbaru...', [])
    + dashboardSection('Audit Logs', 'Memuat audit terbaru...', [])
    + '</div>'
    + renderQuickLinks()
    + '</div>'
}

function renderSetupLoading() {
  return '<div id="setup-root" class="setup-layout">'
    + '<div class="form-card wide-card"><h3>Setup</h3><p class="muted">Memuat konfigurasi merchant...</p></div>'
    + '</div>'
}

async function loadSetupPage() {
  const snapshotRoute = state.currentRoute
  const query = setupQueryFromHash()
  let merchants = []
  let selectedMerchant = null
  let stores = []
  let origins = []
  let originMappings = []
  let apiKeys = []
  let endpoints = []
  let destinationMappings = []
  let error = ''

  try {
    const merchantPayload = await apiGet('/admin/merchants', { limit: 100, is_active: true })
    merchants = Array.isArray(merchantPayload?.merchants) ? merchantPayload.merchants : []
    const selectedMerchantId = query.merchantId || merchants[0]?.id || ''
    selectedMerchant = merchants.find((merchant) => merchant.id === selectedMerchantId) || null
    query.merchantId = selectedMerchant?.id || ''

    if (selectedMerchant) {
      const [storePayload, originPayload, apiKeyPayload, endpointPayload, destinationPayload] = await Promise.all([
        apiGet('/admin/merchants/' + encodeURIComponent(selectedMerchant.id) + '/stores', { limit: 50 }),
        apiGet('/admin/merchants/' + encodeURIComponent(selectedMerchant.id) + '/origins', { limit: 50 }),
        apiGet('/admin/merchants/' + encodeURIComponent(selectedMerchant.id) + '/api-keys', { limit: 20 }),
        apiGet('/admin/merchants/' + encodeURIComponent(selectedMerchant.id) + '/webhook-endpoints', { limit: 20 }),
        apiGet('/admin/merchants/' + encodeURIComponent(selectedMerchant.id) + '/destination-mappings', { courier: 'JNE', is_active: true, limit: 1 }),
      ])
      stores = Array.isArray(storePayload?.stores) ? storePayload.stores : []
      origins = Array.isArray(originPayload?.origins) ? originPayload.origins : []
      apiKeys = Array.isArray(apiKeyPayload?.apiKeys) ? apiKeyPayload.apiKeys : []
      endpoints = Array.isArray(endpointPayload?.endpoints) ? endpointPayload.endpoints : []
      destinationMappings = Array.isArray(destinationPayload?.mappings) ? destinationPayload.mappings : []
      const defaultOrigin = origins.find((origin) => origin.isDefault && origin.isActive) || origins.find((origin) => origin.isActive) || origins[0]
      if (defaultOrigin) {
        const mappingPayload = await apiGet('/admin/merchants/' + encodeURIComponent(selectedMerchant.id) + '/origins/' + encodeURIComponent(defaultOrigin.id) + '/mappings')
        originMappings = Array.isArray(mappingPayload?.mappings) ? mappingPayload.mappings : []
      }
    }
  } catch {
    error = 'Setup config tidak tersedia saat ini.'
  }

  if (state.currentRoute !== snapshotRoute || state.currentRoute !== '/setup' || !elements.contentPanel) return
  const route = routeConfig('/setup')
  const content = renderSetupContent({ merchants, selectedMerchant, stores, origins, originMappings, apiKeys, endpoints, destinationMappings, query, error })
  elements.contentPanel.innerHTML = renderPageShell({ ...route, content })
}

function setupQueryFromHash() {
  const queryText = (window.location.hash.split('?')[1] || '').trim()
  const params = new URLSearchParams(queryText)
  return { merchantId: params.get('merchant_id') || '' }
}

function setupHash(query) {
  const params = new URLSearchParams()
  if (query.merchantId) params.set('merchant_id', query.merchantId)
  return '#/setup?' + params.toString()
}

function renderSetupContent({ merchants, selectedMerchant, stores, origins, originMappings, apiKeys, endpoints, destinationMappings, query, error }) {
  const activeOrigins = origins.filter((origin) => origin.isActive)
  const defaultOrigin = origins.find((origin) => origin.isDefault && origin.isActive) || activeOrigins[0] || origins[0] || null
  const activeApiKeys = apiKeys.filter((key) => key.isActive)
  const activeEndpoints = endpoints.filter((endpoint) => endpoint.isActive)
  const activeJneOriginMapping = originMappings.find((mapping) => mapping.courier === 'JNE' && mapping.isActive)
  const hasDestinationMapping = destinationMappings.some((mapping) => mapping.courier === 'JNE' && mapping.isActive)

  const status = {
    merchant: Boolean(selectedMerchant?.isActive),
    origin: Boolean(defaultOrigin),
    originMapping: Boolean(activeJneOriginMapping),
    destinationMapping: hasDestinationMapping,
    apiKey: activeApiKeys.length > 0,
    webhook: activeEndpoints.length > 0,
  }

  return '<div id="setup-root" class="setup-layout">'
    + (error ? '<div class="notice is-error">' + escapeHtml(error) + '</div>' : '')
    + renderSetupSummary(status, selectedMerchant, defaultOrigin)
    + '<div class="setup-grid">'
    + '<div class="setup-steps">'
    + renderSetupStep(1, 'Merchant', status.merchant, selectedMerchant ? selectedMerchant.name + ' (' + selectedMerchant.slug + ')' : 'Belum ada merchant aktif', '#/merchants')
    + renderSetupStep(2, 'Origin pickup', status.origin, defaultOrigin ? defaultOrigin.code + ' - ' + defaultOrigin.name : 'Buat origin gudang/toko', '#/stores-origins')
    + renderSetupStep(3, 'Origin mapping JNE', status.originMapping, activeJneOriginMapping ? 'JNE -> ' + activeJneOriginMapping.providerCode : 'Set provider code origin JNE', '#/destination-mappings')
    + renderSetupStep(4, 'Destination mapping', status.destinationMapping, status.destinationMapping ? 'Minimal satu mapping JNE aktif tersedia' : 'Tambah mapping tujuan untuk smoke checkout', '#/destination-mappings')
    + renderSetupStep(5, 'API key', status.apiKey, status.apiKey ? activeApiKeys.length + ' active key' : 'Generate key untuk aplikasi merchant', selectedMerchant ? '#/merchant/' + encodeURIComponent(selectedMerchant.id) : '#/merchants')
    + renderSetupStep(6, 'Webhook', status.webhook, status.webhook ? activeEndpoints.length + ' active endpoint' : 'Daftarkan endpoint webhook parent', selectedMerchant ? '#/merchant/' + encodeURIComponent(selectedMerchant.id) : '#/merchants')
    + '</div>'
    + renderSetupActions({ merchants, selectedMerchant, stores, origins, defaultOrigin, query })
    + '</div>'
    + renderParentEnvBox(selectedMerchant, defaultOrigin)
    + '</div>'
}

function renderSetupSummary(status, selectedMerchant, defaultOrigin) {
  const complete = Object.values(status).filter(Boolean).length
  return '<div class="config-summary">'
    + summaryTile('Merchant', selectedMerchant ? selectedMerchant.slug : 'empty')
    + summaryTile('Origin', defaultOrigin ? defaultOrigin.code : 'empty')
    + summaryTile('Ready steps', complete + '/6')
    + summaryTile('Mode', 'manual')
    + '</div>'
}

function summaryTile(label, value) {
  return '<article class="summary-tile"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(value) + '</strong></article>'
}

function renderSetupStep(index, title, done, detail, href) {
  return '<article class="setup-step ' + (done ? 'is-done' : 'is-blocked') + '">'
    + '<span class="setup-step-number">' + index + '</span>'
    + '<div><h3>' + escapeHtml(title) + '</h3><p class="muted">' + escapeHtml(detail) + '</p></div>'
    + '<a class="button button-ghost" href="' + escapeHtml(href) + '">Open</a>'
    + '</article>'
}

function renderSetupActions({ merchants, selectedMerchant, stores, origins, defaultOrigin, query }) {
  const merchantOptions = merchants.map((merchant) => optionHtml(merchant.id, merchant.name + ' (' + merchant.slug + ')', query.merchantId || selectedMerchant?.id || '')).join('')
  return '<div class="form-card">'
    + '<h3>Manual setup</h3>'
    + (merchants.length > 0 ? '<form class="form-grid" data-form="setup-filter"><label><span>Merchant aktif</span><select name="merchant_id">' + merchantOptions + '</select></label><button class="button" type="submit">Load merchant</button></form>' : renderMerchantCreateForm())
    + (selectedMerchant ? renderSetupForms(selectedMerchant, stores, origins, defaultOrigin) : '')
    + '</div>'
}

function renderSetupForms(merchant, stores, origins, defaultOrigin) {
  return '<div class="form-grid" style="margin-top:14px">'
    + (origins.length === 0 ? renderOriginCreateForm(stores, { merchantId: merchant.id, storeId: '' }) : '')
    + (defaultOrigin ? renderOriginMappingForm(merchant.id, defaultOrigin) : '')
    + renderDestinationMappingCreateForm(merchant.id)
    + renderApiKeyCreateForm(merchant.id)
    + renderWebhookCreateForm(merchant.id)
    + '</div>'
}

function renderParentEnvBox(merchant, origin) {
  const envText = 'LOGISTICS_API_URL="http://localhost:3001"\\nLOGISTICS_API_KEY="<plaintext API key yang tampil sekali>"\\nLOGISTICS_WEBHOOK_SECRET="<secret webhook yang dibuat>"\\nLOGISTICS_ORIGIN_ID="' + (origin?.id || '<origin id>') + '"\\nLOGISTICS_ENABLED="true"'
  return '<div class="env-box"><strong>Parent .env.local</strong><code>' + escapeHtml(envText) + '</code></div>'
}

function metricCard(label, value, description, tone = 'muted') {
  const safeTone = ['success', 'warning', 'danger', 'info', 'muted'].includes(tone) ? tone : 'muted'
  return '<article class="metric-card metric-' + safeTone + '">'
    + '<span class="metric-label">' + escapeHtml(label) + '</span>'
    + '<strong>' + escapeHtml(value) + '</strong>'
    + '<p class="muted">' + escapeHtml(description) + '</p>'
    + '</article>'
}

async function loadDashboard() {
  const snapshotRoute = state.currentRoute
  const healthPromise = fetchStatus('/health')
  const readinessPromise = fetchStatus('/ready')
  const adminPromise = Promise.allSettled([
    apiGet('/admin/merchants', { limit: 5 }),
    apiGet('/admin/shipments', { limit: 5 }),
    apiGet('/admin/webhook-relays', { limit: 5 }),
    apiGet('/admin/audit-logs', { limit: 5 }),
  ])

  const [health, readiness, adminResults] = await Promise.all([
    healthPromise,
    readinessPromise,
    adminPromise,
  ])

  if (state.currentRoute !== snapshotRoute || state.currentRoute !== '/dashboard' || !elements.contentPanel) return

  const merchants = settledValue(adminResults[0], 'merchants')
  const shipments = settledValue(adminResults[1], 'shipments')
  const relays = settledValue(adminResults[2], 'attempts')
  const logs = settledValue(adminResults[3], 'logs')

  const content = '<div id="dashboard-root" class="dashboard-grid">'
    + '<div class="dashboard-status">'
    + statusMetric('Health', health, 'Proses aplikasi')
    + statusMetric('Readiness', readiness, 'Database readiness')
    + metricCard('Safety', 'No AWB Action', 'Tidak ada tombol booking, generatecnote, atau pembuatan resi di dashboard.', 'success')
    + '</div>'
    + '<div class="dashboard-sections">'
    + dashboardSection('Merchants', summaryLabel(merchants.items, merchants.error), merchantRows(merchants.items), merchants.error)
    + dashboardSection('Shipments', summaryLabel(shipments.items, shipments.error), shipmentRows(shipments.items), shipments.error)
    + dashboardSection('Webhook Relays', summaryLabel(relays.items, relays.error), relayRows(relays.items), relays.error)
    + dashboardSection('Audit Logs', summaryLabel(logs.items, logs.error), auditRows(logs.items), logs.error)
    + '</div>'
    + renderQuickLinks()
    + '</div>'

  const route = routeConfig('/dashboard')
  elements.contentPanel.innerHTML = renderPageShell({ ...route, content })
}

async function fetchStatus(path) {
  try {
    const response = await fetch(path)
    const payload = await readJson(response)
    return {
      ok: response.ok && payload?.ok === true,
      status: response.status,
      payload,
    }
  } catch {
    return { ok: false, status: 0, payload: null }
  }
}

function settledValue(result, key) {
  if (result.status !== 'fulfilled') {
    return { items: [], error: 'Data tidak tersedia saat ini.' }
  }

  const items = Array.isArray(result.value?.[key]) ? result.value[key] : []
  return { items, error: '' }
}

function statusMetric(label, status, description) {
  const tone = status.ok ? 'success' : 'danger'
  const value = status.ok ? 'OK' : 'Unavailable'
  const statusText = status.status ? 'HTTP ' + status.status : 'Tidak tersambung'
  return metricCard(label, value, description + ' - ' + statusText, tone)
}

function summaryLabel(items, error) {
  if (error) return error
  return items.length + ' data terbaru'
}

function dashboardSection(title, summary, rows, error = '') {
  const safeRows = rows.length > 0
    ? rows.map((row) => '<li><strong>' + escapeHtml(row.title) + '</strong><span>' + escapeHtml(row.meta) + '</span></li>').join('')
    : '<li><strong>' + escapeHtml(error ? 'Unavailable' : 'Kosong') + '</strong><span>' + escapeHtml(summary) + '</span></li>'

  return '<article class="dashboard-section">'
    + '<div class="dashboard-section-header"><h3>' + escapeHtml(title) + '</h3><span>' + escapeHtml(summary) + '</span></div>'
    + '<ul class="dashboard-list">' + safeRows + '</ul>'
    + '</article>'
}

function merchantRows(items) {
  return items.map((merchant) => ({
    title: merchant.name || merchant.slug || merchant.id,
    meta: (merchant.isActive ? 'Active' : 'Inactive') + ' - ' + (merchant._count?.shipments ?? 0) + ' shipments - ' + formatDate(merchant.createdAt),
  }))
}

function shipmentRows(items) {
  return items.map((shipment) => ({
    title: shipment.externalOrderId || shipment.id,
    meta: shipment.courier + ' ' + shipment.serviceCode + ' - ' + shipment.status + ' - ' + (shipment.merchant?.name || shipment.merchantId),
  }))
}

function relayRows(items) {
  return items.map((relay) => ({
    title: relay.event?.eventType || relay.eventId || relay.id,
    meta: relay.status + ' - attempt ' + relay.attemptCount + ' - ' + (relay.endpoint?.merchant?.name || relay.endpointId),
  }))
}

function auditRows(items) {
  return items.map((log) => ({
    title: log.method + ' ' + log.path,
    meta: 'HTTP ' + log.status + ' - ' + log.durationMs + 'ms - ' + formatDate(log.createdAt),
  }))
}

function renderQuickLinks() {
  const links = [
    ['Setup merchant', '#/setup'],
    ['Merchants & keys', '#/merchants'],
    ['Origins', '#/stores-origins'],
    ['Mappings', '#/destination-mappings'],
    ['Services', '#/courier-services'],
    ['Shipments', '#/shipments'],
    ['Webhook relay', '#/webhook-relays'],
    ['Audit', '#/audit-logs'],
  ]
  return '<div class="quick-links"><h3>Quick links</h3><div>'
    + links.map(([label, href]) => '<a href="' + escapeHtml(href) + '">' + escapeHtml(label) + '</a>').join('')
    + '</div></div>'
}

function renderMerchantsLoading() {
  return '<div id="merchant-root" class="management-grid">'
    + renderMerchantFilters({ search: '', isActive: '', limit: 20, offset: 0 })
    + renderMerchantCreateForm()
    + '<div class="form-card wide-card"><h3>Merchant list</h3><p class="muted">Memuat merchant...</p></div>'
    + '</div>'
}

async function loadMerchants() {
  const snapshotRoute = state.currentRoute
  const query = merchantQueryFromHash()
  let merchants = []
  let error = ''

  try {
    const payload = await apiGet('/admin/merchants', {
      search: query.search,
      is_active: query.isActive,
      limit: query.limit,
      offset: query.offset,
    })
    merchants = Array.isArray(payload?.merchants) ? payload.merchants : []
  } catch {
    error = 'Merchant tidak tersedia saat ini.'
  }

  if (state.currentRoute !== snapshotRoute || state.currentRoute !== '/merchants' || !elements.contentPanel) return

  const route = routeConfig('/merchants')
  const content = '<div id="merchant-root" class="management-grid">'
    + renderMerchantFilters(query)
    + renderMerchantCreateForm()
    + renderMerchantList(merchants, error, query)
    + '</div>'
  elements.contentPanel.innerHTML = renderPageShell({ ...route, content })
}

function merchantQueryFromHash() {
  const queryText = (window.location.hash.split('?')[1] || '').trim()
  const params = new URLSearchParams(queryText)
  return {
    search: params.get('search') || '',
    isActive: normalizeActiveFilter(params.get('is_active') || ''),
    limit: clampNumber(params.get('limit'), 20, 5, 50),
    offset: clampNumber(params.get('offset'), 0, 0, 100000),
  }
}

function normalizeActiveFilter(value) {
  return value === 'true' || value === 'false' ? value : ''
}

function clampNumber(value, fallback, min, max) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed)) return fallback
  return Math.min(Math.max(parsed, min), max)
}

function renderMerchantFilters(query) {
  return '<form class="form-card" data-form="merchant-filter"><h3>Filter merchant</h3><div class="form-grid">'
    + '<label><span>Search</span><input name="search" type="search" value="' + escapeHtml(query.search) + '" placeholder="slug atau nama" /></label>'
    + '<label><span>Status</span><select name="is_active">'
    + optionHtml('', 'Semua status', query.isActive)
    + optionHtml('true', 'Active', query.isActive)
    + optionHtml('false', 'Inactive', query.isActive)
    + '</select></label>'
    + '<label><span>Limit</span><input name="limit" type="number" min="5" max="50" value="' + escapeHtml(query.limit) + '" /></label>'
    + '<label><span>Offset</span><input name="offset" type="number" min="0" value="' + escapeHtml(query.offset) + '" /></label>'
    + '<button class="button" type="submit">Apply filter</button>'
    + '</div></form>'
}

function renderMerchantCreateForm() {
  return '<form class="form-card" data-form="merchant-create"><h3>Create merchant</h3><div class="form-grid">'
    + '<label><span>Slug</span><input name="slug" required minlength="2" maxlength="64" pattern="[a-z0-9-]+" placeholder="contoh: teknos-store" /></label>'
    + '<label><span>Name</span><input name="name" required minlength="2" maxlength="120" placeholder="Nama merchant" /></label>'
    + '<label class="checkbox-row"><input name="is_active" type="checkbox" checked /><span>Active</span></label>'
    + '<button class="button" type="submit">Create merchant</button>'
    + '</div></form>'
}

function renderMerchantList(merchants, error, query) {
  const rows = merchants.map((merchant) => [
    escapeHtml(merchant.slug),
    escapeHtml(merchant.name),
    escapeHtml(merchant.isActive ? 'Active' : 'Inactive'),
    escapeHtml(formatDate(merchant.createdAt) + ' / ' + formatDate(merchant.updatedAt)),
    '<a class="inline-link" href="#/merchant/' + encodeURIComponent(merchant.id) + '">Detail</a>',
  ])
  const table = renderUnsafeTable({
    columns: ['Slug', 'Name', 'Active', 'Created / Updated', 'Actions'],
    rows,
    emptyMessage: error || 'Belum ada merchant.',
  })
  const prevOffset = Math.max(query.offset - query.limit, 0)
  const nextOffset = query.offset + query.limit
  const prevHref = merchantHash({ ...query, offset: prevOffset })
  const nextHref = merchantHash({ ...query, offset: nextOffset })
  return '<div class="form-card wide-card"><div class="section-title"><h3>Merchant list</h3><span>' + escapeHtml(merchants.length) + ' rows</span></div>'
    + table
    + '<div class="pagination-row">'
    + '<a class="button button-secondary" href="' + escapeHtml(prevHref) + '">Prev</a>'
    + '<a class="button button-secondary" href="' + escapeHtml(nextHref) + '">Next</a>'
    + '</div></div>'
}

function merchantHash(query) {
  const params = new URLSearchParams()
  if (query.search) params.set('search', query.search)
  if (query.isActive) params.set('is_active', query.isActive)
  params.set('limit', String(query.limit))
  params.set('offset', String(query.offset))
  return '#/merchants?' + params.toString()
}

function renderMerchantDetailLoading() {
  return '<div id="merchant-detail-root" class="management-grid"><div class="form-card wide-card"><h3>Merchant detail</h3><p class="muted">Memuat detail merchant...</p></div></div>'
}

async function loadMerchantDetail(merchantId) {
  const snapshotId = merchantId
  let merchant = null
  let apiKeys = []
  let endpoints = []
  let error = ''

  try {
    const [merchantPayload, apiKeyPayload, endpointPayload] = await Promise.all([
      apiGet('/admin/merchants', { limit: 50 }),
      apiGet('/admin/merchants/' + encodeURIComponent(merchantId) + '/api-keys', { limit: 20 }),
      apiGet('/admin/merchants/' + encodeURIComponent(merchantId) + '/webhook-endpoints', { limit: 20 }),
    ])
    const merchants = Array.isArray(merchantPayload?.merchants) ? merchantPayload.merchants : []
    merchant = merchants.find((item) => item.id === merchantId) || null
    apiKeys = Array.isArray(apiKeyPayload?.apiKeys) ? apiKeyPayload.apiKeys : []
    endpoints = Array.isArray(endpointPayload?.endpoints) ? endpointPayload.endpoints : []
  } catch {
    error = 'Detail merchant tidak tersedia saat ini.'
  }

  if (state.currentRoute !== '/merchant/:id' || state.selectedMerchantId !== snapshotId || !elements.contentPanel) return

  const route = routeConfig('/merchant/:id')
  const content = renderMerchantDetailContent(merchant, apiKeys, endpoints, error)
  elements.contentPanel.innerHTML = renderPageShell({ ...route, content })
}

function renderMerchantDetailContent(merchant, apiKeys, endpoints, error) {
  if (error) {
    return '<div class="form-card wide-card"><h3>Merchant detail</h3><p class="muted">' + escapeHtml(error) + '</p></div>'
  }

  const name = merchant?.name || state.selectedMerchantId
  return '<div id="merchant-detail-root" class="management-grid">'
    + renderMerchantUpdateForm(merchant)
    + renderApiKeyCreateForm()
    + renderWebhookCreateForm()
    + renderApiKeyList(apiKeys)
    + renderWebhookEndpointList(endpoints)
    + '<div class="form-card wide-card"><h3>Selected merchant</h3><p><strong>' + escapeHtml(name) + '</strong></p><p class="muted">ID: ' + escapeHtml(state.selectedMerchantId) + '</p></div>'
    + '</div>'
}

function renderMerchantUpdateForm(merchant) {
  return '<form class="form-card" data-form="merchant-update"><h3>Update merchant</h3><div class="form-grid">'
    + '<label><span>Name</span><input name="name" required minlength="2" maxlength="120" value="' + escapeHtml(merchant?.name || '') + '" /></label>'
    + '<label class="checkbox-row"><input name="is_active" type="checkbox" ' + (merchant?.isActive !== false ? 'checked' : '') + ' /><span>Active</span></label>'
    + '<button class="button" type="submit">Save merchant</button>'
    + '</div></form>'
}

function renderApiKeyCreateForm(merchantId = '') {
  return '<form class="form-card" data-form="api-key-create"><h3>Create API key</h3><div class="form-grid">'
    + '<input type="hidden" name="merchant_id" value="' + escapeHtml(merchantId) + '" />'
    + '<label><span>Label</span><input name="label" maxlength="80" placeholder="Staging key / production key" /></label>'
    + '<label><span>Expires at</span><input name="expires_at" type="datetime-local" /></label>'
    + '<button class="button" type="submit">Create API key</button>'
    + '<p class="muted">Plaintext key hanya muncul sekali setelah dibuat.</p>'
    + '<div id="one-time-key"></div>'
    + '</div></form>'
}

function renderWebhookCreateForm(merchantId = '') {
  return '<form class="form-card" data-form="webhook-create"><h3>Create webhook endpoint</h3><div class="form-grid">'
    + '<input type="hidden" name="merchant_id" value="' + escapeHtml(merchantId) + '" />'
    + '<label><span>Webhook URL</span><input name="url" required type="url" placeholder="http://localhost:3000/api/webhooks/logistics" /></label>'
    + '<label><span>Secret</span><input name="secret" required minlength="16" maxlength="256" type="password" autocomplete="new-password" /></label>'
    + '<label class="checkbox-row"><input name="is_active" type="checkbox" checked /><span>Active</span></label>'
    + '<button class="button" type="submit">Create endpoint</button>'
    + '<p class="muted">Secret disimpan server-side dan tidak pernah ditampilkan ulang.</p>'
    + '</div></form>'
}

function renderApiKeyList(apiKeys) {
  const rows = apiKeys.map((key) => [
    escapeHtml(key.keyPrefix),
    escapeHtml(key.label || '-'),
    escapeHtml(key.isActive ? 'Active' : 'Inactive'),
    escapeHtml(formatDate(key.lastUsedAt)),
    escapeHtml(formatDate(key.expiresAt)),
    '<button class="button button-secondary" data-action="toggle-api-key" data-id="' + escapeHtml(key.id) + '" data-active="' + escapeHtml(String(!key.isActive)) + '">' + escapeHtml(key.isActive ? 'Deactivate' : 'Activate') + '</button>',
  ])
  return '<div class="form-card wide-card"><div class="section-title"><h3>API keys</h3><span>' + escapeHtml(apiKeys.length) + ' keys</span></div>'
    + '<div id="one-time-key"></div>'
    + renderUnsafeTable({ columns: ['Prefix', 'Label', 'Status', 'Last used', 'Expires', 'Action'], rows, emptyMessage: 'Belum ada API key.' })
    + '</div>'
}

function renderWebhookEndpointList(endpoints) {
  const rows = endpoints.map((endpoint) => [
    escapeHtml(endpoint.url),
    escapeHtml(endpoint.isActive ? 'Active' : 'Inactive'),
    escapeHtml(String(endpoint.counts?.attempts ?? 0)),
    escapeHtml(formatDate(endpoint.createdAt)),
    '<button class="button button-secondary" data-action="toggle-webhook" data-id="' + escapeHtml(endpoint.id) + '" data-active="' + escapeHtml(String(!endpoint.isActive)) + '">' + escapeHtml(endpoint.isActive ? 'Deactivate' : 'Activate') + '</button>',
  ])
  return '<div class="form-card wide-card"><div class="section-title"><h3>Webhook endpoints</h3><span>' + escapeHtml(endpoints.length) + ' endpoints</span></div>'
    + renderUnsafeTable({ columns: ['URL', 'Status', 'Attempts', 'Created', 'Action'], rows, emptyMessage: 'Belum ada webhook endpoint.' })
    + '</div>'
}

function renderStoresOriginsLoading() {
  return '<div id="stores-origins-root" class="management-grid"><div class="form-card wide-card"><h3>Stores & Origins</h3><p class="muted">Memuat merchant, store, dan origin...</p></div></div>'
}

async function loadStoresOrigins() {
  const snapshotRoute = state.currentRoute
  const query = storesOriginsQueryFromHash()
  let merchants = []
  let stores = []
  let origins = []
  let error = ''

  try {
    const merchantPayload = await apiGet('/admin/merchants', { limit: 50 })
    merchants = Array.isArray(merchantPayload?.merchants) ? merchantPayload.merchants : []
    const selectedMerchantId = query.merchantId || merchants[0]?.id || ''
    query.merchantId = selectedMerchantId

    if (selectedMerchantId) {
      const [storePayload, originPayload] = await Promise.all([
        apiGet('/admin/merchants/' + encodeURIComponent(selectedMerchantId) + '/stores', { limit: 50 }),
        apiGet('/admin/merchants/' + encodeURIComponent(selectedMerchantId) + '/origins', { store_id: query.storeId, limit: 50 }),
      ])
      stores = Array.isArray(storePayload?.stores) ? storePayload.stores : []
      origins = Array.isArray(originPayload?.origins) ? originPayload.origins : []
    }
  } catch {
    error = 'Store dan origin tidak tersedia saat ini.'
  }

  if (state.currentRoute !== snapshotRoute || state.currentRoute !== '/stores-origins' || !elements.contentPanel) return

  const route = routeConfig('/stores-origins')
  const content = renderStoresOriginsContent({ merchants, stores, origins, query, error })
  elements.contentPanel.innerHTML = renderPageShell({ ...route, content })
}

function storesOriginsQueryFromHash() {
  const queryText = (window.location.hash.split('?')[1] || '').trim()
  const params = new URLSearchParams(queryText)
  return {
    merchantId: params.get('merchant_id') || '',
    storeId: params.get('store_id') || '',
  }
}

function storesOriginsHash(query) {
  const params = new URLSearchParams()
  if (query.merchantId) params.set('merchant_id', query.merchantId)
  if (query.storeId) params.set('store_id', query.storeId)
  return '#/stores-origins?' + params.toString()
}

function renderStoresOriginsContent({ merchants, stores, origins, query, error }) {
  return '<div id="stores-origins-root" class="management-grid">'
    + renderStoresOriginsSelector(merchants, stores, query)
    + renderStoreCreateForm(query.merchantId)
    + renderOriginCreateForm(stores, query)
    + renderStoreList(stores, error)
    + renderOriginList(origins, error)
    + '</div>'
}

function renderStoresOriginsSelector(merchants, stores, query) {
  const merchantOptions = merchants.map((merchant) => optionHtml(merchant.id, merchant.name + ' (' + merchant.slug + ')', query.merchantId)).join('')
  const storeOptions = '<option value="">Semua store</option>'
    + stores.map((store) => optionHtml(store.id, store.name + ' (' + store.slug + ')', query.storeId)).join('')
  return '<form class="form-card wide-card" data-form="stores-origins-filter"><h3>Pilih merchant</h3><div class="form-grid split-grid">'
    + '<label><span>Merchant</span><select name="merchant_id" required>' + merchantOptions + '</select></label>'
    + '<label><span>Filter origin by store</span><select name="store_id">' + storeOptions + '</select></label>'
    + '<button class="button" type="submit">Load config</button>'
    + '</div></form>'
}

function renderStoreCreateForm(merchantId) {
  return '<form class="form-card" data-form="store-create"><h3>Create store</h3><div class="form-grid">'
    + '<input type="hidden" name="merchant_id" value="' + escapeHtml(merchantId) + '" />'
    + '<label><span>Slug</span><input name="slug" required minlength="2" maxlength="64" pattern="[a-z0-9-]+" /></label>'
    + '<label><span>Name</span><input name="name" required minlength="1" maxlength="120" /></label>'
    + '<label class="checkbox-row"><input name="is_active" type="checkbox" checked /><span>Active</span></label>'
    + '<button class="button" type="submit">Create store</button>'
    + '</div></form>'
}

function renderOriginCreateForm(stores, query) {
  const storeOptions = '<option value="">Tanpa store khusus</option>'
    + stores.map((store) => optionHtml(store.id, store.name + ' (' + store.slug + ')', query.storeId)).join('')
  return '<form class="form-card" data-form="origin-create"><h3>Create origin</h3><div class="form-grid">'
    + '<input type="hidden" name="merchant_id" value="' + escapeHtml(query.merchantId) + '" />'
    + '<label><span>Store</span><select name="store_id">' + storeOptions + '</select></label>'
    + '<label><span>Code</span><input name="code" required minlength="2" maxlength="32" placeholder="origin_mojokerto_main" /></label>'
    + '<label><span>Name</span><input name="name" required maxlength="120" /></label>'
    + '<label><span>Address</span><textarea name="address" maxlength="500"></textarea></label>'
    + '<label><span>City</span><input name="city" maxlength="120" /></label>'
    + '<label><span>Province</span><input name="province" maxlength="120" /></label>'
    + '<label><span>Postal code</span><input name="postal_code" minlength="3" maxlength="16" /></label>'
    + '<label><span>Phone</span><input name="phone" minlength="6" maxlength="32" /></label>'
    + '<label class="checkbox-row"><input name="is_default" type="checkbox" /><span>Default origin</span></label>'
    + '<label class="checkbox-row"><input name="is_active" type="checkbox" checked /><span>Active</span></label>'
    + '<button class="button" type="submit">Create origin</button>'
    + '</div></form>'
}

function renderStoreList(stores, error) {
  const rows = stores.map((store) => [
    escapeHtml(store.slug),
    escapeHtml(store.name),
    escapeHtml(store.isActive ? 'Active' : 'Inactive'),
    escapeHtml(formatDate(store.updatedAt)),
    '<button class="button button-secondary" data-action="toggle-store" data-id="' + escapeHtml(store.id) + '" data-active="' + escapeHtml(String(!store.isActive)) + '">' + escapeHtml(store.isActive ? 'Deactivate' : 'Activate') + '</button>',
  ])
  return '<div class="form-card wide-card"><div class="section-title"><h3>Stores</h3><span>' + escapeHtml(stores.length) + ' stores</span></div>'
    + renderUnsafeTable({ columns: ['Slug', 'Name', 'Status', 'Updated', 'Action'], rows, emptyMessage: error || 'Belum ada store.' })
    + '</div>'
}

function renderOriginList(origins, error) {
  const rows = origins.map((origin) => [
    escapeHtml(origin.code),
    escapeHtml(origin.name),
    escapeHtml(origin.store?.name || '-'),
    (origin.isDefault ? renderBadge('Default', 'success') + ' ' : '') + escapeHtml(origin.isActive ? 'Active' : 'Inactive'),
    escapeHtml([origin.city, origin.province, origin.postalCode].filter(Boolean).join(', ') || '-'),
    '<button class="button button-secondary" data-action="toggle-origin" data-id="' + escapeHtml(origin.id) + '" data-active="' + escapeHtml(String(!origin.isActive)) + '">' + escapeHtml(origin.isActive ? 'Deactivate' : 'Activate') + '</button> '
      + '<button class="button button-secondary" data-action="default-origin" data-id="' + escapeHtml(origin.id) + '">Set Default</button>',
  ])
  return '<div class="form-card wide-card"><div class="section-title"><h3>Origins</h3><span>' + escapeHtml(origins.length) + ' origins</span></div>'
    + renderUnsafeTable({ columns: ['Code', 'Name', 'Store', 'Status', 'Location', 'Action'], rows, emptyMessage: error || 'Belum ada origin.' })
    + '</div>'
}

function renderOriginMappingForm(merchantId, origin) {
  return '<form class="form-card" data-form="origin-mapping-upsert"><h3>Origin mapping</h3><div class="form-grid">'
    + '<input type="hidden" name="merchant_id" value="' + escapeHtml(merchantId) + '" />'
    + '<input type="hidden" name="origin_id" value="' + escapeHtml(origin.id) + '" />'
    + '<label><span>Origin</span><input value="' + escapeHtml(origin.code + ' - ' + origin.name) + '" disabled /></label>'
    + '<label><span>Courier</span><select name="courier" required>' + courierOptions('JNE') + '</select></label>'
    + '<label><span>Search provider origin</span><input name="provider_origin_search" data-provider-origin-search="true" autocomplete="off" maxlength="120" placeholder="Mojokerto / MJK10000" /></label>'
    + '<div class="lookup-results" data-provider-origin-results></div>'
    + '<label><span>Provider origin code</span><input name="provider_code" required minlength="2" maxlength="64" placeholder="MJK10000" /></label>'
    + '<label><span>Label</span><input name="label" maxlength="120" placeholder="JNE Mojokerto" /></label>'
    + '<label class="checkbox-row"><input name="is_active" type="checkbox" checked /><span>Active</span></label>'
    + '<button class="button" type="submit">Save origin mapping</button>'
    + '</div></form>'
}

function renderDestinationMappingCreateForm(merchantId) {
  return '<form class="form-card" data-form="destination-mapping-create"><h3>Destination mapping</h3><div class="form-grid two-grid">'
    + '<input type="hidden" name="merchant_id" value="' + escapeHtml(merchantId) + '" />'
    + '<label><span>Courier</span><select name="courier" required>' + courierOptions('JNE') + '</select></label>'
    + '<label><span>Provider destination code</span><input name="provider_code" required minlength="2" maxlength="64" placeholder="MJK10004" /></label>'
    + '<label><span>Postal code</span><input name="postal_code" minlength="3" maxlength="16" placeholder="61351" /></label>'
    + '<label><span>Province</span><input name="province" maxlength="120" placeholder="Jawa Timur" /></label>'
    + '<label><span>City</span><input name="city" maxlength="120" placeholder="Mojokerto" /></label>'
    + '<label><span>District</span><input name="district" maxlength="120" placeholder="Kemlagi" /></label>'
    + '<label><span>Subdistrict</span><input name="subdistrict" maxlength="120" placeholder="Batankrajan" /></label>'
    + '<label><span>Label</span><input name="label" maxlength="120" placeholder="Mojokerto Kemlagi" /></label>'
    + '<label class="checkbox-row"><input name="is_active" type="checkbox" checked /><span>Active</span></label>'
    + '<button class="button" type="submit">Save destination mapping</button>'
    + '</div></form>'
}

function renderDestinationMappingsLoading() {
  return '<div id="destination-mappings-root" class="management-grid"><div class="form-card wide-card"><h3>Mappings</h3><p class="muted">Memuat origin dan destination mapping...</p></div></div>'
}

async function loadDestinationMappingsPage() {
  const snapshotRoute = state.currentRoute
  const query = destinationMappingQueryFromHash()
  let merchants = []
  let origins = []
  let originMappings = []
  let destinationMappings = []
  let error = ''

  try {
    const merchantPayload = await apiGet('/admin/merchants', { limit: 100, is_active: true })
    merchants = Array.isArray(merchantPayload?.merchants) ? merchantPayload.merchants : []
    query.merchantId = query.merchantId || merchants[0]?.id || ''

    if (query.merchantId) {
      const [originPayload, destinationPayload] = await Promise.all([
        apiGet('/admin/merchants/' + encodeURIComponent(query.merchantId) + '/origins', { limit: 50 }),
        apiGet('/admin/merchants/' + encodeURIComponent(query.merchantId) + '/destination-mappings', { courier: query.courier, is_active: query.isActive, limit: 50 }),
      ])
      origins = Array.isArray(originPayload?.origins) ? originPayload.origins : []
      destinationMappings = Array.isArray(destinationPayload?.mappings) ? destinationPayload.mappings : []
      const selectedOrigin = origins.find((origin) => origin.id === query.originId) || origins.find((origin) => origin.isDefault && origin.isActive) || origins[0]
      query.originId = selectedOrigin?.id || ''
      if (selectedOrigin) {
        const originMappingPayload = await apiGet('/admin/merchants/' + encodeURIComponent(query.merchantId) + '/origins/' + encodeURIComponent(selectedOrigin.id) + '/mappings')
        originMappings = Array.isArray(originMappingPayload?.mappings) ? originMappingPayload.mappings : []
      }
    }
  } catch {
    error = 'Mapping tidak tersedia saat ini.'
  }

  if (state.currentRoute !== snapshotRoute || state.currentRoute !== '/destination-mappings' || !elements.contentPanel) return
  const route = routeConfig('/destination-mappings')
  const content = renderDestinationMappingsContent({ merchants, origins, originMappings, destinationMappings, query, error })
  elements.contentPanel.innerHTML = renderPageShell({ ...route, content })
}

function destinationMappingQueryFromHash() {
  const queryText = (window.location.hash.split('?')[1] || '').trim()
  const params = new URLSearchParams(queryText)
  return {
    merchantId: params.get('merchant_id') || '',
    originId: params.get('origin_id') || '',
    courier: normalizeCourierFilter(params.get('courier') || 'JNE') || 'JNE',
    isActive: normalizeActiveFilter(params.get('is_active') || 'true') || 'true',
  }
}

function destinationMappingHash(query) {
  const params = new URLSearchParams()
  if (query.merchantId) params.set('merchant_id', query.merchantId)
  if (query.originId) params.set('origin_id', query.originId)
  if (query.courier) params.set('courier', query.courier)
  if (query.isActive) params.set('is_active', query.isActive)
  return '#/destination-mappings?' + params.toString()
}

function renderDestinationMappingsContent({ merchants, origins, originMappings, destinationMappings, query, error }) {
  const selectedOrigin = origins.find((origin) => origin.id === query.originId) || origins[0]
  return '<div id="destination-mappings-root" class="management-grid">'
    + renderDestinationMappingFilter(merchants, origins, query)
    + (selectedOrigin ? renderOriginMappingForm(query.merchantId, selectedOrigin) : '<div class="form-card"><h3>Origin mapping</h3><p class="muted">Buat origin terlebih dahulu.</p></div>')
    + renderDestinationMappingCreateForm(query.merchantId)
    + renderOriginMappingList(originMappings, error)
    + renderDestinationMappingList(destinationMappings, error)
    + '</div>'
}

function renderDestinationMappingFilter(merchants, origins, query) {
  const merchantOptions = merchants.map((merchant) => optionHtml(merchant.id, merchant.name + ' (' + merchant.slug + ')', query.merchantId)).join('')
  const originOptions = origins.map((origin) => optionHtml(origin.id, origin.code + ' - ' + origin.name, query.originId)).join('')
  return '<form class="form-card wide-card" data-form="destination-mapping-filter"><h3>Filter mappings</h3><div class="form-grid split-grid">'
    + '<label><span>Merchant</span><select name="merchant_id">' + merchantOptions + '</select></label>'
    + '<label><span>Origin</span><select name="origin_id"><option value="">Default/first origin</option>' + originOptions + '</select></label>'
    + '<label><span>Courier</span><select name="courier">' + courierOptions(query.courier) + '</select></label>'
    + '<label><span>Status</span><select name="is_active">' + optionHtml('true', 'Active', query.isActive) + optionHtml('false', 'Inactive', query.isActive) + optionHtml('', 'All', query.isActive) + '</select></label>'
    + '<button class="button" type="submit">Load mappings</button>'
    + '</div></form>'
}

function renderOriginMappingList(mappings, error) {
  const rows = mappings.map((mapping) => [
    escapeHtml(mapping.courier),
    escapeHtml(mapping.providerCode),
    escapeHtml(mapping.label || '-'),
    escapeHtml(mapping.isActive ? 'Active' : 'Inactive'),
  ])
  return '<div class="form-card wide-card"><div class="section-title"><h3>Origin mappings</h3><span>' + escapeHtml(mappings.length) + ' rows</span></div>'
    + renderUnsafeTable({ columns: ['Courier', 'Provider origin', 'Label', 'Status'], rows, emptyMessage: error || 'Belum ada origin mapping.' })
    + '</div>'
}

function renderDestinationMappingList(mappings, error) {
  const rows = mappings.map((mapping) => [
    escapeHtml(mapping.courier),
    escapeHtml(mapping.providerCode),
    escapeHtml(mapping.postalCode || '-'),
    escapeHtml([mapping.subdistrict, mapping.district, mapping.city, mapping.province].filter(Boolean).join(', ') || '-'),
    escapeHtml(mapping.isActive ? 'Active' : 'Inactive'),
    '<button class="button button-secondary" data-action="toggle-destination-mapping" data-id="' + escapeHtml(mapping.id) + '" data-active="' + escapeHtml(String(!mapping.isActive)) + '">' + escapeHtml(mapping.isActive ? 'Deactivate' : 'Activate') + '</button>',
  ])
  return '<div class="form-card wide-card"><div class="section-title"><h3>Destination mappings</h3><span>' + escapeHtml(mappings.length) + ' rows</span></div>'
    + renderUnsafeTable({ columns: ['Courier', 'Provider dest', 'Postal', 'Area', 'Status', 'Action'], rows, emptyMessage: error || 'Belum ada destination mapping.' })
    + '</div>'
}

function renderCourierServicesLoading() {
  return '<div id="courier-services-root" class="management-grid"><div class="form-card wide-card"><h3>Courier services</h3><p class="muted">Memuat katalog dan assignment...</p></div></div>'
}

async function loadCourierServicesPage() {
  const snapshotRoute = state.currentRoute
  const query = courierQueryFromHash()
  let merchants = []
  let services = []
  let origins = []
  let assignments = []
  let error = ''

  try {
    const [merchantPayload, servicePayload] = await Promise.all([
      apiGet('/admin/merchants', { limit: 50 }),
      apiGet('/admin/courier-services', { courier: query.courier, status: query.status, limit: 50 }),
    ])
    merchants = Array.isArray(merchantPayload?.merchants) ? merchantPayload.merchants : []
    services = Array.isArray(servicePayload?.services) ? servicePayload.services : []
    query.merchantId = query.merchantId || merchants[0]?.id || ''

    if (query.merchantId) {
      const [originPayload, assignmentPayload] = await Promise.all([
        apiGet('/admin/merchants/' + encodeURIComponent(query.merchantId) + '/origins', { limit: 50 }),
        apiGet('/admin/merchants/' + encodeURIComponent(query.merchantId) + '/courier-services', { limit: 50 }),
      ])
      origins = Array.isArray(originPayload?.origins) ? originPayload.origins : []
      assignments = Array.isArray(assignmentPayload?.services) ? assignmentPayload.services : []
    }
  } catch {
    error = 'Courier service config tidak tersedia saat ini.'
  }

  if (state.currentRoute !== snapshotRoute || state.currentRoute !== '/courier-services' || !elements.contentPanel) return

  const route = routeConfig('/courier-services')
  const content = renderCourierServicesContent({ merchants, services, origins, assignments, query, error })
  elements.contentPanel.innerHTML = renderPageShell({ ...route, content })
}

function courierQueryFromHash() {
  const queryText = (window.location.hash.split('?')[1] || '').trim()
  const params = new URLSearchParams(queryText)
  return {
    merchantId: params.get('merchant_id') || '',
    courier: normalizeCourierFilter(params.get('courier') || ''),
    status: normalizeStatusFilter(params.get('status') || ''),
  }
}

function courierHash(query) {
  const params = new URLSearchParams()
  if (query.merchantId) params.set('merchant_id', query.merchantId)
  if (query.courier) params.set('courier', query.courier)
  if (query.status) params.set('status', query.status)
  return '#/courier-services?' + params.toString()
}

function normalizeCourierFilter(value) {
  return ['MOCK', 'JNE', 'JNT', 'SAP_EXPRESS'].includes(value) ? value : ''
}

function normalizeStatusFilter(value) {
  return ['ACTIVE', 'INACTIVE'].includes(value) ? value : ''
}

function renderCourierServicesContent({ merchants, services, origins, assignments, query, error }) {
  return '<div id="courier-services-root" class="management-grid">'
    + renderCourierFilter(merchants, query)
    + renderCourierServiceForm()
    + renderCourierAssignmentForm(services, origins, query)
    + renderCourierServiceList(services, error)
    + renderCourierAssignmentList(assignments, error)
    + '</div>'
}

function renderCourierFilter(merchants, query) {
  const merchantOptions = merchants.map((merchant) => optionHtml(merchant.id, merchant.name + ' (' + merchant.slug + ')', query.merchantId)).join('')
  return '<form class="form-card wide-card" data-form="courier-filter"><h3>Filter courier config</h3><div class="form-grid split-grid">'
    + '<label><span>Merchant assignment</span><select name="merchant_id">' + merchantOptions + '</select></label>'
    + '<label><span>Courier</span><select name="courier">'
    + optionHtml('', 'Semua courier', query.courier)
    + optionHtml('MOCK', 'MOCK', query.courier)
    + optionHtml('JNE', 'JNE', query.courier)
    + optionHtml('JNT', 'JNT', query.courier)
    + optionHtml('SAP_EXPRESS', 'SAP_EXPRESS', query.courier)
    + '</select></label>'
    + '<label><span>Status</span><select name="status">'
    + optionHtml('', 'Semua status', query.status)
    + optionHtml('ACTIVE', 'ACTIVE', query.status)
    + optionHtml('INACTIVE', 'INACTIVE', query.status)
    + '</select></label>'
    + '<button class="button" type="submit">Load config</button>'
    + '</div></form>'
}

function renderCourierServiceForm() {
  return '<form class="form-card" data-form="courier-service-create"><h3>Create/update service</h3><div class="form-grid">'
    + '<label><span>Courier</span><select name="courier" required>'
    + optionHtml('MOCK', 'MOCK', 'MOCK')
    + optionHtml('JNE', 'JNE', '')
    + optionHtml('JNT', 'JNT', '')
    + optionHtml('SAP_EXPRESS', 'SAP_EXPRESS', '')
    + '</select></label>'
    + '<label><span>Service code</span><input name="service_code" required maxlength="32" placeholder="REG" /></label>'
    + '<label><span>Service name</span><input name="service_name" required maxlength="120" placeholder="Regular" /></label>'
    + '<label><span>Status</span><select name="status">' + optionHtml('ACTIVE', 'ACTIVE', 'ACTIVE') + optionHtml('INACTIVE', 'INACTIVE', '') + '</select></label>'
    + '<label><span>Metadata JSON</span><textarea name="metadata" placeholder="{}"></textarea></label>'
    + '<button class="button" type="submit">Save service</button>'
    + '<p class="muted">Tidak ada credential kurir di UI Sprint 9.</p>'
    + '</div></form>'
}

function renderCourierAssignmentForm(services, origins, query) {
  const serviceOptions = services.map((service) => optionHtml(service.id, service.courier + ' ' + service.serviceCode + ' - ' + service.serviceName, '')).join('')
  const originOptions = '<option value="">Tanpa origin khusus</option>'
    + origins.map((origin) => optionHtml(origin.id, origin.code + ' - ' + origin.name, '')).join('')
  return '<form class="form-card" data-form="courier-assignment-upsert"><h3>Assign to merchant</h3><div class="form-grid">'
    + '<input type="hidden" name="merchant_id" value="' + escapeHtml(query.merchantId) + '" />'
    + '<label><span>Courier service</span><select name="courier_service_id" required>' + serviceOptions + '</select></label>'
    + '<label><span>Origin</span><select name="origin_id">' + originOptions + '</select></label>'
    + '<label><span>Status</span><select name="status">' + optionHtml('ACTIVE', 'ACTIVE', 'ACTIVE') + optionHtml('INACTIVE', 'INACTIVE', '') + '</select></label>'
    + '<button class="button" type="submit">Save assignment</button>'
    + '</div></form>'
}

function renderCourierServiceList(services, error) {
  const rows = services.map((service) => [
    escapeHtml(service.courier),
    escapeHtml(service.serviceCode),
    escapeHtml(service.serviceName),
    escapeHtml(service.status),
    escapeHtml(formatDate(service.updatedAt)),
    '<button class="button button-secondary" data-action="toggle-courier-service" data-id="' + escapeHtml(service.id) + '" data-status="' + escapeHtml(service.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE') + '">' + escapeHtml(service.status === 'ACTIVE' ? 'Deactivate' : 'Activate') + '</button>',
  ])
  return '<div class="form-card wide-card"><div class="section-title"><h3>Courier service catalog</h3><span>' + escapeHtml(services.length) + ' services</span></div>'
    + renderUnsafeTable({ columns: ['Courier', 'Code', 'Name', 'Status', 'Updated', 'Action'], rows, emptyMessage: error || 'Belum ada courier service.' })
    + '</div>'
}

function renderCourierAssignmentList(assignments, error) {
  const rows = assignments.map((assignment) => [
    escapeHtml(assignment.courierService?.courier || '-'),
    escapeHtml((assignment.courierService?.serviceCode || '-') + ' - ' + (assignment.courierService?.serviceName || '-')),
    escapeHtml(assignment.origin ? assignment.origin.code + ' - ' + assignment.origin.name : '-'),
    escapeHtml(assignment.status),
    escapeHtml(formatDate(assignment.updatedAt)),
  ])
  return '<div class="form-card wide-card"><div class="section-title"><h3>Merchant assignments</h3><span>' + escapeHtml(assignments.length) + ' assignments</span></div>'
    + renderUnsafeTable({ columns: ['Courier', 'Service', 'Origin', 'Status', 'Updated'], rows, emptyMessage: error || 'Belum ada assignment.' })
    + '</div>'
}

function renderReadOnlyLoading(title) {
  return '<div class="form-card wide-card"><h3>' + escapeHtml(title) + '</h3><p class="muted">Memuat data read-only...</p></div>'
}

async function loadShipmentsPage() {
  const snapshotRoute = state.currentRoute
  const query = shipmentQueryFromHash()
  let shipments = []
  let error = ''
  try {
    const payload = await apiGet('/admin/shipments', { ...query, limit: 50 })
    shipments = Array.isArray(payload?.shipments) ? payload.shipments : []
  } catch {
    error = 'Shipment tidak tersedia saat ini.'
  }
  if (state.currentRoute !== snapshotRoute || state.currentRoute !== '/shipments' || !elements.contentPanel) return
  const route = routeConfig('/shipments')
  elements.contentPanel.innerHTML = renderPageShell({ ...route, content: renderShipmentsContent(query, shipments, error) })
}

async function loadWebhookRelaysPage() {
  const snapshotRoute = state.currentRoute
  const query = relayQueryFromHash()
  let relays = []
  let error = ''
  try {
    const payload = await apiGet('/admin/webhook-relays', { ...query, limit: 50 })
    relays = Array.isArray(payload?.attempts) ? payload.attempts : []
  } catch {
    error = 'Webhook relay tidak tersedia saat ini.'
  }
  if (state.currentRoute !== snapshotRoute || state.currentRoute !== '/webhook-relays' || !elements.contentPanel) return
  const route = routeConfig('/webhook-relays')
  elements.contentPanel.innerHTML = renderPageShell({ ...route, content: renderRelaysContent(query, relays, error) })
}

async function loadAuditLogsPage() {
  const snapshotRoute = state.currentRoute
  const query = auditQueryFromHash()
  let logs = []
  let error = ''
  try {
    const payload = await apiGet('/admin/audit-logs', { ...query, limit: 50 })
    logs = Array.isArray(payload?.logs) ? payload.logs : []
  } catch {
    error = 'Audit logs tidak tersedia saat ini.'
  }
  if (state.currentRoute !== snapshotRoute || state.currentRoute !== '/audit-logs' || !elements.contentPanel) return
  const route = routeConfig('/audit-logs')
  elements.contentPanel.innerHTML = renderPageShell({ ...route, content: renderAuditLogsContent(query, logs, error) })
}

function shipmentQueryFromHash() {
  const params = hashParams()
  return compactQuery({
    merchant_id: params.get('merchant_id') || '',
    status: normalizeShipmentStatus(params.get('status') || ''),
    courier: normalizeCourierFilter(params.get('courier') || ''),
    external_order_id: params.get('external_order_id') || '',
    waybill_id: params.get('waybill_id') || '',
  })
}

function relayQueryFromHash() {
  const params = hashParams()
  return compactQuery({
    merchant_id: params.get('merchant_id') || '',
    endpoint_id: params.get('endpoint_id') || '',
    event_id: params.get('event_id') || '',
    status: normalizeRelayStatus(params.get('status') || ''),
  })
}

function auditQueryFromHash() {
  const params = hashParams()
  return compactQuery({
    method: normalizeAuditMethod(params.get('method') || ''),
    path: params.get('path') || '',
    status_min: params.get('status_min') || '',
    status_max: params.get('status_max') || '',
  })
}

function hashParams() {
  return new URLSearchParams((window.location.hash.split('?')[1] || '').trim())
}

function compactQuery(query) {
  return Object.fromEntries(Object.entries(query).filter(([, value]) => value !== ''))
}

function normalizeShipmentStatus(value) {
  return ['DRAFT', 'BOOKED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RETURNED', 'FAILED', 'CANCELLED'].includes(value) ? value : ''
}

function normalizeRelayStatus(value) {
  return ['PENDING', 'SUCCESS', 'FAILED'].includes(value) ? value : ''
}

function normalizeAuditMethod(value) {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(value) ? value : ''
}

function readOnlyHash(route, query) {
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  })
  const queryText = params.toString()
  return '#' + route + (queryText ? '?' + queryText : '')
}

function renderShipmentsContent(query, shipments, error) {
  return '<div class="management-grid">'
    + renderShipmentsFilter(query)
    + renderShipmentsTable(shipments, error)
    + '</div>'
}

function renderShipmentsFilter(query) {
  return '<form class="form-card wide-card" data-form="shipments-filter"><h3>Filter shipments</h3><div class="form-grid split-grid">'
    + '<label><span>Merchant ID</span><input name="merchant_id" value="' + escapeHtml(query.merchant_id || '') + '" /></label>'
    + '<label><span>Status</span><select name="status">' + shipmentStatusOptions(query.status || '') + '</select></label>'
    + '<label><span>Courier</span><select name="courier">' + courierOptions(query.courier || '') + '</select></label>'
    + '<label><span>External order ID</span><input name="external_order_id" value="' + escapeHtml(query.external_order_id || '') + '" /></label>'
    + '<label><span>Waybill ID</span><input name="waybill_id" value="' + escapeHtml(query.waybill_id || '') + '" /></label>'
    + '<button class="button" type="submit">Apply filter</button>'
    + '</div></form>'
}

function renderShipmentsTable(shipments, error) {
  const rows = shipments.map((shipment) => [
    escapeHtml(shipment.merchant?.name || shipment.merchantId),
    escapeHtml(shipment.courier + ' / ' + shipment.status),
    escapeHtml(shipment.externalOrderId),
    escapeHtml(shipment.waybillId || '-'),
    escapeHtml(shipment.serviceCode + (shipment.serviceName ? ' - ' + shipment.serviceName : '')),
    escapeHtml(shipment.originCode + ' -> ' + shipment.destCode),
    escapeHtml(String(shipment.weightGrams) + 'g / ' + (shipment.rateIdr ?? '-')),
    escapeHtml('T:' + (shipment.counts?.tracking ?? 0) + ' E:' + (shipment.counts?.events ?? 0)),
    escapeHtml(formatDate(shipment.createdAt) + ' / ' + formatDate(shipment.updatedAt)),
  ])
  return '<div class="form-card wide-card"><div class="section-title"><h3>Shipments</h3><span>' + escapeHtml(shipments.length) + ' rows</span></div>'
    + renderUnsafeTable({ columns: ['Merchant', 'Courier/Status', 'External Order', 'Waybill', 'Service', 'Origin/Dest', 'Weight/Rate', 'Counts', 'Created/Updated'], rows, emptyMessage: error || 'Belum ada shipment.' })
    + '</div>'
}

function renderRelaysContent(query, relays, error) {
  return '<div class="management-grid">'
    + renderRelaysFilter(query)
    + renderRelaysTable(relays, error)
    + '</div>'
}

function renderRelaysFilter(query) {
  return '<form class="form-card wide-card" data-form="relays-filter"><h3>Filter webhook relays</h3><div class="form-grid split-grid">'
    + '<label><span>Merchant ID</span><input name="merchant_id" value="' + escapeHtml(query.merchant_id || '') + '" /></label>'
    + '<label><span>Endpoint ID</span><input name="endpoint_id" value="' + escapeHtml(query.endpoint_id || '') + '" /></label>'
    + '<label><span>Event ID</span><input name="event_id" value="' + escapeHtml(query.event_id || '') + '" /></label>'
    + '<label><span>Status</span><select name="status">' + relayStatusOptions(query.status || '') + '</select></label>'
    + '<button class="button" type="submit">Apply filter</button>'
    + '</div></form>'
}

function renderRelaysTable(relays, error) {
  const rows = relays.map((relay) => [
    escapeHtml(relay.status + ' / attempts ' + relay.attemptCount),
    escapeHtml(formatDate(relay.nextRetryAt)),
    longText(relay.lastError || '-'),
    longText(relay.endpoint?.url || '-'),
    escapeHtml((relay.event?.eventType || '-') + ' / ' + (relay.event?.courier || '-')),
    escapeHtml(relay.event?.shipment ? relay.event.shipment.externalOrderId + ' / ' + (relay.event.shipment.waybillId || '-') : '-'),
    escapeHtml(formatDate(relay.updatedAt)),
  ])
  return '<div class="form-card wide-card"><div class="section-title"><h3>Webhook relays</h3><span>' + escapeHtml(relays.length) + ' rows</span></div>'
    + renderUnsafeTable({ columns: ['Status', 'Next retry', 'Last error', 'Endpoint URL', 'Event', 'Shipment', 'Updated'], rows, emptyMessage: error || 'Belum ada relay.' })
    + '</div>'
}

function renderAuditLogsContent(query, logs, error) {
  return '<div class="management-grid">'
    + renderAuditFilter(query)
    + renderAuditTable(logs, error)
    + '</div>'
}

function renderAuditFilter(query) {
  return '<form class="form-card wide-card" data-form="audit-filter"><h3>Filter audit logs</h3><div class="form-grid split-grid">'
    + '<label><span>Method</span><select name="method">' + auditMethodOptions(query.method || '') + '</select></label>'
    + '<label><span>Path</span><input name="path" value="' + escapeHtml(query.path || '') + '" /></label>'
    + '<label><span>Status min</span><input name="status_min" type="number" min="100" max="599" value="' + escapeHtml(query.status_min || '') + '" /></label>'
    + '<label><span>Status max</span><input name="status_max" type="number" min="100" max="599" value="' + escapeHtml(query.status_max || '') + '" /></label>'
    + '<button class="button" type="submit">Apply filter</button>'
    + '</div></form>'
}

function renderAuditTable(logs, error) {
  const rows = logs.map((log) => [
    escapeHtml(log.method),
    longText(log.path),
    escapeHtml(String(log.status)),
    escapeHtml(String(log.durationMs) + 'ms'),
    longText(log.requestId || '-'),
    longText(log.ipAddress || '-'),
    longText(log.userAgent || '-'),
    escapeHtml(formatDate(log.createdAt)),
  ])
  return '<div class="form-card wide-card"><div class="section-title"><h3>Audit logs</h3><span>' + escapeHtml(logs.length) + ' rows</span></div>'
    + renderUnsafeTable({ columns: ['Method', 'Path', 'Status', 'Duration', 'Request ID', 'IP', 'User Agent', 'Created'], rows, emptyMessage: error || 'Belum ada audit log.' })
    + '</div>'
}

function courierOptions(selected) {
  return optionHtml('', 'Semua courier', selected)
    + optionHtml('MOCK', 'MOCK', selected)
    + optionHtml('JNE', 'JNE', selected)
    + optionHtml('JNT', 'JNT', selected)
    + optionHtml('SAP_EXPRESS', 'SAP_EXPRESS', selected)
}

function shipmentStatusOptions(selected) {
  return optionHtml('', 'Semua status', selected)
    + ['DRAFT', 'BOOKED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RETURNED', 'FAILED', 'CANCELLED'].map((status) => optionHtml(status, status, selected)).join('')
}

function relayStatusOptions(selected) {
  return optionHtml('', 'Semua status', selected)
    + ['PENDING', 'SUCCESS', 'FAILED'].map((status) => optionHtml(status, status, selected)).join('')
}

function auditMethodOptions(selected) {
  return optionHtml('', 'Semua method', selected)
    + ['POST', 'PUT', 'PATCH', 'DELETE'].map((method) => optionHtml(method, method, selected)).join('')
}

function longText(value) {
  const safeValue = escapeHtml(value)
  return '<span class="truncate-text" title="' + safeValue + '">' + safeValue + '</span>'
}

function scheduleProviderOriginLookup(input) {
  window.clearTimeout(providerOriginLookupTimer)
  providerOriginLookupTimer = window.setTimeout(() => {
    void loadProviderOriginLookup(input)
  }, 280)
}

async function loadProviderOriginLookup(input) {
  const form = input.closest('form')
  const results = form?.querySelector('[data-provider-origin-results]')
  if (!(results instanceof HTMLElement)) return

  const search = input.value.trim()
  if (search.length < 2) {
    results.innerHTML = ''
    return
  }

  const courierInput = form?.querySelector('select[name="courier"]')
  const courier = courierInput instanceof HTMLSelectElement ? courierInput.value : 'JNE'
  results.innerHTML = '<div class="lookup-state">Mencari area...</div>'

  try {
    const payload = await apiGet('/admin/provider-origins', { courier, search, is_active: true, limit: 8 })
    const origins = Array.isArray(payload?.origins) ? payload.origins : []
    results.innerHTML = origins.length > 0
      ? origins.map(renderProviderOriginOption).join('')
      : '<div class="lookup-state">Belum ada hasil. Import katalog origin atau isi kode manual.</div>'
  } catch {
    results.innerHTML = '<div class="lookup-state is-error">Lookup origin belum tersedia.</div>'
  }
}

function renderProviderOriginOption(origin) {
  const label = providerOriginLabel(origin)
  const detail = [origin.subdistrict, origin.district, origin.city, origin.province, origin.postalCode].filter(Boolean).join(', ')
  return '<button class="lookup-option" type="button" data-action="select-provider-origin" data-provider-code="'
    + escapeHtml(origin.providerCode || '')
    + '" data-provider-label="'
    + escapeHtml(label)
    + '"><strong>'
    + escapeHtml(origin.providerCode || '-')
    + '</strong><span>'
    + escapeHtml(label)
    + '</span><small>'
    + escapeHtml(detail || origin.courier || '-')
    + '</small></button>'
}

function providerOriginLabel(origin) {
  return String(origin.label || [origin.subdistrict, origin.district, origin.city, origin.province].filter(Boolean).join(', ') || origin.providerCode || '').trim()
}

function selectProviderOrigin(button) {
  const form = button.closest('form')
  if (!(form instanceof HTMLFormElement)) return
  const providerCodeInput = form.querySelector('input[name="provider_code"]')
  const labelInput = form.querySelector('input[name="label"]')
  const searchInput = form.querySelector('input[name="provider_origin_search"]')
  const results = form.querySelector('[data-provider-origin-results]')
  const providerCode = button.dataset.providerCode || ''
  const label = button.dataset.providerLabel || ''

  if (providerCodeInput instanceof HTMLInputElement) providerCodeInput.value = providerCode
  if (labelInput instanceof HTMLInputElement) labelInput.value = label
  if (searchInput instanceof HTMLInputElement) searchInput.value = providerCode + (label ? ' - ' + label : '')
  if (results instanceof HTMLElement) results.innerHTML = ''
  showNotice('Provider origin dipilih.', 'success')
}

async function handleContentForm(form) {
  const formName = form.dataset.form || ''
  if (formName === 'setup-filter') return applySetupFilter(form)
  if (formName === 'merchant-filter') return applyMerchantFilter(form)
  if (formName === 'merchant-create') return createMerchant(form)
  if (formName === 'merchant-update') return updateMerchant(form)
  if (formName === 'api-key-create') return createApiKey(form)
  if (formName === 'webhook-create') return createWebhookEndpoint(form)
  if (formName === 'stores-origins-filter') return applyStoresOriginsFilter(form)
  if (formName === 'store-create') return createStore(form)
  if (formName === 'origin-create') return createOrigin(form)
  if (formName === 'origin-mapping-upsert') return upsertOriginMapping(form)
  if (formName === 'destination-mapping-filter') return applyDestinationMappingFilter(form)
  if (formName === 'destination-mapping-create') return createDestinationMapping(form)
  if (formName === 'courier-filter') return applyCourierFilter(form)
  if (formName === 'courier-service-create') return saveCourierService(form)
  if (formName === 'courier-assignment-upsert') return saveCourierAssignment(form)
  if (formName === 'shipments-filter') return applyShipmentsFilter(form)
  if (formName === 'relays-filter') return applyRelaysFilter(form)
  if (formName === 'audit-filter') return applyAuditFilter(form)
}

async function handleContentAction(button) {
  const action = button.dataset.action || ''
  if (action === 'select-provider-origin') {
    selectProviderOrigin(button)
    return
  }
  if (action === 'toggle-api-key') {
    await apiJson('PATCH', '/admin/api-keys/' + encodeURIComponent(button.dataset.id || ''), { is_active: button.dataset.active === 'true' })
    showNotice('Status API key diperbarui.', 'success')
    await loadMerchantDetail(state.selectedMerchantId)
  }
  if (action === 'toggle-webhook') {
    await apiJson('PATCH', '/admin/webhook-endpoints/' + encodeURIComponent(button.dataset.id || ''), { is_active: button.dataset.active === 'true' })
    showNotice('Status webhook endpoint diperbarui.', 'success')
    await loadMerchantDetail(state.selectedMerchantId)
  }
  if (action === 'toggle-store') {
    await apiJson('PATCH', '/admin/stores/' + encodeURIComponent(button.dataset.id || ''), { is_active: button.dataset.active === 'true' })
    showNotice('Status store diperbarui.', 'success')
    await loadStoresOrigins()
  }
  if (action === 'toggle-origin') {
    await apiJson('PATCH', '/admin/origins/' + encodeURIComponent(button.dataset.id || ''), { is_active: button.dataset.active === 'true' })
    showNotice('Status origin diperbarui.', 'success')
    await loadStoresOrigins()
  }
  if (action === 'default-origin') {
    await apiJson('PATCH', '/admin/origins/' + encodeURIComponent(button.dataset.id || ''), { is_default: true })
    showNotice('Default origin diperbarui.', 'success')
    await loadStoresOrigins()
  }
  if (action === 'toggle-courier-service') {
    await apiJson('PATCH', '/admin/courier-services/' + encodeURIComponent(button.dataset.id || ''), { status: button.dataset.status || 'INACTIVE' })
    showNotice('Status courier service diperbarui.', 'success')
    await loadCourierServicesPage()
  }
  if (action === 'toggle-destination-mapping') {
    await apiJson('PATCH', '/admin/destination-mappings/' + encodeURIComponent(button.dataset.id || ''), { is_active: button.dataset.active === 'true' })
    showNotice('Status destination mapping diperbarui.', 'success')
    await loadDestinationMappingsPage()
  }
}

function applySetupFilter(form) {
  const data = new FormData(form)
  window.location.hash = setupHash({ merchantId: String(data.get('merchant_id') || '').trim() }).slice(1)
}

function applyMerchantFilter(form) {
  const data = new FormData(form)
  const query = {
    search: String(data.get('search') || '').trim(),
    isActive: normalizeActiveFilter(String(data.get('is_active') || '')),
    limit: clampNumber(data.get('limit'), 20, 5, 50),
    offset: clampNumber(data.get('offset'), 0, 0, 100000),
  }
  window.location.hash = merchantHash(query).slice(1)
}

async function createMerchant(form) {
  const data = new FormData(form)
  const payload = await apiJson('POST', '/admin/merchants', {
    slug: String(data.get('slug') || '').trim(),
    name: String(data.get('name') || '').trim(),
    is_active: data.get('is_active') === 'on',
  })
  form.reset()
  showNotice('Merchant berhasil dibuat.', 'success')
  if (state.currentRoute === '/setup') {
    const merchantId = payload?.merchant?.id || payload?.id || ''
    if (merchantId) window.location.hash = setupHash({ merchantId }).slice(1)
    else await loadSetupPage()
    return
  }
  await loadMerchants()
}

async function updateMerchant(form) {
  const data = new FormData(form)
  await apiJson('PATCH', '/admin/merchants/' + encodeURIComponent(state.selectedMerchantId), {
    name: String(data.get('name') || '').trim(),
    is_active: data.get('is_active') === 'on',
  })
  showNotice('Merchant berhasil diperbarui.', 'success')
  await loadMerchantDetail(state.selectedMerchantId)
}

async function createApiKey(form) {
  const data = new FormData(form)
  const merchantId = String(data.get('merchant_id') || state.selectedMerchantId || '').trim()
  if (!merchantId) {
    showNotice('Pilih merchant sebelum membuat API key.', 'error')
    return
  }
  const expiresAt = data.get('expires_at') ? new Date(String(data.get('expires_at'))).toISOString() : undefined
  const payload = await apiJson('POST', '/admin/merchants/' + encodeURIComponent(merchantId) + '/api-keys', {
    label: optionalString(data.get('label')),
    expires_at: expiresAt,
  })
  form.reset()
  showNotice('API key berhasil dibuat. Simpan plaintext sekarang.', 'success')
  if (state.currentRoute === '/setup') await loadSetupPage()
  else await loadMerchantDetail(state.selectedMerchantId)
  renderOneTimeKey(payload?.plaintext || '')
}

async function createWebhookEndpoint(form) {
  const data = new FormData(form)
  const merchantId = String(data.get('merchant_id') || state.selectedMerchantId || '').trim()
  if (!merchantId) {
    showNotice('Pilih merchant sebelum membuat webhook endpoint.', 'error')
    return
  }
  await apiJson('POST', '/admin/merchants/' + encodeURIComponent(merchantId) + '/webhook-endpoints', {
    merchant_id: merchantId,
    url: String(data.get('url') || '').trim(),
    secret: String(data.get('secret') || ''),
    is_active: data.get('is_active') === 'on',
  })
  form.reset()
  showNotice('Webhook endpoint berhasil dibuat.', 'success')
  if (state.currentRoute === '/setup') await loadSetupPage()
  else await loadMerchantDetail(state.selectedMerchantId)
}

function applyStoresOriginsFilter(form) {
  const data = new FormData(form)
  const query = {
    merchantId: String(data.get('merchant_id') || ''),
    storeId: String(data.get('store_id') || ''),
  }
  window.location.hash = storesOriginsHash(query).slice(1)
}

async function createStore(form) {
  const data = new FormData(form)
  const merchantId = String(data.get('merchant_id') || '')
  await apiJson('POST', '/admin/merchants/' + encodeURIComponent(merchantId) + '/stores', {
    slug: String(data.get('slug') || '').trim(),
    name: String(data.get('name') || '').trim(),
    is_active: data.get('is_active') === 'on',
  })
  form.reset()
  showNotice('Store berhasil dibuat.', 'success')
  if (state.currentRoute === '/setup') {
    await loadSetupPage()
    return
  }
  await loadStoresOrigins()
}

async function createOrigin(form) {
  const data = new FormData(form)
  const merchantId = String(data.get('merchant_id') || '')
  await apiJson('POST', '/admin/merchants/' + encodeURIComponent(merchantId) + '/origins', {
    store_id: optionalString(data.get('store_id')),
    code: String(data.get('code') || '').trim(),
    name: String(data.get('name') || '').trim(),
    address: optionalString(data.get('address')),
    city: optionalString(data.get('city')),
    province: optionalString(data.get('province')),
    postal_code: optionalString(data.get('postal_code')),
    phone: optionalString(data.get('phone')),
    is_default: data.get('is_default') === 'on',
    is_active: data.get('is_active') === 'on',
  })
  form.reset()
  showNotice('Origin berhasil dibuat.', 'success')
  if (state.currentRoute === '/setup') {
    await loadSetupPage()
    return
  }
  await loadStoresOrigins()
}

function applyDestinationMappingFilter(form) {
  const data = new FormData(form)
  const query = {
    merchantId: String(data.get('merchant_id') || '').trim(),
    originId: String(data.get('origin_id') || '').trim(),
    courier: normalizeCourierFilter(String(data.get('courier') || '')),
    isActive: normalizeActiveFilter(String(data.get('is_active') || '')),
  }
  window.location.hash = destinationMappingHash(query).slice(1)
}

async function upsertOriginMapping(form) {
  const data = new FormData(form)
  const merchantId = String(data.get('merchant_id') || '').trim()
  const originId = String(data.get('origin_id') || '').trim()
  if (!merchantId || !originId) {
    showNotice('Merchant dan origin wajib dipilih sebelum menyimpan mapping origin.', 'error')
    return
  }

  await apiJson('POST', '/admin/merchants/' + encodeURIComponent(merchantId) + '/origins/' + encodeURIComponent(originId) + '/mappings', {
    courier: String(data.get('courier') || '').trim(),
    provider_code: String(data.get('provider_code') || '').trim(),
    label: optionalString(data.get('label')),
    is_active: data.get('is_active') === 'on',
  })
  form.reset()
  showNotice('Origin mapping berhasil disimpan.', 'success')
  if (state.currentRoute === '/setup') await loadSetupPage()
  else await loadDestinationMappingsPage()
}

async function createDestinationMapping(form) {
  const data = new FormData(form)
  const merchantId = String(data.get('merchant_id') || '').trim()
  if (!merchantId) {
    showNotice('Pilih merchant sebelum membuat destination mapping.', 'error')
    return
  }

  await apiJson('POST', '/admin/merchants/' + encodeURIComponent(merchantId) + '/destination-mappings', {
    courier: String(data.get('courier') || '').trim(),
    provider_code: String(data.get('provider_code') || '').trim(),
    postal_code: optionalString(data.get('postal_code')),
    province: optionalString(data.get('province')),
    city: optionalString(data.get('city')),
    district: optionalString(data.get('district')),
    subdistrict: optionalString(data.get('subdistrict')),
    label: optionalString(data.get('label')),
    is_active: data.get('is_active') === 'on',
  })
  form.reset()
  showNotice('Destination mapping berhasil disimpan.', 'success')
  if (state.currentRoute === '/setup') await loadSetupPage()
  else await loadDestinationMappingsPage()
}

function applyCourierFilter(form) {
  const data = new FormData(form)
  const query = {
    merchantId: String(data.get('merchant_id') || ''),
    courier: normalizeCourierFilter(String(data.get('courier') || '')),
    status: normalizeStatusFilter(String(data.get('status') || '')),
  }
  window.location.hash = courierHash(query).slice(1)
}

function applyShipmentsFilter(form) {
  const data = new FormData(form)
  window.location.hash = readOnlyHash('/shipments', compactQuery({
    merchant_id: String(data.get('merchant_id') || '').trim(),
    status: normalizeShipmentStatus(String(data.get('status') || '')),
    courier: normalizeCourierFilter(String(data.get('courier') || '')),
    external_order_id: String(data.get('external_order_id') || '').trim(),
    waybill_id: String(data.get('waybill_id') || '').trim(),
  })).slice(1)
}

function applyRelaysFilter(form) {
  const data = new FormData(form)
  window.location.hash = readOnlyHash('/webhook-relays', compactQuery({
    merchant_id: String(data.get('merchant_id') || '').trim(),
    endpoint_id: String(data.get('endpoint_id') || '').trim(),
    event_id: String(data.get('event_id') || '').trim(),
    status: normalizeRelayStatus(String(data.get('status') || '')),
  })).slice(1)
}

function applyAuditFilter(form) {
  const data = new FormData(form)
  window.location.hash = readOnlyHash('/audit-logs', compactQuery({
    method: normalizeAuditMethod(String(data.get('method') || '')),
    path: String(data.get('path') || '').trim(),
    status_min: String(data.get('status_min') || '').trim(),
    status_max: String(data.get('status_max') || '').trim(),
  })).slice(1)
}

async function saveCourierService(form) {
  const data = new FormData(form)
  const metadata = parseMetadataJson(String(data.get('metadata') || '').trim())
  if (metadata === null) return

  await apiJson('POST', '/admin/courier-services', {
    courier: String(data.get('courier') || ''),
    service_code: String(data.get('service_code') || '').trim(),
    service_name: String(data.get('service_name') || '').trim(),
    status: String(data.get('status') || 'ACTIVE'),
    metadata,
  })
  form.reset()
  showNotice('Courier service berhasil disimpan.', 'success')
  await loadCourierServicesPage()
}

async function saveCourierAssignment(form) {
  const data = new FormData(form)
  const merchantId = String(data.get('merchant_id') || '')
  const serviceId = String(data.get('courier_service_id') || '')
  await apiJson('PUT', '/admin/merchants/' + encodeURIComponent(merchantId) + '/courier-services/' + encodeURIComponent(serviceId), {
    origin_id: optionalString(data.get('origin_id')),
    status: String(data.get('status') || 'ACTIVE'),
  })
  showNotice('Courier assignment berhasil disimpan.', 'success')
  await loadCourierServicesPage()
}

function parseMetadataJson(value) {
  if (!value) return {}
  try {
    const parsed = JSON.parse(value)
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
      showNotice('Metadata harus berupa JSON object.', 'error')
      return null
    }
    return parsed
  } catch {
    showNotice('Metadata JSON tidak valid.', 'error')
    return null
  }
}

function optionalString(value) {
  const text = String(value || '').trim()
  return text ? text : undefined
}

function renderOneTimeKey(plaintext) {
  const target = document.getElementById('one-time-key')
  if (!target || !plaintext) return
  target.innerHTML = '<div class="secret-box"><strong>Plaintext API key - tampil sekali</strong><code>' + escapeHtml(plaintext) + '</code></div>'
}

function optionHtml(value, label, selectedValue) {
  return '<option value="' + escapeHtml(value) + '" ' + (value === selectedValue ? 'selected' : '') + '>' + escapeHtml(label) + '</option>'
}

function renderUnsafeTable({ columns, rows, emptyMessage = 'Belum ada data.' }) {
  const safeColumns = columns.map((column) => '<th scope="col">' + escapeHtml(column) + '</th>').join('')
  const safeRows = rows.length > 0
    ? rows.map((row) => '<tr>' + row.map((cell) => '<td>' + String(cell) + '</td>').join('') + '</tr>').join('')
    : '<tr><td colspan="' + columns.length + '">' + escapeHtml(emptyMessage) + '</td></tr>'

  return '<div class="table-wrap"><table><thead><tr>' + safeColumns + '</tr></thead><tbody>' + safeRows + '</tbody></table></div>'
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
    .replace(/eyJ[A-Za-z0-9._-]+/g, '[redacted-token]')
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}/g, '[redacted-email]')
    .replace(/([A-Za-z]:)?[\\\\/][^\\s]+/g, '[redacted-path]')
    .slice(0, 180)
}

function logout(message, type = 'success') {
  state.adminToken = ''
  state.lastError = type === 'error' ? message : ''
  state.lastSuccess = type === 'success' ? message : ''
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(AUTH_PROVIDER_KEY)
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
    .replace(/eyJ[A-Za-z0-9._-]+/g, '[redacted-token]')
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

