# NEOX drop

**FastAPI e frontend integrados localmente em `feature/backend`**, incluindo o commit final
`ac1f7f1` do Claude (merge local `38fd700`). Templates Jinja2 reais, CSS compilado, JavaScript e as 14 operações JSON
do OpenAPI estão ligados. Sem MongoDB, páginas do catálogo mostram indisponibilidade HTML 503,
sem produtos fictícios; login/carrinho abrem e o painel mantém autorização obrigatória.
Auth/RLS/persistência reais permanecem sem comprovação completa, com testes opt-in.
Veja o [guia dos três bancos](docs/TESTES-BANCOS.md) e as
[evidências da Fase 2](docs/evidencias/backend-fase2.md).
A Fase 3 está no [roteiro de configuração dos bancos de teste](docs/CONFIGURAR-BANCOS-TESTE.md),
com [diagnóstico sem credenciais](docs/evidencias/backend-fase3.md).

Stack: Python 3.13 + FastAPI, Jinja2 + Tailwind compilado + JavaScript + Model Viewer,
Supabase Auth/PostgreSQL, MongoDB e Redis/Upstash. Não há pagamento ou reserva de estoque.

## Estado verificado em 22/11/2026

| Banco | Responsabilidade | Evidência atual |
|---|---|---|
| Supabase PostgreSQL/Auth | Identidade, perfis admin/RLS e contato WhatsApp privado | Auth 200; leitura anônima negada 42501. Postflight e duas sessões ainda pendentes. |
| MongoDB Atlas | Produtos, preço em centavos, estoque e destaques autoritativos | Ping/TLS e papel neox_drop_test@admin restrito ao banco confirmados. products criada strict/error, seis índices adicionais e zero documentos; CRUD ainda não executado. |
| Upstash Redis | Cinco recentes/TTL7dias e cache300s; nunca preço do checkout | Credenciais ausentes; integração real não executada. |

MongoDB concluído quanto à estrutura em 22/11/2026: papel personalizado **neox_drop_test**
(nome escolhido no painel pelo usuário), sem atlasAdmin e com privilégios efetivos apenas no
banco neox_drop_test. Coleção products VAZIA criada por autorização explícita, validator e
seis índices do projeto verificados. Não repetir --initialize nem inserir seed. Inserções,
login administrativo e CRUD real ainda não foram autorizados/executados nesta rodada.

TEST_CONNECTIONS_ENABLED permanece false no .env. Não há autorização implícita para criar
coleção, alterar papéis, promover admin ou escrever dados. O projeto Supabase correto não
aparece no conector atual e o controle de navegador está indisponível. Leituras não comprovam
CRUD/RLS completos. Ver [evidências](docs/evidencias/backend-fase3.md) e
[roteiro de apresentação](docs/evidencias/roteiro-video.md).

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

## Avaliar o frontend aprovado pelo FastAPI

Vitrine isolada com os dois exemplos do Claude (Air Max 90 e Samba), sem escrever nos bancos:

```sh
pnpm build
uv run --locked uvicorn scripts.preview_storefront:app --host 127.0.0.1 --port 8001 --workers 1 --no-proxy-headers
open http://127.0.0.1:8001/
```

O banner identifica preços/estoque ilustrativos. Apenas páginas e GETs públicos usam as
fixtures aprovadas; admin, CSRF e operações de escrita continuam nos handlers reais, com
conexões desabilitadas. Login, persistência e checkout não são simulados como bem-sucedidos.
Esse entrypoint é ferramenta local de avaliação, não deve ser publicado. A importação de
`app.main` ainda valida a configuração local; um `.env` inválido pode impedir sua inicialização. O entrypoint real
continua `app.main:app` em :8000, sem fallback para fixtures. Nenhum GLB do laboratório foi integrado.

Teste de navegação/3D real, com rede e GPU, contra a vitrine FastAPI já iniciada:

```sh
NEOX_FASTAPI_URL=http://127.0.0.1:8001 pnpm exec playwright test -c playwright.live.config.js
```

Os embeds dependem do Sketchfab e têm as limitações de licença descritas em
[assets-licenses.md](docs/assets-licenses.md). Não comprovam GLBs próprios licenciados.

## Verificar

```sh
uv run --locked pytest -q
uv run --locked ruff check app scripts tests/{unit,contract,integration,real}
uv run --locked ruff format --check app scripts tests/{unit,contract,integration,real}
uv lock --check
pnpm test:ui --workers=2
NEOX_FASTAPI_URL=http://127.0.0.1:8000 pnpm exec playwright test --workers=2
```

A suíte padrão usa ASGI/processos locais, fixtures canônicas e dublês dos serviços. Não comprova
Auth/RLS ou persistência real. Schemas mantêm projeções pública/admin distintas; serializar
campos opcionais com `model_dump(mode='json', exclude_unset=True)`.
Rate limit: janela fixa por IP/processo local, sem confiar em X-Forwarded-For; backend
compartilhado e limites por identidade precisam ser tratados na autenticação/multiworker.
CSRF/Origin e rotação de cookies foram implementados; os loaders servem os templates integrados.
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

Após autorização ESPECÍFICA das sessões e escritas de teste, três bancos configurados e
as quatro NEOX_TEST_* salvas apenas no .env local, o E2E real usa um único comando:

```sh
APP_ENV=test TEST_CONNECTIONS_ENABLED=true RUN_REAL_INTEGRATION=1 uv run --locked python -m scripts.run_real_e2e
```

O runner inicia/encerra seu próprio FastAPI local, passa credenciais apenas ao processo de
teste, usa relatórios temporários privados e imprime somente contagens/arquivo/linha de falha.
Não rodar os testes reais diretamente pelo pnpm: erros do Playwright podem incluir campos de
login. Não envia mensagens WhatsApp. Produtos QA permanecem inativos para preservar evidências;
chaves Redis exclusivas são temporárias. A jornada real ainda não foi executada.
O teste Python tests/real/test_live_storefront.py reinicia processos Uvicorn de verdade e
confere o documento usando outro cliente MongoDB. O refresh remove o cookie de acesso para
simular expiração; não comprova expiração real de JWT por espera de tempo.

T008: usuário informou migration aplicada manualmente; não reaplicar. Postflight somente
leitura e RLS com sessões reais continuam pendentes. Leituras reais de Supabase Auth passaram;
MongoDB/Upstash e provisionamento autorizado de perfil administrativo ainda são necessários.
GLB/licenças permanecem pendentes; RF-13 não está concluído. Sem push ou deploy.

Configurações locais dos agentes continuam preservadas e fora do Git. Python está em
`.python-version`; `uv.lock` fixa as dependências Python. A referência e seus scripts
permanecem intactos, sem execução automática.
