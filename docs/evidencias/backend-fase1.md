# Backend — primeira etapa local (18/11/2026)

Autorização: pedido de implementação local nesta sessão, exclusivamente feature/backend.
Baseline: fc48c18; worktree /Users/dg/Documents/NeoxDrop-backend. Serena conferida nesse caminho.
Lista operacional: specs/001-neox-drop-v11/tasks.md. Este arquivo registra evidências, não backlog.

Escopo: T001, T003–T007. T002 pertence ao Claude. T008 exige ambiente de teste autorizado
para Auth/RLS/migration; nenhum acesso a bancos ou provisionamento autorizado nesta etapa.
Assim, T009–T021 continuam sujeitos às dependências originais; somente /health é desbloqueado.
Contrato, fixtures canônicas, referência e arquivos UI permanecem intactos.

T001: uv lock --check e imports FastAPI/Jinja2/Supabase/PyMongo/Upstash passaram em
Python 3.13.18; dependências diretas exatas e transitivas em uv.lock.
A tentativa inicial uv add --pin falhou (opção inexistente); corrigida para --bounds exact.

T005/T007: modelos wire públicos/admin separados, tipos monetários/inteiros estritos,
PATCH parcial com remoção explícita de model3dUrl, extras monetários descartados no checkout.
Serializar campos opcionais com model_dump(mode='json', exclude_unset=True).
24 testes de contrato passaram; antes da implementação falharam pela ausência de app.schemas.
Os 15 exemplos canônicos passam por JSON Schema e Pydantic sem alterar payloads/contrato.
Negativos incluem campos extras/segredos, estoque público, null, IDs/operadores e valores inválidos.
Pydantic/httpx promovidos a dependências diretas porque a aplicação os importa.

T004 (configuração): .env.example sem credenciais; env local/test, segredos/URIs com repr
mascarado, opt-in de conexões somente em test, limites/timeouts positivos e TTLs normativos.
11 testes de configuração passaram, incluindo leitura da .env.example. O teste encontrou
Literal[int] sem coerção de string para os TTLs; corrigido com inteiro e limites iguais.
Erros HTTP, JSON malformado, validação e exceções usam envelope seguro, sem input/stacktrace.
Suite parcial desta etapa: 51 testes passaram; ruff check e format --check passaram.

T006: context managers assíncronos com clientes isolados por uso/request e fechamento garantido.
Supabase sem sessão persistente/refresh automático e HTTP com timeout; MongoDB async com
seleção/conexão/operação limitadas; Redis sem telemetria/retry e com deadline do adaptador.
8 testes de adaptadores passaram: opt-in obrigatório, isolamento Auth, cleanup inclusive erro,
parametrização, deadline e sanitização. Nenhum servidor externo foi contatado.
O primeiro teste de deadline Redis ficou esperando, foi interrompido e recebeu watchdog de teste;
reproduziu falha e passou após aplicar asyncio.timeout no adaptador (não só no health).
Diagnóstico: uv run python -m scripts.check_connections retornou código 2 por falta de opt-in,
como esperado. Os probes futuros são somente leitura (Auth health/SELECT id, Mongo ping, Redis ping).
Não comprovam RLS, escrita, índices, autenticação de usuário ou persistência real.

Revisão independente da fundação (Superpowers requesting-code-review, somente leitura):
dois achados P2, ambos corrigidos com teste RED→GREEN. CheckoutResponse.waUrl aceitava string
arbitrária; agora aplica o padrão wa.me do contrato (três negativos). CSRF não ASCII gerava
TypeError/500 em compare_digest; agora rejeita com 403 antes da comparação. Nenhum outro
problema material apontado; a revisão não alegou testes reais de bancos.

T003/T004 (composição/segurança): create_app registra router de páginas vazio e Jinja2,
sem criar/editar templates. Loaders reais permanecem em T014. /health é a única operação
registrada; docs/rotas de negócio indisponíveis. Status ok/degraded/unavailable e códigos
200/503 cobertos por testes ASGI com probes substituídos; nenhuma integração simulada como real.
Proteções preparadas: CSRF+Origin, corpo limitado por bytes efetivos inclusive chunked e
rate limit local com janela/limites configuráveis, janela renovada e header Retry-After.
Não há sessão/autorização admin implementada. Rate limit distribuído/por identidade e
emissão/rotação de cookies/CSRF continuam dependentes de T009/T014.

Validação final:
- uv run --locked pytest -q: 57 passed, sem warnings (contrato, unidade e HTTP/ASGI).
- uv run --locked ruff check app tests scripts: All checks passed.
- uv run --locked ruff format --check app tests scripts: 19 files already formatted.
- uv lock --check: 67 pacotes resolvidos; lock consistente.
- Uvicorn iniciado em 127.0.0.1:8765 com --no-proxy-headers; startup completo.
- curl --include http://127.0.0.1:8765/health: HTTP/1.1 503, application/json,
  corpo {"status":"unavailable"}, sem bancos habilitados. Servidor encerrado com shutdown completo.
- python -m scripts.check_connections: recusa segura sem opt-in (exit 2).

Falhas intermediárias: imports ausentes antes da implementação (RED); testes/mocks ajustados
para AsyncClient ASGI porque Starlette sinalizou depreciação de seu TestClient/httpx; JSON
malformado inicialmente testado sem Content-Type correto. Todos resolvidos antes do fechamento.
A suite remove configuração de serviços herdada do ambiente por teste e usa _env_file=None,
exceto o teste explícito da .env.example. Não carrega credenciais para os probes de testes.

README recebeu instruções locais reais; isso não conclui T031 (entrega exige T028/T029).
T001/T003–T007 concluídas no âmbito da fundação local. T008 e seguintes permanecem pendentes
pelas dependências e ausência de bancos de teste autorizados. Nenhuma migration, seed, conta,
infra, deploy ou mensagem externa foi executada. T002 e toda UI permanecem no escopo Claude.

Fontes primárias conferidas para os SDKs instalados:
[Supabase Python](https://supabase.com/docs/reference/python/initializing),
[changelog Supabase](https://supabase.com/changelog.md),
[PyMongo async](https://pymongo.readthedocs.io/en/stable/api/pymongo/asynchronous/mongo_client.html),
[Upstash Python](https://upstash.com/docs/redis/sdks/py/gettingstarted).
APIs também verificadas diretamente nos pacotes fixados no .venv; nenhuma criação sugerida
por documentação externa foi executada.

Inventário de arquivos desta etapa:
- Projeto: pyproject.toml, uv.lock, .env.example.
- Composição: app/main.py, app/api/pages.py.
- Core: app/core/config.py, app/core/security.py, app/core/exceptions.py.
- DB: app/db/supabase.py, app/db/mongodb.py, app/db/redis.py, app/db/health.py.
- Wire: app/schemas/common.py, app/schemas/product.py, app/schemas/auth.py,
  app/schemas/checkout.py.
- Diagnóstico: scripts/check_connections.py.
- Testes: tests/conftest.py, tests/contract/test_openapi.py, tests/unit/test_config.py,
  tests/unit/test_adapters.py, tests/integration/test_app.py.
- Registro: README.md, specs/001-neox-drop-v11/tasks.md, este relatório.

Conferência final: git diff --check limpo; git diff desde fc48c18 não mostrou alterações em
referência, contratos, .claude/.codex/.agents/.specify, templates ou static; .env não rastreado.
Branch permaneceu feature/backend. Worktree preservado, sem push/merge.
