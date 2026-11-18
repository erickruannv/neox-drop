# AGENTS.md — Regras compartilhadas Claude / Codex

## Missão
Construir NEOX drop, loja acadêmica de sneakers, conforme README.md e documentação de `docs/`. **Prazo de entrega: 26/11/2026.** Não afirmar que uma integração funciona sem teste.

## Prioridade inegociável
Supabase login admin; MongoDB CRUD/catálogo imediato; Redis recentes/cache; carrinho + revalidação do preço; WhatsApp; vídeo 5–10 minutos. Depois: hero 3D e acabamento.

## Stack
Python/FastAPI + Jinja2 + Tailwind CSS + JavaScript + `<model-viewer>`; Supabase Auth/Postgres, MongoDB, Redis Upstash.

## Instruções
1. Antes de modificar algo, inspecionar os arquivos e confirmar estado real.
2. Ler `docs/01-requisitos-prd.md`, `docs/04-contratos-api.md` e arquivo da área pertinente.
3. Não alterar nomes e formatos de endpoints unilateralmente.
4. Não inserir senhas, tokens, números pessoais, URIs reais em Git.
5. Não criar deploy, gastos, compras, contas, migrações destrutivas, exclusões ou alterações remotas sem autorização.
6. Não atribuir privilégios administrativos a todo usuário autenticado.
7. Nunca aceitar preços do browser; montar pedido no backend com MongoDB como fonte da verdade.
8. Manter testes e documentação sincronizados com código real.
9. Usar branches ou worktrees distintos: `feature/frontend` Claude e `feature/backend` Codex; `main` só por merge revisado.
10. Não usar skills de segurança como desculpa para executar varreduras contra serviços externos sem permissão; testes somente ambiente próprio/controlado.
11. Respeitar visual aprovado: marca **NEOX** principal, `drop` secundária, esportivo editorial, hero com carrossel e **giro do modelo real 3D somente no eixo Y**; fallback estático.
12. Evitar overengineering; manter backlog P0 antes de P1.

## Responsáveis
- **Claude:** UX/UI, templates, CSS, JS, acessibilidade, visualizador 3D e testes de interação.
- **Codex:** FastAPI, DB, schemas, migrations, autenticação, segurança, checkout e testes.
- **Humano:** aprova decisões de custo, publicação, infraestrutura, credenciais e merges.

## Comprovação de conclusão
Descrever o que mudou, comandos executados, testes que passaram/falharam, limitações, arquivos modificados e próxima tarefa. Nunca declarar "pronto" sem evidência.

## Modelagem V1.1 — fonte de verdade
Antes de alterar banco, payload, queries ou autorizacao, conferir `docs/15-diagramas-modelagem.md`, `docs/16-dicionario-de-dados.md`, `docs/17-esquema-fisico-e-indices.md` e `docs/18-fluxos-e-consistencia.md`. Se mudar um campo ou indice, atualizar diagramas e exemplos no mesmo commit. Nao tratar diagramas como evidencias de implementacao.
