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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { invoice_number, amount, patient_id, payment_method, paid_date } = await req.json();

    if (!invoice_number || !amount || !patient_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('full_name, phone, email')
      .eq('id', patient_id)
      .maybeSingle();

    if (patientError || !patient) {
      return new Response(
        JSON.stringify({ error: 'Patient not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: paymentSettings } = await supabase
      .from('payment_settings')
      .select('*')
      .eq('is_active', true)
      .order('payment_type');

    const paymentAccounts = paymentSettings || [];

    const results = {
      sms: { sent: false, message: '' },
      email: { sent: false, message: '' },
    };

    const formattedAmount = parseFloat(amount).toFixed(2);
    const formattedDate = paid_date
      ? new Date(paid_date).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })
      : new Date().toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });

    const paymentMethodText = payment_method
      ? payment_method.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
      : 'your payment method';

    if (patient.phone && twilioAccountSid && twilioAuthToken && twilioPhoneNumber) {
      try {
        const smsMessage = `HH Transportation: Thank you for your payment! Invoice ${invoice_number} for $${formattedAmount} has been paid via ${paymentMethodText}. A receipt has been sent to your email.`;

        const authHeader = 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthToken}`);

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
              Body: smsMessage,
            }),
          }
        );

        if (smsResponse.ok) {
          results.sms.sent = true;
          results.sms.message = 'SMS sent successfully';
        } else {
          const error = await smsResponse.text();
          results.sms.message = `SMS failed: ${error}`;
        }
      } catch (error) {
        console.error('Error sending SMS:', error);
        results.sms.message = `SMS error: ${error.message}`;
      }
    } else {
      results.sms.message = 'SMS not configured or no phone number';
    }

    if (patient.email) {
      try {
        let paymentAccountsText = '';
        if (paymentAccounts.length > 0) {
          paymentAccountsText = '\n\nAccepted Payment Methods:\n';
          paymentAccounts.forEach((account: any) => {
            paymentAccountsText += `\n${account.display_name}:\n  ${account.account_identifier}`;
            if (account.instructions) {
              paymentAccountsText += `\n  ${account.instructions}`;
            }
            paymentAccountsText += '\n';
          });
        }

        const emailSubject = `Payment Received - Invoice ${invoice_number}`;
        const emailBody = `
Dear ${patient.full_name},

Thank you for your payment!

Invoice Details:
- Invoice Number: ${invoice_number}
- Amount Paid: $${formattedAmount}
- Payment Method: ${paymentMethodText}
- Payment Date: ${formattedDate}

Your payment has been successfully processed and applied to your account.${paymentAccountsText}

If you have any questions about this payment, please contact us.

Thank you for choosing HH Transportation!

Best regards,
HH Transportation Team
        `;

        await supabase
          .from('outbound_messages')
          .insert({
            message: emailBody,
            to_number: patient.email,
            from_number: 'invoices@hhtransportation.com',
            status: 'pending',
          });

        results.email.sent = true;
        results.email.message = 'Email queued for delivery';
      } catch (error) {
        console.error('Error queueing email:', error);
        results.email.message = `Email error: ${error.message}`;
      }
    } else {
      results.email.message = 'No email address on file';
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Invoice notification processed',
        patient_name: patient.full_name,
        results: results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in send-invoice-notification:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});