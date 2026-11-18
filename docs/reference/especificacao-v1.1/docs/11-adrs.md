# 11 — Registros de decisão arquitetural (ADRs)

## ADR-001 — Python como linguagem principal
**Status:** aceito. **Decisão:** FastAPI como backend e renderização Jinja2. **Motivo:** preferência explícita do usuário por Python e controle de complexidade. **Consequência:** JS permanece necessário para interação/3D, mas não existe frontend SPA independente.

## ADR-002 — Bancos de dados poliglotas
**Status:** exigência aceita. **Decisão:** Supabase Auth + Postgres para administração, MongoDB para produtos, Redis para recentes/cache. **Motivo:** atender trabalho e demonstrar benefícios de cada modelo. **Consequência:** consistência eventual entre cache e fonte da verdade; invalidar após edição.

## ADR-003 — Checkout externo pelo WhatsApp
**Status:** aceito. **Decisão:** backend valida itens e gera link `wa.me`; não existe pagamento nem confirmação automática. **Motivo:** requisito acadêmico. **Consequência:** link não prova conclusão de pedido.

## ADR-004 — Identidade NEOX drop
**Status:** aceito. **Decisão:** NEOX dominante com drop subordinado em coral, estética sneaker editorial esportiva; preferir proposta visual 1. **Motivo:** referências e aprovação do usuário. **Consequência:** tokens de design e fotos coerentes, sem copiar marcas de terceiros.

## ADR-005 — Hero 3D com controle em um eixo
**Status:** aceito. **Decisão:** usar `<model-viewer>` com GLB real, azimute livre e ângulo polar bloqueado; prefer-reduced-motion e fallback 2D. **Motivo:** interação pedida pelo usuário. **Consequência:** depende de modelos licenciados; não substitui requisitos P0.

## ADR-006 — Carrinho cliente sem conta
**Status:** aceito. **Decisão:** armazenar apenas identificadores, tamanho e quantidade localmente; backend revalida. **Motivo:** reduzir fricção e desenvolvimento. **Consequência:** carrinho não sincroniza entre aparelhos e não é fonte confiável do preço.

## ADR-007 — Upload simples de mídias na V1
**Status:** proposto/aceito para V1. **Decisão:** caminhos/URLs de imagens e GLB pré-publicados em diretório estático, sem upload arbitrário. **Motivo:** prazo curto e segurança. **Consequência:** administrador informa URLs/caminhos; upload poderá ser implementado depois.

## ADR-008 — Hospedagem online opcional
**Status:** aceito condicionalmente. **Decisão:** testar Vercel para FastAPI, respeitando planos gratuitos e segurança de conexão MongoDB. **Motivo:** desejo de publicar se viável. **Consequência:** caso haja risco/custo, vídeo local é fallback.

## ADR-009 — Colaboração Claude + Codex
**Status:** aceito. **Decisão:** Claude UI/UX, Codex backend, contratos comuns, branches/worktrees separados e revisão antes do merge. **Motivo:** evitar conflito e retrabalho. **Consequência:** integrações só com validação humana.

## ADR-010 — Uso de skills e agentes externos
**Status:** opcional. **Decisão:** skills não substituem testes e não serão todas instaladas cegamente. Spec Kit especifica, UI UX Pro Max apoia visual, Serena compreensão, Superpowers engenharia, Trail of Bits segurança e Strix somente em ambiente autorizado. **Motivo:** reduzir atrito e risco na avaliação. **Consequência:** a prioridade continua entregar P0.
