import { scryptSync } from 'node:crypto'
import { beforeAll, afterAll, describe, expect, it } from 'vitest'

import { app } from './app.js'
import { db } from './database.js'
import { errorResponseSchema, unauthorizedError } from './http/errors.js'

// Usuário de teste
const testUser = {
  id: '99999999-9999-9999-9999-999999999999',
  nome: 'Admin Teste',
  email: 'admin@raizes.com',
  perfil: 'ADMIN',
  senha: 'Admin@123'
}
// Função para criar o hash da senha
function makePasswordHash(plainTextPassword: string): string {
  const salt = 'a1b2c3d4e5f60718293a4b5c6d7e8f90'
  const derivedKey = scryptSync(plainTextPassword, salt, 64).toString('hex')
  return `scrypt$${salt}$${derivedKey}`
}

// Descrição do teste
describe('API HTTP', () => {
  beforeAll(async () => {
    await db.schema.dropTableIfExists('usuarios')
    await db.schema.createTable('usuarios', (table) => {
      table.uuid('id').primary()
      table.string('nome').notNullable()
      table.string('email').notNullable().unique()
      table.string('senha_hash').notNullable()
      table.string('perfil').notNullable()
      table.date('data_nascimento')
      table.timestamp('criado_em').defaultTo(db.fn.now())
    })

    // Insere o usuário de teste no banco de dados
    await db('usuarios').insert({
      id: testUser.id,
      nome: testUser.nome,
      email: testUser.email,
      senha_hash: makePasswordHash(testUser.senha),
      perfil: testUser.perfil,
      data_nascimento: '1990-01-01',
      criado_em: db.fn.now()
    })

    // Aguarda o servidor Fastify estar pronto
    await app.ready()
  })

  // Limpa o banco de dados após os testes
  afterAll(async () => {
    // Fecha o servidor Fastify
    await app.close()
    // Fecha a conexão com o banco de dados
    await db.destroy()
  })

  // Descrição do teste
  describe('POST /auth/login', () => {
    it('deve retornar 200 com JWT e dados do usuário quando email e senha forem válidos', async () => {
      // Faz a requisição de login
      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: testUser.email, senha: testUser.senha }
      })

      expect(response.statusCode).toBe(200)
      const body = response.json() as {
        accessToken: string
        tokenType: string
        expiresIn: number
        user: { id: string; nome: string; email: string; perfil: string }
      }

      expect(body.accessToken.length).toBeGreaterThan(0)
      expect(body.tokenType).toBe('Bearer')
      expect(body.expiresIn).toBe(3600)
      expect(body.user).toEqual({
        id: testUser.id,
        nome: testUser.nome,
        email: testUser.email,
        perfil: testUser.perfil
      })
    })
  })

  describe('GET /hello', () => {
    it('deve bloquear /hello sem token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/hello'
      })

      expect(response.statusCode).toBe(401)
      const body = response.json()
      expect(errorResponseSchema.safeParse(body).success).toBe(true)
      expect(body).toEqual(unauthorizedError())
    })

    it('deve permitir /hello com token válido', async () => {
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: testUser.email, senha: testUser.senha }
      })

      const { accessToken } = loginResponse.json()

      const response = await app.inject({
        method: 'GET',
        url: '/hello',
        headers: {
          authorization: `Bearer ${accessToken}`
        }
      })

      expect(response.statusCode).toBe(200)
      expect(response.json()).toEqual({
        message: 'Ola mundo autenticado com JWT.'
      })
    })
  })
})
