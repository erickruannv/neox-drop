# Preparação técnica — estado atualizado

A V1.1 foi importada e revisada. O bloqueio anterior por ausência de documentação foi resolvido.
Veja [relatório atual](VALIDACAO-V1.1.md), [contratos](contracts/README.md) e
[plano de colaboração](../specs/001-neox-drop-v11/plan.md).

Git já possui baseline em main. Spec Kit e ferramentas/configurações existentes foram preservados;
a única atualização deliberada dentro de `.specify/` é a constituição solicitada. Não reinstalar
plugins nem duplicar integrações. Os testes MCP da preparação anterior não equivalem a testes
funcionais do e-commerce. Esta etapa não reiniciou agentes nem reexecutou instalações.

Divisão: Codex backend/DB/contratos/routers; Claude templates/CSS/JS/3D. Um owner por arquivo;
trabalho em worktrees separados após autorização. Antes disso, compartilhar o mesmo baseline
com os contratos e configurar caminhos locais dos MCPs para o worktree correto.

Pendente: GLB licenciado e licença dos ativos publicáveis; contas/credenciais de teste; revisões
humanas e integrações reais. Nenhuma dessas evidências foi fabricada. A V1.1 é fonte de produto;
tasks.md da feature é a única lista operacional. Sem implementação, produção ou deploy nesta etapa.
