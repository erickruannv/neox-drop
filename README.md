# NEOX drop — E-commerce de tênis com banco de dados poliglota

Trabalho da **3ª Avaliação — Projeto de Banco de Dados**: e-commerce/catálogo de tênis que usa
três bancos de dados, cada um no caso de uso em que funciona melhor.

- **Vídeo de demonstração:** https://youtu.be/koEEcLRoyHg
- **Repositório:** https://github.com/erickruannv/neox-drop

## Arquitetura dos dados

| Banco | Serviço | O que guarda | Por que esse banco |
|---|---|---|---|
| **PostgreSQL** | Supabase (Auth + Database) | Usuários e sessões do admin (`auth.users`), perfil do administrador (`admin_profiles`) e configurações da loja, como o WhatsApp de pedidos (`store_settings`) | Dados relacionais e sensíveis: autenticação pronta, chaves estrangeiras e Row Level Security |
| **MongoDB** | MongoDB Atlas | Produtos (coleção `products`): nome, marca, descrição, preço em centavos, imagens, cor, numerações com estoque, destaque e créditos | Documento flexível: cada tênis tem lista de tamanhos, galeria e atributos opcionais sem tabelas extras |
| **Redis** | Upstash | Últimos 5 tênis vistos e últimas 3 pesquisas de cada visitante (TTL de 7 dias); cache dos produtos (TTL de 5 min) | Dados temporários e de leitura rápida, com expiração automática |

```
Navegador ──► FastAPI (Python 3.13, Jinja2, Tailwind, JS)
                ├─► Supabase/PostgreSQL ─ login do admin, perfil, WhatsApp da loja
                ├─► MongoDB Atlas ─────── cadastro e consulta de produtos
                └─► Upstash Redis ─────── vistos recentemente, pesquisas recentes, cache
```

Se o Redis cair, a loja continua funcionando: só o histórico recente e o cache param. Preço e
estoque sempre vêm do MongoDB.

## Funcionalidades exigidas

| Exigência | Onde está |
|---|---|
| Login seguro do administrador (Supabase) | `/admin/login`. Sessão em cookie HttpOnly, proteção CSRF, limite de tentativas e logout. `/admin/produtos` exige admin ativo em `admin_profiles` |
| Cadastro de produtos no MongoDB (nome, descrição, preço, imagem…) | Painel `/admin/produtos`. Inclui envio da foto do tênis, numerações com estoque e opções para **editar** e **excluir** |
| Catálogo com os produtos do MongoDB | Home `/` e catálogo `/tenis`, com busca e filtros por marca, categoria, tamanho e ordem. Produto novo aparece na hora |
| Redis: itens vistos recentemente | Seção "Vistos recentemente" na home (link **Recentes** no menu) e "Pesquisas recentes" ao clicar na busca |
| Carrinho (adicionar, remover, total) | Botão do carrinho no cabeçalho: escolha de tamanho, quantidade, remoção e subtotal |
| Botão Comprar → WhatsApp | "Pedir pelo WhatsApp" revalida preço e estoque no MongoDB e abre `wa.me` com a mensagem pronta, por exemplo: `Olá, gostaria de pedir: 2x Nike Dunk Low — tamanho BR 41 — R$ 1.599,80` … `Total: R$ 1.599,80` |

Extras: página de produto com galeria e visualização 3D (Sketchfab) do Air Max 95, layout
responsivo e testes automatizados.

## Tecnologias

- **Backend:** Python 3.13, FastAPI, Uvicorn, Pydantic, PyMongo (async), cliente REST do Upstash
- **Frontend:** templates Jinja2, Tailwind CSS v4, JavaScript sem framework
- **Bancos:** Supabase (PostgreSQL + Auth), MongoDB Atlas, Upstash Redis
- **Testes:** pytest (backend e contrato OpenAPI) e Playwright (interface e acessibilidade)

## Como executar

### 1. Pré-requisitos

