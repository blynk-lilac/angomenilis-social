import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Phone, Video, PhoneIncoming, PhoneOutgoing, PhoneMissed } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Call {
  id: string;
  call_type: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  caller_id: string;
  receiver_id: string;
  caller?: {
    first_name: string;
    avatar_url: string | null;
  };
  receiver?: {
    first_name: string;
    avatar_url: string | null;
  };
}

export default function Calls() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadCalls();
    }
  }, [user]);

  const loadCalls = async () => {
    if (!user) return;

    const { data: callsData, error } = await supabase
      .from('calls')
      .select('*')
      .or(`caller_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('started_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error loading calls:', error);
      setLoading(false);
      return;
    }

    // Load profiles for each call
    const callerIds = callsData.map(c => c.caller_id);
    const receiverIds = callsData.map(c => c.receiver_id);
    const allIds = [...new Set([...callerIds, ...receiverIds])];

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, first_name, avatar_url')
      .in('id', allIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    const enrichedCalls = callsData.map(call => ({
      ...call,
      caller: profileMap.get(call.caller_id),
      receiver: profileMap.get(call.receiver_id),
    }));

    setCalls(enrichedCalls);
    setLoading(false);
  };

  const handleCallUser = (userId: string, callType: 'voice' | 'video') => {
    navigate(`/chamada/${userId}?type=${callType}`);
  };

  const getCallIcon = (call: Call) => {
    const isCaller = call.caller_id === user?.id;
    const isMissed = call.status === 'missed' || call.status === 'rejected';

    if (isMissed && !isCaller) {
      return <PhoneMissed className="h-5 w-5 text-destructive" />;
    }
    if (isCaller) {
      return <PhoneOutgoing className="h-5 w-5 text-primary" />;
    }
    return <PhoneIncoming className="h-5 w-5 text-green-500" />;
  };

  const getCallStatus = (call: Call) => {
    const isCaller = call.caller_id === user?.id;
    if (call.status === 'missed' || call.status === 'rejected') {
      return isCaller ? 'Não atendida' : 'Chamada perdida';
    }
    if (call.status === 'completed') {
      return 'Chamada concluída';
    }
    return 'Chamada';
  };

  if (loading) {
    return (
      <MainLayout title="Chamadas">
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Chamadas">
      <div className="flex flex-col h-full">
        <div className="p-4 space-y-2">
          <h2 className="text-lg font-semibold">Recentes</h2>
        </div>

        {calls.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-6 text-center">
            <div>
              <Phone className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-2">Nenhuma chamada ainda</p>
              <p className="text-sm text-muted-foreground">
                Suas chamadas de voz e vídeo aparecerão aqui
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {calls.map((call) => {
              const otherUser = call.caller_id === user?.id ? call.receiver : call.caller;
              const isVideo = call.call_type === 'video';

              return (
                <div
                  key={call.id}
                  className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={otherUser?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {otherUser?.first_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {getCallIcon(call)}
                      <p className="font-medium truncate">{otherUser?.first_name}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {getCallStatus(call)} •{' '}
                      {formatDistanceToNow(new Date(call.started_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </p>
                  </div>

                  <button
                    onClick={() =>
                      handleCallUser(
                        call.caller_id === user?.id ? call.receiver_id : call.caller_id,
                        isVideo ? 'video' : 'voice'
                      )
                    }
                    className="p-2 rounded-full bg-primary text-primary-foreground hover:opacity-90"
                  >
                    {isVideo ? (
                      <Video className="h-5 w-5" />
                    ) : (
                      <Phone className="h-5 w-5" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
