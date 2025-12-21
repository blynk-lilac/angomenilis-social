import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOnlineUsers } from './useOnlineUsers';
import { useAuth } from '@/contexts/AuthContext';

export const useOnlineFriendsCount = () => {
  const { user } = useAuth();
  const onlineUsers = useOnlineUsers();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const loadOnlineFriendsCount = async () => {
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

      // Count online friends
      let onlineCount = 0;
      friendIds.forEach(id => {
        if (onlineUsers.has(id)) onlineCount++;
      });

      setCount(onlineCount);
    };

    loadOnlineFriendsCount();
  }, [user, onlineUsers]);

  return count;
};
