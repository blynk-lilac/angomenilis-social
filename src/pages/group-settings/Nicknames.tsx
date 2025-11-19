import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';

interface Member {
  id: string;
  user_id: string;
  nickname: string | null;
  profiles: {
    first_name: string;
    avatar_url: string | null;
  };
}

export default function Nicknames() {
  const { groupId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nicknameValue, setNicknameValue] = useState('');

  useEffect(() => {
    if (groupId) {
      loadMembers();
    }
  }, [groupId]);

  const loadMembers = async () => {
    if (!groupId) return;

    const { data } = await supabase
      .from('group_members')
      .select('id, user_id, nickname, profiles(first_name, avatar_url)')
      .eq('group_id', groupId);

    if (data) setMembers(data as Member[]);
  };

  const startEditing = (member: Member) => {
    setEditingId(member.id);
    setNicknameValue(member.nickname || '');
  };

  const saveNickname = async (memberId: string) => {
    const { error } = await supabase
      .from('group_members')
      .update({ nickname: nicknameValue.trim() || null })
      .eq('id', memberId);

    if (error) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Alcunha atualizada!',
      });
      setEditingId(null);
      loadMembers();
    }
  };

  return (
    <MainLayout title="Alcunhas">
      <div className="flex-1 overflow-y-auto p-4">
        <p className="text-sm text-muted-foreground mb-4">
          Defina alcunhas personalizadas para os membros do grupo
        </p>

        <div className="space-y-3">
          {members.map((member) => (
            <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg border">
              <Avatar className="h-10 w-10">
                <AvatarImage src={member.profiles.avatar_url || undefined} />
                <AvatarFallback>{member.profiles.first_name[0]}</AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <p className="text-sm text-muted-foreground">
                  {member.profiles.first_name}
                </p>
                {editingId === member.id ? (
                  <Input
                    value={nicknameValue}
                    onChange={(e) => setNicknameValue(e.target.value)}
                    placeholder="Digite a alcunha"
                    className="mt-1"
                    maxLength={30}
                  />
                ) : (
                  <p className="font-medium">
                    {member.nickname || member.profiles.first_name}
                  </p>
                )}
              </div>

              {editingId === member.id ? (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => saveNickname(member.id)}
                  >
                    Salvar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingId(null)}
                  >
                    Cancelar
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => startEditing(member)}
                >
                  Editar
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
