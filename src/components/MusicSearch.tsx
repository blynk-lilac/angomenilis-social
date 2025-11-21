import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, X, ArrowRight, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Music {
  id: string;
  name: string;
  artist: string;
  cover: string;
  duration: string;
  preview?: string;
}

interface MusicSearchProps {
  onSelect: (music: Music) => void;
  onClose?: () => void;
}

// Busca músicas reais na API pública do Deezer
const searchDeezerMusic = async (query: string): Promise<Music[]> => {
  try {
    const response = await fetch(
      `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=200`
    );
    const data = await response.json();
    
    if (!data.data || data.data.length === 0) {
      return [];
    }
    
    return data.data.map((item: any) => ({
      id: item.id.toString(),
      name: item.title,
      artist: item.artist.name,
      cover: item.album.cover_medium || item.album.cover_big,
      duration: formatDuration(item.duration),
      preview: item.preview,
    }));
  } catch (error) {
    console.error('Error searching Deezer:', error);
    return [];
  }
};

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Consultas para carregar tendências de músicas angolanas
const TRENDING_QUERIES = [
  "Anselmo Ralph",
  "C4 Pedro",
  "Yuri da Cunha",
  "Kalibrados",
  "Landrick",
  "Edmázia Mayembe",
  "Matias Damásio",
  "Pérola",
  "Neyna",
  "Djodje",
];

export default function MusicSearch({ onSelect, onClose }: MusicSearchProps) {
  const [search, setSearch] = useState("");
  const [music, setMusic] = useState<Music[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTrendingMusic();
  }, []);

  const loadTrendingMusic = async () => {
    setLoading(true);
    try {
      const allMusic: Music[] = [];

      for (const query of TRENDING_QUERIES) {
        const results = await searchDeezerMusic(query);
        allMusic.push(...results.slice(0, 20));
      }

      if (allMusic.length > 0) {
        setMusic(allMusic);
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar músicas");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (value: string) => {
    setSearch(value);

    const trimmed = value.trim();
    if (trimmed.length < 2) {
      loadTrendingMusic();
      return;
    }

    setLoading(true);
    try {
      const results = await searchDeezerMusic(trimmed);

      if (results.length > 0) {
        setMusic(results);
      } else {
        toast.info("Nenhuma música encontrada");
        setMusic([]);
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao buscar músicas");
      setMusic([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-border">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="flex-shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar música"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10 pr-10 bg-secondary/50 border-0"
            autoFocus
          />
          {search && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setSearch("");
                loadTrendingMusic();
              }}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Music List */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="p-2">
              {music.map((track) => (
                <div
                  key={track.id}
                  onClick={() => onSelect(track)}
                  className="flex items-center gap-3 p-3 hover:bg-accent/50 rounded-lg cursor-pointer transition-colors active:bg-accent"
                >
                  <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 relative bg-secondary">
                    {track.cover ? (
                      <img 
                        src={track.cover} 
                        alt={track.name} 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-secondary">
                        <div className="w-8 h-8 rounded-full bg-background/50" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-foreground">{track.name}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {track.artist} · {track.duration}
                    </p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="flex-shrink-0 rounded-full bg-secondary/50 hover:bg-secondary"
                  >
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
