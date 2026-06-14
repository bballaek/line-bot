-- Student profiles for classroom roster

CREATE TABLE IF NOT EXISTS public.student_profiles (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  student_number INTEGER,
  full_name TEXT,
  nickname TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS student_profiles_number_unique
  ON public.student_profiles (student_number)
  WHERE student_number IS NOT NULL;

ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'student_profiles' AND policyname = 'Allow all for anon'
  ) THEN
    CREATE POLICY "Allow all for anon" ON public.student_profiles
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
