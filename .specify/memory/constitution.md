# NEOX drop Constitution

## Core Principles

### I. Fonte de verdade e escopo verificável
A documentação NEOX drop V1.1 em `docs/reference/` é a fonte dos requisitos de produto.
Os originais DEVEM ser preservados; complementos técnicos DEVEM ser rastreados em
`docs/VALIDACAO-V1.1.md` e nos contratos, sem reescrever silenciosamente a referência.
P0 (login/admin, MongoDB, Redis, carrinho, WhatsApp e evidências) precede refinamentos P1.
Não introduzir pagamentos, reserva de estoque, conta de comprador, upload arbitrário ou SPA.

### II. Persistência poliglota com responsabilidades exclusivas
Supabase Auth é a autoridade de identidade; PostgreSQL guarda `admin_profiles` e
`store_settings`. MongoDB `products` é a autoridade de catálogo, preço, estoque e destaques.
Redis guarda recentes (5 IDs únicos; TTL 604800 s) e cache público (TTL 300 s), nunca preço
confiável de checkout. Não há FK ou transação distribuída entre bancos. O checkout DEVE
reconsultar MongoDB, calcular centavos inteiros e apenas gerar solicitação `wa.me`;
não reserva/decrementa estoque, confirma pagamento ou persiste pedido.

### III. Segurança e falhas parciais explícitas
Toda rota administrativa DEVE validar Supabase e perfil `role=admin` ativo; autenticação
não concede privilégios. RLS e menor privilégio são obrigatórios; secret/service role
permanece no backend, nunca substitui autorização. Cookies HttpOnly, SameSite, Secure em
HTTPS, CSRF, Origin e rate limit DEVEM ser testados. Segredos e dados pessoais não entram
em Git, HTML, respostas ou logs. MongoDB indisponível bloqueia operações dependentes;
Redis indisponível degrada recentes/cache, sem liberar checkout inválido. Cache antigo
não pode expor produto desativado nem governar preço do pedido.

### IV. Contratos e evidências antes da integração
`docs/contracts/openapi.json` é o único contrato HTTP operacional; `ui.md` define o limite
Jinja2/JS e `specs/001-neox-drop-v11/tasks.md` é a lista operacional única. Modificar contrato
exige revisão dos dois consumidores antes do merge. APIs e mocks DEVEM respeitar esquemas,
exemplos e erros. A DoD exige testes pertinentes da V1.1, revisão e documentação sincronizada.
Mocks viabilizam trabalho paralelo, mas NÃO comprovam os três bancos; a entrega exige
integrações reais em ambiente controlado e vídeo de 5–10 minutos. Nunca declarar teste,
auditoria, serviço ou deploy concluído sem evidência.

### V. Identidade aprovada e 3D em um eixo
Preservar `visual/01-identidade-principal-preferida.png` e `04-homepage-aprovada.png` sob
`docs/reference/`: NEOX largo/inclinado dominante, drop coral subordinado, três diagonais,
header preto, hero editorial e coleções Street/Classics/Performance. Não substituir a marca
pelos moodboards secundários. Cores do capítulo 05 são tokens provisórios sujeitos a contraste.
Modelo real GLB licenciado: azimute livre 360°, phi fixo, giro somente em torno de Y, sem tilt,
zoom ou pan. Respeitar reduced-motion; troca de destaque sincroniza modelo/imagem, texto,
preço, cores e marcador. Sem GLB/WebGL, usar foto estática sem falso giro. Não reproduzir
promessas de frete, parcelamento, avaliações ou marcas de terceiros sem base/licença.

## Restrições técnicas e operacionais

Python 3.13 + FastAPI + Jinja2 + Tailwind compilado + JavaScript simples + Model Viewer.
Sem backend Node paralelo. Dependências serão fixadas com lockfiles na fase de implementação;
a constituição não presume compatibilidade de pacotes ainda não instalados.
Não executar scripts SQL/Mongo importados, provisionar bancos, criar contas, incorrer em
custos, acessar produção, habilitar hooks amplos ou publicar sem autorização específica.
Configurações e ferramentas existentes DEVEM ser preservadas. Nesta etapa só documentação,
contratos e planejamento; nenhuma funcionalidade foi autorizada para implementação.

## Fluxo de desenvolvimento e qualidade

Claude trabalha em `feature/frontend`; Codex em `feature/backend`, com worktrees separados
criados a partir do mesmo baseline documental. Ambos devem informar `SPECIFY_FEATURE_DIRECTORY`
para esta feature; nomes das branches não definem outra especificação.
Codex detém Python/DB/schemas/roteamento e testes backend; Claude detém templates/CSS/JS/3D
e testes UI. Arquivos compartilhados, lockfiles e fixtures têm um único proprietário listado
no plano. Integração e merge são revisados, um de cada vez; não usar force-push.
Falhas de contrato, autorização ou fonte de dados bloqueiam integração; falta do GLB bloqueia
somente a comprovação do diferencial 3D, mantendo fallback e trabalho P0.

## Governance

Versão 1.0.0 é a primeira consolidação técnica derivada da V1.1 e da preparação solicitada
em 2026-11-18; não representa assinatura humana de complementos ainda em revisão.
Toda mudança deve identificar requisito/ADR afetado, impacto em dados, contrato, diagramas,
testes e consumidores. Alterações de negócio, identidade, segurança, custo e produção
exigem decisão do responsável. Divergências com a V1.1 devem ser registradas e resolvidas,
nunca encobertas por precedência de uma skill. MAJOR altera princípio incompatível; MINOR
amplia princípio/seção; PATCH esclarece sem mudar obrigação. Templates do Spec Kit não
são reescritos por esta constituição. Revisar conformidade em cada plano e merge.

**Version**: 1.0.0 | **Ratified**: 2026-11-18 | **Last Amended**: 2026-11-18
