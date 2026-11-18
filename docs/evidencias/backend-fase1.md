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
