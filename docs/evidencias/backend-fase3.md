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

## Aplicação manual informada e diagnóstico real (19/11/2026)

O usuário informou aplicação manual bem-sucedida, como postgres, da migration
`20261119105020_admin_profiles_rls.sql`, com preflight aprovado. Não reaplicamos SQL,
não reconciliamos histórico remoto e não executamos SQL de escrita. O conector disponível
não lista `neox-drop-test`; sem acesso de gerenciamento, o roteiro único de postflight
continua `supabase/verification/admin_profiles_postflight.sql` (transação READ ONLY/ROLLBACK).
As tabelas, policies, funções, triggers e grants esperados estão descritos nesse arquivo;
sua confirmação remota completa depende do resultado manual. SELECT de service_role em
admin_profiles continua desnecessário: a autorização usa o JWT do usuário + authenticated/RLS.

Leituras HTTP reais por Python/httpx com apenas a Publishable key configurada:
- Auth health e settings: HTTP 200.
- Raiz REST: HTTP 401, `Secret API key required`; a documentação oficial confirma que
  o OpenAPI da Data API exige Secret key, embora a Publishable funcione nas rotas de tabelas:
  https://supabase.com/docs/guides/getting-started/api-keys . Não usamos Secret key.
- admin_profiles, SELECT user_id com limit=0: HTTP 401, código 42501, permissão de tabela
  negada ao acesso anônimo. Nenhuma linha pessoal retornou. Isso confirma comunicação com
  a rota da tabela e negação anônima, mas não comprova RLS de usuários autenticados.

Settings leu SUPABASE_URL/KEY iguais ao arquivo local, chave com formato Publishable;
TEST_CONNECTIONS_ENABLED permanece false. A chave foi aceita pelo endpoint configurado;
o nome amigável do projeto não foi comprovado pelo conector. O healthcheck passou a usar
Auth health/settings, sem depender da raiz restrita. Ele não é prova do schema PostgreSQL.
Regressão: 120 passed, 5 skipped; Ruff aprovado. Nenhum segredo registrado neste relatório.

Login real ainda depende de COOKIE_SECRET local, opt-in explícito de conexões de teste,
perfil ativo provisionado manualmente sob autorização e postflight/RLS comportamental.
Não criamos usuários/perfis nem promovemos contas. MongoDB Atlas e Upstash ainda sem
configuração local; não declaramos integração real desses serviços.

## Loaders executáveis e preparação da integração (19/11/2026)

T014 implementada parcialmente em feature/backend: rotas HTML /, /tenis,
/tenis/{slug}, /admin/login, /admin e /admin/produtos e mount /static. Reutilizam catálogo,
autorização Supabase e CSRF existentes, preservando as 14 operações JSON/OpenAPI e seus corpos.
Contextos seguem ui.md, HTML não é cacheado, produto ausente retorna HTML 404, visitante sem
sessão recebe 303 para login e perfil negado recebe 403 sem dados administrativos.

Revisão independente encontrou refresh perdido quando a consulta MongoDB falha após renovar
sessão. Quatro regressões falharam antes da correção e passaram depois: HTML/API, erro tratado
503 e inesperado 500. Middleware preserva os novos cookies HttpOnly/CSRF e no-store apenas em
erros após renovação e autorização bem-sucedidas. Sucesso/logout mantêm seu tratamento próprio.
Revisão posterior confirmou correção sem novos achados bloqueantes.

Verificação completa: `uv run pytest -q`: 129 passed, 5 skipped. `uv run ruff check app tests
scripts`, `uv run ruff format --check app tests scripts`, `uv lock --check` e `git diff --check`
aprovados. Os cinco testes reais continuam ignorados por falta de configuração/opt-in; não
foram substituídos por mocks como prova de bancos. Settings/.env privados não foram alterados.

Uvicorn iniciou realmente em loopback, um worker, com conexões desabilitadas; smoke HTTP:
/health 503, /api/products 503, /api/admin/products 401 e /admin/produtos 303. O processo de
verificação foi encerrado. Isso comprova inicialização/proteções locais, não serviços reais.

Snapshot temporário do frontend 36b0492, sem editar o checkout do Claude: templates reais com
StrictUndefined renderizaram home, catálogo, detalhe, login e painel com HTTP 200; sem sessão,
painel retornou 303. Coleção Mongo e autorização do painel foram explicitamente substituídas
nesse smoke: integração de contexto Jinja, não autenticação real. Snapshot removido ao terminar.

Worktrees: main em /Users/dg/Documents/NeoxDrop; feature/backend em NeoxDrop-backend;
feature/frontend em NeoxDrop-frontend. Frontend avançou de e0bec72 para 36b0492 durante esta
rodada. A confirmação de entrega final foi solicitada; nenhum merge/checkout/push/deploy foi
feito, nem alteração no worktree do Claude. Não existe ainda branch de integração desta rodada.
Backend isolado não contém templates/static; essas dependências virão do merge autorizado.

Preview já existente do Claude respondeu HTTP 200 com banner de demonstração em
http://127.0.0.1:4180/ . É o servidor Python de demonstração, separado do FastAPI: catálogo,
login/painel e checkout usam dados/respostas fictícios, sem banco ou WhatsApp real.
Não inserir credenciais reais nesse login. Para iniciar novamente quando a porta estiver livre:
`cd /Users/dg/Documents/NeoxDrop-frontend` e `pnpm demo`. Não encerramos o servidor existente.
O navegador assistido não pôde abrir porque seu host está indisponível nesta sessão.

