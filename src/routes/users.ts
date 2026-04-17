import { randomUUID } from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

import { db } from '../database.js'
import {
  forbiddenError,
  invalidPayloadError,
  invalidUserCreationPayloadError,
  invalidUserUpdatePayloadError
} from '../http/errors.js'
import { authenticate } from '../middlewares/authenticate.js'
import { hashPassword } from '../utils/password.js'

const errorResponseSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' },
    message: { type: 'string' }
  },
  required: ['error', 'message']
} as const

export async function usersRoutes(app: FastifyInstance) {
  // Cadastro administrativo de usuários: apenas perfis elevados podem criar contas.
  app.post(
    '/usuarios',
    {
      preHandler: [authenticate],
      attachValidation: true,
      schema: {
        tags: ['usuarios'],
        summary: 'Criar usuario (somente ADMIN)',
        description:
          'Cria um novo usuario com perfil informado. Requer token JWT com perfil ADMIN.',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['nome', 'email', 'senha', 'perfil'],
          properties: {
            nome: { type: 'string', minLength: 1 },
            email: { type: 'string', format: 'email' },
            senha: { type: 'string', minLength: 6 },
            perfil: { type: 'string', enum: ['ADMIN', 'GERENTE', 'CLIENTE', 'COZINHA', 'BALCAO'] },
            data_nascimento: { type: 'string', format: 'date' }
          }
        },
        response: {
          201: {
            type: 'object',
            required: ['id', 'nome', 'email', 'perfil', 'data_nascimento', 'criado_em'],
            properties: {
              id: { type: 'string', format: 'uuid' },
              nome: { type: 'string' },
              email: { type: 'string', format: 'email' },
              perfil: { type: 'string' },
              data_nascimento: { type: ['string', 'null'], format: 'date' },
              criado_em: { type: 'string', format: 'date-time' }
            }
          },
          400: { description: 'Payload invalido', ...errorResponseSchema },
          401: { description: 'Token invalido/ausente', ...errorResponseSchema },
          403: { description: 'Perfil sem permissao', ...errorResponseSchema },
          409: { description: 'Email ja cadastrado', ...errorResponseSchema }
        }
      }
    },
    async (request, reply) => {
      // Normaliza erros de schema do Fastify/AJV para o formato padrão da API.
      if (request.validationError) {
        return reply.status(400).send(invalidUserCreationPayloadError())
      }

      // Regra de autorização: somente ADMIN pode cadastrar usuários.
      const authUser = request.user as { perfil?: string } | undefined
      if (authUser?.perfil !== 'ADMIN') {
        return reply.status(403).send(forbiddenError())
      }

      const bodySchema = z.object({
        nome: z.string().trim().min(1),
        email: z.string().trim().email(),
        senha: z.string().min(6),
        perfil: z.enum(['ADMIN', 'GERENTE', 'CLIENTE', 'COZINHA', 'BALCAO']),
        data_nascimento: z.string().date().optional()
      })

      const parsedBody = bodySchema.safeParse(request.body)
      if (!parsedBody.success) {
        return reply.status(400).send(invalidPayloadError())
      }

      const { nome, email, senha, perfil, data_nascimento } = parsedBody.data

      // Garante unicidade de email para evitar contas duplicadas.
      const existingUser = await db('usuarios').where({ email }).first()
      if (existingUser) {
        return reply.status(409).send({
          error: 'CONFLITO',
          message: 'Email ja cadastrado.'
        })
      }

      const id = randomUUID()
      // Persistimos apenas hash; senha em texto puro nunca vai para o banco.
      const senha_hash = hashPassword(senha)

      await db('usuarios').insert({
        id,
        nome,
        email,
        senha_hash,
        perfil,
        data_nascimento: data_nascimento ?? null,
        criado_em: db.fn.now()
      })

      // Retorna apenas dados públicos do usuário recém-criado.
      const createdUser = await db('usuarios')
        .select('id', 'nome', 'email', 'perfil', 'data_nascimento', 'criado_em')
        .where({ id })
        .first()

      return reply.status(201).send(createdUser)
    }
  )

  // Atualizar usuario (somente ADMIN)
  app.put(
    '/usuarios/:id',
    {
      preHandler: [authenticate],
      attachValidation: true,
      schema: {
        tags: ['usuarios'],
        summary: 'Atualizar usuario (somente ADMIN)',
        description:
          'Atualiza dados de um usuario existente. Requer token JWT com perfil ADMIN.',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' }
          }
        },
        body: {
          type: 'object',
          properties: {
            nome: { type: 'string', minLength: 1 },
            email: { type: 'string', format: 'email' },
            senha: { type: 'string', minLength: 6 },
            perfil: { type: 'string', enum: ['ADMIN', 'GERENTE', 'CLIENTE', 'COZINHA', 'BALCAO'] },
            data_nascimento: { type: 'string', format: 'date' }
          },
          minProperties: 1
        },
        response: {
          200: {
            type: 'object',
            required: ['id', 'nome', 'email', 'perfil', 'data_nascimento', 'criado_em'],
            properties: {
              id: { type: 'string', format: 'uuid' },
              nome: { type: 'string' },
              email: { type: 'string', format: 'email' },
              perfil: { type: 'string' },
              data_nascimento: { type: ['string', 'null'], format: 'date' },
              criado_em: { type: 'string', format: 'date-time' }
            }
          },
          400: { description: 'Payload invalido', ...errorResponseSchema },
          401: { description: 'Token invalido/ausente', ...errorResponseSchema },
          403: { description: 'Perfil sem permissao', ...errorResponseSchema },
          404: { description: 'Usuario nao encontrado', ...errorResponseSchema },
          409: { description: 'Email ja cadastrado', ...errorResponseSchema }
        }
      }
    },
    async (request, reply) => {
      // Mantemos a resposta de validação em português e no padrão da API.
      if (request.validationError) {
        return reply.status(400).send({
          error: 'DADOS_INVALIDOS',
          message:
            'Dados de atualizacao invalidos. Informe ao menos um campo valido para atualizar.'
        })
      }

      const authUser = request.user as { perfil?: string } | undefined
      if (authUser?.perfil !== 'ADMIN') {
        return reply.status(403).send(forbiddenError())
      }

      const paramsSchema = z.object({
        id: z.string().uuid()
      })

      const bodySchema = z
        .object({
          nome: z.string().trim().min(1).optional(),
          email: z.string().trim().email().optional(),
          senha: z.string().min(6).optional(),
          perfil: z.enum(['ADMIN', 'GERENTE', 'CLIENTE', 'COZINHA', 'BALCAO']).optional(),
          data_nascimento: z.string().date().optional()
        })
        .refine((data) => Object.keys(data).length > 0)

      const parsedParams = paramsSchema.safeParse(request.params)
      const parsedBody = bodySchema.safeParse(request.body)

      if (!parsedParams.success) {
        return reply.status(400).send({
          error: 'DADOS_INVALIDOS',
          message: 'O id na URL deve ser um UUID valido.'
        })
      }

      if (!parsedBody.success) {
        return reply.status(400).send(invalidUserUpdatePayloadError())
      }

      const { id } = parsedParams.data
      const { nome, email, senha, perfil, data_nascimento } = parsedBody.data

      // Antes de atualizar, garante que o usuário alvo existe.
      const targetUser = await db('usuarios').where({ id }).first()
      if (!targetUser) {
        return reply.status(404).send({
          error: 'NAO_ENCONTRADO',
          message: 'Usuario nao encontrado.'
        })
      }

      if (email) {
        // Evita dois usuários distintos com o mesmo email.
        const userWithSameEmail = await db('usuarios')
          .where({ email })
          .whereNot({ id })
          .first()

        if (userWithSameEmail) {
          return reply.status(409).send({
            error: 'CONFLITO',
            message: 'Email ja cadastrado.'
          })
        }
      }

      const patch: Record<string, unknown> = {}
      if (nome !== undefined) patch.nome = nome
      if (email !== undefined) patch.email = email
      if (perfil !== undefined) patch.perfil = perfil
      if (data_nascimento !== undefined) patch.data_nascimento = data_nascimento
      if (senha !== undefined) patch.senha_hash = hashPassword(senha)

      await db('usuarios').where({ id }).update(patch)

      const updatedUser = await db('usuarios')
        .select('id', 'nome', 'email', 'perfil', 'data_nascimento', 'criado_em')
        .where({ id })
        .first()

      return reply.status(200).send(updatedUser)
    }
  )

  // Remover usuario (somente ADMIN)
  app.delete(
    '/usuarios/:id',
    {
      preHandler: [authenticate],
      attachValidation: true,
      schema: {
        tags: ['usuarios'],
        summary: 'Remover usuario (somente ADMIN)',
        description: 'Exclui um usuario pelo id. Requer token JWT com perfil ADMIN.',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' }
          }
        },
        response: {
          204: { description: 'Usuario removido' },
          400: { description: 'Id invalido', ...errorResponseSchema },
          401: { description: 'Token invalido/ausente', ...errorResponseSchema },
          403: { description: 'Perfil sem permissao', ...errorResponseSchema },
          404: { description: 'Usuario nao encontrado', ...errorResponseSchema }
        }
      }
    },
    async (request, reply) => {
      // Mesma regra do create/update: apenas ADMIN pode operar usuários.
      if (request.validationError) {
        return reply.status(400).send({
          error: 'DADOS_INVALIDOS',
          message: 'O id na URL deve ser um UUID valido.'
        })
      }

      const authUser = request.user as { perfil?: string } | undefined
      if (authUser?.perfil !== 'ADMIN') {
        return reply.status(403).send(forbiddenError())
      }

      const paramsSchema = z.object({
        id: z.string().uuid()
      })

      const parsedParams = paramsSchema.safeParse(request.params)
      if (!parsedParams.success) {
        return reply.status(400).send({
          error: 'DADOS_INVALIDOS',
          message: 'O id na URL deve ser um UUID valido.'
        })
      }

      const { id } = parsedParams.data

      // DELETE retorna quantas linhas foram afetadas.
      const deleted = await db('usuarios').where({ id }).del()
      if (deleted === 0) {
        return reply.status(404).send({
          error: 'NAO_ENCONTRADO',
          message: 'Usuario nao encontrado.'
        })
      }

      return reply.status(204).send()
    }
  )
}
