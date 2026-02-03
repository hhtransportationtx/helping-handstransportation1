import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircle, XCircle, Clock, Send, Phone, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Trip {
  id: string;
  scheduled_pickup_time: string;
  pickup_address: string;
  dropoff_address: string;
  patient_id: string;
  patients: {
    id: string;
    full_name: string;
    phone: string;
  };
}

interface TripConfirmation {
  id: string;
  trip_id: string;
  confirmation_sent_at: string | null;
  confirmed_at: string | null;
  confirmation_status: 'pending' | 'confirmed' | 'declined' | 'no_response';
  confirmation_method: string | null;
  trips: Trip;
}

export function TripConfirmations() {
  const { user } = useAuth();
  const [confirmations, setConfirmations] = useState<TripConfirmation[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (user) {
      loadConfirmations();
      const subscription = supabase
        .channel('trip_confirmations_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'trip_confirmations' },
          () => {
            loadConfirmations();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);

  async function loadConfirmations() {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) {
        console.error('No company_id found');
        setLoading(false);
        return;
      }

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const dayAfterTomorrow = new Date(tomorrow);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

      const { data: tripsData, error: tripsError } = await supabase
        .from('trips')
        .select(`
          id,
          scheduled_pickup_time,
          pickup_address,
          dropoff_address,
          patient_id,
          patients (
            id,
            full_name,
            phone
          )
        `)
        .eq('company_id', profile.company_id)
        .gte('scheduled_pickup_time', tomorrow.toISOString())
        .lt('scheduled_pickup_time', dayAfterTomorrow.toISOString())
        .order('scheduled_pickup_time', { ascending: true });

      if (tripsError) throw tripsError;

      if (!tripsData || tripsData.length === 0) {
        setConfirmations([]);
        setLoading(false);
        return;
      }

      const tripIds = tripsData.map((t) => t.id);

      const { data: confirmationsData, error: confirmationsError } = await supabase
        .from('trip_confirmations')
        .select('*')
        .in('trip_id', tripIds);

      if (confirmationsError) throw confirmationsError;

      const confirmationsMap = new Map(
        (confirmationsData || []).map((c) => [c.trip_id, c])
      );

      const enrichedConfirmations: TripConfirmation[] = tripsData.map((trip) => {
        const confirmation = confirmationsMap.get(trip.id);
        return {
          id: confirmation?.id || '',
          trip_id: trip.id,
          confirmation_sent_at: confirmation?.confirmation_sent_at || null,
          confirmed_at: confirmation?.confirmed_at || null,
          confirmation_status: confirmation?.confirmation_status || 'pending',
          confirmation_method: confirmation?.confirmation_method || null,
          trips: trip,
        };
      });

      setConfirmations(enrichedConfirmations);
    } catch (error) {
      console.error('Error loading confirmations:', error);
    } finally {
      setLoading(false);
    }
  }

  async function sendConfirmations() {
    setSending(true);
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-trip-confirmations`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.error === 'Twilio not configured') {
          alert('SMS confirmations require Twilio configuration. Please set up Twilio to use this feature.');
        } else {
          throw new Error(result.error || 'Failed to send confirmations');
        }
        return;
      }

      alert(result.message || 'Confirmations sent successfully!');
      await loadConfirmations();
    } catch (error) {
      console.error('Error sending confirmations:', error);
      alert('Failed to send confirmations');
    } finally {
      setSending(false);
    }
  }

  async function manualConfirm(
    confirmationId: string,
    tripId: string,
    patientId: string,
    status: 'confirmed' | 'declined'
  ) {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) {
        console.error('No company_id found');
        return;
      }

      if (confirmationId) {
        const { error } = await supabase
          .from('trip_confirmations')
          .update({
            confirmation_status: status,
            confirmed_at: new Date().toISOString(),
            confirmation_method: 'manual',
          })
          .eq('id', confirmationId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('trip_confirmations').insert({
          trip_id: tripId,
          patient_id: patientId,
          confirmation_status: status,
          confirmed_at: new Date().toISOString(),
          confirmation_method: 'manual',
          company_id: profile.company_id,
        });

        if (error) throw error;
      }

      await loadConfirmations();
    } catch (error) {
      console.error('Error updating confirmation:', error);
      alert('Failed to update confirmation');
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'confirmed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-4 h-4 mr-1" />
            Confirmed
          </span>
        );
      case 'declined':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-4 h-4 mr-1" />
            Declined
          </span>
        );
      case 'no_response':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <AlertCircle className="w-4 h-4 mr-1" />
            No Response
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-4 h-4 mr-1" />
            Pending
          </span>
        );
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading confirmations...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Trip Confirmations</h2>
          <p className="text-gray-600 mt-1">
            Manage confirmations for trips scheduled tomorrow
          </p>
        </div>
        <button
          onClick={sendConfirmations}
          disabled={sending}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <Send className="w-5 h-5" />
          {sending ? 'Sending...' : 'Send All Confirmations'}
        </button>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <Phone className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              <strong>How it works:</strong> Members will receive an SMS reminder the day before their trip asking them to reply YES to confirm. You can also manually mark confirmations using the buttons below.
            </p>
          </div>
        </div>
      </div>

      {confirmations.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No trips scheduled for tomorrow</h3>
          <p className="text-gray-600">Check back later or schedule some trips!</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Patient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pickup Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Route
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {confirmations.map((conf) => {
                const trip = conf.trips;
                const patient = trip.patients;
                const pickupTime = new Date(trip.scheduled_pickup_time);

                return (
                  <tr key={conf.id || `trip-${trip.id}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {patient.full_name}
                      </div>
                      <div className="text-sm text-gray-500">{patient.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {pickupTime.toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{trip.pickup_address}</div>
                      <div className="text-sm text-gray-500">→ {trip.dropoff_address}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(conf.confirmation_status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 capitalize">
                        {conf.confirmation_method || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {conf.confirmation_status === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              manualConfirm(conf.id, trip.id, trip.patient_id, 'confirmed')
                            }
                            className="text-green-600 hover:text-green-800 font-medium"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() =>
                              manualConfirm(conf.id, trip.id, trip.patient_id, 'declined')
                            }
                            className="text-red-600 hover:text-red-800 font-medium"
                          >
                            Decline
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
