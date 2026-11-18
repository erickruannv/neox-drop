# Contratos compartilhados — definição pendente

**Bloqueio:** receber e conferir a documentação oficial NEOX drop V1.1 antes de definir endpoints e esquemas. Este arquivo é uma pauta de definição, não um contrato aprovado nem uma reprodução da documentação ausente.

## Entregável antes de dividir a implementação

Um documento OpenAPI versionado nesta pasta, acompanhado dos esquemas e exemplos necessários, será o contrato comum da API HTTP. Os caminhos, verbos, campos e regras só serão definidos após rastrear cada operação até os requisitos da V1.1. Contratos de páginas Jinja2, dados enviados ao JavaScript e integrações externas também precisam ser explicitados onde se aplicarem; não presumir que toda interação usa JSON.

Conferir, por operação:

- Identificador do requisito e finalidade; entrada, saída, tipos, campos obrigatórios, validação e exemplos.
- Autenticação/autorização e transporte da sessão; responsabilidades entre navegador, FastAPI e Supabase Auth.
- Respostas de erro e códigos HTTP; paginação e filtros onde exigidos.
- Identificadores, valores monetários, datas, disponibilidade e consistência, conforme o modelo oficial.
- Responsabilidade de PostgreSQL, MongoDB e Redis, sem duplicar a fonte autoritativa dos mesmos dados por conveniência.
- Fluxo de checkout pelo WhatsApp: dados, validação e estados exatamente previstos na V1.1, sem supor gateway de pagamento ou confirmação automática de compra.
- Projeções consumidas pelos templates e pelo Model Viewer; manter homepage aprovada e rotação do tênis somente em torno do eixo vertical.

## Critério de liberação

Tech Lead consolida um único contrato com rastreabilidade e pontos ambíguos resolvidos com o responsável. Claude e Codex revisam o mesmo artefato antes de consumir mocks, escrever handlers ou templates. Exemplos/mocks devem aderir ao contrato; casos negativos e compatibilidade entram na validação da implementação. Mudança de contrato exige revisão de ambos os consumidores antes de integrar.

Não foi criado OpenAPI vazio, endpoint hipotético ou esquema comercial nesta preparação. Nenhuma implementação paralela deve começar com base nesta pauta.
