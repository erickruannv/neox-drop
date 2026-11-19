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