Git: .env ignorado e não rastreado, apenas .env.example entre arquivos de configuração de env.
Comparação em memória da chave configurada contra 534 blobs de todas as refs locais não
identificou correspondências; nenhum valor foi impresso. Nenhum arquivo frontend, contrato,
migration, configuração de ferramentas ou referência foi modificado pelo backend nesta rodada.
Prontidão para push do backend depende da revisão do diff final; não equivale a prontidão de
produção. Rate limit continua por processo: usar um worker local; antes de multiworker é
necessário limitar no gateway/Redis. Supabase postflight/RLS, MongoDB, Upstash e perfil ativo
continuam bloqueios da jornada administrativa real.

Build/UI do snapshot 36b0492: `pnpm build` aprovado (vendor e Tailwind), render_preview.py
validou/renderizou os contextos contra OpenAPI, e Playwright executou 94 testes com Chromium:
92 passed, 2 skipped em 28s. Desktop 1440px e mobile 360px; as exclusões mobile são menu
visível apenas em desktop e arraste 3D por mouse. Jornada coberta inclui home, catálogo,
detalhe, carrinho, checkout e telas administrativas. Respostas API nesses testes são
simuladas; não comprovam autenticação, estoque, contato WhatsApp ou bancos reais. GLB usado
pelo teste é sintético, não ativo licenciado para publicação. Avisos Node sobre NO_COLOR/
FORCE_COLOR não afetaram resultado. Build, fixtures, servidor e saídas rodaram em diretório
temporário isolado, removido ao terminar; nenhuma instalação/edição no checkout do Claude.
Git do frontend continuou limpo no mesmo commit. Não houve merge, push ou deploy.

## Integração definitiva local do frontend final (19/11/2026)

Usuário confirmou oficialmente entrega final 36b0492 e autorizou integração. As três worktrees
estavam limpas: main fc48c18, backend 610cc39, frontend 36b0492. Reutilizamos feature/backend,
sem nova branch/worktree. Merge de dois pais 3855a15 preserva backend e frontend. Único conflito:
.gitignore, resolvido por união de exclusões Supabase e build UI. Main e checkout/branch do
Claude não foram modificados. Nada enviado ao GitHub; sem deploy ou escrita em bancos.

FastAPI real está iniciado em http://127.0.0.1:8000/, loopback, um worker, sem proxy headers.
Home e catálogo usam os templates reais; como MongoDB não está configurado, renderizam
HTML 503 com aviso, sem inventar produtos/estoque/preços. Falha de consulta é distinguida de
catálogo vazio. Detalhe sem banco mostra página de erro 503, não produto fictício. Carrinho
real abre no header. Login HTML 200 em /admin/login fornece meta CSRF + cookie HttpOnly;
sem sessão /admin e /admin/produtos redirecionam 303 ao login. Painel não foi liberado com
perfil fictício; renderização autorizada permanece coberta por testes locais com dublês.
Não foi necessário alterar OpenAPI nem criar bootstrap/API paralela.

COOKIE_SECRET ausente foi gerado por secrets.token_urlsafe(48), apenas no .env ignorado,
com modo 600, sem imprimir valor. Settings corresponde ao arquivo, flag de conexões permanece
false. Atualização mínima dos templates feita exclusivamente neste checkout integrado:
avisos/erros HTML e distinção entre falha e vazio; fontes originais do Claude preservadas.

Compatibilidade de checkout/CSRF: teste de contrato HTTP passou a obter o token da página
real de produto antes do POST, em vez de fabricar bootstrap por helper. Revalidação de preço
em centavos e resposta 200 são testadas com coleção/contato simulados, não bancos reais.
Navegador contra Uvicorn real demonstrou POST /api/checkout com CSRF válido retornando 503
por banco indisponível; sem CSRF, 403. Nenhum waUrl ou disponibilidade real foi inventado.
Corrigimos também a colisão de cookies CSRF/no-store em páginas de erro após refresh: cookies
novos já definidos no HTML têm precedência, e o refresh permanece preservado em 503/500.

Playwright recebeu modo NEOX_FASTAPI_URL que usa o servidor existente, sem servidor de
fixtures nem interceptação de APIs. Oito testes desktop/mobile passaram: home/assets,
carrinho vazio, catálogo/filtro real 503, detalhe indisponível, login/CSRF real com bloqueio
por opt-in ausente, proteção do painel e checkout bloqueado. Uma primeira execução teve
falha no teste ao tentar preencher filtros mobile recolhidos; teste corrigido para abrir
summary como usuário. Outra regressão comprovou mistura de vazio/erro antes do ajuste do
texto/visibilidade; passou depois. Não houve alteração para mascarar erro de banco.

Supabase: repetidas leituras reais por Python, somente Publishable key: Auth health/settings
200; SELECT user_id limit=0 em admin_profiles 401/42501 (negação anônima). Conector novamente
não confirmou acesso ao projeto neox-drop-test. Postflight SQL revisto permanece somente
SELECT e BEGIN READ ONLY/ROLLBACK, para execução manual pelo responsável. Nenhum SQL remoto
foi executado; migration não reaplicada, histórico remoto não reconciliado. Metadados completos
e RLS com sessões admin/não-admin continuam sem comprovação remota.

Revisão independente não encontrou falha bloqueante de segurança/contrato; observação menor
sobre vazio versus indisponibilidade foi corrigida com regressão de navegador. Auditoria
comparou os dois valores secretos configurados contra 544 blobs de todas as refs locais e
contra arquivos rastreáveis do checkout, sem correspondências; .env não rastreado, dist,
node_modules e resultados de testes ignorados. Isso não é auditoria externa de produção.

