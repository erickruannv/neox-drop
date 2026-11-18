# 04 — Contratos de API V1

Prefixo JSON: `/api`. Campos de preço em centavos; datas ISO 8601 UTC quando aplicáveis. Erro padrão: `{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [] } }`. Para operações admin, acesso exige token/sessão Supabase **e** perfil admin ativo.

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/health` | público | status geral sem segredos |
| GET | `/api/products` | público | listagem paginada/filtrada |
| GET | `/api/products/{slug}` | público | detalhes ativos |
| GET | `/api/featured` | público | destaques na ordem |
| GET | `/api/recent` | público | últimos produtos vistos |
| POST | `/api/recent` | público | registrar visita do produto |
| POST | `/api/checkout` | público | validar carrinho e gerar URL do WhatsApp |
| POST | `/api/admin/auth/login` | público | login Supabase; apenas admin ativo pode estabelecer sessão admin |
| POST | `/api/admin/auth/logout` | admin | encerrar sessão e limpar cookies |
| GET | `/api/admin/me` | admin | dados mínimos do perfil |
| GET | `/api/admin/products` | admin | listagem completa incluindo inativos |
| POST | `/api/admin/products` | admin | novo tênis |
| PATCH | `/api/admin/products/{id}` | admin | atualizar tênis e invalidar cache |
| DELETE | `/api/admin/products/{id}` | admin | soft-delete (`active=false`) |

## GET `/api/products`
Filtros opcionais `q`, `brand`, `category`, `sizeBR`, `sort=recent|price_asc|price_desc`, `page` (>=1), `limit` (1..24, padrão 12). Exemplo de resposta:
```json
{
  "items": [{"id":"hex24", "sku":"NEOX-NX001-PT", "slug":"runner-preto-lima", "name":"Runner Preto/Lima", "brand":"Marca Demonstrativa", "category":"Performance", "priceCents":89990, "mainImageUrl":"/static/images/runner.webp", "sizesAvailable":[39,40], "active":true}],
  "page":1,"limit":12,"total":1
}
```
Nunca expor estoque por trás de perfis/segredos; `sizesAvailable` é dado de catálogo. `GET /api/products/{slug}` retorna também descrição, galeria, `model3dUrl` e `featured` **somente atributos públicos**.

## GET `/api/featured`
```json
{"items":[{"id":"hex24","name":"Runner Preto/Lima","priceCents":89990,"mainImageUrl":"/static/images/runner.webp","model3dUrl":"/static/models/runner.glb","featured":{"order":1,"backgroundHex":"#191919","accentHex":"#BDF400"}}]}
```
Ordenar por `featured.order`; somente `active=true` e `featured.enabled=true`. Campos dinâmicos devem vir do MongoDB.

## POST `/api/recent`
Entrada: `{"productId":"hex24"}`; validar ID e existência do produto; atualizar a lista do visitante. Resposta `204 No Content`. Cookie anônimo gerado quando necessário pelo servidor. `GET /api/recent` retorna `{ "items": [...] }`, no máximo 5.

## POST `/api/checkout`
Entrada:
```json
{"items":[{"productId":"hex24","sizeBR":40,"quantity":2},{"productId":"outro-hex24","sizeBR":39,"quantity":1}]}
```
O servidor confere IDs, produtos ativos, numeração, estoque e preço do MongoDB. Exemplo de resposta:
```json
{
  "items":[{"productId":"hex24","name":"Runner Preto/Lima","sizeBR":40,"quantity":2,"unitPriceCents":89990,"lineTotalCents":179980}],
  "totalCents":179980,
  "currency":"BRL",
  "waUrl":"https://wa.me/5511999999999?text=..."
}
```
O número acima é **exclusivamente ilustrativo**; não deve ser copiado para produção. Usar configuração real de contato validada da loja, ou retornar erro `STORE_WHATSAPP_NOT_CONFIGURED`.

Mensagem montada com `urllib.parse.urlencode` ou `quote`, incluindo saudação, cada linha `quantidadex produto — tamanho BR XX — R$ ...`, total e aviso de solicitação. O navegador abre o link; **não confirma nem envia** a compra automaticamente. Quantidade máxima por item 10; limite total de itens configurável para mitigar abuso.

## Admin
`POST /api/admin/auth/login`: `{"email":"admin@exemplo.invalid","password":"senha-do-usuario"}`; retorno de dados mínimos e cookies HttpOnly. Não incluir token no JSON nem em logs. Login negado para usuário sem perfil admin ativo. `POST /api/admin/products`: recebe campos de produto do modelo; backend ignora `id`, datas e `priceCents` manipulados indevidamente? **Aceita preço apenas após validar permissão admin**. Atualizações parciais somente campos autorizados. `DELETE` retorna 204.

## Erros e HTTP
- `400` formato inválido; `401` sem autenticação; `403` autenticado mas não autorizado.
- `404` produto inexistente/inativo em rota pública.
- `409` SKU/slug duplicado ou conflito de alteração.
- `422` validação de campos/tamanho/quantidade.
- `503` banco primário indisponível ou config de WhatsApp ausente quando necessário; Redis indisponível não quebra catálogo.
- `429` limite de requisições excedido.

## Contrato frontend ↔ backend
Claude deve consumir **apenas** estes nomes/tipos documentados; Codex implementa contra os mesmos formatos. Alterações de contrato exigem atualização deste arquivo e revisão conjunta antes do merge.
