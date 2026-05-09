/**
 * Helpers de autorização por `perfil` do JWT (`request.user.perfil`).
 *
 * - **Gestão de cadastro (matriz):** ADMIN e GERENTE — unidades, cardápio, estoque administrativo, campanhas, movimentações.
 * - **Usuários:** apenas ADMIN (criação de contas da rede).
 * - Outras rotas definem regras específicas nos próprios handlers.
 */
export function isPerfilAdmin(request: { user?: unknown }): boolean {
  return (request.user as { perfil?: string } | undefined)?.perfil === 'ADMIN'
}

/** ADMIN ou GERENTE — operações de gestão da unidade/rede (não confundir com `usuarios`, que é só ADMIN). */
export function isAdminOuGerente(request: { user?: unknown }): boolean {
  const p = (request.user as { perfil?: string } | undefined)?.perfil
  return p === 'ADMIN' || p === 'GERENTE'
}
