import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

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
// New wallpapers
import joker1 from '@/assets/wallpapers/joker-1.jpg';
import joker2 from '@/assets/wallpapers/joker-2.jpg';
import house1 from '@/assets/wallpapers/house-1.jpg';
import house2 from '@/assets/wallpapers/house-2.jpg';
import anime1 from '@/assets/wallpapers/anime-1.jpg';
import hero1 from '@/assets/wallpapers/hero-1.jpg';
import cyberpunk1 from '@/assets/wallpapers/cyberpunk-1.jpg';
import dragon1 from '@/assets/wallpapers/dragon-1.jpg';
import lion1 from '@/assets/wallpapers/lion-1.jpg';
import africa1 from '@/assets/wallpapers/africa-1.jpg';

const wallpaperCategories = [
  {
    name: 'Personagens',
    wallpapers: [
      { id: 'joker-1', url: joker1, name: 'Coringa Dark' },
      { id: 'joker-2', url: joker2, name: 'Coringa Cards' },
      { id: 'hero-1', url: hero1, name: 'Super Herói' },
      { id: 'anime-1', url: anime1, name: 'Anime Kawaii' },
      { id: 'dragon-1', url: dragon1, name: 'Dragão Épico' },
      { id: 'lion-1', url: lion1, name: 'Leão Rei' },
      { id: 'cute-characters-1', url: cuteCharacters1, name: 'Personagens Fofos' },
      { id: 'panda-1', url: panda1, name: 'Pandas Fofinhos' },
      { id: 'teddy-1', url: teddy1, name: 'Ursinhos de Pelúcia' },
      { id: 'unicorn-1', url: unicorn1, name: 'Unicórnios' },
      { id: 'cute-animals-1', url: cuteAnimals1, name: 'Animais Fofos' },
    ]
  },
  {
    name: 'Casas & Arquitetura',
    wallpapers: [
      { id: 'house-1', url: house1, name: 'Mansão Moderna' },
      { id: 'house-2', url: house2, name: 'Chalé na Floresta' },
      { id: 'cyberpunk-1', url: cyberpunk1, name: 'Cidade Cyberpunk' },
    ]
  },
  {
    name: 'Natureza',
    wallpapers: [
      { id: 'africa-1', url: africa1, name: 'Savana Africana' },
      { id: 'nature-1', url: nature1, name: 'Montanhas' },
      { id: 'beach-1', url: beach1, name: 'Praia Tropical' },
      { id: 'forest-1', url: forest1, name: 'Floresta Outono' },
      { id: 'sunset-1', url: sunset1, name: 'Pôr do Sol' },
      { id: 'lavender-1', url: lavender1, name: 'Campo de Lavanda' },
      { id: 'tropical-1', url: tropical1, name: 'Folhas Tropicais' },
      { id: 'cherry-1', url: cherry1, name: 'Flores de Cerejeira' },
      { id: 'butterfly-1', url: butterfly1, name: 'Jardim de Borboletas' },
      { id: 'waves-1', url: waves1, name: 'Ondas Minimalistas' },
      { id: 'clouds-1', url: clouds1, name: 'Nuvens Suaves' },
      { id: 'aurora-1', url: aurora1, name: 'Aurora Boreal' },
    ]
  },
  {
    name: 'Espaço & Cosmos',
    wallpapers: [
      { id: 'space-1', url: space1, name: 'Espaço Kawaii' },
      { id: 'stars-1', url: stars1, name: 'Céu Estrelado' },
    ]
  },
  {
    name: 'Abstrato & Arte',
    wallpapers: [
      { id: 'gradient-1', url: gradient1, name: 'Gradiente Pastel' },
      { id: 'geometric-1', url: geometric1, name: 'Geométrico' },
      { id: 'neon-1', url: neon1, name: 'Neon City' },
      { id: 'watercolor-1', url: watercolor1, name: 'Aquarela' },
      { id: 'abstract-1', url: abstract1, name: 'Formas Abstratas' },
      { id: 'rainbow-1', url: rainbow1, name: 'Arco-íris' },
      { id: 'bokeh-1', url: bokeh1, name: 'Luzes Bokeh' },
      { id: 'retro-1', url: retro1, name: 'Retro 80s' },
      { id: 'bubbles-1', url: bubbles1, name: 'Bolhas Coloridas' },
    ]
  },
  {
    name: 'Elegante',
    wallpapers: [
      { id: 'marble-1', url: marble1, name: 'Mármore Elegante' },
      { id: 'gold-1', url: gold1, name: 'Dourado Elegante' },
    ]
  },
  {
    name: 'Kawaii',
    wallpapers: [
      { id: 'cute-food-1', url: cuteFood1, name: 'Comidas Kawaii' },
    ]
  },
];

// Flatten all wallpapers for backward compatibility
const wallpapers = wallpaperCategories.flatMap(cat => cat.wallpapers);

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
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleWallpaperSelect = async (wallpaperUrl: string) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveWallpaper = async () => {
    setSaving(true);
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
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2 border-b border-border bg-gradient-to-r from-primary/10 to-secondary/10 flex-shrink-0">
          <DialogTitle className="text-lg font-bold">🎨 Escolher Papel de Parede</DialogTitle>
          <p className="text-xs text-muted-foreground">{wallpapers.length} wallpapers disponíveis</p>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-3 space-y-6">
            {wallpaperCategories.map((category, catIndex) => (
              <div key={category.name}>
                <h3 className="text-sm font-semibold text-primary mb-3 px-1 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary"></span>
                  {category.name}
                  <span className="text-xs text-muted-foreground font-normal">({category.wallpapers.length})</span>
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {category.wallpapers.map((wallpaper, index) => (
                    <motion.button
                      key={wallpaper.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: (catIndex * 0.1) + (index * 0.02) }}
                      disabled={saving}
                      className={`relative aspect-[9/16] rounded-xl overflow-hidden border-2 transition-all hover:scale-[1.03] active:scale-95 shadow-lg ${
                        selectedWallpaper === wallpaper.url
                          ? 'border-primary ring-2 ring-primary/30 shadow-primary/20'
                          : 'border-transparent hover:border-primary/30'
                      }`}
                      onClick={() => handleWallpaperSelect(wallpaper.url)}
                    >
                      <img
                        src={wallpaper.url}
                        alt={wallpaper.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <p className="absolute bottom-1.5 left-1.5 right-1.5 text-white text-[10px] font-medium text-center truncate drop-shadow-lg">
                        {wallpaper.name}
                      </p>
                      {selectedWallpaper === wallpaper.url && (
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute top-1.5 right-1.5 h-6 w-6 bg-primary rounded-full flex items-center justify-center shadow-lg"
                        >
                          <Check className="h-3.5 w-3.5 text-white" />
                        </motion.div>
                      )}
                    </motion.button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 border-t border-border flex gap-2 bg-background/95 backdrop-blur">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          {currentWallpaper && (
            <Button 
              variant="destructive" 
              onClick={handleRemoveWallpaper} 
              disabled={saving}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Remover
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
