# Tasks: NEOX drop V1.1

**Input**: spec.md, plan.md, research.md, data-model.md e contratos canônicos em docs/contracts/.
**Status**: implementação local autorizada em 18/11/2026; execução em feature/backend. Prioridades P0/P1 vêm da V1.1.
**Tests**: solicitados pelo capítulo 07 da V1.1; critérios de cada US em spec.md/quickstart.md.
**Owners**: Codex backend, Claude UI; cada linha cita arquivos e dependências. [P] permite paralelo apenas após pré-requisitos.

## Phase 1: Setup

- [x] T001 Codex: Definir projeto Python 3.13/FastAPI, versões compatíveis e lockfile em `pyproject.toml, uv.lock`. Origem: F-01. Depende: —.
- [ ] T002 [P] Claude: Definir build Tailwind/JS e runner UI isolados em `package.json, pnpm-lock.yaml`. Origem: F-01,V-01. Depende: —.
## Phase 2: Foundational

- [x] T003 Codex: Criar composição FastAPI e registro de routers/loaders (sem editar templates) em `app/main.py, app/api/pages.py`. Origem: F-01. Depende: T001.
- [x] T004 Codex: Configurar env/segredos, erros seguros, timeouts e limites/rate-limit parametrizados em `app/core/config.py, app/core/security.py, app/core/exceptions.py, .env.example`. Origem: F-02,S-01. Depende: T001.
- [x] T005 Codex: Mapear wire schemas exatamente ao OpenAPI e projeções pública/admin em `app/schemas/product.py, app/schemas/auth.py, app/schemas/checkout.py`. Origem: DB-DIAG-04. Depende: T001.
- [x] T006 Codex: Preparar adaptadores por request e checagem de conexões somente teste em `app/db/supabase.py, app/db/mongodb.py, app/db/redis.py, scripts/check_connections.py`. Origem: F-02. Depende: T004.
- [x] T007 Codex: Adicionar testes de contrato com fixtures canônicas e negativos, incluindo sem segredos em `tests/contract/test_openapi.py, tests/conftest.py`. Origem: F-01,DB-DIAG-04. Depende: T005.
## Phase 3: US1 — Admin e primeira fatia (P0)

- [ ] T008 [US1] Codex: Revisar/gerar migration por CLI oficial e testar Auth/perfil/RLS em ambiente autorizado em `supabase/migrations/ (arquivo gerado pelo CLI), tests/integration/test_admin_rls.py`. Origem: D-01,DB-DIAG-01. Depende: T006, T007; restrições: data-model.md — AdminProfile.user_id, AdminProfile.display_name, AdminProfile.role, AdminProfile.is_active, AdminProfile.created_at, AdminProfile.updated_at, StoreSettings.id, StoreSettings.store_name, StoreSettings.whatsapp_e164_digits, StoreSettings.updated_at.
  **Andamento 19/11:** Migration gerada pelo CLI e sintaxe/segurança revisadas; aplicação e testes reais de Auth/RLS pendentes. Fase 3: configuração ausente, projeto de teste ainda não confirmado; roteiro em docs/CONFIGURAR-BANCOS-TESTE.md.
- [ ] T009 [US1] Codex: Implementar login/logout/me e autorização/CSRF em cada rota, testar negativo e sessão isolada em `app/api/auth.py, app/services/admin.py, tests/integration/test_auth.py`. Origem: A-01. Depende: T008, T004; restrições: data-model.md — AdminProfile.user_id, AdminProfile.role, AdminProfile.is_active.
  **Andamento 19/11:** Código e testes locais de Auth, sessão/refresh e autorização preparados; aceite integrado depende de T008 real.
- [ ] T010 [US1] Codex: Validar coleção/índices e gerar seed fictícia sem executar referência em produção em `mongo/products_schema.mongodb.js, scripts/seed_products.py`. Origem: D-02,DB-DIAG-02. Depende: T006, T007; restrições: data-model.md — MongoProduct._id, MongoProduct.sku, MongoProduct.slug, MongoProduct.name, MongoProduct.brand, MongoProduct.category, MongoProduct.description, MongoProduct.priceCents, MongoProduct.currency, MongoProduct.active, MongoProduct.mainImageUrl, MongoProduct.galleryUrls, MongoProduct.model3dUrl, MongoProduct.colorName, MongoProduct.sizes, MongoProduct.sizes[].sizeBR, MongoProduct.sizes[].stock, MongoProduct.attributes, MongoProduct.featured, MongoProduct.featured.enabled, MongoProduct.featured.order, MongoProduct.featured.backgroundHex, MongoProduct.featured.accentHex, MongoProduct.createdAt, MongoProduct.updatedAt.
  **Andamento 19/11:** Validador/índices/seed opt-in preparados; coleção/índices reais ainda não validados.
