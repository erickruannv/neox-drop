# 18 — Fluxos de dados, cenários de falha e integridade

## Fluxo A — login do administrador
1. Formulário envia credenciais ao FastAPI por HTTPS.
2. FastAPI chama Supabase Auth; nunca registra senha/token nos logs.
3. Confere que `admin_profiles.user_id` corresponde ao usuário autenticado e que `is_active=true` e `role='admin'`.
4. Cria sessão segura HttpOnly; rotas administrativas sempre revalidam autorização conforme a estratégia de sessão.
5. Caso o usuário esteja autenticado mas sem perfil ativo, retorna **403**. A autenticação não equivale à autorização.

## Fluxo B — cadastrar e atualizar catálogo
1. Admin envia dados de tênis pela interface protegida.
2. Backend valida os campos com Pydantic, autorização e coerência de numeração/preço/URLs.
3. MongoDB insere produto; índice único impede SKU/slug repetido.
4. Backend invalida o cache de detalhe pertinente se houver e confirma gravação.
5. Catálogo público faz nova consulta sem HTML estático e mostra o produto recém-criado.

**Falha parcial:** se MongoDB gravar e Redis não invalidar, registrar falha e considerar desabilitar/burlar cache até expirar o TTL, evitando exibir dado desatualizado; a listagem pública sem cache permanece correta. O projeto pode usar TTL curto e política de bypass seguro para alterações. Não declarar atomicidade cross-DB.

## Fluxo C — produtos vistos recentemente
1. O cliente abre um produto e o backend verifica o documento ativo no MongoDB.
2. O backend gera ou reutiliza cookie aleatório de visitante.
3. Redis remove duplicata, move ID para o início, limita a cinco entradas e renova TTL de sete dias.
4. A homepage busca os IDs e resolve dados **atuais** no MongoDB. Itens desativados são ignorados.

**Falha parcial:** a loja deve continuar acessível se Redis falhar; mostrar estado de recentes indisponível ou vazio, sem impedir o catálogo ou a compra.

## Fluxo D — finalizar pelo WhatsApp
1. Carrinho envia apenas `{productId, sizeBR, quantity}`, nunca preço de fonte confiável.
2. Backend busca cada produto no MongoDB, valida `active`, numeração existente, estoque e quantidade.
3. Backend calcula cada linha e o total usando centavos inteiros.
4. Backend consulta número de contato configurado no Supabase (`store_settings`), valida E.164 em dígitos.
5. Backend devolve URL `wa.me` com texto codificado e resumo do total.
6. Cliente abre WhatsApp e, se desejar, confirma manualmente a mensagem. Sem pagamento, baixa de estoque ou pedido confirmado.

**Falha parcial:** telefone não configurado bloqueia checkout com erro legível; item indisponível retorna erro para revisão do carrinho; falha no Redis não impede checkout.

## Semântica de status
| Evento | Gravação real | O que **não** deve ser afirmado |
|---|---|---|
| Login admin | Supabase Auth / sessão protegida | Que todo usuário autenticado é admin |
| Cadastro produto | Documento MongoDB | Que cache Redis é fonte do produto |
| Visualização de tênis | Chave Redis de recentes | Que visitante criou conta |
| Link WhatsApp aberto | Nenhum pedido confirmado | Que compra foi finalizada/paga |

## Modelo 3D do hero
`featured.enabled=true` é configuração no documento Mongo. A API devolve `model3dUrl`, cores, nome, preço e imagem. O navegador sincroniza a transição; `<model-viewer>` limita controles ao eixo vertical. O arquivo `.glb` é recurso de mídia licenciado, **não** um banco separado ou objeto BSON 3D.
