import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, MapPin, Clock, User, Car, Phone, Navigation, X, CheckCircle, AlertCircle, LogOut, Trash2, CreditCard, Bot, Send, Loader2 } from 'lucide-react';
import { PaymentQRCodes } from './PaymentQRCodes';

interface Trip {
  id: string;
  scheduled_pickup_time: string;
  pickup_address: string;
  dropoff_address: string;
  status: string;
  driver_id: string | null;
  vehicle_id: string | null;
  pickup_latitude: number | null;
  pickup_longitude: number | null;
  dropoff_latitude: number | null;
  dropoff_longitude: number | null;
  driver?: {
    full_name: string;
    phone: string;
    current_latitude: number | null;
    current_longitude: number | null;
  };
  vehicle?: {
    make: string;
    model: string;
    year: number;
    color: string;
    license_plate: string;
  };
  trip_confirmations?: Array<{
    id: string;
    confirmation_status: string;
    confirmed_at: string | null;
    confirmation_method: string | null;
  }>;
}

interface Patient {
  id: string;
  full_name: string;
  phone: string;
  email: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function MemberPortal() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginPhone, setLoginPhone] = useState('');
  const [loginError, setLoginError] = useState('');
  const [patient, setPatient] = useState<Patient | null>(null);
  const [upcomingTrips, setUpcomingTrips] = useState<Trip[]>([]);
  const [pastTrips, setPastTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history' | 'payment' | 'chat'>('upcoming');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I\'m your bilingual AI assistant for Helping Hands Transportation. I can help you book a medical transportation trip, activate will-call rides, and provide price quotes. I speak English and Spanish!\n\n¡Hola! Soy su asistente de IA bilingüe para Helping Hands Transportation. Puedo ayudarle a reservar un viaje de transporte médico, activar viajes de will-call y proporcionarle cotizaciones de precios. ¡Hablo inglés y español!\n\nHow can I help you today?',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated && patient) {
      loadTrips();
      const subscription = supabase
        .channel('member-trips')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'trips',
            filter: `patient_id=eq.${patient.id}`,
          },
          () => {
            loadTrips();
          }
        )
        .subscribe();

      const interval = setInterval(() => {
        if (selectedTrip?.driver_id) {
          loadDriverLocation(selectedTrip.driver_id);
        }
      }, 10000);

      return () => {
        subscription.unsubscribe();
        clearInterval(interval);
      };
    }
  }, [isAuthenticated, patient, selectedTrip]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError('');
    setLoading(true);

    try {
      if (!loginPhone || loginPhone.trim() === '') {
        setLoginError('Please enter a phone number');
        setLoading(false);
        return;
      }

      const cleanPhone = loginPhone.replace(/\D/g, '');
      console.log('Attempting login with phone:', cleanPhone);

      if (cleanPhone.length < 10) {
        setLoginError('Please enter a valid 10-digit phone number');
        setLoading(false);
        return;
      }

      // Query all active patients
      const { data: patients, error } = await supabase
        .from('patients')
        .select('*')
        .eq('status', 'active');

      console.log('Query result:', {
        patientCount: patients?.length,
        error,
        patients: patients?.map(p => ({ name: p.full_name, phone: p.phone }))
      });

      if (error) {
        console.error('Database error:', error);
        setLoginError(`Database error: ${error.message}`);
        setLoading(false);
        return;
      }

      if (!patients || patients.length === 0) {
        console.log('No active patients found in database');
        setLoginError('No active accounts found. Please contact support.');
        setLoading(false);
        return;
      }

      // Find patient by comparing cleaned phone numbers
      const patient = patients.find(p => {
        if (!p.phone) return false;
        const dbPhone = p.phone.replace(/\D/g, '');
        console.log(`Comparing "${cleanPhone}" with "${dbPhone}" (original: "${p.phone}")`);
        return dbPhone === cleanPhone;
      });

      if (!patient) {
        console.log('No matching patient found for phone:', cleanPhone);
        console.log('Available phone numbers:', patients.map(p => p.phone?.replace(/\D/g, '')));
        setLoginError(`No active account found with phone number: ${cleanPhone}`);
        setLoading(false);
        return;
      }

      console.log('Login successful for:', patient.full_name);
      setPatient(patient);
      setIsAuthenticated(true);
      localStorage.setItem('member_portal_patient', JSON.stringify(patient));
    } catch (error: any) {
      console.error('Login error:', error);
      setLoginError(`Error: ${error?.message || 'Please try again'}`);
    } finally {
      setLoading(false);
    }
  }

  async function loadTrips() {
    if (!patient) return;

    try {
      const now = new Date().toISOString();

      const { data: upcoming } = await supabase
        .from('trips')
        .select(`
          *,
          driver:drivers(full_name, phone, current_latitude, current_longitude),
          vehicle:vehicles(make, model, year, color, license_plate),
          trip_confirmations(id, confirmation_status, confirmed_at, confirmation_method)
        `)
        .eq('patient_id', patient.id)
        .gte('scheduled_pickup_time', now)
        .order('scheduled_pickup_time', { ascending: true });

      const { data: past } = await supabase
        .from('trips')
        .select(`
          *,
          driver:drivers(full_name, phone, current_latitude, current_longitude),
          vehicle:vehicles(make, model, year, color, license_plate),
          trip_confirmations(id, confirmation_status, confirmed_at, confirmation_method)
        `)
        .eq('patient_id', patient.id)
        .lt('scheduled_pickup_time', now)
        .order('scheduled_pickup_time', { ascending: false })
        .limit(20);

      setUpcomingTrips(upcoming || []);
      setPastTrips(past || []);
    } catch (error) {
      console.error('Error loading trips:', error);
    }
  }

  async function loadDriverLocation(driverId: string) {
    try {
      const { data } = await supabase
        .from('drivers')
        .select('current_latitude, current_longitude')
        .eq('id', driverId)
        .maybeSingle();

      if (data && selectedTrip) {
        setSelectedTrip({
          ...selectedTrip,
          driver: {
            ...selectedTrip.driver!,
            current_latitude: data.current_latitude,
            current_longitude: data.current_longitude,
          },
        });
      }
    } catch (error) {
      console.error('Error loading driver location:', error);
    }
  }

  async function handleDeleteTrip(tripId: string, e: React.MouseEvent) {
    e.stopPropagation();

    if (!confirm('Are you sure you want to cancel this ride?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('trips')
        .update({ status: 'cancelled' })
        .eq('id', tripId)
        .eq('patient_id', patient?.id);

      if (error) throw error;

      await loadTrips();
    } catch (error) {
      console.error('Error cancelling trip:', error);
      alert('Failed to cancel ride. Please try again.');
    }
  }

  async function handleConfirmTrip(trip: Trip, e: React.MouseEvent) {
    e.stopPropagation();

    if (!patient) return;

    try {
      const confirmation = trip.trip_confirmations?.[0];

      if (confirmation) {
        const { error } = await supabase
          .from('trip_confirmations')
          .update({
            confirmation_status: 'confirmed',
            confirmed_at: new Date().toISOString(),
            confirmation_method: 'web',
            updated_at: new Date().toISOString()
          })
          .eq('id', confirmation.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('trip_confirmations')
          .insert({
            trip_id: trip.id,
            patient_id: patient.id,
            confirmation_status: 'confirmed',
            confirmed_at: new Date().toISOString(),
            confirmation_method: 'web'
          });

        if (error) throw error;
      }

      await loadTrips();
      alert('Trip confirmed successfully!');
    } catch (error) {
      console.error('Error confirming trip:', error);
      alert('Failed to confirm trip. Please try again.');
    }
  }

  function handleLogout() {
    setIsAuthenticated(false);
    setPatient(null);
    setUpcomingTrips([]);
    setPastTrips([]);
    setSelectedTrip(null);
    localStorage.removeItem('member_portal_patient');
  }

  async function handleChatSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setChatLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-receptionist`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: userMessage,
            conversation: messages,
            patientInfo: {
              name: patient?.full_name,
              phone: patient?.phone,
            },
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.response }]);

      if (data.tripCreated) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'Trip has been successfully scheduled! You can view it in your upcoming rides.',
          },
        ]);
        await loadTrips();
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'I apologize, but I encountered an error. Please try again or call our dispatch team directly.',
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  function formatTime(dateString: string) {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'assigned':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5" />;
      case 'in_progress':
        return <Navigation className="w-5 h-5" />;
      case 'assigned':
        return <Clock className="w-5 h-5" />;
      default:
        return <AlertCircle className="w-5 h-5" />;
    }
  }

  function openInMaps(lat: number, lng: number, address: string) {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      window.open(`https://maps.google.com/?q=${lat},${lng}`);
    } else {
      window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
          <div className="text-center mb-8">
            <div className="bg-blue-600 text-white rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
              <User className="w-10 h-10" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Member Portal</h1>
            <p className="text-gray-600">Track your rides in real-time</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={loginPhone}
                onChange={(e) => setLoginPhone(e.target.value)}
                placeholder="(555) 123-4567"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                required
              />
            </div>

            {loginError && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            <p>Enter your registered phone number to access your rides</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pink-50">
      <div className="bg-blue-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Welcome, {patient?.full_name}</h1>
              <p className="text-blue-100 text-sm">{patient?.phone}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex gap-4 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`pb-4 px-2 font-semibold transition-colors relative ${
                activeTab === 'upcoming'
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Upcoming Rides
              {upcomingTrips.length > 0 && (
                <span className="ml-2 bg-blue-600 text-white text-xs rounded-full px-2 py-1">
                  {upcomingTrips.length}
                </span>
              )}
              {activeTab === 'upcoming' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`pb-4 px-2 font-semibold transition-colors relative ${
                activeTab === 'history'
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Ride History
              {activeTab === 'history' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('payment')}
              className={`pb-4 px-2 font-semibold transition-colors relative ${
                activeTab === 'payment'
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Payment Options
              {activeTab === 'payment' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`pb-4 px-2 font-semibold transition-colors relative flex items-center gap-2 ${
                activeTab === 'chat'
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Bot className="w-5 h-5" />
              AI Assistant
              {activeTab === 'chat' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </button>
          </div>
        </div>

        {activeTab === 'payment' ? (
          <PaymentQRCodes isAdminView={false} />
        ) : activeTab === 'chat' ? (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <Bot className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">AI Assistant</h2>
                    <p className="text-sm text-blue-100">Book trips, get quotes, or activate will-call rides</p>
                  </div>
                </div>
              </div>

              <div className="h-[500px] overflow-y-auto p-6 space-y-4 bg-gray-50">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-3 shadow-sm ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-900 border border-gray-200'
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm">
                      <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                    </div>
                  </div>
                )}
              </div>

              <form onSubmit={handleChatSubmit} className="border-t border-gray-200 p-4 bg-white">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type your message in English or Spanish..."
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={chatLoading}
                  />
                  <button
                    type="submit"
                    disabled={chatLoading || !chatInput.trim()}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Send className="w-5 h-5" />
                    Send
                  </button>
                </div>
              </form>
            </div>

            <div className="mt-6 grid md:grid-cols-2 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <Bot className="w-5 h-5" />
                  What I Can Help With
                </h3>
                <ul className="text-sm text-blue-800 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span>Book new medical transportation trips</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span>Activate your will-call ride when ready</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span>Get instant price quotes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span>Answer questions in English or Spanish</span>
                  </li>
                </ul>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-2">Quick Actions</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setChatInput("I need to book a ride")}
                    className="w-full text-left text-sm text-green-800 hover:text-green-900 hover:bg-green-100 px-3 py-2 rounded transition-colors"
                  >
                    Book a new ride
                  </button>
                  <button
                    onClick={() => setChatInput("I'm ready for pickup, please activate my will-call ride")}
                    className="w-full text-left text-sm text-green-800 hover:text-green-900 hover:bg-green-100 px-3 py-2 rounded transition-colors"
                  >
                    Activate will-call ride
                  </button>
                  <button
                    onClick={() => setChatInput("How much does it cost?")}
                    className="w-full text-left text-sm text-green-800 hover:text-green-900 hover:bg-green-100 px-3 py-2 rounded transition-colors"
                  >
                    Get price quote
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'upcoming' ? (
          <div className="space-y-4">
            {upcomingTrips.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Upcoming Rides</h3>
                <p className="text-gray-600">You don't have any scheduled rides at the moment.</p>
              </div>
            ) : (
              upcomingTrips.map((trip) => (
                <div
                  key={trip.id}
                  className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => setSelectedTrip(trip)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-5 h-5 text-gray-600" />
                        <span className="font-semibold text-gray-900">
                          {formatDate(trip.scheduled_pickup_time)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-gray-600" />
                        <span className="text-lg font-bold text-blue-600">
                          {formatTime(trip.scheduled_pickup_time)}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2">
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${getStatusColor(trip.status)}`}>
                          {getStatusIcon(trip.status)}
                          <span className="text-sm font-medium capitalize">
                            {trip.status.replace('_', ' ')}
                          </span>
                        </div>
                        {trip.status !== 'cancelled' && trip.status !== 'completed' && (
                          <button
                            onClick={(e) => handleDeleteTrip(trip.id, e)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Cancel ride"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                      {trip.trip_confirmations && trip.trip_confirmations.length > 0 && (
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          trip.trip_confirmations[0].confirmation_status === 'confirmed'
                            ? 'bg-green-100 text-green-800'
                            : trip.trip_confirmations[0].confirmation_status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {trip.trip_confirmations[0].confirmation_status === 'confirmed' ? (
                            <CheckCircle className="w-3 h-3" />
                          ) : (
                            <AlertCircle className="w-3 h-3" />
                          )}
                          <span>
                            {trip.trip_confirmations[0].confirmation_status === 'confirmed'
                              ? 'Confirmed'
                              : trip.trip_confirmations[0].confirmation_status === 'pending'
                              ? 'Awaiting Confirmation'
                              : trip.trip_confirmations[0].confirmation_status}
                          </span>
                        </div>
                      )}
                      {trip.trip_confirmations &&
                       trip.trip_confirmations.length > 0 &&
                       trip.trip_confirmations[0].confirmation_status === 'pending' &&
                       trip.status !== 'cancelled' && (
                        <button
                          onClick={(e) => handleConfirmTrip(trip, e)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Confirm Trip
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full mt-1.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm text-gray-600 mb-1">Pickup</p>
                        <p className="font-medium text-gray-900">{trip.pickup_address}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-3 h-3 bg-red-500 rounded-full mt-1.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm text-gray-600 mb-1">Dropoff</p>
                        <p className="font-medium text-gray-900">{trip.dropoff_address}</p>
                      </div>
                    </div>
                  </div>

                  {trip.driver && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Driver</p>
                            <p className="font-semibold text-gray-900">{trip.driver.full_name}</p>
                          </div>
                        </div>
                        {trip.vehicle && (
                          <div className="text-right">
                            <p className="text-sm text-gray-600">Vehicle</p>
                            <p className="font-semibold text-gray-900">
                              {trip.vehicle.color} {trip.vehicle.make} {trip.vehicle.model}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {pastTrips.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Ride History</h3>
                <p className="text-gray-600">Your completed rides will appear here.</p>
              </div>
            ) : (
              pastTrips.map((trip) => (
                <div
                  key={trip.id}
                  className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-5 h-5 text-gray-600" />
                        <span className="font-semibold text-gray-900">
                          {formatDate(trip.scheduled_pickup_time)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-gray-600" />
                        <span className="text-gray-700">{formatTime(trip.scheduled_pickup_time)}</span>
                      </div>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${getStatusColor(trip.status)}`}>
                      {getStatusIcon(trip.status)}
                      <span className="text-sm font-medium capitalize">
                        {trip.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full mt-1.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm text-gray-600">Pickup</p>
                        <p className="text-gray-900">{trip.pickup_address}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-3 h-3 bg-red-500 rounded-full mt-1.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm text-gray-600">Dropoff</p>
                        <p className="text-gray-900">{trip.dropoff_address}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {selectedTrip && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold">Ride Details</h3>
              <button
                onClick={() => setSelectedTrip(null)}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 text-lg">Trip Information</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-gray-600" />
                    <span className="text-gray-900">{formatDate(selectedTrip.scheduled_pickup_time)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-gray-600" />
                    <span className="text-gray-900">{formatTime(selectedTrip.scheduled_pickup_time)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-3 text-lg">Locations</h4>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-start gap-3 mb-2">
                      <div className="w-4 h-4 bg-green-500 rounded-full mt-1" />
                      <div className="flex-1">
                        <p className="text-sm text-gray-600 mb-1">Pickup Location</p>
                        <p className="font-medium text-gray-900">{selectedTrip.pickup_address}</p>
                      </div>
                    </div>
                    {selectedTrip.pickup_latitude && selectedTrip.pickup_longitude && (
                      <button
                        onClick={() =>
                          openInMaps(
                            selectedTrip.pickup_latitude!,
                            selectedTrip.pickup_longitude!,
                            selectedTrip.pickup_address
                          )
                        }
                        className="ml-7 text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                      >
                        <MapPin className="w-4 h-4" />
                        Open in Maps
                      </button>
                    )}
                  </div>

                  <div>
                    <div className="flex items-start gap-3 mb-2">
                      <div className="w-4 h-4 bg-red-500 rounded-full mt-1" />
                      <div className="flex-1">
                        <p className="text-sm text-gray-600 mb-1">Dropoff Location</p>
                        <p className="font-medium text-gray-900">{selectedTrip.dropoff_address}</p>
                      </div>
                    </div>
                    {selectedTrip.dropoff_latitude && selectedTrip.dropoff_longitude && (
                      <button
                        onClick={() =>
                          openInMaps(
                            selectedTrip.dropoff_latitude!,
                            selectedTrip.dropoff_longitude!,
                            selectedTrip.dropoff_address
                          )
                        }
                        className="ml-7 text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                      >
                        <MapPin className="w-4 h-4" />
                        Open in Maps
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {selectedTrip.driver && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 text-lg">Driver Information</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-lg">
                          {selectedTrip.driver.full_name}
                        </p>
                        <a
                          href={`tel:${selectedTrip.driver.phone}`}
                          className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm"
                        >
                          <Phone className="w-4 h-4" />
                          {selectedTrip.driver.phone}
                        </a>
                      </div>
                    </div>

                    {selectedTrip.driver.current_latitude && selectedTrip.driver.current_longitude && (
                      <button
                        onClick={() =>
                          openInMaps(
                            selectedTrip.driver!.current_latitude!,
                            selectedTrip.driver!.current_longitude!,
                            'Driver Location'
                          )
                        }
                        className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <Navigation className="w-4 h-4" />
                        Track Driver Location
                      </button>
                    )}
                  </div>
                </div>
              )}

              {selectedTrip.vehicle && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 text-lg">Vehicle Information</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Car className="w-6 h-6 text-gray-600 mt-1" />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 text-lg mb-1">
                          {selectedTrip.vehicle.year} {selectedTrip.vehicle.make}{' '}
                          {selectedTrip.vehicle.model}
                        </p>
                        <p className="text-gray-700 mb-1">
                          <span className="font-medium">Color:</span> {selectedTrip.vehicle.color}
                        </p>
                        <p className="text-gray-700">
                          <span className="font-medium">License Plate:</span>{' '}
                          <span className="font-mono bg-white px-2 py-1 rounded border border-gray-300">
                            {selectedTrip.vehicle.license_plate}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
              <button
                onClick={() => setSelectedTrip(null)}
                className="w-full bg-gray-600 text-white py-3 rounded-lg hover:bg-gray-700 transition-colors font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