Pendências para jornada real: configurar MongoDB Atlas gratuito (URI, banco neox_drop_test,
usuário restrito e IP da máquina), revisar/autorizar validator/seis índices existentes antes
de executar inicialização; configurar Upstash gratuito com REST URL/token; confirmar postflight,
autorizar provisionamento manual de perfil admin ativo e configurar testes de sessão. Opt-in
APP_ENV=test/TEST_CONNECTIONS_ENABLED=true somente após conferir destinos. Para checkout
completo, contato autorizado em store_settings e chave backend privada ainda são necessários.
Não alteramos nenhum desses recursos. Rate limit por processo exige um worker até solução
compartilhada antes de multiworker. RF-13 permanece pendente de GLB/licença reais.

Verificação final desta integração: `uv run pytest -q`: 130 passed, 5 skipped; Ruff check e
format no escopo backend (app/scripts/tests unit,contract,integration,real), uv lock --check
e git diff --check aprovados. pnpm install --frozen-lockfile e build aprovados, sem upgrade
de ferramentas/lockfiles. `pnpm test:ui --workers=2`: 92 passed, 2 skipped (28.2s); usa fixtures.
`NEOX_FASTAPI_URL=http://127.0.0.1:8000 pnpm exec playwright test --workers=2`: 8 passed (3.2s),
sem mocks de rede. Esses oito validam o FastAPI/JS reais com provedores desabilitados, não os
três bancos. Os cinco testes de serviços reais continuam sem execução/opt-in. API/HTML de
checkout não gera link real sem MongoDB/contato. README contém comandos exatos para build,
servidor e os dois modos de testes. Servidor Uvicorn mantido ativo para visualização do usuário.

## Preparação da demonstração com persistência Atlas (20/11/2026)

Mantida feature/backend a partir de 11dbca1; integração 3855a15 não foi refeita. Adaptador
Mongo assíncrono, timeouts, fechamento de clientes, validator, seis índices e CRUD já existiam.
Preços em centavos, tamanhos/estoques, allowlist, duplicatas, concorrência, projeção pública,
cache versionado e soft-delete têm testes locais. Cadastro/listagem existem no painel; edição
PATCH e desativação DELETE estão disponíveis na API, sem novos controles UI nesta rodada.

Alterações necessárias: configuração rejeita Mongo remoto sem TLS, flags que desativam
certificado/hostname, TLS=false/ssl=false e banco habilitado sem sufixo _test. TLS do SRV
continua o padrão do driver; localhost único é permitido para testes locais. Revisão independente
encontrou bypass em multi-host iniciado por localhost; regressão falhou antes e passou depois
quando toda lista de hosts passou a exigir TLS. Revisor confirmou variantes com userinfo/IPv6.
Não adicionamos dependências nem alteramos contratos, migrations, índices aprovados ou frontend.

Script existente scripts.seed_products ganhou --verify: lê collection.options e index_information,
confere validator strict/error, seis nomes, chaves/ordem e unique; rejeita índices parciais,
sparse, hidden, TTL ou collation divergentes nos índices esperados. Não cria nem corrige nada.
--initialize --verify prepara coleção VAZIA, com índices, apenas após autorização de escrita de
teste. --seed continua separado/opcional e não é necessário para o cadastro real pelo painel.
No ambiente atual, --verify recusou antes de conectar porque o opt-in está false; isso não
comprova schema remoto. Testes locais cobrem metadados válidos, ausência de índice, chave
incorreta, índice parcial e validator com warn. O teste real Mongo exigirá --verify bem-sucedido.

Novo tests/real/test_live_storefront.py, sem dependency_overrides/MockTransport: login HTTP
Supabase, POST produto, leitura com outro cliente Mongo, catálogo público e Jinja imediatos,
detalhe, renovação por refresh cookie, PATCH de centavos, DELETE lógico, exclusão do catálogo
e logout. É teste PREPARADO, não executado em bancos reais. Seu produto usa SKU aleatório
controlado de teste; limpeza afeta somente esse SKU em banco _test, nunca a coleção. Não é
prova de cliques no painel ou checkout WhatsApp. Mongo/Supabase precisam estar configurados.

Contas reais de teste passam a ser lidas do .env privado somente depois de RUN_REAL_INTEGRATION=1
explícito no processo; não carregamos .env em os.environ nem habilitamos conexões sozinhos.
O ambiente exportado tem precedência. Teste RLS não tenta mais UPDATE, mesmo para provar
negação: permissões de escrita devem ser conferidas no postflight somente SELECT. O teste
anônimo exige 42501 ou zero linhas, sem aceitar indisponibilidade/erro de schema como sucesso.
Depois de logout o JWT original é explicitamente mantido na chamada de leitura, para conferir
a negação por sessão revogada em vez de obter um falso positivo como anon.

Supabase: conector novamente não lista neox-drop-test. Leituras reais por Python com Publishable
key: Auth health 200; SELECT user_id limit=0 em admin_profiles 401/42501, sem dados de usuários.
Postflight de tabelas, grants, políticas, funções e triggers segue em
supabase/verification/admin_profiles_postflight.sql, BEGIN READ ONLY/SELECT/ROLLBACK. Não
executado remotamente; nenhuma migration reaplicada, SQL de escrita ou perfil/usuário criado.
Depois do postflight, somente o responsável pode escolher o UUID da conta destinada ao admin
e criar/vincular sua linha em public.admin_profiles pelo Table Editor (role admin, is_active true,
display_name). Segunda conta permanece sem perfil ativo. Não executamos essa promoção.

