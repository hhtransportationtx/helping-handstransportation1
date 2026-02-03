import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Home,
  MapPin,
  Phone,
  Clock,
  User,
  FileText,
  Camera,
  Radio,
  AlertCircle,
  ArrowLeft,
  Send,
  LogOut,
  Settings,
  Calendar,
  Car,
  DollarSign,
  BookOpen,
  History,
  Users,
  Navigation as NavIcon,
  CheckCircle,
  XCircle,
  TrendingUp,
  Package,
  Volume2
} from 'lucide-react';
import SignatureCapture from './SignatureCapture';
import PhotoUpload from './PhotoUpload';
import MileageTracker from './MileageTracker';
import { DriverVoiceMessages } from './DriverVoiceMessages';
import { playUrgentAlertSound, showBrowserNotification, requestNotificationPermission } from '../lib/notificationSound';
import { openInMaps } from '../lib/mapLinks';
import DriverOnboarding from './DriverOnboarding';

interface Trip {
  id: string;
  patient_id: string;
  pickup_location: string;
  dropoff_location: string;
  pickup_latitude?: number;
  pickup_longitude?: number;
  dropoff_latitude?: number;
  dropoff_longitude?: number;
  pickup_time: string;
  status: string;
  trip_type: string;
  special_needs: string;
  driver_notes: string;
  pickup_difference?: number;
  dropoff_difference?: number;
  onboard_violation?: boolean;
  distance_violation?: boolean;
  pre_distance?: number;
  new_distance?: number;
  distance_difference?: number;
  trip_fare?: number;
  forwarded_to?: string;
  forwarded_at?: string;
  patients: {
    first_name: string;
    last_name: string;
    phone: string;
    medical_id: string;
    mobility_requirements: string;
  };
  vehicles: {
    vehicle_number: string;
    type: string;
    make?: string;
    model?: string;
  };
}

type ViewType = 'menu' | 'assigned' | 'assists' | 'history' | 'expenses' | 'settings' | 'material' | 'detail' | 'forward' | 'signature' | 'photo' | 'mileage' | 'walkie';

