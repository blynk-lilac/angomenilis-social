import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Music, Play, Search } from "lucide-react";

interface Music {
  id: string;
  name: string;
  artist: string;
  cover: string;
}

interface MusicSearchProps {
  onSelect: (music: Music) => void;
}

// Músicas de exemplo
const SAMPLE_MUSIC: Music[] = [
  { id: "1", name: "Melhor de Mim", artist: "Lupambo", cover: "🎵" },
  { id: "2", name: "2 Grown", artist: "Lil Tjay", cover: "🎵" },
  { id: "3", name: "Éternité", artist: "Fally Ipupa", cover: "🎵" },
  { id: "4", name: "TI TI TI", artist: "Gradur", cover: "🎵" },
  { id: "5", name: "Couleurs", artist: "Fally Ipupa", cover: "🎵" },
  { id: "6", name: "Mine", artist: "Jastin Martin", cover: "🎵" },
  { id: "7", name: "TA TUDO BEM", artist: "T-Rex", cover: "🎵" },
  { id: "8", name: "Mon bébé", artist: "Fally Ipupa", cover: "🎵" },
];

export default function MusicSearch({ onSelect }: MusicSearchProps) {
  const [search, setSearch] = useState("");
  const [filtered, setFiltered] = useState(SAMPLE_MUSIC);

  const handleSearch = (value: string) => {
    setSearch(value);
    if (value.trim() === "") {
      setFiltered(SAMPLE_MUSIC);
    } else {
      setFiltered(
        SAMPLE_MUSIC.filter(
          (music) =>
            music.name.toLowerCase().includes(value.toLowerCase()) ||
            music.artist.toLowerCase().includes(value.toLowerCase())
        )
      );
    }
  };

  return (
    <div className="space-y-4">
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
        <Button variant="secondary" size="sm" className="rounded-full flex-shrink-0">
          Aniversário
        </Button>
        <Button variant="secondary" size="sm" className="rounded-full flex-shrink-0">
          Encontro noturno
        </Button>
        <Button variant="secondary" size="sm" className="rounded-full flex-shrink-0">
          Família
        </Button>
      </div>

      <div>
        <h3 className="font-semibold mb-3">Sugestões</h3>
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {filtered.map((music) => (
              <div
                key={music.id}
                onClick={() => onSelect(music)}
                className="flex items-center gap-3 p-3 hover:bg-accent rounded-lg cursor-pointer transition-colors"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg flex items-center justify-center text-2xl">
                  {music.cover}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{music.name}</p>
                  <p className="text-sm text-muted-foreground truncate">{music.artist}</p>
                </div>
                <Button variant="ghost" size="icon" className="flex-shrink-0">
                  <Play className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}