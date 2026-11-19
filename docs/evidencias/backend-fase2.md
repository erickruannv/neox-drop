# Fase 2 backend — 19/11/2026

Baseline a55dbbd, branch feature/backend; árvore limpa e 57 testes passaram antes de editar.
Serena ativa no worktree correto; SPECIFY_FEATURE_DIRECTORY explícito; sem checklists/hooks extras.

Escopo e ordem: T008 (migration/perfis/RLS), T009 (Auth/autorização), T010 (coleção/seed),
T011 (CRUD), T015 (consultas públicas), T017 (cache seguro), T018 (recentes),
T021 (checkout, preparado após os pré-requisitos locais do catálogo).
Nenhum arquivo UI/contrato canônico será editado. T014 depende dos templates do Claude.

Ruling: preparar e testar localmente a cadeia de código nessa ordem, mas manter T008 e os
aceites de integração dependentes abertos até prova real — não há .env, CLI Supabase
instalado nem Docker daemon ativo. Não tratar fixtures/transporte HTTP simulado como RLS
real. Custo: código pronto para homologação ainda pode exigir correções contra serviços reais.

Superpowers TDD/execução inline e Ponytail: reutilizar adaptadores/schemas da Fase 1,
sem novas camadas genéricas ou backend Node. CLI oficial Supabase será usado temporariamente
via npx com versão fixada, sem alterar package.json ou ferramentas do projeto.
Segurança: Supabase get_user(jwt) + perfil próprio ativo por requisição, políticas restritas,
sem usar user_metadata para autorizar; cookies HttpOnly, CSRF assinado vinculado à sessão,
Origin exato, URLs permitidas e escrita com comparação de versão MongoDB.

T008 iniciado: Supabase CLI oficial 3.2.0 via npx gerou
supabase/migrations/20261119105020_admin_profiles_rls.sql. Nenhum init/upgrade/link/aplicação.
SQL novo revisado: tabelas/constraints, RLS, leitura do próprio perfil, nenhum grant de escrita
para anon/authenticated, updated_at por trigger. Função privada sem argumentos confere uid e
session_id em auth.sessions para impedir replay de JWT após logout; SECURITY DEFINER
restrito e search_path vazio, nunca autorização baseada em user_metadata.
Teste estático passou; dois testes reais ficam SKIPPED sem opt-in/conta autorizada. Isso não
prova SQL/RLS executado. Docker info falhou por daemon indisponível; não foi iniciado.

T009 preparado: login/logout/me registrados com schemas aprovados; cliente Supabase isolado,
get_user(jwt), consulta do próprio perfil via bearer sujeito a RLS em cada request, sem
service role para autenticação. Cookies HttpOnly/SameSite e Secure conforme origem HTTPS;
CSRF HMAC com expiração e vínculo ao access token, rotacionado em login/refresh/logout.
Refresh explícito pelo SDK; logout revoga sessão local no Auth e remove cookies. Sem conta
pública/admin signup. Helpers prontos para contexto Jinja2, ligação HTML depende de T014.
65 testes passaram, 2 reais ignorados. HTTP do SDK usa MockTransport; não comprova Auth real.
Testes negativos incluem perfil inativo/role indevida, senha inválida, CSRF/Origin, assinatura,
expiração/vínculo, replay negado no dublê de RLS e perfil revalidado após refresh.
O rate limit continua local por processo; não haverá implantação/multiworker nesta rodada.

T010 preparado: validador BSON derivado do ProductCreate aprovado + ObjectId/datas BSON,
índices únicos SKU/slug e índices de consulta; configuração em mongo/products_schema.json.
Mongosh e script Python novos recusam coleção existente e banco sem sufixo _test; seed
canônica fictícia usa setOnInsert, sem sobrescrever produto. Nenhum script foi executado
contra banco. Três testes locais do preparo passaram; validar coleção/índices reais segue pendente.

