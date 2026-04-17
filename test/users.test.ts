import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { app } from '../src/app.js'
import { db } from '../src/database.js'
import { hashPassword } from '../src/utils/password.js'

const adminUser = {
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  nome: 'Administrador Teste',
  email: 'admin-criador@raizes.com',
  perfil: 'ADMIN',
  senha: 'Admin@123'
}

const gerenteUser = {
  id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  nome: 'Gerente Teste',
  email: 'gerente@raizes.com',
  perfil: 'GERENTE',
  senha: 'Gerente@123'
}

async function ensureUsersTable() {
  const hasTable = await db.schema.hasTable('usuarios')
  if (!hasTable) {
    await db.schema.createTable('usuarios', (table) => {
      table.uuid('id').primary()
      table.string('nome').notNullable()
      table.string('email').notNullable().unique()
      table.string('senha_hash').notNullable()
      table.string('perfil').notNullable()
      table.date('data_nascimento')
      table.timestamp('criado_em').defaultTo(db.fn.now())
    })
  }
}

async function loginAndGetToken(email: string, senha: string): Promise<string> {
  const loginResponse = await app.inject({
    method: 'POST',
    url: '/auth/login',
    payload: { email, senha }
  })

  expect(loginResponse.statusCode).toBe(200)
  const body = loginResponse.json() as { accessToken: string }
  return body.accessToken
}

describe('POST /usuarios', () => {
  beforeAll(async () => {
    await ensureUsersTable()
    await app.ready()
  })

  beforeEach(async () => {
    await db('usuarios')
      .whereIn('email', [
        adminUser.email,
        gerenteUser.email,
        'novo.usuario@raizes.com',
        'duplicado@raizes.com'
      ])
      .del()

    await db('usuarios').insert([
      {
        id: adminUser.id,
        nome: adminUser.nome,
        email: adminUser.email,
        senha_hash: hashPassword(adminUser.senha),
        perfil: adminUser.perfil,
        data_nascimento: '1990-01-01',
        criado_em: db.fn.now()
      },
      {
        id: gerenteUser.id,
        nome: gerenteUser.nome,
        email: gerenteUser.email,
        senha_hash: hashPassword(gerenteUser.senha),
        perfil: gerenteUser.perfil,
        data_nascimento: '1991-02-02',
        criado_em: db.fn.now()
      }
    ])
  })

  it('deve criar usuário quando autenticado com perfil ADMIN', async () => {
    const token = await loginAndGetToken(adminUser.email, adminUser.senha)

    const response = await app.inject({
      method: 'POST',
      url: '/usuarios',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        nome: 'Novo Usuario',
        email: 'novo.usuario@raizes.com',
        senha: 'Senha@123',
        perfil: 'CLIENTE',
        data_nascimento: '1999-10-10'
      }
    })

    expect(response.statusCode).toBe(201)
    const body = response.json() as {
      id: string
      nome: string
      email: string
      perfil: string
      data_nascimento: string | null
      criado_em: string
    }

    expect(body.id).toBeTruthy()
    expect(body.nome).toBe('Novo Usuario')
    expect(body.email).toBe('novo.usuario@raizes.com')
    expect(body.perfil).toBe('CLIENTE')
  })

  it('deve retornar 401 quando criar usuário sem token', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/usuarios',
      payload: {
        nome: 'Sem Token',
        email: 'sem.token@raizes.com',
        senha: 'Senha@123',
        perfil: 'CLIENTE'
      }
    })

    expect(response.statusCode).toBe(401)
    expect(response.json()).toEqual({
      error: 'NAO_AUTORIZADO',
      message: 'Token ausente, invalido ou expirado.'
    })
  })

  it('deve retornar 403 quando perfil não for ADMIN', async () => {
    const token = await loginAndGetToken(gerenteUser.email, gerenteUser.senha)

    const response = await app.inject({
      method: 'POST',
      url: '/usuarios',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        nome: 'Tentativa Gerente',
        email: 'tentativa.gerente@raizes.com',
        senha: 'Senha@123',
        perfil: 'CLIENTE'
      }
    })

    expect(response.statusCode).toBe(403)
    expect(response.json()).toEqual({
      error: 'ACESSO_NEGADO',
      message: 'Perfil sem permissao para executar esta acao.'
    })
  })

  it('deve retornar 409 quando email já estiver cadastrado', async () => {
    const token = await loginAndGetToken(adminUser.email, adminUser.senha)

    await db('usuarios').insert({
      id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
      nome: 'Usuario Duplicado',
      email: 'duplicado@raizes.com',
      senha_hash: hashPassword('Senha@123'),
      perfil: 'CLIENTE',
      data_nascimento: '2000-03-03',
      criado_em: db.fn.now()
    })

    const response = await app.inject({
      method: 'POST',
      url: '/usuarios',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        nome: 'Novo Com Email Duplicado',
        email: 'duplicado@raizes.com',
        senha: 'Senha@123',
        perfil: 'CLIENTE'
      }
    })

    expect(response.statusCode).toBe(409)
    expect(response.json()).toEqual({
      error: 'CONFLITO',
      message: 'Email ja cadastrado.'
    })
  })
})
