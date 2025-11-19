import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AuthCredentialsProps {
  onNext: (credential: string, username: string) => void;
  onBack: () => void;
}

export const AuthCredentials = ({ onNext, onBack }: AuthCredentialsProps) => {
  const [credential, setCredential] = useState('');
  const [username, setUsername] = useState('');

  const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  const isValid = credential.trim() && username.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações de entrada
    const trimmedCredential = credential.trim();
    const trimmedUsername = username.trim().toLowerCase();
    
    if (!trimmedCredential || !trimmedUsername) {
      toast.error('Preencha todos os campos');
      return;
    }
    
    // Validar formato de email se for email
    if (isEmail(trimmedCredential)) {
      if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmedCredential)) {
        toast.error('Digite um e-mail válido');
        return;
      }
    } else {
      // Validar formato de telefone
      if (!/^\+?[1-9]\d{1,14}$/.test(trimmedCredential)) {
        toast.error('Digite um número de telefone válido com código do país (+244...)');
        return;
      }
    }
    
    // Validar username (apenas letras, números e underscore, 3-20 caracteres)
    if (!/^[a-z0-9_]{3,20}$/.test(trimmedUsername)) {
      toast.error('Nome de usuário deve ter 3-20 caracteres (apenas letras, números e _)');
      return;
    }

    // Verificar se username já existe
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', trimmedUsername)
      .single();

    if (existingUser) {
      toast.error('Este nome de usuário já está em uso');
      return;
    }

    onNext(trimmedCredential, trimmedUsername);
  };

  return (
    <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="space-y-2">
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-5 w-5" />
          Voltar
        </Button>
        <h2 className="text-2xl font-bold text-foreground">Seus dados</h2>
        <p className="text-muted-foreground">Digite seu e-mail ou número e escolha um nome de usuário</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            E-mail ou Número de Telefone
          </label>
          <Input
            type="text"
            value={credential}
            onChange={(e) => setCredential(e.target.value)}
            placeholder="exemplo@email.com ou +244..."
            className="h-14 text-lg rounded-2xl border-2"
            required
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Nome de Usuário
          </label>
          <Input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
            placeholder="seunome"
            className="h-14 text-lg rounded-2xl border-2"
            required
          />
          <p className="text-xs text-muted-foreground">
            Este será seu @{username || 'seunome'}
          </p>
        </div>

        <Button
          type="submit"
          className="w-full h-14 text-lg rounded-2xl"
          disabled={!isValid}
        >
          Continuar
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </form>
    </div>
  );
};
