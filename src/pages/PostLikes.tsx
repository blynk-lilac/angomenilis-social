import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, MessageCircle, Users } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import VerificationBadge from "@/components/VerificationBadge";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface LikeUser {
  id: string;
  user_id: string;
  reaction_type: string;
  profiles: {
    id: string;
    username: string;
    full_name: string;
    first_name: string;
    avatar_url: string;
    verified: boolean;
    badge_type: string | null;
  };
}

interface MutualFriend {
  id: string;
  username: string;
  avatar_url: string;
}

export default function PostLikes() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [likes, setLikes] = useState<LikeUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [followStatus, setFollowStatus] = useState<{ [key: string]: boolean }>({});
  const [mutualFriends, setMutualFriends] = useState<{ [key: string]: MutualFriend[] }>({});
  const [followerCounts, setFollowerCounts] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    loadCurrentUser();
    loadLikes();

    const channel = supabase
      .channel("likes-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "post_reactions" }, () => loadLikes())
      .on("postgres_changes", { event: "*", schema: "public", table: "follows" }, () => loadFollowStatus())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [postId]);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  };

  const loadLikes = async () => {
    if (!postId) return;

    const { data, error } = await supabase
      .from("post_reactions")
      .select(`
        id,
        user_id,
        reaction_type,
        profiles (
          id,
          username,
          full_name,
          first_name,
          avatar_url,
          verified,
          badge_type
        )
      `)
      .eq("post_id", postId);

    if (error) {
      toast.error("Erro ao carregar curtidas");
      return;
    }

    setLikes(data || []);
    await loadFollowStatus(data?.map(l => l.user_id) || []);
    await loadMutualFriends(data?.map(l => l.user_id) || []);
    await loadFollowerCounts(data?.map(l => l.user_id) || []);
    setLoading(false);
  };

  const loadFollowStatus = async (userIds?: string[]) => {
    if (!currentUserId) return;
    const ids = userIds || likes.map(l => l.user_id);
    
    const { data } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", currentUserId)
      .in("following_id", ids);

    const status: { [key: string]: boolean } = {};
    ids.forEach(id => { status[id] = false; });
    data?.forEach(f => { status[f.following_id] = true; });
    setFollowStatus(status);
  };

  const loadMutualFriends = async (userIds: string[]) => {
    if (!currentUserId || userIds.length === 0) return;

    const { data: myFollowing } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", currentUserId);

    const myFollowingIds = myFollowing?.map(f => f.following_id) || [];

    const mutual: { [key: string]: MutualFriend[] } = {};

    for (const userId of userIds) {
      if (userId === currentUserId) continue;

      const { data: theirFollowing } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", userId);

      const theirFollowingIds = theirFollowing?.map(f => f.following_id) || [];
      const mutualIds = myFollowingIds.filter(id => theirFollowingIds.includes(id)).slice(0, 3);

      if (mutualIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .in("id", mutualIds);

        mutual[userId] = profiles || [];
      }
    }

    setMutualFriends(mutual);
  };

  const loadFollowerCounts = async (userIds: string[]) => {
    const counts: { [key: string]: number } = {};
    
    for (const userId of userIds) {
      const { count } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", userId);
      
      counts[userId] = count || 0;
    }
    
    setFollowerCounts(counts);
  };

  const handleFollow = async (userId: string) => {
    if (!currentUserId || userId === currentUserId) return;

    if (followStatus[userId]) {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", currentUserId)
        .eq("following_id", userId);
      
      setFollowStatus(prev => ({ ...prev, [userId]: false }));
      setFollowerCounts(prev => ({ ...prev, [userId]: (prev[userId] || 1) - 1 }));
    } else {
      await supabase
        .from("follows")
        .insert({ follower_id: currentUserId, following_id: userId });
      
      setFollowStatus(prev => ({ ...prev, [userId]: true }));
      setFollowerCounts(prev => ({ ...prev, [userId]: (prev[userId] || 0) + 1 }));
    }
  };

  const getReactionEmoji = (type: string) => {
    const emojis: { [key: string]: string } = {
      heart: "❤️",
      laughing: "😂",
      sad: "😢",
      angry: "😡",
      "thumbs-up": "👍"
    };
    return emojis[type] || "❤️";
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-b">
          <div className="flex items-center justify-between px-4 h-14">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-semibold text-lg">Curtidas</h1>
            <div className="w-10" />
          </div>
        </div>

        <div className="pt-16 pb-8">
          <AnimatePresence>
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
              </div>
            ) : likes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Users className="h-10 w-10 text-muted-foreground" />
                </div>
                <p className="text-lg font-medium">Nenhuma curtida ainda</p>
                <p className="text-sm text-muted-foreground mt-1">Seja o primeiro a curtir!</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {likes.map((like, index) => (
                  <motion.div
                    key={like.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar with reaction badge */}
                      <Link to={`/profile/${like.user_id}`} className="relative">
                        <Avatar className="h-14 w-14 ring-2 ring-border">
                          <AvatarImage src={like.profiles.avatar_url} />
                          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 font-semibold text-lg">
                            {like.profiles.first_name?.[0] || like.profiles.username?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="absolute -bottom-1 -right-1 text-lg bg-card rounded-full p-0.5 border-2 border-background">
                          {getReactionEmoji(like.reaction_type)}
                        </span>
                      </Link>

                      {/* User info */}
                      <div className="flex-1 min-w-0">
                        <Link to={`/profile/${like.user_id}`} className="flex items-center gap-1.5">
                          <span className="font-semibold text-[15px] hover:underline truncate">
                            {like.profiles.full_name || like.profiles.first_name || like.profiles.username}
                          </span>
                          {like.profiles.verified && (
                            <VerificationBadge 
                              verified={like.profiles.verified} 
                              badgeType={like.profiles.badge_type} 
                              className="h-4 w-4 flex-shrink-0" 
                            />
                          )}
                        </Link>
                        <p className="text-sm text-muted-foreground">@{like.profiles.username}</p>
                        
                        {/* Follower count */}
                        <p className="text-xs text-muted-foreground mt-1">
                          {followerCounts[like.user_id] || 0} seguidores
                        </p>

                        {/* Mutual friends */}
                        {mutualFriends[like.user_id]?.length > 0 && (
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex -space-x-2">
                              {mutualFriends[like.user_id].map((friend) => (
                                <Avatar key={friend.id} className="h-6 w-6 ring-2 ring-background">
                                  <AvatarImage src={friend.avatar_url} />
                                  <AvatarFallback className="text-xs bg-muted">
                                    {friend.username[0]}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {mutualFriends[like.user_id].length} amigos em comum
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-full"
                          onClick={() => navigate(`/chat/${like.user_id}`)}
                        >
                          <MessageCircle className="h-5 w-5" />
                        </Button>
                        
                        {like.user_id !== currentUserId && (
                          <Button
                            variant={followStatus[like.user_id] ? "outline" : "default"}
                            size="sm"
                            className="rounded-full px-4"
                            onClick={() => handleFollow(like.user_id)}
                          >
                            {followStatus[like.user_id] ? "Seguindo" : "Seguir"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </ProtectedRoute>
  );
}
