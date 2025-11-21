import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useNotificationCount = () => {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const loadCount = async () => {
      // Count unread notifications
      const { count: notifCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      // Count pending friend requests
      const { count: requestCount } = await supabase
        .from('friend_requests')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('status', 'pending');

      // Count story reactions
      const { data: userStories } = await supabase
        .from('stories')
        .select('id')
        .eq('user_id', user.id);

      let reactionCount = 0;
      if (userStories && userStories.length > 0) {
        const storyIds = userStories.map(s => s.id);
        const { count } = await supabase
          .from('story_reactions')
          .select('*', { count: 'exact', head: true })
          .in('story_id', storyIds);
        reactionCount = count || 0;
      }

      setCount((notifCount || 0) + (requestCount || 0) + reactionCount);
    };

    loadCount();

    // Listen for new notifications
    const channel = supabase
      .channel('notifications-count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => loadCount()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_requests',
          filter: `receiver_id=eq.${user.id}`,
        },
        () => loadCount()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'story_reactions'
        },
        () => loadCount()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stories'
        },
        () => loadCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return count;
};