Redis revisado: Upstash REST HTTPS, token privado de escrita para EVAL, telemetria desabilitada,
deadline e fechamento de cliente; recentes usam até cinco IDs únicos e TTL604800, resolvidos
no Mongo antes da projeção pública. Redis indisponível degrada recentes/cache e não autoriza
preço de checkout. Testes locais e teste Redis real opt-in existentes preservados; nenhuma
chave foi criada no Upstash. A integração dos três serviços e a seção recentes na UI não
foram comprovadas nesta rodada. Atlas/Upstash ainda não têm credenciais configuradas localmente.

Verificações: 146 testes locais passaram; seis testes reais ignorados sem opt-in. Ruff check/
format do backend e uv lock --check aprovados. Oito E2E Playwright desktop/mobile passaram em
2.8s contra Uvicorn novo com o código atual, sem mocks de rede, conexões false e origem loopback
própria; processo de teste encerrado. Validam páginas/CSRF/guards/503 e assets, não persistência
real. Não repetimos a suíte UI de fixtures, pois fontes frontend e contratos não mudaram.
SecretStr/erros sanitizados mantidos; nenhum valor secreto registrado. Flag de conexão/.env
privado preservados. Worktree do Claude limpa e intacta; sem push, deploy ou recursos pagos.

Próxima ação humana: Atlas, Projects → New Project → neox-drop-test → Next → Create Project;
sem convidar membros. Depois criar somente cluster Free/M0 com custo zero, sem sample data,
usuário readWrite limitado a neox_drop_test e IP atual (nunca 0.0.0.0/0). Colar URI SRV somente
no .env local. Não criar products manualmente; inicialização com validator/índices será etapa
separada e autorizada, sem seed. Procedimento atualizado em CONFIGURAR-BANCOS-TESTE.md.


## Integração visual aprovada ac1f7f1 — 21/11/2026

Worktree backend inicialmente limpa em feature/3d-assets/23f2610; retorno seguro a
feature/backend/50078b4 e merge local --no-ff/--no-commit de ac1f7f1 (feature/frontend).
Git conciliou home.html, catalog.html e base.html automaticamente, sem marcadores de conflito.
Revisão semântica conservou csrfToken, estados 503, redirecionamento/autorização admin,
contratos de checkout, cookies e rotas. Nenhum contrato OpenAPI foi alterado. A worktree
frontend permaneceu limpa no commit aprovado; main e feature/3d-assets não foram integradas.
Backups não rastreados do laboratório foram preservados fora da loja em
/tmp/neox-3d-tools/preserved-worktree-leftovers; seus originais versionados continuam em 23f2610.
Nenhum GLB experimental, arquivo do laboratório ou banco remoto entrou nesta integração.

