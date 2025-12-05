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

interface UserProfile {
  id: string;
  username: string;
  first_name: string;
  full_name: string | null;
  avatar_url: string | null;
  verified: boolean;
  badge_type: string | null;
  mutualFriends: number;
}

export function UserSuggestions() {
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadSuggestions();
  }, []);

  const loadSuggestions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      // Get existing friendships to exclude
      const { data: friendships } = await supabase
        .from("friendships")
        .select("user_id_1, user_id_2")
        .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`);

      const friendIds = new Set(
        friendships?.flatMap(f => [f.user_id_1, f.user_id_2]) || []
      );

      // Get random users excluding friends and self
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, first_name, full_name, avatar_url, verified, badge_type")
        .neq("id", user.id)
        .limit(20);

      if (profiles) {
        // Filter out friends and shuffle
        const nonFriends = profiles
          .filter(p => !friendIds.has(p.id))
          .map(p => ({ ...p, mutualFriends: Math.floor(Math.random() * 15) }))
          .sort(() => Math.random() - 0.5)
          .slice(0, 6);

        setSuggestions(nonFriends);
      }
    } catch (error) {
      console.error("Error loading suggestions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async (userId: string) => {
    if (!currentUserId) return;

    try {
      // Check if request already exists
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
    <Card className="bg-card border border-border/30 rounded-lg sm:rounded-xl overflow-hidden shadow-sm my-4">
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">Pessoas que talvez conheças</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-primary text-sm"
            onClick={() => navigate("/friends")}
          >
            Ver tudo
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      <ScrollArea className="w-full">
        <div className="flex gap-3 p-4">
          {visibleSuggestions.map((user) => (
            <Card 
              key={user.id} 
              className="flex-shrink-0 w-44 bg-muted/30 border-border/50 overflow-hidden"
            >
              {/* Cover/Avatar Area */}
              <div 
                className="relative h-32 bg-gradient-to-br from-primary/20 to-accent/20 cursor-pointer"
                onClick={() => handleNavigateToProfile(user.id)}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 rounded-full bg-background/80 hover:bg-background"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDismiss(user.id);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
                  <Avatar className="h-16 w-16 border-4 border-card">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
                      {user.first_name[0]}
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
                  <span className="font-semibold text-sm text-foreground truncate">
                    {user.full_name || user.first_name}
                  </span>
                  {user.verified && <VerificationBadge verified={user.verified} badgeType={user.badge_type} size="sm" />}
                </div>
                
                {user.mutualFriends > 0 && (
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <div className="flex -space-x-1">
                      {[...Array(Math.min(3, user.mutualFriends))].map((_, i) => (
                        <div 
                          key={i} 
                          className="h-4 w-4 rounded-full bg-muted border border-card"
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {user.mutualFriends} amigos em comum
                    </span>
                  </div>
                )}

                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    className="flex-1 h-8 text-xs rounded-lg gap-1"
                    onClick={() => handleAddFriend(user.id)}
                  >
                    <UserPlus className="h-3 w-3" />
                    Adicionar
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </Card>
  );
}
