import { serve } from '@hono/node-server'
import { createApp } from './app.js'
import { env } from './config/env.js'

serve({ fetch: createApp().fetch, port: env.PORT }, (info) => {
  console.log(`teknos-logistics listening on http://localhost:${info.port}`)
})
