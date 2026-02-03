import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { createHmac } from 'node:crypto';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey, X-Raven-Signature',
};

interface RavenWebhookEvent {
  event_type: string;
  event_id: string;
  device_id: string;
  device_serial?: string;
  timestamp: string;
  severity?: string;
  location?: {
    latitude: number;
    longitude: number;
    altitude?: number;
    heading?: number;
  };
  speed?: number;
  video_url?: string;
  thumbnail_url?: string;
  metadata?: any;
  driver_info?: {
    id?: string;
    name?: string;
  };
  vehicle_info?: {
    id?: string;
    vin?: string;
    plate?: string;
  };
}

interface WebhookPayload {
  events?: RavenWebhookEvent[];
  event?: RavenWebhookEvent;
}

function verifyWebhookSignature(payload: string, signature: string | null, secret: string): boolean {
  if (!signature || !secret) {
    return false;
  }

  const hmac = createHmac('sha256', secret);
  hmac.update(payload);
  const calculatedSignature = hmac.digest('hex');

  return signature === calculatedSignature || signature === `sha256=${calculatedSignature}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const rawPayload = await req.text();
    const signature = req.headers.get('X-Raven-Signature') || req.headers.get('x-raven-signature');
    const webhookSecret = Deno.env.get('RAVEN_WEBHOOK_SECRET');

    // Only verify signature if both secret and signature are present
    if (webhookSecret && signature) {
      if (!verifyWebhookSignature(rawPayload, signature, webhookSecret)) {
        console.error('Webhook signature verification failed');
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          {
            status: 401,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }
    } else if (webhookSecret && !signature) {
      console.warn('Webhook secret configured but no signature provided - allowing for testing');
    }

    const payload: WebhookPayload = JSON.parse(rawPayload);
    const events = payload.events || (payload.event ? [payload.event] : []);

    if (events.length === 0) {
      console.log('No events in webhook payload');
      return new Response(
        JSON.stringify({ success: true, message: 'No events to process' }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    let processedCount = 0;
    const errors: string[] = [];

    for (const event of events) {
      try {
        const { data: cameraConfig } = await supabase
          .from('vehicle_camera_config')
          .select('vehicle_id, raven_device_id')
          .eq('raven_device_id', event.device_id)
          .maybeSingle();

        if (!cameraConfig) {
          console.warn(`No vehicle found for device ${event.device_id}`);
          errors.push(`Device ${event.device_id} not registered`);
          continue;
        }

        const { data: vehicle } = await supabase
          .from('vehicles')
          .select('id, driver_id, vehicle_name, license_plate')
          .eq('id', cameraConfig.vehicle_id)
          .maybeSingle();

        let driverName = 'Unknown Driver';
        if (vehicle?.driver_id) {
          const { data: driverProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', vehicle.driver_id)
            .maybeSingle();

          if (driverProfile?.full_name) {
            driverName = driverProfile.full_name;
          }
        }

        const eventData = {
          vehicle_id: cameraConfig.vehicle_id,
          driver_id: vehicle?.driver_id || null,
          event_type: event.event_type,
          severity: event.severity || 'medium',
          event_timestamp: event.timestamp,
          video_url: event.video_url || null,
          thumbnail_url: event.thumbnail_url || null,
          location_lat: event.location?.latitude || null,
          location_lng: event.location?.longitude || null,
          speed_mph: event.speed || null,
          metadata: {
            event_id: event.event_id,
            device_serial: event.device_serial,
            altitude: event.location?.altitude,
            heading: event.location?.heading,
            driver_info: event.driver_info,
            vehicle_info: event.vehicle_info,
            ...event.metadata,
          },
        };

        const { error: insertError } = await supabase
          .from('dash_camera_events')
          .insert(eventData);

        if (insertError) {
          console.error('Error inserting event:', insertError);
          errors.push(`Failed to insert event ${event.event_id}: ${insertError.message}`);
          continue;
        }

        processedCount++;

        const vehicleInfo = vehicle?.vehicle_name || vehicle?.license_plate || event.vehicle_info?.plate || 'Unknown Vehicle';
        const eventMessage = `Safety Alert: ${event.event_type.replace(/_/g, ' ').toUpperCase()} - ${driverName} in ${vehicleInfo}${event.severity ? ` (${event.severity} severity)` : ''}`;

        const { data: dispatchers } = await supabase
          .from('profiles')
          .select('id')
          .in('role', ['dispatcher', 'admin']);

        const notificationUsers: string[] = [];

        if (vehicle?.driver_id) {
          notificationUsers.push(vehicle.driver_id);
        }

        if (dispatchers) {
          notificationUsers.push(...dispatchers.map(d => d.id));
        }

        for (const userId of notificationUsers) {
          await supabase.from('notifications').insert({
            user_id: userId,
            message: eventMessage,
            status: 'pending',
          });
        }

        if (vehicle?.driver_id) {
          const today = new Date().toISOString().split('T')[0];
          const { data: existingScore } = await supabase
            .from('driver_safety_scores')
            .select('*')
            .eq('driver_id', vehicle.driver_id)
            .eq('date', today)
            .maybeSingle();

          const severityPenalty = {
            low: 1,
            medium: 3,
            high: 5,
            critical: 10,
          };
          const penalty = severityPenalty[event.severity as keyof typeof severityPenalty] || 3;
          const newScore = Math.max(0, (existingScore?.overall_score || 100) - penalty);

          const eventTypeCounts = {
            harsh_braking_count: existingScore?.harsh_braking_count || 0,
            harsh_acceleration_count: existingScore?.harsh_acceleration_count || 0,
            harsh_cornering_count: existingScore?.harsh_cornering_count || 0,
            distraction_count: existingScore?.distraction_count || 0,
            speeding_count: existingScore?.speeding_count || 0,
          };

          if (event.event_type.toLowerCase().includes('braking')) {
            eventTypeCounts.harsh_braking_count++;
          } else if (event.event_type.toLowerCase().includes('acceleration')) {
            eventTypeCounts.harsh_acceleration_count++;
          } else if (event.event_type.toLowerCase().includes('cornering') || event.event_type.toLowerCase().includes('turn')) {
            eventTypeCounts.harsh_cornering_count++;
          } else if (event.event_type.toLowerCase().includes('distraction') || event.event_type.toLowerCase().includes('phone')) {
            eventTypeCounts.distraction_count++;
          } else if (event.event_type.toLowerCase().includes('speed')) {
            eventTypeCounts.speeding_count++;
          }

          await supabase.from('driver_safety_scores').upsert({
            driver_id: vehicle.driver_id,
            date: today,
            overall_score: newScore,
            ...eventTypeCounts,
            updated_at: new Date().toISOString(),
          });
        }
      } catch (eventError) {
        console.error('Error processing event:', eventError);
        errors.push(`Failed to process event ${event.event_id}: ${eventError.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedCount,
        total: events.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
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
