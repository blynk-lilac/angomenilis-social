import { Button } from '@/components/ui/button';
import logo from '@/assets/logo.png';

interface AuthModeProps {
  onSelectMode: (mode: 'login' | 'signup') => void;
}

export const AuthMode = ({ onSelectMode }: AuthModeProps) => {
  return (
    <div className="w-full max-w-md space-y-8 animate-in fade-in duration-500">
      <div className="text-center space-y-4">
        <img src={logo} alt="Angomenilis" className="h-24 w-24 mx-auto" />
        <h1 className="text-4xl font-bold text-foreground">Angomenilis</h1>
        <p className="text-muted-foreground text-lg">
          Conecte-se com seus amigos e compartilhe momentos
        </p>
      </div>

      <div className="space-y-4">
        <Button
          onClick={() => onSelectMode('login')}
          className="w-full h-14 text-lg rounded-2xl"
          size="lg"
        >
          Entrar
        </Button>
        
        <Button
          onClick={() => onSelectMode('signup')}
          variant="outline"
          className="w-full h-14 text-lg rounded-2xl"
          size="lg"
        >
          Criar Conta
        </Button>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Ao continuar, você concorda com nossos Termos de Serviço e Política de Privacidade
      </p>
    </div>
  );
};