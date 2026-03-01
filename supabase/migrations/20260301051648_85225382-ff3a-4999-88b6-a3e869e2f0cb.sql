
-- Add payout tracking columns to withdrawal_requests
ALTER TABLE public.withdrawal_requests 
ADD COLUMN IF NOT EXISTS payout_reference text,
ADD COLUMN IF NOT EXISTS payout_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS bank_name text,
ADD COLUMN IF NOT EXISTS error_message text;

-- Ensure admins can do all operations on withdrawal_requests
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can delete withdrawals' AND tablename = 'withdrawal_requests') THEN
    CREATE POLICY "Admins can delete withdrawals" ON public.withdrawal_requests FOR DELETE USING (public.is_super_admin());
  END IF;
END $$;

-- Ensure admin_payment_logs has proper policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can insert payment logs' AND tablename = 'admin_payment_logs') THEN
    CREATE POLICY "Admins can insert payment logs" ON public.admin_payment_logs FOR INSERT WITH CHECK (public.is_super_admin());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update payment logs' AND tablename = 'admin_payment_logs') THEN
    CREATE POLICY "Admins can update payment logs" ON public.admin_payment_logs FOR UPDATE USING (public.is_super_admin());
  END IF;
END $$;
