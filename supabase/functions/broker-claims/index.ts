import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey || !authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing configuration" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const userToken = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(userToken);

    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { action, claim_id, trip_id } = await req.json();

    if (action === "submit") {
      const { data: trip, error: tripError } = await supabase
        .from("trips")
        .select(`
          *,
          patients (
            id,
            full_name,
            date_of_birth,
            medical_id,
            insurance_provider,
            insurance_id,
            broker_id,
            brokers (
              id,
              name,
              api_endpoint,
              api_key_encrypted,
              broker_type
            )
          )
        `)
        .eq("id", trip_id)
        .eq("status", "completed")
        .single();

      if (tripError || !trip) {
        return new Response(
          JSON.stringify({ error: "Trip not found or not completed" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const broker = trip.patients.brokers;
      if (!broker) {
        return new Response(
          JSON.stringify({ error: "No broker assigned to patient" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const distance = trip.distance_miles || 0;
      const baseFee = trip.patients.mobility_needs === "wheelchair" ? 65 : 45;
      const perMile = trip.patients.mobility_needs === "wheelchair" ? 4.5 : 3.5;
      const amount = baseFee + (distance * perMile);

      const claimNumber = `CLM-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      const { data: claim, error: claimError } = await supabase
        .from("claims")
        .insert({
          trip_id: trip.id,
          patient_id: trip.patient_id,
          broker_id: broker.id,
          claim_number: claimNumber,
          amount: amount,
          status: "pending",
          submission_date: new Date().toISOString().split("T")[0],
          notes: `Auto-generated claim for trip from ${trip.pickup_address} to ${trip.dropoff_address}`
        })
        .select()
        .single();

      if (claimError) {
        return new Response(
          JSON.stringify({ error: "Failed to create claim", details: claimError }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (broker.api_endpoint) {
        try {
          const claimData = {
            claim_number: claimNumber,
            patient: {
              name: trip.patients.full_name,
              dob: trip.patients.date_of_birth,
              medical_id: trip.patients.medical_id,
              insurance_provider: trip.patients.insurance_provider,
              insurance_id: trip.patients.insurance_id
            },
            service: {
              date: trip.actual_pickup_time,
              pickup_address: trip.pickup_address,
              dropoff_address: trip.dropoff_address,
              distance_miles: distance,
              service_type: trip.patients.mobility_needs
            },
            billing: {
              base_fee: baseFee,
              per_mile_rate: perMile,
              total_miles: distance,
              total_amount: amount
            }
          };

          const brokerResponse = await fetch(broker.api_endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${broker.api_key_encrypted || ""}`,
            },
            body: JSON.stringify(claimData),
          });

          if (brokerResponse.ok) {
            const brokerData = await brokerResponse.json();
            await supabase
              .from("claims")
              .update({
                status: "submitted",
                broker_reference: brokerData.reference_number || brokerData.id
              })
              .eq("id", claim.id);

            return new Response(
              JSON.stringify({
                success: true,
                claim: claim,
                broker_response: brokerData,
                message: "Claim submitted successfully to broker"
              }),
              {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          } else {
            await supabase
              .from("claims")
              .update({
                status: "submission_failed",
                notes: `Broker API error: ${brokerResponse.statusText}`
              })
              .eq("id", claim.id);
          }
        } catch (error) {
          console.error("Broker API error:", error);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          claim: claim,
          message: "Claim created (broker submission pending)"
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (action === "status") {
      const { data: claim, error } = await supabase
        .from("claims")
        .select(`
          *,
          trips (*),
          patients (*),
          brokers (*)
        `)
        .eq("id", claim_id)
        .single();

      if (error || !claim) {
        return new Response(
          JSON.stringify({ error: "Claim not found" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({ claim }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});