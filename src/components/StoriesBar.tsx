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
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
          {/* Criar novo story (estilo cartão do Facebook) */}
          <button
            type="button"
            onClick={onCreateStory}
            className="relative flex-shrink-0 w-24 h-40 rounded-2xl overflow-hidden bg-muted cursor-pointer hover:opacity-90 transition-opacity"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/10 to-secondary/20" />
            <div className="absolute bottom-0 left-0 right-0 p-2 flex flex-col items-center gap-1 bg-gradient-to-t from-black/70 via-black/30 to-transparent">
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground border-2 border-background">
                <Plus className="h-4 w-4" />
              </div>
              <span className="text-[11px] font-semibold text-background text-center leading-tight">
                Criar história
              </span>
            </div>
          </button>

          {/* Seu story se existir */}
          {hasOwnStory && (
            <button
              type="button"
              onClick={() => handleViewStory(groupedStories[currentUserId], 0)}
              className="relative flex-shrink-0 w-24 h-40 rounded-2xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
            >
              <img
                src={groupedStories[currentUserId][0].media_url}
                alt="Seu story"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute top-2 left-2 flex items-center justify-center h-6 min-w-[1.5rem] px-1 rounded-full bg-primary text-primary-foreground text-[11px] font-bold">
                {groupedStories[currentUserId].length}
              </div>
              <div className="absolute bottom-2 left-2 right-2">
                <p className="text-[11px] font-semibold text-background line-clamp-2">Seu story</p>
              </div>
            </button>
          )}

          {/* Stories de outros usuários */}
          {Object.entries(groupedStories)
            .filter(([userId]) => userId !== currentUserId)
            .map(([userId, userStories]) => {
              const firstStory = userStories[0];
              return (
                <button
                  type="button"
                  key={userId}
                  onClick={() => handleViewStory(userStories, 0)}
                  className="relative flex-shrink-0 w-24 h-40 rounded-2xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <img
                    src={firstStory.media_url}
                    alt={firstStory.profile.first_name}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute top-2 left-2 flex items-center justify-center h-6 min-w-[1.5rem] px-1 rounded-full bg-primary text-primary-foreground text-[11px] font-bold">
                    {userStories.length}
                  </div>
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-[11px] font-semibold text-background line-clamp-2">
                      {firstStory.profile.first_name}
                    </p>
                  </div>
                </button>
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
