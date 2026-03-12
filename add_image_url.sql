-- Add image_url column to announcements table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'announcements' AND column_name = 'image_url') THEN
    ALTER TABLE public.announcements ADD COLUMN image_url TEXT;
  END IF;
END $$;
