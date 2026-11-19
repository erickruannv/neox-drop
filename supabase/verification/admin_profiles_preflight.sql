-- SOMENTE CONSULTAS: executar manualmente ANTES da migration, no SQL Editor.
-- Confirmar no Dashboard que o projeto selecionado é neox-drop-test.
-- Nenhuma consulta foi executada pelo agente. Não contém chaves, senhas ou promoção de admin.
begin transaction read only;

-- Esperado: execution_role=postgres e correct_execution_role=true.
-- current_database normalmente é postgres e NÃO identifica o projeto Supabase.
select current_user as execution_role,
       current_database() as database_name,
       current_user = 'postgres' as correct_execution_role;

-- Esperado: os quatro papéis existem; service_role tem BYPASSRLS no Supabase padrão.
-- anon/authenticated devem ter BYPASSRLS=false.
-- BYPASSRLS não dispensa privilégios de tabela/função.
with required(role_name) as (
  values ('postgres'), ('anon'), ('authenticated'), ('service_role')
)
select required.role_name, r.oid is not null as role_exists, r.rolbypassrls
from required
left join pg_catalog.pg_roles r on r.rolname = required.role_name
order by required.role_name;

-- Esperado: todos missing=true. Se algum for false, PARAR e revisar o estado existente.
select 'public.admin_profiles' as object_name,
       pg_catalog.to_regclass('public.admin_profiles') is null as missing
union all
select 'public.store_settings', pg_catalog.to_regclass('public.store_settings') is null
union all
select 'neox_private', pg_catalog.to_regnamespace('neox_private') is null;

-- Esperado: helper_exists=true nos dois resultados.
select 'auth.uid()' as helper,
       pg_catalog.to_regprocedure('auth.uid()') is not null as helper_exists
union all
select 'auth.jwt()', pg_catalog.to_regprocedure('auth.jwt()') is not null;

-- Esperado: compatible=true em todas as linhas. Compatibilidade estrutural, não teste de login.
with required(table_name, column_name, expected_type) as (
  values ('users', 'id', 'uuid'),
         ('sessions', 'id', 'uuid'),
         ('sessions', 'user_id', 'uuid'),
         ('sessions', 'not_after', 'timestamptz')
)
select r.table_name, r.column_name, r.expected_type, c.udt_name as actual_type,
       coalesce(c.udt_name = r.expected_type, false) as compatible
from required r
left join information_schema.columns c
  on c.table_schema = 'auth' and c.table_name = r.table_name and c.column_name = r.column_name
order by r.table_name, r.column_name;

rollback;
