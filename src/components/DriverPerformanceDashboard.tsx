import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  Star,
  Award,
  Target,
  DollarSign,
  MapPin,
  Calendar,
  Users
} from 'lucide-react';

interface DriverStats {
  driver_id: string;
  driver_name: string;
  total_trips: number;
  completed_trips: number;
  cancelled_trips: number;
  on_time_trips: number;
  late_trips: number;
  average_rating: number;
  total_distance: number;
  total_earnings: number;
  completion_rate: number;
  on_time_rate: number;
}

interface PerformanceMetrics {
  date: string;
  trips_completed: number;
  on_time_percentage: number;
  average_distance: number;
}

export default function DriverPerformanceDashboard() {
  const [drivers, setDrivers] = useState<DriverStats[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<DriverStats | null>(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState<PerformanceMetrics[]>([]);

  useEffect(() => {
    loadDriverStats();
  }, [dateRange]);

  useEffect(() => {
    if (selectedDriver) {
      loadPerformanceData(selectedDriver.driver_id);
    }
  }, [selectedDriver, dateRange]);

  async function loadDriverStats() {
    try {
      setLoading(true);

      const { data: tripsData, error } = await supabase
        .from('trips')
        .select('driver_id, status, scheduled_pickup_time, actual_pickup_time, trip_fare, profiles!driver_id(full_name)')
        .not('driver_id', 'is', null)
        .gte('scheduled_pickup_time', `${dateRange.start}T00:00:00`)
        .lte('scheduled_pickup_time', `${dateRange.end}T23:59:59`);

      if (error) throw error;

      const driverMap = new Map<string, DriverStats>();

      tripsData?.forEach((trip: any) => {
        if (!trip.driver_id) return;

        if (!driverMap.has(trip.driver_id)) {
          driverMap.set(trip.driver_id, {
            driver_id: trip.driver_id,
            driver_name: trip.profiles?.full_name || 'Unknown',
            total_trips: 0,
            completed_trips: 0,
            cancelled_trips: 0,
            on_time_trips: 0,
            late_trips: 0,
            average_rating: 0,
            total_distance: 0,
            total_earnings: 0,
            completion_rate: 0,
            on_time_rate: 0,
          });
        }

        const stats = driverMap.get(trip.driver_id)!;
        stats.total_trips++;

        if (trip.status === 'completed') {
          stats.completed_trips++;
          stats.total_earnings += trip.trip_fare || 0;

          if (trip.actual_pickup_time && trip.scheduled_pickup_time) {
            const scheduled = new Date(trip.scheduled_pickup_time).getTime();
            const actual = new Date(trip.actual_pickup_time).getTime();
            const diffMinutes = (actual - scheduled) / (1000 * 60);

            if (diffMinutes <= 15) {
              stats.on_time_trips++;
            } else {
              stats.late_trips++;
            }
          }
        } else if (trip.status === 'cancelled') {
          stats.cancelled_trips++;
        }
      });

      driverMap.forEach(stats => {
        stats.completion_rate = stats.total_trips > 0
          ? (stats.completed_trips / stats.total_trips) * 100
          : 0;
        stats.on_time_rate = (stats.on_time_trips + stats.late_trips) > 0
          ? (stats.on_time_trips / (stats.on_time_trips + stats.late_trips)) * 100
          : 0;
      });

      const driversArray = Array.from(driverMap.values()).sort((a, b) => b.total_trips - a.total_trips);
      setDrivers(driversArray);

      if (driversArray.length > 0 && !selectedDriver) {
        setSelectedDriver(driversArray[0]);
      }
    } catch (error) {
      console.error('Error loading driver stats:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadPerformanceData(driverId: string) {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('scheduled_pickup_time, actual_pickup_time, status')
        .eq('driver_id', driverId)
        .eq('status', 'completed')
        .gte('scheduled_pickup_time', `${dateRange.start}T00:00:00`)
        .lte('scheduled_pickup_time', `${dateRange.end}T23:59:59`)
        .order('scheduled_pickup_time', { ascending: true });

      if (error) throw error;

      const dailyMetrics = new Map<string, PerformanceMetrics>();

      data?.forEach((trip: any) => {
        const date = trip.scheduled_pickup_time.split('T')[0];

        if (!dailyMetrics.has(date)) {
          dailyMetrics.set(date, {
            date,
            trips_completed: 0,
            on_time_percentage: 0,
            average_distance: 0,
          });
        }

        const metrics = dailyMetrics.get(date)!;
        metrics.trips_completed++;

        if (trip.actual_pickup_time && trip.scheduled_pickup_time) {
          const scheduled = new Date(trip.scheduled_pickup_time).getTime();
          const actual = new Date(trip.actual_pickup_time).getTime();
          const diffMinutes = (actual - scheduled) / (1000 * 60);

          if (diffMinutes <= 15) {
            metrics.on_time_percentage++;
          }
        }
      });

      dailyMetrics.forEach(metrics => {
        metrics.on_time_percentage = (metrics.on_time_percentage / metrics.trips_completed) * 100;
      });

      setPerformanceData(Array.from(dailyMetrics.values()));
    } catch (error) {
      console.error('Error loading performance data:', error);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const topPerformer = drivers.length > 0
    ? drivers.reduce((prev, current) => (prev.on_time_rate > current.on_time_rate ? prev : current))
    : null;

  return (
    <div className="flex-1 overflow-auto bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Driver Performance Dashboard</h1>
          <p className="text-gray-600">Track and analyze driver performance metrics</p>
        </div>

        <div className="mb-6 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-600" />
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="text-gray-600">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {topPerformer && (
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl shadow-lg p-6 mb-8 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Award className="w-8 h-8" />
                  <h2 className="text-2xl font-bold">Top Performer</h2>
                </div>
                <p className="text-3xl font-bold mb-2">{topPerformer.driver_name}</p>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    <span className="text-lg">{topPerformer.on_time_rate.toFixed(1)}% On-Time</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    <span className="text-lg">{topPerformer.completed_trips} Trips</span>
                  </div>
                </div>
              </div>
              <div className="text-center">
                <Star className="w-20 h-20 fill-current mx-auto mb-2" />
                <p className="text-sm font-medium">Excellence Award</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">Total Drivers</h3>
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{drivers.length}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">Total Trips</h3>
              <MapPin className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {drivers.reduce((sum, d) => sum + d.total_trips, 0)}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">Avg Completion Rate</h3>
              <CheckCircle className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {drivers.length > 0
                ? (drivers.reduce((sum, d) => sum + d.completion_rate, 0) / drivers.length).toFixed(1)
                : 0}%
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">Total Earnings</h3>
              <DollarSign className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">
              ${drivers.reduce((sum, d) => sum + d.total_earnings, 0).toFixed(2)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Driver Rankings</h2>
            </div>
            <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
              {drivers.map((driver, index) => (
                <div
                  key={driver.driver_id}
                  onClick={() => setSelectedDriver(driver)}
                  className={`p-4 cursor-pointer transition-colors ${
                    selectedDriver?.driver_id === driver.driver_id
                      ? 'bg-blue-50 border-l-4 border-blue-600'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                        index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-600' : 'bg-gray-300'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{driver.driver_name}</p>
                        <p className="text-xs text-gray-600">{driver.total_trips} trips</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-gray-600">Completion</p>
                      <div className="flex items-center gap-1">
                        <p className="font-bold text-gray-900">{driver.completion_rate.toFixed(1)}%</p>
                        {driver.completion_rate >= 90 ? (
                          <TrendingUp className="w-3 h-3 text-green-600" />
                        ) : (
                          <TrendingDown className="w-3 h-3 text-red-600" />
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-gray-600">On-Time</p>
                      <div className="flex items-center gap-1">
                        <p className="font-bold text-gray-900">{driver.on_time_rate.toFixed(1)}%</p>
                        {driver.on_time_rate >= 80 ? (
                          <TrendingUp className="w-3 h-3 text-green-600" />
                        ) : (
                          <TrendingDown className="w-3 h-3 text-red-600" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {selectedDriver && (
              <>
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">{selectedDriver.driver_name} - Performance Metrics</h2>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <h3 className="text-sm font-medium text-green-900">Completed</h3>
                      </div>
                      <p className="text-2xl font-bold text-green-600">{selectedDriver.completed_trips}</p>
                    </div>

                    <div className="bg-red-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <XCircle className="w-5 h-5 text-red-600" />
                        <h3 className="text-sm font-medium text-red-900">Cancelled</h3>
                      </div>
                      <p className="text-2xl font-bold text-red-600">{selectedDriver.cancelled_trips}</p>
                    </div>

                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-5 h-5 text-blue-600" />
                        <h3 className="text-sm font-medium text-blue-900">On-Time</h3>
                      </div>
                      <p className="text-2xl font-bold text-blue-600">{selectedDriver.on_time_trips}</p>
                    </div>

                    <div className="bg-orange-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-5 h-5 text-orange-600" />
                        <h3 className="text-sm font-medium text-orange-900">Late</h3>
                      </div>
                      <p className="text-2xl font-bold text-orange-600">{selectedDriver.late_trips}</p>
                    </div>

                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-5 h-5 text-purple-600" />
                        <h3 className="text-sm font-medium text-purple-900">Success Rate</h3>
                      </div>
                      <p className="text-2xl font-bold text-purple-600">{selectedDriver.completion_rate.toFixed(1)}%</p>
                    </div>

                    <div className="bg-yellow-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="w-5 h-5 text-yellow-600" />
                        <h3 className="text-sm font-medium text-yellow-900">Earnings</h3>
                      </div>
                      <p className="text-2xl font-bold text-yellow-600">${selectedDriver.total_earnings.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                {performanceData.length > 0 && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Daily Performance Trend</h3>
                    <div className="space-y-3">
                      {performanceData.slice(-7).map((data) => (
                        <div key={data.date} className="flex items-center gap-4">
                          <div className="w-24 text-sm text-gray-600">
                            {new Date(data.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
                                <div
                                  className="bg-gradient-to-r from-green-400 to-green-600 h-full flex items-center justify-end pr-2"
                                  style={{ width: `${data.on_time_percentage}%` }}
                                >
                                  <span className="text-xs font-bold text-white">
                                    {data.on_time_percentage.toFixed(0)}%
                                  </span>
                                </div>
                              </div>
                              <div className="text-sm font-medium text-gray-600 w-16 text-right">
                                {data.trips_completed} trips
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
