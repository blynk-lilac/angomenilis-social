
-- Add admin INSERT policy for admin_payment_logs (admin needs to insert withdrawal records)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can insert payment logs' AND tablename = 'admin_payment_logs') THEN
    CREATE POLICY "Admins can insert payment logs" ON public.admin_payment_logs FOR INSERT WITH CHECK (is_super_admin());
  END IF;
END $$;

-- Add admin DELETE policy for verification_subscriptions (cleanup)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can delete subscriptions' AND tablename = 'verification_subscriptions') THEN
    CREATE POLICY "Admins can delete subscriptions" ON public.verification_subscriptions FOR DELETE USING (is_super_admin());
  END IF;
END $$;
