import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");

const SYSTEM_PROMPT = `You are a helpful bilingual AI receptionist for Helping Hands Transportation answering phone calls. You speak both English and Spanish fluently.

Your responsibilities:
1. Greet callers warmly in their preferred language
2. Help them book medical transportation trips
3. Activate will-call rides when patients are ready for pickup
4. Provide accurate price quotes based on service type and day of the week
5. Collect all necessary information: patient name, phone number, pickup address, dropoff address, pickup date and time, service type (wheelchair or ambulatory)
6. Automatically detect if the caller is speaking Spanish or English and respond in the same language

WILL-CALL ACTIVATION:
When a caller says they're ready for pickup, need to activate their ride, or calls to be picked up:
1. Ask for their name to confirm their identity
2. Tell them you'll activate their ride right away
3. Respond with: ACTIVATE_WILLCALL:{"patientName":"...","phone":"..."}
4. Let them know a driver will be dispatched shortly

Common phrases indicating will-call activation:
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

When providing quotes:
1. Ask if they need wheelchair or ambulatory service
2. Ask what day they need the service
3. Calculate: base fee + (estimated miles × per-mile rate)

Keep responses brief and conversational for phone calls. When you have ALL information, confirm details and ask if they'd like to book.

When they confirm booking, respond with:
BOOK_TRIP_CONFIRMED:{"patientName":"...","phone":"...","pickupAddress":"...","dropoffAddress":"...","pickupTime":"...","specialRequirements":"...","estimatedCost":...}

Be warm, patient, and helpful - remember you're speaking to elderly callers.`;

interface ConversationState {
  messages: Array<{ role: string; content: string }>;
  tripBooked?: boolean;
}

const conversations = new Map<string, ConversationState>();

