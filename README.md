# Raízes do Nordeste — API (backend)

API REST em **Node.js** com **Fastify**, **Knex** e **JWT**, desenvolvida no contexto do Projeto Multidisciplinar de Back-End da Uninter. O domínio prevê gestão multicanal, estoque por unidade e fluxo de pedidos. Hoje o código cobre autenticação, **CRUD administrativo de usuários** (criar, atualizar e remover), base de dados (migrations e seed) e documentação OpenAPI.

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

As migrations criam as tabelas: `usuarios`, `unidades`, `produtos`, `estoque` (com restrição única por `unidade_id` + `produto_id`), `movimentacoes_estoque`, `pedidos`, `itens_pedido`, `fidelidade`, `pagamentos`, `logs_auditoria`. A seed `202604130001_seed_usuario_admin` insere um administrador de desenvolvimento (email `admin@raizes.com`; senha definida no código da seed — consulte `db/seeds/202604130001_seed_usuario_admin.ts`).

## Executar a API

```bash
npm run dev
```

Servidor escuta em `http://localhost:<PORT>` (padrão `3333`).

## Documentação (Swagger / OpenAPI)

Com a API rodando, acesse a UI do Swagger em:

`http://localhost:<PORT>/documentation`

Lá aparecem os endpoints registrados, esquemas e exemplos de request/response.

## Endpoints atuais

| Método | Caminho | Autenticação | Descrição |
|--------|---------|--------------|-----------|
| `GET` | `/` | Não | Resposta texto: `Hello World` |
| `POST` | `/auth/login` | Não | Login com `email` e `senha` (JSON); retorna `accessToken` (Bearer, 1h) e dados básicos do usuário |
| `GET` | `/hello` | Sim (JWT) | Exemplo de rota protegida |
| `POST` | `/usuarios` | Sim (JWT, perfil **ADMIN**) | Cadastro de usuário (`nome`, `email`, `senha`, `perfil`, `data_nascimento` opcional) |
| `PUT` | `/usuarios/:id` | Sim (JWT, perfil **ADMIN**) | Atualização parcial; envie ao menos um campo válido |
| `DELETE` | `/usuarios/:id` | Sim (JWT, perfil **ADMIN**) | Remove usuário; sucesso **204** sem corpo |

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

### Usuários (somente ADMIN)

1. Faça login com o usuário da seed (ou outro **ADMIN**) e copie o `accessToken`.
2. Nas rotas acima, envie o header:

```http
Authorization: Bearer <accessToken>
```

**Criar (`POST /usuarios`):** corpo com `nome`, `email`, `senha`, `perfil` (`ADMIN`, `GERENTE`, `CLIENTE`, `COZINHA`, `BALCAO`) e opcionalmente `data_nascimento` (formato data ISO). **201** com dados públicos do usuário criado. **409** se o email já existir.

**Atualizar (`PUT /usuarios/:id`):** `id` na URL deve ser um **UUID válido**. Corpo com um ou mais campos entre `nome`, `email`, `senha`, `perfil`, `data_nascimento`. **404** se não existir; **409** se o novo email já estiver em uso por outro usuário.

**Remover (`DELETE /usuarios/:id`):** **204** sem corpo em caso de sucesso; **404** se o usuário não existir. Se o banco tiver restrições de integridade (FK) e o registro estiver vinculado a outras tabelas, a exclusão pode falhar no nível do banco.

### Rotas protegidas

Envie o header:

```http
Authorization: Bearer <accessToken>
```

Senhas no banco usam hash **scrypt** no formato `scrypt$salt$hash` (ver `src/utils/password.ts`).

## Testes

Com `NODE_ENV=test`, o módulo de ambiente carrega `.env.test` (SQLite em `./db/test.db` por padrão). Há testes em `src/app.test.ts` (login e rota de exemplo) e em `test/` conforme evolução do projeto.

```bash
npm test
```

Para rodar apenas os testes de usuário (se existirem em `test/users.test.ts`):

```bash
npm run test -- test/users.test.ts
```

## Estrutura do projeto (principal)

```
src/
  app.ts          # Registro Fastify, JWT, Swagger, rotas
  server.ts       # Entrada HTTP e rota raiz
  database.ts     # Configuração Knex e instância `db`
  env/            # Validação de variáveis com Zod
  routes/         # Rotas da API (auth, usuários, hello)
  middlewares/    # Ex.: autenticação JWT
  http/           # Contratos de erro da API
  utils/          # Utilitários (senha)
db/
  migrations/     # Schema versionado
  seeds/          # Dados iniciais
test/             # Testes adicionais (Vitest)
```

## Referências (estrutura e HTTP — Rocketseat)

A organização do código segue ideias alinhadas à **trilha de Node.js da Rocketseat**, em especial o **Nível 2 — Rotas e HTTP**: separar responsabilidades, tratar a API como conjunto de rotas sobre HTTP e manter o fluxo de requisição/resposta previsível.

- Plataforma e cursos: [Rocketseat](https://www.rocketseat.com.br/)

## Estado do desenvolvimento

- Autenticação JWT, exemplo de rota protegida e **gestão de usuários** (`POST`, `PUT` e `DELETE` em `/usuarios`, restrita a **ADMIN**).
- Schema amplo definido em migrations; demais domínios (pedidos, estoque operacional, pagamentos, etc.) podem ser expostos em rotas conforme evolução do projeto.
- Documentação interativa em `/documentation` (OpenAPI/Swagger).

## Licença

ISC (conforme `package.json`).
