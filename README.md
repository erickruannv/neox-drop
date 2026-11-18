# NEOX drop

Repositório em preparação. **O desenvolvimento paralelo ainda não está liberado:** a documentação oficial NEOX drop V1.1 e as referências visuais aprovadas ainda precisam ser disponibilizadas.

A stack confirmada é Python 3.13 + FastAPI, Jinja2 + Tailwind CSS + JavaScript, Model Viewer, Supabase Auth/PostgreSQL, MongoDB Atlas e Redis. Checkout pelo WhatsApp.

- Instruções compartilhadas: [AGENTS.md](AGENTS.md).
- Instruções Claude: [CLAUDE.md](CLAUDE.md).
- Estado, ferramentas e divisão proposta: [docs/PREPARACAO.md](docs/PREPARACAO.md).
- Etapa obrigatória dos contratos: [docs/contracts/README.md](docs/contracts/README.md).
- Spec Kit existente: `.specify/`; integrações Claude e Codex preservadas.

Disponibilizar a V1.1 original, incluindo diagramas, modelos de dados, requisitos e instruções para os agentes, preferencialmente em `docs/reference/`. Trazer também a referência/arquivos da homepage aprovada e o asset 3D aprovado. Não há uma cópia reconstituída da V1.1 neste repositório.

`.python-version` registra Python 3.13; não instala dependências nem define a versão de FastAPI. Não existe aplicação ou ambiente de bancos configurado.

Configurações locais como `.claude/settings.local.json`, `.codex/config.toml` e estado dos agentes são preservados no disco e ignorados pelo Git porque contêm caminhos deste computador. Os plugins globais e os MCPs dependem da preparação local de cada colaborador.
