# 16 — Dicionário de dados e regras de persistência

## 1. PostgreSQL/Supabase

**Schema gerenciado `auth`:** `auth.users` é uma tabela do Supabase Auth; não duplicar senhas ou hashes em tabelas da aplicação. Apenas a chave `id` é referenciada por FK.

### `public.admin_profiles` — perfil de administrador
| Campo | Tipo SQL | Obrigatório | Chave / Regra | Finalidade |
|---|---|---|---|---|
| `user_id` | `uuid` | Sim | **PK**, **FK** → `auth.users(id)` `ON DELETE CASCADE` | Identidade vinculada |
| `display_name` | `text` | Sim | Não vazio (validado na API) | Nome do admin |
| `role` | `text` | Sim | `CHECK role = 'admin'` | Papel autorizado |
| `is_active` | `boolean` | Sim | `DEFAULT false` | Bloqueia acesso até ativação explícita |
| `created_at` | `timestamptz` | Sim | `DEFAULT now()` | Auditoria básica |
| `updated_at` | `timestamptz` | Sim | `DEFAULT now()`; atualizar na API/trigger | Auditoria básica |

**Cardinalidade:** `auth.users` (1) ↔ `admin_profiles` (0..1). Nem todo usuário autenticado é um administrador.

### `public.store_settings` — configuração da loja única
| Campo | Tipo SQL | Obrigatório | Chave / Regra | Finalidade |
|---|---|---|---|---|
| `id` | `integer` | Sim | **PK**; `CHECK id = 1` | Singleton da loja |
| `store_name` | `text` | Sim | Padrão `NEOX drop` | Nome exibido |
| `whatsapp_e164_digits` | `text` | Sim | `''` ou 8–15 dígitos sem `+` | Destinatário do checkout |
| `updated_at` | `timestamptz` | Sim | `DEFAULT now()` | Atualização |

A tabela de configurações não possui FK para `admin_profiles`; quem pode alterá-la é decidido pela autorização da API. O valor de telefone vazio indica **não configurado**, e deve impedir a emissão de um link de checkout válido.

### Regras de acesso
- `admin_profiles`: RLS ativo; nenhuma política pública de escrita; leitura do próprio perfil pode ser permitida para usuários autenticados.
- `store_settings`: RLS ativo; sem acesso direto para visitantes; FastAPI usa credencial backend protegida somente após as verificações pertinentes.
- Uma conta autenticada sem perfil ativo **não** pode criar nem alterar produtos.

## 2. MongoDB Atlas

**Banco:** `neox_drop` — **coleção:** `products`. A convenção é **uma variante de cor por documento** (simplifica estoque e visual 3D). Datas persistidas como BSON `Date` UTC, identificador BSON `ObjectId`; o `id` da API é string hexadecimal de 24 caracteres.

| Campo | Tipo BSON | Obrigatório | Restrição / significado |
|---|---|---|---|
| `_id` | ObjectId | Sim | Identificador único atribuído pelo MongoDB |
| `sku` | string | Sim | Único; código interno |
| `slug` | string | Sim | Único; URL do produto |
| `name` | string | Sim | Título visível |
| `brand` | string | Sim | Marca |
| `category` | string | Sim | Ex.: Street, Classics, Performance |
| `description` | string | Sim | Detalhes comerciais |
| `priceCents` | int/long | Sim | Inteiro `>= 0`; **não** float |
| `currency` | string | Sim | `BRL` na V1 |
| `active` | bool | Sim | `true` = catálogo público; `false` = soft-delete |
| `mainImageUrl` | string | Sim | Caminho/URL da imagem principal |
| `galleryUrls` | array de strings | Sim | Galeria, preferencialmente 1+ |
| `model3dUrl` | string | Não | Referência a `.glb`; arquivo não fica no documento |
| `colorName` | string | Sim | Cor comercial da variante |
| `sizes` | array de objetos | Sim | Subdocumentos `sizeBR`, `stock` |
| `sizes[].sizeBR` | int/long | Sim | Numeração BR, sem duplicações dentro do produto |
| `sizes[].stock` | int/long | Sim | Estoque `>= 0` |
| `attributes` | objeto flexível | Não | Ex.: material, estilo; flexibilidade documental |
| `featured` | objeto | Não | `enabled`, `order`, `backgroundHex`, `accentHex` |
| `createdAt` | date | Sim | Criado em UTC |
| `updatedAt` | date | Sim | Atualizado em UTC |

**Cardinalidade interna:** um produto contém de 1 a N numerações; galeria de 1 a N URLs; destaque e atributos são opcionais. O MongoDB não utiliza FK para `admin_profiles` nem para chaves Redis.

**Regras transversais:** valores de `stock` não são reservados no checkout; a V1 apenas gera pedido via WhatsApp. SKU e slug continuam únicos mesmo em documentos desativados. `featured.order` e códigos hexadecimais são validados antes de gravar; divergência de fotos/modelos 3D é tratada por fallback.

## 3. Redis

| Padrão de chave | Tipo | Conteúdo | TTL | Regra de atualização |
|---|---|---|---|---|
| `recent:visitor:{opaqueId}` | LIST | IDs MongoDB em strings, do mais recente ao mais antigo | 604800 s | LREM + LPUSH + LTRIM 0 4 + EXPIRE |
| `cache:product:{productId}` | STRING/JSON | Projeção **pública** de produto ativo | 300 s | Cache-aside, DEL após mutação |

**Visitante:** cookie aleatório opaco e não identificável; nunca guardar telefone, e-mail ou credencial no Redis. Para retirar duplicações, use `LREM` antes de `LPUSH`. Em falha do Redis, o catálogo deve continuar usando MongoDB.

## 4. Integridade entre os bancos

Não existe chave estrangeira ou transação ACID distribuída entre Supabase, MongoDB e Redis. Referências Redis→Mongo são **IDs lógicos**, sempre revalidados na fonte. As relações do visitante são temporárias, e uma falha no Redis nunca autoriza um pedido inválido.
