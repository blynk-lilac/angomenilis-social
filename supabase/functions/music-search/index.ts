import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DeezerTrack {
  id: number;
  title: string;
  duration: number;
  preview?: string;
  artist: {
    name: string;
  };
  album: {
    cover_medium?: string;
    cover_big?: string;
  };
}

interface DeezerResponse {
  data?: DeezerTrack[];
}

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const query = url.searchParams.get("query");

    console.log("🎵 Query recebida:", query);

    if (!query || query.trim().length === 0) {
      console.log("⚠️ Query vazia");
      return new Response(JSON.stringify({ tracks: [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Usar Deezer API com melhor configuração
    const deezerUrl = `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=200`;
    console.log("🔗 Chamando Deezer:", deezerUrl);
    
    const deezerResponse = await fetch(deezerUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json'
      }
    });
    
    console.log("📡 Status:", deezerResponse.status);

    if (!deezerResponse.ok) {
      console.error("❌ Erro Deezer:", deezerResponse.status);
      return new Response(JSON.stringify({ tracks: [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data: DeezerResponse = await deezerResponse.json();
    const totalTracks = data.data?.length || 0;
    console.log("📊 Total de tracks:", totalTracks);

    // Filtrar apenas músicas COM preview
    const tracksWithPreview = (data.data || []).filter((item) => item.preview);
    console.log("✅ Com preview:", tracksWithPreview.length);

    const tracks = tracksWithPreview.map((item) => ({
      id: item.id.toString(),
      name: item.title,
      artist: item.artist?.name || "Artista Desconhecido",
      cover: item.album?.cover_medium || item.album?.cover_big || "",
      duration: formatDuration(item.duration || 0),
      preview: item.preview,
    }));

    console.log("🎵 Retornando", tracks.length, "músicas");
    if (tracks.length > 0) {
      console.log("🎼 Primeira:", tracks[0].name, "-", tracks[0].artist);
    }

    return new Response(JSON.stringify({ tracks }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Erro geral:", error);
    return new Response(JSON.stringify({ tracks: [] }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
