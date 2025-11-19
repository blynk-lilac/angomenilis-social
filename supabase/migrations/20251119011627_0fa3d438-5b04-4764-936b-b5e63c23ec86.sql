-- Fix groups RLS policy to allow creators to view their groups
DROP POLICY IF EXISTS "Users can view groups they are members of" ON public.groups;

-- Create new policy that allows both members and creators to view groups
CREATE POLICY "Users can view their groups"
ON public.groups
FOR SELECT
TO authenticated
USING (
  auth.uid() = created_by OR
  EXISTS (
    SELECT 1
    FROM public.group_members
    WHERE group_members.group_id = groups.id
      AND group_members.user_id = auth.uid()
  )
);