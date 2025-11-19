-- Add new columns to group_members table for nicknames and mute settings
ALTER TABLE public.group_members ADD COLUMN IF NOT EXISTS nickname text;
ALTER TABLE public.group_members ADD COLUMN IF NOT EXISTS is_muted boolean DEFAULT false;

-- Add new columns to groups table for permissions
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS all_members_can_send boolean DEFAULT true;
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS all_members_can_edit_info boolean DEFAULT false;