import { useState, useEffect } from 'react';
import { TestTube, CheckCircle, XCircle, Loader, AlertCircle, Bell } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function RavenWebhookTester() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    details?: any;
  } | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [configuredVehicles, setConfiguredVehicles] = useState(0);

  useEffect(() => {
    checkStatus();
  }, []);

  async function checkStatus() {
    const { count: notifCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true });

    const { count: vehicleCount } = await supabase
      .from('vehicle_camera_config')
      .select('*', { count: 'exact', head: true });

    setNotificationCount(notifCount || 0);
    setConfiguredVehicles(vehicleCount || 0);
  }

  async function testWebhook() {
    setTesting(true);
    setResult(null);

    try {
      const { data: cameraConfigs, error: configError } = await supabase
        .from('vehicle_camera_config')
        .select('raven_device_id, vehicles(vehicle_name)')
        .limit(1)
        .maybeSingle();

      if (configError) {
        setResult({
          success: false,
          message: 'Failed to check vehicle configuration',
          details: { error: configError.message },
        });
        setTesting(false);
        return;
      }

      let deviceId = 'test_device_123';
      let useRealDevice = false;

      if (cameraConfigs && cameraConfigs.raven_device_id) {
        deviceId = cameraConfigs.raven_device_id;
        useRealDevice = true;
      }

      const testEvent = {
        events: [
          {
            event_type: 'HARD_BRAKING',
            event_id: `test_${Date.now()}`,
            device_id: deviceId,
            device_serial: 'TEST-SERIAL-001',
            timestamp: new Date().toISOString(),
            severity: 'medium',
            location: {
              latitude: 40.7128,
              longitude: -74.0060,
              altitude: 10,
              heading: 180,
            },
            speed: 45,
            video_url: 'https://example.com/test-video.mp4',
            thumbnail_url: 'https://example.com/test-thumb.jpg',
            metadata: {
              test_event: true,
              description: 'This is a test event to verify webhook functionality',
            },
          },
        ],
      };

      const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/raven-webhook`;

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testEvent),
      });

      const data = await response.json();

      if (response.ok) {
        await checkStatus();

        if (useRealDevice && data.processed > 0) {
          setResult({
            success: true,
            message: `Webhook test successful! Event processed and notifications created. Check your Notifications panel.`,
            details: data,
          });
        } else if (useRealDevice && data.errors) {
          setResult({
            success: true,
            message: `Webhook is working but encountered issues: ${data.errors.join(', ')}`,
            details: data,
          });
        } else if (!useRealDevice) {
          setResult({
            success: true,
            message: 'Webhook endpoint is working, but no vehicles are configured yet. Map vehicles in Setup tab to test notifications.',
            details: data,
          });
        } else {
          setResult({
            success: true,
            message: 'Webhook test successful! The endpoint is receiving events.',
            details: data,
          });
        }
      } else {
        setResult({
          success: false,
          message: 'Webhook responded with an error',
          details: data,
        });
      }
    } catch (error: any) {
      setResult({
        success: false,
        message: 'Failed to connect to webhook',
        details: { error: error.message },
      });
    } finally {
      setTesting(false);
    }
  }

  async function testApiKey() {
    setTesting(true);
    setResult(null);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/raven-connected-sync`;
      const headers = {
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'check_api_key',
        }),
      });

      const data = await response.json();

      if (data.configured) {
        setResult({
          success: true,
          message: 'Raven API key is properly configured!',
          details: data,
        });
      } else {
        setResult({
          success: false,
          message: 'Raven API credentials are NOT configured. Add RAVEN_INTEGRATION_ID and RAVEN_INTEGRATION_SECRET to Supabase secrets.',
          details: data,
        });
      }
    } catch (error: any) {
      setResult({
        success: false,
        message: 'Failed to check API key configuration',
        details: { error: error.message },
      });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <TestTube className="w-7 h-7 text-blue-600" />
            Raven Integration Testing
          </h2>
          <p className="text-gray-600 mt-1">
            Test your Raven Connected webhook and API configuration
          </p>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-900">Configured Vehicles</p>
                  <p className="text-2xl font-bold text-blue-700 mt-1">{configuredVehicles}</p>
                </div>
                <CheckCircle className={`w-8 h-8 ${configuredVehicles > 0 ? 'text-green-600' : 'text-gray-400'}`} />
              </div>
              <p className="text-xs text-blue-700 mt-2">
                {configuredVehicles === 0 ? 'No vehicles mapped yet. Go to Setup tab.' : 'Vehicles mapped to Raven devices'}
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-900">Total Notifications</p>
                  <p className="text-2xl font-bold text-green-700 mt-1">{notificationCount}</p>
                </div>
                <Bell className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-xs text-green-700 mt-2">
                All-time notifications in system
              </p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-2">Before Testing:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Ensure RAVEN_INTEGRATION_ID is set in Supabase secrets</li>
                  <li>Ensure RAVEN_INTEGRATION_SECRET is set in Supabase secrets</li>
                  <li>Map at least one vehicle to a Raven device ID (currently: {configuredVehicles})</li>
                  <li>Configure webhook URL in Raven dashboard</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-2">Test API Key</h3>
              <p className="text-sm text-gray-600 mb-4">
                Verify that your Raven API key is properly configured in Supabase secrets.
              </p>
              <button
                onClick={testApiKey}
                disabled={testing}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {testing ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  'Test API Key'
                )}
              </button>
            </div>

            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-2">Test Webhook</h3>
              <p className="text-sm text-gray-600 mb-4">
                Send a test event to your webhook endpoint to verify it's working correctly.
              </p>
              <button
                onClick={testWebhook}
                disabled={testing}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {testing ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  'Test Webhook'
                )}
              </button>
            </div>
          </div>

          {result && (
            <div
              className={`rounded-lg p-6 border ${
                result.success
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="flex items-start gap-3">
                {result.success ? (
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <h3
                    className={`font-semibold mb-2 ${
                      result.success ? 'text-green-900' : 'text-red-900'
                    }`}
                  >
                    {result.success ? 'Success!' : 'Failed'}
                  </h3>
                  <p
                    className={`text-sm ${
                      result.success ? 'text-green-800' : 'text-red-800'
                    }`}
                  >
                    {result.message}
                  </p>
                  {result.details && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm font-medium">
                        View Details
                      </summary>
                      <pre className="mt-2 p-3 bg-white bg-opacity-50 rounded text-xs overflow-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Webhook URL</h3>
            <div className="bg-white p-3 rounded border border-gray-300 font-mono text-sm break-all">
              {import.meta.env.VITE_SUPABASE_URL}/functions/v1/raven-webhook
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Configure this URL in your Raven dashboard to receive real-time safety events.
            </p>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Integration Secret</h3>
            <div className="bg-white p-3 rounded border border-gray-300 font-mono text-sm">
              OBKSecret260102
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Use this secret for webhook signature verification in the Raven dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
