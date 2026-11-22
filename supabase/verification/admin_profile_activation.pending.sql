-- PREPARAÇÃO LOCAL. NÃO EXECUTAR antes de autorização específica para o UUID escolhido.
-- Apenas INSERT do perfil; não altera usuários Auth, policies, grants, settings ou outros perfis.
-- O UUID sentinela abaixo não ativa ninguém. Só substituir depois da confirmação/autorização.
-- Sucesso exige retornar EXATAMENTE UMA linha com o UUID autorizado, role=admin, is_active=true.
-- Zero linhas significa que NADA foi ativado; não tratar ausência de erro como sucesso.
with target(user_id) as (
  values ('00000000-0000-0000-0000-000000000000'::uuid)
), eligible as (
  select u.id
  from auth.users u join target t on t.user_id = u.id
  where t.user_id <> '00000000-0000-0000-0000-000000000000'::uuid
    and u.email_confirmed_at is not null
    and not coalesce(u.is_anonymous, false)
    and u.deleted_at is null
    and coalesce(u.banned_until,
                 '-infinity'::timestamptz) <= now()
    and (select count(*) from auth.users) = 2
    and not exists (select 1 from public.admin_profiles)
)
insert into public.admin_profiles (user_id, display_name, role, is_active)
select id, 'Administrador de teste', 'admin', true from eligible
returning user_id, role, is_active;
