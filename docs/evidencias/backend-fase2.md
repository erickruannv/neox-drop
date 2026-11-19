# Fase 2 backend — 19/11/2026

Baseline a55dbbd, branch feature/backend; árvore limpa e 57 testes passaram antes de editar.
Serena ativa no worktree correto; SPECIFY_FEATURE_DIRECTORY explícito; sem checklists/hooks extras.

Escopo e ordem: T008 (migration/perfis/RLS), T009 (Auth/autorização), T010 (coleção/seed),
T011 (CRUD), T015 (consultas públicas), T017 (cache seguro), T018 (recentes).
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
