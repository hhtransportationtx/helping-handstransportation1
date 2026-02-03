import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search } from 'lucide-react';
import DateRangePicker from './DateRangePicker';

interface DriverEarning {
  driver_id: string;
  driver_name: string;
  email: string;
  trips: {
    id: string;
    trip_date: string;
    pickup_address: string;
    dropoff_address: string;
    distance_miles: number;
    amount: number;
  }[];
  total_amount: number;
  total_miles: number;
}

export function DriverEarningsReport() {
  const [drivers, setDrivers] = useState<DriverEarning[]>([]);
  const [filteredDrivers, setFilteredDrivers] = useState<DriverEarning[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<DriverEarning | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadDriverEarnings();
  }, [dateRange]);

  useEffect(() => {
    filterDrivers();
  }, [drivers, searchQuery]);

  async function loadDriverEarnings() {
    try {
      setLoading(true);

      const { data: trips, error } = await supabase
        .from('trips')
        .select(
          `
          id,
          trip_date,
          pickup_address,
          dropoff_address,
          distance_miles,
          driver_id,
          profiles!trips_driver_id_fkey (
            id,
            full_name,
            email
          )
        `
        )
        .eq('status', 'completed')
        .gte('trip_date', dateRange.start)
        .lte('trip_date', dateRange.end)
        .not('driver_id', 'is', null);

      if (error) throw error;

      const driverMap = new Map<string, DriverEarning>();

      trips?.forEach((trip: any) => {
        const driverId = trip.driver_id;
        const driver = trip.profiles;

        if (!driver) return;

        if (!driverMap.has(driverId)) {
          driverMap.set(driverId, {
            driver_id: driverId,
            driver_name: driver.full_name,
            email: driver.email,
            trips: [],
            total_amount: 0,
            total_miles: 0,
          });
        }

        const driverData = driverMap.get(driverId)!;
        const amount = 15;

        driverData.trips.push({
          id: trip.id,
          trip_date: trip.trip_date,
          pickup_address: trip.pickup_address,
          dropoff_address: trip.dropoff_address,
          distance_miles: trip.distance_miles || 0,
          amount,
        });

        driverData.total_amount += amount;
        driverData.total_miles += trip.distance_miles || 0;
      });

      setDrivers(Array.from(driverMap.values()));
    } catch (error) {
      console.error('Error loading driver earnings:', error);
    } finally {
      setLoading(false);
    }
  }

  function filterDrivers() {
    let filtered = [...drivers];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.driver_name.toLowerCase().includes(query) || d.email.toLowerCase().includes(query)
      );
    }

    setFilteredDrivers(filtered);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading driver earnings...</div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div className="w-96 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredDrivers.map((driver) => (
            <button
              key={driver.driver_id}
              onClick={() => setSelectedDriver(driver)}
              className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                selectedDriver?.driver_id === driver.driver_id ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-600">
                    {driver.driver_name.charAt(0)}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{driver.driver_name}</p>
                  <p className="text-xs text-gray-500">{driver.email}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-gray-50">
        {selectedDriver ? (
          <div className="p-6">
            <div className="mb-6 flex items-center gap-4">
              <div className="flex-1">
                <DateRangePicker
                  startDate={dateRange.start}
                  endDate={dateRange.end}
                  onStartDateChange={(date) => setDateRange({ ...dateRange, start: date })}
                  onEndDateChange={(date) => setDateRange({ ...dateRange, end: date })}
                  label="Earnings Report Period"
                />
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Trip ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Pickup Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Dropoff Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Miles
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {selectedDriver.trips.map((trip) => (
                    <tr key={trip.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {trip.id.substring(0, 8)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(trip.trip_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{trip.pickup_address}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{trip.dropoff_address}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {trip.distance_miles.toFixed(1)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${trip.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t border-gray-200">
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                      Total:
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {selectedDriver.total_miles.toFixed(1)} mi
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                      ${selectedDriver.total_amount.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-gray-500">Select a driver to view earnings</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
