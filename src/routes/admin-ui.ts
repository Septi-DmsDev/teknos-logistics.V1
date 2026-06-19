import type { Hono } from 'hono'
import { adminHtml } from '../admin-ui/html.js'
import { adminScript } from '../admin-ui/script.js'
import { adminStyles } from '../admin-ui/styles.js'

export function mountAdminUiRoutes(app: Hono): void {
  app.get('/admin-ui', (c) => c.html(adminHtml))
  app.get('/admin-ui/assets/styles.css', (c) => {
    c.header('content-type', 'text/css; charset=utf-8')
    return c.body(adminStyles)
  })
  app.get('/admin-ui/assets/app.js', (c) => {
    c.header('content-type', 'application/javascript; charset=utf-8')
    return c.body(adminScript)
  })
}
