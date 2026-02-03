import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Users, Clock, Radio, Zap, TrendingUp, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useGoogleMaps } from '../hooks/useGoogleMaps';

interface Driver {
  id: string;
  full_name: string;
  status: string;
  current_latitude: number | null;
  current_longitude: number | null;
  last_location_update: string | null;
}

interface Trip {
  id: string;
  pickup_address: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  patient_id: string;
  status: string;
  scheduled_pickup_time: string;
  patients: {
    full_name: string;
  };
}

export default function DriverTrackingMap() {
  const { isLoaded } = useGoogleMaps();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [closestDriver, setClosestDriver] = useState<Driver | null>(null);
  const [showTraffic, setShowTraffic] = useState(false);
  const [realTimeEnabled, setRealTimeEnabled] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const trafficLayerRef = useRef<google.maps.TrafficLayer | null>(null);

  useEffect(() => {
    loadDrivers();
    loadPendingTrips();

    const profilesChannel = supabase
      .channel('realtime-driver-locations')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: 'role=eq.driver'
        },
        (payload) => {
          if (realTimeEnabled) {
            setDrivers(prev => {
              const updated = [...prev];
              const index = updated.findIndex(d => d.id === payload.new.id);
              if (index !== -1) {
                updated[index] = {
                  ...updated[index],
                  current_latitude: payload.new.current_latitude,
                  current_longitude: payload.new.current_longitude,
                  last_location_update: payload.new.last_location_update,
                  status: payload.new.status
                };
              }
              return updated;
            });
          }
        }
      )
      .subscribe();

    return () => {
      profilesChannel.unsubscribe();
    };
  }, [realTimeEnabled]);

  useEffect(() => {
    if (isLoaded && mapRef.current && !googleMapRef.current) {
      initMap();
    }
  }, [isLoaded]);

  useEffect(() => {
    if (googleMapRef.current && drivers.length > 0) {
      updateMapMarkers(drivers);
    }
  }, [drivers]);

  const loadDrivers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, status, current_latitude, current_longitude, last_location_update')
      .eq('role', 'driver')
      .eq('status', 'active')
      .not('current_latitude', 'is', null)
      .not('current_longitude', 'is', null);

    if (!error && data) {
      setDrivers(data);
    }
  };

  const loadPendingTrips = async () => {
    const { data, error } = await supabase
      .from('trips')
      .select(`
        *,
        patients (
          full_name
        )
      `)
      .in('status', ['scheduled', 'pending'])
      .not('pickup_lat', 'is', null)
      .not('pickup_lng', 'is', null)
      .order('scheduled_pickup_time', { ascending: true })
      .limit(20);

    if (!error && data) {
      setTrips(data);
    }
  };

  const initMap = () => {
    if (!mapRef.current) {
      console.log('Map initialization skipped - mapRef not available');
      return;
    }

    if (!window.google) {
      console.log('Map initialization skipped - Google Maps not loaded');
      setMapError('Google Maps API is not loaded. Please check your API key configuration.');
      return;
    }

    console.log('Initializing map...');

    const center = drivers.length > 0 && drivers[0].current_latitude && drivers[0].current_longitude
      ? { lat: drivers[0].current_latitude, lng: drivers[0].current_longitude }
      : { lat: 34.0522, lng: -118.2437 };

    try {
      googleMapRef.current = new google.maps.Map(mapRef.current, {
        zoom: 11,
        center,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      });

      console.log('Map initialized successfully');
      setMapError(null);

      trafficLayerRef.current = new google.maps.TrafficLayer();
      if (showTraffic) {
        trafficLayerRef.current.setMap(googleMapRef.current);
      }

      if (drivers.length > 0) {
        updateMapMarkers(drivers);
      }
    } catch (error) {
      console.error('Error initializing map:', error);
      setMapError('Failed to initialize map. Please refresh the page.');
    }
  };

  useEffect(() => {
    if (trafficLayerRef.current && googleMapRef.current) {
      trafficLayerRef.current.setMap(showTraffic ? googleMapRef.current : null);
    }
  }, [showTraffic]);

  const updateMapMarkers = (driverData: Driver[]) => {
    if (!googleMapRef.current || !window.google) return;

    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    driverData.forEach(driver => {
      if (driver.current_latitude && driver.current_longitude) {
        const marker = new google.maps.Marker({
          position: { lat: driver.current_latitude, lng: driver.current_longitude },
          map: googleMapRef.current,
          title: driver.full_name,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#2563eb',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2
          }
        });

        const infoWindow = new google.maps.InfoWindow({
          content: `<div style="padding: 8px;"><strong>${driver.full_name}</strong><br/>Status: ${driver.status}</div>`
        });

        marker.addListener('click', () => {
          infoWindow.open(googleMapRef.current, marker);
        });

        markersRef.current.push(marker);
      }
    });
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 3959;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const findClosestDriver = (trip: Trip) => {
    if (!trip.pickup_lat || !trip.pickup_lng) return null;

    let closest: Driver | null = null;
    let minDistance = Infinity;

    drivers.forEach(driver => {
      if (driver.current_latitude && driver.current_longitude) {
        const distance = calculateDistance(
          trip.pickup_lat!,
          trip.pickup_lng!,
          driver.current_latitude,
          driver.current_longitude
        );

        if (distance < minDistance) {
          minDistance = distance;
          closest = driver;
        }
      }
    });

    return { driver: closest, distance: minDistance };
  };

  const assignClosestDriver = async (trip: Trip) => {
    const result = findClosestDriver(trip);
    if (result && result.driver) {
      setClosestDriver(result.driver);
      setSelectedTrip(trip);

      const { error } = await supabase
        .from('trips')
        .update({
          driver_id: result.driver.id,
          status: 'assigned'
        })
        .eq('id', trip.id);

      if (!error) {
        alert(`Assigned ${result.driver.full_name} to trip (${result.distance.toFixed(1)} miles away)`);
        loadPendingTrips();
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Driver Tracking & Dispatch</h1>
              <p className="text-gray-600">Real-time driver locations and automated dispatch</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  loadDrivers();
                  loadPendingTrips();
                }}
                className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 transition-all"
              >
                <Radio className="w-5 h-5" />
                Refresh
              </button>
              <button
                onClick={() => setShowTraffic(!showTraffic)}
                className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all ${
                  showTraffic
                    ? 'bg-orange-600 text-white shadow-lg'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                <TrendingUp className="w-5 h-5" />
                Traffic {showTraffic ? 'ON' : 'OFF'}
              </button>
              <button
                onClick={() => setRealTimeEnabled(!realTimeEnabled)}
                className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all ${
                  realTimeEnabled
                    ? 'bg-green-600 text-white shadow-lg'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {realTimeEnabled ? (
                  <>
                    <Zap className="w-5 h-5 animate-pulse" />
                    Live Updates
                  </>
                ) : (
                  <>
                    <Radio className="w-5 h-5" />
                    Manual Refresh
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="p-4 bg-gray-50 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  <h2 className="font-semibold text-gray-900">Live Driver Map</h2>
                  {realTimeEnabled && (
                    <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                      <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
                      Real-time
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users className="w-4 h-4" />
                  {drivers.length} Active Drivers
                </div>
              </div>
              <div className="relative w-full h-[600px]">
                <div ref={mapRef} className="w-full h-full"></div>
                {!isLoaded && !mapError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <div className="text-center">
                      <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2 animate-pulse" />
                      <p className="text-gray-500">Loading map...</p>
                      <p className="text-xs text-gray-400 mt-2">
                        Initializing Google Maps
                      </p>
                    </div>
                  </div>
                )}
                {mapError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-red-50">
                    <div className="text-center max-w-md p-6">
                      <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                      <p className="text-red-800 font-semibold mb-2">Map Error</p>
                      <p className="text-red-600 text-sm mb-4">{mapError}</p>
                      <button
                        onClick={() => {
                          setMapError(null);
                          window.location.reload();
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                      >
                        Reload Page
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Navigation className="w-5 h-5 text-blue-600" />
                <h2 className="font-semibold text-gray-900">Pending Trips</h2>
              </div>

              {drivers.length === 0 && (
                <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-semibold text-orange-900 mb-1">No Drivers with GPS</p>
                      <p className="text-orange-700">
                        Drivers need to open the Mobile Driver App and allow location permissions to appear on the map.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3 max-h-[560px] overflow-y-auto">
                {trips.map((trip) => {
                  const result = findClosestDriver(trip);
                  return (
                    <div key={trip.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-all">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-medium text-gray-900">{trip.patients.full_name}</h3>
                          <p className="text-sm text-gray-600 mt-1">{trip.pickup_address}</p>
                        </div>
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                          {trip.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                        <Clock className="w-3 h-3" />
                        {new Date(trip.scheduled_pickup_time).toLocaleString()}
                      </div>

                      {result && result.driver && (
                        <div className="bg-blue-50 rounded p-2 mb-2 text-sm">
                          <div className="font-medium text-blue-900">Closest Driver:</div>
                          <div className="text-blue-700">{result.driver.full_name}</div>
                          <div className="text-blue-600 text-xs">{result.distance.toFixed(1)} miles away</div>
                        </div>
                      )}

                      <button
                        onClick={() => assignClosestDriver(trip)}
                        disabled={!result || !result.driver}
                        className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                      >
                        Auto-Assign Driver
                      </button>
                    </div>
                  );
                })}

                {trips.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Navigation className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No pending trips</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
