"""Verificação estática não substitui execução contra PostgreSQL/Supabase."""

from pathlib import Path


def test_migration_restricts_grants_and_own_profile():
    paths = list(Path("supabase/migrations").glob("*_admin_profiles_rls.sql"))
    assert len(paths) == 1
    sql = paths[0].read_text().lower()
    for clause in [
        "references auth.users(id) on delete cascade",
        "admin_profiles enable row level security",
        "store_settings enable row level security",
        "for select to authenticated",
        "auth.uid()",
        "= user_id",
        "revoke all",
        "default false",
        "auth.sessions",
        "session_id",
    ]:
        assert clause in sql
    assert "for insert" not in sql
    assert "for update" not in sql
    assert "grant all" not in sql
    assert "user_metadata" not in sql


def test_migration_resets_service_role_and_private_schema_defaults():
    sql = next(Path("supabase/migrations").glob("*_admin_profiles_rls.sql")).read_text().lower()
    normalized = " ".join(sql.split())
    assert (
        "revoke all on public.admin_profiles, public.store_settings "
        "from public, anon, authenticated, service_role;"
    ) in normalized
    assert "grant select on public.admin_profiles to service_role" not in normalized
    assert "grant select on public.store_settings to service_role;" in normalized
    assert "create schema neox_private;" in normalized
    assert "create schema if not exists neox_private" not in normalized
    assert (
        "revoke all on schema neox_private from public, anon, authenticated, service_role;"
        in normalized
    )
    assert "grant usage on schema public to authenticated, service_role;" in normalized
    assert "grant create" not in normalized


def test_migration_functions_are_private_and_do_not_promote_users():
    sql = next(Path("supabase/migrations").glob("*_admin_profiles_rls.sql")).read_text().lower()
    normalized = " ".join(sql.split())
    for function in ("current_session_is_live", "set_updated_at"):
        assert (
            f"revoke all on function neox_private.{function}() "
            "from public, anon, authenticated, service_role;"
        ) in normalized
    assert normalized.count("security definer") == 1
    assert "security invoker" in normalized
    assert normalized.count("set search_path = ''") == 2
    assert "insert into public.admin_profiles" not in normalized
    assert "update public.admin_profiles" not in normalized
    assert "insert into auth.users" not in normalized
