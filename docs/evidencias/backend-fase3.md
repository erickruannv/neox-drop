# Fase 3 — levantamento e preparo da validação real

Data: 19/11/2026. Baseline: `3ba65a5`, branch `feature/backend`, árvore inicialmente limpa.
Escopo: identificar configuração disponível, confirmar artefatos e preparar conexão aos três
serviços de teste. Não reimplementar funcionalidades; não migrar/provisionar remotamente.
Documentos lidos: TESTES-BANCOS.md, evidências Fase 2, AGENTS, configuração, migration,
validator/índices e os cinco testes reais. Spec Kit conferido com feature explícita e
persistência desabilitada; sem hooks/checklists adicionais. Serena no worktree backend.

## Configuração observada sem revelar valores

A inspeção leu apenas presença/origem das chaves conhecidas. Nenhum valor de credencial,
host de banco, email de conta ou identificação do projeto remoto foi salvo neste relatório.

| Item inspecionado | Resultado |
|---|---|
| `.env`, `.env.test`, `.env.local` | Ausentes |
| `APP_ENV`, `TEST_CONNECTIONS_ENABLED`, `RUN_REAL_INTEGRATION` no processo | Ausentes |
| `ALLOWED_ORIGIN`, `COOKIE_SECRET` | Ausentes |
| `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SECRET_KEY` | Ausentes |
| `MONGODB_URI`, `MONGODB_DATABASE` | Ausentes |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Ausentes |
| `NEOX_TEST_ADMIN_EMAIL`, `NEOX_TEST_ADMIN_PASSWORD` | Ausentes |
| `NEOX_TEST_NONADMIN_EMAIL`, `NEOX_TEST_NONADMIN_PASSWORD` | Ausentes |
| Aliases comuns não lidos por Settings | Nenhum presente dentre os inspecionados |
| Settings efetivo | Válido, defaults locais; conexões desabilitadas |
| Nome Mongo default | Termina em `_test`; isso não comprova que exista um banco |
| Git ignore de `.env`/variantes | Confirmado |
| Supabase CLI instalado no PATH | Não localizado; CLI 3.2.0 foi usado via npx na Fase 2 |
| Docker | Executável presente; daemon indisponível; não foi iniciado |

O conector Supabase autenticado conseguiu listar metadados de **um projeto inativo**.
Esse projeto não foi confirmado como ambiente NEOX de teste. Não houve consulta a tabelas,
chaves, logs de banco, restauração ou alteração de plano. A conexão MCP de gerenciamento
não preenche as variáveis da aplicação nem comprova Auth/PostgreSQL operacional.
Não há credenciais Atlas/Upstash configuradas para verificar seus recursos; sua existência
nas respectivas contas não pode ser inferida pela ausência de variáveis.

## Artefatos confirmados, ainda sem aplicação real

Migration: `supabase/migrations/20261119105020_admin_profiles_rls.sql`.
SHA-256: `df6b7fdf16ccc3eb05b716656d65df4f1741a85ccd88b2633d268316474637f5`.
Cria perfis, settings, constraints, RLS, leitura do próprio perfil condicionada à sessão,
funções privadas e triggers; nenhum admin é criado/promovido automaticamente. Revoke de
escritas para anon/authenticated e SELECT de contato reservado ao backend. Sua aplicação
remota aguarda autorização explícita vinculada ao projeto de teste.

Mongo: `mongo/products_schema.json`.
SHA-256: `a4a245a53aea8adc01194636cceeee5b8199655d915fd92082490376da4f4b89`.
Validador BSON strict/error e seis índices adicionais, incluindo SKU/slug únicos. Não foi
executado inicializador, collMod, seed, drop nem criação de banco. Não há migration Redis:
listas/cache têm chaves e TTLs criados nas operações/testes autorizados.

O [roteiro operacional](../CONFIGURAR-BANCOS-TESTE.md) detalha recursos gratuitos, origem de
cada credencial, duas contas Auth, perfil admin, policies, validator/índices e ordem de teste.
O template ganhou somente variáveis vazias das contas de teste e RUN_REAL_INTEGRATION=0;
nenhum `.env` privado foi criado nem segredo gerado. Funcionalidades/API permanecem intactas.

## Resultados executados nesta rodada

| Verificação | Resultado | Natureza da evidência |
|---|---|---|
| Inspeção de presença de ambiente | Configuração de serviços ausente | Local real, sem rede de bancos |
| Inventário Supabase MCP | Um projeto inativo, finalidade não confirmada | API de gerenciamento; não teste de banco |
| `docker info` | Daemon indisponível | Infraestrutura local; não teste de banco |
| `uv run --locked python -m scripts.check_connections` | Exit 2, recusado sem opt-in | Guard local; zero probes de bancos |
| `uv run --locked pytest tests/real -q -rs` | **5 skipped**, RUN_REAL_INTEGRATION ausente | Nenhuma integração real executada |
| `uv run --locked pytest -q` | **118 passed, 5 skipped** | Unidade/contrato/HTTP local com dublês |
| `uv run --locked ruff check app tests scripts` | Aprovado | Estático local |
| `uv run --locked ruff format --check app tests scripts` | 44 arquivos aprovados | Estático local |
| `uv lock --check` | Consistente, 67 pacotes | Dependências locais |