Fotografias WebP e créditos via attributes preservados; modelo e fotografia seguem o produto
selecionado. Performance foi ocultada e as duas coleções restantes usam grid de duas colunas,
sem produto/fotografia inventados. Crédito Christian H./CC BY 2.0 também aparece nas coleções,
mesmo quando o hero não tem dados. CSP aplicada em HTML/API/erros: script self + SDK
static.sketchfab.com, frame sketchfab.com, sem unsafe-inline para scripts ou unsafe-eval;
estilos inline continuam necessários para tokens dinâmicos do hero. Mídia externa depende
de MEDIA_ALLOWED_ORIGINS válido (origens HTTPS exatas; para cadastrar embeds, incluir
https://sketchfab.com). Nosniff, base-uri/object/frame-ancestors restritos preservam isolamento.

app.main:app em http://127.0.0.1:8000/ continua a aplicação real, sem fixtures/fallback
fictício: TEST_CONNECTIONS_ENABLED=false mantém catálogo/checkout em 503 e admin protegido.
Para avaliar a nova interface sem autorizar escrita em bancos, scripts.preview_storefront:app
em http://127.0.0.1:8001/ reutiliza as DUAS fixtures aprovadas do Claude somente em páginas e
GETs públicos. Banner identifica preços/estoque ilustrativos. Não importa fixtures de admin,
não substitui autenticação/CSRF/escritas, não gera WhatsApp nem simula persistência. Esse
entrypoint é ferramenta local opt-in, não configuração de publicação; importa app.main, que
valida .env indiretamente, mas suas próprias conexões são false e sua chave CSRF é efêmera.
Comandos exatos estão no README; ambos servidores usam loopback, um worker e no-proxy-headers.

Evidências visuais reais desta execução FastAPI: [home](integracao-home.png) e
[Samba no viewer](integracao-samba-3d.png). Produtos/estoque são fixtures explícitas; o iframe
Sketchfab, SDK, texturas, rede e renderização GPU são reais. Nenhum route.fulfill nesses testes.
Aparência em celular físico e fidelidade exata de SKU dos embeds não foram comprovadas.

Verificações finais:

- pnpm install --frozen-lockfile e pnpm build: sucesso, sem upgrades ou aprovação de scripts.
- uv lock --check: sucesso; pytest -q: 163 passed, 6 skipped (3,44 s).
- Ruff check/format backend: sucesso, 49 arquivos. Escopo UI Python legado não foi reformatado.
- pnpm test:ui --workers=2: 112 passed, 4 skipped (32,8 s), fixtures/mocks explícitos.
- NEOX_FASTAPI_URL=http://127.0.0.1:8000 pnpm exec playwright test --workers=2:
  8 passed (3,8 s), sem mocks de rede; prova guards/CSRF/503, não bancos.
- NEOX_FASTAPI_URL=http://127.0.0.1:8001 pnpm exec playwright test -c playwright.live.config.js:
  12 passed (1,3 min), Chromium completo/GPU Apple M1, desktop e mobile emulado. Inclui os
  dois modelos, troca, arraste horizontal, vertical sem inclinação, reduced-motion, galeria,
  crédito, fotos carregadas, navegação/carrinho/CSP e bloqueio de checkout/admin.
- Duas regressões iniciais falharam antes de ocultar Performance e adicionar CSP e passaram
  após correção. Validação de origem encontrou e corrigiu aceitação de ponto-e-vírgula.
- No harness, primeira captura falhou por diretório inexistente; criação automática adicionada.
  Verificação mobile aguardava imagens lazy fora da tela; agora rola a página. Uma execução
  interrompida aguardava estabilidade da foto animada; rolagem não exige imóvel. Rodada final
  completa acima passou; não alteramos a animação nem falsificamos respostas para passar.
- .env ignorado/não rastreado; zero correspondências dos segredos locais configurados nos
  arquivos rastreados. Dist/node_modules/resultados permanecem ignorados. Nenhum valor logado.
  Revisão independente de código não encontrou bug bloqueante; validou isolamento do preview.

Estado dos bancos nesta rodada (configuração conferida sem valores): Supabase URL/Publishable,
COOKIE_SECRET e MONGODB_URI presentes; banco esperado neox_drop_test. Supabase secret key e
Upstash REST URL/token ausentes. Não houve conexão/SQL remoto nem validação real de RLS/CRUD.
Migration 20261119105020_admin_profiles_rls.sql permanece registrada como aplicada MANUALMENTE
pelo usuário; não reaplicada. Os seis testes reais continuam ignorados, não equivalem a sucesso.

Prioridades até entrega: (1) responsável executar postflight somente leitura, confirmar RLS e
provisionar perfil admin ativo apenas com autorização explícita; testar as duas contas/sessão;
(2) restringir usuário Atlas/IP, revisar/autorizar validator e seis índices, então demonstrar
cadastro→leitura persistida→catálogo→edição/desativação; sem seed obrigatório; (3) configurar
Upstash gratuito e testar recentes/TTL/degradação; (4) contato autorizado em store_settings e
chave backend privada para checkout WhatsApp; (5) revisão final GitHub sem segredos, push só
com autorização, e vídeo acadêmico 5–10min diferenciando real/fixture/pendente. Manter um worker
até rate limit compartilhado. Não houve push, deploy, compra ou mudança remota.

Plano técnico 3D definitivo, sem reconstrução procedural aproximada:

1. Fixar SKU/colorway antes de adquirir arquivo: AM95 preto/branco/lima ainda precisa de
   confirmação frente ao NDSTRKT; AM90 Infrared requer arquivo exatamente correspondente;
   NB9060 cinza exige SKU aprovado (U9060GRY era provisório); Samba OG deve ser B75806.
2. Obter malha-base fiel gratuitamente com autorização escrita de modificação E hospedagem
   GLB público, ou captura própria autorizada do par exato com escala e vistas completas.
   Embed/preço/preview não licencia o arquivo. Sem fonte adequada, manter fotografia existente
   e não declarar conclusão. Não comprar ou extrair geometria de viewers.
3. Preservar original; corrigir scan/retopologia/UVs e PBR a partir de referências calibradas,
   comparar lateral/3⁄4/traseira/superior/clay e aprovar fidelidade antes de reduzir polígonos.
4. Exportar GLB autocontido, otimizar sem apagar detalhes, associar em model3dUrl e atributos
   de crédito existentes; testar foto-poster, carregamento sob clique, Y-only, falhas, tamanho
   e aparelhos físicos. Só então substituir o embed. Licenças editoriais atuais não comprovam
   autorização comercial; RF-13 e os quatro modelos definitivos continuam pendentes.

## Configuração técnica — leituras e bloqueios reais em 22/11/2026

Baseline: feature/backend limpa em 38fd700; frontend ac1f7f1 e main fc48c18 limpas, laboratório
23f2610 preservado. Não refeita integração, não alterados app/, contratos, schema Mongo ou SQL.
Linha de base: 163 passed, 6 skipped. Nenhuma nova branch/worktree, compra, push ou deploy.

### Leituras externas executadas (não mocks)

- MongoDB Atlas: novo ping autenticado passou usando MONGODB_URI e TLS verificado pelo driver.
  Banco consultado exclusivamente neox_drop_test. listCollections retornou zero coleções;
  products não existe. connectionStatus mostrou SOMENTE atlasAdmin@admin, com escopo amplo.
  rolesInfo para neox_drop_rw@admin retornou lista vazia: função personalizada não existe.
  Isso não comprova allowlist restrita: ping confirma acesso atual, não ausência de 0.0.0.0/0.
- Não há Atlas CLI/Management API autenticada disponível. Usuário de banco não equivale a
  usuário do painel; alterações de papéis Atlas devem usar seu plano de controle, não updateUser
  via driver. Nenhuma alteração foi tentada. Fonte: [documentação MongoDB](https://www.mongodb.com/docs/atlas/security-add-mongodb-users/).
- Supabase configurado: GET Auth health 200 e settings 200 com Publishable; SELECT anônimo
  limit0 em admin_profiles e store_settings retornou 401/code42501. Um teste real independente
  `test_real_anon_cannot_read_profiles` passou em 1,52s, com flags apenas no processo. Não houve
  login, criação/revogação de sessão, SQL remoto, escrita ou Secret key nessa verificação.
- O conector Supabase só listou outro projeto; o ref configurado não corresponde ao listado.
  Não abrimos o banco do projeto alheio. CUA retornou controle de navegador indisponível, sem
  apps/tabs acessíveis. Assim, postflight, estado das duas contas, grants/funções/triggers/RLS
  comportamental não foram confirmados. Não usar as negações anônimas como prova do postflight.
- Upstash: sem REST URL/token no .env e sem controle autenticado do painel. Existência de
  instância na conta não confirmada; nenhuma criada. [Plano Free oficial](https://upstash.com/pricing/redis)
  conferido: anunciado $0, 250MB, 500mil comandos/mês, 10GB/mês, um banco Free por conta.
  Não houve cartão, upgrade ou recursos pagos. Quota disponível na conta ainda desconhecida.

### Autorizações e entradas pendentes

Foram apresentadas ao usuário, ainda SEM RESPOSTA, estas operações exatas:

1. Substituir atlasAdmin do usuário da URI local por somente readWrite@neox_drop_test,
   sem função redundante; depende de acesso autenticado ao Atlas.
2. Criar APENAS neox_drop_test.products vazia, validator strict/error de
   mongo/products_schema.json e os seis índices nomeados aprovados (mais _id_ automático):
   `APP_ENV=test TEST_CONNECTIONS_ENABLED=true MONGODB_DATABASE=neox_drop_test uv run --locked python -m scripts.seed_products --initialize --verify`.
   Sem seed, drop, collMod ou alterações em outros bancos. NÃO EXECUTADO.

Pedido mínimo de acesso: disponibilizar sessão Atlas/Upstash ao agente e reconectar Supabase
à conta correta. Credenciais das quatro variáveis NEOX_TEST_ADMIN/NONADMIN_EMAIL/PASSWORD
continuam ausentes: o usuário deve salvá-las localmente, nunca no chat. Supabase Secret key
para checkout também ausente; contato autorizado em store_settings não pôde ser confirmado.
Promoção admin exige UUID confirmado e autorização específica posterior. Nenhuma promoção
ou policy permissiva foi criada. Migration aplicada manualmente conforme relato do usuário,
sem reaplicação ou reconciliação remota automática. .env preservado, conexões false.

### Trabalho local executado

- Runner protegido scripts.run_real_e2e: exige opt-in NO PROCESSO, APP_ENV=test,
  conexões true, banco exato neox_drop_test, três serviços, cookie e quatro credenciais locais.
  Inicializa só seu próprio Uvicorn loopback/porta livre/um worker/no-proxy-headers. Artefatos
  Playwright ficam em TemporaryDirectory privado e são removidos; stdout recebe contagens e
  teste/arquivo/linha, nunca mensagem bruta ou credenciais. Falha continua sendo exit não-zero.
- Novo E2E real PREPARADO em tests/e2e/real/storefront.spec.js: formulário de login/cadastro,
  catálogo/detalhe, recentes, quantidade/subtotal, mudança de preço, checkout, link SEM CLIQUE,
  desativação/logout, segunda conta negada. Config Playwright exclui esses testes do preview.
  Sem opt-in, dois casos ficaram SKIPPED; isso prova a guarda, não prova a jornada real.
- teste HTTP real existente agora inicia, encerra e reinicia dois processos Uvicorn reais;
  outro cliente Mongo confere documento/preço e persistência. Ainda não executado externamente.
  Cookie de acesso removido simula expiração para refresh; não é expiração temporal real do JWT.
- Testes Mongo preservam documentos QA INATIVOS e não fazem delete_many; filtro de limpeza usa
  SKU aleatório e ID criados pelo próprio teste. Redis usa apenas chave aleatória nova, testa
  TTL 7 dias e expiração efetiva em 1s, depois remove somente sua chave se chegou a criá-la.
- Revisão independente encontrou logout omitido se desativação falhasse e processo filho
  sobrevivendo ao pnpm. Corrigidos finally de logout independentes e grupos próprios TERM/KILL.
  Um teste local reproduziu o filho DEVNULL sobrevivente (falhou antes); passou após correção.
  Outro teste cobre descendente segurando pipe. Só processos locais criados pelos testes foram
  sinalizados. Não há pkill amplo nem encerramento de servidores do usuário.
- Guias corrigidos para reutilizar Supabase/Atlas existentes, sem reaplicar migration;
  README registra papel dos bancos, comandos reais, limites e opt-ins. Roteiro de apresentação
  de 8min em roteiro-video.md, explicitamente preparado e não gravado.

### Verificação final e limites

- pytest padrão: 169 passed, 6 skipped em 8,09s (testes reais opt-out no padrão).
- Teste Supabase de leitura independente: 1 passed em 1,52s; sem sessões ou escritas.
- Build pnpm: aprovado; UI fixtures/mocks: 112 passed, 4 skipped em 35,4s.
- E2E contra app.main:app com serviços desabilitados: 8 passed em 3,1s, sem mocks de rede;
  confirma CSRF/guards/503, não CRUD nem persistência real.
- Ruff check/format:aprovados, 51 arquivos; uv lock --check aprovado.
- Runner real sem opt-in: exit2 esperado, recusa antes de iniciar E2E. Casos browser reais sem
  opt-in: 2 skipped. Nenhuma jornada de escrita foi executada nesta rodada.
- FastAPI principal ativo http://127.0.0.1:8000/ (503 de catálogo esperado); vitrine explícita
  em:8001 permanece demonstração. Não foi habilitado banco silenciosamente para trocar 503 por 200.

T008/T010/T014/T027/T029 continuam com aceite real pendente. Um teste de leitura e um ping não
comprovam login, promoção, RLS de sessões, catálogo sincronizado, CRUD, Redis ou WhatsApp reais.


## Autorização específica MongoDB recebida — 22/11/2026

O usuário autorizou neox_drop_rw herdando readWrite exclusivamente em neox_drop_test,
substituição de atlasAdmin do usuário da aplicação, restrição ao Cluster0 se disponível e,
APÓS confirmação de permissões, criação de products VAZIA com validator strict/error e os
seis índices já revisados. Não autorizou inserts/seed/CRUD de teste, exclusões, outros projetos,
Supabase/Redis, promoção Auth, compras, push ou deploy. Aprovação permanece válida nesse escopo;
não pedir aprovação repetida para a mesma operação. Esta instrução substitui a proposta anterior
de atribuir diretamente o papel nativo readWrite: usar a função personalizada solicitada.

Novas leituras reais:

- Ping autenticado passou; banco configurado neox_drop_test, URI SRV/TLS validada pelo driver.
- Usuário autenticado corresponde exatamente ao usuário da URI (comparação interna, sem
  registrar nome/URI/senha); auth database=admin. Seed DNS começa em Cluster0, mas nome do
  projeto e vínculo administrativo do cluster NÃO foram confirmados pelo plano de controle.
- connectionStatus: atlasAdmin@admin ainda ativo, privilégios globais presentes.
- rolesInfo: neox_drop_rw@admin ausente; products continua ausente.
- Nenhuma credencial administrativa Atlas configurada foi detectada; CLI Atlas não instalado,
  ferramenta administrativa Atlas não disponível e CUA voltou a informar host indisponível.
  Não usamos createRole/updateUser via driver para contornar o plano de controle Atlas.
- Supabase: Auth health 200; SELECT anônimo limit0 em admin_profiles 401/42501. Projeto correto
  continua indisponível no conector; nenhum SQL ou sessão foi criado. Redis sem credenciais
  locais; nenhum recurso ou chave foi criado. .env preservado, conexões false.

Verificação local focada: 32 testes aprovados (test_seed_products e test_config, 0,25s).
São testes locais com dublês para DDL, não prova de coleção/índices remotos. Scripts existentes
foram revisados; initialize recusa coleção existente e instala somente schema e seis índices,
sem seed quando chamado com --initialize --verify. Nenhuma operação de escrita foi executada,
pois a identidade administrativa e o ajuste de permissões ainda não puderam ser concluídos.

Ação humana mínima: no projeto neox-drop-test/Cluster0, criar o custom role restrito e atribuí-lo
como único papel ao usuário existente, retirando atlasAdmin e limitando Cluster0. Não criar
products manualmente. Depois confirmar conclusão; o agente revalidará por leitura e executará
a criação já autorizada, sem solicitar aprovação outra vez e sem inserir documentos.
Funções em Free podem levar até 30s para propagar, conforme [MongoDB](https://www.mongodb.com/docs/atlas/security-add-mongodb-roles/).

Próximo bloqueio do login: acesso ao projeto Supabase correto para postflight, identificação do
UUID da conta escolhida e autorização separada de promoção; disponibilidade local das contas NEOX_TEST_*. A autorização Mongo não concede autorização de promoção ou
inserção de produtos, portanto cadastro real será uma etapa mutável separada.

## MongoDB Atlas — estrutura criada e validada, 22/11/2026

O usuário confirmou visualmente projeto/cluster e a configuração no painel: a função
personalizada foi criada como **neox_drop_test**, não neox_drop_rw, herdando readWrite no
banco neox_drop_test, sem Apply to any database; conta restrita a um cluster. Essa atualização
foi aceita sem renomear/criar outra função. A confirmação administrativa do projeto e da
restrição de cluster é do usuário; o agente não obteve acesso ao plano de controle Atlas.

Antes de escrever, conexão SRV/TLS Cluster0 validada, ping autenticado, identidade autenticada
comparada internamente com a URI local (sem registrar usuário/senha/URI). connectionStatus
retornou somente neox_drop_test@admin. Dois recursos efetivos de privilégio, ambos no banco
neox_drop_test; nenhum recurso global/cluster/anyResource ou banco diferente. Ações necessárias
createCollection/createIndex/listCollections/listIndexes/find presentes; atlasAdmin ausente.
O namespace @admin da função não equivale a atlasAdmin ou permissão geral no banco admin.

Com essas pré-condições, executados initialize(database) e verify(database) do script existente,
exclusivamente em neox_drop_test, conforme autorização explícita. Criada apenas products, com
validationLevel=strict e validationAction=error e validator igual ao JSON revisado. Índices:

| Nome | Chaves | Único |
|---|---|---|
| _id_ (automático) | _id:1 | Sim, implícito no MongoDB |
| uniq_sku | sku:1 | Sim |
| uniq_slug | slug:1 | Sim |
| catalog_by_category | active:1,category:1,createdAt:-1 | Não |
| catalog_by_brand | active:1,brand:1,createdAt:-1 | Não |
| featured_order | active:1,featured.enabled:1,featured.order:1 | Não |
| catalog_by_size | active:1,sizes.sizeBR:1 | Não |

SHA256 de mongo/products_schema.json usado:
a4a245a53aea8adc01194636cceeee5b8199655d915fd92082490376da4f4b89.
A primeira saída de diagnóstico usou default unique=false para _id_, pois a propriedade não
vem explícita em index_information; a unicidade de _id_ é implícita e foi corretamente
identificada na leitura independente. Não houve mudança no índice _id_.

Provas reais posteriores à criação:

- Novo cliente autenticado: ping passou, papel/escopo correto, listIndexes com exatamente os
  sete nomes esperados; count_documents retornou ZERO. Nenhum INSERT/seed/CRUD foi chamado.
- Script canônico, em processo separado, somente leitura:
  `APP_ENV=test TEST_CONNECTIONS_ENABLED=true MONGODB_DATABASE=neox_drop_test REQUEST_TIMEOUT_SECONDS=30 uv run --locked python -m scripts.seed_products --verify`
  exit 0, Verificação concluída. Confere validator inteiro, strict/error e seis índices/chaves/
  unicidade, sem tolerar alterações sparse/hidden/parciais/TTL/collation.
- FastAPI ASGI com Atlas real, sem dependency_overrides/mocks: GET /api/products 200 (items 0),
  /api/featured 200 (items 0), / 200 e /tenis 200, sem estado de serviço indisponível. Nenhuma rota
  mutável chamada. Isso comprova leitura de catálogo vazio, não cadastro ou persistência de produto.
- Testes locais focados de configuração/inicialização: 32 passed em 0,24s; usam dublês para DDL
  e não foram apresentados como teste remoto. Sem código de aplicação/schema/contrato alterado.

APP_ENV/test_connections usados somente em processos de operação/teste. .env preservado com
TEST_CONNECTIONS_ENABLED=false; servidor principal já iniciado não foi reconfigurado. Não
confundir os quatro GETs ASGI com mudança automática do servidor em :8000. Nenhum produto,
usuário Auth, outro banco/coleção, Supabase ou Redis alterado; sem push/deploy/custos novos.
Não executar --initialize novamente contra a coleção existente; futuras conferências usam --verify.

Próxima etapa: acesso ao projeto Supabase correto para executar postflight de leitura, identificar
UUID da conta escolhida e apresentar associação role=admin/is_active=true para autorização
separada. Não promover automaticamente. Depois validar login/negação da segunda conta e,
somente com autorização de INSERT, cadastrar o primeiro produto fictício pela interface.
Estrutura Mongo concluída; CRUD real, login administrativo e checkout continuam sem comprovação.


## Após ativação administrativa confirmada pelo usuário — 22/11/2026

Usuário confirmou UUID `4d03df16-ce24-4633-b45a-ce1bcdc6ac06`, role=admin e is_active=true.
Nenhuma migration, SQL de verificação ou promoção foi executada novamente pelo agente.
Conexões reais verificadas pelo Python, usando os adaptadores existentes com opt-in só no
processo: Supabase Auth health/settings responderam; ping autenticado Atlas passou;
products.count_documents retornou 0. FastAPI já ativo em http://127.0.0.1:8000: home,
catálogo, login e API de produtos 200; API sem produtos; /health 200/degraded sem Redis;
/api/admin/me 401 e /admin/produtos 303 sem sessão. Isso comprova conectividade e leitura,
não login administrativo, CRUD ou persistência de produtos.

Regressão: pytest 171 passed/6 skipped; ruff passou; build Tailwind/vendor passou;
Playwright UI 114 passed/4 skipped (fixtures/dublês, desktop e celular emulado).
As quatro variáveis NEOX_TEST_* estão ausentes tanto no .env como no ambiente do processo;
logo login real/admin versus não-admin, logout e RLS de sessão não foram executados.
Credenciais Redis e chave backend de contato também ausentes. Sem ferramentas Upstash
autenticadas disponíveis; plano Free confirmado em https://upstash.com/pricing/redis
(250 MB, 500 mil comandos/mês), sem criar recurso ou ativar plano pago.
Contato WhatsApp continua não configurado conforme confirmação anterior; checkout externo
não comprovado. Nenhum documento inserido/alterado ou outro serviço remoto modificado.
Próxima e única ação solicitada: preencher as quatro credenciais de teste já previstas no
.env privado; não enviar valores no chat. README atualizado para não pedir SQL novamente.


## Autenticação real após configuração local das contas — 22/11/2026

Opt-in somente no processo, sem alteração do .env. Executados apenas os dois testes reais
de contas em test_live_admin_rls.py (anon já comprovado foi excluído): admin/RLS/revogação
PASS; não-admin FAILURE no login, antes de authorize. Diagnóstico direto confirmou contas
distintas e AuthApiError HTTP 400/code invalid_credentials na segunda conta; valores omitidos.
Não é prova de negação por privilégio. Não houve reset de senha, promoção ou SQL.

FastAPI em processo descartável real, sem mocks: 14 verificações PASS — página de login,
login admin HTTP, UUID aprovado, cookies HttpOnly/SameSite, painel 200, perfil 200,
listagem administrativa 200, logout sem CSRF 403 preservando sessão, renovação via refresh,
logout 204, remoção de cookies, API 401 e painel 303 após logout. Sessões de teste encerradas;
processo descartável encerrado, servidor principal preservado. Sem escrita de produtos.
Teste de sessão renovada remove apenas o cookie de acesso local, sem esperar expirar o JWT.
Único bloqueio solicitado agora: corrigir o par local da segunda conta; Redis ainda sem
credenciais, criação não executada. Relatórios brutos pytest capturados em diretório temporário
privado e removidos; nenhuma senha, token ou e-mail completo registrado nesta evidência.
