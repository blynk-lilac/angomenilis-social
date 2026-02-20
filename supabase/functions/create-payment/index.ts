import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PLIQPAY_API_KEY = Deno.env.get('PLIQPAY_API_KEY');
    if (!PLIQPAY_API_KEY) throw new Error('PLIQPAY_API_KEY not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Not authenticated');
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error('Invalid token');

    const { plan_type, amount } = await req.json();

    // Validate plan
    const validPlans: Record<string, number> = {
      basic: 500,
      premium: 2000,
      elite: 5000,
    };

    if (!validPlans[plan_type] || validPlans[plan_type] !== amount) {
      throw new Error('Invalid plan');
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, full_name, email, phone')
      .eq('id', user.id)
      .single();

    const externalId = `verify_${user.id}_${Date.now()}`;
    const callbackUrl = `${supabaseUrl}/functions/v1/payment-webhook`;

    console.log('Creating PlinqPay transaction:', {
      externalId,
      callbackUrl,
      amount,
      plan_type,
    });

    // Create PlinqPay transaction - following exact API docs
    const pliqResponse = await fetch('https://api.plinqpay.com/v1/transaction', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': PLIQPAY_API_KEY,
      },
      body: JSON.stringify({
        externalId,
        callbackUrl,
        method: 'REFERENCE',
        client: {
          name: profile?.full_name || profile?.first_name || 'User',
          email: profile?.email || user.email || '',
          phone: profile?.phone || '+244900000000',
        },
        items: [
          {
            title: `Selo Verificação Blynk - ${plan_type}`,
            price: amount,
            quantity: 1,
          },
        ],
        amount,
      }),
    });

    const responseText = await pliqResponse.text();
    console.log('PlinqPay response status:', pliqResponse.status);
    console.log('PlinqPay response body:', responseText);

    if (!pliqResponse.ok) {
      throw new Error(`PlinqPay error [${pliqResponse.status}]: ${responseText}`);
    }

    let pliqData;
    try {
      pliqData = JSON.parse(responseText);
    } catch {
      throw new Error(`Invalid JSON response from PlinqPay: ${responseText}`);
    }

    console.log('PlinqPay parsed data:', JSON.stringify(pliqData));

    // Extract reference and entity from response
    const paymentReference = pliqData.reference || pliqData.data?.reference || null;
    const paymentEntity = pliqData.entity || pliqData.data?.entity || '01055';
    const transactionId = pliqData.id || pliqData.data?.id || null;

    // Save subscription record
    const { data: subscription, error: dbError } = await supabase
      .from('verification_subscriptions')
      .insert({
        user_id: user.id,
        plan_type,
        amount,
        status: 'pending',
        payment_reference: paymentReference,
        external_id: externalId,
        transaction_id: transactionId,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (dbError) throw dbError;

    return new Response(JSON.stringify({
      success: true,
      subscription,
      payment: pliqData,
      reference: paymentReference,
      entity: paymentEntity,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Create payment error:', message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
