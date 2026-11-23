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
uv run --locked uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 1 --no-proxy-headers
```

Abra **http://127.0.0.1:8000/**. Catálogo: `/tenis`; login: `/admin/login`;
painel protegido: `/admin/produtos`. O carrinho é aberto pelo botão do cabeçalho.
O .env local foi configurado com APP_ENV=test e TEST_CONNECTIONS_ENABLED=true;
o .env.example e os padrões do código continuam com conexões desabilitadas.
Só usar os projetos de TESTE já conferidos. Um worker até existir rate limit compartilhado.

## Estado real

| Serviço | Papel | Situação |
|---|---|---|
| Supabase PostgreSQL/Auth | Identidade, perfil admin/RLS e contato WhatsApp privado | URL/Publishable configurados; admin real validado: login, painel, renovação, logout e RLS/revogação; segunda conta pendente |
| MongoDB Atlas | Produtos, preço em centavos e estoque autoritativos | Cluster0, papel neox_drop_test@admin restrito ao banco neox_drop_test; products strict/error, seis índices adicionais; CRUD e persistência reais comprovados com um registro fictício, agora inativo |
| Upstash Redis | Até 5 recentes, TTL 7 dias; cache 300s, sem governar preço | Upstash real validado: gravação/leitura, ordem, cinco únicos, TTL e expiração; demonstração UI positiva depende de produto ativo |

FastAPI principal :8000 utiliza Supabase e Atlas reais no mesmo processo. Cadastro pela UI,
edição pela API, catálogo ativo, persistência após reiniciar e desativação foram comprovados.
O único produto fictício autorizado (`NEOX-QA-20261122-A01`) permanece no Atlas com active=false;
por isso o catálogo público está vazio. Nenhum outro registro foi alterado. Admin sem sessão
continua bloqueado. Health retorna ok com os três serviços disponíveis. Não recriar
Mongo/Supabase nem reaplicar a migration manual já executada.

**Supabase + MongoDB: fluxo administrativo principal concluído com serviços reais.**
Nenhuma ação manual adicional necessária para esse fluxo. Pendência secundária: a segunda
conta recebe invalid_credentials no Auth; a negação após um login válido dessa conta ainda
não foi comprovada. Redis real e TTL foram validados; histórico visível com produto ativo e
checkout WhatsApp ainda precisam de demonstração integrada.

Credenciais ficam apenas no .env privado, conforme [.env.example](.env.example). Não enviar
senhas/chaves/URIs no chat, vídeo ou Git. Upstash Free/REST URL/token já configurados localmente.
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
Não houve push/deploy. Checkout WhatsApp ainda não comprovado com serviços reais.
