import { useState, useEffect, useRef } from 'react';
import { supabase, Trip, Patient, Profile, Vehicle } from '../lib/supabase';
import { X, Save, Plus, MapPin, Calendar } from 'lucide-react';
import { useGoogleMaps } from '../hooks/useGoogleMaps';

type TripModalProps = {
  trip: Trip | null;
  onClose: () => void;
  onSave?: () => void;
};

type FundingSource = {
  id: string;
  name: string;
  code: string;
};

type SpaceType = {
  id: string;
  name: string;
  level_of_service: string;
};

type ServiceArea = {
  id: string;
  name: string;
};

export function TripModal({ trip, onClose, onSave }: TripModalProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [drivers, setDrivers] = useState<Profile[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [fundingSources, setFundingSources] = useState<FundingSource[]>([]);
  const [spaceTypes, setSpaceTypes] = useState<SpaceType[]>([]);
  const [serviceAreas, setServiceAreas] = useState<ServiceArea[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showQuickAddPatient, setShowQuickAddPatient] = useState(false);
  const [quickPatientData, setQuickPatientData] = useState({
    full_name: '',
    phone: '',
    email: '',
    date_of_birth: '',
    gender: '',
    address: '',
    apt_suite_room: '',
    city: '',
    state: '',
    zip_code: '',
    medical_id: '',
    mobility_needs: '',
    weight: '',
    stairs_steps: '',
    covid_status: 'negative',
    member_type: 'regular',
    funding_source: '',
    space_type: '',
    preferred_driver: '',
    sms_required: false,
    not_carpool: false,
    private_note: '',
    note: '',
  });
  const [savingPatient, setSavingPatient] = useState(false);
  const { isLoaded: isMapsLoaded } = useGoogleMaps();

  const pickupAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const dropoffAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const pickupInputRef = useRef<HTMLInputElement>(null);
  const dropoffInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    patient_id: trip?.patient_id || '',
    driver_id: trip?.driver_id || '',
    vehicle_id: trip?.vehicle_id || '',
    display_name: '',
    contact_number: '',
    phone_number: '',
    weight: '',
    email: '',
    date_of_birth: '',
    gender: '',
    client_id: '',
    authorization_number: '',
    ipa_feca_number: '',
    insurance_id: trip?.insurance_id || '',
    primary_diagnosis: trip?.primary_diagnosis || '',
    trip_id: '',
    funding_source: trip?.funding_source || '',
    space_type: trip?.space_type || '',
    pickup_address: trip?.pickup_address || '',
    pickup_time: trip?.scheduled_pickup_time
      ? new Date(trip.scheduled_pickup_time).toISOString().slice(0, 16)
      : '',
    pickup_floor: '',
    pickup_room: '',
    pickup_facility_name: '',
    pickup_phone: '',
    service_area: trip?.service_area || '',
    dropoff_address: trip?.dropoff_address || '',
    dropoff_floor: '',
    dropoff_room: '',
    dropoff_facility_name: '',
    dropoff_phone: '',
    status: trip?.status || 'scheduled',
    trip_type: trip?.trip_type || 'round_trip',
    notes: trip?.notes || '',
  });

  useEffect(() => {
    alert('TripModal mounted - about to load data');
    loadData();
  }, []);

  useEffect(() => {
    if (trip?.patient_id) {
      loadPatientData(trip.patient_id);
    }
  }, [trip]);

  useEffect(() => {
    if (isMapsLoaded) {
      setupAutocomplete();
    }
  }, [isMapsLoaded]);

  async function loadData() {
    try {
      const [patientsRes, driversRes, vehiclesRes, fundingRes, spaceTypesRes, serviceAreasRes] = await Promise.all([
        supabase.from('patients').select('*').order('full_name'),
        supabase.from('profiles').select('*').eq('role', 'driver'),
        supabase.from('vehicles').select('*').eq('status', 'available'),
        supabase.from('funding_sources').select('*').eq('status', 'active').order('name'),
        supabase.from('space_types').select('*').eq('status', 'active').order('name'),
        supabase.from('service_areas').select('*').eq('status', 'active').order('name'),
      ]);

      if (patientsRes.data) setPatients(patientsRes.data);
      if (driversRes.data) setDrivers(driversRes.data);
      if (vehiclesRes.data) setVehicles(vehiclesRes.data);
      if (fundingRes.data) {
        console.log('Funding sources loaded:', fundingRes.data);
        alert(`FUNDING SOURCES: Found ${fundingRes.data.length} - ${JSON.stringify(fundingRes.data.map(f => f.name))}`);
        setFundingSources(fundingRes.data);
      }
      if (fundingRes.error) {
        console.error('Error loading funding sources:', fundingRes.error);
        alert('ERROR loading funding sources: ' + JSON.stringify(fundingRes.error));
      }
      if (spaceTypesRes.data) setSpaceTypes(spaceTypesRes.data);
      if (serviceAreasRes.data) setServiceAreas(serviceAreasRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  async function loadPatientData(patientId: string) {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setSelectedPatient(data);
        setFormData(prev => ({
          ...prev,
          patient_id: data.id,
          display_name: data.full_name || '',
          phone_number: data.phone || '',
          email: data.email || '',
          date_of_birth: data.date_of_birth || '',
          client_id: data.medical_id || '',
        }));
      }
    } catch (error) {
      console.error('Error loading patient:', error);
    }
  }

  async function handleQuickAddPatient() {
    if (!quickPatientData.full_name || !quickPatientData.phone) {
      alert('Please enter at least name and phone number');
      return;
    }

    setSavingPatient(true);
    try {
      const fullAddress = [
        quickPatientData.address,
        quickPatientData.apt_suite_room,
        quickPatientData.city,
        quickPatientData.state,
        quickPatientData.zip_code
      ].filter(Boolean).join(', ');

      const { data, error } = await supabase
        .from('patients')
        .insert({
          full_name: quickPatientData.full_name,
          phone: quickPatientData.phone,
          email: quickPatientData.email || null,
          date_of_birth: quickPatientData.date_of_birth || null,
          gender: quickPatientData.gender || null,
          address: fullAddress || null,
          medical_id: quickPatientData.medical_id || null,
          mobility_needs: quickPatientData.mobility_needs || null,
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;

      await loadData();

      if (data) {
        await loadPatientData(data.id);
        setSearchQuery('');
      }

      setShowQuickAddPatient(false);
      setQuickPatientData({
        full_name: '',
        phone: '',
        email: '',
        date_of_birth: '',
        gender: '',
        address: '',
        apt_suite_room: '',
        city: '',
        state: '',
        zip_code: '',
        medical_id: '',
        mobility_needs: '',
        weight: '',
        stairs_steps: '',
        covid_status: 'negative',
        member_type: 'regular',
        funding_source: '',
        space_type: '',
        preferred_driver: '',
        sms_required: false,
        not_carpool: false,
        private_note: '',
        note: '',
      });
    } catch (error) {
      console.error('Error creating patient:', error);
      alert('Error creating patient');
    } finally {
      setSavingPatient(false);
    }
  }

  function setupAutocomplete() {
    if (!window.google?.maps?.places) return;

    if (pickupInputRef.current && !pickupAutocompleteRef.current) {
      pickupAutocompleteRef.current = new google.maps.places.Autocomplete(pickupInputRef.current, {
        types: ['address'],
      });

      pickupAutocompleteRef.current.addListener('place_changed', () => {
        const place = pickupAutocompleteRef.current?.getPlace();
        if (place?.formatted_address) {
          setFormData(prev => ({
            ...prev,
            pickup_address: place.formatted_address || '',
          }));
        }
      });
    }

    if (dropoffInputRef.current && !dropoffAutocompleteRef.current) {
      dropoffAutocompleteRef.current = new google.maps.places.Autocomplete(dropoffInputRef.current, {
        types: ['address'],
      });

      dropoffAutocompleteRef.current.addListener('place_changed', () => {
        const place = dropoffAutocompleteRef.current?.getPlace();
        if (place?.formatted_address) {
          setFormData(prev => ({
            ...prev,
            dropoff_address: place.formatted_address || '',
          }));
        }
      });
    }
  }

  function handlePatientSelect(patientId: string) {
    const patient = patients.find(p => p.id === patientId);
    if (patient) {
      setSelectedPatient(patient);
      setFormData(prev => ({
        ...prev,
        patient_id: patient.id,
        display_name: patient.full_name || '',
        phone_number: patient.phone || '',
        email: patient.email || '',
        date_of_birth: patient.date_of_birth || '',
        client_id: patient.medical_id || '',
      }));
    }
  }

  function calculateMiles() {
    alert('Calculate miles feature coming soon');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const tripData = {
        patient_id: formData.patient_id,
        driver_id: formData.driver_id || null,
        vehicle_id: formData.vehicle_id || null,
        pickup_address: formData.pickup_address,
        dropoff_address: formData.dropoff_address,
        scheduled_pickup_time: formData.pickup_time,
        funding_source: formData.funding_source,
        space_type: formData.space_type,
        service_area: formData.service_area,
        status: formData.status,
        trip_type: formData.trip_type,
        notes: formData.notes,
        insurance_id: formData.insurance_id,
        primary_diagnosis: formData.primary_diagnosis,
        ipa_feca_number: formData.ipa_feca_number,
        updated_at: new Date().toISOString(),
      };

      if (trip) {
        const { error } = await supabase
          .from('trips')
          .update(tripData)
          .eq('id', trip.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('trips').insert(tripData);
        if (error) throw error;
      }

      if (onSave) onSave();
      onClose();
    } catch (error) {
      console.error('Error saving trip:', error);
      alert('Error saving trip');
    } finally {
      setLoading(false);
    }
  }

  const filteredPatients = searchQuery
    ? patients.filter(p =>
        p.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.phone?.includes(searchQuery)
      )
    : patients;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900">
            {trip ? 'Edit Trip' : 'Add'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Member
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Search Member"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowQuickAddPatient(true)}
                    className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    title="Add new member"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {searchQuery && (
                  <div className="mt-2 border border-gray-300 rounded-md max-h-40 overflow-y-auto bg-white shadow-lg">
                    {filteredPatients.map((patient) => (
                      <button
                        key={patient.id}
                        type="button"
                        onClick={() => {
                          handlePatientSelect(patient.id);
                          setSearchQuery('');
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                      >
                        {patient.full_name} - {patient.phone}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Funding Source
                </label>
                <select
                  value={formData.funding_source}
                  onChange={(e) => setFormData({ ...formData, funding_source: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="">-- Select Funding Source --</option>
                  {fundingSources.map((source) => (
                    <option key={source.id} value={source.code}>
                      {source.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Level of Service <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.space_type}
                  onChange={(e) => setFormData({ ...formData, space_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium"
                  required
                >
                  <option value="">-- Select Level of Service --</option>
                  {spaceTypes.map((type) => (
                    <option key={type.id} value={type.level_of_service}>
                      {type.level_of_service} - {type.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">AMB = Ambulatory, WAV = Wheelchair</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Number
                </label>
                <input
                  type="tel"
                  value={formData.contact_number}
                  onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                  placeholder="0000000000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Weight
                </label>
                <input
                  type="text"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gender
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="">-- Select Gender --</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client ID / Member ID / MA# / AHCCCS#
                </label>
                <input
                  type="text"
                  value={formData.client_id}
                  onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Authorization Number
                </label>
                <input
                  type="text"
                  value={formData.authorization_number}
                  onChange={(e) => setFormData({ ...formData, authorization_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  IPA / FECA Number
                </label>
                <input
                  type="text"
                  value={formData.ipa_feca_number}
                  onChange={(e) => setFormData({ ...formData, ipa_feca_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Insurance ID
                </label>
                <input
                  type="text"
                  value={formData.insurance_id}
                  onChange={(e) => setFormData({ ...formData, insurance_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Diagnosis
                </label>
                <input
                  type="text"
                  value={formData.primary_diagnosis}
                  onChange={(e) => setFormData({ ...formData, primary_diagnosis: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Trip ID
                </label>
                <input
                  type="text"
                  value={formData.trip_id}
                  onChange={(e) => setFormData({ ...formData, trip_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={calculateMiles}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Get Miles
              </button>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Pickup</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time
                  </label>
                  <div className="relative">
                    <input
                      type="datetime-local"
                      value={formData.pickup_time}
                      onChange={(e) => setFormData({ ...formData, pickup_time: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      required
                    />
                    <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service Area
                  </label>
                  <select
                    value={formData.service_area}
                    onChange={(e) => setFormData({ ...formData, service_area: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="">-- Select Service Area --</option>
                    {serviceAreas.map((area) => (
                      <option key={area.id} value={area.name}>
                        {area.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <div className="relative">
                  <input
                    ref={pickupInputRef}
                    type="text"
                    value={formData.pickup_address}
                    onChange={(e) => setFormData({ ...formData, pickup_address: e.target.value })}
                    placeholder="14852 tierra f"
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    required
                  />
                  <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Floor
                  </label>
                  <input
                    type="text"
                    value={formData.pickup_floor}
                    onChange={(e) => setFormData({ ...formData, pickup_floor: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Room
                  </label>
                  <input
                    type="text"
                    value={formData.pickup_room}
                    onChange={(e) => setFormData({ ...formData, pickup_room: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Home/Facility Name
                  </label>
                  <input
                    type="text"
                    value={formData.pickup_facility_name}
                    onChange={(e) => setFormData({ ...formData, pickup_facility_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.pickup_phone}
                    onChange={(e) => setFormData({ ...formData, pickup_phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Dropoff</h3>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <div className="relative">
                  <input
                    ref={dropoffInputRef}
                    type="text"
                    value={formData.dropoff_address}
                    onChange={(e) => setFormData({ ...formData, dropoff_address: e.target.value })}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    required
                  />
                  <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Floor
                  </label>
                  <input
                    type="text"
                    value={formData.dropoff_floor}
                    onChange={(e) => setFormData({ ...formData, dropoff_floor: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Room
                  </label>
                  <input
                    type="text"
                    value={formData.dropoff_room}
                    onChange={(e) => setFormData({ ...formData, dropoff_room: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Home/Facility Name
                  </label>
                  <input
                    type="text"
                    value={formData.dropoff_facility_name}
                    onChange={(e) => setFormData({ ...formData, dropoff_facility_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.dropoff_phone}
                    onChange={(e) => setFormData({ ...formData, dropoff_phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-md font-medium text-gray-700 hover:bg-gray-100 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : 'Save Trip'}
            </button>
          </div>
        </form>
      </div>

      {showQuickAddPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between flex-shrink-0">
              <h3 className="text-lg font-semibold">Add Member</h3>
              <button
                onClick={() => setShowQuickAddPatient(false)}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={quickPatientData.full_name}
                      onChange={(e) => setQuickPatientData({ ...quickPatientData, full_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="Enter full name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={quickPatientData.phone}
                      onChange={(e) => setQuickPatientData({ ...quickPatientData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="Enter contact number"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={quickPatientData.email}
                      onChange={(e) => setQuickPatientData({ ...quickPatientData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="Enter email"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={quickPatientData.date_of_birth}
                      onChange={(e) => setQuickPatientData({ ...quickPatientData, date_of_birth: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Gender
                    </label>
                    <select
                      value={quickPatientData.gender}
                      onChange={(e) => setQuickPatientData({ ...quickPatientData, gender: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      <option value="">-- Select Gender --</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Medical ID
                    </label>
                    <input
                      type="text"
                      value={quickPatientData.medical_id}
                      onChange={(e) => setQuickPatientData({ ...quickPatientData, medical_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="Enter medical ID"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address
                    </label>
                    <input
                      type="text"
                      value={quickPatientData.address}
                      onChange={(e) => setQuickPatientData({ ...quickPatientData, address: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="Enter a location"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      APT/SUITE/ROOM
                    </label>
                    <input
                      type="text"
                      value={quickPatientData.apt_suite_room}
                      onChange={(e) => setQuickPatientData({ ...quickPatientData, apt_suite_room: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      value={quickPatientData.city}
                      onChange={(e) => setQuickPatientData({ ...quickPatientData, city: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      State
                    </label>
                    <input
                      type="text"
                      value={quickPatientData.state}
                      onChange={(e) => setQuickPatientData({ ...quickPatientData, state: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Zip Code
                    </label>
                    <input
                      type="text"
                      value={quickPatientData.zip_code}
                      onChange={(e) => setQuickPatientData({ ...quickPatientData, zip_code: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Funding Source
                    </label>
                    <select
                      value={quickPatientData.funding_source}
                      onChange={(e) => setQuickPatientData({ ...quickPatientData, funding_source: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      <option value="">-- Select Funding Source --</option>
                      {fundingSources.map((source) => (
                        <option key={source.id} value={source.code}>
                          {source.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Member Type
                    </label>
                    <select
                      value={quickPatientData.member_type}
                      onChange={(e) => setQuickPatientData({ ...quickPatientData, member_type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      <option value="regular">Regular</option>
                      <option value="vip">VIP</option>
                      <option value="special_needs">Special Needs</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Level of Service
                    </label>
                    <select
                      value={quickPatientData.space_type}
                      onChange={(e) => setQuickPatientData({ ...quickPatientData, space_type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium"
                    >
                      <option value="">-- Select Level of Service --</option>
                      {spaceTypes.map((type) => (
                        <option key={type.id} value={type.level_of_service}>
                          {type.level_of_service} - {type.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Weight
                    </label>
                    <input
                      type="text"
                      value={quickPatientData.weight}
                      onChange={(e) => setQuickPatientData({ ...quickPatientData, weight: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="Enter weight"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Stairs step/s
                    </label>
                    <input
                      type="text"
                      value={quickPatientData.stairs_steps}
                      onChange={(e) => setQuickPatientData({ ...quickPatientData, stairs_steps: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Covid Status
                    </label>
                    <select
                      value={quickPatientData.covid_status}
                      onChange={(e) => setQuickPatientData({ ...quickPatientData, covid_status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      <option value="negative">Negative</option>
                      <option value="positive">Positive</option>
                      <option value="recovered">Recovered</option>
                      <option value="vaccinated">Vaccinated</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mobility Needs
                    </label>
                    <select
                      value={quickPatientData.mobility_needs}
                      onChange={(e) => setQuickPatientData({ ...quickPatientData, mobility_needs: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      <option value="">-- Select Mobility --</option>
                      <option value="ambulatory">Ambulatory</option>
                      <option value="wheelchair">Wheelchair</option>
                      <option value="stretcher">Stretcher</option>
                      <option value="walker">Walker</option>
                      <option value="cane">Cane</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Preferred Driver
                    </label>
                    <select
                      value={quickPatientData.preferred_driver}
                      onChange={(e) => setQuickPatientData({ ...quickPatientData, preferred_driver: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      <option value="">-- Select Preferred Driver --</option>
                      {drivers.map((driver) => (
                        <option key={driver.id} value={driver.id}>
                          {driver.full_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SMS Required
                    </label>
                    <select
                      value={quickPatientData.sms_required ? 'yes' : 'no'}
                      onChange={(e) => setQuickPatientData({ ...quickPatientData, sms_required: e.target.value === 'yes' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Private Note
                    </label>
                    <textarea
                      value={quickPatientData.private_note}
                      onChange={(e) => setQuickPatientData({ ...quickPatientData, private_note: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Note
                    </label>
                    <textarea
                      value={quickPatientData.note}
                      onChange={(e) => setQuickPatientData({ ...quickPatientData, note: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="not_carpool"
                    checked={quickPatientData.not_carpool}
                    onChange={(e) => setQuickPatientData({ ...quickPatientData, not_carpool: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="not_carpool" className="text-sm font-medium text-gray-700">
                    Not Carpool
                  </label>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3 bg-gray-50 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowQuickAddPatient(false)}
                className="px-6 py-2 border border-gray-300 rounded-md font-medium text-gray-700 hover:bg-gray-100 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleQuickAddPatient}
                disabled={savingPatient}
                className="px-6 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" />
                {savingPatient ? 'Creating...' : 'Create Member'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}