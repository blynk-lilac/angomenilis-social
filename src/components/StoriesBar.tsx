import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus } from "lucide-react";
import { StoryViewer } from "@/components/story/StoryViewer";

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

  useEffect(() => {
    loadCurrentUser();
    loadStories();

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

  return (
    <>
      <div className="bg-card rounded-xl border border-border p-4 mb-4">
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {/* Criar novo story */}
          <div
            onClick={onCreateStory}
            className="flex-shrink-0 flex flex-col items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border-2 border-dashed border-primary/50">
                <Plus className="h-8 w-8 text-primary" />
              </div>
            </div>
            <span className="text-xs font-medium text-foreground">Criar</span>
          </div>

          {/* Seu story se existir */}
          {hasOwnStory && (
            <div
              onClick={() => handleViewStory(groupedStories[currentUserId], 0)}
              className="flex-shrink-0 flex flex-col items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <div className="p-1 rounded-full bg-gradient-to-tr from-primary via-accent to-secondary">
                <div className="bg-card rounded-full p-1">
                  <Avatar className="h-16 w-16 ring-2 ring-card">
                    <AvatarImage src={groupedStories[currentUserId][0].profile.avatar_url || undefined} />
                    <AvatarFallback className="bg-muted text-foreground">Você</AvatarFallback>
                  </Avatar>
                </div>
              </div>
              <span className="text-xs font-medium text-foreground max-w-[80px] truncate">Seu story</span>
            </div>
          )}

          {/* Stories de outros usuários */}
          {Object.entries(groupedStories)
            .filter(([userId]) => userId !== currentUserId)
            .map(([userId, userStories]) => {
              const firstStory = userStories[0];
              return (
                <div
                  key={userId}
                  onClick={() => handleViewStory(userStories, 0)}
                  className="flex-shrink-0 flex flex-col items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <div className="p-1 rounded-full bg-gradient-to-tr from-primary via-accent to-secondary">
                    <div className="bg-card rounded-full p-1">
                      <Avatar className="h-16 w-16 ring-2 ring-card">
                        <AvatarImage src={firstStory.profile.avatar_url || undefined} />
                        <AvatarFallback className="bg-muted text-foreground">
                          {firstStory.profile.first_name[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-foreground max-w-[80px] truncate">
                    {firstStory.profile.first_name}
                  </span>
                </div>
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
