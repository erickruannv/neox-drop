# NEOX drop — 3ª avaliação (6 pontos)

Python 3.13 + FastAPI/Jinja2 + Tailwind v4/JavaScript. Demonstração acadêmica, entrega 26/11/2026.
Obrigatório: login admin, CRUD e catálogo sincronizado, Redis/recentes, carrinho e solicitação
WhatsApp, repositório com instruções e vídeo 5–10min. [Referência original](docs/reference/especificacao-v1.1/docs/00-contexto.md).
Sem pagamentos ou frete real. O 3D aprovado usa embed Sketchfab com fallback para imagem.

## Abrir a aplicação real

Na pasta principal `/Users/dg/Documents/NeoxDrop`, branch `main`:

```sh
cd /Users/dg/Documents/NeoxDrop
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
A main reúne backend validado e frontend `9ccf0bd`, preservando os históricos. Worktrees
anteriores foram mantidas; a demonstração antiga :8001 foi encerrada. Não executar duas lojas.

## Estado real

| Serviço | Papel | Situação |
|---|---|---|
| Supabase PostgreSQL/Auth | Identidade, perfil admin/RLS e contato WhatsApp privado | URL/Publishable configurados; admin real validado: login, painel, renovação, logout e RLS/revogação; segunda conta pendente |
| MongoDB Atlas | Produtos, preço em centavos e estoque autoritativos | Cluster0, papel neox_drop_test@admin restrito ao banco neox_drop_test; products strict/error, seis índices adicionais; três produtos acadêmicos ativos/em destaque, persistência confirmada após reinício; QA inativo |
| Upstash Redis | Até 5 recentes, TTL 7 dias; cache 300s, sem governar preço | Upstash real validado: gravação/leitura, ordem, cinco únicos, TTL e expiração; home/recentes comprovados com os três produtos cadastrados no Atlas |

FastAPI principal :8000 utiliza Supabase, Atlas e Upstash reais no mesmo processo.
Catálogo acadêmico cadastrado, ativo e em destaque (preços fictícios):

| Produto | Preço | Categoria | Estoque |
|---|---:|---|---:|
| Nike Air Max 95 Dark Army/Orange Blaze | R$ 899,90 | Street | 9 |
| Nike Air Max 90 Infrared | R$ 749,90 | Performance | 10 |
| Adidas Samba OG Branco/Preto | R$ 599,90 | Classics | 10 |

[mongo/catalogo-academico.json](mongo/catalogo-academico.json) é a fonte aprovada do cadastro;
`docs/catalogo-definitivo.json.aprovados` foi sincronizado. Alternativas não foram cadastradas.
O registro `NEOX-QA-20261122-A01` permanece inativo e intocado. Não executar seed/upsert para
repetir o cadastro. Home, três Coleções, filtros, detalhes, imagens/créditos, 3D do AM95, carrinho,
WhatsApp e recentes foram validados no navegador contra os serviços reais. Após reiniciar,
os três produtos mantiveram os mesmos IDs/dados e continuaram ativos/em destaque.

O pedido de exemplo (AM95x1 + AM90x2 + Sambax1) totalizou R$ 2.999,60, revalidado no Atlas;
link e mensagem WhatsApp conferidos sem abrir o link/enviar mensagem. Redis preservou ordem,
deduplicação e TTL7dias dos recentes. Estoque não foi reservado/decrementado pelo checkout.
O painel agora aceita créditos e fontes das imagens/modelo3D nos campos de attributes.

Pendência secundária: segunda conta ainda recebe invalid_credentials no Auth; a negação após
login válido dessa conta não foi comprovada. Restam vídeo5–10min e acesso do professor ao
GitHub após autorização de publicação. Health retorna ok com os três serviços disponíveis.
Não recriar bancos nem reaplicar migrations já aprovadas.

O servidor lê `/Users/dg/Documents/NeoxDrop/.env` (main). A chave privada de contato foi
transferida localmente do .env da worktree backend após conferir o mesmo projeto Supabase;
nenhum valor foi registrado no Git. Edite o .env da pasta principal para configurar o servidor.
A origem pública `https://sketchfab.com` foi incluída em MEDIA_ALLOWED_ORIGINS para o embed aprovado.
REDIS_KEY_PREFIX="NEOX QA:" isola as chaves locais; vazio mantém as chaves padrão.
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
Não houve push/deploy. Próxima etapa: concluir o teste da segunda conta e preparar o vídeo
e o acesso do professor ao repositório.
