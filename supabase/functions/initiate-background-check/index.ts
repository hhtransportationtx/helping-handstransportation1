import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface BackgroundCheckRequest {
  userId: string;
  licenseNumber: string;
  licenseState: string;
  ssnLast4: string;
  dateOfBirth: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, licenseNumber, licenseState, ssnLast4, dateOfBirth }: BackgroundCheckRequest = await req.json();

    if (!userId || !licenseNumber || !licenseState || !ssnLast4 || !dateOfBirth) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Initiating background check for user:', userId);
    console.log('License:', licenseNumber, licenseState);
    console.log('SSN Last 4:', ssnLast4);
    console.log('DOB:', dateOfBirth);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        background_check_status: 'in_progress',
        background_check_provider: 'placeholder',
      })
      .eq('id', userId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Background check initiated successfully',
        status: 'in_progress',
        note: 'This is a placeholder. Integrate with a real background check provider like Checkr, Sterling, or HireRight'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error initiating background check:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
