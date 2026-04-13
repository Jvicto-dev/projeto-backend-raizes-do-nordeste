import { scryptSync } from 'node:crypto'
import { beforeAll, afterAll, describe, expect, it } from 'vitest'

import { app } from './app.js'
import { db } from './database.js'
import {
  errorResponseSchema,
  invalidCredentialsError,
  invalidPayloadError,
  unauthorizedError
} from './http/errors.js'

const testUser = {
  id: '99999999-9999-9999-9999-999999999999',
  nome: 'Admin Teste',
  email: 'admin@raizes.com',
  perfil: 'ADMIN',
  senha: 'Admin@123'
}

function makePasswordHash(plainTextPassword: string): string {
  const salt = 'a1b2c3d4e5f60718293a4b5c6d7e8f90'
  const derivedKey = scryptSync(plainTextPassword, salt, 64).toString('hex')
  return `scrypt$${salt}$${derivedKey}`
}

describe('Auth e rota protegida', () => {
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

    await db('usuarios').insert({
      id: testUser.id,
      nome: testUser.nome,
      email: testUser.email,
      senha_hash: makePasswordHash(testUser.senha),
      perfil: testUser.perfil,
      data_nascimento: '1990-01-01',
      criado_em: db.fn.now()
    })

    await app.ready()
  })

  afterAll(async () => {
    await app.close()
    await db.destroy()
  })

  it('deve retornar 400 quando payload do login for inválido', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'invalido' }
    })

    expect(response.statusCode).toBe(400)
    const body = response.json()
    expect(errorResponseSchema.safeParse(body).success).toBe(true)
    expect(body).toEqual(invalidPayloadError())
  })

  it('deve retornar 401 para credenciais inválidas', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: testUser.email, senha: 'senhaErrada' }
    })

    expect(response.statusCode).toBe(401)
    const body = response.json()
    expect(errorResponseSchema.safeParse(body).success).toBe(true)
    expect(body).toEqual(invalidCredentialsError())
  })

  it('deve autenticar com sucesso e devolver JWT', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: testUser.email, senha: testUser.senha }
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.accessToken).toBeTypeOf('string')
    expect(body.tokenType).toBe('Bearer')
    expect(body.expiresIn).toBe(3600)
    expect(body.user.email).toBe(testUser.email)
  })

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
