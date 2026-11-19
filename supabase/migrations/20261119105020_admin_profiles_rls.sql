-- Gerada com Supabase CLI 3.2.0; aplicar somente em ambiente de teste revisado.
begin;
create schema if not exists neox_private;
revoke all on schema neox_private from public, anon;
grant usage on schema neox_private to authenticated;

create table public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(btrim(display_name)) >= 1),
  role text not null default 'admin' check (role = 'admin'),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.store_settings (
  id integer primary key default 1 check (id = 1),
  store_name text not null default 'NEOX drop' check (length(btrim(store_name)) >= 1),
  whatsapp_e164_digits text not null default ''
    check (whatsapp_e164_digits = '' or whatsapp_e164_digits ~ '^[1-9][0-9]{7,14}$'),
  updated_at timestamptz not null default now()
);
alter table public.admin_profiles enable row level security;
alter table public.store_settings enable row level security;
revoke all on public.admin_profiles, public.store_settings from public, anon, authenticated;
grant select on public.admin_profiles to authenticated;

-- Acesso JWT revogado em logout só pode ser detectado conferindo auth.sessions.
-- Função privada, sem argumentos, sempre restrita ao uid e session_id do chamador.
create function neox_private.current_session_is_live() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from auth.sessions s
    where s.user_id = (select auth.uid())
      and s.id::text = (select auth.jwt()->>'session_id')
      and (s.not_after is null or s.not_after > now())
  );
$$;
revoke all on function neox_private.current_session_is_live() from public, anon, authenticated;
grant execute on function neox_private.current_session_is_live() to authenticated;
create policy read_own_admin_profile on public.admin_profiles
  for select to authenticated
  using ((select auth.uid()) = user_id and (select neox_private.current_session_is_live()));

create function neox_private.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = statement_timestamp();
  return new;
end;
$$;
revoke all on function neox_private.set_updated_at() from public, anon, authenticated;
create trigger admin_profile_updated before update on public.admin_profiles
  for each row execute function neox_private.set_updated_at();
create trigger store_settings_updated before update on public.store_settings
  for each row execute function neox_private.set_updated_at();

insert into public.store_settings (id) values (1);
-- Nenhuma conta ou perfil admin criado; contato vazio impede checkout até configuração.
commit;
