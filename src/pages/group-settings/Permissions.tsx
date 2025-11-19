import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';

interface GroupSettings {
  all_members_can_send: boolean;
  all_members_can_edit_info: boolean;
}

export default function Permissions() {
  const { groupId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreator, setIsCreator] = useState(false);
  const [settings, setSettings] = useState<GroupSettings>({
    all_members_can_send: true,
    all_members_can_edit_info: false,
  });

  useEffect(() => {
    if (groupId && user) {
      checkIfCreator();
      loadSettings();
    }
  }, [groupId, user]);

  const checkIfCreator = async () => {
    if (!groupId || !user) return;

    const { data } = await supabase
      .from('groups')
      .select('created_by')
      .eq('id', groupId)
      .single();

    setIsCreator(data?.created_by === user.id);
  };

  const loadSettings = async () => {
    if (!groupId) return;

    const { data } = await supabase
      .from('groups')
      .select('all_members_can_send, all_members_can_edit_info')
      .eq('id', groupId)
      .single();

    if (data) {
      setSettings({
        all_members_can_send: data.all_members_can_send ?? true,
        all_members_can_edit_info: data.all_members_can_edit_info ?? false,
      });
    }
  };

  const updateSetting = async (key: keyof GroupSettings, value: boolean) => {
    if (!isCreator) {
      toast({
        title: 'Sem permissão',
        description: 'Apenas o criador pode alterar as permissões',
        variant: 'destructive',
      });
      return;
    }

    const { error } = await supabase
      .from('groups')
      .update({ [key]: value })
      .eq('id', groupId);

    if (error) {
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setSettings({ ...settings, [key]: value });
      toast({
        title: 'Permissão atualizada!',
      });
    }
  };

  if (!isCreator) {
    return (
      <MainLayout title="Permissões de Mensagens">
        <div className="flex items-center justify-center h-full p-4">
          <p className="text-center text-muted-foreground">
            Apenas o criador do grupo pode alterar as permissões
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Permissões de Mensagens">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex-1 pr-4">
                <p className="font-medium">Todos podem enviar mensagens</p>
                <p className="text-sm text-muted-foreground">
                  Permite que todos os membros enviem mensagens no grupo
                </p>
              </div>
              <Switch
                checked={settings.all_members_can_send}
                onCheckedChange={(checked) =>
                  updateSetting('all_members_can_send', checked)
                }
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex-1 pr-4">
                <p className="font-medium">Todos podem editar informações</p>
                <p className="text-sm text-muted-foreground">
                  Permite que todos os membros editem nome e foto do grupo
                </p>
              </div>
              <Switch
                checked={settings.all_members_can_edit_info}
                onCheckedChange={(checked) =>
                  updateSetting('all_members_can_edit_info', checked)
                }
              />
            </div>
          </div>

          <div className="p-4 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground">
              <strong>Nota:</strong> O criador do grupo sempre tem todas as permissões
              independente destas configurações.
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
