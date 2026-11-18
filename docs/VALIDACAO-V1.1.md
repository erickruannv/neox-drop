# Validação NEOX drop V1.1 e prontidão para desenvolvimento paralelo

**Data:** 2026-11-18. **Escopo:** revisão, constituição, contratos e tarefas; nenhuma implementação.

## Parecer

**Pronto documentalmente para desenvolvimento paralelo controlado, após autorização para começar.**
A ausência da V1.1 foi resolvida. Os agentes têm fontes, contrato único, ownership e dependências.
Não confundir esta prontidão com aplicação funcional, bancos testados ou entrega P1/3D concluída.
O responsável ainda deve autorizar a execução; esta solicitação não autorizou funcionalidades.

Primeira onda autorizável: Codex T001 (fundação Python) e Claude T002 (build CSS/JS), depois
fundação T003–T007 e primeira fatia login → cadastro real → catálogo. A integração real exige
contas/segredos de teste; RF-13 exige GLB licenciado. Esses itens não bloqueiam build/layout/mocks.

## Material revisado e integridade

- 75/75 arquivos conferidos contra `reference/SHA256.json`, sem divergência; o manifesto é o 76º arquivo.
- 23 seções consolidadas equivalentes aos documentos separados; nenhum link Markdown local quebrado
  nos documentos organizados. Links da versão consolidada mantêm o contexto dos arquivos originais:
  usar o índice de reference/ para navegar, não reinterpretar caminhos como código ativo.
- 20 capítulos (00–19), instruções históricas, .env.example, scripts SQL/Mongo e contrato Redis lidos.
- 9 diagramas: fontes Mermaid e DOT, SVG e PNG presentes; 9 SVGs XML válidos; 9 PNGs revisados.
  Sem compilador Graphviz/Mermaid instalado: não foi alegada recompilação desses formatos.
- PDF com 10 páginas: texto lido em todas, todas renderizadas; páginas 4–6 do modelo de dados
  inspecionadas visualmente, além dos nove desenhos PNG originais.
- As seis referências visuais foram inspecionadas. Imagens 01/04 são a aprovação principal;
  02/03 são secundárias, 05/06 inspiração. Originais e hashes foram preservados.

## Modelagem de dados

| Área | Coerência encontrada | Gate de implementação |
|---|---|---|
| Supabase | auth.users 1 → 0..1 admin_profiles, PK/FK user_id; role admin/is_active false por padrão; store_settings singleton sem FK para admin | Testar RLS/GRANTs e usuário sem admin em ambiente controlado |
| MongoDB | products, uma cor por documento; sizes/galeria/featured/attributes embutidos; ObjectId/datas BSON; centavos; índices únicos e consulta de tamanho com elemMatch | Validador não impede sozinho tamanhos repetidos nem todas as regras de URL; API complementa |
| Redis | LIST 5 IDs únicos/TTL 604800s e cache público 300s; sem FK ou transação cross-DB | Provar atomicidade de recentes, cache invalidado e falha multiworker |
| Checkout | MongoDB revalida preço/estoque; contato vem do PostgreSQL; Redis não é autoridade | Não reservar/baixar estoque/persistir pedido nem marcar pagamento |

O DER visual explicita FK user_id e cardinalidade. Não interpretar posição gráfica da seta
como FK para role. As linhas tracejadas conceituais não criam FKs entre bancos.
O SQL de referência faz CREATE IF NOT EXISTS, não uma migração geral de schemas antigos;
o script Mongo exige coleção nova. Não foram executados nem copiados como migrations prontas.
`updated_at` relacional não tem trigger no SQL importado: a aplicação/etapa futura deve atualizá-lo.
RLS habilitado no papel não comprova execução correta; essa prova permanece em T008/T028/T029.

## Identidade, homepage e ativos

A composição aprovada é preservada: NEOX inclinado dominante com drop coral menor/três diagonais,
header preto, hero escuro com produto grande/lettering, miniaturas e indicadores lima, cards
Street/Classics/Performance e lançamentos. Não produzir novo design a partir dos moodboards.

