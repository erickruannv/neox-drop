# Preparação técnica da NEOX drop

## Estado em 18/11/2026

Documentação V1.1 ausente na pasta inspecionada. Sem código de aplicação, homepage aprovada, modelo 3D ou diagramas do produto. Os documentos encontrados eram apenas templates do Spec Kit, constituição com placeholders e exemplos de PRD do Taskmaster. Não são a especificação oficial.

Spec Kit 1.4.2 registra Claude e Codex. Constituição não ratificada; ainda não há specs/ de features. A conferência de consistência com a V1.1 permanece bloqueada até receber o material original. Nenhum arquivo existente do Spec Kit foi reescrito.

## Ferramentas

| Ferramenta | Claude | Codex | Evidência e limite |
|---|---|---|---|
| Trail of Bits | 4 plugins habilitados, escopo local | 4 plugins habilitados, perfil do usuário | listagem atual dos CLIs, sem reinstalação |
| Ponytail / Superpowers | habilitados | habilitados | listagem atual dos CLIs |
| Spec Kit / UI UX Pro Max | skills presentes | skills presentes | arquivos e integrações existentes |
| Understand Anything | plugin habilitado | 9 skills disponíveis no catálogo desta sessão | análise real depende de documentação/código |
| GStack | instalação existente | skills disponíveis no catálogo desta sessão | host Codex experimental; helper /cso não preparado |
| Serena / Taskmaster | MCPs configurados | MCPs habilitados na listagem atual | testes de leitura locais refeitos; detalhes no relatório externo |
| Strix | CLI externa instalada | CLI externa instalada | sem integração MCP improvisada; sem pentest ou configuração de modelo nesta etapa |

Trail of Bits inclui `audit-context-building` 2.0.2, `differential-review` 1.1.4, `sharp-edges` 1.1.3 e `property-based-testing` 1.2.3. Não é um plugin monolítico com o nome “Trail of Bits”.

A listagem do CLI comprova instalação/habilitação, não uma execução de skill dentro de toda sessão interativa. GStack e Understand Anything aparecem nesta sessão; Trail of Bits não aparece no catálogo de skills exposto a este assistente, embora esteja habilitado no CLI. Os MCPs também não estão expostos como ferramentas nativas deste turno; a conexão é verificada em processos separados. Não foi encerrada ou reiniciada uma sessão de usuário, nem feito um prompt pago para simular validação.

## Próxima etapa documental

1. Receber a V1.1 original e os arquivos/referências visuais aprovados.
2. Inventariar versão, capítulos, diagramas, modelos e requisitos sem alterar o original.
3. Rastrear a arquitetura confirmada e os requisitos até a constituição, spec.md e plan.md; resolver divergências antes de ratificar a constituição.
4. Consolidar contratos compartilhados conforme `contracts/README.md`.
5. Gerar tasks.md com dependências e responsáveis; somente então criar branches/worktrees de implementação.

## Primeira divisão proposta — condicionada aos contratos

| Responsável | Escopo após liberação | Dependência |
|---|---|---|
| Tech Lead, com revisão dos dois agentes | Consistência V1.1/Spec Kit, contratos e esquemas compartilhados | V1.1 e referências recebidas |
| Codex | Estrutura Python 3.13/FastAPI, handlers/serviços e testes de contrato; integrações somente em ambiente local/teste conforme plano | Contratos aprovados e responsabilidade dos dados definida |
| Claude | Templates Jinja2, Tailwind e JavaScript, adaptação fiel da homepage aprovada e Model Viewer com rotação vertical; testes de UI/acessibilidade | Referência visual/assets e contratos aprovados |
| Ambos, revisão cruzada | Compatibilidade, autenticação, integração do checkout WhatsApp e revisão com Trail of Bits | Entregas anteriores e critérios da V1.1 |

As fronteiras de diretórios e nomes das features serão confirmadas no plano, sem inventar agora uma estrutura de aplicação. Uma branch/worktree por agente. Um único responsável por mudança nos contratos; main como baseline, sem push ou merge automático. Não gerar duas constituições, duas APIs ou listas de tarefas concorrentes.

## Prontidão

Base Git preparada localmente; configurações compartilháveis e skills preservadas. Configurações específicas da máquina continuam no disco, fora do histórico. Sem remote, deploy ou bancos de produção.

**Não pronto para implementação paralela.** Faltam V1.1, referência da homepage/asset 3D e contratos revisados. A arquitetura e as restrições de identidade registradas em AGENTS.md são as decisões fornecidas pelo responsável, não substitutos desses artefatos.
