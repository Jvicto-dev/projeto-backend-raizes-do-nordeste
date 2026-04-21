import { randomUUID } from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

import { db } from '../database.js'
import {
  forbiddenError,
  invalidProdutoCreationPayloadError,
  invalidProdutoUpdatePayloadError
} from '../http/errors.js'
import { authenticate } from '../middlewares/authenticate.js'

const errorResponseSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' },
    message: { type: 'string' }
  },
  required: ['error', 'message']
} as const

const produtoResponseProps = {
  type: 'object',
  required: ['id', 'nome', 'descricao', 'preco_base', 'categoria'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    nome: { type: 'string' },
    descricao: { type: ['string', 'null'] },
    preco_base: { type: 'number' },
    categoria: { type: 'string' }
  }
} as const

function serializeProduto(row: {
  id: string
  nome: string
  descricao: string | null
  preco_base: string | number
  categoria: string
}) {
  return {
    id: row.id,
    nome: row.nome,
    descricao: row.descricao,
    preco_base: Number(row.preco_base),
    categoria: row.categoria
  }
}

function isAdmin(request: { user?: unknown }): boolean {
  const authUser = request.user as { perfil?: string } | undefined
  return authUser?.perfil === 'ADMIN'
}

export async function produtosRoutes(app: FastifyInstance) {
  app.get(
    '/produtos',
    {
      preHandler: [authenticate],
      attachValidation: true,
      schema: {
        tags: ['produtos'],
        summary: 'Listar produtos',
        description:
          'Lista produtos com paginacao. Opcionalmente filtra por categoria exata. Requer JWT.',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              minimum: 1,
              default: 1,
              description: 'Numero da pagina (comeca em 1)'
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 10,
              description: 'Registros por pagina (maximo 100)'
            },
            categoria: {
              type: 'string',
              minLength: 1,
              description: 'Se informado, filtra por categoria (correspondencia exata)'
            }
          }
        },
        response: {
          200: {
            type: 'object',
            required: ['data', 'page', 'limit', 'total'],
            properties: {
              data: { type: 'array', items: produtoResponseProps },
              page: { type: 'integer' },
              limit: { type: 'integer' },
              total: { type: 'integer' }
            }
          },
          400: { description: 'Parametros invalidos', ...errorResponseSchema },
          401: { description: 'Token invalido/ausente', ...errorResponseSchema }
        }
      }
    },
    async (request, reply) => {
      if (request.validationError) {
        return reply.status(400).send({
          error: 'DADOS_INVALIDOS',
          message:
            'Parametros invalidos. Use page >= 1, limit entre 1 e 100 e categoria opcional (texto).'
        })
      }

      const q = request.query as { page?: number; limit?: number; categoria?: string }
      const page = typeof q.page === 'number' && q.page >= 1 ? q.page : 1
      let limit = typeof q.limit === 'number' && q.limit >= 1 ? q.limit : 10
      if (limit > 100) limit = 100
      const offset = (page - 1) * limit

      let countQuery = db('produtos')
      let listQuery = db('produtos')
        .select('id', 'nome', 'descricao', 'preco_base', 'categoria')
        .orderBy('nome', 'asc')

      if (typeof q.categoria === 'string' && q.categoria.trim().length > 0) {
        const cat = q.categoria.trim()
        countQuery = countQuery.where({ categoria: cat })
        listQuery = listQuery.where({ categoria: cat })
      }

      const [countRow] = await countQuery.count('* as total')
      const total = Number((countRow as { total: string }).total ?? 0)

      const rows = await listQuery.limit(limit).offset(offset)
      const data = rows.map((row) => serializeProduto(row))

      return reply.status(200).send({ data, page, limit, total })
    }
  )

  app.get(
    '/produtos/:id',
    {
      preHandler: [authenticate],
      attachValidation: true,
      schema: {
        tags: ['produtos'],
        summary: 'Buscar produto por id',
        description: 'Retorna um produto pelo UUID. Requer JWT.',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' }
          }
        },
        response: {
          200: produtoResponseProps,
          400: { description: 'Id invalido', ...errorResponseSchema },
          401: { description: 'Token invalido/ausente', ...errorResponseSchema },
          404: { description: 'Produto nao encontrado', ...errorResponseSchema }
        }
      }
    },
    async (request, reply) => {
      if (request.validationError) {
        return reply.status(400).send({
          error: 'DADOS_INVALIDOS',
          message: 'O id na URL deve ser um UUID valido.'
        })
      }

      const paramsSchema = z.object({ id: z.string().uuid() })
      const parsed = paramsSchema.safeParse(request.params)
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'DADOS_INVALIDOS',
          message: 'O id na URL deve ser um UUID valido.'
        })
      }

      const row = await db('produtos')
        .select('id', 'nome', 'descricao', 'preco_base', 'categoria')
        .where({ id: parsed.data.id })
        .first()

      if (!row) {
        return reply.status(404).send({
          error: 'NAO_ENCONTRADO',
          message: 'Produto nao encontrado.'
        })
      }

      return reply.status(200).send(serializeProduto(row))
    }
  )

  app.post(
    '/produtos',
    {
      preHandler: [authenticate],
      attachValidation: true,
      schema: {
        tags: ['produtos'],
        summary: 'Criar produto (somente ADMIN)',
        description:
          'Cadastra um produto do cardapio. Requer token JWT com perfil ADMIN.',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['nome', 'preco_base', 'categoria'],
          properties: {
            nome: { type: 'string', minLength: 1 },
            descricao: { type: 'string' },
            preco_base: { type: 'number', minimum: 0.01 },
            categoria: { type: 'string', minLength: 1 }
          }
        },
        response: {
          201: produtoResponseProps,
          400: { description: 'Payload invalido', ...errorResponseSchema },
          401: { description: 'Token invalido/ausente', ...errorResponseSchema },
          403: { description: 'Perfil sem permissao', ...errorResponseSchema }
        }
      }
    },
    async (request, reply) => {
      if (request.validationError) {
        return reply.status(400).send(invalidProdutoCreationPayloadError())
      }

      if (!isAdmin(request)) {
        return reply.status(403).send(forbiddenError())
      }

      const bodySchema = z.object({
        nome: z.string().trim().min(1),
        descricao: z
          .string()
          .optional()
          .transform((s) => (s === undefined ? undefined : s.trim() || null)),
        preco_base: z.number().positive(),
        categoria: z.string().trim().min(1)
      })

      const parsedBody = bodySchema.safeParse(request.body)
      if (!parsedBody.success) {
        return reply.status(400).send(invalidProdutoCreationPayloadError())
      }

      const { nome, descricao, preco_base, categoria } = parsedBody.data
      const id = randomUUID()

      await db('produtos').insert({
        id,
        nome,
        descricao: descricao ?? null,
        preco_base,
        categoria
      })

      const created = await db('produtos')
        .select('id', 'nome', 'descricao', 'preco_base', 'categoria')
        .where({ id })
        .first()

      return reply.status(201).send(serializeProduto(created!))
    }
  )

  app.put(
    '/produtos/:id',
    {
      preHandler: [authenticate],
      attachValidation: true,
      schema: {
        tags: ['produtos'],
        summary: 'Atualizar produto (somente ADMIN)',
        description: 'Atualiza dados de um produto. Requer token JWT com perfil ADMIN.',
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
            descricao: { type: ['string', 'null'] },
            preco_base: { type: 'number', minimum: 0.01 },
            categoria: { type: 'string', minLength: 1 }
          },
          minProperties: 1
        },
        response: {
          200: produtoResponseProps,
          400: { description: 'Payload invalido', ...errorResponseSchema },
          401: { description: 'Token invalido/ausente', ...errorResponseSchema },
          403: { description: 'Perfil sem permissao', ...errorResponseSchema },
          404: { description: 'Produto nao encontrado', ...errorResponseSchema }
        }
      }
    },
    async (request, reply) => {
      if (request.validationError) {
        return reply.status(400).send({
          error: 'DADOS_INVALIDOS',
          message:
            'Dados de atualizacao invalidos. Informe ao menos um campo valido para atualizar.'
        })
      }

      if (!isAdmin(request)) {
        return reply.status(403).send(forbiddenError())
      }

      const paramsSchema = z.object({ id: z.string().uuid() })
      const bodySchema = z
        .object({
          nome: z.string().trim().min(1).optional(),
          descricao: z.union([z.string(), z.null()]).optional(),
          preco_base: z.number().positive().optional(),
          categoria: z.string().trim().min(1).optional()
        })
        .refine(
          (d) =>
            d.nome !== undefined ||
            d.descricao !== undefined ||
            d.preco_base !== undefined ||
            d.categoria !== undefined
        )

      const parsedParams = paramsSchema.safeParse(request.params)
      const parsedBody = bodySchema.safeParse(request.body)

      if (!parsedParams.success) {
        return reply.status(400).send({
          error: 'DADOS_INVALIDOS',
          message: 'O id na URL deve ser um UUID valido.'
        })
      }

      if (!parsedBody.success) {
        return reply.status(400).send(invalidProdutoUpdatePayloadError())
      }

      const { id } = parsedParams.data
      const b = parsedBody.data
      const patch: Record<string, unknown> = {}
      if (b.nome !== undefined) patch.nome = b.nome
      if (b.descricao !== undefined) {
        patch.descricao =
          b.descricao === null ? null : b.descricao.trim() === '' ? null : b.descricao.trim()
      }
      if (b.preco_base !== undefined) patch.preco_base = b.preco_base
      if (b.categoria !== undefined) patch.categoria = b.categoria

      const target = await db('produtos').where({ id }).first()
      if (!target) {
        return reply.status(404).send({
          error: 'NAO_ENCONTRADO',
          message: 'Produto nao encontrado.'
        })
      }

      await db('produtos').where({ id }).update(patch)

      const updated = await db('produtos')
        .select('id', 'nome', 'descricao', 'preco_base', 'categoria')
        .where({ id })
        .first()

      return reply.status(200).send(serializeProduto(updated!))
    }
  )

  app.delete(
    '/produtos/:id',
    {
      preHandler: [authenticate],
      attachValidation: true,
      schema: {
        tags: ['produtos'],
        summary: 'Remover produto (somente ADMIN)',
        description:
          'Exclui um produto. Bloqueado se houver itens de pedido ou movimentacoes de estoque (RESTRICT). Requer ADMIN.',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' }
          }
        },
        response: {
          204: { description: 'Produto removido' },
          400: { description: 'Id invalido', ...errorResponseSchema },
          401: { description: 'Token invalido/ausente', ...errorResponseSchema },
          403: { description: 'Perfil sem permissao', ...errorResponseSchema },
          404: { description: 'Produto nao encontrado', ...errorResponseSchema },
          409: { description: 'Vinculos impedem exclusao', ...errorResponseSchema }
        }
      }
    },
    async (request, reply) => {
      if (request.validationError) {
        return reply.status(400).send({
          error: 'DADOS_INVALIDOS',
          message: 'O id na URL deve ser um UUID valido.'
        })
      }

      if (!isAdmin(request)) {
        return reply.status(403).send(forbiddenError())
      }

      const paramsSchema = z.object({ id: z.string().uuid() })
      const parsedParams = paramsSchema.safeParse(request.params)
      if (!parsedParams.success) {
        return reply.status(400).send({
          error: 'DADOS_INVALIDOS',
          message: 'O id na URL deve ser um UUID valido.'
        })
      }

      const { id } = parsedParams.data

      const exists = await db('produtos').where({ id }).first()
      if (!exists) {
        return reply.status(404).send({
          error: 'NAO_ENCONTRADO',
          message: 'Produto nao encontrado.'
        })
      }

      const [itensRow] = await db('itens_pedido').where({ produto_id: id }).count('* as total')
      const itensVinculados = Number((itensRow as { total: string }).total ?? 0)

      const [movRow] = await db('movimentacoes_estoque')
        .where({ produto_id: id })
        .count('* as total')
      const movVinculadas = Number((movRow as { total: string }).total ?? 0)

      if (itensVinculados > 0 || movVinculadas > 0) {
        return reply.status(409).send({
          error: 'CONFLITO',
          message:
            'Nao e possivel excluir: existem itens de pedido ou movimentacoes de estoque vinculados a este produto.'
        })
      }

      await db('produtos').where({ id }).del()

      return reply.status(204).send()
    }
  )
}
