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
    const url = new URL(req.url);
    const isCallback = url.pathname.includes('/callback');

    if (isCallback) {
      return await handleCallback(req);
    }

    const { tripId } = await req.json();

    if (!tripId) {
      return new Response(
        JSON.stringify({ error: 'Trip ID is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

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
        JSON.stringify({ error: 'Twilio not configured' }),
        {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: trip, error: tripError } = await supabase
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
          first_name,
          phone,
          preferred_language
        )
      `)
      .eq('id', tripId)
      .maybeSingle();

    if (tripError || !trip) {
      return new Response(
        JSON.stringify({ error: 'Trip not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const patient = trip.patients;
    if (!patient || !patient.phone) {
      return new Response(
        JSON.stringify({ error: 'Patient phone number not found' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const pickupTime = new Date(trip.scheduled_pickup_time);
    const timeString = pickupTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    const language = patient.preferred_language || 'english';
    const voiceLanguage = language === 'spanish' ? 'es-MX' : 'en-US';

    const callbackUrl = `${supabaseUrl}/functions/v1/ai-confirmation-call/callback?tripId=${tripId}&language=${language}`;

    const authHeader = 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthToken}`);

    const callResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Calls.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: patient.phone,
          From: twilioPhoneNumber,
          Url: callbackUrl,
          Method: 'POST',
          StatusCallback: `${callbackUrl}/status`,
          StatusCallbackEvent: 'completed',
          StatusCallbackMethod: 'POST'
        }),
      }
    );

    if (!callResponse.ok) {
      const error = await callResponse.text();
      return new Response(
        JSON.stringify({ error: `Call failed: ${error}` }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const callData = await callResponse.json();

    await supabase
      .from('trip_confirmations')
      .update({
        ai_call_attempted: true,
        ai_call_attempted_at: new Date().toISOString(),
        ai_call_status: 'initiated',
        updated_at: new Date().toISOString()
      })
      .eq('trip_id', tripId);

    await supabase.from('call_events').insert({
      call_sid: callData.sid,
      from_number: twilioPhoneNumber,
      to_number: patient.phone,
      direction: 'outbound',
      status: 'initiated',
      call_type: 'ai_confirmation'
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'AI confirmation call initiated',
        callSid: callData.sid
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in ai-confirmation-call:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function handleCallback(req: Request) {
  try {
    const url = new URL(req.url);
    const tripId = url.searchParams.get('tripId');
    const language = url.searchParams.get('language') || 'english';

    const formData = await req.formData();
    const digits = formData.get('Digits') as string;
    const callSid = formData.get('CallSid') as string;

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    if (digits) {
      let confirmationStatus = 'unknown';
      if (digits === '1') {
        confirmationStatus = 'confirmed';
        await supabase
          .from('trip_confirmations')
          .update({
            confirmation_status: 'confirmed',
            confirmed_at: new Date().toISOString(),
            confirmation_method: 'phone_ivr',
            ai_call_status: 'confirmed',
            updated_at: new Date().toISOString()
          })
          .eq('trip_id', tripId);
      } else if (digits === '2') {
        confirmationStatus = 'cancelled';
        await supabase
          .from('trip_confirmations')
          .update({
            confirmation_status: 'cancelled',
            confirmed_at: new Date().toISOString(),
            confirmation_method: 'phone_ivr',
            ai_call_status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('trip_id', tripId);

        await supabase
          .from('trips')
          .update({ status: 'cancelled' })
          .eq('id', tripId);
      }

      const confirmMessages = {
        english: {
          confirmed: 'Thank you for confirming your trip. We will see you tomorrow. Goodbye.',
          cancelled: 'Your trip has been cancelled. If this was a mistake, please call our main number. Goodbye.'
        },
        spanish: {
          confirmed: 'Gracias por confirmar su viaje. Nos vemos mañana. Adiós.',
          cancelled: 'Su viaje ha sido cancelado. Si esto fue un error, llame a nuestro número principal. Adiós.'
        }
      };

      const message = digits === '1'
        ? confirmMessages[language].confirmed
        : confirmMessages[language].cancelled;

      const voiceLanguage = language === 'spanish' ? 'es-MX' : 'en-US';

      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say voice="Polly.Joanna" language="${voiceLanguage}">${message}</Say>
        </Response>`,
        { headers: { 'Content-Type': 'text/xml' } }
      );
    }

    const { data: trip } = await supabase
      .from('trips')
      .select(`
        scheduled_pickup_time,
        pickup_address,
        patients (first_name, preferred_language)
      `)
      .eq('id', tripId)
      .maybeSingle();

    if (!trip) {
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, we could not find your trip information.</Say></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      );
    }

    const patient = trip.patients;
    const pickupTime = new Date(trip.scheduled_pickup_time);
    const timeString = pickupTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    const voiceLanguage = language === 'spanish' ? 'es-MX' : 'en-US';

    const greetings = {
      english: `Hello ${patient.first_name}, this is Helping Hands Transportation calling to confirm your ride scheduled for tomorrow at ${timeString} from ${trip.pickup_address}. Press 1 to confirm your trip, or press 2 to cancel. If you need to speak with someone, please call our main number.`,
      spanish: `Hola ${patient.first_name}, habla Helping Hands Transportation para confirmar su viaje programado para mañana a las ${timeString} desde ${trip.pickup_address}. Presione 1 para confirmar su viaje, o presione 2 para cancelar. Si necesita hablar con alguien, llame a nuestro número principal.`
    };

    const greeting = greetings[language] || greetings.english;

    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Gather numDigits="1" action="${url.pathname}?tripId=${tripId}&language=${language}" method="POST" timeout="10">
          <Say voice="Polly.Joanna" language="${voiceLanguage}">${greeting}</Say>
        </Gather>
        <Say voice="Polly.Joanna" language="${voiceLanguage}">We did not receive your response. Please call us to confirm your trip. Goodbye.</Say>
      </Response>`,
      { headers: { 'Content-Type': 'text/xml' } }
    );
  } catch (error) {
    console.error('Error in callback:', error);
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, an error occurred. Please call our main number.</Say></Response>',
      { headers: { 'Content-Type': 'text/xml' } }
    );
  }
}
