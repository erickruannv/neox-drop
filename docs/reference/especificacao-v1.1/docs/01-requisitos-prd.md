# 01 — PRD, requisitos funcionais e critérios de aceitação

## Problema
Demonstrar uma loja de sneakers que **usa três tipos de persistência** para tarefas distintas, com navegação comercial convincente, administração segura e compra simplificada via WhatsApp.

## Perfis
- **Visitante público:** vê produtos, filtra, consulta tamanhos, usa recentes, adiciona/remover carrinho e abre link do pedido.
- **Administrador autorizado:** autentica por Supabase, gerencia produtos MongoDB e configura destaques/contato da loja.

## Requisitos funcionais (RF)
| ID | Requisito | Pri. | Aceitação observável |
|---|---|---|---|
| RF-01 | Login/logout de admin via Supabase Auth | P0 | Conta válida entra; inválida não; logout encerra sessão |
| RF-02 | Verificação de perfil `admin` ativo | P0 | Usuário autenticado sem perfil ativo recebe 403 |
| RF-03 | Criar produto no MongoDB | P0 | Novo produto persiste e recebe ID/slug únicos |
| RF-04 | Editar/desativar produto | P0 | Alterações persistem; desativado some do catálogo público |
| RF-05 | Catálogo público MongoDB | P0 | Novos produtos aparecem após criação sem exigir redeploy |
| RF-06 | Página de produto com numeração/preço | P0 | Mostra tamanho, disponibilidade e informações coerentes |
| RF-07 | Carrinho adicionar/remover/quantidades | P0 | Total e quantidade mudam corretamente |
| RF-08 | Checkout via WhatsApp | P0 | Link abre destinatário configurado com itens, tamanhos, quantidade e total formatados |
| RF-09 | Histórico de vistos recentemente no Redis | P0 | Últimos cinco visitados são recuperados na ordem correta, com TTL |
| RF-10 | Cache Redis de detalhes de produtos | P0 | Cache-hit e invalidação após edição demonstráveis |
| RF-11 | Home com marca NEOX drop | P1 | Visual alinhado à identidade aprovada |
| RF-12 | Carrossel de destaques sincronizado | P1 | Troca de produto altera foto/modelo, nome, preço e fundo |
| RF-13 | Visualizador 3D eixo vertical | P1 | Modelo real `.glb`, rotação 360° horizontal, sem inclinação de cima/baixo |
| RF-14 | Busca/filtros por marca/categoria/tamanho | P1 | Filtros refletem documentos do MongoDB |
| RF-15 | Responsividade + acessibilidade | P1 | Teclado, mobile, foco visível e redução de animações |
| RF-16 | Administração dos destaques e da cor | P1 | Mudança no MongoDB repercute no hero sem editar código |

## Regras de negócio (RN)
- RN-01: preço persistido em **centavos inteiros** (`priceCents >= 0`), convertido para moeda BRL só na apresentação.
- RN-02: um item de carrinho é identificado por **produto + tamanho BR**; quantidades inteiras de 1 até limite configurado, com máximo de 10 unidades por linha na V1.
- RN-03: produto `active=false` ou numeração sem estoque não pode ser usado para gerar pedido válido.
- RN-04: cliente envia IDs, tamanho e quantidades; **backend busca preços/estoque atualizados no MongoDB**; não aceita `priceCents` do cliente.
- RN-05: botão **Finalizar pelo WhatsApp** cria mensagem e link; sem confirmação de pagamento, envio ou reserva de estoque.
- RN-06: criar/editar produto invalida cache Redis por ID e, conforme estratégia, cache de listagem; lista pública deve atualizar na próxima consulta.
- RN-07: histórico recente limita a 5 IDs, remove duplicações e expira após 7 dias; produtos removidos são ignorados ao renderizar.
- RN-08: modelos 3D são opcionais por produto; se indisponíveis, hero usa imagem 2D. Não simular giro 3D com foto única.
- RN-09: conta de admin criada por processo controlado; não existe cadastro administrativo público.
- RN-10: a aplicação roda com registros de produtos fictícios e não publica dados pessoais de clientes.

## Requisitos não funcionais (RNF)
- RNF-01: **segurança:** HTTPS em hospedagem, sessões HttpOnly/Secure, CSRF, rate limit e validações no backend.
- RNF-02: **performance:** imagens otimizadas; lazy-load dos modelos 3D; carregamento inicial não deve depender de assets 3D pesados.
- RNF-03: **disponibilidade:** queda de Redis não derruba catálogo/checkout; o recurso de recentes pode se degradar.
- RNF-04: **observabilidade:** logs estruturados de falhas sem tokens, senhas ou dados sensíveis.
- RNF-05: **qualidade:** testes de rota/API, integração real dos 3 bancos em ambiente controlado e checklist manual do vídeo.
- RNF-06: **manutenibilidade:** código tipado, serviços desacoplados por camada, documentação reproduzível.
- RNF-07: **acessibilidade:** textos em português claro, labels, contraste adequado e opção `prefers-reduced-motion`.

## Fora de escopo
Pagamento por cartão/Pix, logística/frete real, cupons sofisticados, cadastro de usuários compradores, emissão fiscal, estoque transacional/reserva, chat com IA, integração oficial WhatsApp Cloud API, painel de indicadores financeiro, uploads arbitrários sem pipeline seguro.

## Definition of Done geral
Uma feature só é concluída após: requisitos respeitados, code review, testes automatizados pertinentes, evidência manual quando aplicável, sem segredos no commit e documentação atualizada. Veja [07 — testes](07-testes-qualidade.md).
