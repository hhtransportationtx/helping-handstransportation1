import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, MapPin, User, Search, Navigation } from 'lucide-react';
import { useGoogleMaps } from '../hooks/useGoogleMaps';
import { calculateDistance } from '../lib/distanceUtils';

interface Driver {
  id: string;
  full_name: string;
  phone: string;
  photo_url?: string;
  current_latitude?: number;
  current_longitude?: number;
  last_location_update?: string;
  vehicle_registration?: string;
  distance?: number;
  status?: string;
  assigned_vehicle?: {
    vehicle_name?: string;
    rig_no?: string;
    model?: string;
    make?: string;
  };
}

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

interface ClosestDriverAssignmentProps {
  trip: Trip;
  onClose: () => void;
  onAssign: (driverId: string) => void;
}

export default function ClosestDriverAssignment({ trip, onClose, onAssign }: ClosestDriverAssignmentProps) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [filteredDrivers, setFilteredDrivers] = useState<Driver[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [assigning, setAssigning] = useState(false);
  const { isLoaded } = useGoogleMaps();
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);

  useEffect(() => {
    loadDrivers();
    geocodeAddresses();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      setFilteredDrivers(
        drivers.filter(d =>
          d.full_name.toLowerCase().includes(query) ||
          d.vehicle_registration?.toLowerCase().includes(query)
        )
      );
    } else {
      setFilteredDrivers(drivers);
    }
  }, [searchQuery, drivers]);

  useEffect(() => {
    if (isLoaded && trip.pickup_latitude && trip.pickup_longitude) {
      initializeMap();
    }
  }, [isLoaded, trip.pickup_latitude, trip.pickup_longitude, drivers]);

  async function geocodeAddresses() {
    if (!isLoaded) return;

    const geocoder = new google.maps.Geocoder();

    if (!trip.pickup_latitude && trip.pickup_address) {
      try {
        const result = await geocoder.geocode({ address: trip.pickup_address });
        if (result.results[0]) {
          const location = result.results[0].geometry.location;
          await supabase
            .from('trips')
            .update({
              pickup_latitude: location.lat(),
              pickup_longitude: location.lng()
            })
            .eq('id', trip.id);
        }
      } catch (error) {
        console.error('Error geocoding pickup:', error);
      }
    }

    if (!trip.dropoff_latitude && trip.dropoff_address) {
      try {
        const result = await geocoder.geocode({ address: trip.dropoff_address });
        if (result.results[0]) {
          const location = result.results[0].geometry.location;
          await supabase
            .from('trips')
            .update({
              dropoff_latitude: location.lat(),
              dropoff_longitude: location.lng()
            })
            .eq('id', trip.id);
        }
      } catch (error) {
        console.error('Error geocoding dropoff:', error);
      }
    }
  }

  async function loadDrivers() {
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, phone, photo_url, current_latitude, current_longitude, last_location_update, vehicle_registration, status')
        .eq('role', 'driver');

      if (error) throw error;

      const { data: assignments } = await supabase
        .from('vehicle_assignments')
        .select(`
          driver_id,
          vehicle:vehicles(vehicle_name, rig_no, model, make)
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

      if (data && trip.pickup_latitude && trip.pickup_longitude) {
        const driversWithDistance = data.map(driver => ({
          ...driver,
          assigned_vehicle: assignmentMap.get(driver.id),
          distance: driver.current_latitude && driver.current_longitude
            ? calculateDistance(
                trip.pickup_latitude!,
                trip.pickup_longitude!,
                driver.current_latitude,
                driver.current_longitude
              )
            : 999999
        }));

        driversWithDistance.sort((a, b) => (a.distance || 0) - (b.distance || 0));
        setDrivers(driversWithDistance);
        setFilteredDrivers(driversWithDistance);
      } else {
        const driversWithVehicles = (data || []).map(driver => ({
          ...driver,
          assigned_vehicle: assignmentMap.get(driver.id)
        }));
        setDrivers(driversWithVehicles);
        setFilteredDrivers(driversWithVehicles);
      }
    } catch (error) {
      console.error('Error loading drivers:', error);
    } finally {
      setLoading(false);
    }
  }

  function initializeMap() {
    if (!isLoaded || !trip.pickup_latitude || !trip.pickup_longitude) return;

    const mapElement = document.getElementById('assignment-map');
    if (!mapElement) return;

    const mapInstance = new google.maps.Map(mapElement, {
      center: { lat: trip.pickup_latitude, lng: trip.pickup_longitude },
      zoom: 12,
      mapTypeControl: false,
      fullscreenControl: false,
      streetViewControl: false,
    });

    setMap(mapInstance);

    const newMarkers: google.maps.Marker[] = [];

    const pickupMarker = new google.maps.Marker({
      position: { lat: trip.pickup_latitude, lng: trip.pickup_longitude },
      map: mapInstance,
      title: 'Pickup Location',
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#22c55e',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
      },
    });
    newMarkers.push(pickupMarker);

    if (trip.dropoff_latitude && trip.dropoff_longitude) {
      const dropoffMarker = new google.maps.Marker({
        position: { lat: trip.dropoff_latitude, lng: trip.dropoff_longitude },
        map: mapInstance,
        title: 'Dropoff Location',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#ef4444',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });
      newMarkers.push(dropoffMarker);
    }

    drivers.forEach((driver) => {
      if (driver.current_latitude && driver.current_longitude) {
        const driverMarker = new google.maps.Marker({
          position: { lat: driver.current_latitude, lng: driver.current_longitude },
          map: mapInstance,
          title: driver.full_name,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#3b82f6',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
        });

        driverMarker.addListener('click', () => {
          setSelectedDriver(driver);
        });

        newMarkers.push(driverMarker);
      }
    });

    setMarkers(newMarkers);
  }

  async function handleAssign() {
    if (!selectedDriver) return;

    setAssigning(true);
    try {
      await onAssign(selectedDriver.id);
      onClose();
    } catch (error) {
      console.error('Error assigning driver:', error);
      alert('Failed to assign driver');
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex z-50">
      <div className="flex w-full h-full">
        <div className="w-1/3 bg-white overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 p-4 z-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Assign Trip</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <p className="font-medium text-gray-900">Pickup</p>
                  <p className="text-gray-600">{trip.pickup_address}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(trip.scheduled_pickup_time).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-red-600 flex-shrink-0 mt-1" />
                <div>
                  <p className="font-medium text-gray-900">Dropoff</p>
                  <p className="text-gray-600">{trip.dropoff_address}</p>
                </div>
              </div>

              {trip.patient && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="font-medium text-gray-900">{trip.patient.full_name}</p>
                  {trip.patient.mobility_needs && (
                    <p className="text-xs text-gray-600 mt-1">{trip.patient.mobility_needs}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="p-4">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Drivers</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search drivers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              {filteredDrivers.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No drivers available</p>
                </div>
              ) : (
                filteredDrivers.map((driver) => (
                  <div
                    key={driver.id}
                    onClick={() => setSelectedDriver(driver)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition ${
                      selectedDriver?.id === driver.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="relative">
                        {driver.photo_url ? (
                          <img
                            src={driver.photo_url}
                            alt={driver.full_name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                            <User className="w-6 h-6 text-gray-500" />
                          </div>
                        )}
                        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                          driver.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                        }`} title={driver.status === 'active' ? 'Online' : 'Offline'} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900">{driver.full_name}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            driver.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {driver.status === 'active' ? 'Online' : 'Offline'}
                          </span>
                        </div>
                        {driver.assigned_vehicle ? (
                          <div className="mt-1 space-y-0.5">
                            <p className="text-xs font-medium text-blue-600">
                              🚗 {driver.assigned_vehicle.vehicle_name || driver.assigned_vehicle.rig_no}
                            </p>
                            {driver.assigned_vehicle.make && driver.assigned_vehicle.model && (
                              <p className="text-xs text-gray-600">
                                {driver.assigned_vehicle.make} {driver.assigned_vehicle.model}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500 mt-1">No vehicle assigned</p>
                        )}
                      </div>
                      {driver.distance !== undefined && driver.distance !== 999999 && (
                        <div className="text-right">
                          <p className="text-sm font-medium text-blue-600">
                            {driver.distance.toFixed(2)} mi
                          </p>
                          <p className="text-xs text-gray-500">(Google Miles)</p>
                        </div>
                      )}
                    </div>
                    {driver.last_location_update && (
                      <p className="text-xs text-gray-500 mt-2">
                        📍 Location updated {new Date(driver.last_location_update).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

            {selectedDriver && (
              <button
                onClick={handleAssign}
                disabled={assigning}
                className="w-full mt-4 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {assigning ? 'Assigning...' : 'Assign'}
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 relative">
          <div id="assignment-map" className="w-full h-full"></div>
          {!isLoaded && (
            <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading map...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
