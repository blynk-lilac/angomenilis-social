import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const reportCategories = [
  { id: 'harassment', label: 'Assédio' },
  { id: 'suicide', label: 'Suicídio ou automutilação' },
  { id: 'violence', label: 'Violência ou organizações perigosas' },
  { id: 'nudity', label: 'Nudez ou atividade sexual' },
  { id: 'sale', label: 'Venda ou promoção de artigos restritos' },
  { id: 'fraud', label: 'Fraude ou burla' },
  { id: 'other', label: 'Outro' },
];

export default function Report() {
  const navigate = useNavigate();
  const { type, id } = useParams();
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setShowDetails(true);
  };

  const handleSubmitReport = () => {
    toast({
      title: 'Denúncia enviada',
      description: 'Obrigado pelo seu feedback. Vamos analisar.',
    });
    
    // Navigate back
    if (type === 'grupo') {
      navigate(`/grupo/${id}`);
    } else {
      navigate(`/chat/${id}`);
    }
  };

  if (showDetails && selectedCategory) {
    const category = reportCategories.find(c => c.id === selectedCategory);
    
    return (
      <div className="flex flex-col h-screen bg-background">
        <header className="sticky top-0 z-10 bg-card border-b border-border px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowDetails(false)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          <h1 className="text-2xl font-bold mb-4">{category?.label}</h1>
          
          <div className="space-y-4 mb-6">
            <p className="text-muted-foreground">
              Sabe como reconhecer assédio. Tens o direito de te sentir em segurança e de te tratarem com benevolência e respeito.
            </p>
            
            <div>
              <p className="font-semibold mb-2">Exemplos do que denunciar:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Alguém continua a enviar-te mensagens mesmo quando não respondes</li>
                <li>As pessoas estão a gozar contigo numa conversa</li>
                <li>Uma pessoa está a ameaçar partilhar as tuas informações privadas</li>
              </ul>
            </div>

            <p className="text-xs text-muted-foreground">
              Envia mensagens recentes desta conversa para serem revistas pela Meta.{' '}
              <span className="text-primary">Sabe mais.</span>
            </p>
          </div>

          <Button onClick={handleSubmitReport} className="w-full">
            Enviar denúncia
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="sticky top-0 z-10 bg-card border-b border-border px-4 py-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <h1 className="text-xl font-bold mb-2">Seleciona um problema para denunciar</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Não vamos informar a pessoa sobre quem a denunciou. Se alguém estiver em perigo iminente, 
            liga para os serviços de emergência locais. Não esperes.
          </p>
        </div>

        <div className="space-y-1">
          {reportCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategorySelect(category.id)}
              className="w-full flex items-center justify-between px-4 py-4 hover:bg-accent transition-colors border-b border-border"
            >
              <span>{category.label}</span>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
