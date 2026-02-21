-- Fix announcements table: old schema had author_id, new code uses created_by and pinned
-- Run this in Supabase SQL Editor

-- Add created_by column if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'announcements' AND column_name = 'created_by') THEN
    ALTER TABLE public.announcements ADD COLUMN created_by UUID REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;

  -- Add pinned column if missing (old schema had is_pinned)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'announcements' AND column_name = 'pinned') THEN
    ALTER TABLE public.announcements ADD COLUMN pinned BOOLEAN DEFAULT false;
  END IF;

  -- Copy data from old columns if they exist
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'announcements' AND column_name = 'author_id') THEN
    UPDATE public.announcements SET created_by = author_id WHERE created_by IS NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'announcements' AND column_name = 'is_pinned') THEN
    UPDATE public.announcements SET pinned = is_pinned WHERE pinned IS NULL;
  END IF;
END $$;
