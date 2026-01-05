-- Step 1: Create the has_role function first
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Step 2: Create user_suspensions table
CREATE TABLE public.user_suspensions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    suspension_type TEXT NOT NULL DEFAULT 'temporary',
    reason TEXT,
    suspended_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE,
    suspended_by UUID,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Step 3: Create user_action_limits table
CREATE TABLE public.user_action_limits (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    action_type TEXT NOT NULL,
    action_count INTEGER DEFAULT 0,
    last_action_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    reset_at TIMESTAMP WITH TIME ZONE,
    is_suspended BOOLEAN DEFAULT false,
    suspended_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, action_type)
);

-- Step 4: Create username_attempts table
CREATE TABLE public.username_attempts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    attempted_username TEXT NOT NULL,
    attempt_count INTEGER DEFAULT 1,
    last_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    is_blocked BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Step 5: Enable RLS
ALTER TABLE public.user_suspensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_action_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.username_attempts ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies
CREATE POLICY "Users can view their own suspensions"
ON public.user_suspensions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage suspensions"
ON public.user_suspensions
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::text));

CREATE POLICY "Users can view and update their own limits"
ON public.user_action_limits
FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own attempts"
ON public.username_attempts
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can manage username attempts"
ON public.username_attempts
FOR ALL
USING (true);

-- Step 7: Create helper functions
CREATE OR REPLACE FUNCTION public.is_user_suspended(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_suspensions
        WHERE user_id = _user_id
        AND is_active = true
        AND (expires_at IS NULL OR expires_at > now())
    )
$$;

CREATE OR REPLACE FUNCTION public.check_action_limit(_user_id UUID, _action_type TEXT, _limit INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_record user_action_limits%ROWTYPE;
BEGIN
    SELECT * INTO current_record
    FROM user_action_limits
    WHERE user_id = _user_id AND action_type = _action_type;
    
    IF NOT FOUND THEN
        INSERT INTO user_action_limits (user_id, action_type, action_count, reset_at)
        VALUES (_user_id, _action_type, 1, now() + interval '1 day')
        RETURNING * INTO current_record;
        
        RETURN jsonb_build_object('allowed', true, 'count', 1, 'suspended', false);
    END IF;
    
    IF current_record.is_suspended AND current_record.suspended_until > now() THEN
        RETURN jsonb_build_object(
            'allowed', false, 
            'count', current_record.action_count,
            'suspended', true,
            'suspended_until', current_record.suspended_until
        );
    END IF;
    
    IF current_record.reset_at < now() THEN
        UPDATE user_action_limits
        SET action_count = 1, reset_at = now() + interval '1 day', is_suspended = false
        WHERE id = current_record.id;
        
        RETURN jsonb_build_object('allowed', true, 'count', 1, 'suspended', false);
    END IF;
    
    IF current_record.action_count >= _limit THEN
        UPDATE user_action_limits
        SET is_suspended = true, suspended_until = now() + interval '24 hours'
        WHERE id = current_record.id;
        
        RETURN jsonb_build_object(
            'allowed', false,
            'count', current_record.action_count,
            'suspended', true,
            'suspended_until', now() + interval '24 hours'
        );
    END IF;
    
    UPDATE user_action_limits
    SET action_count = action_count + 1, last_action_at = now()
    WHERE id = current_record.id;
    
    RETURN jsonb_build_object(
        'allowed', true,
        'count', current_record.action_count + 1,
        'suspended', false
    );
END
$$;