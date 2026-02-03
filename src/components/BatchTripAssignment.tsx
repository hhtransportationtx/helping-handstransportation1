import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, MapPin, User, Clock, CheckCircle, Zap, TrendingUp } from 'lucide-react';
import { calculateDistance } from '../lib/distanceUtils';

interface Trip {
  id: string;
  pickup_address: string;
  dropoff_address: string;
  pickup_latitude?: number;
  pickup_longitude?: number;
  scheduled_pickup_time: string;
  patient?: {
    full_name: string;
    mobility_needs?: string;
  };
}

interface Driver {
  id: string;
  full_name: string;
  current_latitude?: number;
  current_longitude?: number;
  status: string;
  assigned_vehicle?: {
    vehicle_name?: string;
    rig_no?: string;
  };
}

interface Assignment {
  trip: Trip;
  driver: Driver | null;
  distance?: number;
  eta?: string;
}

interface BatchTripAssignmentProps {
  trips: Trip[];
  onClose: () => void;
  onAssign: (assignments: Array<{ tripId: string; driverId: string }>) => void;
}

export default function BatchTripAssignment({ trips, onClose, onAssign }: BatchTripAssignmentProps) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [optimizing, setOptimizing] = useState(false);

  useEffect(() => {
    loadDrivers();
    initializeAssignments();
  }, []);

  async function loadDrivers() {
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data: driversData, error: driversError } = await supabase
        .from('profiles')
        .select('id, full_name, current_latitude, current_longitude, status')
        .eq('role', 'driver')
        .eq('status', 'active');

      if (driversError) throw driversError;

      const { data: assignments } = await supabase
        .from('vehicle_assignments')
        .select(`
          driver_id,
          vehicle:vehicles(vehicle_name, rig_no)
        `)
        .eq('assigned_date', today)
        .is('unassigned_at', null);

      const assignmentMap = new Map();
      if (assignments) {
        assignments.forEach((assignment: any) => {
          if (assignment.vehicle) {
            assignmentMap.set(assignment.driver_id, assignment.vehicle);
          }
        });
      }

      const driversWithVehicles = (driversData || []).map(driver => ({
        ...driver,
        assigned_vehicle: assignmentMap.get(driver.id)
      }));

      setDrivers(driversWithVehicles);
    } catch (error) {
      console.error('Error loading drivers:', error);
    } finally {
      setLoading(false);
    }
  }

  function initializeAssignments() {
    setAssignments(trips.map(trip => ({ trip, driver: null })));
  }

  function findClosestDriver(trip: Trip, availableDrivers: Driver[]): Driver | null {
    if (!trip.pickup_latitude || !trip.pickup_longitude) return null;

    let closest: Driver | null = null;
    let minDistance = Infinity;

    availableDrivers.forEach(driver => {
      if (driver.current_latitude && driver.current_longitude) {
        const distance = calculateDistance(
          trip.pickup_latitude!,
          trip.pickup_longitude!,
          driver.current_latitude,
          driver.current_longitude
        );

        if (distance < minDistance) {
          minDistance = distance;
          closest = driver;
        }
      }
    });

    return closest;
  }

  function optimizeAssignments() {
    setOptimizing(true);

    const sortedTrips = [...trips].sort((a, b) => {
      return new Date(a.scheduled_pickup_time).getTime() - new Date(b.scheduled_pickup_time).getTime();
    });

    const availableDrivers = [...drivers];
    const usedDrivers = new Set<string>();

    const optimizedAssignments = sortedTrips.map(trip => {
      const availableForThisTrip = availableDrivers.filter(d => !usedDrivers.has(d.id));
      const closestDriver = findClosestDriver(trip, availableForThisTrip);

      if (closestDriver) {
        usedDrivers.add(closestDriver.id);

        const distance = closestDriver.current_latitude && closestDriver.current_longitude && trip.pickup_latitude && trip.pickup_longitude
          ? calculateDistance(
              trip.pickup_latitude,
              trip.pickup_longitude,
              closestDriver.current_latitude,
              closestDriver.current_longitude
            )
          : undefined;

        return {
          trip,
          driver: closestDriver,
          distance,
          eta: distance ? `${Math.round(distance * 2)} min` : undefined
        };
      }

      return { trip, driver: null };
    });

    setAssignments(optimizedAssignments);
    setOptimizing(false);
  }

  function updateAssignment(tripId: string, driver: Driver | null) {
    setAssignments(prev =>
      prev.map(assignment =>
        assignment.trip.id === tripId
          ? {
              ...assignment,
              driver,
              distance: driver && driver.current_latitude && driver.current_longitude && assignment.trip.pickup_latitude && assignment.trip.pickup_longitude
                ? calculateDistance(
                    assignment.trip.pickup_latitude,
                    assignment.trip.pickup_longitude,
                    driver.current_latitude,
                    driver.current_longitude
                  )
                : undefined
            }
          : assignment
      )
    );
  }

  async function handleBatchAssign() {
    const validAssignments = assignments.filter(a => a.driver !== null);

    if (validAssignments.length === 0) {
      alert('Please assign at least one driver');
      return;
    }

    setAssigning(true);
    try {
      await onAssign(
        validAssignments.map(a => ({
          tripId: a.trip.id,
          driverId: a.driver!.id
        }))
      );
      onClose();
    } catch (error) {
      console.error('Error assigning trips:', error);
      alert('Failed to assign trips');
    } finally {
      setAssigning(false);
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  const assignedCount = assignments.filter(a => a.driver !== null).length;
  const totalDistance = assignments.reduce((sum, a) => sum + (a.distance || 0), 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">Batch Trip Assignment</h2>
              <p className="text-blue-100">Assign multiple trips at once with route optimization</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="bg-white bg-opacity-20 rounded-lg p-3">
              <p className="text-sm text-blue-100 mb-1">Total Trips</p>
              <p className="text-2xl font-bold">{trips.length}</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-3">
              <p className="text-sm text-blue-100 mb-1">Assigned</p>
              <p className="text-2xl font-bold">{assignedCount} / {trips.length}</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-3">
              <p className="text-sm text-blue-100 mb-1">Total Distance</p>
              <p className="text-2xl font-bold">{totalDistance.toFixed(1)} mi</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="mb-4 flex items-center gap-3">
            <button
              onClick={optimizeAssignments}
              disabled={optimizing || drivers.length === 0}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg"
            >
              {optimizing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Optimizing...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  Auto-Optimize Routes
                </>
              )}
            </button>

            <div className="flex items-center gap-2 text-sm text-gray-600">
              <TrendingUp className="w-4 h-4" />
              <span>Optimizes by time and distance</span>
            </div>
          </div>

          <div className="space-y-4">
            {assignments.map((assignment, index) => (
              <div key={assignment.trip.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                    {index + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">{assignment.trip.patient?.full_name}</h3>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="w-4 h-4" />
                          {new Date(assignment.trip.scheduled_pickup_time).toLocaleString()}
                        </div>
                      </div>
                      {assignment.distance !== undefined && (
                        <div className="text-right">
                          <p className="text-sm font-medium text-blue-600">{assignment.distance.toFixed(2)} mi</p>
                          {assignment.eta && <p className="text-xs text-gray-500">{assignment.eta}</p>}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 mb-3">
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{assignment.trip.pickup_address}</span>
                      </div>
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{assignment.trip.dropoff_address}</span>
                      </div>
                    </div>

                    {assignment.trip.patient?.mobility_needs && (
                      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-2 mb-3 text-sm">
                        <p className="text-yellow-800">{assignment.trip.patient.mobility_needs}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      {assignment.driver ? (
                        <div className="flex-1 flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg p-3">
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-green-900">{assignment.driver.full_name}</p>
                            {assignment.driver.assigned_vehicle && (
                              <p className="text-xs text-green-700">
                                {assignment.driver.assigned_vehicle.vehicle_name || assignment.driver.assigned_vehicle.rig_no}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => updateAssignment(assignment.trip.id, null)}
                            className="text-red-600 hover:text-red-700 text-sm font-medium"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <select
                          onChange={(e) => {
                            const driver = drivers.find(d => d.id === e.target.value);
                            updateAssignment(assignment.trip.id, driver || null);
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select driver...</option>
                          {drivers.map(driver => (
                            <option key={driver.id} value={driver.id}>
                              {driver.full_name}
                              {driver.assigned_vehicle ? ` - ${driver.assigned_vehicle.vehicle_name || driver.assigned_vehicle.rig_no}` : ''}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {assignedCount === trips.length ? (
                <span className="text-green-600 font-medium flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  All trips assigned
                </span>
              ) : (
                <span>
                  {trips.length - assignedCount} trip{trips.length - assignedCount !== 1 ? 's' : ''} remaining
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBatchAssign}
                disabled={assigning || assignedCount === 0}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {assigning ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Assigning...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Assign {assignedCount} Trip{assignedCount !== 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
