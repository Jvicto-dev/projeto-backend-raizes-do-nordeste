import { z } from 'zod'

// Contrato padrão de erro da API.
export const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string()
})

export type ErrorResponse = z.infer<typeof errorResponseSchema>

export function unauthorizedError(
  message = 'Token ausente, invalido ou expirado.'
): ErrorResponse {
  return {
    error: 'NAO_AUTORIZADO',
    message
  }
}

export function forbiddenError(message = 'Perfil sem permissao para executar esta acao.'): ErrorResponse {
  return {
    error: 'ACESSO_NEGADO',
    message
  }
}

export function invalidCredentialsError(): ErrorResponse {
  return {
    error: 'CREDENCIAIS_INVALIDAS',
    message: 'Email ou senha invalidos.'
  }
}

export function invalidPayloadError(): ErrorResponse {
  return {
    error: 'DADOS_INVALIDOS',
    message: 'Email e senha devem ser enviados no formato correto.'
  }
}

export function invalidUserCreationPayloadError(): ErrorResponse {
  return {
    error: 'DADOS_INVALIDOS',
    message:
      'Dados de cadastro invalidos. Verifique nome, email, senha, perfil e data_nascimento.'
  }
}

export function invalidUserUpdatePayloadError(): ErrorResponse {
  return {
    error: 'DADOS_INVALIDOS',
    message:
      'Dados de atualizacao invalidos. Envie ao menos um campo valido (nome, email, senha, perfil, data_nascimento).'
  }
}

export function invalidUnidadeCreationPayloadError(): ErrorResponse {
  return {
    error: 'DADOS_INVALIDOS',
    message:
      'Dados invalidos. Informe nome, endereco e tipo_cozinha; opcionalmente ativa (boolean).'
  }
}

export function invalidUnidadeUpdatePayloadError(): ErrorResponse {
  return {
    error: 'DADOS_INVALIDOS',
    message:
      'Dados de atualizacao invalidos. Envie ao menos um campo valido (nome, endereco, tipo_cozinha, ativa).'
  }
}

export function invalidProdutoCreationPayloadError(): ErrorResponse {
  return {
    error: 'DADOS_INVALIDOS',
    message:
      'Dados invalidos. Informe nome, preco_base (maior que zero) e categoria; descricao e opcional.'
  }
}

export function invalidProdutoUpdatePayloadError(): ErrorResponse {
  return {
    error: 'DADOS_INVALIDOS',
    message:
      'Dados de atualizacao invalidos. Envie ao menos um campo valido (nome, descricao, preco_base, categoria).'
  }
}

export function invalidEstoqueCreationPayloadError(): ErrorResponse {
  return {
    error: 'DADOS_INVALIDOS',
    message:
      'Dados invalidos. Informe unidade_id e produto_id (UUID); quantidade_atual e ponto_reposicao devem ser inteiros >= 0.'
  }
}

export function invalidEstoqueUpdatePayloadError(): ErrorResponse {
  return {
    error: 'DADOS_INVALIDOS',
    message:
      'Dados de atualizacao invalidos. Envie ao menos um campo valido (unidade_id, produto_id, quantidade_atual, ponto_reposicao).'
  }
}

export function invalidMovimentacaoEstoqueCreationPayloadError(): ErrorResponse {
  return {
    error: 'DADOS_INVALIDOS',
    message:
      'Dados invalidos. Informe unidade_id, produto_id, tipo_movimentacao (ENTRADA|SAIDA) e quantidade inteira >= 1; motivo e opcional.'
  }
}

export function invalidMovimentacaoEstoqueUpdatePayloadError(): ErrorResponse {
  return {
    error: 'DADOS_INVALIDOS',
    message:
      'Dados de atualizacao invalidos. Envie ao menos um campo valido (unidade_id, produto_id, tipo_movimentacao, quantidade, motivo).'
  }
}

export function invalidPedidoCreationPayloadError(): ErrorResponse {
  return {
    error: 'DADOS_INVALIDOS',
    message:
      'Dados invalidos. Informe unidade_id, canalPedido (APP|TOTEM|BALCAO|PICKUP|WEB) e itens com produto_id e quantidade >= 1.'
  }
}

export function invalidPedidoUpdatePayloadError(): ErrorResponse {
  return {
    error: 'DADOS_INVALIDOS',
    message: 'Informe status valido (AGUARDANDO_PAGAMENTO|EM_PREPARO|PRONTO|ENTREGUE|CANCELADO).'
  }
}

export function invalidPagamentoCreationPayloadError(): ErrorResponse {
  return {
    error: 'DADOS_INVALIDOS',
    message:
      'Dados invalidos. Informe pedido_id, metodo_pagamento e resultado_mock (APROVADO|NEGADO); external_id e payload_retorno sao opcionais.'
  }
}

export function invalidPagamentoUpdatePayloadError(): ErrorResponse {
  return {
    error: 'DADOS_INVALIDOS',
    message:
      'Dados de atualizacao invalidos. Envie ao menos um campo valido (metodo_pagamento, external_id, payload_retorno).'
  }
}