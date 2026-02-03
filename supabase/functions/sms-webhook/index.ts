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
    const formData = await req.formData();
    const from = formData.get('From') as string;
    const body = formData.get('Body') as string;
    const messageSid = formData.get('MessageSid') as string;
    const to = formData.get('To') as string;

    if (!from || !body) {
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Log the incoming SMS
    await supabase.from('sms_logs').insert({
      message_sid: messageSid,
      from_number: from,
      to_number: to,
      message_body: body,
      direction: 'inbound',
      status: 'received'
    });

    const messageBody = body.trim().toLowerCase();

    const { data: patient } = await supabase
      .from('patients')
      .select('id, first_name, last_name, preferred_language, company_id')
      .eq('phone', from)
      .maybeSingle();

    if (!patient) {
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Message>We could not find your information. Please call us to confirm your trip. / No pudimos encontrar su información. Llámenos para confirmar su viaje.</Message></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      );
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    const { data: trip } = await supabase
      .from('trips')
      .select('id, scheduled_pickup_time')
      .eq('patient_id', patient.id)
      .gte('scheduled_pickup_time', tomorrow.toISOString())
      .lt('scheduled_pickup_time', dayAfterTomorrow.toISOString())
      .in('status', ['scheduled', 'pending', 'active'])
      .maybeSingle();

    if (!trip) {
      const noTripMessage = patient.preferred_language === 'spanish'
        ? 'No encontramos un viaje programado para usted mañana. Llámenos si necesita ayuda.'
        : 'We could not find a trip scheduled for you tomorrow. Please call us if you need assistance.';
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${noTripMessage}</Message></Response>`,
        { headers: { 'Content-Type': 'text/xml' } }
      );
    }

    const isConfirmation = messageBody === 'yes' || messageBody === 'confirm' || messageBody === 'confirmed' ||
                          messageBody === 'si' || messageBody === 'sí' || messageBody === 'confirmar';
    const isCancellation = messageBody === 'no' || messageBody === 'cancel' || messageBody === 'cancelar';

    let confirmationStatus = 'unknown';
    if (isConfirmation) confirmationStatus = 'confirmed';
    if (isCancellation) confirmationStatus = 'cancelled';

    await supabase.from('confirmation_responses').insert({
      company_id: patient.company_id,
      trip_id: trip.id,
      patient_phone: from,
      message_body: body,
      message_sid: messageSid,
      confirmation_status: confirmationStatus,
      processed: true
    });

    const { data: confirmation } = await supabase
      .from('trip_confirmations')
      .select('id, confirmation_status')
      .eq('trip_id', trip.id)
      .maybeSingle();

    const pickupTime = new Date(trip.scheduled_pickup_time);
    const timeString = pickupTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    if (isConfirmation) {
      if (confirmation) {
        await supabase
          .from('trip_confirmations')
          .update({
            confirmation_status: 'confirmed',
            confirmed_at: new Date().toISOString(),
            confirmation_method: 'sms',
            sms_response: body,
            sms_response_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', confirmation.id);
      } else {
        await supabase
          .from('trip_confirmations')
          .insert({
            trip_id: trip.id,
            patient_id: patient.id,
            confirmation_status: 'confirmed',
            confirmed_at: new Date().toISOString(),
            confirmation_method: 'sms',
            sms_response: body,
            sms_response_at: new Date().toISOString()
          });
      }

      const confirmMessage = patient.preferred_language === 'spanish'
        ? `¡Gracias ${patient.first_name}! Su viaje a las ${timeString} está confirmado. ¡Nos vemos mañana!`
        : `Thank you ${patient.first_name}! Your trip at ${timeString} is confirmed. We'll see you tomorrow!`;

      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${confirmMessage}</Message></Response>`,
        { headers: { 'Content-Type': 'text/xml' } }
      );
    }

    if (isCancellation) {
      if (confirmation) {
        await supabase
          .from('trip_confirmations')
          .update({
            confirmation_status: 'cancelled',
            confirmed_at: new Date().toISOString(),
            confirmation_method: 'sms',
            sms_response: body,
            sms_response_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', confirmation.id);
      }

      await supabase
        .from('trips')
        .update({ status: 'cancelled' })
        .eq('id', trip.id);

      const cancelMessage = patient.preferred_language === 'spanish'
        ? `Su viaje a las ${timeString} ha sido cancelado. Si esto fue un error, llámenos de inmediato.`
        : `Your trip at ${timeString} has been cancelled. If this was a mistake, please call us immediately.`;

      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${cancelMessage}</Message></Response>`,
        { headers: { 'Content-Type': 'text/xml' } }
      );
    }

    const defaultMessage = patient.preferred_language === 'spanish'
      ? 'Gracias por su mensaje. Responda SÍ para confirmar su viaje o NO para cancelar. También puede llamarnos.'
      : 'Thank you for your message. Reply YES to confirm your trip or NO to cancel. You can also call us.';

    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${defaultMessage}</Message></Response>`,
      { headers: { 'Content-Type': 'text/xml' } }
    );

  } catch (error) {
    console.error('Error in sms-webhook:', error);
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { headers: { 'Content-Type': 'text/xml' } }
    );
  }
});