O mockup inclui “frete grátis”, “10x”, trocas e outras frases demonstrativas. Conforme capítulo 05,
substituir somente os claims não comprovados por informação verificável; isso não autoriza
redesenhar a homepage. Produtos/preços/marcas no mockup não são seed ou ativos licenciados.
Tokens hex do capítulo 05 são provisórios; contraste WCAG, fonte licenciada e responsividade
serão testados, não aprovados automaticamente por existir imagem estática.

Nenhum GLB/GLTF está no pacote. Não fabricar giro de foto nem declarar RF-13 entregue.
Model Viewer: theta livre 360°, phi fixo, sem tilt/zoom/pan; arraste horizontal, reduced-motion,
fallback estático e troca sincronizada de nome/preço/texto/imagem/modelo/cores/marcador.
Phi/distância precisam ser calibrados com o GLB real. Licenças dos ativos publicáveis permanecem
pendentes e serão registradas em tarefa própria; esta revisão não baixou/substituiu assets.

## Formalizações técnicas explícitas

A origem `reference/especificacao-v1.1/docs/04-contratos-api.md` continua intacta. O OpenAPI
operacional detalha seus mesmos 14 métodos/rotas. As escolhas abaixo não são afirmações de que
já constavam integralmente na V1.1; são complementos técnicos rastreados para revisão dos agentes.

| ID | Lacuna / decisão do baseline | Fonte e efeito |
|---|---|---|
| D01 | Python 3.13, não o mínimo genérico 3.12+ do roteiro | decisão expressa do responsável; versões de pacotes/lockfiles ficam em T001/T002 |
| D02 | OpenAPI 3.1.1; 201+AdminProduct no create, 200 no PATCH/login/me, 204 logout/delete/recent | preserva rotas e id da sequência; completa respostas mínimas sem tokens |
| D03 | neox_admin_session/refresh HttpOnly, neox_visitor opaco e X-CSRF-Token para escritas, inclusive login; token CSRF pelo HTML | concretiza capítulo 06, sem novo endpoint de autenticação; Origin estrangeiro rejeitado |
| D04 | API pública usa sizesAvailable para sinalizar disponibilidade; contagem stock só admin | concilia payload público do capítulo 04 e disponibilidade visível do 05; confirmar revisão conjunta antes de mudar essa exposição |
| D05 | FeaturedList entrega ProductDetail, com descrição/slug/imagem/cores/modelo juntos | completa campos necessários à sincronização RF-12 sem segunda API |
| D06 | GET detalhe não registra visita; POST recent uma vez. Redis fora: GET items vazio, POST 204 best-effort | remove side effect duplicado sugerido por descrições de fluxo; preserva degradação RNF-03 |
| D07 | POST produto com campos explícitos; PATCH featured merge/arrays replace; null remove model3dUrl; id/datas não graváveis | resolve texto ambíguo sobre preço admin: autorizado pode editar preço validado; cliente de checkout não |
| D08 | Carrinho agrupa produto+tamanho antes de validar máximo 10/estoque; extras monetários ignorados | RN-02/04; testes de soma/forja ficam obrigatórios; não criar tolerância oculta |
| D09 | Backend retorna resumo atual; UI compara e exige novo clique se preço mudou | contrato de entrada não leva preço anterior; não inventar erro PRICE_CHANGED calculável no servidor |
| D10 | Contato autoritativo no singleton; env somente configuração controlada. Sem endpoint settings novo | capítulo 18 prevalece no fluxo; se for desejada tela de contato, ampliar contrato em revisão específica |
| D11 | q<=100, brand/category<=120, máximo 50 linhas/8000 caracteres na mensagem; erros seguros estáveis; health mínimo | limites operacionais explícitos de abuso, ajustáveis em alteração versionada; sem telefone fictício ou link enviável nos exemplos |
| D12 | Cache-hit confere active/updatedAt no MongoDB; envelope interno versionado; mutação avança versão e compara anterior | resolve falha DEL em múltiplos workers, sem flag local como garantia global; leitura leve extra é trade-off a medir |

Essas decisões são revisáveis antes da integração conjunta; mudanças de negócio/identidade
requerem o responsável. Não há endpoint de favoritos, upload, gateway de pagamento, cadastro de
comprador ou tela de configuração de loja adicionados por inferência de elementos do mockup.

