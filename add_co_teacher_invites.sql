-- Co-teacher invites (LINE invite + accept/decline)

CREATE TABLE IF NOT EXISTS public.co_teacher_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  invitee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS co_teacher_invites_invitee_pending
  ON public.co_teacher_invites (invitee_id)
  WHERE status = 'pending';

ALTER TABLE public.co_teacher_invites ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'co_teacher_invites' AND policyname = 'Allow all for anon'
  ) THEN
    CREATE POLICY "Allow all for anon" ON public.co_teacher_invites
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
