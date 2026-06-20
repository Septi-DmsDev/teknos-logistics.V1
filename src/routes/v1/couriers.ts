import type { Hono } from 'hono'
import { listCourierCapabilities } from '../../couriers/capabilities.js'

export function mountCourierRoutes(app: Hono): void {
  app.get('/v1/couriers/capabilities', (c) => c.json({ couriers: listCourierCapabilities() }))
}
