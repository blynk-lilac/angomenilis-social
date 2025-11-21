import { Button } from '@/components/ui/button';
import logo from '@/assets/blynk-logo.jpg';

interface AuthModeProps {
  onSelectMode: (mode: 'login' | 'signup') => void;
}

export const AuthMode = ({ onSelectMode }: AuthModeProps) => {
  return (
    <div className="w-full max-w-md space-y-8 animate-bounce-in">
      <div className="text-center space-y-4">
        <img src={logo} alt="Blynk" className="h-24 w-24 mx-auto animate-glow rounded-full" />
        <h1 className="text-4xl font-bold text-foreground bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
          Blynk
        </h1>
        <p className="text-muted-foreground text-lg animate-fade-in">
          Conecte-se com seus amigos e compartilhe momentos
        </p>
      </div>

      <div className="space-y-4 animate-slide-up">
        <Button
          onClick={() => onSelectMode('login')}
          className="w-full h-14 text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          size="lg"
        >
          Entrar
        </Button>
        
        <Button
          onClick={() => onSelectMode('signup')}
          variant="outline"
          className="w-full h-14 text-lg rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105"
          size="lg"
        >
          Criar Conta
        </Button>
      </div>

      <p className="text-center text-sm text-muted-foreground animate-fade-in">
        Ao continuar, você concorda com nossos Termos de Serviço e Política de Privacidade
      </p>
    </div>
  );
};