# Raízes do Nordeste — API (backend)

## Como executar o projeto localmente

Siga **na ordem** (tudo na **raiz** do repositório, no terminal). Com isso a API sobe com banco SQLite, tabelas criadas, usuários de demonstração e documentação acessível.

| # | O que fazer | Comando / detalhe |
|---|-------------|-------------------|
| 1 | **Requisitos** na máquina | [Node.js](https://nodejs.org/) **18+** (recomendado LTS) e **npm** (vem com o Node). |
| 2 | Instalar dependências | `npm install` |
| 3 | Variáveis de ambiente | Na raiz, crie o arquivo **`.env`**. O jeito mais rápido é copiar o exemplo:<br>• Windows (PowerShell): `Copy-Item .env.example .env`<br>• Linux / macOS: `cp .env.example .env`<br>O `.env.example` já define `DATABASE_CLIENT=sqlite`, `DATABASE_URL=./db/dev.db`, `JWT_SECRET` (mínimo 8 caracteres), `PORT=3333` e `NODE_ENV=development`. **Não suba a API sem o `.env`** — o processo encerra se `JWT_SECRET` ou o banco estiverem inválidos. |
| 4 | Criar tabelas (migrations) | `npm run knex -- migrate:latest` |
| 5 | Popular usuários e unidade de demo (login de teste) | `npm run knex -- seed:run` |
| 6 | Iniciar o servidor | `npm run dev` |

**Conferência rápida:** com o servidor no ar, abra no navegador `http://localhost:3333` — deve aparecer o texto `Hello World`. Documentação interativa: `http://localhost:3333/documentation`. Rotas JSON ficam sob **`/v1`** (ex.: `POST http://localhost:3333/v1/auth/login`).

**Login de teste** (após o passo 5): `POST /v1/auth/login` com corpo `{"email":"admin@raizes.com","senha":"Admin@123"}`. Outros perfis e senhas estão na tabela **Usuários de demonstração (login)** mais abaixo neste README.

**Problemas comuns:** pasta `db` inexistente — crie `db` na raiz ou use o caminho em `DATABASE_URL`; erro de variável — confira se o `.env` está na **raiz** (mesmo nível que `package.json`); porta em uso — altere `PORT` no `.env`.

---

API REST em **Node.js** com **Fastify**, **Knex** e **JWT**, desenvolvida no contexto do Projeto Multidisciplinar de Back-End da Uninter. O domínio prevê gestão multicanal, estoque por unidade e fluxo de pedidos. Recursos principais: autenticação, **CRUD de usuários**, **unidades**, **produtos**, **estoque**, **movimentações**, **campanhas promocionais** (desconto percentual aplicável ao pedido), **pedidos** (com `valor_desconto` e `campanha_id` opcional), **pagamentos mock**, **fidelidade** (acúmulo automático de pontos no pagamento aprovado, com consentimento), **logs de auditoria** (leitura ADMIN/GERENTE), migrations, seed e OpenAPI. **Todas as rotas REST estáveis ficam sob o prefixo `/v1`** (exceto `/`, `/documentation` e health implícito).

## Requisitos

- Node.js 18+ (recomendado LTS)
- npm

## Instalação

```bash
npm install
```

## Variáveis de ambiente

Crie um arquivo `.env` na raiz (veja `.env.example`). Em testes (`NODE_ENV=test`), o projeto tenta carregar `.env.test`; existe também **`.env.test.example`** com valores seguros de exemplo para copiar em CI ou máquina local.

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
| `npm start` | Sobe a API sem watch (`tsx src/server.ts`) |

### Banco de dados (Knex)

Exemplos (sempre pela raiz do projeto):

```bash
# Aplicar migrations
npm run knex -- migrate:latest

# Reverter última migration
npm run knex -- migrate:rollback

# Popular dados iniciais (usuários demo + unidade — ver tabela abaixo)
npm run knex -- seed:run
```

As migrations criam as tabelas: `usuarios` (com `unidade_vinculada_id` opcional para perfis operacionais), `unidades`, `produtos`, `estoque` (restrição única por `unidade_id` + `produto_id`), `movimentacoes_estoque`, `campanhas`, `pedidos` (com `valor_desconto` e `campanha_id` opcional), `itens_pedido`, `fidelidade`, `pagamentos`, `logs_auditoria`.

### Usuários de demonstração (login)

Após `npm run knex -- seed:run`, use **`POST /v1/auth/login`** com `email` e `senha` em JSON.

| Perfil | E-mail | Senha | Observação |
|--------|--------|--------|------------|
| **ADMIN** | `admin@raizes.com` | `Admin@123` | Gestão ampla (usuários, unidades, produtos, campanhas, etc.) |
| **GERENTE** | `gerente@raizes.com` | `Gerente@123` | Visão gerencial (pedidos, fidelidade, auditoria, entre outras) |
| **CLIENTE** | `cliente@raizes.com` | `Cliente@123` | Fluxo de cliente (pedidos próprios, pagamentos associados, etc.) |
| **COZINHA** | `cozinha@raizes.com` | `Cozinha@123` | Operacional; vinculado à **Unidade Demo** (mesma unidade do Balcão) |
| **BALCAO** | `balcao@raizes.com` | `Balcao@123` | Operacional; vinculado à **Unidade Demo** |

A seed `db/seeds/202604130001_seed_usuarios_demonstracao.ts` também cria uma **unidade de demonstração** (`Unidade Demo Nordeste`, id fixo `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa`) e define `usuarios.unidade_vinculada_id` para **COZINHA** e **BALCAO**, conforme regras da API. Reexecutar a seed atualiza senhas e dados desses e-mails sem apagar linhas (evita quebrar chaves estrangeiras se já houver pedidos).

> **Atenção:** senhas são apenas para **desenvolvimento**; não use em produção.

## Executar a API

O comando de desenvolvimento já está no passo a passo [Como executar o projeto localmente](#como-executar-o-projeto-localmente): `npm run dev`. Servidor em `http://localhost:<PORT>` (padrão **3333**); rotas REST em `/v1/...`.

## Documentação (Swagger / OpenAPI)

Com a API rodando, acesse a UI do Swagger em:

`http://localhost:<PORT>/documentation`

Lá aparecem os endpoints registrados (com servidor base `/v1` no OpenAPI), esquemas e exemplos de request/response.

## Endpoints atuais

Prefixo da API: **`/v1`** (ex.: `POST /v1/auth/login`). A raiz **`GET /`** permanece fora do versionamento.

| Método | Caminho | Autenticação | Descrição |
|--------|---------|--------------|-----------|
| `GET` | `/` | Não | Resposta texto: `Hello World` |
| `POST` | `/v1/auth/login` | Não | Login com `email` e `senha` (JSON); retorna `accessToken` (Bearer, 1h) e dados básicos do usuário |
| `GET` | `/v1/hello` | Sim (JWT) | Exemplo de rota protegida |
| `GET` | `/v1/usuarios` | Sim (JWT, perfil **ADMIN**) | Lista usuários com paginação (`?page=1&limit=10`; máx. limit=100) |
| `POST` | `/v1/usuarios` | Sim (JWT, perfil **ADMIN**) | Cadastro (`nome`, `email`, `senha`, `perfil`, `data_nascimento` opcional, `unidade_vinculada_id` obrigatório para **COZINHA**/**BALCAO**) |
| `PUT` | `/v1/usuarios/:id` | Sim (JWT, perfil **ADMIN**) | Atualização parcial (inclui `unidade_vinculada_id`) |
| `DELETE` | `/v1/usuarios/:id` | Sim (JWT, perfil **ADMIN**) | Remove usuário; **204** |
| `GET` | `/v1/unidades` | Sim (JWT, qualquer perfil) | Lista unidades com paginação; filtro `?ativa=` |
| `GET` | `/v1/unidades/:id` | Sim (JWT, qualquer perfil) | Detalhe por UUID |
| `POST` | `/v1/unidades` | Sim (JWT, perfil **ADMIN**) | Cria unidade |
| `PUT` | `/v1/unidades/:id` | Sim (JWT, perfil **ADMIN**) | Atualização parcial |
| `DELETE` | `/v1/unidades/:id` | Sim (JWT, perfil **ADMIN**) | Remove unidade (**409** se houver pedidos) |
| `GET` | `/v1/produtos` | Sim (JWT, qualquer perfil) | Lista produtos; filtro `?categoria=` |
| `GET` | `/v1/produtos/:id` | Sim (JWT, qualquer perfil) | Detalhe |
| `POST` | `/v1/produtos` | Sim (JWT, perfil **ADMIN**) | Cria produto |
| `PUT` | `/v1/produtos/:id` | Sim (JWT, perfil **ADMIN**) | Atualização parcial |
| `DELETE` | `/v1/produtos/:id` | Sim (JWT, perfil **ADMIN**) | Remove produto |
| `GET` | `/v1/estoque` | Sim (JWT, qualquer perfil) | Lista estoque; filtros `unidade_id`, `produto_id` |
| `GET` | `/v1/estoque/:id` | Sim (JWT, qualquer perfil) | Detalhe |
| `POST` | `/v1/estoque` | Sim (JWT, perfil **ADMIN**) | Cria linha de estoque |
| `PUT` | `/v1/estoque/:id` | Sim (JWT, perfil **ADMIN**) | Atualiza |
| `DELETE` | `/v1/estoque/:id` | Sim (JWT, perfil **ADMIN**) | Remove |
| `GET` | `/v1/movimentacoes-estoque` | Sim (JWT, qualquer perfil) | Lista movimentações |
| `GET` | `/v1/movimentacoes-estoque/:id` | Sim (JWT, qualquer perfil) | Detalhe |
| `POST` | `/v1/movimentacoes-estoque` | Sim (JWT, perfil **ADMIN**) | Cria movimentação ENTRADA/SAIDA |
| `PUT` | `/v1/movimentacoes-estoque/:id` | Sim (JWT, perfil **ADMIN**) | Atualiza movimentação |
| `DELETE` | `/v1/movimentacoes-estoque/:id` | Sim (JWT, perfil **ADMIN**) | Remove movimentação |
| `GET` | `/v1/campanhas` | Sim (JWT, qualquer perfil) | Lista campanhas promocionais (`?ativas=true`, `?unidade_id=`) |
| `GET` | `/v1/campanhas/:id` | Sim (JWT, qualquer perfil) | Detalhe da campanha |
| `POST` | `/v1/campanhas` | Sim (JWT, **ADMIN**) | Cria campanha (`percentual_desconto`, vigência, `unidade_id` opcional = rede toda) |
| `PUT` | `/v1/campanhas/:id` | Sim (JWT, **ADMIN**) | Atualiza campanha |
| `DELETE` | `/v1/campanhas/:id` | Sim (JWT, **ADMIN**) | Remove campanha |
| `GET` | `/v1/pedidos` | Sim (JWT) | Lista pedidos: **CLIENTE** só os seus; **COZINHA**/**BALCAO** da `unidade_vinculada_id`; **ADMIN**/**GERENTE** todos (filtros opcionais) |
| `GET` | `/v1/pedidos/:id` | Sim (JWT) | Detalhe com itens (mesma regra de visão da listagem) |
| `POST` | `/v1/pedidos` | Sim (JWT) | Cria pedido; opcional `campanha_id` (desconto sobre o total dos itens); `cliente_id` só **ADMIN** |
| `PUT` | `/v1/pedidos/:id` | Sim (JWT) | Atualiza `status`; **CANCELADO** devolve estoque |
| `DELETE` | `/v1/pedidos/:id` | Sim (JWT, **ADMIN**) | Remove pedido |
| `GET` | `/v1/pagamentos` | Sim (JWT) | Lista pagamentos |
| `GET` | `/v1/pagamentos/:id` | Sim (JWT) | Detalhe |
| `POST` | `/v1/pagamentos` | Sim (JWT) | Pagamento mock; **APROVADO** acumula pontos de fidelidade (1 ponto por R$ 1 do `valor_total`, se consentimento) |
| `PUT` | `/v1/pagamentos/:id` | Sim (JWT, perfis operacionais) | Atualiza metadados |
| `DELETE` | `/v1/pagamentos/:id` | Sim (JWT, **ADMIN**) | Remove pagamento **NEGADO** |
| `GET` | `/v1/fidelidade` | Sim (JWT) | Lista registros de fidelidade |
| `GET` | `/v1/fidelidade/:id` | Sim (JWT) | Detalhe |
| `POST` | `/v1/fidelidade` | Sim (JWT, **ADMIN/GERENTE**) | Cria cadastro |
| `PUT` | `/v1/fidelidade/:id` | Sim (JWT, **ADMIN/GERENTE**) | Atualiza (`ajuste_pontos_delta`, consentimento) |
| `DELETE` | `/v1/fidelidade/:id` | Sim (JWT, **ADMIN**) | Remove cadastro |
| `GET` | `/v1/logs-auditoria` | Sim (JWT, **ADMIN/GERENTE**) | Lista logs com paginação e filtros (`usuario_id`, `acao`, `desde`, `ate`) |
| `GET` | `/v1/logs-auditoria/:id` | Sim (JWT, **ADMIN/GERENTE**) | Detalhe de um log |

### Login (`POST /v1/auth/login`)

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

**Listar (`GET /v1/usuarios?page=1&limit=10`):** retorno **200** com `{ data, page, limit, total }`. Cada item inclui `unidade_vinculada_id` (pode ser `null`). Ordenação: `criado_em` decrescente.

**Criar (`POST /v1/usuarios`):** corpo com `nome`, `email`, `senha`, `perfil` e opcionalmente `data_nascimento`. Perfis **COZINHA** e **BALCAO** **devem** enviar `unidade_vinculada_id` (UUID de uma unidade existente), para habilitar fila de pedidos e detalhe por unidade.

**Atualizar (`PUT /v1/usuarios/:id`):** permite também `unidade_vinculada_id` (ou `null`). Manter **COZINHA**/**BALCAO** sem unidade resulta em **400**.

**Remover (`DELETE /v1/usuarios/:id`):** **204** no sucesso.

### Unidades

Todas as rotas exigem JWT. **GET** (listar e buscar por id) aceita qualquer perfil autenticado. **POST**, **PUT** e **DELETE** exigem perfil **ADMIN**.

**Listar (`GET /v1/unidades?page=1&limit=10&ativa=true`):** **200** com `{ data, page, limit, total }`. Cada item tem `id`, `nome`, `endereco`, `tipo_cozinha`, `ativa`. Ordenação por `nome` ascendente.

**Detalhe (`GET /v1/unidades/:id`):** **200** com o objeto da unidade; **404** se não existir.

**Criar (`POST /v1/unidades`):** **201** com a unidade criada.

**Atualizar (`PUT /v1/unidades/:id`):** envie ao menos um campo entre `nome`, `endereco`, `tipo_cozinha`, `ativa`. **404** se não existir.

**Remover (`DELETE /v1/unidades/:id`):** **204** sem corpo; **404** se não existir; **409** se ainda houver registros em `pedidos` apontando para essa unidade (regra alinhada ao `ON DELETE RESTRICT` da migration).

### Produtos

Todas as rotas exigem JWT. **GET** (listar e buscar por id) aceita qualquer perfil autenticado. **POST**, **PUT** e **DELETE** exigem perfil **ADMIN**.

**Listar (`GET /v1/produtos?page=1&limit=10&categoria=Bebidas`):** **200** com `{ data, page, limit, total }`. Cada item tem `id`, `nome`, `descricao` (pode ser `null`), `preco_base` (número), `categoria`. Ordenação por `nome` ascendente.

**Detalhe (`GET /v1/produtos/:id`):** **200**; **404** se não existir.

**Criar (`POST /v1/produtos`):** `preco_base` deve ser maior que zero. **201** com o produto criado.

**Atualizar (`PUT /v1/produtos/:id`):** envie ao menos um campo. `descricao` pode ser enviada como `null` para limpar. **404** se não existir.

**Remover (`DELETE /v1/produtos/:id`):** **204**; **404** se não existir; **409** se existirem linhas em `itens_pedido` ou `movimentacoes_estoque` para esse produto (RESTRICT nas migrations). Registros em `estoque` são removidos em cascata ao excluir o produto.

### Estoque

Todas as rotas exigem JWT. **GET** (listar e buscar por id) aceita qualquer perfil autenticado. **POST**, **PUT** e **DELETE** exigem perfil **ADMIN**.

**Listar (`GET /v1/estoque?page=1&limit=10&unidade_id=<uuid>&produto_id=<uuid>`):** **200** com `{ data, page, limit, total }`. Cada item tem `id`, `unidade_id`, `produto_id`, `quantidade_atual`, `ponto_reposicao`.

**Detalhe (`GET /v1/estoque/:id`):** **200**; **404** se não existir.

**Criar (`POST /v1/estoque`):** exige `unidade_id` e `produto_id` válidos; `quantidade_atual` e `ponto_reposicao` são inteiros `>= 0` e opcionais (padrão `0`). Retorna **409** se o par `unidade_id + produto_id` já existir.

**Atualizar (`PUT /v1/estoque/:id`):** atualiza parcialmente os campos; valida unidade/produto, garante inteiros `>= 0` e retorna **409** em conflito do par único.

**Remover (`DELETE /v1/estoque/:id`):** **204** no sucesso; **404** se não existir.

### Movimentações de estoque

Todas as rotas exigem JWT. **GET** aceita qualquer perfil autenticado. **POST**, **PUT** e **DELETE** exigem perfil **ADMIN**.

As operações de escrita atualizam `estoque.quantidade_atual` em transação: `ENTRADA` soma, `SAIDA` subtrai (com validação de saldo). Em **PUT** e **DELETE**, o efeito anterior da movimentação é revertido antes de aplicar/remover para manter consistência histórica.

### Pedidos

Rotas sob **`/v1/pedidos`**. **Listagem:** **CLIENTE** só pedidos próprios; **ADMIN**/**GERENTE** veem todos (filtros `cliente_id`, `unidade_id`, etc.); **COZINHA**/**BALCAO** veem todos os pedidos da **mesma unidade** indicada em `usuarios.unidade_vinculada_id` (**403** `CONFIG_INCOMPLETA` se a unidade não estiver definida).

**Criar (`POST /v1/pedidos`):** corpo com `unidade_id`, `canalPedido`, `itens`; opcional **`campanha_id`** (campanha ativa, dentro da vigência, aplicável à unidade ou global). O subtotal vem dos preços dos produtos; o **`valor_desconto`** e o **`valor_total`** final são persistidos no cabeçalho do pedido. Itens continuam com `preco_unitario_no_momento` sem desconto por linha (MVP). Baixa de estoque na criação.

**Atualizar status (`PUT /v1/pedidos/:id`):** mesmas transições de status; **COZINHA**/**BALCAO** podem operar pedidos da sua unidade vinculada (não só onde são `cliente_id`).

**Excluir (`DELETE /v1/pedidos/:id`):** somente **ADMIN**, com as mesmas restrições já documentadas.

### Pagamentos (mock)

`POST /v1/pagamentos` fecha o fluxo do pedido:
- `APROVADO`: pedido vai para `EM_PREPARO`;
- `NEGADO`: pedido vai para `CANCELADO` e o estoque e restaurado.

Regras:
- so aceita pagamento para pedido em `AGUARDANDO_PAGAMENTO`;
- cada pedido aceita apenas um pagamento (`pedido_id` unico em `pagamentos`);
- leitura respeita dono do pedido para perfis comuns.

### Fidelidade

Permissoes:
- **ADMIN/GERENTE**: criam e atualizam registro de fidelidade;
- **ADMIN**: pode remover;
- **CLIENTE**: visualiza apenas o proprio registro.

Campos principais:
- `saldo_pontos` (inteiro, nao negativo);
- `consentimento_explicitado` (LGPD);
- `data_consentimento`;
- `ultima_atualizacao`.

No `PUT /v1/fidelidade/:id`, use `ajuste_pontos_delta` para creditar/debitar pontos sem sobrescrever manualmente o saldo.

**Integração com pedido:** em pagamento mock **`APROVADO`**, se existir registro em `fidelidade` para o `cliente_id` do pedido com `consentimento_explicitado = true`, o sistema **credita automaticamente** pontos iguais à parte inteira do **`valor_total`** do pedido (ex.: R$ 42,70 → 42 pontos).

### LGPD e auditoria

- Consentimento explícito permanece modelado em **fidelidade**; não há, neste escopo, endpoints completos de portabilidade/remoção de titular.
- O evento de auditoria **`AUTH_LOGIN`** grava em `detalhes` apenas **`usuario_id`** e **`perfil`** (sem email), reduzindo PII em log mantendo rastreabilidade.

### Rotas protegidas

Envie o header:

```http
Authorization: Bearer <accessToken>
```

Senhas no banco usam hash **scrypt** no formato `scrypt$salt$hash` (ver `src/utils/password.ts`).

## Testes

Com `NODE_ENV=test`, o ambiente carrega `.env.test` se existir; use **`.env.test.example`** como modelo (SQLite em `./db/test.db`). Há testes em `src/app.test.ts` e em `test/` (URLs sob `/v1`).

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
  routes/         # Rotas da API (auth, usuários, unidades, produtos, estoque, movimentações, campanhas, pedidos, pagamentos, fidelidade, logs-auditoria, hello)
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

- **Versionamento:** rotas REST sob **`/v1`**; OpenAPI com servidor base `/v1`.
- **Autenticação** JWT, exemplo **`/v1/hello`** e **usuários** (CRUD **ADMIN**), com **`unidade_vinculada_id`** para **COZINHA**/**BALCAO**.
- **Unidades**, **produtos**, **estoque**, **movimentações**: CRUD conforme README e migrations.
- **Campanhas**: CRUD administrativo (**ADMIN**) e listagem/consulta para uso no checkout; desconto percentual aplicado no total do pedido.
- **Pedidos**: multicanal, estoque, opcional **`campanha_id`**, campos **`valor_desconto`** / **`valor_total`** final; **COZINHA**/**BALCAO** enxergam fila por unidade vinculada.
- **Pagamentos mock** e **fidelidade** com crédito automático de pontos no **APROVADO** (com consentimento).
- **Logs de auditoria** persistidos e consulta **`/v1/logs-auditoria`** (**ADMIN**/**GERENTE**); várias mutações já registram eventos.
- Documentação interativa em **`/documentation`** (Swagger/OpenAPI).

## Licença

ISC (conforme `package.json`).
