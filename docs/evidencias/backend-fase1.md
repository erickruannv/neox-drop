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