Nenhuma falha de integração com Supabase, Atlas ou Upstash foi observada porque não houve
conexão a esses bancos. Não há justificativa para reescrever código que passou nas regressões.
Os skips não são falhas de execução remota nem sucessos de integração.

## Parte que depende do responsável

- Identificar/criar projeto Supabase **Free de teste**, fornecer URL/chave pública no `.env`
  local, preparar duas contas fictícias e autorizar a migration revisada para o projeto correto.
  Chave backend de contato é opcional para os cinco testes, necessária ao checkout real completo.
- Identificar/criar cluster Atlas **Free**, usuário restrito ao banco `_test`, acesso de rede
  da máquina e URI privada; confirmar inicialização do validator/seis índices em coleção nova.
- Identificar/criar Redis Upstash **Free**, obter URL HTTPS REST e token de leitura/escrita.
- Preencher configuração local sem enviar segredos no chat e confirmar que os destinos são
  exclusivamente de teste. Não ativar planos pagos, addons ou produção.

Apenas as validações reais que dependem desses insumos ficam pendentes. Cada serviço pode
ser testado pelo seu arquivo em tests/real quando pronto, sem esperar pelos outros. O roteiro
inclui carregamento explícito das variáveis NEOX_TEST_* do `.env` para o processo pytest;
Settings sozinho não as exporta. Migrations remotas não serão aplicadas automaticamente.

Após configuração: probes, três testes Auth/RLS, um Mongo, um Redis, regressões pertinentes,
evidências sanitizadas e correção de falhas reais. Cache sob falha real, checkout com contato
configurado e jornada UI continuam provas adicionais; não serão presumidos pelos cinco testes.
T008/T010/T018/T029 e demais aceites integrados permanecem abertos em tasks.md.
Nenhum recurso foi criado/restaurado, produção consultada, custo contratado ou deploy executado.

Fechamento local: links dos guias/evidências conferidos; template .env.example validado
pelos testes existentes; nenhum .env privado criado. Regressão final confirmou 118 passed,
5 skipped, Ruff/formatação/lock aprovados. `git diff --check` limpo. Código de aplicação,
testes existentes, scripts, migration, índices, contratos, referências e ferramentas
permaneceram idênticos ao baseline. Alterações desta rodada limitadas a documentação,
notas de andamento em tasks.md e campos vazios/comentários em .env.example. Sem push/merge.

## Revisão final do SQL para aplicação manual (19/11/2026)

O usuário confirmou projeto neox-drop-test e duas contas Auth e proibiu qualquer execução
SQL remota nesta revisão. Essa informação não foi validada por consulta ao projeto.
A migration canônica foi revisada localmente, preservando histórico Git, sem gerar cópia
concorrente. Grants agora redefinem também service_role; ela não lê admin_profiles porque
FastAPI usa bearer do usuário como authenticated + RLS. Somente SELECT store_settings
é concedido à chave backend de checkout. Schema privado não é reaproveitado silenciosamente;
ACLs das funções removem defaults de todos os papéis da aplicação. Trigger SECURITY INVOKER
explícito; nenhuma promoção/criação de perfil ou usuário.

Consultas somente leitura foram preparadas em supabase/verification/admin_profiles_preflight.sql
e admin_profiles_postflight.sql. A aplicação manual e os resultados esperados estão em
[SQL-SUPABASE-TESTE.md](../SQL-SUPABASE-TESTE.md), que registra o hash novo definitivo.
O hash informado antes neste relatório corresponde ao snapshot anterior e não é o atual.

Verificações locais: dois testes de segurança estáticos novos falharam antes dos ajustes
e passaram depois; 120 testes unitários/contrato/HTTP local passaram. Ruff e formatação
aprovados. pglast 8.9 aceitou as 22 instruções da migration, 7 do preflight, 13 do postflight,
o corpo SQL do helper de sessão e o corpo PL/pgSQL do trigger. Os dois scripts de verificação
contêm apenas SELECT e controle transacional READ ONLY/ROLLBACK, conforme AST inspecionada.
Revisão independente de segurança não apontou achados materiais no SQL revisado.

Nenhum SQL foi executado no Supabase nem em servidor PostgreSQL local; parsers não executam
DDL ou funções. Nenhuma chave/senha foi solicitada ou exibida. Testes reais foram excluídos
intencionalmente desta execução para respeitar a proibição de SQL remoto. Prontidão significa
arquivo revisado para aplicação MANUAL em schema novo como postgres, não RLS/Auth já comprovados.
O perfil admin e a compatibilidade real de auth.sessions/not_after continuam etapas supervisionadas.
Contratos, implementação FastAPI e arquivos frontend permaneceram intactos.
