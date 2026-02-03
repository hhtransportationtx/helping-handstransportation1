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
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Supabase configuration missing' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      return new Response(
        JSON.stringify({ 
          error: 'Twilio not configured',
          message: 'SMS confirmations require Twilio configuration'
        }),
        {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    const { data: trips, error: tripsError } = await supabase
      .from('trips')
      .select(`
        id,
        scheduled_pickup_time,
        pickup_address,
        dropoff_address,
        patient_id,
        patients (
          id,
          full_name,
          phone,
          preferred_language
        )
      `)
      .gte('scheduled_pickup_time', tomorrow.toISOString())
      .lt('scheduled_pickup_time', dayAfterTomorrow.toISOString())
      .in('status', ['scheduled', 'pending', 'active']);

    if (tripsError) {
      throw tripsError;
    }

    if (!trips || trips.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'No trips scheduled for tomorrow',
          count: 0
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const results = [];
    const authHeader = 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthToken}`);

    for (const trip of trips) {
      try {
        const patient = trip.patients;
        if (!patient || !patient.phone) {
          results.push({
            tripId: trip.id,
            status: 'skipped',
            reason: 'No phone number'
          });
          continue;
        }

        const existingConfirmation = await supabase
          .from('trip_confirmations')
          .select('id, confirmation_status')
          .eq('trip_id', trip.id)
          .maybeSingle();

        if (existingConfirmation.data && existingConfirmation.data.confirmation_status === 'confirmed') {
          results.push({
            tripId: trip.id,
            status: 'already_confirmed',
            reason: 'Trip already confirmed'
          });
          continue;
        }

        const pickupTime = new Date(trip.scheduled_pickup_time);
        const timeString = pickupTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });

        const language = patient.preferred_language || 'english';

        const messages = {
          english: `Helping Hands Transportation: Your ride is scheduled for tomorrow at ${timeString}. From: ${trip.pickup_address} To: ${trip.dropoff_address}. Reply YES to confirm or NO to cancel. If no response, we will call you.`,
          spanish: `Helping Hands Transportation: Su viaje está programado para mañana a las ${timeString}. Desde: ${trip.pickup_address} Hasta: ${trip.dropoff_address}. Responda SÍ para confirmar o NO para cancelar. Si no responde, le llamaremos.`
        };

        const message = messages[language] || messages.english;

        const smsResponse = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              To: patient.phone,
              From: twilioPhoneNumber,
              Body: message,
            }),
          }
        );

        if (!smsResponse.ok) {
          const error = await smsResponse.text();
          results.push({
            tripId: trip.id,
            status: 'failed',
            reason: `SMS failed: ${error}`
          });
          continue;
        }

        if (existingConfirmation.data) {
          await supabase
            .from('trip_confirmations')
            .update({
              confirmation_sent_at: new Date().toISOString(),
              confirmation_status: 'pending',
              language_sent: language,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingConfirmation.data.id);
        } else {
          await supabase
            .from('trip_confirmations')
            .insert({
              trip_id: trip.id,
              patient_id: patient.id,
              confirmation_status: 'pending',
              language_sent: language,
              confirmation_sent_at: new Date().toISOString()
            });
        }

        results.push({
          tripId: trip.id,
          patientName: patient.full_name,
          status: 'sent',
          phone: patient.phone
        });

      } catch (error) {
        console.error(`Error processing trip ${trip.id}:`, error);
        results.push({
          tripId: trip.id,
          status: 'error',
          reason: error.message
        });
      }
    }

    const successCount = results.filter(r => r.status === 'sent').length;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${successCount} confirmation(s)`,
        totalTrips: trips.length,
        results: results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in send-trip-confirmations:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});