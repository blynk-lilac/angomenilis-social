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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    console.log('Webhook received:', JSON.stringify(body));

    // PlinqPay callback structure based on docs
    const externId = body.externId || body.externalId;
    const status = body.status;
    const reference = body.reference;
    const transactionId = body.id;

    if (!externId) {
      return new Response(JSON.stringify({ error: 'Missing externId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find the subscription
    const { data: subscription, error: findError } = await supabase
      .from('verification_subscriptions')
      .select('*')
      .eq('external_id', externId)
      .single();

    if (findError || !subscription) {
      console.error('Subscription not found for:', externId);
      return new Response(JSON.stringify({ error: 'Subscription not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check payment status - PlinqPay uses SUCCESS status
    const isPaid = status === 'SUCCESS' || status === 'PAID' || status === 'COMPLETED';
    const isFailed = status === 'FAILED' || status === 'CANCELLED';

    if (isPaid) {
      // Update subscription to paid
      await supabase
        .from('verification_subscriptions')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          payment_reference: reference || subscription.payment_reference,
          transaction_id: transactionId || subscription.transaction_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscription.id);

      // Verify the user profile
      await supabase
        .from('profiles')
        .update({
          verified: true,
          badge_type: 'blue',
        })
        .eq('id', subscription.user_id);

      // Log for admin
      await supabase
        .from('admin_payment_logs')
        .insert({
          subscription_id: subscription.id,
          user_id: subscription.user_id,
          amount: subscription.amount,
          payment_reference: reference || subscription.payment_reference,
          status: 'received',
        });

      // Create notification
      await supabase
        .from('notifications')
        .insert({
          user_id: subscription.user_id,
          type: 'verification',
          title: 'Selo Verificado!',
          message: 'O seu pagamento foi confirmado. O selo de verificação foi ativado na sua conta!',
        });

      console.log('Payment confirmed for user:', subscription.user_id);
    } else if (isFailed) {
      await supabase
        .from('verification_subscriptions')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscription.id);
      
      console.log('Payment failed for user:', subscription.user_id);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Webhook error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
