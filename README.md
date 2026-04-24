# Raízes do Nordeste — API (backend)

API REST em **Node.js** com **Fastify**, **Knex** e **JWT**, desenvolvida no contexto do Projeto Multidisciplinar de Back-End da Uninter. O domínio prevê gestão multicanal, estoque por unidade e fluxo de pedidos. Hoje o código cobre autenticação, **CRUD de usuários** (restrito a **ADMIN** nas operações de escrita), **CRUD de unidades**, **CRUD de produtos**, **CRUD de estoque** e **CRUD de movimentações de estoque** (leitura para qualquer perfil autenticado; criação, atualização e exclusão só **ADMIN**), base de dados (migrations e seed) e documentação OpenAPI.

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
| `GET` | `/usuarios` | Sim (JWT, perfil **ADMIN**) | Lista usuários com paginação (`?page=1&limit=10`; padrão page=1, limit=10; máx. limit=100) |
| `POST` | `/usuarios` | Sim (JWT, perfil **ADMIN**) | Cadastro de usuário (`nome`, `email`, `senha`, `perfil`, `data_nascimento` opcional) |
| `PUT` | `/usuarios/:id` | Sim (JWT, perfil **ADMIN**) | Atualização parcial; envie ao menos um campo válido |
| `DELETE` | `/usuarios/:id` | Sim (JWT, perfil **ADMIN**) | Remove usuário; sucesso **204** sem corpo |
| `GET` | `/unidades` | Sim (JWT, qualquer perfil) | Lista unidades com paginação (`?page=1&limit=10`; máx. `limit=100`); filtro opcional `?ativa=true` ou `?ativa=false` |
| `GET` | `/unidades/:id` | Sim (JWT, qualquer perfil) | Detalhe por UUID |
| `POST` | `/unidades` | Sim (JWT, perfil **ADMIN**) | Cria unidade (`nome`, `endereco`, `tipo_cozinha`; `ativa` opcional, padrão `true`) |
| `PUT` | `/unidades/:id` | Sim (JWT, perfil **ADMIN**) | Atualização parcial (`nome`, `endereco`, `tipo_cozinha`, `ativa`) |
| `DELETE` | `/unidades/:id` | Sim (JWT, perfil **ADMIN**) | Remove unidade; **204**; **409** se existirem pedidos vinculados à unidade |
| `GET` | `/produtos` | Sim (JWT, qualquer perfil) | Lista produtos com paginação; filtro opcional `?categoria=NomeDaCategoria` (texto exato) |
| `GET` | `/produtos/:id` | Sim (JWT, qualquer perfil) | Detalhe por UUID |
| `POST` | `/produtos` | Sim (JWT, perfil **ADMIN**) | Cria produto (`nome`, `preco_base`, `categoria`; `descricao` opcional) |
| `PUT` | `/produtos/:id` | Sim (JWT, perfil **ADMIN**) | Atualização parcial (`nome`, `descricao`, `preco_base`, `categoria`) |
| `DELETE` | `/produtos/:id` | Sim (JWT, perfil **ADMIN**) | Remove produto; **204**; **409** se houver itens de pedido ou movimentações de estoque vinculados |
| `GET` | `/estoque` | Sim (JWT, qualquer perfil) | Lista itens de estoque com paginação; filtros opcionais `?unidade_id=<uuid>&produto_id=<uuid>` |
| `GET` | `/estoque/:id` | Sim (JWT, qualquer perfil) | Detalhe por UUID |
| `POST` | `/estoque` | Sim (JWT, perfil **ADMIN**) | Cria item de estoque (`unidade_id`, `produto_id`; `quantidade_atual`/`ponto_reposicao` opcionais) |
| `PUT` | `/estoque/:id` | Sim (JWT, perfil **ADMIN**) | Atualiza item (`unidade_id`, `produto_id`, `quantidade_atual`, `ponto_reposicao`) |
| `DELETE` | `/estoque/:id` | Sim (JWT, perfil **ADMIN**) | Remove item de estoque; **204**; **404** se não existir |
| `GET` | `/movimentacoes-estoque` | Sim (JWT, qualquer perfil) | Lista movimentações com paginação e filtros por `unidade_id`, `produto_id`, `tipo_movimentacao` |
| `GET` | `/movimentacoes-estoque/:id` | Sim (JWT, qualquer perfil) | Detalhe por UUID |
| `POST` | `/movimentacoes-estoque` | Sim (JWT, perfil **ADMIN**) | Cria movimentação ENTRADA/SAIDA e atualiza saldo em `estoque` |
| `PUT` | `/movimentacoes-estoque/:id` | Sim (JWT, perfil **ADMIN**) | Atualiza movimentação (reverte efeito antigo e aplica novo no saldo) |
| `DELETE` | `/movimentacoes-estoque/:id` | Sim (JWT, perfil **ADMIN**) | Remove movimentação e reverte impacto no saldo |

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

**Listar (`GET /usuarios?page=1&limit=10`):** retorno **200** com `{ data, page, limit, total }`. Cada item em `data` contém `id`, `nome`, `email`, `perfil`, `data_nascimento`, `criado_em` (sem `senha_hash`). Ordenação: `criado_em` decrescente.

**Criar (`POST /usuarios`):** corpo com `nome`, `email`, `senha`, `perfil` (`ADMIN`, `GERENTE`, `CLIENTE`, `COZINHA`, `BALCAO`) e opcionalmente `data_nascimento` (formato data ISO). **201** com dados públicos do usuário criado. **409** se o email já existir.

