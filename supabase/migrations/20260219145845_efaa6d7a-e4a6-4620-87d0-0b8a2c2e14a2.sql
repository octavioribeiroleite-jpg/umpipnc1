
-- Add user_id to members table to link authenticated users
ALTER TABLE public.members ADD COLUMN user_id UUID REFERENCES auth.users(id);
CREATE UNIQUE INDEX idx_members_user_id ON public.members(user_id) WHERE user_id IS NOT NULL;

-- Create member_payment_submissions table
CREATE TABLE public.member_payment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.members(id),
  user_id UUID NOT NULL,
  competence TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'mensalidade',
  receipt_url TEXT NOT NULL,
  amount NUMERIC,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  rejection_reason TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  society_id UUID REFERENCES public.societies(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.member_payment_submissions ENABLE ROW LEVEL SECURITY;

-- Members can view their own submissions
CREATE POLICY "Users can view own submissions"
  ON public.member_payment_submissions FOR SELECT
  USING (auth.uid() = user_id);

-- Members can create their own submissions
CREATE POLICY "Users can insert own submissions"
  ON public.member_payment_submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Management can view and manage all submissions
CREATE POLICY "Management can manage submissions"
  ON public.member_payment_submissions FOR ALL
  USING (has_management_role(auth.uid()));

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.member_payment_submissions;