T011 preparado: POST/PATCH/GET/DELETE admin com autorização por requisição, 201/200/204,
409 para duplicata ou edição concorrente, 404/422 seguros. Soft-delete preserva documento
SKU/slug. PATCH mescla featured, substitui arrays e remove somente model3dUrl com null.
Validação adicional: tamanhos únicos, inteiros BSON int64, mídia própria sem traversal ou
HTTPS de origem permitida, atributos sem operadores/chaves perigosas, strings não vazias.
updatedAt avança ao menos 1 ms e é comparado na escrita, respeitando precisão BSON.
91 testes locais passaram e 2 reais ignorados. Rotas exercitam Mongo via AsyncMock de coleção;
não comprovam índices, escrita ou concorrência no servidor real.

T015 preparado: catálogo público paginado, detalhe e destaques, somente active=true,
projeção allowlist sem stock/BSON; filtro de tamanho/estoque usa o mesmo elemMatch,
busca regex escapada, sort com _id para desempate. Detalhe GET não registra visita.
Queries/formatos/limites e erro Mongo 503 sanitizado cobertos localmente. 93 passaram,
2 reais ignorados. Mongo real e jornada com templates continuam sem comprovação.

T017 preparado: cache de detalhe com envelope versionado e TTL 300s, probe Mongo de
active/updatedAt em cada hit; dados cacheados passam pelo schema público e conferência de
id/slug. Falhas Redis degradam para leitura Mongo; falha Mongo nunca é mascarada pelo cache.
Escritas invalidam após commit e não alegam rollback quando DEL falha. Teste reproduz cache
antigo após escrita com DEL falhando, e valida retorno atualizado pela versão do Mongo,
sem flag local de worker. Sem prova de dois workers reais; 96 passaram, 2 reais ignorados.

T018 preparado: POST recentes valida produto ativo e usa EVAL único com LREM/LPUSH/LTRIM/EXPIRE,
IDs ObjectId canônicos, até 5 únicos, TTL 604800s, cookie anônimo aleatório HttpOnly/SameSite.
GET não registra/renova visita e reconsulta produtos ativos atuais no Mongo, preservando ordem.
Sem cookie ou falha Redis: items vazio; POST válido em falha Redis: 204 best-effort. Mongo fora
continua 503 quando necessário. 99 testes locais passaram; quatro testes reais opt-in ignorados
(Auth/RLS, CRUD/índices Mongo e atomicidade/TTL Redis). Nenhum banco real contatado.

Revisão independente Superpowers + Trail of Bits sharp-edges encontrou problemas reproduzíveis:
DELETE descartava cookies do refresh; URL IPv6 malformada e atributos não codificáveis BSON
levavam a 500; health consultava tabela privada com chave pública. Corrigidos com regressões
RED→GREEN (DELETE usa Response injetado, URL/NaN/BSON rejeitados com 422, probe sem tabelas
privadas). Não houve achado de bypass de autorização/CSRF ou estoque bruto público na revisão.
Isso não é pentest externo nem prova do SQL executado.

T021 preparado após catálogo: checkout reconsulta Mongo sem cache, agrupa produto+tamanho,
rejeita soma >10/estoque, mantém centavos inteiros e ignora preço/total extras. Não insere pedido,
não decrementa/reserva estoque e não envia mensagem. Contato só do singleton PostgreSQL,
via chave backend separada/opcional e grant SELECT explícito a service_role; vazio bloqueia link.
Revisão adicional identificou Int64 BSON rejeitado por type(x) is int e limite medido após
URL-encoding. Corrigidos com roundtrip BSON e nome acentuado: inteiros BSON são aceitos sem
aceitar bool; limite é 8000 caracteres da mensagem conforme descrição OpenAPI (antes de encoding).
Nenhum contrato foi alterado. 114 testes passaram, quatro reais ignorados.

Endurecimento adicional: exceção inesperada repropagava pelo ServerErrorMiddleware do
Starlette e poderia alcançar logs Uvicorn mesmo com envelope sanitizado. Boundary ASGI
agora impede repropagação do conteúdo antes de enviar resposta; teste usa transporte com
raise_app_exceptions=True e confirmou RED→GREEN sem segredo nos logs. Erro após início de
resposta vira exceção genérica sanitizada. Também rejeitado timeout Mongo menor que 1 ms,
que seria truncado a zero pelo driver (potencial espera sem limite). Ambos cobertos localmente.

