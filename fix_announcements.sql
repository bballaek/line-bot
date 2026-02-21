-- Run this in Supabase SQL Editor
-- Fixes announcements table and adds read tracking

-- 1. Fix announcements table columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'announcements' AND column_name = 'created_by') THEN
    ALTER TABLE public.announcements ADD COLUMN created_by UUID REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'announcements' AND column_name = 'pinned') THEN
    ALTER TABLE public.announcements ADD COLUMN pinned BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 2. Create announcement_reads table
CREATE TABLE IF NOT EXISTS public.announcement_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(announcement_id, user_id)
);

-- 3. Enable RLS
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'announcement_reads' AND policyname = 'Allow all for anon') THEN
    CREATE POLICY "Allow all for anon" ON public.announcement_reads FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
