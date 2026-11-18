# Data model — índice canônico para implementação V1.1

Fonte física completa: capítulos [03](../../docs/reference/especificacao-v1.1/docs/03-modelagem-bancos.md),
[16](../../docs/reference/especificacao-v1.1/docs/16-dicionario-de-dados.md),
[17](../../docs/reference/especificacao-v1.1/docs/17-esquema-fisico-e-indices.md) e scripts intactos
em docs/reference/especificacao-v1.1/. O wire format normativo está em docs/contracts/openapi.json.

## AdminProfile

| Campo canônico | Regra |
|---|---|
| AdminProfile.user_id | UUID PK/FK auth.users.id, delete cascade; Auth 1 para perfil 0..1 |
| AdminProfile.display_name | texto não vazio |
| AdminProfile.role | apenas admin |
| AdminProfile.is_active | bool, default false; precisa true para autorizar |
| AdminProfile.created_at / AdminProfile.updated_at | timestamptz UTC gerado/atualizado pelo servidor |

Auth gerencia credenciais; nenhum hash de senha duplicado. API mapeia para userId/displayName/isActive.

## StoreSettings

| Campo canônico | Regra |
|---|---|
| StoreSettings.id | inteiro singleton 1, sem FK para admin |
| StoreSettings.store_name | texto não vazio, default NEOX drop |
| StoreSettings.whatsapp_e164_digits | vazio ou [1-9][0-9]{7,14}; vazio bloqueia link |
| StoreSettings.updated_at | timestamptz UTC, gerado pelo servidor |

RLS on nas duas tabelas; leitura do próprio perfil apenas por authenticated; sem escrita pública.
Permissões e policies reais serão testadas, não deduzidas só do SQL importado.

## MongoProduct

| Campo canônico | Regra |
|---|---|
| MongoProduct._id | BSON ObjectId, gerado; id API é string hexadecimal de 24 caracteres |
| MongoProduct.sku / MongoProduct.slug | string não vazia, índices únicos mesmo após desativação |
| MongoProduct.name / MongoProduct.brand / MongoProduct.category / MongoProduct.colorName | texto não vazio |
| MongoProduct.description | texto; não HTML confiável |
| MongoProduct.priceCents | int/long >=0, sem float monetário |
| MongoProduct.currency | BRL |
| MongoProduct.active | boolean, público exige true; soft-delete não remove documento |
| MongoProduct.mainImageUrl | caminho próprio /static/ ou HTTPS de origem permitida |
| MongoProduct.galleryUrls | array de >=1 caminhos/URLs; substituir array completo no PATCH |
| MongoProduct.model3dUrl | string opcional, omitida se ausente; PATCH null remove campo; GLB licenciado |
| MongoProduct.sizes | array >=1; sizeBR sem duplicatas; substituir completo no PATCH |
| MongoProduct.sizes[].sizeBR | int/long, 15..60 (validador físico) |
| MongoProduct.sizes[].stock | int/long >=0; não reservar/decrementar em checkout |
| MongoProduct.attributes | objeto opcional flexível, nunca interpolado como operador Mongo |
| MongoProduct.featured | subdocumento opcional, merge parcial permitido |
| MongoProduct.featured.enabled | boolean; home exige true junto de active |
| MongoProduct.featured.order | int/long >=1; ordenar asc, id desempata |
| MongoProduct.featured.backgroundHex / MongoProduct.featured.accentHex | #RRGGBB |
| MongoProduct.createdAt / MongoProduct.updatedAt | BSON date UTC; API ISO 8601; backend gera e avança updatedAt com comparação da versão anterior |

Uma cor por documento. Tamanhos/galeria/featured/attributes são embutidos, não tabelas externas.
Os contratos exigem featured completo ao criar, pois o hero não pode consumir estado parcialmente
definido; PATCH aceita campos individuais e valida o resultado. Sem quantidade bruta em projeção pública:
sizesAvailable deriva de stock>0. AdminProduct contém sizes/stock; ProductDetail só atributos públicos.

## RecentHistory e PublicProductCache

| Campo canônico | Regra |
|---|---|
| RecentHistory.opaqueId | cookie aleatório; não PII; não autentica admin |
| RecentHistory.productIds | LIST recent:visitor:{opaqueId}, 0..5 únicos, mais novo primeiro |
| RecentHistory.ttl | 604800 s renovado por visita válida |
| PublicProductCache.key | cache:product:{productId}, referência lógica sem FK |
| PublicProductCache.payload | envelope interno updatedAt + projeção pública de produto ativo; nunca senha/perfil admin |
| PublicProductCache.ttl | 300 s; DEL após mutação; validar/burlar stale em falha parcial |

Recentes: LREM/LPUSH/LTRIM/EXPIRE atomicamente ou equivalente testado. Resolver IDs novamente
no MongoDB. Ausência de Redis dá resposta degradada, não preço ou permissão inventados.

## CartItem e Checkout

| Campo canônico | Regra |
|---|---|
| CartItem.productId | ObjectId string válido, produto ativo no MongoDB |
| CartItem.sizeBR | inteiro 15..60 e numeração existente com estoque |
| CartItem.quantity | inteiro 1..10 após agrupar produto+tamanho; <= estoque |
| Checkout.items | 1..50 linhas; extras monetários ignorados |
| Checkout.lineTotalCents / Checkout.totalCents | soma em centavos da fonte MongoDB, sem cache |
| Checkout.waUrl | wa.me com destinatário autorizado do singleton e mensagem URL-encoded <=8000 chars |

CartItem local não contém preço autoritativo. Resumo exige nova confirmação da UI se divergir
valor apresentado. Não há transição Order=paid/confirmed nem reserva de estoque.
