import type { FastifyInstance } from 'fastify'
import { authenticate } from '../middlewares/authenticate.js'

export async function helloRoutes(app: FastifyInstance) {
  // Exemplo de rota protegida usando middleware de autenticação.
  app.get('/hello', { preHandler: [authenticate] }, async (_request, reply) => {
    return reply.status(200).send({
      message: 'Ola mundo autenticado com JWT.'
    })
  })
}
