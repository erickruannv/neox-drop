# Conectar e testar os bancos de desenvolvimento

Roteiro operacional da Fase 3: [configuração gratuita e retomada por serviço](CONFIGURAR-BANCOS-TESTE.md).

O backend possui as 14 operações JSON previstas, com teste local de método/rota/operationId.
Isso não comprova integração real. O histórico atualizado das leituras Supabase e da aplicação
manual informada pelo usuário está em [backend-fase3.md](evidencias/backend-fase3.md).
Seis testes em `tests/real/` ficam ignorados sem opt-in; os testes em
`tests/integration/` exercitam HTTP/serviços locais com dublês de rede/coleção.

## Configuração local

Python 3.13, `uv sync --locked`, `.env` privado conforme [.env.example](../.env.example).
Nunca copiar credenciais para fixtures, comandos versionados, imagens ou logs. `APP_ENV` só
aceita `local`/`test`; conexão exige também `TEST_CONNECTIONS_ENABLED=true`. Esses valores
não identificam se uma URL/chave é de produção: o responsável deve conferir os destinos.

| Variável | Uso |
|---|---|
| `APP_ENV=test` / `TEST_CONNECTIONS_ENABLED=true` | Opt-in somente para serviços de teste autorizados |
| `ALLOWED_ORIGIN` | Origem exata do frontend/backend, sem path; em HTTPS cookies recebem Secure |
| `COOKIE_SECRET` | Segredo aleatório próprio, mínimo 32 caracteres, igual para toda a instância; não é senha Supabase |
| `CSRF_TTL_SECONDS` / `ADMIN_REFRESH_MAX_AGE_SECONDS` | Expiração CSRF e cookie refresh; defaults 3600/604800 |
| `SUPABASE_URL` | Projeto/stack isolado de teste; HTTPS ou loopback HTTP |
| `SUPABASE_KEY` | Publishable/anon para Auth e leitura do próprio perfil sob RLS |
| `SUPABASE_SECRET_KEY` | Opcional, somente backend, secret/service_role para ler contato no checkout; ausente bloqueia link |
| `MONGODB_URI` / `MONGODB_DATABASE` | Usuário Mongo com menor privilégio; scripts/testes mutáveis exigem nome terminado em `_test` |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Upstash REST de teste; nunca acessível a JS/HTML |
| `MEDIA_ALLOWED_ORIGINS` | Array JSON de origens HTTPS explicitamente permitidas; default vazio permite apenas `/static/` |
| `REQUEST_TIMEOUT_SECONDS` / `REDIS_TIMEOUT_SECONDS` | Default 3s/1s; Mongo mínimo 1ms, Redis máximo 5s |
| `MAX_REQUEST_BYTES` / `RATE_LIMIT_*` / `LOGIN_RATE_LIMIT_REQUESTS` | Transporte e taxa local por IP/processo |

Não há fallback de telefone por env: o destino vem exclusivamente de `store_settings`.
Cookies de autenticação são HttpOnly/SameSite=Lax; CSRF assinado é vinculado ao access token,
expira e gira no login/refresh/logout. O helper `issue_csrf` fornece o token ao futuro contexto
Jinja2, nunca o JWT. Os loaders T014 estão implementados; os templates/static precisam estar
integrados no mesmo checkout. Não existe endpoint JSON alternativo de bootstrap.
Após expiração do access cookie, GET `/api/admin/me` pode renovar sessão via refresh; a UI deve
usar o novo contexto CSRF antes da próxima escrita. Validar essa jornada com os templates reais.

## Supabase: migration e perfis

Revisão definitiva para aplicação manual e consultas antes/depois: [SQL-SUPABASE-TESTE.md](SQL-SUPABASE-TESTE.md).

O usuário informou aplicação manual bem-sucedida da migration como postgres no SQL Editor;
não reaplicar nem reconciliar o histórico CLI automaticamente. Postflight e RLS de sessões
reais continuam pendentes. Executar somente o roteiro de leitura
`supabase/verification/admin_profiles_postflight.sql` e conferir seus resultados esperados.

O arquivo `supabase/migrations/20261119105020_admin_profiles_rls.sql` foi criado por
`npx --yes supabase@3.2.0 migration new admin_profiles_rls --workdir "$PWD"`.
Foi revisado e teve a sintaxe analisada por parser PostgreSQL; isso não valida execução/RLS.
Nenhum init, upgrade, link, conta, aplicação ou alteração remota foi executado.

Para uma stack local de teste **já preparada e autorizada pelo responsável**, com configuração
CLI apontando para esse ambiente, os comandos conferidos no help do CLI 3.2.0 são:

```sh
npx --yes supabase@3.2.0 migration up --workdir "$PWD"
npx --yes supabase@3.2.0 db advisors --type security --fail-on warn --workdir "$PWD"
```

Esses comandos usam alvo local por padrão no CLI 3.2.0 e **não foram executados aqui**.
Não adicionar `--remote`, não usar reset, nem apontar para um projeto vinculado de produção.
O Docker daemon não estava disponível nesta máquina e não há stack/configuração local criada
por esta etapa. Para um projeto hospedado de teste, o responsável precisa revisar alvo e
procedimento antes de aplicar a migration; não há comando remoto automático neste guia.

