import os

from postgrest.exceptions import APIError

from app.db.supabase import supabase_client


async def test_real_auth_own_profile_rls_and_denied_write(real_settings):
    email = os.getenv("NEOX_TEST_ADMIN_EMAIL")
    password = os.getenv("NEOX_TEST_ADMIN_PASSWORD")
    assert email and password, "Configure uma conta fictícia de teste previamente autorizada."
    async with supabase_client(real_settings) as client:
        auth = await client.auth.sign_in_with_password({"email": email, "password": password})
        assert auth.session and auth.user
        try:
            client.postgrest.auth(auth.session.access_token)
            rows = (await client.table("admin_profiles").select("*").execute()).data
            assert len(rows) == 1
            profile = rows[0]
            assert profile["user_id"] == str(auth.user.id)
            assert profile["role"] == "admin" and profile["is_active"] is True
            try:
                response = (
                    await client.table("admin_profiles")
                    .update({"display_name": profile["display_name"]})
                    .eq("user_id", str(auth.user.id))
                    .execute()
                )
            except APIError:
                pass
            else:
                assert not response.data, "RLS/GRANT permitiu escrita indevida."
        finally:
            await client.auth.admin.sign_out(auth.session.access_token, scope="local")
        # JWT pode ainda ser aceito por Auth; a policy deve rejeitar sessão revogada.
        assert not (await client.table("admin_profiles").select("user_id").execute()).data


async def test_real_anon_cannot_read_profiles(real_settings):
    async with supabase_client(real_settings) as client:
        try:
            response = await client.table("admin_profiles").select("user_id").execute()
        except APIError:
            return
        assert response.data == []


async def test_real_auth_user_without_active_admin_is_forbidden(real_settings):
    from app.core.exceptions import ApiFault
    from app.services.admin import authorize

    email = os.getenv("NEOX_TEST_NONADMIN_EMAIL")
    password = os.getenv("NEOX_TEST_NONADMIN_PASSWORD")
    assert email and password, (
        "Configure usuário fictício sem perfil admin ativo para teste negativo."
    )
    async with supabase_client(real_settings) as client:
        auth = await client.auth.sign_in_with_password({"email": email, "password": password})
        assert auth.session
        try:
            try:
                await authorize(client, auth.session.access_token)
            except ApiFault as exc:
                assert exc.status == 403
            else:
                raise AssertionError("Usuário sem perfil ativo foi autorizado indevidamente.")
        finally:
            await client.auth.admin.sign_out(auth.session.access_token, scope="local")
