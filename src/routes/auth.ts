import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

import { db } from '../database.js'
import { verifyPassword } from '../utils/password.js'

export async function authRoutes(app: FastifyInstance) {
  // Endpoint público para autenticação inicial do usuário.
  app.post('/login', async (request, reply) => {
    // Validação básica do contrato de entrada do login.
    const bodySchema = z.object({
      email: z.string().email(),
      senha: z.string().min(1)
    })

    const parsedBody = bodySchema.safeParse(request.body)

    if (!parsedBody.success) {
      return reply.status(400).send({
        error: 'DADOS_INVALIDOS',
        message: 'Email e senha devem ser enviados no formato correto.'
      })
    }

    const { email, senha } = parsedBody.data

    // Busca apenas os campos necessários para autenticação.
    const user = await db('usuarios')
      .select('id', 'nome', 'email', 'senha_hash', 'perfil')
      .where({ email })
      .first()

    // Resposta padronizada para não expor se o email existe ou não.
    if (!user || !verifyPassword(senha, user.senha_hash)) {
      return reply.status(401).send({
        error: 'CREDENCIAIS_INVALIDAS',
        message: 'Email ou senha invalidos.'
      })
    }

    // O token carrega identificação e perfil para futuras autorizações.
    const accessToken = await reply.jwtSign(
      { sub: user.id, perfil: user.perfil },
      { expiresIn: '1h' }
    )

    // Retorno do login seguindo padrão Bearer para uso no Authorization header.
    return reply.status(200).send({
      accessToken,
      tokenType: 'Bearer',
      expiresIn: 3600,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        perfil: user.perfil
      }
    })
  })
}
