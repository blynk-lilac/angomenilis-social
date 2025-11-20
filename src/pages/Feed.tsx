import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Heart, MessageCircle, Share2, MoreHorizontal, Image as ImageIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Post {
  id: string;
  content: string;
  media_url: string | null;
  media_type: string;
  created_at: string;
  user_id: string;
  profiles: {
    first_name: string;
    username: string;
    avatar_url: string | null;
  };
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
}

export default function Feed() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const { data: postsData } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (first_name, username, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (postsData) {
        const postsWithCounts = await Promise.all(
          postsData.map(async (post) => {
            const { count: likesCount } = await supabase
              .from('post_likes')
              .select('*', { count: 'exact', head: true })
              .eq('post_id', post.id);

            const { count: commentsCount } = await supabase
              .from('post_comments')
              .select('*', { count: 'exact', head: true })
              .eq('post_id', post.id);

            const { data: likeData } = await supabase
              .from('post_likes')
              .select('id')
              .eq('post_id', post.id)
              .eq('user_id', user?.id)
              .maybeSingle();

            return {
              ...post,
              likes_count: likesCount || 0,
              comments_count: commentsCount || 0,
              is_liked: !!likeData,
            };
          })
        );
        setPosts(postsWithCounts);
      }
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!newPost.trim() || !user) return;

    try {
      await supabase.from('posts').insert({
        user_id: user.id,
        content: newPost,
      });

      setNewPost('');
      loadPosts();
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  const handleLike = async (postId: string, isLiked: boolean) => {
    if (!user) return;

    try {
      if (isLiked) {
        await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
      } else {
        await supabase.from('post_likes').insert({
          post_id: postId,
          user_id: user.id,
        });
      }
      loadPosts();
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="flex items-center justify-between h-14 px-4">
          <h1 className="text-2xl font-bold">Blynk</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/settings')}
            className="rounded-full"
          >
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          {/* Create Post */}
          <div className="p-4 border-b border-border bg-card">
            <div className="flex gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {user?.user_metadata?.first_name?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Textarea
                  placeholder="Em que estás a pensar?"
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  className="min-h-[80px] resize-none border-0 bg-muted focus-visible:ring-0"
                />
                <div className="flex items-center justify-between mt-2">
                  <Button variant="ghost" size="sm">
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Foto
                  </Button>
                  <Button
                    onClick={handleCreatePost}
                    disabled={!newPost.trim()}
                    size="sm"
                  >
                    Publicar
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Posts Feed */}
          {posts.map((post) => (
            <div key={post.id} className="p-4 border-b border-border bg-card">
              <div className="flex gap-3">
                <Avatar
                  className="h-10 w-10 cursor-pointer"
                  onClick={() => navigate(`/perfil/${post.profiles.username}`)}
                >
                  <AvatarImage src={post.profiles.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {post.profiles.first_name[0]}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <p
                        className="font-semibold cursor-pointer hover:underline"
                        onClick={() => navigate(`/perfil/${post.profiles.username}`)}
                      >
                        {post.profiles.first_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(post.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>

                  <p className="mb-3 whitespace-pre-wrap">{post.content}</p>

                  {post.media_url && (
                    <img
                      src={post.media_url}
                      alt="Post media"
                      className="rounded-lg w-full mb-3"
                    />
                  )}

                  <div className="flex items-center gap-4 text-muted-foreground">
                    <button
                      onClick={() => handleLike(post.id, post.is_liked)}
                      className="flex items-center gap-1 hover:text-destructive transition-colors"
                    >
                      <Heart
                        className={`h-5 w-5 ${
                          post.is_liked ? 'fill-destructive text-destructive' : ''
                        }`}
                      />
                      <span className="text-sm">{post.likes_count}</span>
                    </button>

                    <button className="flex items-center gap-1 hover:text-accent transition-colors">
                      <MessageCircle className="h-5 w-5" />
                      <span className="text-sm">{post.comments_count}</span>
                    </button>

                    <button className="flex items-center gap-1 hover:text-accent transition-colors">
                      <Share2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
