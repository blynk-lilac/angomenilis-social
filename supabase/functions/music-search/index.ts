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

    console.log("Received query:", query);

    if (!query || query.trim().length === 0) {
      console.log("Empty query, returning empty array");
      return new Response(JSON.stringify({ tracks: [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const deezerUrl = `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=50`;
    console.log("Fetching from Deezer:", deezerUrl);
    
    const deezerResponse = await fetch(deezerUrl);
    console.log("Deezer response status:", deezerResponse.status);

    if (!deezerResponse.ok) {
      const errorText = await deezerResponse.text();
      console.error("Deezer API error:", errorText);
      return new Response(JSON.stringify({ tracks: [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data: DeezerResponse = await deezerResponse.json();
    console.log("Deezer data:", JSON.stringify(data).substring(0, 200));

    const tracks = (data.data || []).map((item) => ({
      id: item.id.toString(),
      name: item.title,
      artist: item.artist?.name || "",
      cover: item.album?.cover_medium || item.album?.cover_big || "",
      duration: formatDuration(item.duration || 0),
      preview: item.preview,
    }));

    console.log("Returning tracks count:", tracks.length);

    return new Response(JSON.stringify({ tracks }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("music-search function error", error);
    return new Response(JSON.stringify({ tracks: [] }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
