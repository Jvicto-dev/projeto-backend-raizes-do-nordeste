import type { FastifyInstance } from 'fastify'

export async function helloRoutes(app: FastifyInstance) {
  app.get('/hello', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch {
      return reply.status(401).send({
        error: 'NAO_AUTORIZADO',
        message: 'Token ausente, invalido ou expirado.'
      })
    }

    return reply.status(200).send({
      message: 'Ola mundo autenticado com JWT.'
    })
  })
}
