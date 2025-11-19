import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Crown, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';

interface Member {
  id: string;
  user_id: string;
  profiles: {
    first_name: string;
    username: string;
    avatar_url: string | null;
  };
}

interface Group {
  created_by: string;
}

export default function ViewMembers() {
  const { groupId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [group, setGroup] = useState<Group | null>(null);

  useEffect(() => {
    if (groupId) {
      loadGroup();
      loadMembers();
    }
  }, [groupId]);

  const loadGroup = async () => {
    if (!groupId) return;

    const { data } = await supabase
      .from('groups')
      .select('created_by')
      .eq('id', groupId)
      .single();

    if (data) setGroup(data);
  };

  const loadMembers = async () => {
    if (!groupId) return;

    const { data } = await supabase
      .from('group_members')
      .select('id, user_id, profiles(first_name, username, avatar_url)')
      .eq('group_id', groupId);

    if (data) setMembers(data as Member[]);
  };

  const removeMember = async (memberId: string, memberUserId: string) => {
    if (memberUserId === group?.created_by) {
      toast({
        title: 'Não é possível remover',
        description: 'O criador do grupo não pode ser removido',
        variant: 'destructive',
      });
      return;
    }

    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('id', memberId);

    if (error) {
      toast({
        title: 'Erro ao remover membro',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Membro removido',
      });
      loadMembers();
    }
  };

  const isCreator = user?.id === group?.created_by;

  return (
    <MainLayout title="Membros do Grupo">
      <div className="flex-1 overflow-y-auto p-4">
        <p className="text-sm text-muted-foreground mb-4">
          {members.length} {members.length === 1 ? 'membro' : 'membros'}
        </p>
        
        <div className="space-y-2">
          {members.map((member) => {
            const isGroupCreator = member.user_id === group?.created_by;
            
            return (
              <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg border">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={member.profiles.avatar_url || undefined} />
                  <AvatarFallback>{member.profiles.first_name[0]}</AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{member.profiles.first_name}</p>
                    {isGroupCreator && (
                      <Crown className="h-4 w-4 text-yellow-500" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    @{member.profiles.username}
                  </p>
                </div>

                {isCreator && !isGroupCreator && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => removeMember(member.id, member.user_id)}
                      >
                        Remover do grupo
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </MainLayout>
  );
}