## Verificação final e estado de entrega local

- `uv run --locked pytest -q`: **118 passed, 5 skipped**, sem warnings.
- Cinco skips são exclusivamente `tests/real`: admin Auth/RLS/negação de escrita/revogação,
  leitura anônima negada, usuário sem perfil ativo, Mongo CRUD/índices e Redis EVAL/TTL.
- `uv run --locked ruff check app tests scripts`: All checks passed.
- `uv run --locked ruff format --check app tests scripts`: 44 arquivos formatados.
- `uv lock --check`: 67 pacotes, lock inalterado/consistente.
- Parser temporário pglast v8.9: **21 instruções PostgreSQL válidas sintaticamente**;
  não valida schemas gerenciados, execução, permissões ou RLS. Sem nova dependência no projeto.
- Teste de contrato confirma exatamente 14 pares método/rota/operationId iguais ao OpenAPI,
  sem editar `docs/contracts/` ou publicar o schema gerado pelo FastAPI.
- Uvicorn startup real em 127.0.0.1:8765; probes HTTP reais, sem credenciais:
  GET /health 503 unavailable; GET /api/products 503 SERVICE_UNAVAILABLE;
  GET /api/admin/me 401 AUTHENTICATION_FAILED; GET /api/recent 200 items vazio;
  POST /api/admin/auth/login, /api/checkout e /api/recent sem CSRF: 403 FORBIDDEN.
  Servidor encerrado com shutdown completo após as verificações.
- `python -m scripts.check_connections`: exit 2, recusa segura sem opt-in. Não abriu bancos.
- `git diff --check` limpo e diff do baseline não altera contratos, referências, ferramentas,
  .claude/.codex/.agents/.specify, templates/static, pyproject.toml ou uv.lock.
  Cache criado pelo CLI Supabase em supabase/.temp preservado localmente e ignorado no Git.

Falhas intermediárias foram registradas/corrigidas: fixtures SDK precisavam metadata válida;
pytest tinha colisão de basename de testes RLS; cookies de testes precisaram domain coerente;
asserts da Fase 1 foram atualizados quando as rotas reais foram registradas. As falhas de
produto/segurança tiveram reproduções RED→GREEN; nenhuma falha externa foi mascarada por mock.

Mudanças: app/api/{auth,admin_products,products,recent,checkout}.py; app/services/
{admin,catalog,recent,cart}.py; app/core/{config,security,exceptions}.py; app/main.py;
app/db/supabase.py; schemas/product.py (parâmetros HTTP); migration Supabase; mongo/
(validador BSON/índices + wrapper); scripts/seed_products.py; testes unitários/HTTP/contrato/
reais opt-in; .env.example; .gitignore; README; tasks e docs/TESTES-BANCOS.md.
Inventário exato também está no diff Git do baseline a55dbbd.

Ruling final: T008/T010 e aceites integrados dependentes permanecem **abertos** em tasks.md,
com notas de preparo local, porque migrations/índices e bancos não foram executados.
T014/T027 estão bloqueados pela integração UI; T028/T029/T031 não estão completos. Não
alegar entrega P0 inteira ou RF-13/GLB. A revisão de segurança foi de código/local, não
pentest ou auditoria de infraestrutura. Rate limit ainda por processo/IP: sem implantação
multiworker; contador compartilhado e por identidade ficam como requisito antes disso.

Próximos insumos externos: stack/projeto Supabase de teste autorizado, schema/migration
aplicada após revisão, contas fictícias admin/não-admin, coleção Mongo nova de teste e
índices conferidos, instância Upstash REST de teste, segredos locais e contato singleton
configurado. Roteiro detalhado em docs/TESTES-BANCOS.md. Nenhum segredo foi criado/copiado
para o Git; nenhuma conta/banco provisionado, migration aplicada, seed executada, mensagem
WhatsApp enviada ou deploy/push/merge realizado.
