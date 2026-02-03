import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useGoogleMaps } from '../hooks/useGoogleMaps';
import { X, MapPin, Navigation, Clock, User, Phone, AlertTriangle } from 'lucide-react';

interface Trip {
  id: string;
  pickup_address: string;
  dropoff_address: string;
  pickup_latitude?: number;
  pickup_longitude?: number;
  dropoff_latitude?: number;
  dropoff_longitude?: number;
  status: string;
  scheduled_pickup_time: string;
  driver_id?: string;
  patient?: {
    full_name: string;
    phone: string;
    mobility_needs?: string;
  };
  driver?: {
    id: string;
    full_name: string;
    phone: string;
    current_latitude?: number;
    current_longitude?: number;
  };
}

interface LiveTripTrackingProps {
  tripId: string;
  onClose: () => void;
}

export default function LiveTripTracking({ tripId, onClose }: LiveTripTrackingProps) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [routeInfo, setRouteInfo] = useState<{
    distance: string;
    duration: string;
    durationInTraffic?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const driverMarkerRef = useRef<google.maps.Marker | null>(null);
  const routePolylineRef = useRef<google.maps.Polyline | null>(null);
  const directionsService = useRef<google.maps.DirectionsService | null>(null);
  const { isLoaded } = useGoogleMaps();

  useEffect(() => {
    loadTrip();
    const subscription = supabase
      .channel(`live-trip-${tripId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trips',
          filter: `id=eq.${tripId}`
        },
        () => loadTrip()
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles'
        },
        (payload) => {
          if (trip?.driver_id === payload.new.id) {
            setTrip(prev => {
              if (!prev) return prev;
              return {
                ...prev,
                driver: {
                  ...prev.driver!,
                  current_latitude: payload.new.current_latitude,
                  current_longitude: payload.new.current_longitude
                }
              };
            });
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [tripId]);

  useEffect(() => {
    if (isLoaded && trip && mapRef.current && !googleMapRef.current) {
      initMap();
    }
  }, [isLoaded, trip]);

  useEffect(() => {
    if (googleMapRef.current && trip?.driver?.current_latitude && trip?.driver?.current_longitude) {
      updateDriverMarker(trip.driver.current_latitude, trip.driver.current_longitude);
      calculateRoute();
    }
  }, [trip?.driver?.current_latitude, trip?.driver?.current_longitude]);

  async function loadTrip() {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select(`
          *,
          patient:patients(full_name, phone, mobility_needs),
          driver:profiles!driver_id(id, full_name, phone, current_latitude, current_longitude)
        `)
        .eq('id', tripId)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setTrip(data);
      }
    } catch (error) {
      console.error('Error loading trip:', error);
    } finally {
      setLoading(false);
    }
  }

  function initMap() {
    if (!mapRef.current || !window.google || !trip) return;

    const center = trip.pickup_latitude && trip.pickup_longitude
      ? { lat: trip.pickup_latitude, lng: trip.pickup_longitude }
      : { lat: 34.0522, lng: -118.2437 };

    googleMapRef.current = new google.maps.Map(mapRef.current, {
      zoom: 13,
      center,
      mapTypeId: 'roadmap',
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });

    directionsService.current = new google.maps.DirectionsService();

    if (trip.pickup_latitude && trip.pickup_longitude) {
      new google.maps.Marker({
        position: { lat: trip.pickup_latitude, lng: trip.pickup_longitude },
        map: googleMapRef.current,
        title: 'Pickup Location',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: '#22c55e',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        },
        label: {
          text: 'P',
          color: '#ffffff',
          fontSize: '12px',
          fontWeight: 'bold',
        },
      });
    }

    if (trip.dropoff_latitude && trip.dropoff_longitude) {
      new google.maps.Marker({
        position: { lat: trip.dropoff_latitude, lng: trip.dropoff_longitude },
        map: googleMapRef.current,
        title: 'Dropoff Location',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: '#ef4444',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        },
        label: {
          text: 'D',
          color: '#ffffff',
          fontSize: '12px',
          fontWeight: 'bold',
        },
      });
    }

    if (trip.driver?.current_latitude && trip.driver?.current_longitude) {
      updateDriverMarker(trip.driver.current_latitude, trip.driver.current_longitude);
      calculateRoute();
    }
  }

  function updateDriverMarker(lat: number, lng: number) {
    if (!googleMapRef.current || !window.google) return;

    if (driverMarkerRef.current) {
      driverMarkerRef.current.setPosition({ lat, lng });
    } else {
      driverMarkerRef.current = new google.maps.Marker({
        position: { lat, lng },
        map: googleMapRef.current,
        title: trip?.driver?.full_name || 'Driver',
        icon: {
          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 6,
          fillColor: '#3b82f6',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          rotation: 0,
        },
      });
    }
  }

  async function calculateRoute() {
    if (!directionsService.current || !trip?.driver?.current_latitude || !trip?.driver?.current_longitude) return;

    const destination = trip.status === 'en_route_pickup' || trip.status === 'assigned'
      ? trip.pickup_latitude && trip.pickup_longitude
        ? { lat: trip.pickup_latitude, lng: trip.pickup_longitude }
        : null
      : trip.dropoff_latitude && trip.dropoff_longitude
        ? { lat: trip.dropoff_latitude, lng: trip.dropoff_longitude }
        : null;

    if (!destination) return;

    try {
      const result = await directionsService.current.route({
        origin: { lat: trip.driver.current_latitude, lng: trip.driver.current_longitude },
        destination,
        travelMode: google.maps.TravelMode.DRIVING,
        drivingOptions: {
          departureTime: new Date(),
          trafficModel: google.maps.TrafficModel.BEST_GUESS,
        },
      });

      if (result.routes[0]) {
        const route = result.routes[0];
        const leg = route.legs[0];

        setRouteInfo({
          distance: leg.distance?.text || '',
          duration: leg.duration?.text || '',
          durationInTraffic: leg.duration_in_traffic?.text || leg.duration?.text || '',
        });

        if (routePolylineRef.current) {
          routePolylineRef.current.setMap(null);
        }

        routePolylineRef.current = new google.maps.Polyline({
          path: route.overview_path,
          geodesic: true,
          strokeColor: '#3b82f6',
          strokeOpacity: 0.8,
          strokeWeight: 4,
          map: googleMapRef.current,
        });

        const bounds = new google.maps.LatLngBounds();
        bounds.extend({ lat: trip.driver.current_latitude, lng: trip.driver.current_longitude });
        bounds.extend(destination);
        googleMapRef.current?.fitBounds(bounds, 100);
      }
    } catch (error) {
      console.error('Error calculating route:', error);
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

  if (!trip) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned': return 'bg-yellow-500';
      case 'en_route_pickup': return 'bg-blue-500';
      case 'arrived_pickup': return 'bg-green-500';
      case 'patient_onboard': return 'bg-purple-500';
      case 'en_route_dropoff': return 'bg-indigo-500';
      case 'arrived_dropoff': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex">
      <div className="flex w-full h-full">
        <div className="w-96 bg-white overflow-y-auto flex flex-col">
          <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Live Trip Tracking</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(trip.status)} animate-pulse`}></div>
              <span className="font-medium text-gray-900">{getStatusText(trip.status)}</span>
            </div>

            {trip.patient?.mobility_needs && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Special Requirements</p>
                    <p className="text-sm text-yellow-700">{trip.patient.mobility_needs}</p>
                  </div>
                </div>
              </div>
            )}

            {routeInfo && (
              <div className="bg-blue-50 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-900">Distance</span>
                  <span className="text-lg font-bold text-blue-600">{routeInfo.distance}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-900">ETA</span>
                  <span className="text-lg font-bold text-blue-600">{routeInfo.durationInTraffic}</span>
                </div>
                {routeInfo.durationInTraffic !== routeInfo.duration && (
                  <p className="text-xs text-blue-600">Including current traffic conditions</p>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 p-6 space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{trip.patient?.full_name}</h3>
                  <p className="text-sm text-gray-600">Patient</p>
                </div>
                {trip.patient?.phone && (
                  <a
                    href={`tel:${trip.patient.phone}`}
                    className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                  >
                    <Phone className="w-5 h-5" />
                  </a>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-gray-700">Pickup</span>
                  </div>
                  <p className="text-sm text-gray-900 pl-6">{trip.pickup_address}</p>
                  <div className="flex items-center gap-2 pl-6 mt-1">
                    <Clock className="w-3 h-3 text-gray-500" />
                    <span className="text-xs text-gray-500">
                      {new Date(trip.scheduled_pickup_time).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="w-4 h-4 text-red-600" />
                    <span className="text-sm font-medium text-gray-700">Dropoff</span>
                  </div>
                  <p className="text-sm text-gray-900 pl-6">{trip.dropoff_address}</p>
                </div>
              </div>
            </div>

            {trip.driver && (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <Navigation className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{trip.driver.full_name}</h3>
                    <p className="text-sm text-gray-600">Driver</p>
                  </div>
                  {trip.driver.phone && (
                    <a
                      href={`tel:${trip.driver.phone}`}
                      className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                    >
                      <Phone className="w-5 h-5" />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 relative">
          <div ref={mapRef} className="w-full h-full"></div>
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
