import { randomUUID } from 'node:crypto'
import type { FastifyBaseLogger, FastifyRequest } from 'fastify'

import { db } from '../database.js'

/** Valores padronizados para o campo `acao` em `logs_auditoria`. */
export const AcaoAuditoria = {
  AUTH_LOGIN: 'AUTH_LOGIN',
  USUARIO_CREATE: 'USUARIO_CREATE',
  USUARIO_UPDATE: 'USUARIO_UPDATE',
  USUARIO_DELETE: 'USUARIO_DELETE',
  UNIDADE_CREATE: 'UNIDADE_CREATE',
  UNIDADE_UPDATE: 'UNIDADE_UPDATE',
  UNIDADE_DELETE: 'UNIDADE_DELETE',
  PRODUTO_CREATE: 'PRODUTO_CREATE',
  PRODUTO_UPDATE: 'PRODUTO_UPDATE',
  PRODUTO_DELETE: 'PRODUTO_DELETE',
  ESTOQUE_CREATE: 'ESTOQUE_CREATE',
  ESTOQUE_UPDATE: 'ESTOQUE_UPDATE',
  ESTOQUE_DELETE: 'ESTOQUE_DELETE',
  MOVIMENTACAO_ESTOQUE_CREATE: 'MOVIMENTACAO_ESTOQUE_CREATE',
  MOVIMENTACAO_ESTOQUE_UPDATE: 'MOVIMENTACAO_ESTOQUE_UPDATE',
  MOVIMENTACAO_ESTOQUE_DELETE: 'MOVIMENTACAO_ESTOQUE_DELETE',
  PEDIDO_CREATE: 'PEDIDO_CREATE',
  PEDIDO_STATUS_UPDATE: 'PEDIDO_STATUS_UPDATE',
  PEDIDO_DELETE: 'PEDIDO_DELETE',
  PAGAMENTO_CREATE: 'PAGAMENTO_CREATE',
  PAGAMENTO_UPDATE: 'PAGAMENTO_UPDATE',
  PAGAMENTO_DELETE: 'PAGAMENTO_DELETE',
  FIDELIDADE_CREATE: 'FIDELIDADE_CREATE',
  FIDELIDADE_UPDATE: 'FIDELIDADE_UPDATE',
  FIDELIDADE_DELETE: 'FIDELIDADE_DELETE',
  CAMPANHA_CREATE: 'CAMPANHA_CREATE',
  CAMPANHA_UPDATE: 'CAMPANHA_UPDATE',
  CAMPANHA_DELETE: 'CAMPANHA_DELETE'
} as const

export function getUsuarioIdFromRequest(request: FastifyRequest): string | undefined {
  const sub = (request.user as { sub?: string } | undefined)?.sub
  return typeof sub === 'string' && sub.length > 0 ? sub : undefined
}

type RegistrarParams = {
  usuarioId: string
  acao: string
  detalhes?: string | null
  ipOrigem?: string | null
}

/**
 * Registro append-only na tabela `logs_auditoria`.
 * Falhas ao persistir sao apenas logadas no servidor; a requisicao principal nao deve falhar por causa da auditoria.
 */
export async function registrarLogAuditoria(
  logger: FastifyBaseLogger | undefined,
  input: RegistrarParams
): Promise<void> {
  try {
    await db('logs_auditoria').insert({
      id: randomUUID(),
      usuario_id: input.usuarioId,
      acao: input.acao,
      detalhes: input.detalhes ?? null,
      ip_origem: input.ipOrigem ?? null
    })
  } catch (err) {
    logger?.error({ err }, 'Falha ao registrar log de auditoria')
  }
}
