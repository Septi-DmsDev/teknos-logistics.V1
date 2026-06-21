export const adminHtml = `<!doctype html>
<html lang="id">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Teknos Logistics Admin</title>
    <link rel="stylesheet" href="/admin-ui/assets/styles.css" />
  </head>
  <body>
    <div id="app" class="admin-shell is-unauthenticated" data-app="teknos-logistics-admin">
      <aside class="sidebar" aria-label="Admin navigation">
        <div class="brand">
          <span class="brand-mark">TL</span>
          <div>
            <strong>Teknos Logistics</strong>
            <small>Operator Console</small>
          </div>
        </div>
        <nav class="nav-list">
          <a href="#/setup" data-route="setup">Setup</a>
          <a href="#/dashboard" data-route="dashboard">Overview</a>
          <a href="#/merchants" data-route="merchants">Merchants &amp; Keys</a>
          <a href="#/stores-origins" data-route="stores-origins">Origins</a>
          <a href="#/destination-mappings" data-route="destination-mappings">Mappings</a>
          <a href="#/courier-services" data-route="courier-services">Services</a>
          <a href="#/shipments" data-route="shipments">Shipments</a>
          <a href="#/webhook-relays" data-route="webhook-relays">Webhook Relay</a>
          <a href="#/audit-logs" data-route="audit-logs">Audit</a>
        </nav>
      </aside>

      <main class="main-panel">
        <header class="topbar">
          <div>
            <h1 id="page-title">Admin Control Center</h1>
          </div>
          <div class="topbar-actions">
            <span id="auth-status" class="status-badge status-muted">Token required</span>
            <button id="logout-button" class="button button-secondary" type="button" hidden>Logout</button>
          </div>
        </header>

        <section id="notice" class="notice" hidden></section>

        <section id="login-panel" class="login-panel" aria-labelledby="login-title">
          <div class="login-card">
            <div class="login-brand">
              <span class="brand-mark">TL</span>
              <div>
                <strong>Teknos Logistics</strong>
                <small>Admin Control Center</small>
              </div>
            </div>
            <div class="login-copy">
              <h2 id="login-title">Masuk Admin</h2>
              <p id="login-help" class="muted">Gunakan login Supabase untuk akses admin production. Token manual hanya fallback sementara untuk staging/dev.</p>
            </div>
          <form id="token-form" class="form-grid">
            <label data-auth-field="email">
              <span>Email admin</span>
              <input id="admin-email" name="admin-email" type="email" autocomplete="username" placeholder="admin@teknos.id" />
            </label>
            <label data-auth-field="password">
              <span>Password</span>
              <input id="admin-password" name="admin-password" type="password" autocomplete="current-password" placeholder="Password Supabase" />
            </label>
            <label data-auth-field="token">
              <span>Admin token</span>
              <input id="admin-token" name="admin-token" type="password" autocomplete="off" placeholder="Bearer token" />
            </label>
            <button id="login-submit" class="button" type="submit">Masuk</button>
          </form>
          <div class="login-footnote">
            <span>Token dan sesi hanya disimpan di browser session.</span>
            <span>Tidak ada credential kurir yang ditampilkan di UI ini.</span>
          </div>
          </div>
        </section>

        <section id="content-panel" class="content-stack" hidden>
          <section class="panel">
            <h2>Memuat konsol</h2>
            <p class="muted">Jika halaman tidak berubah, periksa token admin dan koneksi server lokal.</p>
          </section>
        </section>
      </main>
    </div>
    <script type="module" src="/admin-ui/assets/app.js"></script>
  </body>
</html>`
