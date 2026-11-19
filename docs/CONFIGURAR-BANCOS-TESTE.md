# Fase 3 — configurar os três bancos de teste

Este roteiro prepara a validação real; não provisiona recursos automaticamente.
Pré-requisitos técnicos e limites: [TESTES-BANCOS.md](TESTES-BANCOS.md).
Diagnóstico desta rodada: [evidências da Fase 3](evidencias/backend-fase3.md).

## 1. Escolher recursos gratuitos e isolados

Crie recursos dedicados à NEOX de teste, com dados fictícios. Os nomes abaixo são sugestões
de identificação, não indicam recursos existentes. Confirme **Free / $0** no resumo antes de
criar; se a opção gratuita não estiver disponível, pare sem aceitar plano pago ou upgrade.
Não use recursos de produção, créditos de trial como se fossem gratuitos permanentes ou addons.

| Serviço | Recurso a preparar por você | Plano a selecionar |
|---|---|---|
| Supabase | Projeto novo `neox-drop-test` em organização Free | [Free](https://supabase.com/pricing) |
| MongoDB Atlas | Projeto/cluster de teste; banco `neox_drop_test` | [Free](https://www.mongodb.com/pricing), não Flex/Dedicated |
| Upstash | Redis dedicado `neox-drop-test` | [Free](https://upstash.com/pricing/redis), não Pay as You Go |

Preços/opções conferidos em 19/11/2026; a tela de contratação precisa continuar indicando zero.
O Supabase Free tem limite de projetos ativos e pausa por inatividade. O projeto inativo
visível no conector não foi identificado como teste NEOX; não o restaurar/reutilizar sem
confirmar finalidade e plano. Não foi aberto nenhum banco desse projeto.

## 2. Supabase: URL, chaves, migration e dois usuários

1. No Dashboard, escolha a organização Free e crie o projeto de teste. Guarde a senha do
   banco em seu gerenciador; a aplicação usa Auth/Data API, não essa senha de PostgreSQL.
2. No painel de conexão/API do projeto, obtenha **Project URL**; em **Settings → API Keys**,
   obtenha a **publishable key** e, se for testar o contato do checkout, uma **secret key**
   somente para backend. Salve localmente como `SUPABASE_URL`, `SUPABASE_KEY` e
   `SUPABASE_SECRET_KEY`. Não confundir com JWT de usuário ou senha do banco.
   [Tipos e obtenção de API keys](https://supabase.com/docs/guides/getting-started/api-keys).
3. Confirme que o projeto está saudável, vazio/dedicado a teste e com Data API disponível.
   **Pare aqui para a aplicação da migration:** o arquivo a revisar/autorizar é
   [20261119105020_admin_profiles_rls.sql](../supabase/migrations/20261119105020_admin_profiles_rls.sql).
   A [revisão SQL definitiva](SQL-SUPABASE-TESTE.md) inclui consultas de preflight/postflight.
   Sua autorização deve identificar o projeto de teste e esse arquivo. Nenhuma migration
   remota será executada por inferência; não há comando remoto automático neste roteiro.
4. Depois da aplicação autorizada, em **Authentication → Users**, prepare duas contas
   fictícias com senha e email confirmado, usando o fluxo administrativo do provedor.
   Não desative globalmente a confirmação de email nem abra signup para contornar a configuração.
   [Gerenciamento de usuários](https://supabase.com/docs/guides/auth/users).
5. Para a conta admin, o responsável adiciona em `public.admin_profiles` uma única linha:
   `user_id` igual ao UUID real do Auth, `display_name` fictício, `role=admin`, `is_active=true`.
   Deixe datas com os defaults. A migration não cria nem promove usuários automaticamente.
   Para a outra conta, deixe **sem linha de perfil** (ou perfil inativo); não a promova.
6. Guarde os emails/senhas nas quatro variáveis `NEOX_TEST_*` do `.env` privado. Não envie
   senhas, tokens ou screenshots com valores no chat. Confirme apenas a finalidade de teste.

A migration deve criar/instalar exatamente:

- `public.admin_profiles`: FK para `auth.users`, papel admin, inativo por padrão e datas UTC.
- `public.store_settings`: singleton `id=1`, contato inicialmente vazio, sem número inventado.
- RLS nas duas tabelas; sem escrita de `anon`/`authenticated`; SELECT do próprio perfil
  para `authenticated`; SELECT de settings apenas para backend `service_role`.
- Policy `read_own_admin_profile`, condicionada a UID e sessão Auth ainda existente.
- Funções privadas `neox_private.current_session_is_live` e `set_updated_at`, grants limitados
  e triggers `admin_profile_updated` / `store_settings_updated`.

A função de sessão lê `auth.sessions` e `not_after`; essa compatibilidade exige o teste real.
Não criar uma policy permissiva para fazer o teste passar. Se houver tabelas já existentes,
inspecionar antes de aplicar: a migration não deve ser adaptada silenciosamente nem rerodada.
O contato WhatsApp não é necessário para os cinco testes iniciais. Para validar checkout real,
o responsável configura um contato autorizado no singleton; não se envia mensagem no teste.

## 3. MongoDB Atlas: cluster, acesso e coleção

1. Em um projeto de teste, crie cluster **Free**. Use o [fluxo oficial de criação](https://www.mongodb.com/docs/atlas/tutorial/deploy-free-tier-cluster/).
2. Em **Database Access**, crie um usuário de banco separado do login Atlas, autenticado
   por senha/SCRAM, com `readWrite` apenas em `neox_drop_test`, restrito ao cluster de teste.
   Não conceder administração de todos os bancos.
   [Usuários de banco](https://www.mongodb.com/docs/atlas/security-add-mongodb-users/).
3. Em **Network Access**, permita somente o IP atual da máquina de teste, preferencialmente
   com entrada temporária. Não liberar `0.0.0.0/0`.
   [IP access list](https://www.mongodb.com/docs/atlas/security/ip-access-list/).
4. Em **Connect → Drivers → Python**, copie a URI SRV para `MONGODB_URI` no `.env` local e
   preencha a senha ali. Caracteres reservados na senha precisam de percent-encoding;
   não coloque a URI preenchida em comando, Git ou mensagem. Preserve TLS/verificação de certificados.
5. Defina `MONGODB_DATABASE=neox_drop_test`. Não crie uma coleção `products` vazia no painel:
   o inicializador exige coleção nova para instalar o validator corretamente.
6. Após confirmar esse destino e autorizar a inicialização de teste, use o script já preparado:

   ```sh
   uv run --locked python -m scripts.seed_products --initialize --seed
   ```

Isso é escrita remota de teste: cria coleção, seis índices e seed fictícia. Não foi executado
nesta rodada. O script recusa coleção existente, nome sem `_test` ou opt-in ausente. Se a
coleção já existir, interromper só a inicialização e revisar estado; não usar drop/collMod
para contornar a recusa. A seed não sobrescreve produto existente.

Fonte de validator/índices: [mongo/products_schema.json](../mongo/products_schema.json).
`validationLevel=strict`, `validationAction=error`; `_id` ObjectId, datas BSON, valores int/long,
campos obrigatórios e subdocumentos conforme o contrato. A API complementa tamanhos únicos,
origens de mídia, atributos seguros e centavos. Índice `_id_` é criado pelo próprio MongoDB.

| Índice adicional | Campos em ordem | Restrição |
|---|---|---|
| `uniq_sku` | `sku:1` | único, inclusive após desativar |
| `uniq_slug` | `slug:1` | único, inclusive após desativar |
| `catalog_by_category` | `active:1, category:1, createdAt:-1` | consulta |
| `catalog_by_brand` | `active:1, brand:1, createdAt:-1` | consulta |
| `featured_order` | `active:1, featured.enabled:1, featured.order:1` | consulta |
| `catalog_by_size` | `active:1, sizes.sizeBR:1` | multikey |

A busca atual usa regex escapada; não há índice textual adicional neste preparo. Medir `explain`
com o dataset real antes de afirmar otimização. A imagem da seed é fixture, não licença de asset.

## 4. Upstash: Redis REST com permissão de escrita

1. Na [console Upstash](https://console.upstash.com/), em Redis, escolha **Create Database**,
   nome de teste, região e plano **Free**; confirme custo zero sem adicionais.
   [Passo a passo oficial](https://upstash.com/docs/redis/overall/getstarted).
2. No bloco **Connect / REST**, copie a URL HTTPS para `UPSTASH_REDIS_REST_URL` e o token
   de leitura/escrita para `UPSTASH_REDIS_REST_TOKEN`. O token read-only não serve para
   EVAL, recentes, cache e limpeza das chaves dos testes.
   [Credenciais REST](https://upstash.com/docs/redis/features/restapi).
3. Não usar `redis://`, não compartilhar banco com produção e não executar FLUSHDB.
   Não é necessária migration Redis: as chaves de teste são criadas pelas operações autorizadas.

Recentes: `recent:visitor:{id}` LIST, até cinco IDs, TTL 604800s. Cache:
`cache:product:{id}` JSON/STRING, TTL 300s. EVAL e expiração precisam funcionar no plano escolhido;
não substituir o teste por uma lista em memória se o provedor rejeitar a operação.

## 5. Preencher o ambiente local sem expor os valores

Se `.env` ainda não existir, copie `.env.example` para `.env` em seu editor. Se já existir,
preencha apenas os campos necessários sem sobrescrever credenciais. O Git ignora `.env`.
A aplicação lê `.env` e o ambiente do processo; não lê `.env.test` ou `.env.local` automaticamente.

Para esta etapa, edite os seguintes campos:

```dotenv
APP_ENV=test
TEST_CONNECTIONS_ENABLED=true
ALLOWED_ORIGIN=http://127.0.0.1:8000
MONGODB_DATABASE=neox_drop_test
# Preencher localmente, sem commitar:
COOKIE_SECRET=
SUPABASE_URL=
SUPABASE_KEY=
SUPABASE_SECRET_KEY=
MONGODB_URI=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
NEOX_TEST_ADMIN_EMAIL=
NEOX_TEST_ADMIN_PASSWORD=
NEOX_TEST_NONADMIN_EMAIL=
NEOX_TEST_NONADMIN_PASSWORD=
RUN_REAL_INTEGRATION=0
```

`COOKIE_SECRET` é uma chave própria aleatória com pelo menos 32 caracteres; gere-a localmente
com gerenciador de senhas/segredos e salve apenas no arquivo privado. As entradas em branco
acima são intencionais, não credenciais. Não colar `.env` em mensagens. Mantenha limites/TTLs
do template. A secret key Supabase é opcional nos cinco testes, necessária apenas ao contato
privado do checkout. Para estes testes sem mídia remota, `MEDIA_ALLOWED_ORIGINS=[]` basta.

## 6. Retomar a validação por serviço, sem refazer funcionalidades

Quando o destino estiver confirmado como teste e schema/índices estiverem prontos, o diagnóstico
somente leitura pode ser executado:

```sh
uv run --locked python -m scripts.check_connections
```

Ele retorna apenas booleanos; não prova RLS, índices ou escrita. Antes de habilitar os testes,
confirme que a conta admin/negativa e a permissão de escrita/limpeza são exclusivamente de teste.
Para carregar também as credenciais `NEOX_TEST_*` do `.env` para o processo pytest, use:

```sh
RUN_REAL_INTEGRATION=1 uv run --locked python - <<'PY'
from dotenv import load_dotenv
import pytest
load_dotenv('.env', override=False)
raise SystemExit(pytest.main(['tests/real', '-q', '--tb=short']))
PY
```

Esse comando só deve ser executado depois do preparo autorizado. `override=False` preserva
valores já exportados; se houver variáveis antigas no terminal, corrigir a origem antes de testar.
Nunca usar `printenv`, exibir Settings completos, `--showlocals` ou `--debug` para publicar erros
com credenciais. Em caso de erro real, registrar somente serviço, classe/código e resultado
sanitizado; não copiar respostas/tokens de autenticação para evidências.

Se só um serviço estiver pronto, trocar `tests/real` no comando pelo arquivo correspondente;
assim, pendência em outro banco não impede sua validação:

| Arquivo | Provas esperadas e efeitos |
|---|---|
| `tests/real/test_live_admin_rls.py` | 3 testes: Auth admin, perfil próprio, escrita negada, logout/revogação; anon sem leitura; não-admin 403. Cria sessões e as encerra; não cria usuários. |
| `tests/real/test_live_mongodb.py` | 1 teste: CRUD, duplicata 409, preço atualizado e soft-delete. Cria e limpa apenas SKU aleatório de teste. |
| `tests/real/test_live_redis.py` | 1 teste: EVAL concorrente, A/B/A, cinco únicos e TTL. Cria e remove apenas chave aleatória de teste. |

Depois: executar os testes de contrato e demais regressões pertinentes, sem reexecutar
os testes mutáveis de banco desnecessariamente:

```sh
uv run --locked pytest tests/unit tests/contract tests/integration -q
```

Guardar resultados
por serviço: **real aprovado**, **real falhou**, **não executado** ou **simulado/local**. Nenhum
skip conta como integração aprovada. Se a migration remota ainda aguardar autorização,
pausar só a parte Supabase; Mongo/Redis podem ser validados quando seus próprios preparos
estiverem confirmados. Não conceder privilégios mais amplos para silenciar falhas de RLS.

Para retomar comigo, basta informar que `.env` está preenchido, quais recursos são
exclusivamente de teste e a situação da migration/coleção. Não envie segredos. Uma autorização
remota deve citar o projeto e a migration revisada; não foi solicitada execução por padrão.