A migration é para schema novo: colisão de tabela deve falhar, sem mascarar um schema antigo.
Ela cria perfis inativos por padrão, singleton com contato vazio e triggers `updated_at`.
Nenhum usuário/perfil ativo é criado. O responsável deve preparar, em ambiente controlado,
um usuário Auth fictício com perfil `role=admin,is_active=true` e outro sem perfil admin ativo.
Não existe cadastro administrativo ou login de comprador na aplicação.

RLS: authenticated só lê seu perfil; anon/authenticated não escrevem nessas tabelas.
Contato não é público; service_role tem SELECT explícito. A função privada
`neox_private.current_session_is_live()` tem SECURITY DEFINER limitado, search_path vazio,
sem argumentos, verifica `auth.uid()` + `session_id` contra `auth.sessions` e `not_after`.
Sua finalidade é bloquear JWT que ainda não expirou após logout. Essa dependência do schema
Auth exige teste real; não foi declarada comprovada por leitura de SQL.

## MongoDB: coleção, índices e seed

Com banco **novo**, nome `_test`, destinos conferidos e autorização de escrita de teste:

```sh
uv run --locked python -m scripts.seed_products --initialize --verify
```

Não executado nesta rodada. O script recusa coleção existente na inicialização, evitando
`collMod` silencioso; a seed usa `$setOnInsert` por SKU e não sobrescreve registro existente.
`--verify` sozinho só lê o validator/índices; não altera coleção nem dados. `--seed` continua
opcional, separado e desnecessário para cadastrar pelo painel. O validador BSON e os
índices estão em `mongo/products_schema.json`; o wrapper mongosh é alternativa, não deve
ser executado além do Python na mesma coleção. Não executar scripts de `docs/reference/`.

A seed usa o produto fictício canônico; o caminho de imagem do exemplo não significa que
exista asset publicável/licenciado. A validação de API complementa o BSON: tamanhos únicos,
URLs/origens permitidas, atributos sem operadores, centavos/estoque int/long e versões por ms.
Antes da entrega, conferir validator/índices reais e `explain` com dataset de demonstração.

## Redis e diagnósticos

Utilizar instância Upstash REST de teste, com token apenas no backend. Não é o protocolo
`redis://`. O SDK fica sem telemetria/retry; recentes usa um EVAL atômico
LREM/LPUSH/LTRIM/EXPIRE, cinco IDs únicos e TTL 604800s. Cache público usa TTL 300s;
active/updatedAt são conferidos no Mongo em cada hit. Redis indisponível degrada o recurso;
Mongo indisponível continua 503. Checkout nunca consulta Redis para preço/estoque.

Depois da configuração autorizada:

```sh
uv run --locked python -m scripts.check_connections
RUN_REAL_INTEGRATION=1 uv run --locked pytest tests/real -q
```

O diagnóstico é somente leitura e exibe booleanos, sem hosts/URIs/chaves. Seu exit code é
0 para três probes bem-sucedidos, 1 para falha e 2 para configuração/opt-in ausente.
Health Supabase testa Auth health/settings, sem usar a raiz REST restrita nem conceder leitura anônima
de tabela privada; isso não verifica schema, RLS ou contato da loja.

Após o opt-in RUN_REAL_INTEGRATION=1 no processo, testes leem do `.env` privado ou do ambiente
`NEOX_TEST_ADMIN_EMAIL`, `NEOX_TEST_ADMIN_PASSWORD`, `NEOX_TEST_NONADMIN_EMAIL` e
`NEOX_TEST_NONADMIN_PASSWORD`, das contas fictícias previamente autorizadas. Não colocá-los
no Git nem como literais em comandos. Sem opt-in os testes ficam SKIPPED; com opt-in e
configuração incompleta devem falhar, não simular sucesso.

Os testes reais preparados cobrem Auth/perfil/RLS por leitura, revogação/refresh de sessão,
usuário sem admin ativo, HTTP cadastro–catálogo–PATCH–desativação com persistência Mongo,
CRUD/índices/soft-delete Mongo e EVAL/ordem/TTL Redis. Nenhum UPDATE é tentado no PostgreSQL;
grants são conferidos pelo postflight de leitura. Sem credenciais, isso é preparo, não prova real.
O teste Mongo cria documento com SKU aleatório de teste e limpa apenas esse SKU; o teste
Redis cria chave aleatória temporária e a remove. Isso é escrita de teste e exige autorização.
Não medem dois workers reais, cache sob falha real ou jornada com UI/WhatsApp.

## Limites e evidências pendentes

Executar localmente com `uv run --locked uvicorn app.main:app --host 127.0.0.1 --port 8000 --no-proxy-headers`.
Sem configuração de bancos: `/health` 503 unavailable, catálogo 503, admin sem cookies 401,
recentes sem cookie 200 vazio, escritas públicas sem CSRF 403. Não há `/docs` ou `/openapi.json` público.
O contrato canônico continua `docs/contracts/openapi.json`.

O rate limit é por IP/processo e a aplicação não é declarada pronta para implantação
multiworker. Antes disso, implementar contador compartilhado/limites por identidade e testar
falha/concurrency. Não houve deploy. T008 e os aceites reais dependentes ficam abertos;
T014 tem UI integrada mas falta a jornada com serviços reais; T027/T028/T029 exigem evidências reais,
e T031 não está concluída.
RF-13 continua pendente de GLB/licenças e da implementação do Claude.

Fontes primárias conferidas: [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys),
[RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),
[sessões](https://supabase.com/docs/guides/auth/sessions),
[get_user](https://supabase.com/docs/reference/python/auth-getuser),
[sign_out](https://supabase.com/docs/reference/python/auth-signout).
