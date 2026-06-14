-- Settings: roles, Google Drive, co-teachers

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'student'
  CHECK (role IN ('teacher', 'student'));

CREATE TABLE IF NOT EXISTS public.teacher_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  google_email TEXT,
  google_refresh_token TEXT,
  drive_folder_id TEXT,
  connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.co_teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(owner_id, teacher_id),
  CHECK (owner_id <> teacher_id)
);

ALTER TABLE public.teacher_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.co_teachers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'teacher_integrations' AND policyname = 'Allow all for anon') THEN
    CREATE POLICY "Allow all for anon" ON public.teacher_integrations FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'co_teachers' AND policyname = 'Allow all for anon') THEN
    CREATE POLICY "Allow all for anon" ON public.co_teachers FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
