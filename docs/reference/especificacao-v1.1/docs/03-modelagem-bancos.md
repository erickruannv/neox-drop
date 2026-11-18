# 03 — Modelagem de dados: Supabase, MongoDB, Redis

## 1. Supabase Auth + PostgreSQL
O Supabase Auth gerencia os registros em `auth.users`; a aplicação mantém:

### `public.admin_profiles`
| Campo | Tipo | Restrição |
|---|---|---|
| `user_id` | UUID | PK, FK `auth.users.id` ON DELETE CASCADE |
| `display_name` | TEXT | NOT NULL |
| `role` | TEXT | `CHECK(role IN ('admin'))`, V1 apenas admin |
| `is_active` | BOOLEAN | NOT NULL DEFAULT false |
| `created_at` | TIMESTAMPTZ | DEFAULT now() |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() |

### `public.store_settings`
| Campo | Tipo | Restrição |
|---|---|---|
| `id` | INTEGER | PK, `CHECK(id=1)` para loja única |
| `store_name` | TEXT | DEFAULT 'NEOX drop' |
| `whatsapp_e164_digits` | TEXT | Apenas dígitos, tamanho validado; sem número falso |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() |

### Script SQL de referência (revisar antes de executar)
```sql
create table if not exists public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null default 'admin' check (role in ('admin')),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.store_settings (
  id integer primary key default 1 check (id=1),
  store_name text not null default 'NEOX drop',
  whatsapp_e164_digits text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.admin_profiles enable row level security;
alter table public.store_settings enable row level security;
-- Políticas e GRANTs devem ser criados e testados separadamente.
-- Não criar política pública de escrita. Não abrir cadastro de administradores.
```

**RLS:** negar acesso não autorizado por padrão. Para operações do admin, validar Auth token e admin ativo; políticas podem permitir ao próprio admin ler somente seu perfil. Se o backend usar secret/service role (que *bypassa RLS*), a autorização obrigatória ocorre **antes de toda consulta ou mutação**, sem exceções. Nunca confiar apenas em `role` enviado pelo browser. Primeiro administrador será provisionado manualmente em operação controlada.

## 2. MongoDB Atlas — `neox_drop.products`
Documento **exemplar** (ObjectId real, datas BSON e URLs deverão ser gerados/validados na implementação):
```json
{
  "_id": "ObjectId",
  "sku": "NEOX-NX001-PT",
  "slug": "runner-preto-lima",
  "name": "Runner Preto/Lima",
  "brand": "Marca Demonstrativa",
  "category": "Performance",
  "description": "Tênis de demonstração acadêmica",
  "priceCents": 89990,
  "currency": "BRL",
  "active": true,
  "mainImageUrl": "/static/images/runner-preto-lima.webp",
  "galleryUrls": ["/static/images/runner-preto-lima.webp"],
  "model3dUrl": "/static/models/runner-preto-lima.glb",
  "colorName": "Preto e verde-lima",
  "sizes": [{"sizeBR": 39, "stock": 3}, {"sizeBR": 40, "stock": 6}],
  "attributes": {"material": "Têxtil", "style": "Lifestyle"},
  "featured": {"enabled": true, "order": 1, "backgroundHex": "#191919", "accentHex": "#BDF400"},
  "createdAt": "Data BSON UTC",
  "updatedAt": "Data BSON UTC"
}
```

**V1 deliberadamente simples:** uma cor por documento. Outras cores podem ser outros produtos, em vez de introduzir catálogo de variantes complexo. `model3dUrl` é opcional, assim como `attributes`.

### Restrições e índices
- `sku`: obrigatório e único (`unique index`).
- `slug`: obrigatório e único; ideal para URL.
- `priceCents`: inteiro >= 0; `sizes[*].stock` inteiro >= 0; sem preços em float.
- `active`: boolean; catálogo público usa `active=true`.
- Índice `{active:1, category:1, createdAt:-1}` para filtros, `{active:1, 'featured.enabled':1, 'featured.order':1}` para destaque.
- Busca textual simples: índice textual apropriado em `name`, `brand`, `description`, ou regex controlada com limites; escolher após medir dataset.
- `ObjectId` do MongoDB serializado para `id` string na API; **não expor `_id` BSON bruto**.
- `updatedAt` sempre atualizado em edições; **soft-delete** altera `active=false`.

## 3. Redis Upstash
| Chave | Tipo | TTL | Finalidade |
|---|---|---|---|
| `recent:visitor:{opaqueId}` | LIST | 604800 s (7 d) | Últimos 5 IDs de produtos únicos |
| `cache:product:{productId}` | STRING/JSON | 300 s | Detalhe público de produto válido |

### Algoritmo de recentes
1. Cookie anônimo aleatório (ID opaco) identifica a sessão; não coletar nome/telefone.
2. Quando usuário abre página de produto: `LREM` do ID anterior → `LPUSH` novo ID → `LTRIM` 0..4 → `EXPIRE` 604800; se possível agrupar atomicamente numa transação/pipeline ou script compatível.
3. `GET /api/recent`: ler IDs, consultar produtos ativos no Mongo/cache preservando ordem, ignorar IDs inválidos.
4. Se Redis falhar: retornar lista vazia/indisponível e registrar erro, sem impedir navegação.

### Cache de produto
Cache-aside: `GET` primeiro lê Redis, no miss busca MongoDB e grava com TTL de 300s; `PATCH/DELETE` **invalida** `cache:product:{id}`. Nunca gravar perfil de admin, senhas ou credenciais no cache de catálogo. Não servir documentos admin/inativos por cache público após desativação; idealmente preencher apenas produtos ativos e invalidar sempre após mutações.

## 4. Demonstração poliglota
- Supabase: exibir autenticação e registro de perfil admin (sem credenciais).
- MongoDB: cadastrar tênis no painel e verificar documento persistido.
- Redis: visitar 2–3 produtos, voltar a “Vistos recentemente”, mostrar ordem/TTL e um cache-hit/invalidação no log de diagnóstico **sem revelar chaves**.

## Consistência
Não existem transações distribuídas entre os três bancos. No checkout, **MongoDB é a fonte da verdade** para preço e estoque; Redis é eventual/descartável. A V1 não decrementa estoque nem registra pedido confirmado.


## Diagramas e esquema fisico (atualizacao V1.1)
Para a apresentação profissional da modelagem, consultar:
- [15 — Diagramas oficiais](15-diagramas-modelagem.md): conceitual, DER relacional, estrutura MongoDB, modelo Redis e sequências.
- [16 — Dicionário de dados](16-dicionario-de-dados.md): atributos, PK, FK, tipos BSON, cardinalidades, validade e TTL.
- [17 — Esquemas físicos e índices](17-esquema-fisico-e-indices.md): matriz consulta × índice e scripts versionados.
- [18 — Fluxos e consistência](18-fluxos-e-consistencia.md): regras e falhas parciais entre bancos.
- [19 — Evidências de avaliação](19-matriz-evidencias-banco.md): provas e roteiro de defesa.

**Atenção:** scripts e diagramas são propostas **não executadas**; conferi-los contra o banco real após implementação e registrar evidências de teste. A tabela `store_settings` é singleton e não possui FK para admin. Tamanhos/galeria/destaques são subdocumentos de `products`, e Redis não tem chaves estrangeiras para MongoDB.
