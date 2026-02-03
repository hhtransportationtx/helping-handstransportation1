import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Supabase configuration missing' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const twoHoursAgo = new Date();
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

    const { data: pendingConfirmations, error: confirmationsError } = await supabase
      .from('trip_confirmations')
      .select(`
        id,
        trip_id,
        patient_id,
        confirmation_sent_at,
        ai_call_attempted,
        trips (
          id,
          scheduled_pickup_time,
          status
        )
      `)
      .eq('confirmation_status', 'pending')
      .eq('ai_call_attempted', false)
      .lte('confirmation_sent_at', twoHoursAgo.toISOString())
      .not('trips.status', 'eq', 'cancelled');

    if (confirmationsError) {
      throw confirmationsError;
    }

    if (!pendingConfirmations || pendingConfirmations.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No pending confirmations requiring follow-up',
          count: 0
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const results = [];

    for (const confirmation of pendingConfirmations) {
      try {
        const trip = confirmation.trips;

        if (!trip) {
          continue;
        }

        const tripDate = new Date(trip.scheduled_pickup_time);
        const now = new Date();

        if (tripDate < now) {
          continue;
        }

        const callResponse = await fetch(
          `${supabaseUrl}/functions/v1/ai-confirmation-call`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`
            },
            body: JSON.stringify({ tripId: trip.id })
          }
        );

        if (callResponse.ok) {
          results.push({
            tripId: trip.id,
            status: 'call_initiated',
            confirmationId: confirmation.id
          });
        } else {
          const error = await callResponse.text();
          results.push({
            tripId: trip.id,
            status: 'call_failed',
            error: error,
            confirmationId: confirmation.id
          });
        }

        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`Error processing confirmation ${confirmation.id}:`, error);
        results.push({
          confirmationId: confirmation.id,
          status: 'error',
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.status === 'call_initiated').length;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Initiated ${successCount} AI confirmation call(s)`,
        totalPending: pendingConfirmations.length,
        results: results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in check-pending-confirmations:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
