import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Languages } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { toast } from 'sonner';

interface TranslateButtonProps {
  text: string;
  onTranslated: (translatedText: string) => void;
}

export const TranslateButton = ({ text, onTranslated }: TranslateButtonProps) => {
  const [translating, setTranslating] = useState(false);
  const [isTranslated, setIsTranslated] = useState(false);
  const [originalText] = useState(text);
  const { translateText, settings } = useSettings();

  const handleTranslate = async () => {
    if (isTranslated) {
      // Reverter para o texto original
      onTranslated(originalText);
      setIsTranslated(false);
      return;
    }

    setTranslating(true);
    try {
      const translated = await translateText(text);
      onTranslated(translated);
      setIsTranslated(true);
      toast.success('Texto traduzido');
    } catch (error) {
      toast.error('Erro ao traduzir');
    } finally {
      setTranslating(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleTranslate}
      disabled={translating}
      className="text-xs"
    >
      <Languages className="h-3 w-3 mr-1" />
      {translating ? 'Traduzindo...' : isTranslated ? 'Original' : 'Traduzir'}
    </Button>
  );
};
