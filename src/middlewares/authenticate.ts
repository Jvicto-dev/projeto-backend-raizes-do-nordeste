import type { FastifyReply, FastifyRequest } from 'fastify'

// Middleware para validar token JWT em rotas protegidas.
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
  } catch {
    return reply.status(401).send({
      error: 'NAO_AUTORIZADO',
      message: 'Token ausente, invalido ou expirado.'
    })
  }
}
