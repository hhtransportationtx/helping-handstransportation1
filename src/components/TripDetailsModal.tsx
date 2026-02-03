import { useEffect, useState, useRef } from 'react';
import { X, MapPin, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useGoogleMaps } from '../hooks/useGoogleMaps';

interface TripDetailsModalProps {
  tripId: string;
  onClose: () => void;
}

export function TripDetailsModal({ tripId, onClose }: TripDetailsModalProps) {
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const { isLoaded: isMapsLoaded } = useGoogleMaps();

  useEffect(() => {
    loadTripDetails();
  }, [tripId]);

  useEffect(() => {
    if (isMapsLoaded && trip && mapRef.current && !mapInstanceRef.current) {
      initializeMap();
    }
  }, [isMapsLoaded, trip]);

  async function loadTripDetails() {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select(`
          *,
          patients(full_name, phone, cell_phone, email, date_of_birth, gender, member_id),
          profiles(id, full_name, phone, photo_url),
          vehicles(vehicle_name, license_plate)
        `)
        .eq('id', tripId)
        .maybeSingle();

      if (error) throw error;
      setTrip(data);
    } catch (error) {
      console.error('Error loading trip details:', error);
    } finally {
      setLoading(false);
    }
  }

  function initializeMap() {
    if (!mapRef.current || !trip) return;

    const map = new google.maps.Map(mapRef.current, {
      zoom: 12,
      center: { lat: 31.7619, lng: -106.4850 },
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });

    mapInstanceRef.current = map;

    const directionsService = new google.maps.DirectionsService();
    const directionsRenderer = new google.maps.DirectionsRenderer({
      map,
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: '#3B82F6',
        strokeWeight: 4,
      },
    });

    if (trip.pickup_address && trip.dropoff_address) {
      directionsService.route(
        {
          origin: trip.pickup_address,
          destination: trip.dropoff_address,
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === 'OK' && result) {
            directionsRenderer.setDirections(result);

            new google.maps.Marker({
              position: result.routes[0].legs[0].start_location,
              map,
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 10,
                fillColor: '#EF4444',
                fillOpacity: 1,
                strokeColor: '#FFFFFF',
                strokeWeight: 2,
              },
            });

            new google.maps.Marker({
              position: result.routes[0].legs[0].end_location,
              map,
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 10,
                fillColor: '#8B5CF6',
                fillOpacity: 1,
                strokeColor: '#FFFFFF',
                strokeWeight: 2,
              },
            });
          }
        }
      );
    }
  }

  function formatDate(dateString: string | null) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatDateOnly(dateString: string | null) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });
  }

  function getStatusColor(status: string) {
    switch (status?.toLowerCase()) {
      case 'unassigned':
        return 'bg-yellow-100 text-yellow-800';
      case 'assigned':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <p className="text-gray-600">Loading trip details...</p>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <p className="text-gray-600">Trip not found</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full h-[90vh] max-w-7xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col p-6 bg-gray-50">
            <div className="mb-4 space-y-2">
              <div className="flex items-start gap-2">
                <MapPin className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{trip.pickup_address}</p>
                  <p className="text-xs text-gray-500">{formatDate(trip.scheduled_pickup_time)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-2">
                <div className="w-0.5 h-6 bg-gray-300"></div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{trip.dropoff_address}</p>
                  <p className="text-xs text-gray-500">{formatDate(trip.scheduled_pickup_time)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg flex-1 border border-gray-200">
              <div className="text-center py-4 text-gray-500 text-sm font-medium">Trip Route</div>
              <div ref={mapRef} className="w-full h-[calc(100%-3rem)] rounded-b-lg"></div>
            </div>
          </div>

          <div className="w-[500px] overflow-y-auto bg-white p-6 border-l border-gray-200">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Trip Information</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Trip ID</span>
                    <span className="text-sm font-medium text-gray-900">{trip.trip_number || trip.id?.slice(0, 12)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Created At</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatDate(trip.created_at)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Trip Status</span>
                    <span
                      className={`text-xs px-2 py-1 rounded font-medium ${
                        trip.status === 'in-progress' ? 'bg-green-100 text-green-800' :
                        trip.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                        getStatusColor(trip.status || 'unassigned')
                      }`}
                    >
                      {trip.status === 'in-progress' ? 'Started' : trip.status || 'Unassigned'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Actual Miles</span>
                    <span className="text-sm font-medium text-gray-900">
                      {trip.distance_miles ? `${trip.distance_miles} mi` : '0 mi'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Funding Source</span>
                    <span className="text-xs px-2 py-1 rounded font-medium bg-black text-white">
                      {trip.funding_source || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Source</span>
                    <span className="text-sm font-medium text-gray-900">
                      {trip.broker_name || ''}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Track ID</span>
                    <span className="text-sm font-medium text-gray-900">
                      {trip.trip_number?.slice(-6) || ''}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Level of Service</span>
                    <span className="text-sm font-medium text-gray-900">
                      {trip.space_type ? (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded font-semibold text-xs">
                          {trip.space_type.toUpperCase()}
                        </span>
                      ) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">IPA Number</span>
                    <span className="text-sm font-medium text-gray-900">
                      {trip.ipa_feca_number || ''}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Rig No.</span>
                    <span className="text-sm font-medium text-gray-900">
                      {trip.vehicles?.vehicle_name || trip.rig_number || ''}
                    </span>
                  </div>
                  {trip.appointment_type && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Appointment Types</span>
                      <span className="text-xs px-2 py-1 rounded-full font-medium bg-blue-100 text-blue-800">
                        {trip.appointment_type.replace('_', ' ')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Special Fare</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">BSR</span>
                    <span className="text-sm font-medium text-gray-900">
                      ${trip.broker_service_rate ? trip.broker_service_rate.toFixed(2) : '0.00'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Driver Information</h3>
                <div className="space-y-3">
                  {trip.profiles ? (
                    <>
                      {trip.profiles.photo_url && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Driver Image</span>
                          <img
                            src={trip.profiles.photo_url}
                            alt={trip.profiles.full_name}
                            className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                          />
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Driver Name</span>
                        <span className="text-sm font-medium text-gray-900 uppercase">
                          {trip.profiles.full_name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Phone Number</span>
                        <span className="text-sm font-medium text-gray-900">
                          {trip.profiles.phone || 'N/A'}
                        </span>
                      </div>
                      {trip.vehicles && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Rig No.</span>
                          <span className="text-sm font-medium text-gray-900 uppercase">
                            {trip.vehicles.vehicle_name || trip.vehicles.license_plate || 'N/A'}
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center justify-center py-4 text-gray-400">
                      <User className="w-8 h-8 mr-2" />
                      <span className="text-sm">No driver assigned</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Passenger Information</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Passenger Name</span>
                    <span className="text-sm font-medium text-gray-900 uppercase">
                      {trip.patients?.full_name?.startsWith('Unknown-')
                        ? `NO NAME (${trip.patients?.member_id || 'NO ID'})`
                        : trip.patients?.full_name || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Phone Number</span>
                    <span className="text-sm font-medium text-gray-900">
                      {trip.patients?.phone || ''}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Insurance ID</span>
                    <span className="text-sm font-medium text-gray-900">
                      {trip.insurance_id || ''}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">DOB</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatDateOnly(trip.patients?.date_of_birth) || ''}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Weight</span>
                    <span className="text-sm font-medium text-gray-900">
                      {trip.patient_weight ? `${trip.patient_weight} lbs` : ''}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Driver Odometer</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Odometer Begin</span>
                    <span className="text-sm font-medium text-gray-900">
                      {trip.odometer_start || ''}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Odometer Start</span>
                    <span className="text-sm font-medium text-gray-900">
                      {trip.odometer_start || ''}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Odometer End</span>
                    <span className="text-sm font-medium text-gray-900">
                      {trip.odometer_end || ''}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Dead Miles</span>
                    <span className="text-sm font-medium text-gray-900">
                      {trip.dead_miles ? `${trip.dead_miles} mi` : '0.00 mi'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Dead Minutes</span>
                    <span className="text-sm font-medium text-gray-900">
                      {trip.dead_minutes ? `${trip.dead_minutes} min` : '0.0 min'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Wait Time</span>
                    <span className="text-sm font-medium text-gray-900">
                      {trip.wait_time ? `${trip.wait_time} min` : '0 min'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Trip Miles</span>
                    <span className="text-sm font-medium text-gray-900">
                      {trip.distance_miles ? `${trip.distance_miles} mi` : '0 mi'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Trip Time</span>
                    <span className="text-sm font-medium text-gray-900">
                      {trip.trip_duration ? `${trip.trip_duration} min` : '0 min'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Trip Miles</span>
                    <span className="text-sm font-medium text-gray-900">
                      {trip.distance_miles ? `${trip.distance_miles.toFixed(2)} mi` : '0.00 mi'}
                    </span>
                  </div>
                </div>
              </div>

              {trip.on_way_time && (
                <div className="pt-6 border-t border-gray-200">
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-900">On Way At:</span>
                        <span className="text-sm text-gray-900">
                          {new Date(trip.on_way_time).toLocaleString('en-US', {
                            month: '2-digit',
                            day: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      {trip.on_way_photo_url && (
                        <img
                          src={trip.on_way_photo_url}
                          alt="On Way"
                          className="w-full h-32 object-cover rounded border border-gray-200"
                        />
                      )}
                    </div>

                    {trip.on_scene_time && (
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm font-semibold text-gray-900">On Scene At:</span>
                          <span className="text-sm text-gray-900">
                            {new Date(trip.on_scene_time).toLocaleString('en-US', {
                              month: '2-digit',
                              day: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        {trip.on_scene_photo_url && (
                          <img
                            src={trip.on_scene_photo_url}
                            alt="On Scene"
                            className="w-full h-32 object-cover rounded border border-gray-200"
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Other Information</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Primary Diagnosis</span>
                    <span className="text-sm font-medium text-gray-900">
                      {trip.primary_diagnosis || ''}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Notes</span>
                    <span className="text-sm font-medium text-gray-900">
                      {trip.notes || ''}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
