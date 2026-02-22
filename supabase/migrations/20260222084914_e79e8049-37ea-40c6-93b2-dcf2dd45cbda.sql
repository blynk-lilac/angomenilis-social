
-- Add UPDATE policy for verification_subscriptions so service role and users can see updates
-- The service role already bypasses RLS, but let's ensure proper policies exist

-- Allow users to update their own pending subscriptions (e.g., cancel)
CREATE POLICY "Users can update own subscriptions"
ON public.verification_subscriptions
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to view withdrawal requests they created  
-- (already exists, skip if error)

-- Ensure withdrawal_requests has update policy for users to see status changes
CREATE POLICY "Users can view updated withdrawals"
ON public.withdrawal_requests
FOR UPDATE
USING (auth.uid() = user_id);

-- Ensure admin_payment_logs INSERT works with service role (already has with_check true)
-- Add SELECT policy for authenticated users to see their own payment logs
CREATE POLICY "Users can view own payment logs"
ON public.admin_payment_logs
FOR SELECT
USING (auth.uid() = user_id);
