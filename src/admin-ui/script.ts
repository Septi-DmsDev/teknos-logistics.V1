export const adminScript = `const TOKEN_KEY = 'teknos-logistics-admin-token'

const state = {
  token: sessionStorage.getItem(TOKEN_KEY) || '',
}

const elements = {
  form: document.getElementById('token-form'),
  tokenInput: document.getElementById('admin-token'),
  loginPanel: document.getElementById('login-panel'),
  contentPanel: document.getElementById('content-panel'),
  authStatus: document.getElementById('auth-status'),
  logoutButton: document.getElementById('logout-button'),
  notice: document.getElementById('notice'),
}

function bootstrap() {
  elements.form?.addEventListener('submit', (event) => {
    event.preventDefault()
    const token = elements.tokenInput?.value.trim() || ''
    if (!token) {
      showNotice('Admin token wajib diisi.', 'error')
      return
    }
    state.token = token
    sessionStorage.setItem(TOKEN_KEY, token)
    elements.tokenInput.value = ''
    showNotice('Token tersimpan untuk sesi browser ini.', 'success')
    renderAuthState()
  })

  elements.logoutButton?.addEventListener('click', () => {
    state.token = ''
    sessionStorage.removeItem(TOKEN_KEY)
    showNotice('Token admin dihapus dari sesi browser.', 'success')
    renderAuthState()
  })

  renderAuthState()
  highlightActiveRoute()
  window.addEventListener('hashchange', highlightActiveRoute)
}

function renderAuthState() {
  const authenticated = state.token.length > 0
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

function highlightActiveRoute() {
  const current = (window.location.hash || '#/dashboard').replace(/^#\\//, '')
  document.querySelectorAll('[data-route]').forEach((item) => {
    item.classList.toggle('is-active', item.getAttribute('data-route') === current)
  })
}

function showNotice(message, type = 'success') {
  if (!elements.notice) return
  elements.notice.textContent = message
  elements.notice.hidden = false
  elements.notice.className = type === 'error' ? 'notice is-error' : 'notice is-success'
}

bootstrap()`


