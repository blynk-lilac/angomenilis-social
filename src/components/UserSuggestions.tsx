import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { UserPlus, X, Users, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import VerificationBadge from "@/components/VerificationBadge";
import { motion, AnimatePresence } from "framer-motion";

interface UserProfile {
  id: string;
  username: string;
  first_name: string;
  full_name: string | null;
  avatar_url: string | null;
  verified: boolean;
  badge_type: string | null;
}

interface MutualFriend {
  id: string;
  avatar_url: string | null;
  first_name: string;
}

export function UserSuggestions() {
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [mutualFriendsMap, setMutualFriendsMap] = useState<{ [userId: string]: MutualFriend[] }>({});
  const [friendProfiles, setFriendProfiles] = useState<UserProfile[]>([]);
  const [friends, setFriends] = useState<string[]>([]);

  useEffect(() => {
    loadSuggestions();

    // Real-time subscription for friendships
    const channel = supabase
      .channel('suggestions-friendships')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, () => {
        loadSuggestions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (suggestions.length > 0 && friends.length > 0) {
      loadMutualFriends();
    }
  }, [suggestions, friends, friendProfiles]);

  const loadSuggestions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      // Get existing friendships
      const { data: friendships } = await supabase
        .from("friendships")
        .select("user_id_1, user_id_2")
        .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`);

      const friendIds = friendships?.map(f => 
        f.user_id_1 === user.id ? f.user_id_2 : f.user_id_1
      ) || [];
      
      setFriends(friendIds);

      // Load friend profiles for mutual friends display
      if (friendIds.length > 0) {
        const { data: fProfiles } = await supabase
          .from("profiles")
          .select("id, username, first_name, full_name, avatar_url, verified, badge_type")
          .in("id", friendIds);
        
        if (fProfiles) setFriendProfiles(fProfiles);
      }

      // Get random users excluding friends and self
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, first_name, full_name, avatar_url, verified, badge_type")
        .neq("id", user.id)
        .limit(20);

      if (profiles) {
        const friendIdsSet = new Set(friendIds);
        const nonFriends = profiles
          .filter(p => !friendIdsSet.has(p.id))
          .sort(() => Math.random() - 0.5)
          .slice(0, 8);

        setSuggestions(nonFriends);
      }
    } catch (error) {
      console.error("Error loading suggestions:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMutualFriends = async () => {
    if (!currentUserId || friends.length === 0) return;

    const mutualMap: { [userId: string]: MutualFriend[] } = {};

    for (const profile of suggestions) {
      const { data: theirFriendships } = await supabase
        .from("friendships")
        .select("user_id_1, user_id_2")
        .or(`user_id_1.eq.${profile.id},user_id_2.eq.${profile.id}`);

      if (theirFriendships) {
        const theirFriends = theirFriendships.map(f => 
          f.user_id_1 === profile.id ? f.user_id_2 : f.user_id_1
        );

        const mutual = friends.filter(f => theirFriends.includes(f));
        
        if (mutual.length > 0) {
          const mutualProfiles = friendProfiles
            .filter(fp => mutual.includes(fp.id))
            .slice(0, 3)
            .map(fp => ({
              id: fp.id,
              avatar_url: fp.avatar_url,
              first_name: fp.first_name
            }));
          
          mutualMap[profile.id] = mutualProfiles;
        }
      }
    }

    setMutualFriendsMap(mutualMap);
  };

  const handleAddFriend = async (userId: string) => {
    if (!currentUserId) return;

    try {
      const { data: existing } = await supabase
        .from("friend_requests")
        .select("id")
        .eq("sender_id", currentUserId)
        .eq("receiver_id", userId)
        .maybeSingle();

      if (existing) {
        toast.info("Pedido já enviado");
        return;
      }

      const { error } = await supabase.from("friend_requests").insert({
        sender_id: currentUserId,
        receiver_id: userId,
        status: "pending"
      });

      if (error) throw error;

      toast.success("Pedido de amizade enviado!");
      setDismissed(prev => new Set([...prev, userId]));
    } catch (error) {
      console.error("Error sending friend request:", error);
      toast.error("Erro ao enviar pedido");
    }
  };

  const handleDismiss = (userId: string) => {
    setDismissed(prev => new Set([...prev, userId]));
  };

  const handleNavigateToProfile = (userId: string) => {
    navigate(`/profile/${userId}`);
  };

  const visibleSuggestions = suggestions.filter(s => !dismissed.has(s.id));

  if (loading || visibleSuggestions.length === 0) return null;

  return (
    <Card className="bg-card border border-border/30 rounded-xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">Pessoas que talvez conheças</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-primary text-sm hover:bg-primary/10"
            onClick={() => navigate("/friends")}
          >
            Ver tudo
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      <ScrollArea className="w-full">
        <div className="flex gap-3 p-4">
          <AnimatePresence>
            {visibleSuggestions.map((user, index) => {
              const mutualFriends = mutualFriendsMap[user.id] || [];
              
              return (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="flex-shrink-0 w-44 bg-muted/20 border-border/50 overflow-hidden hover:shadow-md transition-shadow">
                    {/* Cover/Avatar Area */}
                    <div 
                      className="relative h-28 bg-gradient-to-br from-primary/20 via-accent/10 to-secondary/20 cursor-pointer"
                      onClick={() => handleNavigateToProfile(user.id)}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 rounded-full bg-background/80 hover:bg-background z-10"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDismiss(user.id);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
                        <Avatar className="h-16 w-16 border-4 border-card ring-2 ring-background">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-xl font-bold">
                            {user.first_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="pt-10 pb-3 px-3 text-center">
                      <div 
                        className="flex items-center justify-center gap-1 cursor-pointer hover:underline"
                        onClick={() => handleNavigateToProfile(user.id)}
                      >
                        <span className="font-semibold text-sm text-foreground truncate max-w-[120px]">
                          {user.full_name || user.first_name}
                        </span>
                        {user.verified && (
                          <VerificationBadge verified={user.verified} badgeType={user.badge_type} size="sm" />
                        )}
                      </div>
                      
                      {/* Mutual Friends with Real Avatars */}
                      {mutualFriends.length > 0 ? (
                        <div className="flex items-center justify-center gap-1.5 mt-2">
                          <div className="flex -space-x-2">
                            {mutualFriends.map((mf) => (
                              <Avatar key={mf.id} className="h-5 w-5 border-2 border-card">
                                <AvatarImage src={mf.avatar_url || undefined} />
                                <AvatarFallback className="text-[8px] bg-muted">
                                  {mf.first_name?.[0]}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {mutualFriends.length} em comum
                          </span>
                        </div>
                      ) : (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          @{user.username}
                        </p>
                      )}

                      <div className="mt-3">
                        <Button
                          size="sm"
                          className="w-full h-8 text-xs rounded-lg gap-1"
                          onClick={() => handleAddFriend(user.id)}
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          Adicionar
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </Card>
  );
}