**Atualizar (`PUT /usuarios/:id`):** `id` na URL deve ser um **UUID válido**. Corpo com um ou mais campos entre `nome`, `email`, `senha`, `perfil`, `data_nascimento`. **404** se não existir; **409** se o novo email já estiver em uso por outro usuário.

**Remover (`DELETE /usuarios/:id`):** **204** sem corpo em caso de sucesso; **404** se o usuário não existir. Se o banco tiver restrições de integridade (FK) e o registro estiver vinculado a outras tabelas, a exclusão pode falhar no nível do banco.

### Unidades

Todas as rotas exigem JWT. **GET** (listar e buscar por id) aceita qualquer perfil autenticado. **POST**, **PUT** e **DELETE** exigem perfil **ADMIN**.

**Listar (`GET /unidades?page=1&limit=10&ativa=true`):** **200** com `{ data, page, limit, total }`. Cada item tem `id`, `nome`, `endereco`, `tipo_cozinha`, `ativa`. Ordenação por `nome` ascendente.

**Detalhe (`GET /unidades/:id`):** **200** com o objeto da unidade; **404** se não existir.

**Criar (`POST /unidades`):** **201** com a unidade criada.

**Atualizar (`PUT /unidades/:id`):** envie ao menos um campo entre `nome`, `endereco`, `tipo_cozinha`, `ativa`. **404** se não existir.

**Remover (`DELETE /unidades/:id`):** **204** sem corpo; **404** se não existir; **409** se ainda houver registros em `pedidos` apontando para essa unidade (regra alinhada ao `ON DELETE RESTRICT` da migration).

### Produtos

Todas as rotas exigem JWT. **GET** (listar e buscar por id) aceita qualquer perfil autenticado. **POST**, **PUT** e **DELETE** exigem perfil **ADMIN**.

**Listar (`GET /produtos?page=1&limit=10&categoria=Bebidas`):** **200** com `{ data, page, limit, total }`. Cada item tem `id`, `nome`, `descricao` (pode ser `null`), `preco_base` (número), `categoria`. Ordenação por `nome` ascendente.

**Detalhe (`GET /produtos/:id`):** **200**; **404** se não existir.

**Criar (`POST /produtos`):** `preco_base` deve ser maior que zero. **201** com o produto criado.

**Atualizar (`PUT /produtos/:id`):** envie ao menos um campo. `descricao` pode ser enviada como `null` para limpar. **404** se não existir.

**Remover (`DELETE /produtos/:id`):** **204**; **404** se não existir; **409** se existirem linhas em `itens_pedido` ou `movimentacoes_estoque` para esse produto (RESTRICT nas migrations). Registros em `estoque` são removidos em cascata ao excluir o produto.

### Estoque

Todas as rotas exigem JWT. **GET** (listar e buscar por id) aceita qualquer perfil autenticado. **POST**, **PUT** e **DELETE** exigem perfil **ADMIN**.

**Listar (`GET /estoque?page=1&limit=10&unidade_id=<uuid>&produto_id=<uuid>`):** **200** com `{ data, page, limit, total }`. Cada item tem `id`, `unidade_id`, `produto_id`, `quantidade_atual`, `ponto_reposicao`.

**Detalhe (`GET /estoque/:id`):** **200**; **404** se não existir.

**Criar (`POST /estoque`):** exige `unidade_id` e `produto_id` válidos; `quantidade_atual` e `ponto_reposicao` são inteiros `>= 0` e opcionais (padrão `0`). Retorna **409** se o par `unidade_id + produto_id` já existir.

**Atualizar (`PUT /estoque/:id`):** atualiza parcialmente os campos; valida unidade/produto, garante inteiros `>= 0` e retorna **409** em conflito do par único.

**Remover (`DELETE /estoque/:id`):** **204** no sucesso; **404** se não existir.

### Movimentações de estoque

Todas as rotas exigem JWT. **GET** aceita qualquer perfil autenticado. **POST**, **PUT** e **DELETE** exigem perfil **ADMIN**.

As operações de escrita atualizam `estoque.quantidade_atual` em transação: `ENTRADA` soma, `SAIDA` subtrai (com validação de saldo). Em **PUT** e **DELETE**, o efeito anterior da movimentação é revertido antes de aplicar/remover para manter consistência histórica.

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
  routes/         # Rotas da API (auth, usuários, unidades, produtos, estoque, movimentações, hello)
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

- Autenticação JWT, rota de exemplo (`/hello`) e **gestão de usuários** (listagem e CRUD administrativo, operações de escrita restritas a **ADMIN**).
- **Unidades da rede**: CRUD em `/unidades` (leitura para qualquer usuário autenticado; escrita só **ADMIN**; exclusão bloqueada com **409** quando há pedidos vinculados).
- **Produtos do cardápio**: CRUD em `/produtos` (mesmo padrão de permissões; exclusão bloqueada com **409** quando há itens de pedido ou movimentações de estoque vinculados).
- **Estoque por unidade/produto**: CRUD em `/estoque` (par único `unidade_id + produto_id`; validação de unidade/produto existentes; conflito **409** quando o par já existe).
- **Movimentações de estoque**: CRUD em `/movimentacoes-estoque` com impacto real no saldo (entrada/saída e reversão em update/delete).
- Schema amplo definido em migrations; demais domínios (pedidos, pagamento mock, fidelidade etc.) podem ser expostos em rotas conforme evolução do projeto.
- Documentação interativa em `/documentation` (OpenAPI/Swagger).

## Licença

ISC (conforme `package.json`).
