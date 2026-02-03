import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const SYSTEM_PROMPT = `You are a helpful bilingual AI receptionist for Helping Hands Transportation. You speak both English and Spanish fluently.

Your responsibilities:
1. Greet customers warmly in their preferred language
2. Help them book medical transportation trips
3. Activate will-call rides when patients are ready for pickup
4. Provide accurate price quotes based on service type and day of the week
5. Collect all necessary information: patient name, phone number, pickup address, dropoff address, pickup date and time, service type (wheelchair or ambulatory)
6. Automatically detect if the customer is speaking Spanish or English and respond in the same language

WILL-CALL ACTIVATION:
When a customer says they're ready for pickup, need to activate their ride, or calls to be picked up:
1. Ask for their name and/or phone number to identify them
2. Confirm you'll activate their ride immediately
3. Respond with: ACTIVATE_WILLCALL:{"patientName":"...","phone":"..."}
4. Let them know a driver will be dispatched shortly

Common phrases that indicate will-call activation:
- "I'm ready to be picked up"
- "I need to activate my ride"
- "I'm ready now"
- "Can you send the driver?"
- "I'm done with my appointment"

PRICING STRUCTURE:

**WEEKDAYS (Monday-Friday):**
- Wheelchair Service: $65 base fee + $4.50 per mile
- Ambulatory Service: $45 base fee + $3.50 per mile

**SATURDAYS:**
- Wheelchair Service: $75 base fee + $4.50 per mile
- Ambulatory Service: $60 base fee + $3.50 per mile

**Service Types:**
- Wheelchair: For patients who require wheelchair-accessible vehicle with lift or ramp
- Ambulatory: For patients who can walk and use regular vehicle (non-emergency medical transport)

For distance estimation:
- Local (under 10 miles): estimate 5-10 miles
- Across town: estimate 15-20 miles
- To nearby cities: estimate 25-50 miles
- If addresses are provided, estimate based on typical distances

When providing quotes:
1. Ask if they need wheelchair or ambulatory service
2. Ask what day they need the service
3. Calculate: base fee + (estimated miles × per-mile rate)
4. Example: "For a wheelchair service on Wednesday traveling 10 miles, the cost would be $65 base + $45 (10 miles × $4.50) = $110"

When the customer mentions addresses, provide a price quote like:
"Based on the trip from [pickup] to [dropoff], I estimate this would be approximately [distance] miles. For [wheelchair/ambulatory] service on [day], the estimated cost would be $[base fee] base fee plus $[distance × rate] for mileage, totaling approximately $[total]."

In Spanish:
"Basado en el viaje desde [pickup] hasta [dropoff], estimo que serían aproximadamente [distance] millas. Para servicio [en silla de ruedas/ambulatorio] el [día], el costo estimado sería de $[base fee] de tarifa base más $[distance × rate] por millaje, totalizando aproximadamente $[total]."

Once you have ALL required information (patient name, phone, pickup address, dropoff address, date/time, service type), confirm the details and ask if they would like to book. When they confirm, respond with:

BOOK_TRIP_CONFIRMED:{"patientName":"...","phone":"...","pickupAddress":"...","dropoffAddress":"...","pickupTime":"...","specialRequirements":"...","estimatedCost":...}

Be conversational, friendly, and helpful. Don't ask for all information at once - gather it naturally through conversation.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { message, conversation } = await req.json();

    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ 
          response: "I apologize, but the AI service is not configured. Please contact support.",
          error: "Missing API key" 
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...conversation.map((msg: any) => ({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.content,
      })),
      { role: "user", content: message },
    ];

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `HTTP ${openaiResponse.status}`;
      const errorType = errorData.error?.type || 'unknown';
      const errorCode = errorData.error?.code || 'unknown';

      console.error('OpenAI API Error:', {
        status: openaiResponse.status,
        type: errorType,
        code: errorCode,
        message: errorMessage,
        fullError: errorData
      });

      throw new Error(`OpenAI API error: ${errorMessage} (Type: ${errorType}, Code: ${errorCode})`);
    }

    const aiData = await openaiResponse.json();
    const aiResponse = aiData.choices[0].message.content;

    let tripCreated = false;
    let tripActivated = false;
    let finalResponse = aiResponse;

    if (aiResponse.includes("ACTIVATE_WILLCALL:")) {
      const jsonMatch = aiResponse.match(/ACTIVATE_WILLCALL:(\{.*?\})/);
      if (jsonMatch) {
        try {
          const activationData = JSON.parse(jsonMatch[1]);

          const authHeader = req.headers.get("Authorization");
          const supabaseUrl = Deno.env.get("SUPABASE_URL");
          const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

          if (supabaseUrl && supabaseKey && authHeader) {
            const supabase = createClient(supabaseUrl, supabaseKey);

            const userToken = authHeader.replace("Bearer ", "");
            const { data: { user } } = await supabase.auth.getUser(userToken);

            if (user) {
              const { data: patient } = await supabase
                .from("patients")
                .select("id")
                .or(`full_name.ilike.%${activationData.patientName}%,phone.eq.${activationData.phone}`)
                .maybeSingle();

              if (patient) {
                const { error: updateError } = await supabase
                  .from("trips")
                  .update({
                    status: "active",
                    actual_pickup_time: new Date().toISOString()
                  })
                  .eq("patient_id", patient.id)
                  .in("status", ["scheduled", "will_call"])
                  .order("scheduled_pickup_time", { ascending: false })
                  .limit(1);

                if (!updateError) {
                  tripActivated = true;
                  finalResponse = aiResponse.replace(/ACTIVATE_WILLCALL:\{.*?\}/, "").trim();
                }
              }
            }
          }
        } catch (e) {
          console.error("Error activating will-call:", e);
        }
      }
    }

    if (aiResponse.includes("BOOK_TRIP_CONFIRMED:")) {
      const jsonMatch = aiResponse.match(/BOOK_TRIP_CONFIRMED:(\{.*\})/);
      if (jsonMatch) {
        try {
          const tripData = JSON.parse(jsonMatch[1]);

          const authHeader = req.headers.get("Authorization");
          const supabaseUrl = Deno.env.get("SUPABASE_URL");
          const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

          if (supabaseUrl && supabaseKey && authHeader) {
            const supabase = createClient(supabaseUrl, supabaseKey);

            const userToken = authHeader.replace("Bearer ", "");
            const { data: { user } } = await supabase.auth.getUser(userToken);

            if (user) {
              const { error: insertError } = await supabase
                .from("trips")
                .insert({
                  patient_name: tripData.patientName,
                  phone: tripData.phone,
                  pickup_address: tripData.pickupAddress,
                  dropoff_address: tripData.dropoffAddress,
                  pickup_time: tripData.pickupTime,
                  special_requirements: tripData.specialRequirements || null,
                  status: "pending",
                  created_by: user.id,
                });

              if (!insertError) {
                tripCreated = true;
                finalResponse = aiResponse.replace(/BOOK_TRIP_CONFIRMED:\{.*\}/, "").trim();
              }
            }
          }
        } catch (e) {
          console.error("Error booking trip:", e);
        }
      }
    }

    return new Response(
      JSON.stringify({
        response: finalResponse || "Thank you! Let me help you with that.",
        tripCreated,
        tripActivated
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ 
        response: "I apologize, but I encountered an error. Please try again.",
        error: error.message 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});