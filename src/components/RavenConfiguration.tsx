import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Settings, CheckCircle, XCircle, Loader, Save, RefreshCw } from 'lucide-react';

interface Vehicle {
  id: string;
  vehicle_number: string;
  vehicle_name: string;
  make: string;
  model: string;
  year: number;
}

interface CameraConfig {
  id?: string;
  vehicle_id: string;
  raven_device_id: string;
  status: string;
  last_sync: string;
}

export function RavenConfiguration() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [cameraConfigs, setCameraConfigs] = useState<Record<string, CameraConfig>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'success' | 'error'>('unknown');
  const [apiKeySet, setApiKeySet] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);

  useEffect(() => {
    loadVehicles();
    loadCameraConfigs();
    checkApiKey();
  }, []);

  async function loadVehicles() {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, vehicle_number, vehicle_name, make, model, year')
        .order('vehicle_number');

      if (error) throw error;
      setVehicles(data || []);
    } catch (error) {
      console.error('Error loading vehicles:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadCameraConfigs() {
    try {
      const { data, error } = await supabase
        .from('vehicle_camera_config')
        .select('*');

      if (error) throw error;

      const configMap: Record<string, CameraConfig> = {};
      data?.forEach((config) => {
        configMap[config.vehicle_id] = config;
      });
      setCameraConfigs(configMap);
    } catch (error) {
      console.error('Error loading camera configs:', error);
    }
  }

  async function checkApiKey() {
    setCheckingStatus(true);
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

      const result = await response.json();
      setApiKeySet(result.configured || false);

      if (result.configured) {
        alert('API credentials are configured correctly!');
      }
    } catch (error) {
      console.error('Error checking API key:', error);
      setApiKeySet(false);
    } finally {
      setCheckingStatus(false);
    }
  }

  function updateDeviceId(vehicleId: string, deviceId: string) {
    setCameraConfigs((prev) => ({
      ...prev,
      [vehicleId]: {
        ...prev[vehicleId],
        vehicle_id: vehicleId,
        raven_device_id: deviceId,
        status: 'active',
        last_sync: new Date().toISOString(),
      },
    }));
  }

  async function saveConfiguration() {
    setSaving(true);
    try {
      for (const config of Object.values(cameraConfigs)) {
        if (!config.raven_device_id) continue;

        if (config.id) {
          await supabase
            .from('vehicle_camera_config')
            .update({
              raven_device_id: config.raven_device_id,
              status: 'active',
              updated_at: new Date().toISOString(),
            })
            .eq('id', config.id);
        } else {
          await supabase
            .from('vehicle_camera_config')
            .insert({
              vehicle_id: config.vehicle_id,
              raven_device_id: config.raven_device_id,
              camera_model: 'Raven Connected',
              status: 'active',
              installation_date: new Date().toISOString().split('T')[0],
            });
        }
      }

      alert('Configuration saved successfully!');
      loadCameraConfigs();
    } catch (error) {
      console.error('Error saving configuration:', error);
      alert('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  }

  async function testConnection() {
    setTestingConnection(true);
    setConnectionStatus('unknown');

    try {
      const vehicleWithConfig = Object.values(cameraConfigs).find(
        (config) => config.raven_device_id
      );

      if (!vehicleWithConfig) {
        alert('Please configure at least one vehicle first');
        setConnectionStatus('error');
        return;
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/raven-connected-sync`;
      const headers = {
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'sync_events',
          vehicleId: vehicleWithConfig.vehicle_id,
          startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setConnectionStatus('success');
        alert(`Connection successful! Found ${result.eventsImported || 0} events.`);
      } else {
        const error = await response.json();
        setConnectionStatus('error');
        alert(`Connection failed: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Connection test error:', error);
      setConnectionStatus('error');
      alert('Connection test failed. Please check your configuration.');
    } finally {
      setTestingConnection(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading configuration...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <Settings className="w-7 h-7 text-blue-600" />
                Raven Connected Configuration
              </h2>
              <p className="text-gray-600 mt-1">
                Map your vehicles to Raven device IDs
              </p>
            </div>

            <div className="flex items-center gap-3">
              {connectionStatus === 'success' && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">Connected</span>
                </div>
              )}
              {connectionStatus === 'error' && (
                <div className="flex items-center gap-2 text-red-600">
                  <XCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">Connection Failed</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-6">
          {!apiKeySet && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-yellow-800 mb-2">API Credentials Not Configured</h3>
                  <p className="text-yellow-700 text-sm mb-3">
                    Your Raven Integration ID and Secret need to be added to Supabase secrets.
                  </p>
                  <div className="text-sm text-yellow-700 space-y-2">
                    <p className="font-semibold">Required Secrets:</p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li><code className="bg-yellow-100 px-1 rounded">RAVEN_INTEGRATION_ID</code> = f04a8f59-e81f-11f0-9566-120765f5df43</li>
                      <li><code className="bg-yellow-100 px-1 rounded">RAVEN_INTEGRATION_SECRET</code> = OBKSecret260102</li>
                    </ul>
                    <p className="mt-3">
                      Go to <a href="https://supabase.com/dashboard/project/vnyebfjpkgqurgqxoqyv/settings/functions" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Supabase Edge Functions Secrets</a> and add both values.
                    </p>
                  </div>
                </div>
                <button
                  onClick={checkApiKey}
                  disabled={checkingStatus}
                  className="ml-4 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
                >
                  {checkingStatus ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Refresh Status
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {apiKeySet && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="w-5 h-5" />
                <span className="font-semibold">API credentials are configured correctly!</span>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Vehicle Device Mapping</h3>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Vehicle
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Details
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Raven Device ID
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {vehicles.map((vehicle) => {
                    const config = cameraConfigs[vehicle.id];
                    return (
                      <tr key={vehicle.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">
                            {vehicle.vehicle_number}
                          </div>
                          {vehicle.vehicle_name && (
                            <div className="text-sm text-gray-500">
                              {vehicle.vehicle_name}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {vehicle.year} {vehicle.make} {vehicle.model}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={config?.raven_device_id || ''}
                            onChange={(e) =>
                              updateDeviceId(vehicle.id, e.target.value)
                            }
                            placeholder="Enter Raven Device ID"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          {config?.raven_device_id ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                              <CheckCircle className="w-3 h-3" />
                              Configured
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                              <XCircle className="w-3 h-3" />
                              Not Set
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">
              How to find your Raven Device IDs:
            </h4>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Log in to your Raven dashboard at ravenconnected.com</li>
              <li>Click on each vehicle (BatMobile, Fiona, Luna, Mike, Scarlette, Smurf, Terminator)</li>
              <li>Look for the Device ID, Serial Number, or IMEI</li>
              <li>Copy and paste it into the corresponding vehicle row above</li>
            </ol>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              onClick={testConnection}
              disabled={testingConnection || !apiKeySet}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {testingConnection ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Testing...
                </>
              ) : (
                'Test Connection'
              )}
            </button>

            <button
              onClick={saveConfiguration}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Configuration
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
