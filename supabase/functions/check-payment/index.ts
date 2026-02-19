import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Not authenticated');
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error('Invalid token');

    const { subscription_id } = await req.json();

    const { data: sub } = await supabase
      .from('verification_subscriptions')
      .select('*')
      .eq('id', subscription_id)
      .eq('user_id', user.id)
      .single();

    if (!sub) throw new Error('Subscription not found');

    // Check with PliqPay API
    if (sub.transaction_id) {
      try {
        const checkResponse = await fetch(`https://api.plinqpay.com/v1/transaction/${sub.transaction_id}`, {
          headers: { 'api-key': PLIQPAY_API_KEY },
        });

        if (checkResponse.ok) {
          const txData = await checkResponse.json();
          const isPaid = txData.status === 'PAID' || txData.status === 'SUCCESS' || txData.status === 'COMPLETED';

          if (isPaid && sub.status !== 'paid') {
            await supabase
              .from('verification_subscriptions')
              .update({ status: 'paid', paid_at: new Date().toISOString(), updated_at: new Date().toISOString() })
              .eq('id', sub.id);

            await supabase
              .from('profiles')
              .update({ verified: true, badge_type: 'blue' })
              .eq('id', user.id);

            await supabase
              .from('admin_payment_logs')
              .insert({
                subscription_id: sub.id,
                user_id: user.id,
                amount: sub.amount,
                payment_reference: sub.payment_reference,
                status: 'received',
              });

            return new Response(JSON.stringify({ success: true, status: 'paid' }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          return new Response(JSON.stringify({ success: true, status: txData.status?.toLowerCase() || sub.status }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } catch (e) {
        console.error('PliqPay check error:', e);
      }
    }

    return new Response(JSON.stringify({ success: true, status: sub.status }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
