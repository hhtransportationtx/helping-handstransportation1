import { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Users, Package, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Driver {
  id: string;
  full_name: string;
  phone: string | null;
  status: string;
}

interface Trip {
  id: string;
  scheduled_pickup_time: string;
  scheduled_dropoff_time: string | null;
  pickup_address: string;
  dropoff_address: string;
  status: string;
  distance_miles: number | null;
  patients: {
    full_name: string;
    phone: string | null;
  };
  funding_sources: {
    name: string;
  } | null;
  appointment_type: string | null;
}

export default function DriverLoadView() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDrivers();
  }, []);

  useEffect(() => {
    if (selectedDriverId && selectedDate) {
      loadDriverTrips();
    } else {
      setTrips([]);
    }
  }, [selectedDriverId, selectedDate]);

  const loadDrivers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, phone, status')
      .eq('role', 'driver')
      .order('full_name');

    if (!error && data) {
      setDrivers(data);
    }
  };

  const loadDriverTrips = async () => {
    if (!selectedDriverId || !selectedDate) return;

    setLoading(true);

    const { data, error } = await supabase
      .from('trips')
      .select(`
        id,
        scheduled_pickup_time,
        scheduled_dropoff_time,
        pickup_address,
        dropoff_address,
        status,
        distance_miles,
        appointment_type,
        patients (
          full_name,
          phone
        ),
        funding_sources (
          name
        )
      `)
      .eq('driver_id', selectedDriverId)
      .order('scheduled_pickup_time');

    if (!error && data) {
      const filteredTrips = (data as Trip[]).filter(trip => {
        const tripDate = new Date(trip.scheduled_pickup_time).toISOString().split('T')[0];
        return tripDate === selectedDate;
      });
      setTrips(filteredTrips);
    } else if (error) {
      console.error('Error loading trips:', error);
    }

    setLoading(false);
  };

  const totalTrips = trips.length;
  const totalMiles = trips.reduce((sum, trip) => sum + (trip.distance_miles || 0), 0);
  const completedTrips = trips.filter(t => t.status === 'completed').length;

  const selectedDriver = drivers.find(d => d.id === selectedDriverId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Driver Load</h1>
          <p className="text-gray-600">View trips assigned to each driver</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Driver
              </label>
              <select
                value={selectedDriverId}
                onChange={(e) => setSelectedDriverId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">-- Select Driver --</option>
                {drivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {selectedDriver && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-4">
                <Users className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="font-semibold text-gray-900">{selectedDriver.full_name}</div>
                  <div className="text-sm text-gray-600">{selectedDriver.phone || 'No phone'}</div>
                </div>
                <div className="ml-auto">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    selectedDriver.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {selectedDriver.status}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {selectedDriverId && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Package className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-gray-600">Total Trips</span>
                </div>
                <div className="text-3xl font-bold text-gray-900">{totalTrips}</div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-gray-600">Total Miles</span>
                </div>
                <div className="text-3xl font-bold text-gray-900">{totalMiles.toFixed(1)}</div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-gray-600">Completed</span>
                </div>
                <div className="text-3xl font-bold text-gray-900">
                  {completedTrips} / {totalTrips}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="p-6 bg-gray-50 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-gray-900">Assigned Trips</h2>
                  {loading && (
                    <div className="text-sm text-gray-600">Loading...</div>
                  )}
                </div>
              </div>

              {trips.length === 0 ? (
                <div className="p-12 text-center">
                  <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No trips assigned for this date</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Patient
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Pickup Address
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Dropoff Address
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Distance
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {trips.map((trip) => (
                        <tr key={trip.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2 text-sm text-gray-900">
                              <Clock className="w-4 h-4 text-gray-400" />
                              {new Date(trip.scheduled_pickup_time).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                              })}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">
                              {trip.patients.full_name}
                            </div>
                            {trip.patients.phone && (
                              <div className="text-xs text-gray-500">{trip.patients.phone}</div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-start gap-2 text-sm text-gray-700 max-w-xs">
                              <MapPin className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                              <span className="line-clamp-2">{trip.pickup_address}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-start gap-2 text-sm text-gray-700 max-w-xs">
                              <MapPin className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                              <span className="line-clamp-2">{trip.dropoff_address}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {trip.distance_miles ? `${trip.distance_miles.toFixed(1)} mi` : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              trip.status === 'completed' ? 'bg-green-100 text-green-700' :
                              trip.status === 'active' || trip.status === 'picked_up' ? 'bg-blue-100 text-blue-700' :
                              trip.status === 'assigned' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {trip.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
