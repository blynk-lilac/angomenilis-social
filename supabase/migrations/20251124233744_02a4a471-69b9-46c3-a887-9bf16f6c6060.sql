-- Criar tabela de músicas em destaque
CREATE TABLE IF NOT EXISTS trending_music (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  artist TEXT NOT NULL,
  cover_url TEXT,
  audio_url TEXT NOT NULL,
  duration INTEGER NOT NULL,
  play_count INTEGER DEFAULT 0,
  is_trending BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE trending_music ENABLE ROW LEVEL SECURITY;

-- Policies para trending_music
CREATE POLICY "Músicas em destaque são públicas" ON trending_music FOR SELECT USING (true);
CREATE POLICY "Admins podem gerenciar músicas em destaque" ON trending_music FOR ALL USING (auth.role() = 'authenticated');

-- Inserir música padrão
INSERT INTO trending_music (name, artist, cover_url, audio_url, duration, is_trending)
VALUES (
  'Cold Keys Warm Steel',
  'Trending Artist',
  'https://via.placeholder.com/300x300?text=Trending',
  '/music/trending/cold-keys-warm-steel.mp3',
  180,
  true
)
ON CONFLICT DO NOTHING;