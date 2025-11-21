-- Criar tabela para posts salvos
CREATE TABLE IF NOT EXISTS saved_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- Criar tabela para preferências de posts (com interesse / sem interesse / não quero ver)
CREATE TABLE IF NOT EXISTS post_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  preference_type text NOT NULL CHECK (preference_type IN ('interested', 'not_interested', 'hide')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- Criar tabela para notificações de posts
CREATE TABLE IF NOT EXISTS post_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- RLS policies para saved_posts
ALTER TABLE saved_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own saved posts"
  ON saved_posts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can save posts"
  ON saved_posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave posts"
  ON saved_posts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS policies para post_preferences
ALTER TABLE post_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own preferences"
  ON post_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can set preferences"
  ON post_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update preferences"
  ON post_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete preferences"
  ON post_preferences FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS policies para post_notifications
ALTER TABLE post_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications settings"
  ON post_notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can set notifications"
  ON post_notifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update notifications"
  ON post_notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete notifications"
  ON post_notifications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Índices para performance
CREATE INDEX idx_saved_posts_user_id ON saved_posts(user_id);
CREATE INDEX idx_saved_posts_post_id ON saved_posts(post_id);
CREATE INDEX idx_post_preferences_user_id ON post_preferences(user_id);
CREATE INDEX idx_post_preferences_post_id ON post_preferences(post_id);
CREATE INDEX idx_post_notifications_user_id ON post_notifications(user_id);
CREATE INDEX idx_post_notifications_post_id ON post_notifications(post_id);