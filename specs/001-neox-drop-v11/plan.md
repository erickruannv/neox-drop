# Implementation Plan: NEOX drop V1.1

**Baseline branch**: main | **Date**: 2026-11-18 | **Spec**: [spec.md](spec.md)
**Status**: planejamento concluído; tarefas não executadas. Branches futuras: feature/backend e feature/frontend.

## Summary

Monólito modular Python-first com fronteira HTTP/UI definida antes do paralelismo.
Primeira fatia: login admin → cadastro MongoDB → catálogo público; Redis, carrinho e WhatsApp
completam P0 antes do hero 3D P1. Não criar serviços, migrations executáveis ou código nesta etapa.

## Technical Context

**Language/Version**: Python 3.13, JavaScript e HTML Jinja2.
**Primary Dependencies**: FastAPI/Pydantic/Jinja2, Tailwind build, Model Viewer, supabase-py,
PyMongo async, upstash-redis. Versões exatas/lockfiles serão avaliados em T001/T002, não inventados.
**Storage**: Supabase Auth/PostgreSQL (perfis/contato), MongoDB products, Redis REST recentes/cache.
**Testing**: pytest/httpx, testes de contrato e integração controlada, Playwright/roteiro visual.
**Target Platform**: macOS desenvolvimento, browser 360px–desktop; deploy não autorizado.
**Project Type**: aplicação web SSR, sem SPA/backend Node.
**Performance Goals**: HTML/poster imediato e GLB progressivo; não há SLA numérico na origem.
**Constraints**: sem custos/produção/deploy; estoque não transacional; TTLs 604800/300 s;
checkout no MongoDB sem cache; 10 unidades por linha agrupada; limites técnicos em research.md.
**Scale/Scope**: demonstração acadêmica, 16 RF, 5 histórias, 14 operações HTTP, entrega 26/11/2026.

## Constitution Check

| Gate | Resultado pré/pós design |
|---|---|
| V1.1 e hash preservados | PASS documental |
| Python-first, sem SPA | PASS |
| Responsabilidades exclusivas dos bancos | PASS |
| Auth não implica admin, RLS e CSRF | PASS de especificação; testes ainda não executados |
| Contrato único, owners e testes por história | PASS |
| Visual 01/04 e Y-only/reduced-motion/fallback | PASS de especificação; GLB pendente |
| Sem implementação/infra/deploy | PASS |

Nenhuma violação constitucional usada para justificar complexidade.

## Project Structure

Documentação desta feature: spec.md, plan.md, research.md, data-model.md, quickstart.md,
contracts/README.md (ponte para contrato canônico), tasks.md. Contrato canônico em docs/contracts/.
A referência original permanece em docs/reference/.

Estrutura de implementação **planejada, ainda não criada**:

```text
app/
  main.py
  core/{config.py,security.py,exceptions.py}
  api/{pages.py,auth.py,products.py,recent.py,checkout.py,admin_products.py}
  services/{catalog.py,recent.py,cart.py,admin.py}
  db/{supabase.py,mongodb.py,redis.py}
  schemas/{product.py,checkout.py,auth.py}
  templates/{base.html,home.html,catalog.html,product.html,admin/}
  static/{css/,js/,images/,models/}
supabase/migrations/
mongo/
scripts/{seed_products.py,check_connections.py}
tests/{unit/,contract/,integration/,e2e/}
pyproject.toml, uv.lock, package.json, pnpm-lock.yaml, .env.example
```

## Ownership e integração

| Owner único | Arquivos/limites |
|---|---|
| Codex | app/main.py, app/api/, app/core/, app/db/, app/services/, app/schemas/, scripts/, migrations, mongo/, Python lock/config, .env.example, tests/unit/contract/integration, OpenAPI/examples |
| Claude | app/templates/, app/static/, package.json e pnpm-lock.yaml, testes UI/E2E *.spec.js e configuração Playwright |
| Tech Lead com revisão dos dois | constituição, spec/plano/tasks, contratos e critérios visuais |

Claude nunca sobrescreve routers para conectar telas; Codex fornece contexto de páginas conforme
ui.md. Mocks usam exemplos canônicos; fixtures não redefinem schemas. Criar worktrees somente após
baseline documental compartilhado e autorização para implementar. Nenhuma tarefa usa simultaneamente
o mesmo arquivo. Arquivos compartilhados (contratos, config, main) são integrados primeiro pelo owner.

Ordem: T001/T002 em paralelo → fundação T003–T007 → US1/US2 para primeira fatia → US3/US4 →
integração P0 → US5 diferencial/refinamentos → evidências. Layout base pode avançar com fixtures;
login/catálogo real só ficam concluídos depois do backend e bancos de teste. Merges humanos revisados.

## Handoff por worktree

Branches feature/backend e feature/frontend partem do mesmo commit contendo estes artefatos.
Em cada worktree usar SPECIFY_FEATURE_DIRECTORY relativo ao seu checkout. Configurações locais
ignoradas não são clonadas automaticamente; paths fixos de Serena e cwd/MCP devem apontar para o
worktree correto. Não compartilhar .venv, node_modules ou sessão mutável de Supabase entre agentes.
Não substituir os MCPs globais ou copiar credenciais de uma máquina para outra.

## Complexity Tracking

Sem microserviços, filas, sincronização de estoque, backend Node, login de comprador ou biblioteca
genérica de repositórios. Adaptadores pequenos por banco conforme V1.1. Cache é descartável;
estratégia de bypass multiworker será validada, não presumida. Sem cache de HTML/listagem na V1.