- Python 3.13 e [uv](https://docs.astral.sh/uv/)
- Node.js 20+ e pnpm 10, usados só para compilar o CSS e rodar os testes de interface
- Contas gratuitas no Supabase, no MongoDB Atlas e no Upstash

### 2. Configurar os bancos

**Supabase (PostgreSQL + Auth)**
1. Crie um projeto e execute no SQL Editor a migration
   [`supabase/migrations/20261119105020_admin_profiles_rls.sql`](supabase/migrations/20261119105020_admin_profiles_rls.sql).
   Ela cria `admin_profiles` e `store_settings`, com RLS e permissões mínimas.
2. Em **Authentication → Users**, crie o usuário administrador.
3. Promova esse usuário (troque pelo UUID dele):
   ```sql
   insert into public.admin_profiles (user_id, display_name, role, is_active)
   values ('UUID-DO-USUARIO', 'Administrador', 'admin', true);
   ```
4. Configure o WhatsApp que recebe os pedidos (DDI + DDD + número, só dígitos):
   ```sql
   update public.store_settings set whatsapp_e164_digits = '5589999999999' where id = 1;
   ```
5. Em **Settings → API Keys**, copie a URL do projeto, a chave *publishable* e a chave *secret*.
   A secret é usada só no backend.

**MongoDB Atlas**
1. Crie um cluster gratuito (M0), um banco cujo nome termine em `_test` (ex.: `neox_drop_test`)
   e um usuário com acesso só a esse banco.
2. Em **Network Access**, libere apenas o IP da sua máquina.
3. Crie a coleção `products` com validação e os 6 índices definidos em
   [`mongo/products_schema.json`](mongo/products_schema.json):
   ```sh
   APP_ENV=test TEST_CONNECTIONS_ENABLED=true uv run --locked python -m scripts.seed_products --initialize --verify
   ```
   Também é possível criar pelo mongosh com [`mongo/products_schema.mongodb.js`](mongo/products_schema.mongodb.js).
4. Cadastre os produtos pelo painel admin. Os 9 tênis do catálogo apresentado estão em
   [`mongo/catalogo-academico.json`](mongo/catalogo-academico.json).

**Upstash Redis**
1. Crie um banco Redis gratuito e copie a **REST URL** e o **token de leitura e escrita**.
   Não há migration: as chaves são criadas pela aplicação.

### 3. Variáveis de ambiente

Copie [`.env.example`](.env.example) para `.env` e preencha:

```dotenv
APP_ENV=test
TEST_CONNECTIONS_ENABLED=true
ALLOWED_ORIGIN=http://127.0.0.1:8000
COOKIE_SECRET=            # gere com: python -c "import secrets; print(secrets.token_urlsafe(48))"
SUPABASE_URL=
SUPABASE_KEY=             # chave publishable
SUPABASE_SECRET_KEY=      # chave secret, só backend (lê o WhatsApp da loja)
MONGODB_URI=              # mongodb+srv://… (com TLS)
MONGODB_DATABASE=neox_drop_test
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

O `.env` está no `.gitignore` e nunca deve ser enviado ao Git.

### 4. Instalar e rodar

```sh
uv sync --locked
pnpm install --frozen-lockfile
pnpm build
uv run --locked uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 1
```

Abra http://127.0.0.1:8000. Painel admin: http://127.0.0.1:8000/admin/login.
Para conferir as conexões sem alterar dados: `uv run --locked python -m scripts.check_connections`.

## Testes

```sh
uv run --locked pytest -q --ignore=tests/real   # backend, regras de negócio e contrato OpenAPI
pnpm test:ui                                     # interface (Playwright), sem acessar os bancos reais
```

Os testes em `tests/real` usam os bancos de verdade e só rodam com `RUN_REAL_INTEGRATION=1`.

## Estrutura

```
app/
  api/          rotas (páginas, catálogo, admin, checkout, recentes)
  services/     regras: catálogo/MongoDB, admin/Supabase, recentes/Redis, carrinho/WhatsApp
  schemas/      modelos Pydantic (validação de entrada e saída)
  templates/    páginas Jinja2
  static/       CSS, JS e imagens
supabase/       migration SQL (tabelas, RLS e permissões)
mongo/          validação e índices da coleção products, catálogo acadêmico
docs/contracts/ contrato da API (openapi.json)
tests/          pytest (unit, integration, contract, real) e Playwright (e2e)
```

## Segurança e limites

- Não existe cadastro público de administrador: o acesso depende de uma linha ativa em `admin_profiles`.
- Senhas e tokens ficam só no Supabase e em cookies HttpOnly. Chaves ficam só no `.env` do servidor.
- O checkout não processa pagamento, não reserva estoque e não envia mensagem sozinho: ele gera o
  link do WhatsApp com o pedido e o cliente confirma o envio.
- Preços e estoques são fictícios, para fins acadêmicos. As fotos têm crédito e licença na página de cada produto.

Histórico detalhado do desenvolvimento e das validações: [docs/historico-desenvolvimento.md](docs/historico-desenvolvimento.md).
