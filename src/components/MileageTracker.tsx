import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Gauge, Play, Square } from 'lucide-react';

interface MileageTrackerProps {
  tripId: string;
  vehicleId: string;
  onComplete: () => void;
  onCancel: () => void;
}

export default function MileageTracker({ tripId, vehicleId, onComplete, onCancel }: MileageTrackerProps) {
  const [startOdometer, setStartOdometer] = useState('');
  const [endOdometer, setEndOdometer] = useState('');
  const [mileageRecord, setMileageRecord] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExistingMileage();
  }, [tripId]);

  async function loadExistingMileage() {
    try {
      const { data, error } = await supabase
        .from('trip_mileage')
        .select('*')
        .eq('trip_id', tripId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setMileageRecord(data);
        setStartOdometer(data.start_odometer.toString());
        if (data.end_odometer) {
          setEndOdometer(data.end_odometer.toString());
        }
      }
    } catch (error) {
      console.error('Error loading mileage:', error);
    } finally {
      setLoading(false);
    }
  }

  async function startTracking() {
    if (!startOdometer) {
      alert('Please enter the starting odometer reading');
      return;
    }

    setSaving(true);

    try {
      const { data: vehicleData } = await supabase
        .from('vehicles')
        .select('id')
        .eq('vehicle_number', vehicleId)
        .maybeSingle();

      if (!vehicleData) {
        throw new Error('Vehicle not found');
      }

      const { data, error } = await supabase
        .from('trip_mileage')
        .insert({
          trip_id: tripId,
          vehicle_id: vehicleData.id,
          start_odometer: parseInt(startOdometer),
          start_time: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      setMileageRecord(data);
      alert('Mileage tracking started');
    } catch (error) {
      console.error('Error starting tracking:', error);
      alert('Failed to start tracking');
    } finally {
      setSaving(false);
    }
  }

  async function endTracking() {
    if (!endOdometer) {
      alert('Please enter the ending odometer reading');
      return;
    }

    const start = parseInt(startOdometer);
    const end = parseInt(endOdometer);

    if (end < start) {
      alert('End odometer must be greater than start odometer');
      return;
    }

    setSaving(true);

    try {
      const calculatedMiles = end - start;

      const { error } = await supabase
        .from('trip_mileage')
        .update({
          end_odometer: end,
          calculated_miles: calculatedMiles,
          end_time: new Date().toISOString()
        })
        .eq('id', mileageRecord.id);

      if (error) throw error;

      onComplete();
    } catch (error) {
      console.error('Error ending tracking:', error);
      alert('Failed to end tracking');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-pink-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const calculatedMiles = startOdometer && endOdometer
    ? parseInt(endOdometer) - parseInt(startOdometer)
    : 0;

  return (
    <div className="min-h-screen bg-pink-50 flex flex-col">
      <div className="bg-blue-600 text-white p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Mileage Tracker</h1>
          <button onClick={onCancel} className="p-2">
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="flex-1 p-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-center mb-6">
            <Gauge className="w-16 h-16 text-blue-600" />
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Starting Odometer
              </label>
              <input
                type="number"
                value={startOdometer}
                onChange={(e) => setStartOdometer(e.target.value)}
                disabled={!!mileageRecord}
                placeholder="Enter starting miles"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg disabled:bg-gray-100"
              />
            </div>

            {mileageRecord && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ending Odometer
                  </label>
                  <input
                    type="number"
                    value={endOdometer}
                    onChange={(e) => setEndOdometer(e.target.value)}
                    disabled={!!mileageRecord?.end_odometer}
                    placeholder="Enter ending miles"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg disabled:bg-gray-100"
                  />
                </div>

                {calculatedMiles > 0 && (
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Total Miles</p>
                    <p className="text-3xl font-bold text-blue-600">{calculatedMiles} miles</p>
                  </div>
                )}

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600">Started</span>
                    <span className="font-medium">
                      {new Date(mileageRecord.start_time).toLocaleString()}
                    </span>
                  </div>
                  {mileageRecord.end_time && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Ended</span>
                      <span className="font-medium">
                        {new Date(mileageRecord.end_time).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="mt-6">
            {!mileageRecord ? (
              <button
                onClick={startTracking}
                disabled={saving}
                className="w-full bg-green-600 text-white py-4 rounded-lg font-semibold flex items-center justify-center disabled:opacity-50"
              >
                <Play className="w-5 h-5 mr-2" />
                {saving ? 'Starting...' : 'Start Tracking'}
              </button>
            ) : !mileageRecord.end_odometer ? (
              <button
                onClick={endTracking}
                disabled={saving}
                className="w-full bg-red-600 text-white py-4 rounded-lg font-semibold flex items-center justify-center disabled:opacity-50"
              >
                <Square className="w-5 h-5 mr-2" />
                {saving ? 'Ending...' : 'End Tracking'}
              </button>
            ) : (
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 text-center">
                <p className="text-green-800 font-medium">Tracking Complete</p>
                <p className="text-sm text-green-600 mt-1">
                  {mileageRecord.calculated_miles} miles recorded
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
          <p className="text-sm text-blue-800 font-medium mb-1">Tip</p>
          <p className="text-sm text-blue-700">
            Enter your vehicle's odometer reading at the start of the trip, then enter it again when the trip is complete.
          </p>
        </div>
      </div>
    </div>
  );
}