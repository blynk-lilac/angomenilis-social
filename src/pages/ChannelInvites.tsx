import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Invite {
  id: string;
  inviter: {
    id: string;
    first_name: string;
    avatar_url: string | null;
  };
  channel: {
    name: string;
  };
}

export default function ChannelInvites() {
  const navigate = useNavigate();
  const { channelId } = useParams();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvites();
  }, [channelId]);

  const fetchInvites = async () => {
    try {
      const { data, error } = await supabase
        .from("channel_invites")
        .select(`
          id,
          inviter_id,
          channel_id,
          profiles!channel_invites_inviter_id_fkey (
            id,
            first_name,
            avatar_url
          ),
          channels (
            name
          )
        `)
        .eq("channel_id", channelId)
        .eq("status", "pending");

      if (error) throw error;

      const formattedInvites = data?.map((invite: any) => ({
        id: invite.id,
        inviter: invite.profiles,
        channel: invite.channels
      })) || [];

      setInvites(formattedInvites);
    } catch (error) {
      console.error("Error fetching invites:", error);
      toast.error("Erro ao carregar convites");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center gap-4 p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Convites para o canal</h1>
        </div>
      </div>

      {/* Invites List */}
      <div className="divide-y divide-border">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">
            Carregando...
          </div>
        ) : invites.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            Nenhum convite pendente
          </div>
        ) : (
          invites.map((invite) => (
            <div key={invite.id} className="p-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={invite.inviter.avatar_url || ""} />
                  <AvatarFallback>
                    {invite.inviter.first_name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">
                    {invite.inviter.first_name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {invite.inviter.first_name} convidou-te.
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
