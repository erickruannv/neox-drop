# Handoff e guia de validação — não é execução da aplicação

## Estado

Somente documentação/contratos. Não existem app/, pyproject.toml, CSS build ou serviços provisionados.
Não executar o roteiro de servidor da referência antes das tarefas de fundação. Nenhuma credencial
é necessária para ler estes artefatos e validar o OpenAPI.

## Validar a preparação documental

```sh
# A partir da raiz do próprio checkout/worktree:
export SPECIFY_FEATURE_DIRECTORY="$PWD/specs/001-neox-drop-v11"
export SPECIFY_FEATURE_NO_PERSIST=1
.specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks
# Ferramenta opcional isolada, sem tocar dependências da aplicação:
uvx --from openapi-spec-validator openapi-spec-validator docs/contracts/openapi.json
```

Conferir também SHA256.json da referência, refs do OpenAPI, exemplos contra JSON Schema,
links locais e IDs/dependências dos tasks. `docs/VALIDACAO-V1.1.md` registra os resultados desta rodada.

## Iniciar trabalho paralelo depois de autorizado

O responsável integra o baseline documental em Git antes de criar branches/worktrees. Conferir
com git status que não há alterações importadas pendentes. Criar feature/backend e feature/frontend
a partir do mesmo commit; caminhos dos worktrees são locais e escolhidos pelo responsável.
Cada agente lê AGENTS.md, constituição, spec, plano, contratos e tasks antes de começar.
Configurar SPECIFY_FEATURE_DIRECTORY no próprio worktree, não apontar ao checkout do outro agente.
Revisar MCPs locais ignorados: Serena --project fixo e diretórios de tarefa devem apontar ao próprio
worktree antes de habilitar edição. Não copiar tokens em arquivo compartilhado.

Primeira onda: Codex T001, Claude T002. Depois T003–T007. Claude pode preparar layout com fixtures
em seu escopo; nenhuma tela é declarada integrada só porque mock funciona.

## Validação futura por história

- US1: T-01–08/21; Auth real controlado, não-admin 403, Mongo escreve e catálogo atualiza.
- US2: paginação/filtros reais, inativos ausentes, 503 Mongo, cache hit/miss/invalidado.
- US3: A,B,A e sete visitas; ordem/deduplicação/TTLs; queda Redis e concorrência entre abas.
- US4: total 40970 centavos; preço forjado, duplicatas e estoque; contato vazio; link/texto
  conferidos sem enviar mensagem real. UI confirma alterações antes de abrir WhatsApp.
- US5: comparação imagem 04, 360px/teclado/contraste, GLB real Y-only, sem zoom/pan, reduced-motion,
  clique rápido em slides, erro WebGL e fallback estático. GLB ausente não passa T-17.

As futuras tarefas de testes escreverão os comandos reais quando ferramentas da aplicação existirem.
DoD exige lint/pytest/contrato/UI e evidências reais dos bancos de teste; não há deploy autorizado.
