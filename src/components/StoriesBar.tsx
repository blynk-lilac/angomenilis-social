import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus } from "lucide-react";
import { StoryViewer } from "@/components/story/StoryViewer";
import { motion } from "framer-motion";

interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: string;
  created_at: string;
  profile: {
    username: string;
    first_name: string;
    avatar_url: string | null;
  };
}

interface StoriesBarProps {
  onCreateStory: () => void;
}

export default function StoriesBar({ onCreateStory }: StoriesBarProps) {
  const [stories, setStories] = useState<Story[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [selectedStoryIndex, setSelectedStoryIndex] = useState<number>(0);
  const [selectedUserStories, setSelectedUserStories] = useState<Story[]>([]);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewedStories, setViewedStories] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadCurrentUser();
    loadStories();
    loadViewedStories();

    const channel = supabase
      .channel("stories-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "stories",
        },
        () => {
          loadStories();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  };

  const loadViewedStories = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("story_views")
      .select("story_id")
      .eq("viewer_id", user.id);

    if (data) {
      setViewedStories(new Set(data.map(v => v.story_id)));
    }
  };

  const loadStories = async () => {
    const { data, error } = await supabase
      .from("stories")
      .select(`
        *,
        profile:profiles!stories_user_id_fkey (
          username,
          first_name,
          avatar_url
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading stories:", error);
      return;
    }

    setStories(data || []);
  };

  const handleViewStory = (userStories: Story[], index: number) => {
    setSelectedUserStories(userStories);
    setSelectedStoryIndex(index);
    setViewerOpen(true);
  };

  const handleDeleteStory = () => {
    setViewerOpen(false);
    loadStories();
  };

  const groupedStories = stories.reduce((acc, story) => {
    if (!acc[story.user_id]) {
      acc[story.user_id] = [];
    }
    acc[story.user_id].push(story);
    return acc;
  }, {} as Record<string, Story[]>);

  const hasOwnStory = currentUserId && groupedStories[currentUserId]?.length > 0;

  // Check if all stories from a user are viewed
  const isUserStoriesViewed = (userStories: Story[]) => {
    return userStories.every(story => viewedStories.has(story.id));
  };

  return (
    <>
      {/* Instagram-style Stories Bar */}
      <div className="bg-card border-b border-border">
        <div className="flex gap-4 overflow-x-auto py-4 px-4 scrollbar-hide">
          {/* Your Story / Add Story */}
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0 }}
            type="button"
            onClick={onCreateStory}
            className="flex flex-col items-center gap-1 flex-shrink-0"
          >
            <div className="relative">
              {hasOwnStory ? (
                <div className="p-[3px] rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500">
                  <Avatar className="h-16 w-16 border-[3px] border-background">
                    <AvatarImage src={groupedStories[currentUserId][0].profile.avatar_url || ''} />
                    <AvatarFallback className="bg-gradient-to-br from-primary/30 to-accent/30 text-lg font-bold">
                      {groupedStories[currentUserId][0].profile.first_name?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              ) : (
                <Avatar className="h-16 w-16 border-2 border-border">
                  <AvatarFallback className="bg-muted">
                    <Plus className="h-6 w-6 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
              )}
              <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center border-2 border-background">
                <Plus className="h-4 w-4" />
              </div>
            </div>
            <span className="text-xs font-medium max-w-[70px] truncate text-center">
              Seu story
            </span>
          </motion.button>

          {/* Own stories (if exists) - click to view */}
          {hasOwnStory && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.05 }}
              type="button"
              onClick={() => handleViewStory(groupedStories[currentUserId], 0)}
              className="flex flex-col items-center gap-1 flex-shrink-0"
            >
              <div className={`p-[3px] rounded-full ${
                isUserStoriesViewed(groupedStories[currentUserId]) 
                  ? 'bg-muted-foreground/30' 
                  : 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500'
              }`}>
                <Avatar className="h-16 w-16 border-[3px] border-background">
                  <AvatarImage src={groupedStories[currentUserId][0].profile.avatar_url || ''} />
                  <AvatarFallback className="bg-gradient-to-br from-primary/30 to-accent/30 text-lg font-bold">
                    {groupedStories[currentUserId][0].profile.first_name?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <span className="text-xs font-medium max-w-[70px] truncate text-center">
                Meu story
              </span>
            </motion.button>
          )}

          {/* Stories de outros usuários */}
          {Object.entries(groupedStories)
            .filter(([userId]) => userId !== currentUserId)
            .map(([userId, userStories], idx) => {
              const firstStory = userStories[0];
              const allViewed = isUserStoriesViewed(userStories);
              
              return (
                <motion.button
                  key={userId}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: (idx + 2) * 0.05 }}
                  type="button"
                  onClick={() => handleViewStory(userStories, 0)}
                  className="flex flex-col items-center gap-1 flex-shrink-0"
                >
                  <div className={`p-[3px] rounded-full ${
                    allViewed 
                      ? 'bg-muted-foreground/30' 
                      : 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500'
                  }`}>
                    <Avatar className="h-16 w-16 border-[3px] border-background">
                      <AvatarImage src={firstStory.profile.avatar_url || ''} />
                      <AvatarFallback className="bg-gradient-to-br from-primary/30 to-accent/30 text-lg font-bold">
                        {firstStory.profile.first_name?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <span className="text-xs font-medium max-w-[70px] truncate text-center">
                    {firstStory.profile.first_name}
                  </span>
                </motion.button>
              );
            })}
        </div>
      </div>

      {/* Story Viewer */}
      {viewerOpen && selectedUserStories.length > 0 && (
        <StoryViewer
          stories={selectedUserStories}
          initialIndex={selectedStoryIndex}
          onClose={() => setViewerOpen(false)}
          onDelete={handleDeleteStory}
        />
      )}
    </>
  );
}
