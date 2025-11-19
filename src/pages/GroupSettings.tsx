import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, UserPlus, Bell, Users, Edit, Image, Type, Shield, LogOut, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Group {
  id: string;
  name: string;
  avatar_url: string | null;
  created_by: string;
}

interface Member {
  id: string;
  user_id: string;
  profiles: {
    first_name: string;
    username: string;
    avatar_url: string | null;
  };
}

export default function GroupSettings() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [showMembers, setShowMembers] = useState(false);
  const [showEditName, setShowEditName] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (groupId) {
      loadGroup();
      loadMembers();
    }
  }, [groupId]);

  const loadGroup = async () => {
    const { data } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single();
    
    if (data) {
      setGroup(data);
      setNewName(data.name);
    }
  };

  const loadMembers = async () => {
    const { data } = await supabase
      .from('group_members')
      .select('id, user_id, profiles(first_name, username, avatar_url)')
      .eq('group_id', groupId);
    
    if (data) setMembers(data as Member[]);
  };

  const updateGroupName = async () => {
    if (!newName.trim() || !groupId) return;

    const { error } = await supabase
      .from('groups')
      .update({ name: newName.trim() })
      .eq('id', groupId);

    if (error) {
      toast({
        title: 'Erro ao atualizar nome',
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Nome atualizado' });
      setShowEditName(false);
      loadGroup();
    }
  };

  const updateGroupAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !groupId) return;

    const fileExt = file.name.split('.').pop();
    const fileName = `${groupId}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file);

    if (uploadError) {
      toast({
        title: 'Erro ao fazer upload',
        variant: 'destructive',
      });
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    const { error: updateError } = await supabase
      .from('groups')
      .update({ avatar_url: publicUrl })
      .eq('id', groupId);

    if (updateError) {
      toast({
        title: 'Erro ao atualizar foto',
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Foto atualizada' });
      loadGroup();
    }
  };

  const leaveGroup = async () => {
    if (!user || !groupId) return;

    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', user.id);

    if (error) {
      toast({
        title: 'Erro ao sair do grupo',
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Você saiu do grupo' });
      navigate('/grupos');
    }
  };

  if (!group) return null;

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card border-b border-border px-4 py-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/grupo/${groupId}`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Group Info */}
        <div className="flex flex-col items-center py-8 px-4 border-b border-border">
          <Avatar className="h-24 w-24 mb-4">
            <AvatarImage src={group.avatar_url || undefined} />
            <AvatarFallback className="text-2xl">
              <Users className="h-12 w-12" />
            </AvatarFallback>
          </Avatar>
          <h1 className="text-2xl font-bold mb-2">{group.name}</h1>
          
          <div className="flex gap-12 mt-6">
            <button className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <UserPlus className="h-6 w-6" />
              </div>
              <span className="text-sm">Adicionar</span>
            </button>
            <button className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <Bell className="h-6 w-6" />
              </div>
              <span className="text-sm">Silenciar</span>
            </button>
          </div>
        </div>

        {/* Actions Section */}
        <div className="py-4">
          <h2 className="text-sm font-semibold text-muted-foreground px-4 mb-2">Ações</h2>
          
          <button
            onClick={() => setShowMembers(true)}
            className="w-full flex items-center gap-4 px-4 py-3 hover:bg-accent transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
            <span>Ver membros</span>
          </button>
        </div>

        {/* Personalization Section */}
        <div className="py-4 border-t border-border">
          <h2 className="text-sm font-semibold text-muted-foreground px-4 mb-2">Personalização</h2>
          
          <button
            onClick={() => setShowEditName(true)}
            className="w-full flex items-center gap-4 px-4 py-3 hover:bg-accent transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <Edit className="h-5 w-5" />
            </div>
            <span>Alterar nome do grupo</span>
          </button>

          <label className="w-full flex items-center gap-4 px-4 py-3 hover:bg-accent transition-colors cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <Image className="h-5 w-5" />
            </div>
            <span>Alterar foto do grupo</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={updateGroupAvatar}
            />
          </label>

          <button className="w-full flex items-center gap-4 px-4 py-3 hover:bg-accent transition-colors">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <Type className="h-5 w-5" />
            </div>
            <span>Alcunhas</span>
          </button>
        </div>

        {/* Privacy and Support Section */}
        <div className="py-4 border-t border-border">
          <h2 className="text-sm font-semibold text-muted-foreground px-4 mb-2">Privacidade e suporte</h2>
          
          <button className="w-full flex items-center gap-4 px-4 py-3 hover:bg-accent transition-colors">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <Shield className="h-5 w-5" />
            </div>
            <span>Permissões de mensagens</span>
          </button>

          <button
            onClick={leaveGroup}
            className="w-full flex items-center gap-4 px-4 py-3 hover:bg-accent transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <LogOut className="h-5 w-5" />
            </div>
            <span>Sair do grupo</span>
          </button>

          <button
            onClick={() => navigate(`/denunciar/grupo/${groupId}`)}
            className="w-full flex items-center gap-4 px-4 py-3 hover:bg-accent transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex flex-col items-start">
              <span>Denunciar</span>
              <span className="text-xs text-muted-foreground">Enviar feedback e denunciar conversa</span>
            </div>
          </button>
        </div>
      </div>

      {/* Members Dialog */}
      <Dialog open={showMembers} onOpenChange={setShowMembers}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Membros do grupo ({members.length})</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {members.map((member) => (
              <div key={member.id} className="flex items-center gap-3 p-2">
                <Avatar>
                  <AvatarImage src={member.profiles.avatar_url || undefined} />
                  <AvatarFallback>{member.profiles.first_name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{member.profiles.first_name}</p>
                  <p className="text-sm text-muted-foreground">@{member.profiles.username}</p>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Name Dialog */}
      <Dialog open={showEditName} onOpenChange={setShowEditName}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar nome do grupo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Nome do grupo"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <Button onClick={updateGroupName} className="w-full">
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
