import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { showNotification } from '@/utils/pushNotifications';

export const useStoryReactions = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Listen for reactions on user's stories
    const channel = supabase
      .channel('story-reactions-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'story_reactions',
        },
        async (payload) => {
          // Check if the reaction is on current user's story
          const { data: story } = await supabase
            .from('stories')
            .select('user_id')
            .eq('id', payload.new.story_id)
            .single();

          if (story?.user_id === user.id && payload.new.user_id !== user.id) {
            // Get reactor's profile
            const { data: profile } = await supabase
              .from('profiles')
              .select('first_name, username')
              .eq('id', payload.new.user_id)
              .single();

            const reactionEmoji = {
              heart: '❤️',
              thumbs_up: '👍',
              laughing: '😂'
            }[payload.new.reaction_type] || '👍';

            showNotification(
              'Nova reação no seu story',
              {
                body: `${profile?.first_name || profile?.username || 'Alguém'} reagiu ${reactionEmoji}`,
                icon: '/logo-192.png',
                badge: '/favicon.png',
                tag: 'story-reaction',
                data: { 
                  type: 'story_reaction',
                  storyId: payload.new.story_id
                }
              }
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);
};
