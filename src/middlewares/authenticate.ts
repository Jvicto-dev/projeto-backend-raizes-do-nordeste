import type { FastifyReply, FastifyRequest } from 'fastify'
import { unauthorizedError } from '../http/errors.js'

// Middleware para validar token JWT em rotas protegidas.
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
  } catch {
    return reply.status(401).send(unauthorizedError())
  }
}
