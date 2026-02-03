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

    const { driver_id, pay_stub } = await req.json();

    if (!driver_id || !pay_stub) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: driver, error: driverError } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', driver_id)
      .maybeSingle();

    if (driverError || !driver) {
      return new Response(
        JSON.stringify({ error: 'Driver not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!driver.email) {
      return new Response(
        JSON.stringify({ error: 'Driver has no email address on file' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const periodStart = new Date(pay_stub.period_start).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    const periodEnd = new Date(pay_stub.period_end).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    const emailSubject = `Your Pay Stub - ${periodStart} to ${periodEnd}`;
    const emailBody = `
Dear ${driver.full_name},

Your pay stub for the period ${periodStart} to ${periodEnd} is now available.

EARNINGS SUMMARY
================

Work Statistics:
- Total Trips Completed: ${pay_stub.total_trips}
- Active Hours: ${pay_stub.active_hours.toFixed(2)} hours
- Total Miles Driven: ${pay_stub.total_miles.toFixed(2)} miles
- Wheelchair Hours: ${pay_stub.wheelchair_hours.toFixed(2)} hours
- Ambulatory Hours: ${pay_stub.ambulatory_hours.toFixed(2)} hours

Compensation:
- Hourly Pay: $${pay_stub.hourly_pay.toFixed(2)}
- Mileage Pay: $${pay_stub.mileage_pay.toFixed(2)}
- Bonus Pay: $${pay_stub.bonus_pay.toFixed(2)}

TOTAL PAY: $${pay_stub.total_pay.toFixed(2)}
================

Pay Period Status: ${pay_stub.status.toUpperCase()}

Note: You are compensated for active trip time only. This includes the time from
when you pick up a client until you drop them off at their destination.

If you have any questions about your pay stub, please contact the payroll department.

Thank you for your hard work!

Best regards,
HH Transportation Payroll Team
    `;

    await supabase
      .from('outbound_messages')
      .insert({
        message: emailBody,
        to_number: driver.email,
        from_number: 'payroll@hhtransportation.com',
        status: 'pending',
      });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Pay stub email queued for delivery',
        driver_name: driver.full_name,
        driver_email: driver.email,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in send-paystub-email:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
