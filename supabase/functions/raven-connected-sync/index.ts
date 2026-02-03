import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface RavenEvent {
  eventId: string;
  deviceId: string;
  eventType: string;
  severity: string;
  timestamp: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  location: {
    latitude: number;
    longitude: number;
  };
  speed: number;
  metadata?: any;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, vehicleId, startDate, endDate } = await req.json();

    if (action === 'check_api_key') {
      const ravenIntegrationId = Deno.env.get('RAVEN_INTEGRATION_ID');
      const ravenIntegrationSecret = Deno.env.get('RAVEN_INTEGRATION_SECRET');
      return new Response(
        JSON.stringify({
          configured: !!(ravenIntegrationId && ravenIntegrationSecret),
          message: (ravenIntegrationId && ravenIntegrationSecret) ? 'API credentials are configured' : 'API credentials not found'
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    if (action === 'sync_events') {
      const ravenIntegrationId = Deno.env.get('RAVEN_INTEGRATION_ID');
      const ravenIntegrationSecret = Deno.env.get('RAVEN_INTEGRATION_SECRET');

      if (!ravenIntegrationId || !ravenIntegrationSecret) {
        throw new Error('Raven API credentials not configured');
      }

      const { data: cameraConfig } = await supabase
        .from('vehicle_camera_config')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .single();

      if (!cameraConfig) {
        throw new Error('Camera not configured for this vehicle');
      }

      const authToken = btoa(`${ravenIntegrationId}:${ravenIntegrationSecret}`);

      const ravenResponse = await fetch(
        `https://api.klashwerks.com/user-v1/devices/${cameraConfig.raven_device_id}/events?start=${startDate}&end=${endDate}`,
        {
          headers: {
            'Authorization': `Basic ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!ravenResponse.ok) {
        const errorText = await ravenResponse.text();
        throw new Error(`Raven API error: ${ravenResponse.statusText} - ${errorText}`);
      }

      const events: RavenEvent[] = await ravenResponse.json();

      const { data: vehicle } = await supabase
        .from('vehicles')
        .select('driver_id')
        .eq('id', vehicleId)
        .single();

      for (const event of events) {
        await supabase.from('dash_camera_events').insert({
          vehicle_id: vehicleId,
          driver_id: vehicle?.driver_id,
          event_type: event.eventType,
          severity: event.severity,
          event_timestamp: event.timestamp,
          video_url: event.videoUrl,
          thumbnail_url: event.thumbnailUrl,
          location_lat: event.location?.latitude,
          location_lng: event.location?.longitude,
          speed_mph: event.speed,
          metadata: event.metadata || {},
        });
      }

      await supabase
        .from('vehicle_camera_config')
        .update({ last_sync: new Date().toISOString() })
        .eq('vehicle_id', vehicleId);

      return new Response(
        JSON.stringify({
          success: true,
          eventsImported: events.length,
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    if (action === 'get_video') {
      const { eventId } = await req.json();
      const ravenIntegrationId = Deno.env.get('RAVEN_INTEGRATION_ID');
      const ravenIntegrationSecret = Deno.env.get('RAVEN_INTEGRATION_SECRET');

      if (!ravenIntegrationId || !ravenIntegrationSecret) {
        throw new Error('Raven API credentials not configured');
      }

      const authToken = btoa(`${ravenIntegrationId}:${ravenIntegrationSecret}`);

      const ravenResponse = await fetch(
        `https://api.klashwerks.com/user-v1/events/${eventId}/video`,
        {
          headers: {
            'Authorization': `Basic ${authToken}`,
          },
        }
      );

      if (!ravenResponse.ok) {
        throw new Error('Failed to fetch video');
      }

      const videoData = await ravenResponse.arrayBuffer();

      return new Response(videoData, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'video/mp4',
        },
      });
    }

    if (action === 'calculate_safety_score') {
      const { driverId, date } = await req.json();

      const { data: events } = await supabase
        .from('dash_camera_events')
        .select('event_type, severity')
        .eq('driver_id', driverId)
        .gte('event_timestamp', `${date}T00:00:00Z`)
        .lt('event_timestamp', `${date}T23:59:59Z`);

      let score = 100;
      const counts = {
        harsh_braking: 0,
        harsh_acceleration: 0,
        harsh_cornering: 0,
        distraction: 0,
        speeding: 0,
      };

      events?.forEach((event) => {
        if (event.event_type.includes('braking')) counts.harsh_braking++;
        if (event.event_type.includes('acceleration')) counts.harsh_acceleration++;
        if (event.event_type.includes('cornering')) counts.harsh_cornering++;
        if (event.event_type.includes('distraction')) counts.distraction++;
        if (event.event_type.includes('speeding')) counts.speeding++;

        const severityPenalty = {
          low: 1,
          medium: 3,
          high: 5,
          critical: 10,
        };
        score -= severityPenalty[event.severity as keyof typeof severityPenalty] || 1;
      });

      score = Math.max(0, Math.min(100, score));

      await supabase.from('driver_safety_scores').upsert({
        driver_id: driverId,
        date,
        overall_score: score,
        harsh_braking_count: counts.harsh_braking,
        harsh_acceleration_count: counts.harsh_acceleration,
        harsh_cornering_count: counts.harsh_cornering,
        distraction_count: counts.distraction,
        speeding_count: counts.speeding,
        updated_at: new Date().toISOString(),
      });

      return new Response(
        JSON.stringify({ success: true, score, counts }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    throw new Error('Invalid action');
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});