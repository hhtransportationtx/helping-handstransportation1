import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { BarChart3, Download, Eye } from 'lucide-react';
import DateRangePicker from './DateRangePicker';

interface DriverScore {
  driver_id: string;
  driver_name: string;
  completed_trips: number;
  early_trips: number;
  on_time_trips: number;
  late_trips: number;
  early_time_score: number;
  on_time_score: number;
  late_time_score: number;
  actual_on_time_score: number;
}

export function DriverScoreReport() {
  const [driverScores, setDriverScores] = useState<DriverScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [pickupWise, setPickupWise] = useState('pickup');
  const [fundingSource, setFundingSource] = useState('all');

  useEffect(() => {
    loadDriverScores();
  }, [dateRange]);

  async function loadDriverScores() {
    try {
      setLoading(true);

      const { data: trips, error } = await supabase
        .from('trips')
        .select(
          `
          id,
          driver_id,
          status,
          pickup_time,
          actual_pickup_time,
          profiles!trips_driver_id_fkey (
            id,
            full_name
          )
        `
        )
        .eq('status', 'completed')
        .gte('trip_date', dateRange.start)
        .lte('trip_date', dateRange.end)
        .not('driver_id', 'is', null);

      if (error) throw error;

      const scoreMap = new Map<string, DriverScore>();

      trips?.forEach((trip: any) => {
        const driverId = trip.driver_id;
        const driver = trip.profiles;

        if (!driver) return;

        if (!scoreMap.has(driverId)) {
          scoreMap.set(driverId, {
            driver_id: driverId,
            driver_name: driver.full_name,
            completed_trips: 0,
            early_trips: 0,
            on_time_trips: 0,
            late_trips: 0,
            early_time_score: 0,
            on_time_score: 0,
            late_time_score: 0,
            actual_on_time_score: 0,
          });
        }

        const score = scoreMap.get(driverId)!;
        score.completed_trips++;

        if (trip.pickup_time && trip.actual_pickup_time) {
          const scheduledTime = new Date(trip.pickup_time);
          const actualTime = new Date(trip.actual_pickup_time);
          const diffMinutes = (actualTime.getTime() - scheduledTime.getTime()) / (1000 * 60);

          if (diffMinutes < -5) {
            score.early_trips++;
          } else if (diffMinutes >= -5 && diffMinutes <= 5) {
            score.on_time_trips++;
          } else {
            score.late_trips++;
          }
        }
      });

      scoreMap.forEach((score) => {
        if (score.completed_trips > 0) {
          score.early_time_score = (score.early_trips / score.completed_trips) * 100;
          score.on_time_score = (score.on_time_trips / score.completed_trips) * 100;
          score.late_time_score = (score.late_trips / score.completed_trips) * 100;
          score.actual_on_time_score =
            ((score.early_trips + score.on_time_trips) / score.completed_trips) * 100;
        }
      });

      setDriverScores(Array.from(scoreMap.values()));
    } catch (error) {
      console.error('Error loading driver scores:', error);
    } finally {
      setLoading(false);
    }
  }

  const totalCompleted = driverScores.reduce((sum, d) => sum + d.completed_trips, 0);
  const totalEarly = driverScores.reduce((sum, d) => sum + d.early_trips, 0);
  const totalOnTime = driverScores.reduce((sum, d) => sum + d.on_time_trips, 0);
  const totalLate = driverScores.reduce((sum, d) => sum + d.late_trips, 0);

  const avgEarlyScore = totalCompleted > 0 ? (totalEarly / totalCompleted) * 100 : 0;
  const avgOnTimeScore = totalCompleted > 0 ? (totalOnTime / totalCompleted) * 100 : 0;
  const avgLateScore = totalCompleted > 0 ? (totalLate / totalCompleted) * 100 : 0;
  const avgActualOnTimeScore =
    totalCompleted > 0 ? ((totalEarly + totalOnTime) / totalCompleted) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading driver scores...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-gray-50">
      <div className="p-6">
        <div className="mb-6 flex items-center gap-4 flex-wrap">
          <select
            value={fundingSource}
            onChange={(e) => setFundingSource(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">-- Select Funding Source --</option>
          </select>

          <select
            value={pickupWise}
            onChange={(e) => setPickupWise(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="pickup">Pickup Wise</option>
            <option value="dropoff">Dropoff Wise</option>
          </select>

          <div className="flex-1">
            <DateRangePicker
              startDate={dateRange.start}
              endDate={dateRange.end}
              onStartDateChange={(date) => setDateRange({ ...dateRange, start: date })}
              onEndDateChange={(date) => setDateRange({ ...dateRange, end: date })}
              label="Score Report Period"
            />
          </div>

          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <Download className="w-4 h-4" />
            Download
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Completed Trips</p>
                <p className="text-2xl font-bold text-gray-900">{totalCompleted}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Early Trips</p>
                <p className="text-2xl font-bold text-gray-900">{totalEarly}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">On Time Trips</p>
                <p className="text-2xl font-bold text-gray-900">{totalOnTime}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Late Trips</p>
                <p className="text-2xl font-bold text-gray-900">{totalLate}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Early Time Score</p>
                <p className="text-2xl font-bold text-gray-900">{avgEarlyScore.toFixed(2)}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">On Time Score</p>
                <p className="text-2xl font-bold text-gray-900">{avgOnTimeScore.toFixed(2)}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Late Time Score</p>
                <p className="text-2xl font-bold text-gray-900">{avgLateScore.toFixed(2)}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Actual On Time Score</p>
                <p className="text-2xl font-bold text-gray-900">
                  {avgActualOnTimeScore.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Driver
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Completed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Early
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  On Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Late
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Early Time Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  On Time Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Late Time Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actual On Time Score
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {driverScores.map((score) => (
                <tr key={score.driver_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {score.driver_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {score.completed_trips}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {score.early_trips}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {score.on_time_trips}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {score.late_trips}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {score.early_time_score.toFixed(0)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {score.on_time_score.toFixed(0)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {score.late_time_score.toFixed(0)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {score.actual_on_time_score.toFixed(0)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-2">
                      <button className="text-blue-600 hover:text-blue-800">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="text-blue-600 hover:text-blue-800">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
