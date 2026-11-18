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
