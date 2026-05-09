import fastify from 'fastify'
import type { FastifyInstance } from 'fastify'
import jwt from '@fastify/jwt'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'

import { env } from './env/index.js'
import { authRoutes } from './routes/auth.js'
import { campanhasRoutes } from './routes/campanhas.js'
import { estoqueRoutes } from './routes/estoque.js'
import { fidelidadeRoutes } from './routes/fidelidade.js'
import { helloRoutes } from './routes/hello.js'
import { logsAuditoriaRoutes } from './routes/logs-auditoria.js'
import { movimentacoesEstoqueRoutes } from './routes/movimentacoes-estoque.js'
import { pagamentosRoutes } from './routes/pagamentos.js'
import { pedidosRoutes } from './routes/pedidos.js'
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
        'API REST para a rede Raízes do Nordeste — gestão multicanal, estoque por unidade e pedidos. Rotas versionadas sob `/v1`.\n\n' +
        '**Perfis (JWT `perfil`):** **ADMIN** — usuários da rede e cadastros globais; **GERENTE** — mesma gestão operacional que ADMIN em unidades, cardápio, estoque, movimentações e campanhas (não gerencia contas em `/usuarios`); **CLIENTE** — pedidos e pagamentos próprios; **COZINHA** / **BALCAO** — fila e status na unidade vinculada, pagamentos conforme rota. Leia o *summary* e a *description* de cada operação: **GET** de catálogo em geral é **qualquer perfil autenticado**; **escritas** de catálogo são **ADMIN ou GERENTE** salvo indicação contrária.',
      version: '1.0.0'
    },
    servers: [{ url: '/v1', description: 'Versao atual da API (prefixo comum das rotas REST)' }],
    tags: [
      { name: 'auth', description: 'Autenticação' },
      { name: 'hello', description: 'Rotas de exemplo' },
      { name: 'usuarios', description: 'Gestao de usuarios' },
      { name: 'unidades', description: 'Unidades da rede' },
      { name: 'produtos', description: 'Produtos do cardapio' },
      { name: 'estoque', description: 'Estoque por unidade' },
      { name: 'movimentacoes-estoque', description: 'Movimentacoes de estoque' },
      { name: 'campanhas', description: 'Campanhas e promocoes sazonais (desconto percentual)' },
      { name: 'pedidos', description: 'Pedidos e itens' },
      { name: 'pagamentos', description: 'Pagamentos mock' },
      { name: 'fidelidade', description: 'Programa de fidelidade' },
      { name: 'logs-auditoria', description: 'Trilha de auditoria (somente leitura)' }
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

async function registerV1Routes(instance: FastifyInstance) {
  await instance.register(authRoutes, { prefix: '/auth' })
  await instance.register(helloRoutes)
  await instance.register(unidadesRoutes)
  await instance.register(produtosRoutes)
  await instance.register(estoqueRoutes)
  await instance.register(fidelidadeRoutes)
  await instance.register(movimentacoesEstoqueRoutes)
  await instance.register(campanhasRoutes)
  await instance.register(pedidosRoutes)
  await instance.register(pagamentosRoutes)
  await instance.register(logsAuditoriaRoutes)
  await instance.register(usersRoutes)
}

void app.register(registerV1Routes, { prefix: '/v1' })

void app.register(swaggerUi, {
  routePrefix: '/documentation'
})
