-- Create class_schedules table
CREATE TABLE IF NOT EXISTS public.class_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 1 AND 5),
  period INT NOT NULL CHECK (period BETWEEN 1 AND 8),
  start_time TEXT,
  end_time TEXT,
  subject TEXT,
  teacher TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, day_of_week, period)
);

ALTER TABLE public.class_schedules ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'class_schedules' AND policyname = 'Allow all for anon') THEN
    CREATE POLICY "Allow all for anon" ON public.class_schedules FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
