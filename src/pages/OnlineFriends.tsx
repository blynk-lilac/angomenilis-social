import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, MessageCircle, UserCheck } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import VerificationBadge from "@/components/VerificationBadge";
import { useOnlineUsers } from "@/hooks/useOnlineUsers";

interface OnlineFriend {
  id: string;
  username: string;
  first_name: string;
  full_name: string;
  avatar_url: string;
  verified: boolean;
  badge_type: string | null;
}

export default function OnlineFriends() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const onlineUsers = useOnlineUsers();
  const [onlineFriends, setOnlineFriends] = useState<OnlineFriend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadOnlineFriends();
    }
  }, [user, onlineUsers]);

  const loadOnlineFriends = async () => {
    if (!user) return;

    // Get all friends (from friendships and follows)
    const { data: friendships } = await supabase
      .from("friendships")
      .select("user_id_1, user_id_2")
      .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`);

    const { data: followers } = await supabase
      .from("follows")
      .select("follower_id, following_id")
      .or(`follower_id.eq.${user.id},following_id.eq.${user.id}`);

    // Collect all related user IDs
    const friendIds = new Set<string>();
    
    friendships?.forEach(f => {
      if (f.user_id_1 !== user.id) friendIds.add(f.user_id_1);
      if (f.user_id_2 !== user.id) friendIds.add(f.user_id_2);
    });

    followers?.forEach(f => {
      if (f.follower_id !== user.id) friendIds.add(f.follower_id);
      if (f.following_id !== user.id) friendIds.add(f.following_id);
    });

    // Filter to only online users
    const onlineFriendIds = Array.from(friendIds).filter(id => onlineUsers.has(id));

    if (onlineFriendIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, first_name, full_name, avatar_url, verified, badge_type")
        .in("id", onlineFriendIds);

      if (profiles) {
        setOnlineFriends(profiles);
      }
    } else {
      setOnlineFriends([]);
    }

    setLoading(false);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
          <div className="flex items-center gap-4 px-4 h-14">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">Amigos Online</h1>
            <span className="ml-auto text-sm text-muted-foreground">
              {onlineFriends.length} online
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="pt-16 pb-20 px-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <Card key={i} className="p-4 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 rounded-full bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-32 bg-muted rounded" />
                      <div className="h-3 w-24 bg-muted rounded" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : onlineFriends.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="text-6xl mb-4">😴</div>
              <h2 className="text-lg font-semibold mb-2">Nenhum amigo online</h2>
              <p className="text-muted-foreground text-sm">
                Seus amigos e seguidores aparecerão aqui quando estiverem online
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {onlineFriends.map(friend => (
                <Card
                  key={friend.id}
                  className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigate(`/profile/${friend.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-14 w-14 ring-2 ring-green-500/30">
                        <AvatarImage src={friend.avatar_url} />
                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 font-semibold text-lg">
                          {friend.first_name?.[0] || friend.username?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      {/* Online indicator */}
                      <div className="absolute bottom-0 right-0 h-4 w-4 bg-green-500 rounded-full border-2 border-background" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold truncate">
                          {friend.full_name || friend.first_name || friend.username}
                        </span>
                        {friend.verified && (
                          <VerificationBadge verified={friend.verified} badgeType={friend.badge_type} size="sm" />
                        )}
                      </div>
                      <p className="text-sm text-green-600 flex items-center gap-1">
                        <span className="inline-block h-2 w-2 bg-green-500 rounded-full" />
                        Online agora
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/chat/${friend.id}`);
                        }}
                      >
                        <MessageCircle className="h-5 w-5" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="rounded-full"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <UserCheck className="h-4 w-4 mr-1" />
                        Seguindo
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
