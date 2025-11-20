-- Create blocked_accounts table for managing blocked users
CREATE TABLE IF NOT EXISTS public.blocked_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on blocked_accounts
ALTER TABLE public.blocked_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for blocked_accounts
CREATE POLICY "Users can view blocked accounts"
  ON public.blocked_accounts FOR SELECT
  USING (true);

CREATE POLICY "Admins can block accounts"
  ON public.blocked_accounts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can unblock accounts"
  ON public.blocked_accounts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_blocked_accounts_user_id ON public.blocked_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_blocked_accounts_blocked_by ON public.blocked_accounts(blocked_by);