- [ ] T011 [US1] Codex: Implementar CRUD admin, allowlist, soft-delete e respostas 201/200/204/409 em `app/api/admin_products.py, app/services/catalog.py, tests/integration/test_admin_products.py`. Origem: A-02. Depende: T009, T010; restrições: data-model.md — MongoProduct.sku, MongoProduct.slug, MongoProduct.active, MongoProduct.priceCents, MongoProduct.sizes[].sizeBR, MongoProduct.sizes[].stock, MongoProduct.featured.order.
  **Andamento 19/11:** CRUD e negativos locais preparados; comprovação integrada aguarda T008/T010 reais.
- [ ] T012 [P] [US1] Claude: Construir base/header, home inicial fiel e tokens das imagens 01/04, com build e acessibilidade em `app/templates/base.html, app/templates/home.html, app/static/css/input.css`. Origem: V-01. Depende: T002.
- [ ] T013 [P] [US1] Claude: Criar login e telas admin consumindo corpo/CSRF e sem tokens em JS em `app/templates/admin/login.html, app/templates/admin/products.html, app/static/js/admin.js`. Origem: A-01,V-01. Depende: T012, T007.
- [ ] T014 [US1] Codex: Ligar loaders HTML ao contexto acordado e validar primeira fatia login-cadastro-catálogo em `app/api/pages.py, tests/integration/test_pages.py`. Origem: A-02,DB-DIAG-04. Depende: T011, T013, T015, T016.
## Phase 4: US2 — Catálogo/detalhe (P0; filtros P1)

- [ ] T015 [US2] Codex: Implementar consulta pública, filtros, projeções e featured sem HTML cacheado em `app/api/products.py, app/services/catalog.py, tests/integration/test_public_catalog.py`. Origem: V-02,RF-14. Depende: T010, T007, T011; restrições: data-model.md — MongoProduct.active, MongoProduct.slug, MongoProduct.priceCents, MongoProduct.sizes[].sizeBR, MongoProduct.sizes[].stock, MongoProduct.featured.enabled, MongoProduct.featured.order.
  **Andamento 19/11:** Catálogo/filtros/detalhe/featured locais preparados; aceite real depende da cadeia anterior.
- [ ] T016 [P] [US2] Claude: Criar catálogo/detalhe com sizesAvailable, loading/vazio/erro e links de produto em `app/templates/catalog.html, app/templates/product.html, app/static/js/catalog.js`. Origem: V-02. Depende: T012, T007.
- [ ] T017 [US2] Codex: Implementar cache-aside/invalidação, bypass seguro multiworker e teste de falha após escrita em `app/services/catalog.py, tests/integration/test_product_cache.py`. Origem: D-03,RF-10,DB-DIAG-03. Depende: T011, T015, T006; restrições: data-model.md — PublicProductCache.key, PublicProductCache.payload, PublicProductCache.ttl, MongoProduct.active, MongoProduct.updatedAt.
  **Andamento 19/11:** Cache versionado/invalidação e falhas locais testados; prova de serviços/multiworker reais pendente.
## Phase 5: US3 — Recentes (P0)

- [ ] T018 [US3] Codex: Implementar recentes atômicos e fallback; GET não registra visita em `app/api/recent.py, app/services/recent.py, tests/integration/test_recent.py`. Origem: D-03,R-01,DB-DIAG-03. Depende: T015, T006; restrições: data-model.md — RecentHistory.opaqueId, RecentHistory.productIds, RecentHistory.ttl.
  **Andamento 19/11:** EVAL atômico/recentes/fallback locais preparados; prova Redis+Mongo real pendente.
- [ ] T019 [P] [US3] Claude: Conectar seção recentes e registrar POST por visita lógica, com falha não bloqueante em `app/templates/partials/recent.html, app/static/js/recent.js`. Origem: R-01. Depende: T012, T007.
## Phase 6: US4 — Carrinho e WhatsApp (P0)

- [ ] T020 [P] [US4] Claude: Criar carrinho local validado por produto+tamanho; sem persistir preço confiável em `app/templates/partials/cart.html, app/static/js/cart.js, tests/e2e/cart.spec.js`. Origem: V-03. Depende: T016; restrições: data-model.md — CartItem.productId, CartItem.sizeBR, CartItem.quantity.
- [ ] T021 [US4] Codex: Implementar cálculo/revalidação Mongo, limites e link WhatsApp sem gravar pedido em `app/services/cart.py, app/api/checkout.py, tests/unit/test_cart.py, tests/integration/test_checkout.py`. Origem: C-01. Depende: T015, T006, T007; restrições: data-model.md — CartItem.productId, CartItem.sizeBR, CartItem.quantity, Checkout.items, Checkout.lineTotalCents, Checkout.totalCents, Checkout.waUrl, StoreSettings.whatsapp_e164_digits.
  **Andamento 19/11:** Checkout em centavos, revalidação e contato privado locais preparados; prova real e UI pendentes.
