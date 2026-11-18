# NEOX drop

**Preparação documental concluída; nenhuma funcionalidade implementada.** A V1.1 original,
os diagramas e as referências visuais estão em [docs/reference/](docs/reference/README.md).

Stack: Python 3.13 + FastAPI, Jinja2 + Tailwind compilado + JavaScript + Model Viewer,
Supabase Auth/PostgreSQL, MongoDB Atlas e Redis/Upstash. Checkout gera solicitação WhatsApp.

- [Validação V1.1 e prontidão](docs/VALIDACAO-V1.1.md).
- [Constituição](.specify/memory/constitution.md) e [instruções compartilhadas](AGENTS.md).
- [Contratos HTTP/UI](docs/contracts/README.md).
- [Spec](specs/001-neox-drop-v11/spec.md), [plano](specs/001-neox-drop-v11/plan.md) e
  [tarefas por agente](specs/001-neox-drop-v11/tasks.md).
- [Validação futura e handoff](specs/001-neox-drop-v11/quickstart.md).

Pode-se iniciar desenvolvimento paralelo **quando autorizado**, seguindo tarefas e dependências.
O modelo GLB/licenças e contas/credenciais de teste permanecem pendentes; não impedem a fundação
ou mocks, mas bloqueiam a comprovação real do 3D e das integrações. Não há deploy nem banco
provisionado por esta preparação. Comandos de execução da aplicação só existirão após F-01.

As configurações locais `.claude/settings.local.json`, `.codex/config.toml` e estado de agentes
continuam preservados no disco e fora do Git. Python 3.13 está registrado em `.python-version`.
O ZIP importado na raiz é uma cópia de entrada, não uma segunda fonte de especificação.
