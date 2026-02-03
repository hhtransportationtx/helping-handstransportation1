import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

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
    const { driverPhone, memberPhone, tripId } = await req.json();

    if (!driverPhone || !memberPhone) {
      return new Response(
        JSON.stringify({ error: 'Driver and member phone numbers are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      return new Response(
        JSON.stringify({ 
          error: 'Twilio not configured',
          message: 'Please configure Twilio credentials to enable masked calling'
        }),
        {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const twimlUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/twilio-voice?to=${encodeURIComponent(memberPhone)}&tripId=${tripId}`;

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
          To: driverPhone,
          From: twilioPhoneNumber,
          Url: twimlUrl,
          StatusCallback: `${Deno.env.get('SUPABASE_URL')}/functions/v1/twilio-voice/status`,
        }),
      }
    );

    if (!callResponse.ok) {
      const error = await callResponse.text();
      console.error('Twilio API error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to initiate call', details: error }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const callData = await callResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        callSid: callData.sid,
        message: 'Call initiated successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in masked-call function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});