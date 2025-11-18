import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';

interface Group {
  id: string;
  name: string;
  avatar_url: string | null;
  created_at: string;
  created_by: string;
}

interface Friend {
  id: string;
  username: string;
  first_name: string;
  avatar_url: string | null;
}

export default function Groups() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [groupName, setGroupName] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    if (user) {
      loadGroups();
      loadFriends();
      subscribeToGroups();
    }
  }, [user]);

  const loadGroups = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('group_members')
      .select('group_id, groups(*)')
      .eq('user_id', user.id);

    if (data) {
      const groupsList = data.map(item => item.groups).filter(Boolean);
      setGroups(groupsList as Group[]);
    }
  };

  const loadFriends = async () => {
    if (!user) return;

    const { data: friendships } = await supabase
      .from('friendships')
      .select('user_id_1, user_id_2')
      .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`);

    if (friendships) {
      const friendIds = friendships.map(f =>
        f.user_id_1 === user.id ? f.user_id_2 : f.user_id_1
      );

      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', friendIds);

      if (profiles) setFriends(profiles);
    }
  };

  const subscribeToGroups = () => {
    const channel = supabase
      .channel('groups-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'groups',
        },
        () => {
          loadGroups();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const createGroup = async () => {
    if (!groupName.trim() || selectedFriends.length === 0 || !user) return;

    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert({
        name: groupName,
        created_by: user.id,
      })
      .select()
      .single();

    if (groupError || !group) {
      toast({
        title: 'Erro ao criar grupo',
        variant: 'destructive',
      });
      return;
    }

    // Add creator as member
    const members = [
      { group_id: group.id, user_id: user.id },
      ...selectedFriends.map(friendId => ({
        group_id: group.id,
        user_id: friendId,
      })),
    ];

    const { error: membersError } = await supabase
      .from('group_members')
      .insert(members);

    if (membersError) {
      toast({
        title: 'Erro ao adicionar membros',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Grupo criado com sucesso!',
    });

    setGroupName('');
    setSelectedFriends([]);
    setIsDialogOpen(false);
    loadGroups();
  };

  return (
    <MainLayout title="Grupos">
      <div className="flex flex-col h-full">
        <header className="sticky top-0 z-10 bg-card border-b border-border px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Grupos</h1>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="icon" className="rounded-full">
                  <Plus className="h-5 w-5" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Novo Grupo</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Nome do grupo"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                  />
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Adicionar amigos</p>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {friends.map((friend) => (
                        <div key={friend.id} className="flex items-center gap-3">
                          <Checkbox
                            checked={selectedFriends.includes(friend.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedFriends([...selectedFriends, friend.id]);
                              } else {
                                setSelectedFriends(selectedFriends.filter(id => id !== friend.id));
                              }
                            }}
                          />
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={friend.avatar_url || undefined} />
                            <AvatarFallback>{friend.first_name[0]}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{friend.first_name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button
                    onClick={createGroup}
                    className="w-full"
                    disabled={!groupName.trim() || selectedFriends.length === 0}
                  >
                    Criar Grupo
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {groups.map((group) => (
            <button
              key={group.id}
              onClick={() => navigate(`/grupo/${group.id}`)}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors"
            >
              <Avatar className="h-12 w-12">
                <AvatarImage src={group.avatar_url || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  <Users className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <p className="font-semibold">{group.name}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
