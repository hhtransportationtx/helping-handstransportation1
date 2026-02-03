import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Building2,
  Calendar,
  Users,
  Plus,
  Clock,
  MapPin,
  LogOut,
  X,
  User,
  Phone,
  Mail,
  Accessibility,
  FileText,
  Edit,
  Trash2
} from 'lucide-react';
import AddressAutocomplete from './AddressAutocomplete';
import { useGoogleMaps } from '../hooks/useGoogleMaps';

interface ClientPortal {
  id: string;
  organization_name: string;
  organization_type: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  api_key: string;
}

interface Patient {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  date_of_birth: string | null;
  medical_id: string | null;
  mobility_needs: string | null;
  special_instructions: string | null;
  address: string | null;
  status: string;
}

interface Trip {
  id: string;
  patient_id: string;
  scheduled_pickup_time: string;
  pickup_address: string;
  dropoff_address: string;
  status: string;
  notes: string | null;
  is_roundtrip: boolean;
  is_will_call: boolean;
  return_pickup_time: string | null;
  broker_name: string | null;
  distance_miles: number | null;
  patient?: Patient;
}

export default function ClientPortalLogin() {
  const { isLoaded: mapsLoaded } = useGoogleMaps();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);
  const [portal, setPortal] = useState<ClientPortal | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeTab, setActiveTab] = useState<'patients' | 'trips' | 'book'>('trips');
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [bookingForm, setBookingForm] = useState({
    patient_id: '',
    pickup_time: '',
    pickup_address: '',
    dropoff_address: '',
    notes: '',
    mobility_needs: '',
    is_roundtrip: false,
    is_will_call: false,
    return_pickup_time: '',
  });
  const [patientForm, setPatientForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    date_of_birth: '',
    medical_id: '',
    mobility_needs: '',
    special_instructions: '',
    address: '',
  });

  useEffect(() => {
    const savedPortal = localStorage.getItem('client_portal_auth');
    if (savedPortal) {
      const portalData = JSON.parse(savedPortal);
      setPortal(portalData);
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && portal) {
      loadPatients();
      loadTrips();
    }
  }, [isAuthenticated, portal]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError('');
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('client_portals')
        .select('*')
        .eq('api_key', apiKey.trim())
        .eq('status', 'active')
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setLoginError('Invalid API key or inactive account');
        return;
      }

      setPortal(data);
      setIsAuthenticated(true);
      localStorage.setItem('client_portal_auth', JSON.stringify(data));
    } catch (error) {
      console.error('Login error:', error);
      setLoginError('Error logging in. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function loadPatients() {
    if (!portal) return;

    try {
      const { data } = await supabase
        .from('patients')
        .select('*')
        .eq('client_portal_id', portal.id)
        .order('full_name', { ascending: true });

      setPatients(data || []);
    } catch (error) {
      console.error('Error loading patients:', error);
    }
  }

  async function loadTrips() {
    if (!portal) return;

    try {
      const { data: portalPatients } = await supabase
        .from('patients')
        .select('id')
        .eq('client_portal_id', portal.id);

      if (!portalPatients || portalPatients.length === 0) {
        setTrips([]);
        return;
      }

      const patientIds = portalPatients.map(p => p.id);

      const { data } = await supabase
        .from('trips')
        .select(`
          *,
          patient:patients(*)
        `)
        .in('patient_id', patientIds)
        .order('scheduled_pickup_time', { ascending: false })
        .limit(100);

      setTrips(data || []);
    } catch (error) {
      console.error('Error loading trips:', error);
    }
  }

  async function calculateDistance(origin: string, destination: string): Promise<number> {
    try {
      if (!window.google?.maps) {
        console.warn('Google Maps not loaded, skipping distance calculation');
        return 0;
      }

      const service = new google.maps.DistanceMatrixService();
      const response = await service.getDistanceMatrix({
        origins: [origin],
        destinations: [destination],
        travelMode: google.maps.TravelMode.DRIVING,
        unitSystem: google.maps.UnitSystem.IMPERIAL,
      });

      if (response.rows[0]?.elements[0]?.distance?.value) {
        const meters = response.rows[0].elements[0].distance.value;
        const miles = meters * 0.000621371;
        return Math.round(miles * 100) / 100;
      }
      return 0;
    } catch (error) {
      console.error('Error calculating distance:', error);
      return 0;
    }
  }

  async function handleBookTrip(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const distanceMiles = await calculateDistance(
        bookingForm.pickup_address,
        bookingForm.dropoff_address
      );

      const { error } = await supabase
        .from('trips')
        .insert([{
          patient_id: bookingForm.patient_id,
          pickup_address: bookingForm.pickup_address,
          dropoff_address: bookingForm.dropoff_address,
          scheduled_pickup_time: bookingForm.pickup_time,
          notes: bookingForm.notes,
          is_roundtrip: bookingForm.is_roundtrip,
          is_will_call: bookingForm.is_will_call,
          return_pickup_time: bookingForm.is_roundtrip && !bookingForm.is_will_call ? bookingForm.return_pickup_time : null,
          broker_name: 'Helping Hands Donation',
          distance_miles: distanceMiles,
          status: 'pending',
        }]);

      if (error) throw error;

      setShowBookingModal(false);
      setBookingForm({
        patient_id: '',
        pickup_time: '',
        pickup_address: '',
        dropoff_address: '',
        notes: '',
        mobility_needs: '',
        is_roundtrip: false,
        is_will_call: false,
        return_pickup_time: '',
      });
      loadTrips();
      alert('Trip booked successfully!');
    } catch (error) {
      console.error('Error booking trip:', error);
      alert('Failed to book trip. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSavePatient(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingPatient) {
        const { error } = await supabase
          .from('patients')
          .update({
            ...patientForm,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingPatient.id);

        if (error) throw error;
        alert('Patient updated successfully!');
      } else {
        const { error } = await supabase
          .from('patients')
          .insert([{
            ...patientForm,
            client_portal_id: portal?.id,
            status: 'active',
          }]);

        if (error) throw error;
        alert('Patient added successfully!');
      }

      setShowPatientModal(false);
      setEditingPatient(null);
      setPatientForm({
        full_name: '',
        phone: '',
        email: '',
        date_of_birth: '',
        medical_id: '',
        mobility_needs: '',
        special_instructions: '',
        address: '',
      });
      loadPatients();
    } catch (error) {
      console.error('Error saving patient:', error);
      alert('Failed to save patient. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeletePatient(patientId: string) {
    if (!confirm('Are you sure you want to delete this patient?')) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('patients')
        .delete()
        .eq('id', patientId);

      if (error) throw error;

      alert('Patient deleted successfully!');
      loadPatients();
    } catch (error) {
      console.error('Error deleting patient:', error);
      alert('Failed to delete patient. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function openPatientModal(patient?: Patient) {
    if (patient) {
      setEditingPatient(patient);
      setPatientForm({
        full_name: patient.full_name,
        phone: patient.phone,
        email: patient.email || '',
        date_of_birth: patient.date_of_birth || '',
        medical_id: patient.medical_id || '',
        mobility_needs: patient.mobility_needs || '',
        special_instructions: patient.special_instructions || '',
        address: patient.address || '',
      });
    } else {
      setEditingPatient(null);
      setPatientForm({
        full_name: '',
        phone: '',
        email: '',
        date_of_birth: '',
        medical_id: '',
        mobility_needs: '',
        special_instructions: '',
        address: '',
      });
    }
    setShowPatientModal(true);
  }

  function handleLogout() {
    setIsAuthenticated(false);
    setPortal(null);
    setPatients([]);
    setTrips([]);
    localStorage.removeItem('client_portal_auth');
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
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
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'assigned':
        return 'bg-purple-100 text-purple-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
          <div className="text-center mb-8">
            <div className="bg-blue-600 text-white rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-10 h-10" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Client Portal</h1>
            <p className="text-gray-600">Book and manage transportation for your facility</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Key
              </label>
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your API key"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-mono"
                required
              />
              <p className="text-xs text-gray-500 mt-2">
                Contact your administrator if you don't have an API key
              </p>
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
              <h1 className="text-2xl font-bold">{portal?.organization_name}</h1>
              <p className="text-blue-100 text-sm capitalize">
                {portal?.organization_type.replace('_', ' ')}
              </p>
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
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-4 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('trips')}
              className={`pb-4 px-4 font-semibold transition-colors relative ${
                activeTab === 'trips'
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Calendar className="w-5 h-5 inline-block mr-2" />
              Trips
              {activeTab === 'trips' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('patients')}
              className={`pb-4 px-4 font-semibold transition-colors relative ${
                activeTab === 'patients'
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users className="w-5 h-5 inline-block mr-2" />
              Patients
              {activeTab === 'patients' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </button>
          </div>

          {activeTab === 'trips' && (
            <button
              onClick={() => setShowBookingModal(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl"
            >
              <Plus className="w-5 h-5" />
              Book Trip
            </button>
          )}

          {activeTab === 'patients' && (
            <button
              onClick={() => openPatientModal()}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl"
            >
              <Plus className="w-5 h-5" />
              Add Patient
            </button>
          )}
        </div>

        {activeTab === 'trips' ? (
          <div className="space-y-4">
            {trips.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Trips</h3>
                <p className="text-gray-600 mb-4">You haven't booked any trips yet.</p>
                <button
                  onClick={() => setShowBookingModal(true)}
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-all"
                >
                  <Plus className="w-5 h-5" />
                  Book Your First Trip
                </button>
              </div>
            ) : (
              trips.map((trip) => (
                <div
                  key={trip.id}
                  className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <User className="w-5 h-5 text-gray-600" />
                        <span className="font-semibold text-gray-900 text-lg">
                          {trip.patient?.full_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(trip.scheduled_pickup_time)}</span>
                        <Clock className="w-4 h-4 ml-2" />
                        <span className="font-semibold">{formatTime(trip.scheduled_pickup_time)}</span>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(trip.status)}`}>
                      {trip.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="space-y-3 border-t pt-4">
                    <div className="flex items-start gap-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full mt-1.5" />
                      <div>
                        <p className="text-sm text-gray-600">Pickup</p>
                        <p className="font-medium text-gray-900">{trip.pickup_address}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-3 h-3 bg-red-500 rounded-full mt-1.5" />
                      <div>
                        <p className="text-sm text-gray-600">Dropoff</p>
                        <p className="font-medium text-gray-900">{trip.dropoff_address}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Building2 className="w-4 h-4" />
                      <span className="text-sm">
                        {trip.broker_name || 'Helping Hands Donation'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        {trip.distance_miles ? `${trip.distance_miles} mi` : '0 mi'}
                      </span>
                    </div>
                  </div>

                  {trip.is_roundtrip && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center gap-2 text-blue-600">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        <span className="font-medium">Roundtrip</span>
                        {trip.is_will_call ? (
                          <span className="text-sm text-gray-600">(Will Call)</span>
                        ) : trip.return_pickup_time ? (
                          <span className="text-sm text-gray-600">
                            Return: {formatTime(trip.return_pickup_time)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  )}

                  {trip.notes && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-gray-600">Notes</p>
                      <p className="text-gray-900">{trip.notes}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {patients.length === 0 ? (
              <div className="col-span-full bg-white rounded-lg shadow-md p-12 text-center">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Patients</h3>
                <p className="text-gray-600 mb-4">No patients have been added to your portal yet.</p>
                <button
                  onClick={() => openPatientModal()}
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-all"
                >
                  <Plus className="w-5 h-5" />
                  Add Your First Patient
                </button>
              </div>
            ) : (
              patients.map((patient) => (
                <div
                  key={patient.id}
                  className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{patient.full_name}</h3>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          patient.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {patient.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openPatientModal(patient)}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit patient"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePatient(patient.id)}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete patient"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {patient.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="w-4 h-4" />
                        {patient.phone}
                      </div>
                    )}
                    {patient.email && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="w-4 h-4" />
                        {patient.email}
                      </div>
                    )}
                    {patient.mobility_needs && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Accessibility className="w-4 h-4" />
                        {patient.mobility_needs}
                      </div>
                    )}
                    {patient.address && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        {patient.address}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setSelectedPatient(patient);
                      setBookingForm({
                        ...bookingForm,
                        patient_id: patient.id,
                        pickup_address: patient.address || '',
                        mobility_needs: patient.mobility_needs || '',
                      });
                      setShowBookingModal(true);
                    }}
                    className="w-full mt-4 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Book Trip
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {showBookingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">Book New Trip</h2>
              <button
                onClick={() => {
                  setShowBookingModal(false);
                  setSelectedPatient(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleBookTrip} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Patient
                </label>
                <select
                  required
                  value={bookingForm.patient_id}
                  onChange={(e) => {
                    const patient = patients.find(p => p.id === e.target.value);
                    setBookingForm({
                      ...bookingForm,
                      patient_id: e.target.value,
                      pickup_address: patient?.address || '',
                      mobility_needs: patient?.mobility_needs || '',
                    });
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a patient</option>
                  {patients.filter(p => p.status === 'active').map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pickup Date & Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={bookingForm.pickup_time}
                  onChange={(e) => setBookingForm({ ...bookingForm, pickup_time: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pickup Address
                </label>
                <AddressAutocomplete
                  required
                  value={bookingForm.pickup_address}
                  onChange={(value) => setBookingForm({ ...bookingForm, pickup_address: value })}
                  placeholder="Enter pickup address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dropoff Address
                </label>
                <AddressAutocomplete
                  required
                  value={bookingForm.dropoff_address}
                  onChange={(value) => setBookingForm({ ...bookingForm, dropoff_address: value })}
                  placeholder="Enter dropoff address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mobility Needs
                </label>
                <select
                  value={bookingForm.mobility_needs}
                  onChange={(e) => setBookingForm({ ...bookingForm, mobility_needs: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">None</option>
                  <option value="ambulatory">Ambulatory</option>
                  <option value="wheelchair">Wheelchair</option>
                  <option value="stretcher">Stretcher</option>
                  <option value="walker">Walker</option>
                </select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_roundtrip"
                    checked={bookingForm.is_roundtrip}
                    onChange={(e) => setBookingForm({
                      ...bookingForm,
                      is_roundtrip: e.target.checked,
                      is_will_call: e.target.checked ? bookingForm.is_will_call : false,
                      return_pickup_time: e.target.checked ? bookingForm.return_pickup_time : '',
                    })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="is_roundtrip" className="ml-2 text-sm font-medium text-gray-700">
                    Roundtrip (Need return ride)
                  </label>
                </div>

                {bookingForm.is_roundtrip && (
                  <>
                    <div className="flex items-center ml-6">
                      <input
                        type="checkbox"
                        id="is_will_call"
                        checked={bookingForm.is_will_call}
                        onChange={(e) => setBookingForm({
                          ...bookingForm,
                          is_will_call: e.target.checked,
                          return_pickup_time: e.target.checked ? '' : bookingForm.return_pickup_time,
                        })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="is_will_call" className="ml-2 text-sm font-medium text-gray-700">
                        Will Call (Patient will call when ready for return)
                      </label>
                    </div>

                    {!bookingForm.is_will_call && (
                      <div className="ml-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Return Pickup Time
                        </label>
                        <input
                          type="datetime-local"
                          required={bookingForm.is_roundtrip && !bookingForm.is_will_call}
                          value={bookingForm.return_pickup_time}
                          onChange={(e) => setBookingForm({ ...bookingForm, return_pickup_time: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    )}
                  </>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Special Instructions
                </label>
                <textarea
                  value={bookingForm.notes}
                  onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Any special instructions or notes"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 font-medium"
                >
                  {loading ? 'Booking...' : 'Book Trip'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowBookingModal(false);
                    setSelectedPatient(null);
                  }}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPatientModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingPatient ? 'Edit Patient' : 'Add New Patient'}
              </h2>
              <button
                onClick={() => {
                  setShowPatientModal(false);
                  setEditingPatient(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSavePatient} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={patientForm.full_name}
                  onChange={(e) => setPatientForm({ ...patientForm, full_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="John Doe"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={patientForm.phone}
                    onChange={(e) => setPatientForm({ ...patientForm, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={patientForm.email}
                    onChange={(e) => setPatientForm({ ...patientForm, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={patientForm.date_of_birth}
                    onChange={(e) => setPatientForm({ ...patientForm, date_of_birth: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Medical ID
                  </label>
                  <input
                    type="text"
                    value={patientForm.medical_id}
                    onChange={(e) => setPatientForm({ ...patientForm, medical_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="MED-12345"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <AddressAutocomplete
                  value={patientForm.address}
                  onChange={(value) => setPatientForm({ ...patientForm, address: value })}
                  placeholder="123 Main St, City, State 12345"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mobility Needs
                </label>
                <select
                  value={patientForm.mobility_needs}
                  onChange={(e) => setPatientForm({ ...patientForm, mobility_needs: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">None</option>
                  <option value="ambulatory">Ambulatory</option>
                  <option value="wheelchair">Wheelchair</option>
                  <option value="stretcher">Stretcher</option>
                  <option value="walker">Walker</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Special Instructions
                </label>
                <textarea
                  value={patientForm.special_instructions}
                  onChange={(e) => setPatientForm({ ...patientForm, special_instructions: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Any special care instructions or notes"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 font-medium"
                >
                  {loading ? 'Saving...' : editingPatient ? 'Update Patient' : 'Add Patient'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPatientModal(false);
                    setEditingPatient(null);
                  }}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
