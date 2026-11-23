# NEOX drop — 3ª avaliação (6 pontos)

Python 3.13 + FastAPI/Jinja2 + Tailwind v4/JavaScript. Demonstração acadêmica, entrega 26/11/2026.
Obrigatório: login admin, CRUD e catálogo sincronizado, Redis/recentes, carrinho e solicitação
WhatsApp, repositório com instruções e vídeo 5–10min. [Referência original](docs/reference/especificacao-v1.1/docs/00-contexto.md).
3D, redesign, pagamentos e frete real estão fora desta conclusão.

## Abrir a aplicação real

Na pasta NeoxDrop-backend, branch feature/backend:

```sh
uv sync --locked
pnpm install --frozen-lockfile
pnpm build
APP_ENV=test TEST_CONNECTIONS_ENABLED=true uv run --locked uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 1 --no-proxy-headers
```

Abra **http://127.0.0.1:8000/**. Catálogo: `/tenis`; login: `/admin/login`;
painel protegido: `/admin/produtos`. O carrinho é aberto pelo botão do cabeçalho.
Os overrides acima habilitam apenas esse processo; não é necessário alterar o .env.
Só usar os projetos de TESTE já conferidos. Um worker até existir rate limit compartilhado.

## Estado real

| Serviço | Papel | Situação |
|---|---|---|
| Supabase PostgreSQL/Auth | Identidade, perfil admin/RLS e contato WhatsApp privado | URL/Publishable configurados; admin ativado conforme confirmação do usuário; login/RLS de sessão reais pendentes |
| MongoDB Atlas | Produtos, preço em centavos e estoque autoritativos | Cluster0, papel neox_drop_test@admin restrito ao banco neox_drop_test; products strict/error, seis índices adicionais, zero documentos |
| Upstash Redis | Até 5 recentes, TTL 7 dias; cache 300s, sem governar preço | Credenciais ausentes; registro de visita e seção recentes ligados à UI, ainda sem prova externa |

FastAPI está ativo com Atlas real: home/catálogo/API respondem 200 com catálogo vazio, sem
fixtures ou produtos inventados. Admin sem sessão continua bloqueado. Health retorna degraded
sem Redis; isso não comprova o fluxo completo. A vitrine :8001 é demonstração e não vale como
prova de persistência. Não recriar Mongo/Supabase nem reaplicar a migration manual já executada.

**Única ação manual atual:** preencher no `.env` privado as quatro variáveis já previstas:
`NEOX_TEST_ADMIN_EMAIL`, `NEOX_TEST_ADMIN_PASSWORD`, `NEOX_TEST_NONADMIN_EMAIL` e
`NEOX_TEST_NONADMIN_PASSWORD`, usando as duas contas existentes. O UUID administrativo
confirmado é `4d03df16-ce24-4633-b45a-ce1bcdc6ac06`; não promover outra conta nem repetir SQL.
Avisar apenas quando estiver salvo; não enviar os valores no chat. O próximo teste será login,
perfil sob RLS, logout/revogação e negação de acesso à segunda conta, sem alterar os perfis.

Credenciais ficam apenas no .env privado, conforme [.env.example](.env.example). Não enviar
senhas/chaves/URIs no chat, vídeo ou Git. Redis ainda requer instância Free/REST URL/token.
Checkout requer contato autorizado em store_settings e SUPABASE_SECRET_KEY só no backend;
não há número inventado, pagamento, reserva ou envio automático de mensagem.

## Testar

```sh
uv run --locked pytest -q
uv run --locked ruff check app scripts tests/{unit,contract,integration,real}
pnpm test:ui --workers=2
```

A suíte padrão e UI usam testes locais/dublês; não comprovam bancos. Testes de escrita externa
exigem autorização ESPECÍFICA e RUN_REAL_INTEGRATION=1 no processo. Não executar enquanto
perfil, contas e serviços estiverem incompletos. Com todos preparados/autorizados, o runner
protegido `python -m scripts.run_real_e2e` inicia seu próprio servidor e omite erros brutos que
possam conter credenciais. Não rodar Playwright real direto com senhas no ambiente.
Testes negativos `NEOX_FASTAPI_URL=... pnpm exec playwright test` exigem instância separada
com TEST_CONNECTIONS_ENABLED=false; não usar esses testes 503 contra o servidor real habilitado.

[Configuração detalhada existente](docs/CONFIGURAR-BANCOS-TESTE.md) ·
[Evidências](docs/evidencias/backend-fase3.md) ·
[Roteiro de vídeo 8min](docs/evidencias/roteiro-video.md) ·
[Contratos](docs/contracts/openapi.json).

Git: .env/configurações privadas/build ignorados; preservar frontend e laboratório 3D nas suas
branches. Revisar segredos, acesso do professor ao repositório e link do vídeo antes da entrega.
Não houve push/deploy. Não declarar cadastro/login/Redis/checkout reais concluídos antes dos testes.
