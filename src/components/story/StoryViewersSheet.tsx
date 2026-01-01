import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import VerificationBadge from '@/components/VerificationBadge';
import { OnlineIndicator } from '@/components/OnlineIndicator';

interface Viewer {
  id: string;
  viewer_id: string;
  viewed_at: string;
  profile: {
    id: string;
    username: string;
    first_name: string;
    avatar_url: string | null;
    verified?: boolean;
    badge_type?: string | null;
  };
}

interface StoryViewersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storyId: string;
  viewCount: number;
}

export const StoryViewersSheet = ({ open, onOpenChange, storyId, viewCount }: StoryViewersSheetProps) => {
  const navigate = useNavigate();
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && storyId) {
      loadViewers();
    }
  }, [open, storyId]);

  const loadViewers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('story_views')
      .select(`
        id,
        viewer_id,
        viewed_at,
        profile:profiles!story_views_viewer_id_fkey(id, username, first_name, avatar_url, verified, badge_type)
      `)
      .eq('story_id', storyId)
      .order('viewed_at', { ascending: false });

    if (data) {
      setViewers(data as any);
    }
    setLoading(false);
  };

  const handleMessageUser = (userId: string) => {
    onOpenChange(false);
    navigate(`/chat/${userId}`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl">
        <SheetHeader className="pb-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            Visto por {viewCount}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-full py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : viewers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma visualização ainda
            </div>
          ) : (
            <div className="space-y-1">
              {viewers.map((viewer) => (
                <div 
                  key={viewer.id}
                  className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-xl transition-colors"
                >
                  <div 
                    className="flex items-center gap-3 flex-1 cursor-pointer"
                    onClick={() => {
                      onOpenChange(false);
                      navigate(`/profile/${viewer.profile.id}`);
                    }}
                  >
                    <div className="relative">
                      <Avatar className="h-12 w-12 border-2 border-primary/20">
                        <AvatarImage src={viewer.profile.avatar_url || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20">
                          {viewer.profile.first_name?.[0] || viewer.profile.username?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <OnlineIndicator userId={viewer.viewer_id} size="md" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-sm">
                          {viewer.profile.first_name || viewer.profile.username}
                        </span>
                        {viewer.profile.verified && (
                          <VerificationBadge verified badgeType={viewer.profile.badge_type} className="w-4 h-4" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(viewer.viewed_at), { addSuffix: true, locale: ptBR })}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleMessageUser(viewer.viewer_id)}
                    className="h-10 w-10"
                  >
                    <MessageSquare className="h-5 w-5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default StoryViewersSheet;
