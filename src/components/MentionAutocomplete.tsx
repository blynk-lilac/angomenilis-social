import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
}

interface MentionAutocompleteProps {
  query: string;
  onSelect: (username: string) => void;
  position: { top: number; left: number };
}

export default function MentionAutocomplete({ query, onSelect, position }: MentionAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query || query.length < 1) {
      setSuggestions([]);
      return;
    }

    const loadSuggestions = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Buscar amigos e seguidores
        const { data: friendships } = await supabase
          .from("friendships")
          .select("user_id_1, user_id_2")
          .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`);

        const { data: following } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", user.id);

        const friendIds = new Set<string>();
        friendships?.forEach(f => {
          friendIds.add(f.user_id_1 === user.id ? f.user_id_2 : f.user_id_1);
        });
        following?.forEach(f => friendIds.add(f.following_id));

        if (friendIds.size === 0) {
          setSuggestions([]);
          return;
        }

        // Buscar perfis que correspondem à query
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url")
          .in("id", Array.from(friendIds))
          .ilike("username", `${query}%`)
          .limit(5);

        setSuggestions(profiles || []);
      } catch (error) {
        console.error("Error loading suggestions:", error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(loadSuggestions, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  if (suggestions.length === 0) return null;

  return (
    <div
      className="absolute z-50 w-64 bg-popover border border-border rounded-lg shadow-lg"
      style={{ top: position.top, left: position.left }}
    >
      <ScrollArea className="max-h-48">
        <div className="p-2">
          {suggestions.map((profile) => (
            <button
              key={profile.id}
              onClick={() => onSelect(profile.username)}
              className="w-full flex items-center gap-3 p-2 hover:bg-accent rounded-lg transition-colors"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile.avatar_url} />
                <AvatarFallback>{profile.username[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium">{profile.username}</p>
                {profile.full_name && (
                  <p className="text-xs text-muted-foreground">{profile.full_name}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
