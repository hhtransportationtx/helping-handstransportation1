import { useState, useEffect, useRef } from 'react';
import { supabase, Trip } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { MapPin, Clock, CheckCircle, AlertCircle, Car, Fuel, DollarSign, Wrench, Plus, X, Smartphone, QrCode, Volume2, Navigation, FileText, Video } from 'lucide-react';
import GroupWalkieTalkie from './GroupWalkieTalkie';
import VideoCallManager from './VideoCallManager';
import { VehicleQRScanner } from './VehicleQRScanner';
import { playUrgentAlertSound, showBrowserNotification, requestNotificationPermission } from '../lib/notificationSound';
import { openInMaps } from '../lib/mapLinks';
import DriverOnboarding from './DriverOnboarding';
import { DriverPayStubRequests } from './DriverPayStubRequests';

interface Vehicle {
  id: string;
  vehicle_number: string;
  make: string;
  model: string;
  year: number;
  license_plate: string;
}

type TabType = 'trips' | 'maintenance' | 'paystubs' | 'video-calls';
type RecordType = 'maintenance' | 'fuel' | 'expense';

export function DriverDashboard() {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('trips');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [recordType, setRecordType] = useState<RecordType>('fuel');
  const [currentVehicleId, setCurrentVehicleId] = useState<string>('');
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [assignedVehicle, setAssignedVehicle] = useState<any>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  const previousTripCount = useRef<number>(0);
  const isInitialLoad = useRef(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  useEffect(() => {
    if (user) {
      requestNotificationPermission();
      checkOnboardingStatus();
      loadTrips();
      loadVehicles();
      loadAssignedVehicle();
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
    if (user) {
      loadTrips();
    }
  }, [showCompleted]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('driver-trips-notifications')
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
                `Pickup: ${newTrip.pickup_address || 'See details'}`,
                { requireInteraction: true }
              );
            }
            loadTrips();
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
                `Pickup: ${newTrip.pickup_address || 'See details'}`,
                { requireInteraction: true }
              );
            }
            loadTrips();
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user, soundEnabled]);

  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      previousTripCount.current = trips.length;
    } else if (trips.length > previousTripCount.current) {
      previousTripCount.current = trips.length;
    }
  }, [trips]);

  async function loadVehicles() {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('trips')
        .select('vehicle:vehicles(*)')
        .eq('driver_id', user.id)
        .not('vehicle_id', 'is', null);

      if (error) throw error;

      const uniqueVehicles = Array.from(
        new Map(data.map(item => [item.vehicle?.id, item.vehicle])).values()
      ).filter(Boolean) as Vehicle[];

      setVehicles(uniqueVehicles);
      if (uniqueVehicles.length > 0) {
        setCurrentVehicleId(uniqueVehicles[0].id);
      }
    } catch (error) {
      console.error('Error loading vehicles:', error);
    }
  }

  async function loadAssignedVehicle() {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('vehicle_assignments')
        .select(`
          *,
          vehicle:vehicles(*)
        `)
        .eq('driver_id', user.id)
        .eq('assigned_date', today)
        .is('unassigned_at', null)
        .order('assigned_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setAssignedVehicle(data);
    } catch (error) {
      console.error('Error loading assigned vehicle:', error);
    }
  }

  async function loadTrips() {
    if (!user) return;

    setLoading(true);
    try {
      const statuses = showCompleted
        ? ['scheduled', 'assigned', 'in_progress', 'completed']
        : ['scheduled', 'assigned', 'in_progress'];

      console.log('Loading trips for driver:', user.id);
      console.log('Statuses:', statuses);

      const { data, error } = await supabase
        .from('trips')
        .select(`
          *,
          patient:patients(*),
          vehicle:vehicles(*)
        `)
        .eq('driver_id', user.id)
        .in('status', statuses)
        .order('scheduled_pickup_time', { ascending: true });

      if (error) {
        console.error('Error loading trips:', error);
        throw error;
      }

      console.log('Loaded trips:', data?.length || 0);
      setTrips(data || []);
    } catch (error) {
      console.error('Error loading trips:', error);
    } finally {
      setLoading(false);
    }
  }

  async function unassignVehicle() {
    if (!user || !assignedVehicle) return;

    try {
      const { error } = await supabase
        .from('vehicle_assignments')
        .update({ unassigned_at: new Date().toISOString() })
        .eq('id', assignedVehicle.id);

      if (error) throw error;
      setAssignedVehicle(null);
    } catch (error) {
      console.error('Error unassigning vehicle:', error);
      alert('Failed to unassign vehicle');
    }
  }

  async function updateTripStatus(tripId: string, status: string) {
    try {
      const updateData: Record<string, string> = { status };

      if (status === 'in_progress') {
        updateData.actual_pickup_time = new Date().toISOString();
      } else if (status === 'completed') {
        updateData.actual_dropoff_time = new Date().toISOString();
      }

      const { error } = await supabase
        .from('trips')
        .update(updateData)
        .eq('id', tripId);

      if (error) throw error;

      await supabase.from('trip_logs').insert({
        trip_id: tripId,
        user_id: user?.id,
        action: `Status changed to ${status}`,
        details: `Driver updated trip status`,
      });

      loadTrips();
    } catch (error) {
      console.error('Error updating trip:', error);
      alert('Error updating trip status');
    }
  }

  if (loading || checkingOnboarding) {
    return (
      <div className="min-h-screen bg-pink-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 pb-20">
      <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white shadow-xl">
        <div className="p-6 pb-0">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Driver Dashboard</h1>
              <p className="text-slate-300 mt-2 text-sm">Manage your trips and vehicle</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg ${
                  soundEnabled
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white'
                    : 'bg-slate-600 hover:bg-slate-500 text-slate-200'
                }`}
                title={soundEnabled ? 'Sound Notifications: ON' : 'Sound Notifications: OFF'}
              >
                <Volume2 className="w-5 h-5" />
                {soundEnabled ? 'ON' : 'OFF'}
              </button>
              <button
                onClick={() => {
                  window.history.pushState({}, '', '/driver-mobile');
                  window.location.reload();
                }}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg"
              >
                <Smartphone className="w-5 h-5" />
                Mobile
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-6 pt-6">
          <button
            onClick={() => setActiveTab('trips')}
            className={`flex-1 py-4 px-6 rounded-t-2xl font-semibold transition-all ${
              activeTab === 'trips'
                ? 'bg-white text-slate-800 shadow-xl'
                : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
            }`}
          >
            My Trips
          </button>
          <button
            onClick={() => setActiveTab('maintenance')}
            className={`flex-1 py-4 px-6 rounded-t-2xl font-semibold transition-all ${
              activeTab === 'maintenance'
                ? 'bg-white text-slate-800 shadow-xl'
                : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
            }`}
          >
            Fleet Maintenance
          </button>
          <button
            onClick={() => setActiveTab('paystubs')}
            className={`flex-1 py-4 px-6 rounded-t-2xl font-semibold transition-all ${
              activeTab === 'paystubs'
                ? 'bg-white text-slate-800 shadow-xl'
                : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
            }`}
          >
            <FileText className="w-5 h-5 inline mr-2" />
            Pay Stubs
          </button>
          <button
            onClick={() => setActiveTab('video-calls')}
            className={`flex-1 py-4 px-6 rounded-t-2xl font-semibold transition-all ${
              activeTab === 'video-calls'
                ? 'bg-white text-slate-800 shadow-xl'
                : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
            }`}
          >
            <Video className="w-5 h-5 inline mr-2" />
            Video Help
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <GroupWalkieTalkie />

        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-xl text-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                <Car className="w-6 h-6 text-white" />
              </div>
              Today's Vehicle
            </h3>
          </div>

          {assignedVehicle ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-5 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-200">
                <div className="flex-1">
                  <p className="font-bold text-lg text-slate-900">
                    {assignedVehicle.vehicle?.vehicle_name || assignedVehicle.vehicle?.rig_no}
                  </p>
                  <p className="text-sm text-slate-600 mt-1 font-medium">
                    Rig #: {assignedVehicle.vehicle?.rig_no || 'N/A'}
                  </p>
                  {assignedVehicle.vehicle?.model && (
                    <p className="text-sm text-slate-600">{assignedVehicle.vehicle.model}</p>
                  )}
                  <p className="text-xs text-slate-500 mt-2">
                    Assigned at {new Date(assignedVehicle.assigned_at).toLocaleTimeString()}
                    {assignedVehicle.assignment_method === 'qr_scan' && ' via QR Scan'}
                  </p>
                </div>
                <button
                  onClick={unassignVehicle}
                  className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-500 hover:to-red-600 transition-all text-sm font-semibold shadow-md"
                >
                  Unassign
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-slate-600 text-sm">No vehicle assigned for today</p>
              <button
                onClick={() => setShowQRScanner(true)}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-bold hover:from-blue-500 hover:to-cyan-500 transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <QrCode className="w-6 h-6" />
                Scan Vehicle QR Code
              </button>
            </div>
          )}
        </div>
      </div>

      {activeTab === 'trips' ? (
        <div className="p-6 space-y-6">
          {trips.some(t => t.status === 'assigned') && (
            <div className="bg-gradient-to-r from-red-600 to-red-700 text-white rounded-2xl shadow-2xl p-6 animate-pulse border-4 border-red-800">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center animate-bounce">
                  <AlertCircle className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-black">URGENT: NEW TRIPS ASSIGNED!</h3>
                  <p className="text-red-100 font-semibold mt-1">
                    You have {trips.filter(t => t.status === 'assigned').length} new trip(s) requiring immediate attention
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-slate-800 font-semibold">Show Completed Trips</span>
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className={`relative inline-flex h-7 w-14 items-center rounded-full transition-all shadow-inner ${
                  showCompleted ? 'bg-gradient-to-r from-emerald-500 to-teal-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
                    showCompleted ? 'translate-x-8' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <button
              onClick={loadTrips}
              className="w-full px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium hover:bg-blue-100 transition-colors text-sm"
            >
              Refresh Trips
            </button>
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-12 text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-600 font-medium text-lg">Loading trips...</p>
            </div>
          ) : trips.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-12 text-center space-y-4">
              <CheckCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 font-medium text-lg">No active trips assigned</p>
              <p className="text-slate-500 text-sm">
                {showCompleted
                  ? 'No trips found. Contact dispatch if you should have trips assigned.'
                  : 'Toggle "Show Completed Trips" to see your trip history.'}
              </p>
              <button
                onClick={loadTrips}
                className="mt-4 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:from-blue-500 hover:to-cyan-500 transition-all shadow-md"
              >
                Refresh Trips
              </button>
            </div>
          ) : (
            trips.map((trip) => (
            <div key={trip.id} className={`bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow ${
              trip.status === 'assigned'
                ? 'border-4 border-red-500 animate-pulse'
                : 'border border-slate-200'
            }`}>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    trip.status === 'assigned'
                      ? 'bg-gradient-to-br from-red-500 to-red-700 animate-pulse'
                      : trip.status === 'completed'
                      ? 'bg-gradient-to-br from-blue-500 to-cyan-600'
                      : 'bg-gradient-to-br from-emerald-500 to-teal-600'
                  }`}>
                    {trip.status === 'assigned' ? (
                      <AlertCircle className="w-6 h-6 text-white" />
                    ) : trip.status === 'completed' ? (
                      <CheckCircle className="w-6 h-6 text-white" />
                    ) : (
                      <Clock className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <span className="font-bold text-xl text-slate-900">
                    {trip.patient?.full_name}
                  </span>
                </div>
                <span className={`px-4 py-2 rounded-xl text-sm font-bold shadow-md ${
                  trip.status === 'assigned'
                    ? 'bg-gradient-to-r from-red-600 to-red-700 text-white animate-pulse'
                    : trip.status === 'completed'
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white'
                }`}>
                  {trip.status === 'assigned' ? 'URGENT - NEW TRIP' : trip.status === 'completed' ? 'Completed' : 'In Progress'}
                </span>
              </div>

              <div className="space-y-4 mb-5">
                <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
                  <Clock className="w-5 h-5 text-slate-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-600">Pickup Time</p>
                    <p className="font-bold text-slate-900 mt-0.5">
                      {new Date(trip.scheduled_pickup_time).toLocaleString()}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => openInMaps(trip.pickup_address, trip.pickup_latitude, trip.pickup_longitude)}
                  className="flex items-start gap-3 w-full text-left hover:bg-emerald-50 p-4 rounded-xl transition-all group border-2 border-transparent hover:border-emerald-200"
                >
                  <MapPin className="w-5 h-5 text-emerald-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-600">Pickup Location</p>
                    <p className="font-semibold text-slate-900 group-hover:text-emerald-700 mt-0.5">{trip.pickup_address}</p>
                  </div>
                  <Navigation className="w-5 h-5 text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
                </button>

                <button
                  onClick={() => openInMaps(trip.dropoff_address, trip.dropoff_latitude, trip.dropoff_longitude)}
                  className="flex items-start gap-3 w-full text-left hover:bg-blue-50 p-4 rounded-xl transition-all group border-2 border-transparent hover:border-blue-200"
                >
                  <MapPin className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-600">Dropoff Location</p>
                    <p className="font-semibold text-slate-900 group-hover:text-blue-700 mt-0.5">{trip.dropoff_address}</p>
                  </div>
                  <Navigation className="w-5 h-5 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
                </button>

                {trip.patient?.mobility_needs && (
                  <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-4">
                    <p className="text-sm font-bold text-blue-900">
                      Mobility: {trip.patient.mobility_needs}
                    </p>
                  </div>
                )}

                {trip.patient?.special_instructions && (
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-4">
                    <p className="text-sm font-bold text-amber-900">Special Instructions</p>
                    <p className="text-sm text-amber-800 mt-2">
                      {trip.patient.special_instructions}
                    </p>
                  </div>
                )}

                {trip.notes && (
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-sm text-slate-700 font-medium">{trip.notes}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                {trip.status === 'assigned' && (
                  <button
                    onClick={() => updateTripStatus(trip.id, 'in_progress')}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-4 rounded-xl font-bold hover:from-blue-500 hover:to-cyan-500 transition-all shadow-lg"
                  >
                    Start Trip
                  </button>
                )}
                {trip.status === 'in_progress' && (
                  <button
                    onClick={() => updateTripStatus(trip.id, 'completed')}
                    className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-4 rounded-xl font-bold hover:from-emerald-500 hover:to-teal-500 transition-all shadow-lg"
                  >
                    Complete Trip
                  </button>
                )}
              </div>
            </div>
            ))
          )}
        </div>
      ) : activeTab === 'maintenance' ? (
        <MaintenanceTab
          vehicles={vehicles}
          currentVehicleId={currentVehicleId}
          setCurrentVehicleId={setCurrentVehicleId}
          onAddRecord={(type) => {
            setRecordType(type);
            setShowAddModal(true);
          }}
        />
      ) : activeTab === 'paystubs' ? (
        <DriverPayStubRequests />
      ) : activeTab === 'video-calls' ? (
        <VideoCallManager />
      ) : null}

      {showAddModal && (
        <AddRecordModal
          type={recordType}
          vehicleId={currentVehicleId}
          vehicles={vehicles}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
          }}
        />
      )}

      {showQRScanner && user && (
        <VehicleQRScanner
          driverId={user.id}
          onClose={() => setShowQRScanner(false)}
          onAssigned={() => {
            loadAssignedVehicle();
            setShowQRScanner(false);
          }}
        />
      )}
    </div>
  );
}

function MaintenanceTab({
  vehicles,
  currentVehicleId,
  setCurrentVehicleId,
  onAddRecord
}: {
  vehicles: Vehicle[];
  currentVehicleId: string;
  setCurrentVehicleId: (id: string) => void;
  onAddRecord: (type: RecordType) => void;
}) {
  const currentVehicle = vehicles.find(v => v.id === currentVehicleId);

  if (vehicles.length === 0) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-12 text-center">
          <Car className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 font-medium text-lg">No vehicles assigned yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-5">
        <label className="block text-sm font-bold text-slate-800 mb-3">
          Select Vehicle
        </label>
        <select
          value={currentVehicleId}
          onChange={(e) => setCurrentVehicleId(e.target.value)}
          className="w-full px-5 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium text-slate-900"
        >
          {vehicles.map(vehicle => (
            <option key={vehicle.id} value={vehicle.id}>
              {vehicle.vehicle_number} - {vehicle.make} {vehicle.model} ({vehicle.license_plate})
            </option>
          ))}
        </select>
      </div>

      {currentVehicle && (
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl shadow-lg border-2 border-blue-200 p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
              <Car className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-xl text-slate-900">
                {currentVehicle.make} {currentVehicle.model}
              </h3>
              <p className="text-sm text-slate-600 font-medium mt-0.5">
                {currentVehicle.year} • {currentVehicle.license_plate}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        <button
          onClick={() => onAddRecord('fuel')}
          className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 hover:shadow-xl hover:border-orange-200 transition-all text-left"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-orange-400 to-red-500 rounded-xl flex items-center justify-center">
              <Fuel className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg text-slate-900 mb-1">Add Fuel Record</h3>
              <p className="text-sm text-slate-600 font-medium">Log fuel purchases and mileage</p>
            </div>
            <Plus className="w-6 h-6 text-slate-400" />
          </div>
        </button>

        <button
          onClick={() => onAddRecord('maintenance')}
          className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 hover:shadow-xl hover:border-blue-200 transition-all text-left"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center">
              <Wrench className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg text-slate-900 mb-1">Report Maintenance</h3>
              <p className="text-sm text-slate-600 font-medium">Log service and repairs</p>
            </div>
            <Plus className="w-6 h-6 text-slate-400" />
          </div>
        </button>

        <button
          onClick={() => onAddRecord('expense')}
          className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 hover:shadow-xl hover:border-emerald-200 transition-all text-left"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
              <DollarSign className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg text-slate-900 mb-1">Add Expense</h3>
              <p className="text-sm text-slate-600 font-medium">Report tolls, parking, etc.</p>
            </div>
            <Plus className="w-6 h-6 text-slate-400" />
          </div>
        </button>
      </div>
    </div>
  );
}

function AddRecordModal({
  type,
  vehicleId,
  vehicles,
  onClose,
  onSuccess
}: {
  type: RecordType;
  vehicleId: string;
  vehicles: Vehicle[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { user } = useAuth();
  const [formData, setFormData] = useState<any>({
    vehicle_id: vehicleId,
    date: new Date().toISOString().split('T')[0],
    fuel_type: 'regular'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!user) return;

      if (type === 'fuel') {
        await supabase.from('fuel_records').insert({
          vehicle_id: formData.vehicle_id,
          gallons: formData.gallons,
          cost_per_gallon: formData.cost_per_gallon,
          total_cost: Number(formData.gallons) * Number(formData.cost_per_gallon),
          odometer_reading: formData.odometer_reading,
          fuel_date: formData.date,
          location: formData.location,
          fuel_type: formData.fuel_type,
          notes: formData.notes,
          created_by: user.id
        });
      } else if (type === 'maintenance') {
        await supabase.from('vehicle_maintenance').insert({
          vehicle_id: formData.vehicle_id,
          maintenance_type: formData.maintenance_type,
          description: formData.description,
          cost: formData.cost || 0,
          odometer_reading: formData.odometer_reading,
          service_date: formData.date,
          vendor_name: formData.vendor_name || 'Self-reported',
          notes: formData.notes,
          created_by: user.id
        });
      } else {
        await supabase.from('vehicle_expenses').insert({
          vehicle_id: formData.vehicle_id,
          expense_type: formData.expense_type,
          description: formData.description,
          amount: formData.amount,
          expense_date: formData.date,
          vendor_name: formData.vendor_name,
          notes: formData.notes,
          created_by: user.id
        });
      }

      onSuccess();
    } catch (error) {
      console.error('Error adding record:', error);
    } finally {
      setLoading(false);
    }
  };

  const titles = {
    fuel: 'Add Fuel Record',
    maintenance: 'Report Maintenance',
    expense: 'Add Expense'
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b-2 border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
          <h2 className="text-2xl font-bold text-slate-900">{titles[type]}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-7 h-7" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle</label>
            <select
              value={formData.vehicle_id}
              onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              {vehicles.map(vehicle => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.vehicle_number} - {vehicle.make} {vehicle.model}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {type === 'fuel' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fuel Type</label>
                <select
                  value={formData.fuel_type}
                  onChange={(e) => setFormData({ ...formData, fuel_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="regular">Regular</option>
                  <option value="premium">Premium</option>
                  <option value="diesel">Diesel</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gallons</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.gallons || ''}
                    onChange={(e) => setFormData({ ...formData, gallons: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">$/Gallon</label>
                  <input
                    type="number"
                    step="0.001"
                    value={formData.cost_per_gallon || ''}
                    onChange={(e) => setFormData({ ...formData, cost_per_gallon: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Odometer</label>
                <input
                  type="number"
                  value={formData.odometer_reading || ''}
                  onChange={(e) => setFormData({ ...formData, odometer_reading: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Current mileage"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={formData.location || ''}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Gas station name"
                />
              </div>
            </>
          )}

          {type === 'maintenance' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={formData.maintenance_type || ''}
                  onChange={(e) => setFormData({ ...formData, maintenance_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select type</option>
                  <option value="oil_change">Oil Change</option>
                  <option value="tire_rotation">Tire Rotation</option>
                  <option value="brake_service">Brake Service</option>
                  <option value="inspection">Inspection</option>
                  <option value="issue_reported">Issue Reported</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Odometer</label>
                  <input
                    type="number"
                    value={formData.odometer_reading || ''}
                    onChange={(e) => setFormData({ ...formData, odometer_reading: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost (if known)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.cost || ''}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </>
          )}

          {type === 'expense' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={formData.expense_type || ''}
                  onChange={(e) => setFormData({ ...formData, expense_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select type</option>
                  <option value="tolls">Tolls</option>
                  <option value="parking">Parking</option>
                  <option value="car_wash">Car Wash</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount || ''}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vendor (Optional)</label>
                <input
                  type="text"
                  value={formData.vendor_name || ''}
                  onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={2}
            />
          </div>

          <div className="flex gap-3 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-5 py-3 border-2 border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-all font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-5 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-500 hover:to-cyan-500 transition-all disabled:opacity-50 font-bold shadow-lg"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}