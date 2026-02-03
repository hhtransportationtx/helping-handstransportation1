import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { calculateDistance } from '../lib/distanceUtils';
import { Zap, MapPin, Clock, TrendingUp, CheckCircle, AlertTriangle } from 'lucide-react';

interface Trip {
  id: string;
  pickup_address: string;
  dropoff_address: string;
  pickup_latitude?: number;
  pickup_longitude?: number;
  dropoff_latitude?: number;
  dropoff_longitude?: number;
  scheduled_pickup_time: string;
  patient?: {
    full_name: string;
    mobility_needs?: string;
  };
}

interface OptimizedRoute {
  driver_id: string;
  driver_name: string;
  trips: Trip[];
  total_distance: number;
  total_time: number;
  efficiency_score: number;
}

interface RouteOptimizerProps {
  trips: Trip[];
  onClose: () => void;
  onApply: (routes: OptimizedRoute[]) => void;
}

export default function RouteOptimizer({ trips, onClose, onApply }: RouteOptimizerProps) {
  const [optimizedRoutes, setOptimizedRoutes] = useState<OptimizedRoute[]>([]);
  const [optimizing, setOptimizing] = useState(false);
  const [applying, setApplying] = useState(false);

  async function optimizeRoutes() {
    setOptimizing(true);

    try {
      const { data: drivers, error: driversError } = await supabase
        .from('profiles')
        .select('id, full_name, current_latitude, current_longitude')
        .eq('role', 'driver')
        .eq('status', 'active')
        .not('current_latitude', 'is', null)
        .not('current_longitude', 'is', null);

      if (driversError) throw driversError;

      if (!drivers || drivers.length === 0) {
        alert('No available drivers found');
        setOptimizing(false);
        return;
      }

      const tripsByTime = [...trips].sort((a, b) =>
        new Date(a.scheduled_pickup_time).getTime() - new Date(b.scheduled_pickup_time).getTime()
      );

      const routes: OptimizedRoute[] = drivers.map(driver => ({
        driver_id: driver.id,
        driver_name: driver.full_name,
        trips: [],
        total_distance: 0,
        total_time: 0,
        efficiency_score: 0,
      }));

      for (const trip of tripsByTime) {
        if (!trip.pickup_latitude || !trip.pickup_longitude) continue;

        let bestRoute: OptimizedRoute | null = null;
        let minCost = Infinity;

        for (const route of routes) {
          const lastLocation = route.trips.length > 0
            ? {
                lat: route.trips[route.trips.length - 1].dropoff_latitude!,
                lng: route.trips[route.trips.length - 1].dropoff_longitude!,
              }
            : {
                lat: drivers.find(d => d.id === route.driver_id)!.current_latitude!,
                lng: drivers.find(d => d.id === route.driver_id)!.current_longitude!,
              };

          const distance = calculateDistance(
            lastLocation.lat,
            lastLocation.lng,
            trip.pickup_latitude,
            trip.pickup_longitude
          );

          const scheduledTime = new Date(trip.scheduled_pickup_time).getTime();
          const currentTime = Date.now();
          const timeUntilPickup = (scheduledTime - currentTime) / 60000;

          const estimatedTravelTime = distance * 2;

          const timeCost = Math.abs(estimatedTravelTime - timeUntilPickup);
          const distanceCost = distance;
          const loadBalanceCost = route.trips.length * 5;

          const totalCost = distanceCost + timeCost * 0.5 + loadBalanceCost;

          if (totalCost < minCost) {
            minCost = totalCost;
            bestRoute = route;
          }
        }

        if (bestRoute) {
          bestRoute.trips.push(trip);

          const lastLocation = bestRoute.trips.length > 1
            ? {
                lat: bestRoute.trips[bestRoute.trips.length - 2].dropoff_latitude!,
                lng: bestRoute.trips[bestRoute.trips.length - 2].dropoff_longitude!,
              }
            : {
                lat: drivers.find(d => d.id === bestRoute.driver_id)!.current_latitude!,
                lng: drivers.find(d => d.id === bestRoute.driver_id)!.current_longitude!,
              };

          const tripDistance = calculateDistance(
            lastLocation.lat,
            lastLocation.lng,
            trip.pickup_latitude,
            trip.pickup_longitude
          );

          if (trip.dropoff_latitude && trip.dropoff_longitude) {
            const dropoffDistance = calculateDistance(
              trip.pickup_latitude,
              trip.pickup_longitude,
              trip.dropoff_latitude,
              trip.dropoff_longitude
            );
            bestRoute.total_distance += tripDistance + dropoffDistance;
          } else {
            bestRoute.total_distance += tripDistance;
          }

          bestRoute.total_time += tripDistance * 2;
        }
      }

      routes.forEach(route => {
        if (route.trips.length > 0) {
          const avgTripDistance = route.total_distance / route.trips.length;
          const avgTripTime = route.total_time / route.trips.length;
          route.efficiency_score = Math.max(0, 100 - (avgTripDistance * 2 + avgTripTime * 0.5));
        }
      });

      const routesWithTrips = routes.filter(r => r.trips.length > 0);
      setOptimizedRoutes(routesWithTrips.sort((a, b) => b.efficiency_score - a.efficiency_score));
    } catch (error) {
      console.error('Error optimizing routes:', error);
      alert('Failed to optimize routes');
    } finally {
      setOptimizing(false);
    }
  }

  async function applyOptimization() {
    setApplying(true);

    try {
      await onApply(optimizedRoutes);
      onClose();
    } catch (error) {
      console.error('Error applying optimization:', error);
      alert('Failed to apply optimization');
    } finally {
      setApplying(false);
    }
  }

  const totalTripsAssigned = optimizedRoutes.reduce((sum, route) => sum + route.trips.length, 0);
  const avgEfficiency = optimizedRoutes.length > 0
    ? optimizedRoutes.reduce((sum, route) => sum + route.efficiency_score, 0) / optimizedRoutes.length
    : 0;
  const totalDistance = optimizedRoutes.reduce((sum, route) => sum + route.total_distance, 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">AI Route Optimizer</h2>
              <p className="text-purple-100">Intelligent route planning for maximum efficiency</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-4">
            <div className="bg-white bg-opacity-20 rounded-lg p-3">
              <p className="text-sm text-purple-100 mb-1">Total Trips</p>
              <p className="text-2xl font-bold">{trips.length}</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-3">
              <p className="text-sm text-purple-100 mb-1">Assigned</p>
              <p className="text-2xl font-bold">{totalTripsAssigned}</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-3">
              <p className="text-sm text-purple-100 mb-1">Avg Efficiency</p>
              <p className="text-2xl font-bold">{avgEfficiency.toFixed(0)}%</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-3">
              <p className="text-sm text-purple-100 mb-1">Total Distance</p>
              <p className="text-2xl font-bold">{totalDistance.toFixed(1)} mi</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {optimizedRoutes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Zap className="w-16 h-16 text-purple-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Ready to Optimize</h3>
              <p className="text-gray-600 mb-6 text-center max-w-md">
                Click the button below to use AI-powered algorithms to optimize route assignments based on
                distance, time, and driver availability
              </p>
              <button
                onClick={optimizeRoutes}
                disabled={optimizing}
                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-bold hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 shadow-lg text-lg"
              >
                {optimizing ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    Optimizing Routes...
                  </>
                ) : (
                  <>
                    <Zap className="w-6 h-6" />
                    Optimize Routes with AI
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-green-900 mb-1">Optimization Complete</h3>
                  <p className="text-sm text-green-700">
                    Routes have been optimized for {optimizedRoutes.length} drivers with an average efficiency
                    score of {avgEfficiency.toFixed(1)}%. Total distance reduced to {totalDistance.toFixed(1)} miles.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {optimizedRoutes.map((route, index) => (
                  <div
                    key={route.driver_id}
                    className="bg-white border-2 border-gray-200 rounded-lg p-6 shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{route.driver_name}</h3>
                          <p className="text-sm text-gray-600">{route.trips.length} trips assigned</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2 mb-1">
                          <TrendingUp className="w-5 h-5 text-green-600" />
                          <span className="text-2xl font-bold text-green-600">
                            {route.efficiency_score.toFixed(0)}%
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">Efficiency Score</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <MapPin className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-gray-700">Distance</span>
                        </div>
                        <p className="text-lg font-bold text-gray-900">{route.total_distance.toFixed(1)} mi</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className="w-4 h-4 text-orange-600" />
                          <span className="text-sm font-medium text-gray-700">Time</span>
                        </div>
                        <p className="text-lg font-bold text-gray-900">{route.total_time.toFixed(0)} min</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium text-gray-700">Trips</span>
                        </div>
                        <p className="text-lg font-bold text-gray-900">{route.trips.length}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {route.trips.map((trip, tripIndex) => (
                        <div
                          key={trip.id}
                          className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-start gap-3"
                        >
                          <div className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {tripIndex + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 mb-1">{trip.patient?.full_name}</p>
                            <div className="space-y-1">
                              <div className="flex items-start gap-2 text-sm text-gray-600">
                                <MapPin className="w-3 h-3 text-green-600 flex-shrink-0 mt-0.5" />
                                <span className="truncate">{trip.pickup_address}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <Clock className="w-3 h-3" />
                                {new Date(trip.scheduled_pickup_time).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                            </div>
                            {trip.patient?.mobility_needs && (
                              <div className="mt-2 flex items-center gap-1 text-xs text-yellow-700">
                                <AlertTriangle className="w-3 h-3" />
                                {trip.patient.mobility_needs}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {optimizedRoutes.length > 0 && (
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <button
                onClick={optimizeRoutes}
                disabled={optimizing}
                className="px-6 py-3 border border-purple-600 text-purple-600 rounded-lg font-semibold hover:bg-purple-50 transition-colors disabled:opacity-50"
              >
                Re-optimize
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={applyOptimization}
                  disabled={applying}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {applying ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Applying...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Apply Optimization
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
