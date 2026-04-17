import fastify from 'fastify'
import jwt from '@fastify/jwt'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'

import { env } from './env/index.js'
import { authRoutes } from './routes/auth.js'
import { helloRoutes } from './routes/hello.js'

export const app = fastify()

void app.register(jwt, {
  secret: env.JWT_SECRET
})

void app.register(swagger, {
  openapi: {
    openapi: '3.0.3',
    info: {
      title: 'Raízes do Nordeste API',
      description:
        'API REST para a rede Raízes do Nordeste — gestão multicanal, estoque por unidade e pedidos.',
      version: '1.0.0'
    },
    tags: [
      { name: 'auth', description: 'Autenticação' },
      { name: 'hello', description: 'Rotas de exemplo' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  }
})

// Rotas de autenticação
void app.register(authRoutes, {
  prefix: '/auth'
})

void app.register(helloRoutes)

void app.register(swaggerUi, {
  routePrefix: '/documentation'
})