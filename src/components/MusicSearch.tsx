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

// Busca músicas reais na API pública do iTunes
const searchItunesMusic = async (query: string): Promise<Music[]> => {
  try {
    const response = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=25`
    );

    if (!response.ok) throw new Error("Erro na API do iTunes");

    const data = await response.json();

    if (!Array.isArray(data.results)) return [];

    return data.results.map((track: any) => ({
      id: track.trackId?.toString() || crypto.randomUUID(),
      name: track.trackName,
      artist: track.artistName,
      cover: track.artworkUrl100,
      preview: track.previewUrl,
    }));
  } catch (error) {
    console.error("Error searching iTunes:", error);
    return [];
  }
};

// Sugestões locais (fallback) – músicas reais populares
const SAMPLE_MUSIC: Music[] = [
  { id: "sample-1", name: "Melhor de Mim", artist: "Lupambo", cover: "" },
  { id: "sample-2", name: "2 Grown", artist: "Lil Tjay", cover: "" },
  { id: "sample-3", name: "Éternité", artist: "Fally Ipupa", cover: "" },
  { id: "sample-4", name: "TI TI TI", artist: "Gradur", cover: "" },
  { id: "sample-5", name: "Couleurs", artist: "Fally Ipupa", cover: "" },
  { id: "sample-6", name: "Mine", artist: "Jastin Martin", cover: "" },
  { id: "sample-7", name: "TA TUDO BEM", artist: "T-Rex", cover: "" },
  { id: "sample-8", name: "Mon bébé", artist: "Fally Ipupa", cover: "" },
];

// Consultas para carregar tendências ao abrir a aba
const TRENDING_QUERIES = [
  "Lupambo Melhor de Mim",
  "Lil Tjay 2 Grown",
  "Fally Ipupa",
  "T-Rex TA TUDO BEM",
];

export default function MusicSearch({ onSelect }: MusicSearchProps) {
  const [search, setSearch] = useState("");
  const [music, setMusic] = useState<Music[]>(SAMPLE_MUSIC);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Ao abrir, tenta carregar músicas reais; se falhar, mostra SAMPLE_MUSIC
  useEffect(() => {
    loadTrendingMusic();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTrendingMusic = async () => {
    setLoading(true);
    try {
      const allMusic: Music[] = [];

      for (const query of TRENDING_QUERIES) {
        const results = await searchItunesMusic(query);
        allMusic.push(...results.slice(0, 4));
      }

      if (allMusic.length > 0) {
        setMusic(allMusic);
      } else {
        setMusic(SAMPLE_MUSIC);
      }
    } catch (error) {
      console.error(error);
      setMusic(SAMPLE_MUSIC);
      toast.error("Erro ao carregar músicas, mostrando sugestões padrão");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (value: string) => {
    setSearch(value);

    const trimmed = value.trim();
    if (trimmed.length < 2) {
      // Poucos caracteres – volta para sugestões
      setSelectedCategory(null);
      setMusic(SAMPLE_MUSIC);
      return;
    }

    setLoading(true);
    try {
      const results = await searchItunesMusic(trimmed);

      if (results.length > 0) {
        setMusic(results);
      } else {
        // Se a API não retornar nada, filtra nossas sugestões locais
        const fallback = SAMPLE_MUSIC.filter(
          (m) =>
            m.name.toLowerCase().includes(trimmed.toLowerCase()) ||
            m.artist.toLowerCase().includes(trimmed.toLowerCase())
        );
        setMusic(fallback.length > 0 ? fallback : SAMPLE_MUSIC);
        toast.info("Nenhuma música encontrada, mostrando sugestões semelhantes");
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao buscar músicas, mostrando sugestões padrão");
      setMusic(SAMPLE_MUSIC);
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySearch = async (query: string) => {
    setSelectedCategory(query);
    setLoading(true);
    try {
      const results = await searchItunesMusic(query);
      setMusic(results.length > 0 ? results : SAMPLE_MUSIC);
    } catch (error) {
      console.error(error);
      setMusic(SAMPLE_MUSIC);
      toast.error("Erro ao buscar músicas, mostrando sugestões padrão");
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { name: "Aniversário", query: "happy birthday" },
    { name: "Encontro noturno", query: "romantic night" },
    { name: "Família", query: "family" },
    { name: "Festa", query: "party" },
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
