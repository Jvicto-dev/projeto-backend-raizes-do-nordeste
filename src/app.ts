import fastify from 'fastify'
import jwt from '@fastify/jwt'

import { env } from './env/index.js'
import { authRoutes } from './routes/auth.js'
import { helloRoutes } from './routes/hello.js'

export const app = fastify()

void app.register(jwt, {
  secret: env.JWT_SECRET
})

// Rotas de autenticação
app.register(authRoutes, {
  prefix: '/auth'
})

app.register(helloRoutes)