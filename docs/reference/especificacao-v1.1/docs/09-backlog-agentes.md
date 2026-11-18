# 09 — Backlog, roadmap e colaboração Claude + Codex

## Organização
- **Fonte da verdade:** esta documentação no Git. `docs/01-requisitos-prd.md` define *o quê*; `docs/04-contratos-api.md` define contratos; `docs/05-identidade-ux-ui.md` define visual; este backlog define ordem.
- **Branches:** `main` estável; `feature/backend` (Codex); `feature/frontend` (Claude), preferencialmente em **Git worktrees distintos**.
- **Nenhum agente** deve sobrescrever arquivos do outro nem executar `git push --force`, migrações destrutivas, compras, acesso a produção ou deploy sem aprovação.
- **Ponytail/Superpowers/Spec Kit/Serena** podem apoiar, mas não devem gerar planos conflitantes; por prazo, não bloquear implementação por instalação de todas as skills.

## Épicos e tarefas
| ID | Pri. | Dependências | Responsável | Entrega + critério |
|---|---|---|---|---|
| F-01 | P0 | — | Ambos | Fundação Python/FastAPI, Jinja2, Tailwind build, Python/JS lint e testes básicos |
| F-02 | P0 | F-01 | Codex | `.env.example`, adaptadores e health checks sem revelar segredos |
| D-01 | P0 | F-02 | Codex | Supabase Auth e migration `admin_profiles`; usuário sem admin negado |
| D-02 | P0 | F-02 | Codex | Coleção MongoDB, índices e seed fictícia; CRUD testado |
| D-03 | P0 | F-02 | Codex | Redis recentes + TTL + cache e invalidação testados |
| A-01 | P0 | D-01 | Codex | Endpoints admin com cookies/CSRF e perfil validado |
| A-02 | P0 | D-02,A-01 | Codex | CRUD admin com cadastro e atualização imediata no catálogo |
| V-01 | P0 | F-01 | Claude | Layout base e header NEOX drop com design tokens |
| V-02 | P0 | D-02,V-01 | Claude + Codex | Catálogo e tela de produto consumindo API real |
| V-03 | P0 | V-02 | Claude | Carrinho com tamanho/quantidade, persistência local limitada |
| C-01 | P0 | D-02,V-03 | Codex | Checkout revalida preços/estoque e monta WhatsApp |
| C-02 | P0 | C-01 | Claude | UI de pedido e tratamento de erros/preço alterado |
| R-01 | P0 | D-03,V-02 | Claude + Codex | Seção Vistos recentemente conectada ao Redis |
| U-01 | P1 | V-01,D-02 | Claude | Homepage editorial, cards Street/Classics/Performance e destaques dinâmicos |
| U-02 | P1 | U-01 | Claude | Integração real de **um** modelo `.glb` e giro Y-only |
| U-03 | P1 | U-02 | Claude | Carrossel sincronizado, fallback 2D, reduzir movimento, mobile |
| Q-01 | P0 | A-02,C-02,R-01 | Codex + Claude | Testes E2E login→cadastro→catálogo→recentes→WhatsApp |
| S-01 | P0 | Q-01 | Codex | Segurança, revisão RLS, segredos, rate-limit, CSRF |
| P-01 | P1 | Q-01,S-01 | Ambos | Prova de conceito Vercel e conexão segura, se viável sem custos |
| E-01 | P0 | Q-01 | Usuário | README final, vídeo 5–10 min, link repositório/Plataforma A |

## Plano de tempo até 26/11/2026
- **18/11:** documentação congelada V1, pastas, testes de viabilidade dos serviços.
- **19–20/11:** Supabase, MongoDB, login e CRUD funcional; layout básico.
- **21/11:** catálogo real + carrinho.
- **22/11:** Redis recentes/cache + checkout WhatsApp.
- **23/11:** integração vertical completa e demonstração de 3 bancos.
- **24/11:** 3D/carrossel, responsividade, segurança e deploy apenas se passar critérios.
- **25/11:** README final + gravar/validar vídeo e links.
- **26/11:** revisão final e submissão na Plataforma A.

**Regra de priorização:** se faltar tempo, proteger P0 (bancos, carrinho, WhatsApp, vídeo) antes de refinamentos, sem abandonar o design básico. **O GLB é o diferencial desejado, mas não substitui nenhum requisito obrigatório.**

## Contrato de trabalho do Claude
- Trabalhar em templates, CSS, JS e componentes visuais; usar UIs aprovadas e contrato de API.
- Mostrar estados vazios, erro/loading, foco e mobile.
- Verificar GLB licenciado, poster e Y-only; sem usar foto para fingir tridimensionalidade.
- Escrever testes de interação/roteiros visuais e submeter mudanças em commits pequenos.

## Contrato de trabalho do Codex
- Trabalhar em Python, schemas, DB, migrations, scripts, autorização, segurança e testes.
- Testar Supabase/MongoDB/Redis em ambiente de teste, usando logs sem segredos.
- Manter formatos JSON do contrato; retornar erros seguros e documentação de endpoints.
- Não alterar design aprovado nem templates sem coordenação.

## Integração
1. Revisar diffs dos dois agentes; verificar que os arquivos não conflitam.
2. Executar lint/pytest e testes do browser.
3. Verificar autenticação negativa, cadastro instantâneo e WhatsApp.
4. Fazer merge de uma branch por vez na `main`, sem perder alterações.
5. Registrar evidência e status real. Não declarar "pronto" só por existir código gerado.

## Prompt de abertura de tarefa — Codex
> Siga README.md, AGENTS.md, docs/01-requisitos-prd.md, docs/03-modelagem-bancos.md, docs/04-contratos-api.md e docs/06-seguranca.md. Antes de alterar código, inspecione o repositório e informe quais tarefas estão incompletas. Trabalhe somente no escopo backend da tarefa escolhida, com testes, commits pequenos e sem segredos, gastos, deploy ou alterações destrutivas sem autorização. Preserve os contratos de API.

## Prompt de abertura de tarefa — Claude
> Siga README.md, AGENTS.md, CLAUDE.md, docs/01-requisitos-prd.md, docs/04-contratos-api.md e docs/05-identidade-ux-ui.md. Inspecione a estrutura existente, mantenha a identidade NEOX drop aprovada e implemente apenas a UI da tarefa escolhida. Não invente endpoints nem preços. Respeite hero 3D com giro somente no eixo Y, fallback 2D e acessibilidade. Faça commits pequenos sem sobrescrever trabalho do Codex.

## Complemento V1.1 — modelagem profissional
| ID | Pri. | Responsável | Entrega verificável |
|---|---|---|---|
| DB-DIAG-01 | P0 | Codex | Verificar DER Supabase, FKs, RLS e script `0001_schema.sql` em ambiente de teste |
| DB-DIAG-02 | P0 | Codex | Criar Mongo `products` com `$jsonSchema` e índices; comparar com diagrama documental |
| DB-DIAG-03 | P0 | Codex | Demonstrar LIST/TTL/cache Redis com chaves reais de teste e logs sem dados sensíveis |
| DB-DIAG-04 | P0 | Ambos | Revisar contratos da API vs dicionário e casos de teste; corrigir divergências em commit |
| DB-DIAG-05 | P1 | Claude | Usar SVG/PNG dos diagramas nas apresentações e no vídeo, sem confundir projeto com execução |