Deno.serve(async (req: Request) => {
  try {
    const url = new URL(req.url);
    const toNumber = url.searchParams.get('to');
    const tripId = url.searchParams.get('tripId');

    if (toNumber) {
      return new Response(
        generateCallForwardTwiML(toNumber, tripId || ''),
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    const formData = await req.formData();
    const callSid = formData.get("CallSid") as string;
    const speechResult = formData.get("SpeechResult") as string;
    const from = formData.get("From") as string;

    if (!OPENAI_API_KEY || !TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      return new Response(
        generateTwiML("I apologize, but the phone service is not configured. Please try again later.", true),
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    let conversation = conversations.get(callSid);
    if (!conversation) {
      conversation = {
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "assistant", content: "Hello! Thank you for calling Helping Hands Transportation. How can I help you today? Hola, gracias por llamar. ¿Cómo puedo ayudarle?" }
        ]
      };
      conversations.set(callSid, conversation);

      return new Response(
        generateTwiML("Hello! Thank you for calling Helping Hands Transportation. How can I help you today?", false),
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    if (speechResult) {
      conversation.messages.push({ role: "user", content: speechResult });

      const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: conversation.messages,
          temperature: 0.7,
          max_tokens: 200,
        }),
      });

      if (!openaiResponse.ok) {
        throw new Error("AI service request failed");
      }

      const aiData = await openaiResponse.json();
      const aiResponse = aiData.choices[0].message.content;
      conversation.messages.push({ role: "assistant", content: aiResponse });

      let finalResponse = aiResponse;
      let endCall = false;

      if (aiResponse.includes("ACTIVATE_WILLCALL:")) {
        const jsonMatch = aiResponse.match(/ACTIVATE_WILLCALL:(\{.*?\})/);
        if (jsonMatch) {
          try {
            const activationData = JSON.parse(jsonMatch[1]);
            const supabaseUrl = Deno.env.get("SUPABASE_URL");
            const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

            if (supabaseUrl && supabaseKey) {
              const supabase = createClient(supabaseUrl, supabaseKey);

              const { data: patient } = await supabase
                .from("patients")
                .select("id, full_name")
                .or(`full_name.ilike.%${activationData.patientName}%,phone.eq.${activationData.phone || from}`)
                .maybeSingle();

              if (patient) {
                const { data: trip, error: updateError } = await supabase
                  .from("trips")
                  .update({
                    status: "active",
                    actual_pickup_time: new Date().toISOString()
                  })
                  .eq("patient_id", patient.id)
                  .in("status", ["scheduled", "will_call"])
                  .order("scheduled_pickup_time", { ascending: false })
                  .limit(1)
                  .select("pickup_address, dropoff_address")
                  .maybeSingle();

                if (!updateError && trip) {
                  finalResponse = `Perfect! I've activated your ride, ${patient.full_name}. A driver will be dispatched to pick you up shortly. Have a great day!`;
                  endCall = true;

                  await sendSMS(from, `Your will-call ride has been activated! A driver will arrive at ${trip.pickup_address} shortly to take you to ${trip.dropoff_address}.`);
                } else {
                  finalResponse = "I couldn't find a scheduled will-call ride for you. Would you like to book a new trip?";
                }
              } else {
                finalResponse = "I couldn't find your information. Could you please provide your full name?";
              }
            }
          } catch (e) {
            console.error("Error activating will-call:", e);
            finalResponse = "I've noted your request. Our dispatch team will call you back shortly.";
            endCall = true;
          }
        }
      } else if (aiResponse.includes("BOOK_TRIP_CONFIRMED:")) {
        const jsonMatch = aiResponse.match(/BOOK_TRIP_CONFIRMED:(\{.*\})/);
        if (jsonMatch) {
          try {
            const tripData = JSON.parse(jsonMatch[1]);
            const supabaseUrl = Deno.env.get("SUPABASE_URL");
            const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

            if (supabaseUrl && supabaseKey) {
              const supabase = createClient(supabaseUrl, supabaseKey);
              
              const { error: insertError } = await supabase
                .from("trips")
                .insert({
                  patient_name: tripData.patientName,
                  phone: tripData.phone || from,
                  pickup_address: tripData.pickupAddress,
                  dropoff_address: tripData.dropoffAddress,
                  pickup_time: tripData.pickupTime,
                  special_requirements: tripData.specialRequirements || null,
                  status: "pending",
                });

              if (!insertError) {
                conversation.tripBooked = true;
                finalResponse = "Perfect! Your trip has been booked. You'll receive a confirmation text message shortly. Have a great day!";
                endCall = true;

                await sendSMS(from, `Your medical transport has been booked for ${tripData.pickupTime}. From: ${tripData.pickupAddress} To: ${tripData.dropoffAddress}. Estimated cost: $${tripData.estimatedCost}. We'll call you before pickup.`);
              }
            }
          } catch (e) {
            console.error("Error booking trip:", e);
            finalResponse = "I've recorded your information. Our team will call you back to confirm. Thank you!";
            endCall = true;
          }
        }
      }

      if (endCall) {
        conversations.delete(callSid);
      }

      return new Response(
        generateTwiML(finalResponse, endCall),
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    return new Response(
      generateTwiML("I didn't catch that. Could you please repeat?", false),
      { headers: { "Content-Type": "text/xml" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      generateTwiML("I apologize, but I'm having technical difficulties. Please call back in a few minutes.", true),
      { headers: { "Content-Type": "text/xml" } }
    );
  }
});

function generateTwiML(message: string, hangup: boolean): string {
  const cleanMessage = message.replace(/BOOK_TRIP_CONFIRMED:\{.*\}/, "").trim();
  
  if (hangup) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna" language="en-US">${escapeXml(cleanMessage)}</Say>
  <Hangup/>
</Response>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" language="en-US" speechTimeout="3" action="" method="POST">
    <Say voice="Polly.Joanna" language="en-US">${escapeXml(cleanMessage)}</Say>
  </Gather>
  <Say voice="Polly.Joanna" language="en-US">I didn't hear anything. Please call back when you're ready.</Say>
  <Hangup/>
</Response>`;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function sendSMS(to: string, message: string): Promise<void> {
  try {
    const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Authorization": `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: to,
          From: Deno.env.get("TWILIO_PHONE_NUMBER") || "",
          Body: message,
        }),
      }
    );

    if (!response.ok) {
      console.error("Failed to send SMS:", await response.text());
    }
  } catch (e) {
    console.error("Error sending SMS:", e);
  }
}

function generateCallForwardTwiML(toNumber: string, tripId: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna" language="en-US">Connecting you to the member. Please wait.</Say>
  <Dial callerId="${Deno.env.get("TWILIO_PHONE_NUMBER") || ''}" timeout="30">
    <Number>${escapeXml(toNumber)}</Number>
  </Dial>
  <Say voice="Polly.Joanna" language="en-US">The call could not be completed. Please try again later.</Say>
  <Hangup/>
</Response>`;
}