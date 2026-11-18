# 17 — Esquema físico, índices e consultas previstas

**Este documento acompanha os scripts de referência** `supabase/migrations/0001_schema.sql` e `mongo/001_products_schema_indexes.mongodb.js`. Nenhum script foi executado automaticamente; devem ser testados em ambiente isolado antes de qualquer execução.

## PostgreSQL / Supabase
- `admin_profiles.user_id`: índice primário e FK para `auth.users.id`. Consultas de perfil por `user_id` utilizam a PK, sem índice adicional.
- `store_settings.id`: PK para buscar o registro singleton `id=1`.
- Restrições SQL: `CHECK role='admin'`, `CHECK id=1`, formato de telefone internacional e RLS.
- Políticas: permitir, no máximo, leitura de perfil próprio por autenticado; nenhum `INSERT`, `UPDATE` ou `DELETE` público. Aprovação de administrador ocorre fora do cadastro público.
- `updated_at`: atualizado pela aplicação ou por trigger específica, sem confiar no navegador.

## MongoDB — matrizes consulta × índice
| Operação | Filtro esperado | Índice |
|---|---|---|
| Consulta de item por SKU | `sku` | `unique {sku:1}` |
| Detalhe de URL | `slug`, `active=true` | `unique {slug:1}` e filtro ativo |
| Catálogo por categoria | `active`, `category`, data | `{active:1,category:1,createdAt:-1}` |
| Catálogo por marca | `active`, `brand`, data | `{active:1,brand:1,createdAt:-1}` |
| Home destaques | `active`, `featured.enabled`, ordenação | `{active:1,featured.enabled:1,featured.order:1}` |
| Filtro de tamanho | `sizes: {$elemMatch:{sizeBR:n,stock:{$gt:0}}}` | Índice multikey `{active:1,sizes.sizeBR:1}`; conferir plano de consulta |
| Busca textual simples | termos em `name`, `brand`, `description` | Text index; documentar comportamento da busca |

Não presumir que índice composto cubra automaticamente filtros arbitrários combinados. Medir com `explain('executionStats')` no dataset de demonstração antes de declarar otimização. O índice de tamanho não substitui o `$elemMatch` que garante que numeração e estoque pertençam ao mesmo subdocumento.

## Validação de coleção
O script MongoDB usa `$jsonSchema` com `validationLevel: strict` e `validationAction: error` para evitar documentos malformados, incluindo `priceCents` e `stock` inteiros não negativos. O objeto `attributes` permanece flexível para ilustrar a escolha do NoSQL. A validação de banco **complementa**, e não substitui, Pydantic no FastAPI.

## Redis — operações e políticas
- Registro recente: transação/pipeline *conforme recursos da API Redis utilizada* para `LREM`, `LPUSH`, `LTRIM`, `EXPIRE`; testar sem corrida usando duas abas na demonstração.
- Recuperação: `LRANGE recent:visitor:{id} 0 4` → consulta de produtos ativos no MongoDB → projeção pública, mesma ordem.
- Cache: GET; no miss, MongoDB; em seguida SET com expiração de 300 segundos. Em edição/desativação: `DEL cache:product:{id}`. Lista pública da V1 não usa cache persistente para assegurar atualização imediata.
- Diagnóstico: exibir **somente valores e TTL fictícios** no documento; comandos reais de teste apenas contra ambiente controlado.

## Política de consistência
A aplicação considera os bancos como independentes. MongoDB é a autoridade de preço, estoque e status de produto; Supabase é a autoridade de login/perfil e contato; Redis é derivado, efêmero e descartável. Não há pedidos persistidos na V1, nem baixa de estoque por redirecionamento ao WhatsApp.
