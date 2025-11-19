-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view group members of their groups" ON public.group_members;
DROP POLICY IF EXISTS "Group creators can add members" ON public.group_members;

-- Create a security definer function to check if user is a group member
CREATE OR REPLACE FUNCTION public.is_group_member(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members
    WHERE user_id = _user_id
      AND group_id = _group_id
  )
$$;

-- Create a security definer function to check if user is the group creator
CREATE OR REPLACE FUNCTION public.is_group_creator(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.groups
    WHERE id = _group_id
      AND created_by = _user_id
  )
$$;

-- Recreate policies using security definer functions
CREATE POLICY "Users can view group members of their groups"
ON public.group_members
FOR SELECT
TO authenticated
USING (public.is_group_member(auth.uid(), group_id));

CREATE POLICY "Group creators can add members"
ON public.group_members
FOR INSERT
TO authenticated
WITH CHECK (public.is_group_creator(auth.uid(), group_id));