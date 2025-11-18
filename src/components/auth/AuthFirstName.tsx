import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight } from 'lucide-react';
import logo from '@/assets/logo.png';

interface AuthFirstNameProps {
  onNext: (firstName: string) => void;
}

export const AuthFirstName = ({ onNext }: AuthFirstNameProps) => {
  const [firstName, setFirstName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (firstName.trim()) {
      onNext(firstName.trim());
    }
  };

  return (
    <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-4">
        <img src={logo} alt="Angomenilis" className="h-20 w-20 mx-auto" />
        <h1 className="text-3xl font-bold text-foreground">Bem-vindo ao Angomenilis</h1>
        <p className="text-muted-foreground">Conecte-se com seus amigos</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Qual é o seu primeiro nome?
          </label>
          <Input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Digite seu primeiro nome"
            className="h-14 text-lg rounded-2xl border-2"
            required
            autoFocus
          />
        </div>

        <Button
          type="submit"
          className="w-full h-14 text-lg rounded-2xl"
          disabled={!firstName.trim()}
        >
          Continuar
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </form>
    </div>
  );
};
