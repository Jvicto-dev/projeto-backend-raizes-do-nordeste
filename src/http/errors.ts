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
