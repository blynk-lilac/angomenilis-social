import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Music, Play, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Music {
  id: string;
  name: string;
  artist: string;
  cover: string;
  preview?: string;
}

interface MusicSearchProps {
  onSelect: (music: Music) => void;
}

// API do iTunes para músicas reais
const searchItunesMusic = async (query: string): Promise<Music[]> => {
  try {
    const response = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=25`
    );
    const data = await response.json();
    
    return data.results.map((track: any) => ({
      id: track.trackId.toString(),
      name: track.trackName,
      artist: track.artistName,
      cover: track.artworkUrl100,
      preview: track.previewUrl
    }));
  } catch (error) {
    console.error('Error searching iTunes:', error);
    return [];
  }
};

// Músicas populares como padrão
const TRENDING_QUERIES = [
  "Fally Ipupa",
  "Burna Boy",
  "Wizkid",
  "Davido",
  "Diamond Platnumz",
  "Sauti Sol"
];

export default function MusicSearch({ onSelect }: MusicSearchProps) {
  const [search, setSearch] = useState("");
  const [music, setMusic] = useState<Music[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Carrega músicas populares ao iniciar
  useEffect(() => {
    loadTrendingMusic();
  }, []);

  const loadTrendingMusic = async () => {
    setLoading(true);
    try {
      const allMusic: Music[] = [];
      for (const query of TRENDING_QUERIES) {
        const results = await searchItunesMusic(query);
        allMusic.push(...results.slice(0, 4));
      }
      setMusic(allMusic);
    } catch (error) {
      toast.error("Erro ao carregar músicas");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (value: string) => {
    setSearch(value);
    if (value.trim().length < 2) {
      loadTrendingMusic();
      return;
    }

    setLoading(true);
    try {
      const results = await searchItunesMusic(value);
      setMusic(results);
      if (results.length === 0) {
        toast.info("Nenhuma música encontrada");
      }
    } catch (error) {
      toast.error("Erro ao buscar músicas");
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySearch = async (category: string) => {
    setSelectedCategory(category);
    setLoading(true);
    try {
      const results = await searchItunesMusic(category);
      setMusic(results);
    } catch (error) {
      toast.error("Erro ao buscar músicas");
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { name: "Aniversário", query: "happy birthday" },
    { name: "Encontro noturno", query: "romantic night" },
    { name: "Família", query: "family celebration" },
    { name: "Festa", query: "party music" },
  ];

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisa música ou intérpretes"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map((cat) => (
          <Button
            key={cat.name}
            variant={selectedCategory === cat.query ? "default" : "secondary"}
            size="sm"
            className="rounded-full flex-shrink-0"
            onClick={() => handleCategorySearch(cat.query)}
          >
            {cat.name}
          </Button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">
            {search.trim() ? "Resultados" : selectedCategory ? "Resultados" : "Sugestões"}
          </h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="space-y-2 pr-4">
              {music.map((track) => (
                <div
                  key={track.id}
                  onClick={() => onSelect(track)}
                  className="flex items-center gap-3 p-3 hover:bg-accent rounded-lg cursor-pointer transition-colors"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                    {track.cover ? (
                      <img src={track.cover} alt={track.name} className="w-full h-full object-cover" />
                    ) : (
                      <Music className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{track.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{track.artist}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="flex-shrink-0">
                    <Play className="h-4 w-4" />
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
