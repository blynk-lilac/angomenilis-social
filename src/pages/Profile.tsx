import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Heart, MessageCircle, MoreHorizontal, Settings } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Profile {
  id: string;
  username: string;
  first_name: string;
  avatar_url: string | null;
}

interface Post {
  id: string;
  content: string;
  media_url: string | null;
  created_at: string;
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
}

export default function Profile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (username) {
      loadProfile();
    }
  }, [username]);

  const loadProfile = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single();

      if (data) {
        setProfile(data);
        await Promise.all([
          checkFollowing(data.id),
          loadFollowCounts(data.id),
          loadUserPosts(data.id),
        ]);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkFollowing = async (profileId: string) => {
    if (!user) return;

    const { data } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', profileId)
      .maybeSingle();

    setIsFollowing(!!data);
  };

  const loadFollowCounts = async (profileId: string) => {
    const { count: followers } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', profileId);

    const { count: following } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', profileId);

    setFollowersCount(followers || 0);
    setFollowingCount(following || 0);
  };

  const loadUserPosts = async (profileId: string) => {
    try {
      const { data: postsData } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', profileId)
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
    }
  };

  const handleFollow = async () => {
    if (!user || !profile) return;

    try {
      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', profile.id);
      } else {
        await supabase.from('follows').insert({
          follower_id: user.id,
          following_id: profile.id,
        });
      }
      loadProfile();
    } catch (error) {
      console.error('Error toggling follow:', error);
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
      if (profile) loadUserPosts(profile.id);
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

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-6 text-center">
        <p className="text-muted-foreground mb-4">Perfil não encontrado</p>
        <Button onClick={() => navigate('/')}>Voltar</Button>
      </div>
    );
  }

  const isOwnProfile = user?.id === profile.id;

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="flex items-center justify-between h-14 px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">{profile.first_name}</h1>
          {isOwnProfile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/settings')}
              className="rounded-full"
            >
              <Settings className="h-5 w-5" />
            </Button>
          )}
          {!isOwnProfile && <div className="w-10" />}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          {/* Profile Header */}
          <div className="p-6 border-b border-border">
            <div className="flex items-start gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-3xl">
                  {profile.first_name[0]}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <h2 className="text-xl font-bold">{profile.first_name}</h2>
                <p className="text-muted-foreground">@{profile.username}</p>

                <div className="flex gap-4 mt-3">
                  <div>
                    <span className="font-bold">{followersCount}</span>
                    <span className="text-muted-foreground ml-1">seguidores</span>
                  </div>
                  <div>
                    <span className="font-bold">{followingCount}</span>
                    <span className="text-muted-foreground ml-1">a seguir</span>
                  </div>
                </div>

                {!isOwnProfile && (
                  <div className="flex gap-2 mt-4">
                    <Button
                      onClick={handleFollow}
                      variant={isFollowing ? 'secondary' : 'default'}
                      className="rounded-full flex-1"
                    >
                      {isFollowing ? 'A seguir' : 'Seguir'}
                    </Button>
                    <Button
                      onClick={() => navigate(`/chat/${profile.id}`)}
                      variant="outline"
                      className="rounded-full flex-1"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Mensagem
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="posts" className="w-full">
            <TabsList className="w-full grid grid-cols-4 h-auto rounded-none border-b border-border bg-transparent">
              <TabsTrigger
                value="posts"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                Publicações
              </TabsTrigger>
              <TabsTrigger
                value="sobre"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                Sobre
              </TabsTrigger>
              <TabsTrigger
                value="reels"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                Reels
              </TabsTrigger>
              <TabsTrigger
                value="fotos"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                Fotos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="posts" className="mt-0">
              {posts.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  Nenhuma publicação ainda
                </div>
              ) : (
                posts.map((post) => (
                  <div key={post.id} className="p-4 border-b border-border">
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

                      <button className="ml-auto">
                        <MoreHorizontal className="h-5 w-5" />
                      </button>
                    </div>

                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDistanceToNow(new Date(post.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="sobre" className="p-6">
              <p className="text-muted-foreground">Detalhes do perfil em breve...</p>
            </TabsContent>

            <TabsContent value="reels" className="p-6">
              <p className="text-muted-foreground">Reels em breve...</p>
            </TabsContent>

            <TabsContent value="fotos" className="p-6">
              <p className="text-muted-foreground">Fotos em breve...</p>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
