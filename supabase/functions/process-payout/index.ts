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
    const PLIQPAY_SECRET_KEY = Deno.env.get('PLIQPAY_SECRET_KEY');
    const PLIQPAY_PUBLIC_KEY = Deno.env.get('PLIQPAY_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Not authenticated');
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error('Invalid token');

    // Check admin role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) throw new Error('Not authorized - admin only');

    const { withdrawal_id, action } = await req.json();

    if (!withdrawal_id) throw new Error('withdrawal_id required');
    if (!['approve', 'reject'].includes(action)) throw new Error('Invalid action');

    // Get withdrawal
    const { data: withdrawal, error: wErr } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('id', withdrawal_id)
      .single();

    if (wErr || !withdrawal) throw new Error('Withdrawal not found');
    if (withdrawal.status !== 'pending') throw new Error('Withdrawal already processed');

    if (action === 'reject') {
      await supabase.from('withdrawal_requests').update({
        status: 'rejected',
        payout_status: 'rejected',
        processed_by: user.id,
        processed_at: new Date().toISOString(),
      }).eq('id', withdrawal_id);

      return new Response(JSON.stringify({ success: true, status: 'rejected' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Try PlinqPay payout API (if supported)
    let payoutSuccess = false;
    let payoutReference = `MANUAL_${Date.now()}`;
    let errorMsg = null;

    if (PLIQPAY_SECRET_KEY) {
      try {
        // Attempt PlinqPay transfer/payout endpoint
        const payoutResponse = await fetch('https://api.plinqpay.com/v1/transfer', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': PLIQPAY_SECRET_KEY,
          },
          body: JSON.stringify({
            amount: withdrawal.amount,
            recipient: {
              iban: withdrawal.iban,
              name: withdrawal.account_name,
              phone: withdrawal.phone || '',
            },
            description: `Blynk Payout - ${withdrawal.id}`,
            reference: `PAYOUT_${withdrawal.id}_${Date.now()}`,
          }),
        });

        const responseText = await payoutResponse.text();
        console.log('PlinqPay payout response:', payoutResponse.status, responseText);

        if (payoutResponse.ok) {
          try {
            const payoutData = JSON.parse(responseText);
            payoutReference = payoutData.reference || payoutData.id || payoutReference;
            payoutSuccess = true;
          } catch {
            // JSON parse failed but request was OK
            payoutSuccess = true;
          }
        } else {
          errorMsg = `PlinqPay: ${payoutResponse.status} - ${responseText}`;
          console.log('PlinqPay payout not supported or failed, using manual processing');
        }
      } catch (e) {
        errorMsg = `PlinqPay connection error: ${e.message}`;
        console.error('PlinqPay payout error:', e);
      }
    }

    // Update withdrawal as approved (manual or automatic)
    await supabase.from('withdrawal_requests').update({
      status: 'approved',
      payout_status: payoutSuccess ? 'completed' : 'manual_transfer',
      payout_reference: payoutReference,
      processed_by: user.id,
      processed_at: new Date().toISOString(),
      error_message: errorMsg,
    }).eq('id', withdrawal_id);

    // Log the payout
    await supabase.from('admin_payment_logs').insert({
      user_id: withdrawal.user_id,
      amount: -withdrawal.amount,
      payment_reference: payoutReference,
      status: 'withdrawn',
      subscription_id: null,
    });

    return new Response(JSON.stringify({
      success: true,
      status: 'approved',
      payout_method: payoutSuccess ? 'automatic' : 'manual_transfer',
      payout_reference: payoutReference,
      iban: withdrawal.iban,
      account_name: withdrawal.account_name,
      amount: withdrawal.amount,
      message: payoutSuccess
        ? 'Payout processado automaticamente via PlinqPay'
        : `Transfira manualmente ${withdrawal.amount} kz para IBAN ${withdrawal.iban} (${withdrawal.account_name})`,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Process payout error:', message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
