import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

// Import all wallpapers
import gradient1 from '@/assets/wallpapers/gradient-1.jpg';
import cuteCharacters1 from '@/assets/wallpapers/cute-characters-1.jpg';
import geometric1 from '@/assets/wallpapers/geometric-1.jpg';
import nature1 from '@/assets/wallpapers/nature-1.jpg';
import beach1 from '@/assets/wallpapers/beach-1.jpg';
import bubbles1 from '@/assets/wallpapers/bubbles-1.jpg';
import stars1 from '@/assets/wallpapers/stars-1.jpg';
import cherry1 from '@/assets/wallpapers/cherry-1.jpg';
import neon1 from '@/assets/wallpapers/neon-1.jpg';
import watercolor1 from '@/assets/wallpapers/watercolor-1.jpg';
import forest1 from '@/assets/wallpapers/forest-1.jpg';
import cuteAnimals1 from '@/assets/wallpapers/cute-animals-1.jpg';
import waves1 from '@/assets/wallpapers/waves-1.jpg';
import sunset1 from '@/assets/wallpapers/sunset-1.jpg';
import cuteFood1 from '@/assets/wallpapers/cute-food-1.jpg';
import marble1 from '@/assets/wallpapers/marble-1.jpg';
import clouds1 from '@/assets/wallpapers/clouds-1.jpg';
import tropical1 from '@/assets/wallpapers/tropical-1.jpg';
import space1 from '@/assets/wallpapers/space-1.jpg';
import abstract1 from '@/assets/wallpapers/abstract-1.jpg';
import lavender1 from '@/assets/wallpapers/lavender-1.jpg';
import teddy1 from '@/assets/wallpapers/teddy-1.jpg';
import rainbow1 from '@/assets/wallpapers/rainbow-1.jpg';
import bokeh1 from '@/assets/wallpapers/bokeh-1.jpg';
import unicorn1 from '@/assets/wallpapers/unicorn-1.jpg';
import gold1 from '@/assets/wallpapers/gold-1.jpg';
import aurora1 from '@/assets/wallpapers/aurora-1.jpg';
import panda1 from '@/assets/wallpapers/panda-1.jpg';
import retro1 from '@/assets/wallpapers/retro-1.jpg';
import butterfly1 from '@/assets/wallpapers/butterfly-1.jpg';

const wallpapers = [
  { id: 'gradient-1', url: gradient1, name: 'Gradiente Pastel' },
  { id: 'cute-characters-1', url: cuteCharacters1, name: 'Personagens Fofos' },
  { id: 'geometric-1', url: geometric1, name: 'Geométrico' },
  { id: 'nature-1', url: nature1, name: 'Montanhas' },
  { id: 'beach-1', url: beach1, name: 'Praia Tropical' },
  { id: 'bubbles-1', url: bubbles1, name: 'Bolhas Coloridas' },
  { id: 'stars-1', url: stars1, name: 'Céu Estrelado' },
  { id: 'cherry-1', url: cherry1, name: 'Flores de Cerejeira' },
  { id: 'neon-1', url: neon1, name: 'Neon City' },
  { id: 'watercolor-1', url: watercolor1, name: 'Aquarela' },
  { id: 'forest-1', url: forest1, name: 'Floresta Outono' },
  { id: 'cute-animals-1', url: cuteAnimals1, name: 'Animais Fofos' },
  { id: 'waves-1', url: waves1, name: 'Ondas Minimalistas' },
  { id: 'sunset-1', url: sunset1, name: 'Pôr do Sol' },
  { id: 'cute-food-1', url: cuteFood1, name: 'Comidas Kawaii' },
  { id: 'marble-1', url: marble1, name: 'Mármore Elegante' },
  { id: 'clouds-1', url: clouds1, name: 'Nuvens Suaves' },
  { id: 'tropical-1', url: tropical1, name: 'Folhas Tropicais' },
  { id: 'space-1', url: space1, name: 'Espaço Kawaii' },
  { id: 'abstract-1', url: abstract1, name: 'Formas Abstratas' },
  { id: 'lavender-1', url: lavender1, name: 'Campo de Lavanda' },
  { id: 'teddy-1', url: teddy1, name: 'Ursinhos de Pelúcia' },
  { id: 'rainbow-1', url: rainbow1, name: 'Arco-íris' },
  { id: 'bokeh-1', url: bokeh1, name: 'Luzes Bokeh' },
  { id: 'unicorn-1', url: unicorn1, name: 'Unicórnios' },
  { id: 'gold-1', url: gold1, name: 'Dourado Elegante' },
  { id: 'aurora-1', url: aurora1, name: 'Aurora Boreal' },
  { id: 'panda-1', url: panda1, name: 'Pandas Fofinhos' },
  { id: 'retro-1', url: retro1, name: 'Retro 80s' },
  { id: 'butterfly-1', url: butterfly1, name: 'Jardim de Borboletas' },
];

interface WallpaperPickerProps {
  open: boolean;
  onClose: () => void;
  chatPartnerId: string;
  currentWallpaper?: string;
  onWallpaperChange?: (url: string) => void;
}

export default function WallpaperPicker({ 
  open, 
  onClose, 
  chatPartnerId, 
  currentWallpaper,
  onWallpaperChange 
}: WallpaperPickerProps) {
  const [selectedWallpaper, setSelectedWallpaper] = useState(currentWallpaper || '');
  const { toast } = useToast();

  const handleWallpaperSelect = async (wallpaperUrl: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if wallpaper already exists
      const { data: existing } = await supabase
        .from('chat_wallpapers')
        .select('*')
        .eq('user_id', user.id)
        .eq('chat_partner_id', chatPartnerId)
        .single();

      if (existing) {
        await supabase
          .from('chat_wallpapers')
          .update({ wallpaper_url: wallpaperUrl, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('chat_wallpapers')
          .insert({
            user_id: user.id,
            chat_partner_id: chatPartnerId,
            wallpaper_url: wallpaperUrl,
          });
      }

      setSelectedWallpaper(wallpaperUrl);
      onWallpaperChange?.(wallpaperUrl);
      
      toast({
        title: 'Papel de parede aplicado!',
      });
      
      onClose();
    } catch (error) {
      console.error('Error setting wallpaper:', error);
      toast({
        title: 'Erro ao aplicar papel de parede',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveWallpaper = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('chat_wallpapers')
        .delete()
        .eq('user_id', user.id)
        .eq('chat_partner_id', chatPartnerId);

      setSelectedWallpaper('');
      onWallpaperChange?.('');
      
      toast({
        title: 'Papel de parede removido!',
      });
      
      onClose();
    } catch (error) {
      console.error('Error removing wallpaper:', error);
      toast({
        title: 'Erro ao remover papel de parede',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Escolher Papel de Parede</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 h-[60vh] pr-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pb-4">
            {wallpapers.map((wallpaper) => (
              <div
                key={wallpaper.id}
                className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${
                  selectedWallpaper === wallpaper.url
                    ? 'border-primary shadow-lg'
                    : 'border-transparent'
                }`}
                onClick={() => handleWallpaperSelect(wallpaper.url)}
              >
                <img
                  src={wallpaper.url}
                  alt={wallpaper.name}
                  className="w-full aspect-[9/16] object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                  <p className="text-white text-xs font-medium text-center">
                    {wallpaper.name}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          {currentWallpaper && (
            <Button variant="destructive" onClick={handleRemoveWallpaper}>
              Remover Papel de Parede
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
