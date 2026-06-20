export const adminHtml = `<!doctype html>
<html lang="id">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Teknos Logistics Admin</title>
    <link rel="stylesheet" href="/admin-ui/assets/styles.css" />
  </head>
  <body>
    <div id="app" class="admin-shell" data-app="teknos-logistics-admin">
      <aside class="sidebar" aria-label="Admin navigation">
        <div class="brand">
          <span class="brand-mark">TL</span>
          <div>
            <strong>Teknos Logistics</strong>
            <small>Control Center</small>
          </div>
        </div>
        <nav class="nav-list">
          <a href="#/dashboard" data-route="dashboard">Dashboard</a>
          <a href="#/merchants" data-route="merchants">Merchants</a>
          <a href="#/stores-origins" data-route="stores-origins">Stores &amp; Origins</a>
          <a href="#/courier-services" data-route="courier-services">Courier Services</a>
          <a href="#/shipments" data-route="shipments">Shipments</a>
          <a href="#/webhook-relays" data-route="webhook-relays">Webhook Relays</a>
          <a href="#/audit-logs" data-route="audit-logs">Audit Logs</a>
        </nav>
      </aside>

      <main class="main-panel">
        <header class="topbar">
          <div>
            <p class="eyebrow">Internal Operations</p>
            <h1 id="page-title">Admin Control Center</h1>
          </div>
          <div class="topbar-actions">
            <span id="auth-status" class="status-badge status-muted">Token required</span>
            <button id="logout-button" class="button button-secondary" type="button" hidden>Logout</button>
          </div>
        </header>

        <section id="notice" class="notice" hidden></section>

        <section id="login-panel" class="panel login-panel" aria-labelledby="login-title">
          <div>
            <p class="eyebrow">Admin Access</p>
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
        </section>

        <section id="content-panel" class="content-stack" hidden>
          <section class="panel">
            <p class="eyebrow">Sprint 9</p>
            <h2>Control Center shell siap</h2>
            <p class="muted">UI shell sudah aktif. Dashboard dan halaman operasional akan diisi pada task berikutnya.</p>
            <div class="card-grid">
              <article class="metric-card">
                <span class="metric-label">API Boundary</span>
                <strong>/admin/*</strong>
                <p class="muted">Semua data operasional tetap lewat admin API.</p>
              </article>
              <article class="metric-card">
                <span class="metric-label">Safety</span>
                <strong>No AWB Action</strong>
                <p class="muted">Shell ini tidak memiliki aksi membuat resi nyata.</p>
              </article>
              <article class="metric-card">
                <span class="metric-label">Next</span>
                <strong>Client Foundation</strong>
                <p class="muted">Task 2 akan menambahkan router, state, dan API client.</p>
              </article>
            </div>
          </section>
        </section>
      </main>
    </div>
    <script type="module" src="/admin-ui/assets/app.js"></script>
  </body>
</html>`
