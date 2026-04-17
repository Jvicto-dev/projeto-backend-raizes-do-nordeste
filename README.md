# Raízes do Nordeste — API (backend)

API REST em **Node.js** com **Fastify**, **Knex** e **JWT**, desenvolvida no contexto do Projeto Multidisciplinar de Back-End da Uninter. O domínio prevê gestão multicanal, estoque por unidade e fluxo de pedidos; o código atual cobre autenticação e base de dados (migrations e seed).

## Requisitos

- Node.js 18+ (recomendado LTS)
- npm

## Instalação

```bash
npm install
```

## Variáveis de ambiente

Crie um arquivo `.env` na raiz (veja `.env.example`). Em testes, o projeto carrega automaticamente `.env.test` quando `NODE_ENV=test`.

| Variável | Descrição |
|----------|-----------|
| `NODE_ENV` | `development`, `test` ou `production` |
| `DATABASE_CLIENT` | Cliente Knex: `sqlite`, `pg`, `mysql` ou `mysql2` |
| `DATABASE_URL` | SQLite: caminho do arquivo (ex.: `./db/dev.db`). PostgreSQL/MySQL: string de conexão |
| `JWT_SECRET` | Segredo para assinatura JWT (mínimo 8 caracteres) |
| `PORT` | Porta HTTP (padrão: `3333`) |

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Sobe o servidor com reload (`tsx watch`) |
| `npm test` | Executa a suíte de testes (Vitest) |
| `npm run knex -- <comando>` | CLI do Knex (migrations, seeds) |

### Banco de dados (Knex)

Exemplos (sempre pela raiz do projeto):

```bash
# Aplicar migrations
npm run knex -- migrate:latest

# Reverter última migration
npm run knex -- migrate:rollback

# Popular dados iniciais (ex.: usuário admin)
npm run knex -- seed:run
```

As migrations criam as tabelas: `usuarios`, `unidades`, `produtos`, `estoque`, `pedidos`, `itens_pedido`, `fidelidade`, `pagamentos`, `logs_auditoria`. A seed `202604130001_seed_usuario_admin` insere um administrador de desenvolvimento (email `admin@raizes.com`; senha definida no código da seed — consulte `db/seeds/202604130001_seed_usuario_admin.ts`).

## Executar a API

```bash
npm run dev
```

Servidor escuta em `http://localhost:<PORT>` (padrão `3333`).

## Endpoints atuais

| Método | Caminho | Autenticação | Descrição |
|--------|---------|--------------|-----------|
| `GET` | `/` | Não | Resposta texto: `Hello World` |
| `POST` | `/auth/login` | Não | Login com `email` e `senha` (JSON); retorna `accessToken` (Bearer, 1h) e dados básicos do usuário |
| `GET` | `/hello` | Sim (JWT) | Exemplo de rota protegida |

### Login (`POST /auth/login`)

**Corpo (JSON):**

```json
{
  "email": "usuario@exemplo.com",
  "senha": "sua_senha"
}
```

**Sucesso (200):** `accessToken`, `tokenType`, `expiresIn`, `user` (`id`, `nome`, `email`, `perfil`).

**Erros padronizados:** corpo com `error` e `message` (ex.: `DADOS_INVALIDOS`, `CREDENCIAIS_INVALIDAS`).

### Rotas protegidas

Envie o header:

```http
Authorization: Bearer <accessToken>
```

Senhas no banco usam hash **scrypt** no formato `scrypt$salt$hash` (ver `src/utils/password.ts`).

## Testes

Com `NODE_ENV=test`, o módulo de ambiente carrega `.env.test` (SQLite em `./db/test.db` por padrão). Os testes em `src/app.test.ts` montam a tabela `usuarios` e um usuário fictício; não dependem das migrations completas do repositório para esse fluxo.

```bash
npm test
```

## Estrutura do projeto (principal)

```
src/
  app.ts          # Registro Fastify, JWT, rotas
  server.ts       # Entrada HTTP e rota raiz
  database.ts     # Configuração Knex e instância `db`
  env/            # Validação de variáveis com Zod
  routes/         # Rotas da API
  middlewares/    # Ex.: autenticação JWT
  http/           # Contratos de erro da API
  utils/          # Utilitários (senha)
db/
  migrations/     # Schema versionado
  seeds/          # Dados iniciais
```

## Referências (estrutura e HTTP — Rocketseat)

A organização do código segue ideias alinhadas à **trilha de Node.js da Rocketseat**, em especial o **Nível 2 — Rotas e HTTP**: separar responsabilidades, tratar a API como conjunto de rotas sobre HTTP e manter o fluxo de requisição/resposta previsível.

- Plataforma e cursos: [Rocketseat](https://www.rocketseat.com.br/)

## Estado do desenvolvimento

- Autenticação JWT e exemplo de rota protegida implementados.
- Schema amplo definido em migrations; domínio de negócio (pedidos, estoque, etc.) pode ser exposto em rotas conforme evolução do projeto.

## Licença

ISC (conforme `package.json`).
