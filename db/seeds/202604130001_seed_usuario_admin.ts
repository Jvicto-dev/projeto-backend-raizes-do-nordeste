import type { Knex } from 'knex'
import { randomBytes, scryptSync } from 'node:crypto'

// Usuário inicial para testes de autenticação e autorização.
const DEFAULT_USER = {
  id: '11111111-1111-1111-1111-111111111111',
  nome: 'Administrador',
  email: 'admin@raizes.com',
  perfil: 'ADMIN',
  data_nascimento: '1990-01-01'
}

function makePasswordHash(plainTextPassword: string): string {
  // Salt aleatório para evitar hashes iguais entre usuários com a mesma senha.
  const salt = randomBytes(16).toString('hex')
  // scrypt aumenta o custo computacional e dificulta ataques de força bruta.
  const derivedKey = scryptSync(plainTextPassword, salt, 64).toString('hex')
  // Formato persistido: algoritmo + salt + hash derivado.
  return `scrypt$${salt}$${derivedKey}`
}

export async function seed(knex: Knex): Promise<void> {
  // Senha definida apenas para ambiente de desenvolvimento.
  const senhaHash = makePasswordHash('Admin@123')

  // Remove usuário anterior para manter a seed idempotente.
  await knex('usuarios').where({ email: DEFAULT_USER.email }).del()

  await knex('usuarios').insert({
    ...DEFAULT_USER,
    senha_hash: senhaHash,
    // Data de criação registrada pelo relógio do banco.
    criado_em: knex.fn.now()
  })
}
