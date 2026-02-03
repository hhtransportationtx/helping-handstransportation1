import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface WelcomeSMSRequest {
  phone: string;
  full_name: string;
  email: string;
  password: string;
  role: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const authHeader = req.headers.get('Authorization');
  let currentUserId = null;

  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    currentUserId = user?.id;
  }

  try {
    console.log('Send welcome SMS function called');

    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

    console.log('Twilio config check:', {
      hasSid: !!twilioAccountSid,
      hasToken: !!twilioAuthToken,
      hasPhone: !!twilioPhoneNumber
    });

    const { phone, full_name, email, password, role }: WelcomeSMSRequest = await req.json();

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      console.log('Twilio not configured, logging as not sent');

      await supabase.from('sms_logs').insert({
        phone_number: phone,
        recipient_name: full_name,
        recipient_email: email,
        recipient_role: role,
        message_type: 'welcome',
        status: 'failed',
        error_message: 'Twilio not configured',
        sent_by: currentUserId,
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: 'User created successfully. SMS notifications require Twilio configuration.'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Request data:', { phone, full_name, email, role });

    if (!phone || !full_name || !email || !password || !role) {
      console.error('Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let formattedPhone = phone.replace(/\D/g, '');

    if (formattedPhone.length === 10) {
      formattedPhone = '+1' + formattedPhone;
    } else if (formattedPhone.length === 11 && formattedPhone.startsWith('1')) {
      formattedPhone = '+' + formattedPhone;
    } else if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+' + formattedPhone;
    }

    console.log('Formatted phone:', formattedPhone);

    const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
    const message = `Welcome to Helping Hands Transportation! Your account has been created.\n\n${roleLabel} Login Credentials:\nEmail: ${email}\nPassword: ${password}\n\nPlease keep this information secure. You can change your password after logging in.`;

    const twilioAuthHeader = 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthToken}`);

    console.log('Sending SMS to:', formattedPhone);

    const smsResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': twilioAuthHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: formattedPhone,
          From: twilioPhoneNumber,
          Body: message,
        }),
      }
    );

    if (!smsResponse.ok) {
      const error = await smsResponse.text();
      console.error('Twilio SMS error:', error);

      await supabase.from('sms_logs').insert({
        phone_number: formattedPhone,
        recipient_name: full_name,
        recipient_email: email,
        recipient_role: role,
        message_type: 'welcome',
        message_body: message,
        status: 'failed',
        error_message: error,
        sent_by: currentUserId,
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: 'User created successfully but SMS failed to send.',
          details: error
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const smsData = await smsResponse.json();
    console.log('SMS sent successfully:', smsData.sid);

    await supabase.from('sms_logs').insert({
      phone_number: formattedPhone,
      recipient_name: full_name,
      recipient_email: email,
      recipient_role: role,
      message_type: 'welcome',
      message_body: message,
      status: 'sent',
      twilio_sid: smsData.sid,
      sent_by: currentUserId,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Welcome SMS sent successfully',
        smsId: smsData.sid
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in send-welcome-sms:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
