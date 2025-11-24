import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface JamendoTrack {
  id: string;
  name: string;
  artist_name: string;
  image: string;
  duration: number;
  audio: string;
  audiodownload: string;
}

interface JamendoResponse {
  results: JamendoTrack[];
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
    const query = url.searchParams.get("query") || "";

    if (!query) {
      console.log("⚠️ Query vazia");
      return new Response(
        JSON.stringify({ tracks: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("🎵 Buscando músicas na Jamendo:", query);
    
    // Usar Jamendo API - música gratuita e sem restrições
    const jamendoUrl = `https://api.jamendo.com/v3.0/tracks/?client_id=56d30c95&format=json&limit=200&search=${encodeURIComponent(query)}&include=musicinfo&audioformat=mp32`;
    
    console.log("🔗 URL Jamendo:", jamendoUrl);
    
    const response = await fetch(jamendoUrl);
    console.log("📡 Status Jamendo:", response.status);

    if (!response.ok) {
      throw new Error(`Jamendo API error: ${response.status}`);
    }

    const data: JamendoResponse = await response.json();
    console.log("📊 Jamendo retornou:", data.results?.length || 0, "músicas");

    if (!data.results || data.results.length === 0) {
      console.log("❌ Nenhuma música encontrada");
      return new Response(
        JSON.stringify({ tracks: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mapear resultados para formato esperado
    const tracks = data.results.map((track: JamendoTrack) => ({
      id: track.id,
      name: track.name,
      artist: track.artist_name,
      cover: track.image || "https://via.placeholder.com/300x300?text=Music",
      duration: formatDuration(track.duration),
      preview: track.audio || track.audiodownload, // Jamendo fornece áudio completo gratuito
    }));

    console.log("✅ Retornando", tracks.length, "músicas");
    console.log("🎵 Primeira música:", tracks[0]?.name, "por", tracks[0]?.artist);

    return new Response(
      JSON.stringify({ tracks }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ Erro na API:", error);
    return new Response(
      JSON.stringify({ 
        tracks: [],
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
};

serve(handler);
