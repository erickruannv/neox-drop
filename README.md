# NEOX drop

**FastAPI e frontend integrados localmente em `feature/backend`**, incluindo o commit final
`36b0492` do Claude. Templates Jinja2 reais, CSS compilado, JavaScript e as 14 operações JSON
do OpenAPI estão ligados. Sem MongoDB, páginas do catálogo mostram indisponibilidade HTML 503,
sem produtos fictícios; login/carrinho abrem e o painel mantém autorização obrigatória.
Auth/RLS/persistência reais permanecem sem comprovação completa, com testes opt-in.
Veja o [guia dos três bancos](docs/TESTES-BANCOS.md) e as
[evidências da Fase 2](docs/evidencias/backend-fase2.md).
A Fase 3 está no [roteiro de configuração dos bancos de teste](docs/CONFIGURAR-BANCOS-TESTE.md),
com [diagnóstico sem credenciais](docs/evidencias/backend-fase3.md).

Stack: Python 3.13 + FastAPI, Jinja2 + Tailwind compilado + JavaScript + Model Viewer,
Supabase Auth/PostgreSQL, MongoDB e Redis/Upstash. Não há pagamento ou reserva de estoque.

## Executar localmente

Com Python 3.13 e `uv` instalados, na raiz deste worktree:

```sh
uv sync --locked
pnpm install --frozen-lockfile
pnpm build
uv run --locked uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 1 --no-proxy-headers
```

Abra **http://127.0.0.1:8000/** (`open http://127.0.0.1:8000/` no Mac).
Catálogo: `/tenis`; login: `/admin/login`; painel protegido: `/admin/produtos`.
O carrinho é o drawer acessível pelo header, não uma rota separada.
`curl -i http://127.0.0.1:8000/health` verifica serviços: 503 é esperado sem bancos.
Não há Swagger público; `docs/contracts/openapi.json` permanece inalterado.
COOKIE_SECRET deve existir no `.env` privado; já foi gerado neste Mac e deve ser preservado.

Configuração opcional em `.env` ignorado pelo Git, conforme [.env.example](.env.example).
Manter `TEST_CONNECTIONS_ENABLED=false` para desenvolvimento sem bancos. Somente após
conferir destinos/credenciais e ter autorização para bancos de teste, usar `APP_ENV=test`
e habilitar o flag. Ele não identifica uma credencial de produção automaticamente.

Adaptadores isolam clientes por uso/request e fecham recursos. Supabase não mantém sessão
compartilhada nem refresh em background; a aplicação renova por requisição quando necessário. Redis tem deadline curto e telemetria desativada.
O diagnóstico somente leitura é `uv run --locked python -m scripts.check_connections`;
recusa sem opt-in (código 2); com opt-in retorna 0 se todos responderem ou 1 em falha.
Não executar contra produção. O health agrega os probes, sem expor hosts/credenciais.

## Verificar

```sh
uv run --locked pytest -q
uv run --locked ruff check app scripts tests/{unit,contract,integration,real}
uv run --locked ruff format --check app scripts tests/{unit,contract,integration,real}
uv lock --check
pnpm test:ui --workers=2
NEOX_FASTAPI_URL=http://127.0.0.1:8000 pnpm exec playwright test --workers=2
```

Os testes atuais usam ASGI local, fixtures canônicas e dublês dos serviços. Não comprovam
Auth/RLS ou persistência real. Schemas mantêm projeções pública/admin distintas; serializar
campos opcionais com `model_dump(mode='json', exclude_unset=True)`.
Rate limit: janela fixa por IP/processo local, sem confiar em X-Forwarded-For; backend
compartilhado e limites por identidade precisam ser tratados na autenticação/multiworker.
CSRF/Origin e rotação de cookies foram implementados; o contexto HTML depende de T014.
Limite de corpo conta bytes reais nas operações de escrita.

- [Evidências históricas da Fase 1](docs/evidencias/backend-fase1.md).
- [Referência V1.1 original](docs/reference/README.md) e [validação documental](docs/VALIDACAO-V1.1.md).
- [Constituição](.specify/memory/constitution.md) e [instruções compartilhadas](AGENTS.md).
- [Contratos HTTP/UI](docs/contracts/README.md).
- [Spec](specs/001-neox-drop-v11/spec.md), [plano](specs/001-neox-drop-v11/plan.md) e
  [lista operacional única](specs/001-neox-drop-v11/tasks.md).

`pnpm test:ui` usa fixtures e APIs simuladas. O comando com NEOX_FASTAPI_URL exige o servidor
acima já iniciado, com TEST_CONNECTIONS_ENABLED=false, e testa o FastAPI sem interceptar APIs:
assets, navegação, CSRF, carrinho vazio e bloqueios de catálogo/checkout/admin sem configuração.
Não comprova operações bem-sucedidas nos bancos.

T008: usuário informou migration aplicada manualmente; não reaplicar. Postflight somente
leitura e RLS com sessões reais continuam pendentes. Leituras reais de Supabase Auth passaram;
MongoDB/Upstash e provisionamento autorizado de perfil administrativo ainda são necessários.
GLB/licenças permanecem pendentes; RF-13 não está concluído. Sem push ou deploy.

Configurações locais dos agentes continuam preservadas e fora do Git. Python está em
`.python-version`; `uv.lock` fixa as dependências Python. A referência e seus scripts
permanecem intactos, sem execução automática.
