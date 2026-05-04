import { randomUUID } from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import type { Knex } from 'knex'
import { z } from 'zod'

import { db } from '../database.js'
import { forbiddenError } from '../http/errors.js'
import { authenticate } from '../middlewares/authenticate.js'

const errorResponseSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' },
    message: { type: 'string' }
  },
  required: ['error', 'message']
} as const

function invalidPagamentoCreationPayloadError() {
  return {
    error: 'DADOS_INVALIDOS',
    message:
      'Dados invalidos. Informe pedido_id, metodo_pagamento e resultado_mock (APROVADO|NEGADO); external_id e payload_retorno sao opcionais.'
  }
}

function invalidPagamentoUpdatePayloadError() {
  return {
    error: 'DADOS_INVALIDOS',
    message:
      'Dados de atualizacao invalidos. Envie ao menos um campo valido (metodo_pagamento, external_id, payload_retorno).'
  }
}

const RESULTADOS = ['APROVADO', 'NEGADO'] as const
type ResultadoPagamento = (typeof RESULTADOS)[number]

const pagamentoResponseProps = {
  type: 'object',
  required: ['id', 'pedido_id', 'external_id', 'metodo_pagamento', 'status_pagamento', 'payload_retorno'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    pedido_id: { type: 'string', format: 'uuid' },
    external_id: { type: ['string', 'null'] },
    metodo_pagamento: { type: 'string' },
    status_pagamento: { type: 'string', enum: [...RESULTADOS] },
    payload_retorno: { type: ['string', 'null'] }
  }
} as const

function isAdmin(request: { user?: unknown }): boolean {
  const perfil = (request.user as { perfil?: string } | undefined)?.perfil
  return perfil === 'ADMIN'
}

function podeOperarPagamento(request: { user?: unknown }): boolean {
  const perfil = (request.user as { perfil?: string } | undefined)?.perfil
  return perfil === 'ADMIN' || perfil === 'GERENTE' || perfil === 'BALCAO'
}

function podeVerTodosPagamentos(request: { user?: unknown }): boolean {
  const perfil = (request.user as { perfil?: string } | undefined)?.perfil
  return perfil === 'ADMIN' || perfil === 'GERENTE'
}

function getSub(request: { user?: unknown }): string | undefined {
  return (request.user as { sub?: string } | undefined)?.sub
}

function serializePagamento(row: Record<string, unknown>) {
  return {
    id: row.id,
    pedido_id: row.pedido_id,
    external_id: row.external_id ?? null,
    metodo_pagamento: row.metodo_pagamento,
    status_pagamento: row.status_pagamento,
    payload_retorno: row.payload_retorno ?? null
  }
}

async function restaurarEstoquePedido(
  trx: Knex.Transaction,
  unidadeId: string,
  pedidoId: string
) {
  const itensRows = await trx('itens_pedido').select('produto_id', 'quantidade').where({ pedido_id: pedidoId })

  for (const it of itensRows) {
    const estoque = await trx('estoque')
      .where({ unidade_id: unidadeId, produto_id: String(it.produto_id) })
      .first()
    if (estoque) {
      await trx('estoque')
        .where({ id: estoque.id })
        .update({ quantidade_atual: Number(estoque.quantidade_atual) + Number(it.quantidade) })
    }
  }
}

