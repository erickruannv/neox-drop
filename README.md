# NEOX drop

**Fundação backend implementada localmente em `feature/backend` (T001, T003–T007).**
FastAPI inicia sem credenciais. `/health` é o único endpoint disponível nesta etapa;
sem serviços habilitados, retorna **503 `{"status":"unavailable"}`**, sem abrir conexões.
Login, CRUD, catálogo, páginas e checkout ainda dependem das tarefas seguintes.

Stack: Python 3.13 + FastAPI, Jinja2 + Tailwind compilado + JavaScript + Model Viewer,
Supabase Auth/PostgreSQL, MongoDB e Redis/Upstash. Não há pagamento ou reserva de estoque.

## Executar localmente

Com Python 3.13 e `uv` instalados, na raiz deste worktree:

```sh
uv sync --locked
uv run --locked uvicorn app.main:app --host 127.0.0.1 --port 8000 --no-proxy-headers
```

Em outro terminal, `curl -i http://127.0.0.1:8000/health` verifica a resposta real.
Não há telas nem documentação Swagger pública nesta etapa. O contrato completo planejado
está em `docs/contracts/openapi.json`; não representa todas as rotas implementadas.

Configuração opcional em `.env` ignorado pelo Git, conforme [.env.example](.env.example).
Manter `TEST_CONNECTIONS_ENABLED=false` para desenvolvimento sem bancos. Somente após
conferir destinos/credenciais e ter autorização para bancos de teste, usar `APP_ENV=test`
e habilitar o flag. Ele não identifica uma credencial de produção automaticamente.

Adaptadores isolam clientes por uso/request e fecham recursos. Supabase não mantém sessão
compartilhada nem refresh automático. Redis tem deadline curto e telemetria desativada.
O diagnóstico somente leitura é `uv run --locked python -m scripts.check_connections`;
recusa sem opt-in (código 2); com opt-in retorna 0 se todos responderem ou 1 em falha.
Não executar contra produção. O health agrega os probes, sem expor hosts/credenciais.

## Verificar

```sh
uv run --locked pytest -q
uv run --locked ruff check app tests scripts
uv run --locked ruff format --check app tests scripts
uv lock --check
```

Os testes atuais usam ASGI local, fixtures canônicas e dublês dos serviços. Não comprovam
Auth/RLS ou persistência real. Schemas mantêm projeções pública/admin distintas; serializar
campos opcionais com `model_dump(mode='json', exclude_unset=True)`.
Rate limit: janela fixa por IP/processo local, sem confiar em X-Forwarded-For; backend
compartilhado e limites por identidade precisam ser tratados na autenticação/multiworker.
CSRF/Origin têm validação preparada; emissão/rotação de tokens e cookies de sessão virão
com T009/T014. Limite de corpo conta bytes reais nas operações de escrita.

- [Evidências desta etapa e limitações](docs/evidencias/backend-fase1.md).
- [Referência V1.1 original](docs/reference/README.md) e [validação documental](docs/VALIDACAO-V1.1.md).
- [Constituição](.specify/memory/constitution.md) e [instruções compartilhadas](AGENTS.md).
- [Contratos HTTP/UI](docs/contracts/README.md).
- [Spec](specs/001-neox-drop-v11/spec.md), [plano](specs/001-neox-drop-v11/plan.md) e
  [lista operacional única](specs/001-neox-drop-v11/tasks.md).

T008 (Auth/perfis/RLS) exige ambiente de teste autorizado; suas dependências bloqueiam
login e catálogo integrado. T002/templates/CSS/JS continuam com Claude. GLB/licenças
permanecem pendentes; RF-13 não está concluído. Nenhum banco foi provisionado ou migrado,
nenhum dado real foi acessado e não houve deploy/push/merge.

Configurações locais dos agentes continuam preservadas e fora do Git. Python está em
`.python-version`; `uv.lock` fixa as dependências Python. A referência e seus scripts
permanecem intactos, sem execução automática.
