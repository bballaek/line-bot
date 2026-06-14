-- Classrooms linked to LINE groups + member roster

CREATE TABLE IF NOT EXISTS public.classrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  line_group_id TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(owner_id, line_group_id)
);

CREATE TABLE IF NOT EXISTS public.classroom_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  line_user_id TEXT NOT NULL,
  display_name TEXT,
  picture_url TEXT,
  student_number INTEGER,
  full_name TEXT,
  nickname TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  UNIQUE(classroom_id, line_user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS classroom_members_number_unique
  ON public.classroom_members (classroom_id, student_number)
  WHERE student_number IS NOT NULL;

ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_members ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'classrooms' AND policyname = 'Allow all for anon') THEN
    CREATE POLICY "Allow all for anon" ON public.classrooms FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'classroom_members' AND policyname = 'Allow all for anon') THEN
    CREATE POLICY "Allow all for anon" ON public.classroom_members FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
