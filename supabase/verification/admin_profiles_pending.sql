-- Executar SOMENTE em neox-drop-test, SQL Editor, como postgres.
-- Uma única consulta/linha JSON. Sem escrita, sem promoção e sem consulta a senhas/tokens.
-- Não repete settings, contagem de perfis/admins, RLS, contagem de policies ou grants de tabela.
-- SQL Editor/postgres não comprova RLS de sessões: isso exige os logins reais depois.
with expected_functions(name, language_name, return_type, definer, volatility, source) as (
  values
    ('current_session_is_live', 'sql', 'boolean', true, 's', $body$
      select exists (
        select 1 from auth.sessions s
        where s.user_id = (select auth.uid())
          and s.id::text = (select auth.jwt()->>'session_id')
          and (s.not_after is null or s.not_after > now())
      );
    $body$),
    ('set_updated_at', 'plpgsql', 'trigger', false, 'v', $body$
      begin
        new.updated_at = statement_timestamp();
        return new;
      end;
    $body$)
), function_details as (
  select p.oid, p.proname as name,
         pg_catalog.pg_get_userbyid(p.proowner) as owner,
         l.lanname as language_name, p.pronargs as argument_count,
         pg_catalog.format_type(p.prorettype, null) as return_type,
         p.prosecdef as security_definer, p.provolatile as volatility,
         array(select setting from unnest(coalesce(p.proconfig, array[]::text[])) setting
               where setting like 'search_path=%') as search_path,
         pg_catalog.pg_get_userbyid(p.proowner) = 'postgres'
           and l.lanname = e.language_name and p.pronargs = 0
           and not p.proretset
           and pg_catalog.format_type(p.prorettype, null) = e.return_type
           and p.prosecdef = e.definer and p.provolatile::text = e.volatility
           and cardinality(p.proconfig) = 1
           and (p.proconfig = array['search_path=""']::text[]
                or p.proconfig = array['search_path=']::text[]) as header_matches_expected,
         btrim(regexp_replace(p.prosrc, '[[:space:]]+', ' ', 'g')) =
           btrim(regexp_replace(e.source, '[[:space:]]+', ' ', 'g')) as body_matches_expected,
         jsonb_build_object(
           'anon', pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE'),
           'authenticated', pg_catalog.has_function_privilege('authenticated', p.oid, 'EXECUTE'),
           'service_role', pg_catalog.has_function_privilege('service_role', p.oid, 'EXECUTE')
         ) as execute_permissions
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  join pg_catalog.pg_language l on l.oid = p.prolang
  join expected_functions e on e.name = p.proname
  where n.nspname = 'neox_private'
), account_count as (
  select count(*) as total from auth.users
), candidates as (
  -- Não enumera contas de um projeto inesperado com mais/menos que as duas informadas.
  select u.id as user_id,
         left(split_part(u.email, '@', 1), 3) || '***@' ||
           split_part(u.email, '@', 2) as email_hint,
         u.email_confirmed_at is not null as email_confirmed,
         coalesce(u.is_anonymous, false) as anonymous_account,
         u.deleted_at is not null as deleted,
         coalesce(u.banned_until,
                  '-infinity'::timestamptz) > now() as currently_banned
  from auth.users u
  where (select total from account_count) = 2
)
select jsonb_build_object(
  'table_owners', coalesce((
    select jsonb_agg(jsonb_build_object('table', c.relname,
                      'owner', pg_catalog.pg_get_userbyid(c.relowner)) order by c.relname)
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname in ('admin_profiles', 'store_settings')
  ), '[]'::jsonb),
  'columns_and_defaults', coalesce((
    select jsonb_agg(to_jsonb(x) order by x.table_name, x.ordinal_position)
    from (select table_name, ordinal_position, column_name, udt_name, is_nullable, column_default
          from information_schema.columns
          where table_schema = 'public' and table_name in ('admin_profiles', 'store_settings')) x
  ), '[]'::jsonb),
  'constraints', coalesce((
    select jsonb_agg(jsonb_build_object('table', c.relname, 'name', con.conname,
                      'definition', pg_catalog.pg_get_constraintdef(con.oid, true))
                    order by c.relname, con.conname)
    from pg_catalog.pg_constraint con
    join pg_catalog.pg_class c on c.oid = con.conrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname in ('admin_profiles', 'store_settings')
  ), '[]'::jsonb),
  'policy_definitions', coalesce((
    select jsonb_agg(to_jsonb(x) order by x.tablename, x.policyname)
    from (select tablename, policyname, permissive, roles, cmd, qual, with_check
          from pg_catalog.pg_policies
          where schemaname = 'public' and tablename in ('admin_profiles', 'store_settings')) x
  ), '[]'::jsonb),
  'private_schema', coalesce((
    select jsonb_agg(jsonb_build_object('owner', pg_catalog.pg_get_userbyid(n.nspowner),
              'role', r.name, 'usage', pg_catalog.has_schema_privilege(r.name, n.oid, 'USAGE'),
              'create', pg_catalog.has_schema_privilege(r.name, n.oid, 'CREATE')) order by r.name)
    from pg_catalog.pg_namespace n
    cross join (values ('anon'), ('authenticated'), ('service_role')) r(name)
    where n.nspname = 'neox_private'
  ), '[]'::jsonb),
  'functions', coalesce((select jsonb_agg(to_jsonb(f) - 'oid' order by f.name, f.argument_count)
                        from function_details f), '[]'::jsonb),
  'triggers', coalesce((
    select jsonb_agg(jsonb_build_object('table', c.relname, 'name', t.tgname,
              'enabled', t.tgenabled, 'type', t.tgtype,
              'definition', pg_catalog.pg_get_triggerdef(t.oid, true)) order by c.relname, t.tgname)
    from pg_catalog.pg_trigger t
    join pg_catalog.pg_class c on c.oid = t.tgrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname in ('admin_profiles', 'store_settings')
      and not t.tgisinternal
  ), '[]'::jsonb),
  'auth_session_columns', coalesce((
    select jsonb_agg(jsonb_build_object('name', column_name, 'type', udt_name)
                    order by column_name)
    from information_schema.columns
    where table_schema = 'auth' and table_name = 'sessions'
      and column_name in ('id', 'user_id', 'not_after')
  ), '[]'::jsonb),
  'auth_accounts_count', (select total from account_count),
  'account_candidates_not_administrators', coalesce((
    select jsonb_agg(to_jsonb(c) order by c.user_id) from candidates c
  ), '[]'::jsonb)
) as neox_pending;
