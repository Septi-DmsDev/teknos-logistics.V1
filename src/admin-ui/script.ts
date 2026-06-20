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

  if (state.currentRoute === '/dashboard') {
    void loadDashboard()
  }

  if (state.currentRoute === '/merchants') {
    void loadMerchants()
  }

  if (state.currentRoute === '/merchant/:id') {
    void loadMerchantDetail(state.selectedMerchantId)
  }
}

function routeConfig(route) {
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
    ['Merchants', '#/merchants'],
    ['Stores & Origins', '#/stores-origins'],
    ['Courier Services', '#/courier-services'],
    ['Shipments', '#/shipments'],
    ['Webhook Relays', '#/webhook-relays'],
    ['Audit Logs', '#/audit-logs'],
  ]
  return '<div class="quick-links"><h3>Quick Links</h3><div>'
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

function renderApiKeyCreateForm() {
  return '<form class="form-card" data-form="api-key-create"><h3>Create API key</h3><div class="form-grid">'
    + '<label><span>Label</span><input name="label" maxlength="80" placeholder="Staging key / production key" /></label>'
    + '<label><span>Expires at</span><input name="expires_at" type="datetime-local" /></label>'
    + '<button class="button" type="submit">Create API key</button>'
    + '<p class="muted">Plaintext key hanya muncul sekali setelah dibuat.</p>'
    + '</div></form>'
}

function renderWebhookCreateForm() {
  return '<form class="form-card" data-form="webhook-create"><h3>Create webhook endpoint</h3><div class="form-grid">'
    + '<label><span>HTTPS URL</span><input name="url" required type="url" placeholder="https://example.com/api/logistics/webhook" /></label>'
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

async function handleContentForm(form) {
  const formName = form.dataset.form || ''
  if (formName === 'merchant-filter') return applyMerchantFilter(form)
  if (formName === 'merchant-create') return createMerchant(form)
  if (formName === 'merchant-update') return updateMerchant(form)
  if (formName === 'api-key-create') return createApiKey(form)
  if (formName === 'webhook-create') return createWebhookEndpoint(form)
}

async function handleContentAction(button) {
  const action = button.dataset.action || ''
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
  await apiJson('POST', '/admin/merchants', {
    slug: String(data.get('slug') || '').trim(),
    name: String(data.get('name') || '').trim(),
    is_active: data.get('is_active') === 'on',
  })
  form.reset()
  showNotice('Merchant berhasil dibuat.', 'success')
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
  const expiresAt = data.get('expires_at') ? new Date(String(data.get('expires_at'))).toISOString() : undefined
  const payload = await apiJson('POST', '/admin/merchants/' + encodeURIComponent(state.selectedMerchantId) + '/api-keys', {
    label: optionalString(data.get('label')),
    expires_at: expiresAt,
  })
  form.reset()
  showNotice('API key berhasil dibuat. Simpan plaintext sekarang.', 'success')
  await loadMerchantDetail(state.selectedMerchantId)
  renderOneTimeKey(payload?.plaintext || '')
}

async function createWebhookEndpoint(form) {
  const data = new FormData(form)
  await apiJson('POST', '/admin/merchants/' + encodeURIComponent(state.selectedMerchantId) + '/webhook-endpoints', {
    url: String(data.get('url') || '').trim(),
    secret: String(data.get('secret') || ''),
    is_active: data.get('is_active') === 'on',
  })
  form.reset()
  showNotice('Webhook endpoint berhasil dibuat.', 'success')
  await loadMerchantDetail(state.selectedMerchantId)
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

