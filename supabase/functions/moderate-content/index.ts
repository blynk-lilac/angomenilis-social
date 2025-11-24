import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { content, type } = await req.json();

    // Usar Lovable AI para análise de conteúdo
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    const response = await fetch('https://api.lovable.app/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-5-mini',
        messages: [
          {
            role: 'system',
            content: `Você é um moderador de conteúdo para a plataforma social Blynk. Analise o conteúdo e determine se ele viola as diretrizes:
            
            PROIBIDO:
            - Palavras ofensivas, insultos, discurso de ódio
            - Linguagem discriminatória (racismo, sexismo, homofobia, etc.)
            - Ameaças ou incitação à violência
            - Assédio ou bullying
            - Conteúdo sexual explícito ou nudez
            - Spam ou conteúdo enganoso
            - Informações pessoais de terceiros
            
            Responda APENAS com um JSON no formato:
            {
              "isViolation": boolean,
              "severity": "low" | "medium" | "high" | "critical",
              "reason": "explicação breve",
              "categories": ["lista", "de", "categorias", "violadas"]
            }
            
            Seja rigoroso mas justo. Conteúdo em português e gírias brasileiras devem ser considerados.`
          },
          {
            role: 'user',
            content: `Analise este ${type}: "${content}"`
          }
        ],
        temperature: 0.3,
        max_tokens: 300
      }),
    });

    if (!response.ok) {
      throw new Error('Erro ao analisar conteúdo com IA');
    }

    const aiResult = await response.json();
    const analysis = JSON.parse(aiResult.choices[0].message.content);

    return new Response(
      JSON.stringify(analysis),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
