-- CTF Teams System
CREATE TABLE IF NOT EXISTS public.ctf_teams (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    description text,
    avatar_url text,
    leader_id uuid NOT NULL,
    total_points integer DEFAULT 0,
    is_public boolean DEFAULT true,
    invite_code text DEFAULT encode(extensions.gen_random_bytes(6), 'hex'),
    created_at timestamp with time zone DEFAULT now()
);

-- Team Members
CREATE TABLE IF NOT EXISTS public.ctf_team_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id uuid REFERENCES public.ctf_teams(id) ON DELETE CASCADE NOT NULL,
    user_id uuid NOT NULL,
    role text DEFAULT 'member',
    joined_at timestamp with time zone DEFAULT now(),
    UNIQUE(team_id, user_id)
);

-- CTF Rewards System
CREATE TABLE IF NOT EXISTS public.ctf_rewards (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    icon text,
    points_required integer NOT NULL,
    reward_type text NOT NULL DEFAULT 'badge',
    reward_value jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

-- User Rewards
CREATE TABLE IF NOT EXISTS public.ctf_user_rewards (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    reward_id uuid REFERENCES public.ctf_rewards(id) ON DELETE CASCADE NOT NULL,
    claimed_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id, reward_id)
);

-- Challenge Files for Download
ALTER TABLE public.ctf_challenges 
ADD COLUMN IF NOT EXISTS file_url text,
ADD COLUMN IF NOT EXISTS challenge_url text,
ADD COLUMN IF NOT EXISTS reward_points integer DEFAULT 0;

-- Enable RLS
ALTER TABLE public.ctf_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ctf_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ctf_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ctf_user_rewards ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Teams
CREATE POLICY "Anyone can view public teams" ON public.ctf_teams
FOR SELECT USING (is_public = true);

CREATE POLICY "Team leaders can update their teams" ON public.ctf_teams
FOR UPDATE USING (auth.uid() = leader_id);

CREATE POLICY "Authenticated users can create teams" ON public.ctf_teams
FOR INSERT WITH CHECK (auth.uid() = leader_id);

CREATE POLICY "Team leaders can delete their teams" ON public.ctf_teams
FOR DELETE USING (auth.uid() = leader_id);

-- RLS Policies for Team Members
CREATE POLICY "Anyone can view team members" ON public.ctf_team_members
FOR SELECT USING (true);

CREATE POLICY "Users can join teams" ON public.ctf_team_members
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave teams" ON public.ctf_team_members
FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for Rewards
CREATE POLICY "Anyone can view rewards" ON public.ctf_rewards
FOR SELECT USING (is_active = true);

-- RLS Policies for User Rewards
CREATE POLICY "Users can view their rewards" ON public.ctf_user_rewards
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can claim rewards" ON public.ctf_user_rewards
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Insert default rewards
INSERT INTO public.ctf_rewards (name, description, icon, points_required, reward_type, reward_value)
VALUES 
    ('Iniciante Hacker', 'Complete seu primeiro desafio', '🎯', 50, 'badge', '{"color": "green"}'),
    ('Script Kiddie', 'Acumule 500 pontos', '💻', 500, 'badge', '{"color": "blue"}'),
    ('Hacker Ético', 'Acumule 2000 pontos', '🔐', 2000, 'badge', '{"color": "purple"}'),
    ('Cyber Warrior', 'Acumule 5000 pontos', '⚔️', 5000, 'badge', '{"color": "orange"}'),
    ('Elite Hacker', 'Acumule 10000 pontos', '👑', 10000, 'badge', '{"color": "gold"}'),
    ('Crypto Master', 'Complete 20 desafios de criptografia', '🔑', 2000, 'badge', '{"category": "crypto"}'),
    ('Web Hunter', 'Complete 25 desafios web', '🌐', 2500, 'badge', '{"category": "web"}'),
    ('Forensic Expert', 'Complete 15 desafios forenses', '🔍', 1500, 'badge', '{"category": "forensics"}'),
    ('Binary Ninja', 'Complete 20 desafios de exploração', '🥷', 2000, 'badge', '{"category": "pwn"}'),
    ('Reverse King', 'Complete 20 desafios de eng. reversa', '⚙️', 2000, 'badge', '{"category": "reverse"}'),
    ('Shadow Agent', 'Complete 15 desafios OSINT', '🕵️', 1500, 'badge', '{"category": "osint"}'),
    ('Stego Master', 'Complete 15 desafios de esteganografia', '🖼️', 1500, 'badge', '{"category": "steganography"}')
ON CONFLICT DO NOTHING;