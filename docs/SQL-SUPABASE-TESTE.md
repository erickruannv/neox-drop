# SQL definitivo — aplicação manual em neox-drop-test

O usuário confirmou a criação do projeto e de duas contas Auth de teste. Esta revisão foi
**somente local**: nenhum SQL, leitura de tabelas, migration, criação de conta ou promoção
administrativa foi executado no Supabase. Não foram solicitadas ou lidas senhas/chaves.

## Arquivos para o SQL Editor

1. [Pré-requisitos — somente consultas](../supabase/verification/admin_profiles_preflight.sql).
2. **[SQL definitivo da migration](../supabase/migrations/20261119105020_admin_profiles_rls.sql)**.
3. [Verificação posterior — somente consultas](../supabase/verification/admin_profiles_postflight.sql).

O arquivo definitivo é o próprio arquivo canônico da migration, revisado por novo commit,
sem criar cópia SQL concorrente nem reescrever histórico. Não executar os SQLs históricos
em docs/reference. Os hashes das evidências anteriores correspondem à revisão antiga;
para esta aplicação manual, usar o arquivo revisado e o SHA-256 registrado abaixo.

No Dashboard, selecionar explicitamente **neox-drop-test**, SQL Editor, papel **postgres**.
O nome `postgres` retornado por `current_database()` não identifica o projeto.

- Rodar manualmente o preflight e conferir papel, helpers Auth, tipos de auth.users/sessions
  e ausência de objetos NEOX. Se algum pré-requisito falhar, **parar**, sem afrouxar políticas.
- Com o preflight conforme, executar manualmente a migration **inteira, uma única vez**.
  Ela usa transação e criação estrita, sem DROP/IF NOT EXISTS/CREATE OR REPLACE para ocultar
  objetos existentes. Se houver erro, não executar apenas trechos; resolver a transação
  abortada com ROLLBACK e revisar o erro antes de tentar outra ação.
- A aplicação pelo SQL Editor não registra automaticamente o histórico do CLI Supabase.
  Guarde commit/hash e data; antes de usar migrations pelo CLI no futuro, reconciliar esse
  histórico sob supervisão, sem reaplicar o DDL ou inserir registros de controle por conta própria.
- Rodar o postflight e comparar os resultados esperados indicados nos comentários. Ele usa
  transação READ ONLY e ROLLBACK, sem inserir/atualizar dados ou mudar papéis.
- Data API precisa estar habilitada com `public` exposto. **Não expor `neox_private`**.
  Essa configuração do projeto não foi consultada pelo agente.

## Compatibilidade com o backend atual

`app/services/admin.py:authorize` chama `get_user(token)`, aplica o bearer do usuário em
`client.postgrest.auth(token)` e lê seu `admin_profiles`. Depois exige role=admin e is_active=true.
A conexão Auth usa SUPABASE_KEY publishable/anon; não usar chave privilegiada nessa variável.

Por isso, **service_role NÃO precisa de SELECT em admin_profiles no backend atual**.
O SQL o remove explicitamente, inclusive se grants padrão do projeto o tiverem concedido.
Não adicionar um grant privilegiado para contornar uma falha de RLS.

`app/db/supabase.py:store_contact` usa a chave backend separada SUPABASE_SECRET_KEY somente
para ler o singleton store_settings no checkout. A esse objeto, e somente como leitura,
service_role recebe SELECT explícito. BYPASSRLS não substitui privilégios de tabela.

| Papel | admin_profiles | store_settings | neox_private |
|---|---|---|---|
| anon | sem acesso | sem acesso | sem acesso |
| authenticated | SELECT do próprio perfil com sessão válida | sem acesso | USAGE; EXECUTE somente current_session_is_live |
| service_role | sem acesso | SELECT | sem acesso/EXECUTE |
| postgres/owner | administração supervisionada | administração supervisionada | owner das funções |

Nenhum dos três papéis da aplicação recebe INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER
nas tabelas. O SQL redefine ACLs desses objetos; não muda default privileges globalmente,
nem papéis, membership, chaves, contas Auth ou outras tabelas do projeto.

## Objetos e segurança revisados

- admin_profiles: UUID PK/FK de auth.users com ON DELETE CASCADE; display_name não vazio,
  role restrita a admin, is_active=false por padrão, created_at/updated_at timestamptz.
- store_settings: PK/singleton id=1, nome não vazio e contato vazio ou dígitos E.164 válidos.
  Só esse singleton vazio é inserido pela migration; não há perfil de admin inserido.
- RLS ativo em ambas. Apenas uma policy SELECT em admin_profiles: UID próprio e sessão viva.
  Perfil inativo pode ler seus dados, mas FastAPI o rejeita com 403. Store_settings não tem
  policy pública; o leitor backend usa service_role, sujeito ao grant explícito.
- current_session_is_live: SQL STABLE, SECURITY DEFINER, owner postgres ao executar como
  postgres, search_path vazio, sem argumentos. Confere auth.uid(), session_id do JWT e
  auth.sessions.not_after; não usa user_metadata. Sua elevação é limitada à consulta da sessão,
  necessária para impedir reutilização de access token depois de logout.
- set_updated_at: trigger PL/pgSQL SECURITY INVOKER, search_path vazio; só atribui
  NEW.updated_at=statement_timestamp(). Dois triggers BEFORE UPDATE vinculam essa função.
  Não há trigger em auth.users para criar/promover perfis. Não se concede EXECUTE direto
  nessa função a papéis da aplicação; o vínculo do trigger não exige esse grant ao chamador.

As duas contas Auth existentes continuam sem privilégio administrativo concedido por este SQL.
O perfil da conta destinada ao administrador exige uma operação posterior, manual e
supervisionada; não está incluída nesta migration ou nas consultas. Contato vazio bloqueia
checkout com link, intencionalmente, até configuração autorizada.

## O que as consultas comprovam

Preflight: presença dos papéis e helpers, compatibilidade estrutural dos campos Auth e schema
NEOX ainda inexistente. Postflight: duas tabelas/constraints, RLS, matriz de privilégios efetivos,
policy, owners/configuração/EXECUTE das funções, schema privado, triggers e contagens sem PII.

O SQL Editor como postgres pode ignorar RLS: SELECT executado nele **não prova isolamento de
usuário**. A prova comportamental ainda exige os testes reais com JWT via Auth/Data API:
admin ativo, não-admin negado, anon negado e logout invalidando a leitura do perfil.
Nesta tarefa eles não foram executados. Não considerar grants/flags corretos como teste real
concluído de login, RLS, refresh ou logout.

## Validação local da revisão

Testes estáticos tiveram falha antes dos ajustes e passaram após a redefinição dos grants,
criação estrita do schema e SECURITY INVOKER explícito. Parser PostgreSQL pglast 8.9 validou
sintaxe dos três arquivos e os corpos SQL/PL/pgSQL das funções sem executar SQL. Revisão independente não apontou achados materiais.
A regressão selecionada (unitários, contrato e HTTP local) passou com **120 testes**;
os testes reais foram deliberadamente excluídos para cumprir a proibição de execução remota.
As limitações pendentes são execução real, ACLs efetivas do projeto e compatibilidade do
schema Auth hospedado, em especial auth.sessions.not_after.

Fontes primárias:
[Grants e RLS na Data API](https://supabase.com/docs/guides/api/securing-your-api),
[RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),
[sessões e revogação](https://supabase.com/docs/guides/auth/sessions).

SHA-256 do SQL definitivo desta revisão: `26df4df293f8a56e214e406aaaa79872402b88872c4d024efdbb092800b22ee5`.
