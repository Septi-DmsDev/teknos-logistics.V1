export const adminStyles = `:root {
  color-scheme: light;
  --bg: #f5f7fb;
  --panel: #ffffff;
  --panel-muted: #f8fafc;
  --text: #172033;
  --muted: #64748b;
  --border: #dbe3ef;
  --primary: #2563eb;
  --primary-dark: #1d4ed8;
  --danger: #dc2626;
  --success: #16a34a;
  --warning: #d97706;
  --shadow: 0 18px 45px rgba(15, 23, 42, 0.08);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
}

button, input, select, textarea { font: inherit; }

a { color: inherit; text-decoration: none; }

.admin-shell {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  min-height: 100vh;
}

.sidebar {
  background: #0f172a;
  color: #e2e8f0;
  padding: 24px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 32px;
}

.brand-mark {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: linear-gradient(135deg, #2563eb, #06b6d4);
  color: white;
  font-weight: 800;
}

.brand strong, .brand small { display: block; }
.brand small { color: #94a3b8; margin-top: 2px; }

.nav-list { display: grid; gap: 6px; }

.nav-list a {
  display: block;
  padding: 10px 12px;
  border-radius: 10px;
  color: #cbd5e1;
}

.nav-list a:hover,
.nav-list a.is-active {
  background: rgba(148, 163, 184, 0.16);
  color: white;
}

.main-panel { padding: 28px; min-width: 0; }

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 22px;
}

.topbar h1, .panel h2 { margin: 0; }
.topbar-actions { display: flex; align-items: center; gap: 10px; }

.eyebrow {
  margin: 0 0 6px;
  color: var(--primary);
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.muted { color: var(--muted); }

.panel {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 22px;
  box-shadow: var(--shadow);
}

.content-stack { display: grid; gap: 18px; }
.login-panel { max-width: 720px; display: grid; gap: 18px; }

.form-grid { display: grid; gap: 14px; }
.form-grid label { display: grid; gap: 8px; font-weight: 700; }
.form-grid input, .form-grid select, .form-grid textarea {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 11px 12px;
  background: white;
  color: var(--text);
}

.button {
  border: 0;
  border-radius: 12px;
  padding: 11px 16px;
  background: var(--primary);
  color: white;
  font-weight: 800;
  cursor: pointer;
}

.button:hover { background: var(--primary-dark); }
.button-secondary { background: #e2e8f0; color: #0f172a; }
.button-secondary:hover { background: #cbd5e1; }

.notice {
  margin-bottom: 18px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--panel-muted);
}

.notice.is-error { border-color: #fecaca; background: #fff1f2; color: #991b1b; }
.notice.is-success { border-color: #bbf7d0; background: #f0fdf4; color: #166534; }

.status-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 0.82rem;
  font-weight: 800;
}

.status-muted { background: #e2e8f0; color: #334155; }
.status-success { background: #dcfce7; color: #166534; }
.status-warning { background: #fef3c7; color: #92400e; }
.status-danger { background: #fee2e2; color: #991b1b; }

.card-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-top: 18px;
}

.metric-card {
  border: 1px solid var(--border);
  background: var(--panel-muted);
  border-radius: 16px;
  padding: 16px;
}

.metric-card strong { display: block; margin-top: 6px; font-size: 1.2rem; }
.metric-label { color: var(--muted); font-size: 0.8rem; font-weight: 800; text-transform: uppercase; }

.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 10px 12px; border-bottom: 1px solid var(--border); text-align: left; vertical-align: top; }
th { color: var(--muted); font-size: 0.82rem; text-transform: uppercase; letter-spacing: 0.04em; }

@media (max-width: 900px) {
  .admin-shell { grid-template-columns: 1fr; }
  .sidebar { position: static; }
  .main-panel { padding: 18px; }
  .topbar { align-items: flex-start; flex-direction: column; }
  .card-grid { grid-template-columns: 1fr; }
}`
