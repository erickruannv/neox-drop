-- SOMENTE CONSULTAS: executar manualmente DEPOIS da migration.
-- Não executar como prova de RLS comportamental: SQL Editor/postgres pode ignorar RLS.
-- Não imprime usuários, JWTs, senhas, chaves nem telefone da loja.
begin transaction read only;

-- 1. Duas tabelas, owner postgres, RLS=true nas duas.
select c.relname as table_name, pg_catalog.pg_get_userbyid(c.relowner) as owner,
       c.relrowsecurity as rls_enabled, c.relforcerowsecurity as force_rls
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in ('admin_profiles', 'store_settings')
order by c.relname;

-- 2. Colunas/defaults, sem consultar dados pessoais.
select table_name, column_name, udt_name, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name in ('admin_profiles', 'store_settings')
order by table_name, ordinal_position;

-- 3. PK/FK/CHECK; FK user_id deve referenciar auth.users(id) ON DELETE CASCADE.
select c.relname as table_name, con.conname,
       pg_catalog.pg_get_constraintdef(con.oid, true) as definition
from pg_catalog.pg_constraint con
join pg_catalog.pg_class c on c.oid = con.conrelid
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in ('admin_profiles', 'store_settings')
order by c.relname, con.conname;

-- 4. Seis pares papel/tabela. Esperado: permissions_match=true em todos.
-- anon: nada; authenticated: SELECT admin_profiles; service_role: SELECT store_settings.
-- Nenhum desses papéis recebe escrita, TRUNCATE, REFERENCES ou TRIGGER.
with expected(role_name, table_name, may_select) as (
  values ('anon', 'public.admin_profiles', false),
         ('anon', 'public.store_settings', false),
         ('authenticated', 'public.admin_profiles', true),
         ('authenticated', 'public.store_settings', false),
         ('service_role', 'public.admin_profiles', false),
         ('service_role', 'public.store_settings', true)
), privileges as (
  select e.*,
         pg_catalog.has_table_privilege(role_name, table_name, 'SELECT') as can_select,
         pg_catalog.has_table_privilege(role_name, table_name, 'INSERT') as can_insert,
         pg_catalog.has_table_privilege(role_name, table_name, 'UPDATE') as can_update,
         pg_catalog.has_table_privilege(role_name, table_name, 'DELETE') as can_delete,
         pg_catalog.has_table_privilege(role_name, table_name, 'TRUNCATE') as can_truncate,
         pg_catalog.has_table_privilege(role_name, table_name, 'REFERENCES') as can_reference,
         pg_catalog.has_table_privilege(role_name, table_name, 'TRIGGER') as can_trigger
  from expected e
)
select *, can_select = may_select
          and not (can_insert or can_update or can_delete or can_truncate or can_reference or can_trigger)
          as permissions_match
from privileges
order by role_name, table_name;

-- 5. Exatamente uma policy: read_own_admin_profile, SELECT, authenticated.
-- qual deve conter UID do chamador e current_session_is_live(). Nenhuma policy em store_settings.
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_catalog.pg_policies
where schemaname = 'public' and tablename in ('admin_profiles', 'store_settings')
order by tablename, policyname;

-- 6. Schema privado: owner postgres; authenticated USAGE=true e CREATE=false.
select n.nspname, pg_catalog.pg_get_userbyid(n.nspowner) as owner,
       r.role_name,
       pg_catalog.has_schema_privilege(r.role_name, n.oid, 'USAGE') as can_use,
       pg_catalog.has_schema_privilege(r.role_name, n.oid, 'CREATE') as can_create
from pg_catalog.pg_namespace n
cross join (values ('anon'), ('authenticated'), ('service_role')) as r(role_name)
where n.nspname = 'neox_private'
order by r.role_name;

-- 7. Duas funções: owner postgres; search_path vazio em ambas.
-- Apenas current_session_is_live é SECURITY DEFINER (true) e STABLE (s).
-- set_updated_at é SECURITY INVOKER (false), função trigger VOLATILE (v).
select p.proname, pg_catalog.pg_get_userbyid(p.proowner) as owner,
       p.prosecdef as security_definer, p.provolatile as volatility,
       p.proconfig, pg_catalog.pg_get_functiondef(p.oid) as definition
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'neox_private'
  and p.proname in ('current_session_is_live', 'set_updated_at')
order by p.proname;

-- 8. EXECUTE: authenticated só na função de sessão. anon/service_role: false em ambas.
-- Trigger dispara por vínculo à tabela; não precisa conceder EXECUTE direto ao usuário.
select r.role_name, p.proname,
       pg_catalog.has_function_privilege(r.role_name, p.oid, 'EXECUTE') as can_execute
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
cross join (values ('anon'), ('authenticated'), ('service_role')) as r(role_name)
where n.nspname = 'neox_private'
  and p.proname in ('current_session_is_live', 'set_updated_at')
order by r.role_name, p.proname;

-- 9. Dois triggers de aplicação BEFORE UPDATE, habilitados (O), sem triggers em auth.users.
-- A consulta abaixo deliberadamente só inspeciona as duas tabelas NEOX.
select c.relname as table_name, t.tgname, t.tgenabled,
       pg_catalog.pg_get_triggerdef(t.oid, true) as definition
from pg_catalog.pg_trigger t
join pg_catalog.pg_class c on c.oid = t.tgrelid
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in ('admin_profiles', 'store_settings')
  and not t.tgisinternal
order by c.relname, t.tgname;

-- 10. Depois da primeira aplicação, antes de provisionamento manual: perfis=0, admins=0.
-- Duas contas no Auth NÃO equivalem a dois perfis ou a privilégio administrativo.
select count(*) as profiles_total,
       count(*) filter (where role = 'admin' and is_active) as active_admins
from public.admin_profiles;

-- Singleton criado, contato vazio intencional. Nenhum telefone é exibido.
select count(*) = 1 as exactly_one_settings_row,
       count(*) filter (where id = 1) = 1 as singleton_id_valid,
       count(*) filter (where whatsapp_e164_digits = '') = 1 as contact_not_configured
from public.store_settings;

rollback;
