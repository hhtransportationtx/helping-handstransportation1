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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const currentMonth = new Date().toISOString().slice(0, 7) + '-01';

    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id');

    if (companiesError) throw companiesError;

    const results = [];

    for (const company of companies || []) {
      const { data: trips } = await supabase
        .from('trips')
        .select('id, distance')
        .eq('company_id', company.id)
        .gte('created_at', currentMonth);

      const { data: activeDrivers } = await supabase
        .from('profiles')
        .select('id')
        .eq('company_id', company.id)
        .eq('role', 'driver')
        .not('last_active_at', 'is', null);

      const { data: activeVehicles } = await supabase
        .from('vehicles')
        .select('id')
        .eq('company_id', company.id)
        .eq('status', 'active');

      const totalMiles = trips?.reduce((sum, trip) => sum + (trip.distance || 0), 0) || 0;

      const { error: upsertError } = await supabase
        .from('company_usage')
        .upsert({
          company_id: company.id,
          month: currentMonth,
          trips_count: trips?.length || 0,
          active_drivers: activeDrivers?.length || 0,
          active_vehicles: activeVehicles?.length || 0,
          total_miles: totalMiles,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'company_id,month'
        });

      if (upsertError) {
        console.error('Error updating usage for company:', company.id, upsertError);
      } else {
        results.push({
          company_id: company.id,
          trips: trips?.length || 0,
          drivers: activeDrivers?.length || 0,
          vehicles: activeVehicles?.length || 0,
          miles: totalMiles
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Updated usage for ${results.length} companies`,
        results
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error tracking usage:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
