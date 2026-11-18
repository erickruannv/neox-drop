-- NEOX drop V1.1 — modelo PostgreSQL / Supabase (REVISAR E TESTAR EM PROJETO DE DESENVOLVIMENTO)
-- Nao execute em producao sem revisar RLS, GRANTs e backups.
-- Supabase Auth gerencia auth.users; este script NAO cria usuarios nem administradores ativos.

BEGIN;

CREATE TABLE IF NOT EXISTS public.admin_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL CHECK (length(btrim(display_name)) >= 1),
  role text NOT NULL DEFAULT 'admin' CHECK (role = 'admin'),
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.store_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  store_name text NOT NULL DEFAULT 'NEOX drop' CHECK (length(btrim(store_name)) >= 1),
  whatsapp_e164_digits text NOT NULL DEFAULT ''
    CHECK (whatsapp_e164_digits = '' OR whatsapp_e164_digits ~ '^[1-9][0-9]{7,14}$'),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Escrita de tabelas administrativas somente pelo backend privilegiado.
-- Sem policies publicas de INSERT/UPDATE/DELETE.
REVOKE ALL ON TABLE public.admin_profiles FROM anon, authenticated;
REVOKE ALL ON TABLE public.store_settings FROM anon, authenticated;
GRANT SELECT ON TABLE public.admin_profiles TO authenticated;

-- Leitura apenas do proprio perfil (inclusive inativo); backend ainda valida is_active.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'admin_profiles'
    AND policyname = 'read_own_admin_profile'
  ) THEN
    CREATE POLICY read_own_admin_profile
    ON public.admin_profiles
    FOR SELECT TO authenticated
    USING ((SELECT auth.uid()) = user_id);
  END IF;
END $$;

-- Registro singleton sem numero real. Configurar numero em etapa administrativa controlada.
INSERT INTO public.store_settings (id, store_name, whatsapp_e164_digits)
VALUES (1, 'NEOX drop', '')
ON CONFLICT (id) DO NOTHING;

COMMIT;