## Artefatos preparados

- Constituição 1.0.0 em `.specify/memory/constitution.md`: cinco princípios, restrições e governança;
  primeira adoção técnica, não atualização da versão 1.1 do produto. O Sync Impact Report inicial
  foi registrado e removido do conteúdo antes do commit, como orienta a skill; resumo está neste relatório.
- `docs/contracts/openapi.json`: contrato 1.1.0, 14 operações/11 caminhos, 22 schemas.
- `docs/contracts/examples.json` e `ui.md`: fixtures fictícias e limite páginas/JS/HTTP.
- `specs/001-neox-drop-v11/`: spec, plan, research, data-model, contracts/README, quickstart e tasks.
- `AGENTS.md`, `CLAUDE.md`, README e preparação atualizados, sem copiar os arquivos históricos por cima.
- `docs/validacao-v1.1.json`: resultados legíveis por máquina desta revisão.

Templates/integrações/opções do Spec Kit, MCPs, configurações locais, skills e ferramentas
permaneceram intactos. Os scripts locais setup-plan/setup-tasks foram usados com feature explícita
e persistência desligada; nenhum hook de extensão existe em .specify/extensions.yml nesta pasta.
Não foi executado specify init, upgrade, implementação, criação de bancos ou deploy.

## Validações executadas

- Validador oficial de estrutura OpenAPI: 14 operações aprovadas; refs locais resolvidas.
- JSON Schema: 22 schemas bem formados, 15 exemplos válidos e 11 negativos rejeitados.
- PATCH featured parcial permitido; checkout com preço extra aceita wire format para ser ignorado
  na futura aplicação. Isso NÃO prova a lógica de autorização/cálculo, que ainda não existe.
- 32 tarefas em formato checklist; IDs únicos; dependências sem ciclos; citações de campos
  encontram a definição canônica em data-model.md. Nenhuma marcada concluída.
- 18 tarefas Codex, 13 Claude, 1 humana. Fonte única tasks.md; índice de verificação guardado
  fora do repositório, sem segunda lista operacional.
- Comparação antes/depois: seis documentos antigos alterados intencionalmente, 471 outros
  arquivos da pasta preservados por hash, incluindo configuração e referência importada.
- Conferir também a saída de check-prerequisites e a revisão de whitespace dos artefatos ativos.

## Handoff e limites

Branches planejadas feature/backend e feature/frontend, worktrees separados do mesmo commit
com esta documentação. Não foram iniciados agentes de implementação nem criados worktrees de
código nesta preparação. Antes de usá-los, configurar os MCPs/caminhos locais para cada worktree:
configuração ignorada não se replica automaticamente e Serena não deve apontar para o checkout do outro.

Codex detém Python/DB/schemas/routers/loaders e contratos; Claude detém templates/CSS/JS/3D,
package.json/lockfile Node e testes UI. Integração humana e revisão cruzada antes do merge.
Para a primeira fatia, T015 depende T011 e T014 depende também T016, evitando escrita simultânea
em catalog.py e ligação de páginas antes de seus templates. Dados compartilhados usam fixtures
canônicas. Taskmaster não recebeu backlog duplicado.

Pendências para comprovação funcional: autorizar implementação; fornecer contas/segredos apenas
no ambiente de teste; obter GLB/poster/fontes/imagens com licença; parametrizar e testar limites
de runtime; verificar comportamento real de Supabase/MongoDB/Redis e UI. Nenhuma dependência de
aplicação foi instalada nesta etapa. As ferramentas isoladas de revisão não mudam o ambiente do produto.

## Fontes externas primárias conferidas

- [Supabase get_user](https://supabase.com/docs/reference/python/auth-getuser): checagem de identidade.
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security): proteção por linha;
  credencial privilegiada não transforma um usuário em admin.
- [Model Viewer](https://modelviewer.dev/docs/): API de câmera a conferir novamente ao implementar.
- [OpenAPI 3.1.1](https://spec.openapis.org/oas/v3.1.1.html): formato da especificação HTTP.

A referência V1.1, seus hashes e as decisões do responsável continuam a fonte do produto.