export default function MobileDriverApp() {
  const { user, profile } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewType>('menu');
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [calling, setCalling] = useState(false);
  const [shiftStart] = useState(new Date());
  const [forwardingType, setForwardingType] = useState<'marketplace' | 'farmout' | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const isInitialLoad = useRef(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  useEffect(() => {
    if (user) {
      requestNotificationPermission();
      checkOnboardingStatus();
    }
  }, [user]);

  async function checkOnboardingStatus() {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('onboarding_completed, background_check_status')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data && !data.onboarding_completed) {
        setNeedsOnboarding(true);
      } else {
        setNeedsOnboarding(false);
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    } finally {
      setCheckingOnboarding(false);
    }
  }

  useEffect(() => {
    if (!user) return;

    const notificationChannel = supabase
      .channel('driver-mobile-notifications')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trips',
        },
        (payload) => {
          const newTrip = payload.new as any;
          const oldTrip = payload.old as any;

          if (newTrip.driver_id === user.id && newTrip.status === 'assigned' && oldTrip.status !== 'assigned') {
            if (soundEnabled && !isInitialLoad.current) {
              playUrgentAlertSound();
              showBrowserNotification(
                '🚗 New Trip Assigned!',
                `Pickup: ${newTrip.pickup_location || 'See details'}`,
                { requireInteraction: true }
              );
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trips',
        },
        (payload) => {
          const newTrip = payload.new as any;

          if (newTrip.driver_id === user.id) {
            if (soundEnabled && !isInitialLoad.current) {
              playUrgentAlertSound();
              showBrowserNotification(
                '🚗 New Trip Assigned!',
                `Pickup: ${newTrip.pickup_location || 'See details'}`,
                { requireInteraction: true }
              );
            }
          }
        }
      )
      .subscribe();

    return () => {
      notificationChannel.unsubscribe();
    };
  }, [user, soundEnabled]);

  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
    }
  }, [trips]);

  useEffect(() => {
    loadTrips();
    const subscription = supabase
      .channel('driver_trips')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, loadTrips)
      .subscribe();

    let locationInterval: NodeJS.Timeout | null = null;

    if ('geolocation' in navigator) {
      const updateLocation = async () => {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (!session) {
                console.error('No session available for location update');
                return;
              }

              const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-driver-location`;
              const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${session.access_token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                  accuracy: position.coords.accuracy,
                  speed: position.coords.speed,
                  heading: position.coords.heading
                })
              });

              if (!response.ok) {
                const errorData = await response.json();
                console.error('Failed to update location:', errorData);
              } else {
                console.log('Location updated successfully');
              }
            } catch (error) {
              console.error('Failed to update location:', error);
            }
          },
          (error) => {
            console.error('Location error:', error.message);
            if (error.code === 1) {
              console.log('Location permission denied. Please enable location access.');
            }
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      };

      updateLocation();
      locationInterval = setInterval(updateLocation, 60000);
    } else {
      console.warn('Geolocation is not supported by this browser');
    }

    return () => {
      subscription.unsubscribe();
      if (locationInterval) {
        clearInterval(locationInterval);
      }
    };
  }, [user]);

  async function loadTrips() {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select(`
          *,
          patients (first_name, last_name, phone, medical_id, mobility_requirements),
          vehicles (vehicle_number, type, make, model)
        `)
        .eq('driver_id', user?.id)
        .in('status', ['scheduled', 'assigned', 'en_route_pickup', 'arrived_pickup', 'patient_onboard', 'en_route_dropoff', 'arrived_dropoff'])
        .order('scheduled_pickup_time', { ascending: true });

      if (error) throw error;
      setTrips(data || []);
    } catch (error) {
      console.error('Error loading trips:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateTripStatus(tripId: string, newStatus: string) {
    setStatusUpdating(true);
    try {
      const updates: any = { status: newStatus };
      const now = new Date().toISOString();

      if (newStatus === 'en_route_pickup') {
        updates.on_way_time = now;
      } else if (newStatus === 'arrived_pickup') {
        updates.on_scene_time = now;
      } else if (newStatus === 'patient_onboard') {
        updates.member_onboard_time = now;
      } else if (newStatus === 'completed') {
        updates.actual_dropoff_time = now;
        updates.finished_time = now;
      }

      const { error } = await supabase
        .from('trips')
        .update(updates)
        .eq('id', tripId);

      if (error) throw error;

      await loadTrips();
      if (selectedTrip?.id === tripId) {
        const updatedTrip = trips.find(t => t.id === tripId);
        if (updatedTrip) {
          setSelectedTrip({ ...updatedTrip, status: newStatus });
        }
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    } finally {
      setStatusUpdating(false);
    }
  }

  async function forwardTrip(tripId: string, destination: 'marketplace' | 'farmout') {
    setStatusUpdating(true);
    try {
      const { error } = await supabase
        .from('trips')
        .update({
          forwarded_to: destination,
          forwarded_at: new Date().toISOString(),
          status: 'forwarded'
        })
        .eq('id', tripId);

      if (error) throw error;

      if (destination === 'farmout') {
        await supabase.from('farmout_trips').insert({
          trip_id: tripId,
          status: 'processing'
        });
      }

      alert(`Trip forwarded to ${destination === 'marketplace' ? 'Marketplace' : 'Farmout Drivers'} successfully`);
      await loadTrips();
      setView('assigned');
    } catch (error) {
      console.error('Error forwarding trip:', error);
      alert('Failed to forward trip');
    } finally {
      setStatusUpdating(false);
    }
  }

  async function saveDriverNotes(tripId: string, notes: string) {
    try {
      const { error } = await supabase
        .from('trips')
        .update({ driver_notes: notes })
        .eq('id', tripId);

      if (error) throw error;
      alert('Notes saved successfully');
    } catch (error) {
      console.error('Error saving notes:', error);
      alert('Failed to save notes');
    }
  }

  async function initiateCallToMember(memberPhone: string, tripId: string) {
    setCalling(true);
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', user?.id)
        .maybeSingle();

      if (profileError || !profileData?.phone) {
        alert('Your phone number is not set in your profile. Please contact dispatch.');
        return;
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/masked-call`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          driverPhone: profileData.phone,
          memberPhone: memberPhone,
          tripId: tripId
        })
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.error === 'Twilio not configured') {
          alert('Masked calling is not configured. You can call the member directly using the regular call button.');
        } else {
          throw new Error(result.error || 'Failed to initiate call');
        }
        return;
      }

      alert('Call initiated! You will receive a call shortly that will connect you to the member.');
    } catch (error) {
      console.error('Error initiating call:', error);
      alert('Failed to initiate call. You can use the regular call button to call directly.');
    } finally {
      setCalling(false);
    }
  }

  function openNavigation(address: string, latitude?: number, longitude?: number) {
    openInMaps(address, latitude, longitude);
  }

  const getShiftDuration = () => {
    const now = new Date();
    const diff = now.getTime() - shiftStart.getTime();
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  if (loading || checkingOnboarding) {
    return (
      <div className="min-h-screen bg-pink-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (needsOnboarding && user) {
    return (
      <DriverOnboarding
        userId={user.id}
        onComplete={() => {
          setNeedsOnboarding(false);
          checkOnboardingStatus();
        }}
      />
    );
  }

  if (view === 'walkie') {
    return <DriverVoiceMessages onBack={() => setView('menu')} />;
  }

  if (view === 'signature' && selectedTrip) {
    return (
      <SignatureCapture
        tripId={selectedTrip.id}
        onComplete={async () => {
          await loadTrips();
          setSelectedTrip(null);
          setView('menu');
        }}
        onCancel={() => setView('detail')}
      />
    );
  }

  if (view === 'photo' && selectedTrip) {
    return (
      <PhotoUpload
        tripId={selectedTrip.id}
        onComplete={() => {
          setView('detail');
          alert('Photo uploaded successfully');
        }}
        onCancel={() => setView('detail')}
      />
    );
  }

  if (view === 'mileage' && selectedTrip) {
    return (
      <MileageTracker
        tripId={selectedTrip.id}
        vehicleId={selectedTrip.vehicles?.vehicle_number || ''}
        onComplete={() => {
          setView('detail');
          alert('Mileage recorded successfully');
        }}
        onCancel={() => setView('detail')}
      />
    );
  }

  if (view === 'forward' && selectedTrip) {
    return (
      <div className="min-h-screen bg-pink-50">
        <div className="bg-gradient-to-r from-pink-500 to-red-500 text-white p-4 sticky top-0 z-10 shadow-lg">
          <button
            onClick={() => setView('detail')}
            className="flex items-center text-pink-100 hover:text-white mb-3"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            <span className="font-medium">Back</span>
          </button>
          <h1 className="text-xl font-bold mb-2">Forward Trip</h1>
          {selectedTrip.trip_fare && (
            <div className="bg-white/20 rounded-lg p-3 text-center">
              <span className="text-pink-100 text-sm">Trip Fare: </span>
              <span className="text-2xl font-bold text-white">${selectedTrip.trip_fare.toFixed(2)}</span>
            </div>
          )}
        </div>

        <div className="p-4 space-y-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {selectedTrip.patients?.first_name} {selectedTrip.patients?.last_name}
                  </h3>
                  <p className="text-sm text-gray-500">Reg: {selectedTrip.patients?.medical_id}</p>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                1.87 miles away
              </div>
            </div>

            <div className="flex gap-2 mb-4">
              {selectedTrip.patients?.mobility_requirements?.includes('wheelchair') && (
                <span className="px-2 py-1 bg-blue-500 text-white text-xs rounded">WAV (WAV)</span>
              )}
              <span className="px-2 py-1 bg-red-500 text-white text-xs rounded">N/A</span>
              <button className="ml-auto text-blue-600 text-sm font-medium">
                See Manifest
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
              <div>
                <p className="text-gray-500">Pickup Difference</p>
                <p className="text-gray-900 font-medium">{selectedTrip.pickup_difference || 0} min</p>
              </div>
              <div>
                <p className="text-gray-500">Dropoff Difference</p>
                <p className="text-gray-900 font-medium">{selectedTrip.dropoff_difference || 0} min</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
              <div>
                <p className="text-gray-500">Onboard Violation</p>
                <p className={`font-medium ${selectedTrip.onboard_violation ? 'text-red-600' : 'text-green-600'}`}>
                  {selectedTrip.onboard_violation ? 'Yes' : 'No'}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Distance Violation</p>
                <p className={`font-medium ${selectedTrip.distance_violation ? 'text-red-600' : 'text-green-600'}`}>
                  {selectedTrip.distance_violation ? 'Yes' : 'No'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
              <div>
                <p className="text-gray-500">Pre Dist.</p>
                <p className="text-gray-900 font-medium">{selectedTrip.pre_distance?.toFixed(2) || '0.00'}</p>
              </div>
              <div>
                <p className="text-gray-500">New Dist.</p>
                <p className="text-gray-900 font-medium">{selectedTrip.new_distance?.toFixed(2) || '0.00'}</p>
              </div>
              <div>
                <p className="text-gray-500">Dist. Difference</p>
                <p className="text-gray-900 font-medium">{selectedTrip.distance_difference?.toFixed(2) || '0.00'}</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => forwardTrip(selectedTrip.id, 'marketplace')}
            disabled={statusUpdating}
            className="w-full bg-gradient-to-r from-pink-500 to-red-500 text-white py-4 rounded-lg font-semibold disabled:opacity-50 shadow-md"
          >
            Forward to Marketplace
          </button>

          <button
            onClick={() => forwardTrip(selectedTrip.id, 'farmout')}
            disabled={statusUpdating}
            className="w-full bg-white text-white py-4 rounded-lg font-semibold disabled:opacity-50"
          >
            Forward to Farmout Drivers
          </button>
        </div>
      </div>
    );
  }

  if (view === 'detail' && selectedTrip) {
    return (
      <div className="min-h-screen bg-pink-50">
        <div className="bg-gradient-to-r from-pink-500 to-red-500 text-white p-4 sticky top-0 z-10 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setView('assigned')}
              className="flex items-center text-pink-100 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              <span className="font-medium">Back</span>
            </button>
          </div>
          <div>
            <h1 className="text-xl font-bold mb-1">Trip Details</h1>
            <div className="flex items-center">
              <div className={`w-2 h-2 rounded-full ${selectedTrip.status === 'assigned' ? 'bg-yellow-300' : 'bg-green-300'} mr-2`}></div>
              <span className="text-sm text-pink-100">{selectedTrip.status.replace('_', ' ').toUpperCase()}</span>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {selectedTrip.patients?.first_name} {selectedTrip.patients?.last_name}
                </h2>
                <p className="text-sm text-gray-600">ID: {selectedTrip.patients?.medical_id}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => initiateCallToMember(selectedTrip.patients?.phone, selectedTrip.id)}
                  disabled={calling}
                  className="bg-gradient-to-r from-pink-500 to-red-500 text-white p-3 rounded-full disabled:opacity-50 shadow-md"
                  title="Masked call"
                >
                  <Phone className="w-5 h-5" />
                </button>
              </div>
            </div>

            {selectedTrip.patients?.mobility_requirements && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-4">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Special Requirements</p>
                    <p className="text-sm text-yellow-700">{selectedTrip.patients.mobility_requirements}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Pickup Location</p>
                <div className="flex items-start justify-between">
                  <p className="text-sm text-gray-900 flex-1">{selectedTrip.pickup_location}</p>
                  <button
                    onClick={() => openNavigation(selectedTrip.pickup_location, selectedTrip.pickup_latitude, selectedTrip.pickup_longitude)}
                    className="ml-2 bg-gradient-to-r from-pink-500 to-red-500 text-white p-2 rounded-lg hover:opacity-90 transition-opacity shadow-md"
                    title="Open in Maps"
                  >
                    <NavIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Dropoff Location</p>
                <div className="flex items-start justify-between">
                  <p className="text-sm text-gray-900 flex-1">{selectedTrip.dropoff_location}</p>
                  <button
                    onClick={() => openNavigation(selectedTrip.dropoff_location, selectedTrip.dropoff_latitude, selectedTrip.dropoff_longitude)}
                    className="ml-2 bg-gradient-to-r from-pink-500 to-red-500 text-white p-2 rounded-lg hover:opacity-90 transition-opacity shadow-md"
                    title="Open in Maps"
                  >
                    <NavIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Pickup Time</p>
                <div className="flex items-center text-sm text-gray-900">
                  <Clock className="w-4 h-4 mr-2" />
                  {new Date(selectedTrip.pickup_time).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setView('photo')}
              className="bg-white border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-medium flex flex-col items-center justify-center"
            >
              <Camera className="w-5 h-5 mb-1" />
              <span className="text-xs">Photo</span>
            </button>
            <button
              onClick={() => setView('mileage')}
              className="bg-white border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-medium flex flex-col items-center justify-center"
            >
              <TrendingUp className="w-5 h-5 mb-1" />
              <span className="text-xs">Mileage</span>
            </button>
            <button
              onClick={() => setView('walkie')}
              className="bg-white border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-medium flex flex-col items-center justify-center"
            >
              <Radio className="w-5 h-5 mb-1" />
              <span className="text-xs">Radio</span>
            </button>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Trip Status</h3>
            <div className="space-y-2">
              {selectedTrip.status === 'assigned' && (
                <button
                  onClick={() => updateTripStatus(selectedTrip.id, 'en_route_pickup')}
                  disabled={statusUpdating}
                  className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold flex items-center justify-center disabled:opacity-50"
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  En Route to Pickup
                </button>
              )}

              {selectedTrip.status === 'en_route_pickup' && (
                <button
                  onClick={() => updateTripStatus(selectedTrip.id, 'arrived_pickup')}
                  disabled={statusUpdating}
                  className="w-full bg-gradient-to-r from-pink-500 to-red-500 text-white py-3 rounded-lg font-semibold flex items-center justify-center disabled:opacity-50 shadow-md"
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Arrived at Pickup
                </button>
              )}

              {selectedTrip.status === 'arrived_pickup' && (
                <button
                  onClick={() => updateTripStatus(selectedTrip.id, 'patient_onboard')}
                  disabled={statusUpdating}
                  className="w-full bg-gradient-to-r from-pink-500 to-red-500 text-white py-3 rounded-lg font-semibold flex items-center justify-center disabled:opacity-50 shadow-md"
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Patient Onboard
                </button>
              )}

              {selectedTrip.status === 'patient_onboard' && (
                <button
                  onClick={() => updateTripStatus(selectedTrip.id, 'en_route_dropoff')}
                  disabled={statusUpdating}
                  className="w-full bg-gradient-to-r from-pink-500 to-red-500 text-white py-3 rounded-lg font-semibold flex items-center justify-center disabled:opacity-50 shadow-md"
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  En Route to Dropoff
                </button>
              )}

              {selectedTrip.status === 'en_route_dropoff' && (
                <button
                  onClick={() => updateTripStatus(selectedTrip.id, 'arrived_dropoff')}
                  disabled={statusUpdating}
                  className="w-full bg-gradient-to-r from-pink-500 to-red-500 text-white py-3 rounded-lg font-semibold flex items-center justify-center disabled:opacity-50 shadow-md"
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Arrived at Dropoff
                </button>
              )}

              {selectedTrip.status === 'arrived_dropoff' && (
                <button
                  onClick={() => setView('signature')}
                  className="w-full bg-white text-white py-3 rounded-lg font-semibold flex items-center justify-center"
                >
                  <FileText className="w-5 h-5 mr-2" />
                  Capture Signature & Complete
                </button>
              )}
            </div>
          </div>

          <button
            onClick={() => setView('forward')}
            className="w-full bg-gradient-to-r from-pink-500 to-red-500 text-white py-4 rounded-lg font-semibold flex items-center justify-center shadow-md"
          >
            <Send className="w-5 h-5 mr-2" />
            Forward Trip
          </button>

          <div className="bg-white rounded-lg shadow p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Driver Notes
            </label>
            <textarea
              value={selectedTrip.driver_notes || ''}
              onChange={(e) => setSelectedTrip({ ...selectedTrip, driver_notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={4}
              placeholder="Add any notes about this trip..."
            />
            <button
              onClick={() => saveDriverNotes(selectedTrip.id, selectedTrip.driver_notes)}
              className="mt-2 w-full bg-blue-600 text-white py-2 rounded-lg font-medium"
            >
              Save Notes
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'menu') {
    return (
      <div className="min-h-screen bg-pink-50">
        <div className="bg-gradient-to-br from-pink-500 via-pink-600 to-red-500 p-6 shadow-lg">
          <div className="flex flex-col items-center mb-6">
            {profile?.photo_url ? (
              <img
                src={profile.photo_url}
                alt={profile.full_name}
                className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg mb-3"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center border-4 border-white shadow-lg mb-3">
                <User className="w-10 h-10 text-pink-600" />
              </div>
            )}
            <h2 className="text-2xl font-bold text-white">{profile?.full_name}</h2>
            <p className="text-sm text-pink-100">Today's Shift: 00:00 - 23:59</p>
          </div>

          {trips.length > 0 && trips[0].vehicles && (
            <div className="bg-white/95 rounded-lg p-4 flex items-center gap-3 mb-4 shadow-md">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Car className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {trips[0].vehicles.make} {trips[0].vehicles.model}
                </p>
                <p className="text-xs text-gray-500">{trips[0].vehicles.vehicle_number}</p>
              </div>
            </div>
          )}

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`w-full rounded-lg p-4 flex items-center justify-between transition shadow-md ${
              soundEnabled
                ? 'bg-green-500 border-2 border-green-400'
                : 'bg-white/95 border-2 border-white/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <Volume2 className={`w-6 h-6 ${soundEnabled ? 'text-white' : 'text-gray-500'}`} />
              <div className="text-left">
                <p className={`font-semibold ${soundEnabled ? 'text-white' : 'text-gray-700'}`}>
                  Trip Notifications
                </p>
                <p className={`text-sm ${soundEnabled ? 'text-green-50' : 'text-gray-500'}`}>
                  {soundEnabled ? 'Sound ON' : 'Sound OFF'}
                </p>
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-bold ${
              soundEnabled ? 'bg-white text-green-600' : 'bg-gray-300 text-gray-600'
            }`}>
              {soundEnabled ? 'ON' : 'OFF'}
            </div>
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <button
              onClick={() => setView('menu')}
              className="w-full bg-white rounded-lg shadow p-3 flex items-center justify-between hover:bg-pink-50 transition"
            >
              <div className="flex items-center gap-2.5">
                <Home className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">HOME</span>
              </div>
            </button>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2 px-2">TRIPS</p>
            <div className="space-y-2">
              <button
                onClick={() => setView('assigned')}
                className="w-full bg-white rounded-lg shadow p-3 flex items-center justify-between hover:bg-pink-50 transition"
              >
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">ASSIGNED</span>
                </div>
                {trips.length > 0 && (
                  <span className="bg-gradient-to-r from-pink-500 to-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-md">
                    {trips.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setView('assists')}
                className="w-full bg-white rounded-lg shadow p-3 flex items-center justify-between hover:bg-pink-50 transition"
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">ASSISTS</span>
                </div>
              </button>
              <button
                onClick={() => setView('history')}
                className="w-full bg-white rounded-lg shadow p-3 flex items-center justify-between hover:bg-pink-50 transition"
              >
                <div className="flex items-center gap-2.5">
                  <History className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">HISTORY</span>
                </div>
              </button>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2 px-2">VEHICLES</p>
            <div className="space-y-2">
              <button
                onClick={() => setView('expenses')}
                className="w-full bg-white rounded-lg shadow p-3 flex items-center justify-between hover:bg-pink-50 transition"
              >
                <div className="flex items-center gap-2.5">
                  <DollarSign className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">EXPENSES</span>
                </div>
              </button>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2 px-2">OTHERS</p>
            <div className="space-y-2">
              <button
                onClick={() => setView('material')}
                className="w-full bg-white rounded-lg shadow p-3 flex items-center justify-between hover:bg-pink-50 transition"
              >
                <div className="flex items-center gap-2.5">
                  <BookOpen className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">HELPING MATERIAL</span>
                </div>
              </button>
            </div>
          </div>

          <div>
            <button
              onClick={() => setView('settings')}
              className="w-full bg-white rounded-lg shadow p-3 flex items-center justify-between hover:bg-pink-50 transition"
            >
              <div className="flex items-center gap-2.5">
                <Settings className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">SETTINGS</span>
              </div>
            </button>
          </div>

          <div className="pt-2">
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = '/';
              }}
              className="w-full bg-gradient-to-r from-pink-500 to-red-500 text-white rounded-lg p-3 flex items-center justify-center gap-2.5 hover:from-pink-600 hover:to-red-600 transition shadow-md"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-semibold">LOGOUT</span>
            </button>
          </div>

          <div className="text-center text-xs text-gray-400 py-4">
            Version: 1.0.26 (1)
          </div>
        </div>
      </div>
    );
  }

  if (view === 'assigned') {
    return (
      <div className="min-h-screen bg-pink-50">
        <div className="bg-gradient-to-r from-pink-500 to-red-500 text-white p-4 sticky top-0 z-10 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setView('menu')}
              className="flex items-center text-pink-100 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setView('walkie')}
              className="bg-white/20 p-2 rounded-lg hover:bg-white/30 transition"
            >
              <Radio className="w-5 h-5" />
            </button>
          </div>
          <div>
            <h1 className="text-2xl font-bold mb-1">My Trips</h1>
            <p className="text-sm text-pink-100">Driver: {profile?.full_name}</p>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {trips.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No trips assigned</p>
              <p className="text-sm text-gray-500 mt-2">Check back later for new assignments</p>
            </div>
          ) : (
            trips.map((trip) => (
              <div
                key={trip.id}
                onClick={() => {
                  setSelectedTrip(trip);
                  setView('detail');
                }}
                className="bg-white rounded-lg shadow p-4 cursor-pointer active:bg-pink-50 transition"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {trip.patients?.first_name} {trip.patients?.last_name}
                    </h3>
                    <div className="flex items-center mt-1">
                      <div className={`w-2 h-2 rounded-full ${trip.status === 'assigned' ? 'bg-yellow-400' : 'bg-green-400'} mr-2`}></div>
                      <span className="text-xs text-gray-600">{trip.status.replace('_', ' ').toUpperCase()}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-start text-gray-600">
                    <MapPin className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="line-clamp-1">{trip.pickup_location}</span>
                  </div>
                  <div className="flex items-start text-gray-600">
                    <MapPin className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5 text-blue-500" />
                    <span className="line-clamp-1">{trip.dropoff_location}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>{new Date(trip.pickup_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                {trip.patients?.mobility_requirements && (
                  <div className="mt-3 bg-yellow-50 border-l-4 border-yellow-400 p-2">
                    <p className="text-xs text-yellow-800 flex items-center">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {trip.patients.mobility_requirements}
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pink-50">
      <div className="bg-gradient-to-r from-pink-500 to-red-500 text-white p-4 sticky top-0 z-10 shadow-lg">
        <button
          onClick={() => setView('menu')}
          className="flex items-center text-pink-100 hover:text-white mb-3"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          <span className="font-medium">Back</span>
        </button>
        <h1 className="text-xl font-bold">
          {view === 'assists' && 'Assists'}
          {view === 'history' && 'History'}
          {view === 'expenses' && 'Expenses'}
          {view === 'settings' && 'Settings'}
          {view === 'material' && 'Helping Material'}
        </h1>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">Coming Soon</p>
          <p className="text-sm text-gray-500 mt-2">This feature is under development</p>
        </div>

        <button
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = '/';
          }}
          className="w-full bg-gradient-to-r from-pink-500 to-red-500 text-white rounded-lg p-3 flex items-center justify-center gap-3 hover:from-pink-600 hover:to-red-600 transition shadow-md"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-semibold">LOGOUT</span>
        </button>
      </div>
    </div>
  );
}
