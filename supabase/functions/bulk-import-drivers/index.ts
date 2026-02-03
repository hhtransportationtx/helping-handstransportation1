import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DriverData {
  full_name: string;
  email: string;
  phone: string;
  role: string;
  is_farmout_driver?: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { drivers } = await req.json() as { drivers: DriverData[] };

    if (!Array.isArray(drivers) || drivers.length === 0) {
      throw new Error("No drivers provided");
    }

    const results = {
      success: [] as string[],
      errors: [] as { email: string; error: string }[],
    };

    const defaultPassword = "HelpingHands2026!";

    for (const driver of drivers) {
      try {
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: driver.email,
          password: defaultPassword,
          email_confirm: true,
          user_metadata: {
            full_name: driver.full_name,
            role: driver.role,
          },
        });

        if (authError) {
          results.errors.push({ email: driver.email, error: authError.message });
          continue;
        }

        if (authData.user) {
          const { error: profileError } = await supabase
            .from("profiles")
            .upsert({
              id: authData.user.id,
              full_name: driver.full_name,
              phone: driver.phone,
              email: driver.email,
              role: driver.role,
              status: "active",
              is_farmout_driver: driver.is_farmout_driver || false,
            }, {
              onConflict: "id",
            });

          if (profileError) {
            results.errors.push({ email: driver.email, error: profileError.message });
          } else {
            results.success.push(driver.email);
          }
        }
      } catch (error) {
        results.errors.push({
          email: driver.email,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return new Response(
      JSON.stringify({
        message: "Bulk import completed",
        defaultPassword,
        results,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
