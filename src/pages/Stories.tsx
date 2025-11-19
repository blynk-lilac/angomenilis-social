import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, Play, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { StoryViewer } from '@/components/story/StoryViewer';

interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: string;
  created_at: string;
  profile: {
    username: string;
    first_name: string;
    avatar_url: string | null;
  };
}

export default function Stories() {
  const { user } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [uploading, setUploading] = useState(false);
  const [activeUserStories, setActiveUserStories] = useState<Story[] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user) {
      loadStories();
    }
  }, [user]);

  const loadStories = async () => {
    const { data } = await supabase
      .from('stories')
      .select(`
        *,
        profile:profiles(username, first_name, avatar_url)
      `)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (data) {
      setStories(data as any);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !user) return;

    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;
    const mediaType = file.type.startsWith('image/') ? 'image' : 'video';

    setUploading(true);

    try {
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('stories')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('stories')
        .getPublicUrl(fileName);

      // Create story record
      const { error: insertError } = await supabase
        .from('stories')
        .insert({
          user_id: user.id,
          media_url: publicUrl,
          media_type: mediaType,
        });

      if (insertError) throw insertError;

      toast.success('Story publicada!');
      loadStories();
    } catch (error) {
      console.error('Error uploading story:', error);
      toast.error('Erro ao publicar story');
    } finally {
      setUploading(false);
    }
  };

  // Filter stories by search query
  const filteredStories = stories.filter(story => 
    story.profile.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    story.profile.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <MainLayout title="Stories">
      <div className="p-4">
        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Pesquisa"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-muted/50 border-none rounded-xl h-12"
            />
          </div>
        </div>

        {/* Add Story Button */}
        <div className="mb-6">
          <label htmlFor="story-upload">
            <div className="flex items-center gap-3 p-4 border-2 border-dashed border-border rounded-2xl cursor-pointer hover:border-primary transition-colors">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Plus className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">Adicionar Story</p>
                <p className="text-sm text-muted-foreground">
                  Compartilhe fotos ou vídeos
                </p>
              </div>
            </div>
            <Input
              id="story-upload"
              type="file"
              accept="image/*,video/*"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>

        {/* Stories Grid agrupadas por usuário */}
        {filteredStories.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 text-center">
            <p className="text-muted-foreground">
              Nenhuma story disponível
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Seja o primeiro a publicar!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
            {Object.values(
              filteredStories.reduce((acc: Record<string, Story[]>, story) => {
                if (!acc[story.user_id]) acc[story.user_id] = [];
                acc[story.user_id].push(story);
                return acc;
              }, {})
            ).map((userStories) => {
              const [first] = userStories;
              return (
                <div
                  key={first.user_id}
                  onClick={() => setActiveUserStories(userStories)}
                  className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-muted cursor-pointer group"
                >
                  {first.media_type === 'image' ? (
                    <img
                      src={first.media_url}
                      alt="Story"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="relative w-full h-full">
                      <video
                        src={first.media_url}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center group-hover:bg-black/40 transition-colors">
                        <Play className="h-12 w-12 text-white" />
                      </div>
                    </div>
                  )}
                  
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8 border-2 border-white">
                        <AvatarImage src={first.profile.avatar_url || undefined} />
                        <AvatarFallback>
                          {first.profile.first_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-white text-sm font-semibold">
                          {first.profile.first_name}
                        </p>
                        <p className="text-white/80 text-xs">
                          @{first.profile.username}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {activeUserStories && (
        <StoryViewer
          stories={activeUserStories}
          initialIndex={0}
          onClose={() => setActiveUserStories(null)}
          onDelete={loadStories}
        />
      )}
    </MainLayout>
  );
}
