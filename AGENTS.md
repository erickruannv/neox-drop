# NEOX drop — instruções compartilhadas

## Fonte de verdade e estado

A fonte de verdade do produto é a documentação oficial **NEOX drop V1.1**.
Ela ainda não foi disponibilizada nesta pasta. Este arquivo registra somente as decisões expressas pelo responsável; não substitui nem reconstrói a V1.1.
Antes de implementar, receber a documentação, conferir diagramas/modelos/requisitos e resolver divergências com o responsável. Não inferir regras de negócio a partir de templates ou skills.

## Arquitetura confirmada

- Python 3.13 e FastAPI.
- Jinja2, Tailwind CSS e JavaScript para a interface.
- Model Viewer para o tênis 3D.
- Supabase Auth/PostgreSQL, MongoDB Atlas e Redis.
- Checkout pelo WhatsApp.

A responsabilidade de cada armazenamento, contratos, fluxo de autenticação, integrações e regras comerciais devem vir da V1.1. Não substituir a interface por uma SPA ou escolher serviços adicionais por preferência de uma skill.

## Identidade e experiência aprovadas

- Preservar a homepage aprovada; não redesenhá-la ou recriá-la por aproximação. Receber sua referência e os assets aprovados antes de alterá-la.
- O tênis 3D pode girar **somente em torno do eixo vertical**. Não permitir rotação livre, inclinação ou rolagem. Ângulos, zoom, câmera e interações ainda precisam ser conferidos na documentação/referência; não inventar valores.
- Não substituir identidade, tipografia, paleta, textos ou composição aprovados com sugestões genéricas das ferramentas.

## Spec Kit e colaboração

Preservar `.specify/`, `.agents/skills/` e `.claude/skills/`. A constituição atual é um template com placeholders, não uma constituição ratificada. As integrações Claude e Codex já estão registradas; não repetir `specify init` nem atualizar ferramentas sem necessidade.

Depois de receber a V1.1: verificar a constituição; produzir especificação e plano rastreáveis; definir e revisar os contratos em `docs/contracts/`; só então gerar tarefas e dividir a implementação. Evitar duas listas divergentes: o tasks.md da feature será a fonte de tarefas do fluxo Spec Kit; Taskmaster, se usado, será uma visão operacional explicitamente reconciliada.

Contratos, esquemas compartilhados e decisões de arquitetura têm um único responsável por mudança. Cada agente trabalha em branch e worktree próprios após o baseline inicial. Não compartilhar um diretório de trabalho simultaneamente. Não editar o arquivo de contrato em paralelo nem criar mocks incompatíveis com ele.

## Limites atuais

Não implementar funcionalidades do e-commerce, configurar bancos de produção ou realizar deploy nesta preparação. Não acessar dados de produção. Não habilitar hooks amplos, serviços pagos ou chamadas a APIs pagas. Não criar endpoints, tabelas, collections ou fluxos de compra sem a especificação disponível.

Configurações locais de Claude/Codex e segredos ficam no disco e fora do Git. Não copiar arquivos de usuário, backups ou tokens para o repositório. Ferramentas são auxiliares e não autorizam mudanças fora da tarefa.

Veja `docs/PREPARACAO.md` e `docs/contracts/README.md`.