- [ ] T022 [P] [US4] Claude: Consumir resumo/erros, confirmar preço alterado e abrir link somente após confirmação em `app/static/js/checkout.js, tests/e2e/checkout.spec.js`. Origem: C-02. Depende: T020, T007; restrições: data-model.md — Checkout.lineTotalCents, Checkout.totalCents, Checkout.waUrl.
## Phase 7: US5 — Identidade/3D (P1; layout básico antecipado)

- [ ] T023 [P] [US5] Claude: Refinar home inicial com coleções, lançamentos e destaques dinâmicos, sem claims falsos em `app/templates/home.html, app/templates/partials/hero.html, app/static/js/home.js`. Origem: U-01,V-01. Depende: T012, T007.
- [ ] T024 [US5] Claude: Obter com responsável GLB/poster/licença; registrar origem antes de publicar qualquer mídia em `docs/assets-licenses.md, app/static/models/ (somente após licença)`. Origem: U-02. Depende: T023; restrições: data-model.md — MongoProduct.model3dUrl.
- [ ] T025 [US5] Claude: Integrar Model Viewer Y-only, carrossel atômico, reduced-motion e fallback estático em `app/static/js/hero.js, tests/e2e/hero.spec.js`. Origem: U-02,U-03. Depende: T023, T024; restrições: data-model.md — MongoProduct.model3dUrl, MongoProduct.featured.backgroundHex, MongoProduct.featured.accentHex.
- [ ] T026 [US5] Claude: Validar homepage com referência 04, 360px, teclado, foco, contraste e corrida de slides em `tests/e2e/visual.spec.js, docs/evidencias/visual.md`. Origem: U-03,RF-15. Depende: T025.
## Final Phase: Integração, revisão e evidências

- [ ] T027 Claude: Cobrir jornada real integrada com dados fictícios e banco de teste autorizado em `tests/e2e/storefront.spec.js`. Origem: Q-01. Depende: T014, T016, T018, T019, T021, T022.
- [ ] T028 Codex: Revisar auth/RLS/CSRF/rate-limit/injeção/cache com Trail of Bits sem pentest externo em `docs/evidencias/seguranca.md, tests/integration/test_security.py`. Origem: S-01. Depende: T027, T017.
- [ ] T029 Codex: Registrar prova real dos três bancos e explain de índices sem segredos em `docs/evidencias/bancos.md`. Origem: DB-DIAG-01,DB-DIAG-02,DB-DIAG-03. Depende: T008, T010, T017, T018, T027.
- [ ] T030 Claude: Preparar evidências visuais/diagramas e roteiro do vídeo sem simular serviços ou licenças em `docs/evidencias/roteiro-video.md`. Origem: E-01,DB-DIAG-05. Depende: T027.
- [ ] T031 Codex: Atualizar README com comandos reais/lockfiles e status honesto após testes em `README.md`. Origem: E-01. Depende: T028, T029.
- [ ] T032 Humano: Gravar/validar vídeo de 5–10min, links e submissão até 26/11; merge revisado, sem deploy implícito em `docs/evidencias/entrega.md`. Origem: E-01. Depende: T030, T031.

## Dependencies & Execution Order

T001/T002 iniciam independentes. A fundação T003–T007 bloqueia integração real; T012/layout pode usar fixtures depois do build. US1/US2 se encontram em T014; US3 e US4 consomem o catálogo. T017 serializa mudanças de catalog.py após T011/T015. T022 pode avançar em mock, mas integração depende T021. US5/3D só passa com T024; não bloqueia demonstração P0.

Exemplos de ondas sem arquivos compartilhados: T001 Codex + T002 Claude; depois T009 Codex + T013 Claude; T015 Codex + T016 Claude; T018 Codex + T019 Claude; T021 Codex + T022 Claude. Respeitar dependências listadas, não a ordem numérica isolada.

## Implementation Strategy

Primeira fatia: login admin → cadastro MongoDB → catálogo com contexto Jinja. Completar P0 até WhatsApp/Redis antes de refinamentos. Os testes de autorização/cálculo precisam falhar antes da implementação correspondente. Mocks não contam como evidência real. Configurar ambiente de teste/credenciais sem gastos com responsável antes de T008/T010/T018.

MVP não equivale a produto entregue: T032 depende de evidências, vídeo e links. P-01/deploy da referência foi deliberadamente excluído desta execução e requer autorização própria. Não executar tarefas nesta etapa.