export async function pagamentosRoutes(app: FastifyInstance) {
  app.get(
    '/pagamentos',
    {
      preHandler: [authenticate],
      attachValidation: true,
      schema: {
        tags: ['pagamentos'],
        summary: 'Listar pagamentos',
        description:
          'Lista pagamentos com paginacao. ADMIN/GERENTE veem todos; demais perfis veem apenas pagamentos dos proprios pedidos.',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
            pedido_id: { type: 'string', format: 'uuid' },
            status_pagamento: { type: 'string', enum: [...RESULTADOS] }
          }
        },
        response: {
          200: {
            type: 'object',
            required: ['data', 'page', 'limit', 'total'],
            properties: {
              data: { type: 'array', items: pagamentoResponseProps },
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
          message: 'Parametros invalidos. Use page >= 1, limit entre 1 e 100 e filtros validos.'
        })
      }

      const sub = getSub(request)
      if (!sub) {
        return reply.status(401).send({
          error: 'NAO_AUTORIZADO',
          message: 'Token invalido.'
        })
      }

      const q = request.query as {
        page?: number
        limit?: number
        pedido_id?: string
        status_pagamento?: ResultadoPagamento
      }
      const page = typeof q.page === 'number' && q.page >= 1 ? q.page : 1
      let limit = typeof q.limit === 'number' && q.limit >= 1 ? q.limit : 10
      if (limit > 100) limit = 100
      const offset = (page - 1) * limit

      let countQuery = db('pagamentos')
      let listQuery = db('pagamentos')
        .select('pagamentos.id', 'pagamentos.pedido_id', 'pagamentos.external_id', 'pagamentos.metodo_pagamento', 'pagamentos.status_pagamento', 'pagamentos.payload_retorno')
        .orderBy('pagamentos.id', 'desc')

      if (!podeVerTodosPagamentos(request)) {
        countQuery = countQuery
          .join('pedidos', 'pedidos.id', 'pagamentos.pedido_id')
          .where('pedidos.cliente_id', sub)
        listQuery = listQuery
          .join('pedidos', 'pedidos.id', 'pagamentos.pedido_id')
          .where('pedidos.cliente_id', sub)
      }

      if (q.pedido_id) {
        countQuery = countQuery.where('pagamentos.pedido_id', q.pedido_id)
        listQuery = listQuery.where('pagamentos.pedido_id', q.pedido_id)
      }
      if (q.status_pagamento) {
        countQuery = countQuery.where('pagamentos.status_pagamento', q.status_pagamento)
        listQuery = listQuery.where('pagamentos.status_pagamento', q.status_pagamento)
      }

      const [countRow] = await countQuery.count('* as total')
      const total = Number((countRow as { total: string }).total ?? 0)
      const rows = await listQuery.limit(limit).offset(offset)

      return reply.status(200).send({
        data: rows.map((r) => serializePagamento(r as Record<string, unknown>)),
        page,
        limit,
        total
      })
    }
  )

  app.get(
    '/pagamentos/:id',
    {
      preHandler: [authenticate],
      attachValidation: true,
      schema: {
        tags: ['pagamentos'],
        summary: 'Buscar pagamento por id',
        description: 'Retorna pagamento por UUID. CLIENTE so acessa pagamento dos proprios pedidos.',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', format: 'uuid' } }
        },
        response: {
          200: pagamentoResponseProps,
          400: { description: 'Id invalido', ...errorResponseSchema },
          401: { description: 'Token invalido/ausente', ...errorResponseSchema },
          403: { description: 'Sem permissao', ...errorResponseSchema },
          404: { description: 'Pagamento nao encontrado', ...errorResponseSchema }
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

      const sub = getSub(request)
      if (!sub) {
        return reply.status(401).send({
          error: 'NAO_AUTORIZADO',
          message: 'Token invalido.'
        })
      }

      const paramsSchema = z.object({ id: z.string().uuid() })
      const pp = paramsSchema.safeParse(request.params)
      if (!pp.success) {
        return reply.status(400).send({
          error: 'DADOS_INVALIDOS',
          message: 'O id na URL deve ser um UUID valido.'
        })
      }

      const row = await db('pagamentos').where({ id: pp.data.id }).first()
      if (!row) {
        return reply.status(404).send({
          error: 'NAO_ENCONTRADO',
          message: 'Pagamento nao encontrado.'
        })
      }

      if (!podeVerTodosPagamentos(request)) {
        const pedido = await db('pedidos').select('cliente_id').where({ id: row.pedido_id }).first()
        if (!pedido || String(pedido.cliente_id) !== sub) {
          return reply.status(403).send(forbiddenError())
        }
      }

      return reply.status(200).send(serializePagamento(row as Record<string, unknown>))
    }
  )

  app.post(
    '/pagamentos',
    {
      preHandler: [authenticate],
      attachValidation: true,
      schema: {
        tags: ['pagamentos'],
        summary: 'Registrar pagamento mock',
        description:
          'Registra pagamento (APROVADO/NEGADO) para pedido em AGUARDANDO_PAGAMENTO. APROVADO muda pedido para EM_PREPARO; NEGADO cancela e devolve estoque.',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['pedido_id', 'metodo_pagamento', 'resultado_mock'],
          properties: {
            pedido_id: { type: 'string', format: 'uuid' },
            metodo_pagamento: { type: 'string', minLength: 1 },
            resultado_mock: { type: 'string', enum: [...RESULTADOS] },
            external_id: { type: 'string' },
            payload_retorno: { type: 'string' }
          }
        },
        response: {
          201: pagamentoResponseProps,
          400: { description: 'Payload invalido', ...errorResponseSchema },
          401: { description: 'Token invalido/ausente', ...errorResponseSchema },
          403: { description: 'Sem permissao', ...errorResponseSchema },
          404: { description: 'Pedido nao encontrado', ...errorResponseSchema },
          409: { description: 'Conflito de status/pagamento', ...errorResponseSchema }
        }
      }
    },
    async (request, reply) => {
      if (request.validationError) {
        return reply.status(400).send(invalidPagamentoCreationPayloadError())
      }

      const sub = getSub(request)
      if (!sub) {
        return reply.status(401).send({ error: 'NAO_AUTORIZADO', message: 'Token invalido.' })
      }

      const bodySchema = z.object({
        pedido_id: z.string().uuid(),
        metodo_pagamento: z.string().trim().min(1),
        resultado_mock: z.enum(RESULTADOS),
        external_id: z.string().optional(),
        payload_retorno: z.string().optional()
      })
      const pb = bodySchema.safeParse(request.body)
      if (!pb.success) {
        return reply.status(400).send(invalidPagamentoCreationPayloadError())
      }

      const pedido = await db('pedidos').where({ id: pb.data.pedido_id }).first()
      if (!pedido) {
        return reply.status(404).send({ error: 'NAO_ENCONTRADO', message: 'Pedido nao encontrado.' })
      }

      const pedidoClienteId = String((pedido as { cliente_id: string }).cliente_id)
      if (!podeOperarPagamento(request) && pedidoClienteId !== sub) {
        return reply.status(403).send(forbiddenError())
      }

      if (String((pedido as { status: string }).status) !== 'AGUARDANDO_PAGAMENTO') {
        return reply.status(409).send({
          error: 'CONFLITO',
          message: 'Pagamento so pode ser registrado para pedido em AGUARDANDO_PAGAMENTO.'
        })
      }

      const existing = await db('pagamentos').where({ pedido_id: pb.data.pedido_id }).first()
      if (existing) {
        return reply.status(409).send({
          error: 'CONFLITO',
          message: 'Este pedido ja possui pagamento registrado.'
        })
      }

      const pagamentoId = randomUUID()
      const resultado = await db.transaction(async (trx) => {
        await trx('pagamentos').insert({
          id: pagamentoId,
          pedido_id: pb.data.pedido_id,
          external_id: pb.data.external_id ?? null,
          metodo_pagamento: pb.data.metodo_pagamento,
          status_pagamento: pb.data.resultado_mock,
          payload_retorno: pb.data.payload_retorno ?? null
        })

        if (pb.data.resultado_mock === 'APROVADO') {
          await trx('pedidos').where({ id: pb.data.pedido_id }).update({ status: 'EM_PREPARO' })
        } else {
          await trx('pedidos').where({ id: pb.data.pedido_id }).update({ status: 'CANCELADO' })
          await restaurarEstoquePedido(
            trx,
            String((pedido as { unidade_id: string }).unidade_id),
            pb.data.pedido_id
          )
        }

        const created = await trx('pagamentos').where({ id: pagamentoId }).first()
        return created as Record<string, unknown>
      })

      return reply.status(201).send(serializePagamento(resultado))
    }
  )

  app.put(
    '/pagamentos/:id',
    {
      preHandler: [authenticate],
      attachValidation: true,
      schema: {
        tags: ['pagamentos'],
        summary: 'Atualizar metadados de pagamento',
        description:
          'Atualiza campos de integracao (`metodo_pagamento`, `external_id`, `payload_retorno`). Status do pagamento nao e alterado aqui.',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', format: 'uuid' } }
        },
        body: {
          type: 'object',
          properties: {
            metodo_pagamento: { type: 'string', minLength: 1 },
            external_id: { type: ['string', 'null'] },
            payload_retorno: { type: ['string', 'null'] }
          },
          minProperties: 1
        },
        response: {
          200: pagamentoResponseProps,
          400: { description: 'Payload invalido', ...errorResponseSchema },
          401: { description: 'Token invalido/ausente', ...errorResponseSchema },
          403: { description: 'Sem permissao', ...errorResponseSchema },
          404: { description: 'Pagamento nao encontrado', ...errorResponseSchema }
        }
      }
    },
    async (request, reply) => {
      if (request.validationError) {
        return reply.status(400).send(invalidPagamentoUpdatePayloadError())
      }
      if (!podeOperarPagamento(request)) {
        return reply.status(403).send(forbiddenError())
      }

      const paramsSchema = z.object({ id: z.string().uuid() })
      const bodySchema = z
        .object({
          metodo_pagamento: z.string().trim().min(1).optional(),
          external_id: z.union([z.string(), z.null()]).optional(),
          payload_retorno: z.union([z.string(), z.null()]).optional()
        })
        .refine((d) => d.metodo_pagamento !== undefined || d.external_id !== undefined || d.payload_retorno !== undefined)

      const pp = paramsSchema.safeParse(request.params)
      const pb = bodySchema.safeParse(request.body)
      if (!pp.success) {
        return reply.status(400).send({ error: 'DADOS_INVALIDOS', message: 'O id na URL deve ser um UUID valido.' })
      }
      if (!pb.success) {
        return reply.status(400).send(invalidPagamentoUpdatePayloadError())
      }

      const row = await db('pagamentos').where({ id: pp.data.id }).first()
      if (!row) {
        return reply.status(404).send({ error: 'NAO_ENCONTRADO', message: 'Pagamento nao encontrado.' })
      }

      const patch: Record<string, unknown> = {}
      if (pb.data.metodo_pagamento !== undefined) patch.metodo_pagamento = pb.data.metodo_pagamento
      if (pb.data.external_id !== undefined) patch.external_id = pb.data.external_id
      if (pb.data.payload_retorno !== undefined) patch.payload_retorno = pb.data.payload_retorno

      await db('pagamentos').where({ id: pp.data.id }).update(patch)
      const updated = await db('pagamentos').where({ id: pp.data.id }).first()
      return reply.status(200).send(serializePagamento(updated as Record<string, unknown>))
    }
  )

  app.delete(
    '/pagamentos/:id',
    {
      preHandler: [authenticate],
      attachValidation: true,
      schema: {
        tags: ['pagamentos'],
        summary: 'Remover pagamento (somente ADMIN)',
        description: 'Remove pagamento NEGADO para ajuste administrativo. Pagamento APROVADO nao pode ser removido.',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', format: 'uuid' } }
        },
        response: {
          204: { description: 'Pagamento removido' },
          400: { description: 'Id invalido', ...errorResponseSchema },
          401: { description: 'Token invalido/ausente', ...errorResponseSchema },
          403: { description: 'Sem permissao', ...errorResponseSchema },
          404: { description: 'Pagamento nao encontrado', ...errorResponseSchema },
          409: { description: 'Conflito', ...errorResponseSchema }
        }
      }
    },
    async (request, reply) => {
      if (request.validationError) {
        return reply.status(400).send({ error: 'DADOS_INVALIDOS', message: 'O id na URL deve ser um UUID valido.' })
      }
      if (!isAdmin(request)) {
        return reply.status(403).send(forbiddenError())
      }

      const paramsSchema = z.object({ id: z.string().uuid() })
      const pp = paramsSchema.safeParse(request.params)
      if (!pp.success) {
        return reply.status(400).send({ error: 'DADOS_INVALIDOS', message: 'O id na URL deve ser um UUID valido.' })
      }

      const row = await db('pagamentos').where({ id: pp.data.id }).first()
      if (!row) {
        return reply.status(404).send({ error: 'NAO_ENCONTRADO', message: 'Pagamento nao encontrado.' })
      }

      if (String((row as { status_pagamento: string }).status_pagamento) === 'APROVADO') {
        return reply.status(409).send({
          error: 'CONFLITO',
          message: 'Pagamento aprovado nao pode ser removido.'
        })
      }

      await db('pagamentos').where({ id: pp.data.id }).del()
      return reply.status(204).send()
    }
  )
}
