import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendSmsRequest {
  phoneNumber: string;
  code: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phoneNumber, code }: SendSmsRequest = await req.json();
    
    console.log('Sending SMS verification code to:', phoneNumber);

    const apiKey = Deno.env.get('TEXTLOCAL_API_KEY');
    if (!apiKey) {
      throw new Error('TEXTLOCAL_API_KEY not configured');
    }

    // Formatar mensagem
    const message = `Seu código de verificação Blynk é: ${code}. Válido por 5 minutos.`;

    // Enviar SMS via TextLocal
    const formData = new URLSearchParams();
    formData.append('apikey', apiKey);
    formData.append('numbers', phoneNumber);
    formData.append('message', message);
    formData.append('sender', 'Blynk');

    const response = await fetch('https://api.textlocal.in/send/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const result = await response.json();
    
    if (result.status !== 'success') {
      console.error('TextLocal API error:', result);
      throw new Error(result.errors?.[0]?.message || 'Failed to send SMS');
    }

    console.log('SMS sent successfully:', result);

    return new Response(
      JSON.stringify({ success: true, message: 'SMS enviado com sucesso' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in send-sms-verification:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);