import fastify from 'fastify'
import jwt from '@fastify/jwt'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'

import { env } from './env/index.js'
import { authRoutes } from './routes/auth.js'
import { estoqueRoutes } from './routes/estoque.js'
import { helloRoutes } from './routes/hello.js'
import { produtosRoutes } from './routes/produtos.js'
import { unidadesRoutes } from './routes/unidades.js'
import { usersRoutes } from './routes/users.js'

// coerceTypes: querystring vem como string; o Ajv converte para numero nos schemas (integer).
export const app = fastify({
  ajv: {
    customOptions: {
      coerceTypes: true
    }
  }
})

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
      { name: 'hello', description: 'Rotas de exemplo' },
      { name: 'usuarios', description: 'Gestao de usuarios' },
      { name: 'unidades', description: 'Unidades da rede' },
      { name: 'produtos', description: 'Produtos do cardapio' },
      { name: 'estoque', description: 'Estoque por unidade' }
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
void app.register(unidadesRoutes)
void app.register(produtosRoutes)
void app.register(estoqueRoutes)
void app.register(usersRoutes)

void app.register(swaggerUi, {
  routePrefix: '/documentation'
})