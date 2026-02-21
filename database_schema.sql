-- ===== SAFE TO RUN MULTIPLE TIMES =====

-- Users table (already exists, skip if so)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_user_id TEXT UNIQUE NOT NULL,
  display_name TEXT,
  picture_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Groups table
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_group_id TEXT UNIQUE NOT NULL,
  group_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User settings table
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  notify_time TEXT DEFAULT '19:00',
  notify_days JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Announcements table (no group_id FK required, created_by matches code)
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Homeworks table (no group_id FK required, matches code)
CREATE TABLE IF NOT EXISTS public.homeworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User homeworks tracking table
CREATE TABLE IF NOT EXISTS public.user_homeworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  homework_id UUID NOT NULL,
  status TEXT DEFAULT 'pending',
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, homework_id)
);

-- Announcement reads tracking table
CREATE TABLE IF NOT EXISTS public.announcement_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(announcement_id, user_id)
);

-- ===== FIX OLD SCHEMA (safe to run if columns already exist) =====
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'announcements' AND column_name = 'created_by') THEN
    ALTER TABLE public.announcements ADD COLUMN created_by UUID REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'announcements' AND column_name = 'pinned') THEN
    ALTER TABLE public.announcements ADD COLUMN pinned BOOLEAN DEFAULT false;
  END IF;
END $$;

-- ===== ENABLE RLS FOR DEVELOPMENT =====
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homeworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_homeworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

-- Allow all access for anon key (development only)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Allow all for anon') THEN
    CREATE POLICY "Allow all for anon" ON public.users FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'groups' AND policyname = 'Allow all for anon') THEN
    CREATE POLICY "Allow all for anon" ON public.groups FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_settings' AND policyname = 'Allow all for anon') THEN
    CREATE POLICY "Allow all for anon" ON public.user_settings FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'announcements' AND policyname = 'Allow all for anon') THEN
    CREATE POLICY "Allow all for anon" ON public.announcements FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'homeworks' AND policyname = 'Allow all for anon') THEN
    CREATE POLICY "Allow all for anon" ON public.homeworks FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_homeworks' AND policyname = 'Allow all for anon') THEN
    CREATE POLICY "Allow all for anon" ON public.user_homeworks FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'announcement_reads' AND policyname = 'Allow all for anon') THEN
    CREATE POLICY "Allow all for anon" ON public.announcement_reads FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
