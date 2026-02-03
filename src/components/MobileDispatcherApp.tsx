import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  MapPin,
  Phone,
  Clock,
  User,
  Car,
  Plus,
  Volume2,
  AlertCircle,
  CheckCircle,
  Navigation,
  MessageSquare,
  Calendar,
  RefreshCw,
  Send,
  Users,
  Activity,
  ArrowLeft,
  PhoneCall
} from 'lucide-react';
import { TripModal } from './TripModal';
import { DispatcherVoiceMessages } from './DispatcherVoiceMessages';

interface Driver {
  id: string;
  full_name: string;
  status: string;
  current_latitude: number | null;
  current_longitude: number | null;
  phone_number?: string;
}

interface Trip {
  id: string;
  patient_id: string;
  driver_id: string | null;
  pickup_location: string;
  dropoff_location: string;
  scheduled_pickup_time: string;
  status: string;
  trip_type: string;
  patients: {
    first_name: string;
    last_name: string;
    phone: string;
  };
  profiles: {
    full_name: string;
  } | null;
}

type View = 'trips' | 'drivers' | 'assign' | 'walkie' | 'create';

export default function MobileDispatcherApp() {
  const { user } = useAuth();
  const [view, setView] = useState<View>('trips');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTripModal, setShowTripModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadData();
    const tripsChannel = supabase
      .channel('dispatcher_trips')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, loadTrips)
      .subscribe();

    const driversChannel = supabase
      .channel('dispatcher_drivers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, loadDrivers)
      .subscribe();

    return () => {
      tripsChannel.unsubscribe();
      driversChannel.unsubscribe();
    };
  }, []);

  async function loadData() {
    await Promise.all([loadTrips(), loadDrivers()]);
    setLoading(false);
  }

  async function loadTrips() {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select(`
          *,
          patients (first_name, last_name, phone),
          profiles:driver_id (full_name)
        `)
        .in('status', ['scheduled', 'assigned', 'unassigned', 'en_route_pickup', 'arrived_pickup', 'patient_onboard', 'en_route_dropoff'])
        .order('scheduled_pickup_time', { ascending: true });

      if (error) throw error;
      setTrips(data || []);
    } catch (error) {
      console.error('Error loading trips:', error);
    }
  }

  async function loadDrivers() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'driver')
        .order('full_name');

      if (error) throw error;
      setDrivers(data || []);
    } catch (error) {
      console.error('Error loading drivers:', error);
    }
  }

  async function assignTripToDriver(tripId: string, driverId: string) {
    try {
      const { error } = await supabase
        .from('trips')
        .update({
          driver_id: driverId,
          status: 'assigned'
        })
        .eq('id', tripId);

      if (error) throw error;

      await loadTrips();
      setView('trips');
      setSelectedTrip(null);
      setSelectedDriver(null);
    } catch (error) {
      console.error('Error assigning trip:', error);
      alert('Failed to assign trip');
    }
  }

  async function updateTripStatus(tripId: string, newStatus: string) {
    try {
      const { error } = await supabase
        .from('trips')
        .update({ status: newStatus })
        .eq('id', tripId);

      if (error) throw error;
      await loadTrips();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  }

  function getStatusColor(status: string) {
    const colors: Record<string, string> = {
      unassigned: 'bg-yellow-500',
      scheduled: 'bg-blue-500',
      assigned: 'bg-green-500',
      en_route_pickup: 'bg-purple-500',
      arrived_pickup: 'bg-orange-500',
      patient_onboard: 'bg-indigo-500',
      en_route_dropoff: 'bg-cyan-500',
      completed: 'bg-pink-500'
    };
    return colors[status] || 'bg-gray-400';
  }

  function getDriverStatusColor(status: string) {
    const colors: Record<string, string> = {
      available: 'bg-green-500',
      on_trip: 'bg-blue-500',
      break: 'bg-yellow-500',
      offline: 'bg-gray-400'
    };
    return colors[status] || 'bg-gray-400';
  }

  const filteredTrips = statusFilter === 'all'
    ? trips
    : trips.filter(t => t.status === statusFilter);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-pink-50">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (view === 'walkie') {
    return <DispatcherVoiceMessages />;
  }

  if (view === 'assign' && selectedTrip) {
    return (
      <div className="flex flex-col h-screen bg-pink-50">
        <div className="bg-gradient-to-r from-pink-500 to-red-500 text-white p-4 flex items-center gap-3 shadow-lg">
          <button onClick={() => {
            setView('trips');
            setSelectedTrip(null);
          }}>
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold">Assign Driver</h1>
        </div>

        <div className="p-4 bg-white border-b">
          <div className="text-sm text-gray-600">Trip Details</div>
          <div className="font-semibold mt-1">
            {selectedTrip.patients?.first_name} {selectedTrip.patients?.last_name}
          </div>
          <div className="text-sm text-gray-600 mt-2 flex items-start gap-2">
            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <div>{selectedTrip.pickup_location}</div>
              <div className="text-gray-400">to</div>
              <div>{selectedTrip.dropoff_location}</div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            {drivers.map((driver) => (
              <button
                key={driver.id}
                onClick={() => setSelectedDriver(driver.id)}
                className={`w-full p-4 bg-white rounded-lg shadow-sm border-2 transition-colors ${
                  selectedDriver === driver.id ? 'border-blue-600' : 'border-transparent'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${getDriverStatusColor(driver.status)}`} />
                    <div className="text-left">
                      <div className="font-semibold">{driver.full_name}</div>
                      <div className="text-sm text-gray-600 capitalize">{driver.status.replace('_', ' ')}</div>
                    </div>
                  </div>
                  {driver.phone_number && (
                    <a
                      href={`tel:${driver.phone_number}`}
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 rounded-full bg-green-500 text-white"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 bg-white border-t">
          <button
            onClick={() => selectedDriver && assignTripToDriver(selectedTrip.id, selectedDriver)}
            disabled={!selectedDriver}
            className="w-full py-3 bg-gradient-to-r from-pink-500 to-red-500 text-white rounded-lg font-semibold shadow-md disabled:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Assign Trip
          </button>
        </div>
      </div>
    );
  }

  if (view === 'drivers') {
    return (
      <div className="flex flex-col h-screen bg-pink-50">
        <div className="bg-gradient-to-r from-pink-500 to-red-500 text-white p-4 shadow-lg">
          <h1 className="text-xl font-bold">Drivers</h1>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            {drivers.map((driver) => (
              <div key={driver.id} className="p-4 bg-white rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full ${getDriverStatusColor(driver.status)}`} />
                    <div>
                      <div className="font-semibold">{driver.full_name}</div>
                      <div className="text-sm text-gray-600 capitalize">{driver.status.replace('_', ' ')}</div>
                    </div>
                  </div>
                  {driver.phone_number && (
                    <a
                      href={`tel:${driver.phone_number}`}
                      className="p-2 rounded-full bg-green-500 text-white"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border-t p-2 flex justify-around">
          <button onClick={() => setView('trips')} className="flex flex-col items-center p-2 text-gray-600">
            <Activity className="w-6 h-6" />
            <span className="text-xs mt-1">Trips</span>
          </button>
          <button className="flex flex-col items-center p-2 text-blue-600">
            <Users className="w-6 h-6" />
            <span className="text-xs mt-1">Drivers</span>
          </button>
          <button onClick={() => setView('walkie')} className="flex flex-col items-center p-2 text-gray-600">
            <Volume2 className="w-6 h-6" />
            <span className="text-xs mt-1">Voice</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-pink-50">
      <div className="bg-gradient-to-r from-pink-500 to-red-500 text-white p-4 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold">Dispatch</h1>
          <button
            onClick={() => window.location.href = '/'}
            className="text-sm px-3 py-1 bg-white text-pink-600 rounded-md font-medium"
          >
            Desktop Mode
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {['all', 'unassigned', 'assigned', 'en_route_pickup', 'patient_onboard'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-white text-pink-600'
                  : 'bg-white/20 text-white'
              }`}
            >
              {status === 'all' ? 'All' : status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          {filteredTrips.map((trip) => (
            <div key={trip.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-semibold">
                      {trip.patients?.first_name} {trip.patients?.last_name}
                    </div>
                    <div className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                      <Clock className="w-4 h-4" />
                      {new Date(trip.scheduled_pickup_time).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-semibold text-white ${getStatusColor(trip.status)}`}>
                    {trip.status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="text-gray-700">{trip.pickup_location}</div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="text-gray-700">{trip.dropoff_location}</div>
                  </div>
                </div>

                {trip.profiles && (
                  <div className="flex items-center gap-2 mt-3 text-sm">
                    <Car className="w-4 h-4 text-gray-600" />
                    <span className="text-gray-700">{trip.profiles.full_name}</span>
                  </div>
                )}
              </div>

              <div className="border-t bg-pink-50 p-2 flex gap-2">
                {trip.patients?.phone && (
                  <a
                    href={`tel:${trip.patients.phone}`}
                    className="flex-1 py-2 px-3 bg-green-500 text-white rounded-md flex items-center justify-center gap-2 text-sm font-medium"
                  >
                    <Phone className="w-4 h-4" />
                    Call Patient
                  </a>
                )}
                {!trip.driver_id && (
                  <button
                    onClick={() => {
                      setSelectedTrip(trip);
                      setView('assign');
                    }}
                    className="flex-1 py-2 px-3 bg-gradient-to-r from-pink-500 to-red-500 text-white rounded-md flex items-center justify-center gap-2 text-sm font-medium shadow-md"
                  >
                    <User className="w-4 h-4" />
                    Assign
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => setShowTripModal(true)}
        className="fixed bottom-20 right-4 w-14 h-14 bg-gradient-to-r from-pink-500 to-red-500 text-white rounded-full shadow-lg flex items-center justify-center"
      >
        <Plus className="w-6 h-6" />
      </button>

      <div className="bg-white border-t p-2 flex justify-around">
        <button className="flex flex-col items-center p-2 text-pink-600">
          <Activity className="w-6 h-6" />
          <span className="text-xs mt-1 font-medium">Trips</span>
        </button>
        <button onClick={() => setView('drivers')} className="flex flex-col items-center p-2 text-gray-600 hover:text-pink-600">
          <Users className="w-6 h-6" />
          <span className="text-xs mt-1">Drivers</span>
        </button>
        <button onClick={() => setView('walkie')} className="flex flex-col items-center p-2 text-gray-600 hover:text-pink-600">
          <Volume2 className="w-6 h-6" />
          <span className="text-xs mt-1">Voice</span>
        </button>
      </div>

      {showTripModal && (
        <TripModal
          onClose={() => {
            setShowTripModal(false);
            loadTrips();
          }}
        />
      )}
    </div>
  );
}
