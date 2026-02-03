import { useState, useEffect, useRef } from 'react';
import { supabase, Trip, Patient, Profile } from '../lib/supabase';
import {
  Search,
  Calendar,
  Clock,
  RefreshCw,
  MapPin,
  Phone,
  Car,
  DollarSign,
  FileText,
  CheckCircle2,
  Grid3x3,
  List,
  Plus,
  MoreVertical,
  Anchor,
  Building2,
  Download,
  Upload,
  Users,
  Package,
  TrendingUp
} from 'lucide-react';
import { TripModal } from './TripModal';
import { TripDetailsModal } from './TripDetailsModal';
import ClosestDriverAssignment from './ClosestDriverAssignment';
import TripExport from './TripExport';
import BrokerCSVImport from './BrokerCSVImport';
import BrokerTextImport from './BrokerTextImport';

interface TripWithDetails extends Trip {
  patients?: Patient;
  profiles?: Profile;
}

type StatusFilter = 'all' | 'unassigned' | 'assigned' | 'in_progress' | 'cancelled' | 'archived' | 'completed';
type TopTab = 'trips' | 'offered' | 'drivers_load' | 'buckets' | 'standing_orders' | 'trip_sheet' | 'dirt_road' | 'new_trip';

export function TripsManagement() {
  const [trips, setTrips] = useState<TripWithDetails[]>([]);
  const [filteredTrips, setFilteredTrips] = useState<TripWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('unassigned');
  const [activeTab, setActiveTab] = useState<TopTab>('trips');
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [timeFrom, setTimeFrom] = useState('00:00');
  const [timeTo, setTimeTo] = useState('23:59:59');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedMember, setSelectedMember] = useState('all');
  const [selectedSpaceType, setSelectedSpaceType] = useState('all');
  const [selectedAppointmentType, setSelectedAppointmentType] = useState('all');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; trip: TripWithDetails } | null>(null);
  const [showTripModal, setShowTripModal] = useState(false);
  const [showTripDetailsModal, setShowTripDetailsModal] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<TripWithDetails | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [tripToAssign, setTripToAssign] = useState<TripWithDetails | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showTextImportModal, setShowTextImportModal] = useState(false);
  const [drivers, setDrivers] = useState<Profile[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [selectedDriverDate, setSelectedDriverDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [driverTrips, setDriverTrips] = useState<TripWithDetails[]>([]);
  const [loadingDriverTrips, setLoadingDriverTrips] = useState(false);
  const [showFiltersDropdown, setShowFiltersDropdown] = useState(false);
  const [selectedFundingSource, setSelectedFundingSource] = useState('all');
  const [selectedLevelOfService, setSelectedLevelOfService] = useState('all');
  const [selectedServiceArea, setSelectedServiceArea] = useState('all');
  const [filterManualTrip, setFilterManualTrip] = useState(false);
  const [filterMarketplaceTrip, setFilterMarketplaceTrip] = useState(false);
  const [filterGroupByName, setFilterGroupByName] = useState(false);
  const [filterFarmout, setFilterFarmout] = useState(false);
  const [filterStandingOrders, setFilterStandingOrders] = useState(false);
  const [fundingSources, setFundingSources] = useState<any[]>([]);
  const [serviceAreas, setServiceAreas] = useState<any[]>([]);

  const contextMenuRef = useRef<HTMLDivElement>(null);
  const filtersDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadTrips();
    loadPatients();
    loadDrivers();
    loadFundingSources();
    loadServiceAreas();

    const subscription = supabase
      .channel('trips_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trips' },
        () => {
          loadTrips();
          if (activeTab === 'drivers_load' && selectedDriverId) {
            loadDriverTrips();
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        filtersDropdownRef.current &&
        !filtersDropdownRef.current.contains(event.target as Node)
      ) {
        setShowFiltersDropdown(false);
      }
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(event.target as Node)
      ) {
        setContextMenu(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'drivers_load' && selectedDriverId && selectedDriverDate) {
      loadDriverTrips();
    }
  }, [selectedDriverId, selectedDriverDate, activeTab]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        loadTrips();
      }, 10000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  useEffect(() => {
    filterTrips();
  }, [trips, searchQuery, statusFilter, dateFrom, dateTo, timeFrom, timeTo, selectedMember, selectedSpaceType, selectedAppointmentType, selectedFundingSource, selectedServiceArea]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  async function loadTrips() {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select(`
          *,
          patients (*),
          profiles (*)
        `)
        .order('scheduled_pickup_time', { ascending: true });

      if (error) throw error;
      setTrips(data || []);
    } catch (error) {
      console.error('Error loading trips:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadPatients() {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('full_name');

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error('Error loading patients:', error);
    }
  }

  async function loadDrivers() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, phone, status')
        .eq('role', 'driver')
        .order('full_name');

      if (error) throw error;
      setDrivers(data || []);
    } catch (error) {
      console.error('Error loading drivers:', error);
    }
  }

  async function loadFundingSources() {
    try {
      const { data, error } = await supabase
        .from('funding_sources')
        .select('*')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setFundingSources(data || []);
    } catch (error) {
      console.error('Error loading funding sources:', error);
    }
  }

  async function loadServiceAreas() {
    try {
      const { data, error } = await supabase
        .from('service_areas')
        .select('*')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setServiceAreas(data || []);
    } catch (error) {
      console.error('Error loading service areas:', error);
    }
  }

  async function loadDriverTrips() {
    if (!selectedDriverId || !selectedDriverDate) return;

    setLoadingDriverTrips(true);

    try {
      const { data, error } = await supabase
        .from('trips')
        .select(`
          *,
          patients (*),
          profiles (*)
        `)
        .eq('driver_id', selectedDriverId)
        .order('scheduled_pickup_time');

      if (error) throw error;

      const filteredTrips = (data || []).filter(trip => {
        const tripDate = new Date(trip.scheduled_pickup_time).toISOString().split('T')[0];
        return tripDate === selectedDriverDate;
      });

      setDriverTrips(filteredTrips);
    } catch (error) {
      console.error('Error loading driver trips:', error);
    } finally {
      setLoadingDriverTrips(false);
    }
  }

  function filterTrips() {
    let filtered = [...trips];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (trip) =>
          trip.trip_number?.toLowerCase().includes(query) ||
          trip.patients?.full_name.toLowerCase().includes(query) ||
          trip.pickup_address.toLowerCase().includes(query) ||
          trip.dropoff_address.toLowerCase().includes(query) ||
          trip.county?.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'unassigned') {
        filtered = filtered.filter((trip) => !trip.driver_id && trip.status !== 'cancelled' && trip.status !== 'completed');
      } else if (statusFilter === 'assigned') {
        filtered = filtered.filter((trip) => trip.driver_id && trip.status === 'assigned');
      } else if (statusFilter === 'archived') {
        filtered = filtered.filter((trip) => trip.status === 'cancelled' || trip.status === 'completed');
      } else {
        filtered = filtered.filter((trip) => trip.status === statusFilter);
      }
    }

    if (selectedMember !== 'all') {
      filtered = filtered.filter((trip) => trip.patient_id === selectedMember);
    }

    if (selectedSpaceType !== 'all') {
      filtered = filtered.filter((trip) => trip.space_type === selectedSpaceType);
    }

    if (selectedAppointmentType !== 'all') {
      filtered = filtered.filter((trip) => trip.appointment_type === selectedAppointmentType);
    }

    if (selectedFundingSource !== 'all') {
      filtered = filtered.filter((trip) => trip.funding_source_id === selectedFundingSource);
    }

    if (selectedServiceArea !== 'all') {
      filtered = filtered.filter((trip) => trip.service_area_id === selectedServiceArea);
    }

    const fromDateTime = new Date(`${dateFrom}T${timeFrom}`).getTime();
    const toDateTime = new Date(`${dateTo}T${timeTo}`).getTime();

    filtered = filtered.filter((trip) => {
      const tripTime = new Date(trip.scheduled_pickup_time).getTime();
      return tripTime >= fromDateTime && tripTime <= toDateTime;
    });

    setFilteredTrips(filtered);
  }

  function handleContextMenu(e: React.MouseEvent, trip: TripWithDetails) {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      trip,
    });
  }

  async function updateTrip(id: string, updates: Partial<Trip>) {
    const { error } = await supabase
      .from('trips')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    await loadTrips();
  }

  async function handleLoadedTime(tripId: string) {
    try {
      const { error } = await supabase
        .from('trips')
        .update({ loaded_time: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', tripId);

      if (error) throw error;
      await loadTrips();
    } catch (error) {
      console.error('Error updating loaded time:', error);
      alert('Failed to update loaded time');
    }
  }

  function formatTime(dateString: string): string {
    return new Date(dateString).toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  function getStatusCounts() {
    const fromDateTime = new Date(`${dateFrom}T${timeFrom}`).getTime();
    const toDateTime = new Date(`${dateTo}T${timeTo}`).getTime();

    const dateFilteredTrips = trips.filter((trip) => {
      const tripTime = new Date(trip.scheduled_pickup_time).getTime();
      return tripTime >= fromDateTime && tripTime <= toDateTime;
    });

    return {
      all: dateFilteredTrips.length,
      unassigned: dateFilteredTrips.filter((t) => !t.driver_id && t.status !== 'cancelled' && t.status !== 'completed' && t.status !== 'pending').length,
      assigned: dateFilteredTrips.filter((t) => t.driver_id && t.status === 'assigned').length,
      in_progress: dateFilteredTrips.filter((t) => t.status === 'in-progress').length,
      cancelled: dateFilteredTrips.filter((t) => t.status === 'cancelled').length,
      archived: dateFilteredTrips.filter((t) => t.status === 'cancelled' || t.status === 'completed').length,
      completed: dateFilteredTrips.filter((t) => t.status === 'completed').length,
    };
  }

  const statusCounts = getStatusCounts();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading trips...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-2">
        <div className="flex gap-6 text-sm">
          <button
            onClick={() => setActiveTab('trips')}
            className={`px-3 py-2 font-semibold border-b-2 transition-colors ${
              activeTab === 'trips' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Trips
          </button>
          <button
            onClick={() => setActiveTab('offered')}
            className={`px-3 py-2 font-semibold border-b-2 transition-colors ${
              activeTab === 'offered' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Offered
          </button>
          <button
            onClick={() => setActiveTab('drivers_load')}
            className={`px-3 py-2 font-semibold border-b-2 transition-colors ${
              activeTab === 'drivers_load' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Drivers Load
          </button>
          <button
            onClick={() => setActiveTab('buckets')}
            className={`px-3 py-2 font-semibold border-b-2 transition-colors ${
              activeTab === 'buckets' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Buckets
          </button>
          <button
            onClick={() => setActiveTab('standing_orders')}
            className={`px-3 py-2 font-semibold border-b-2 transition-colors ${
              activeTab === 'standing_orders' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Standing Orders
          </button>
          <button
            onClick={() => setActiveTab('trip_sheet')}
            className={`px-3 py-2 font-semibold border-b-2 transition-colors ${
              activeTab === 'trip_sheet' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Trip Sheet
          </button>
          <button
            onClick={() => setActiveTab('dirt_road')}
            className={`px-3 py-2 font-semibold border-b-2 transition-colors ${
              activeTab === 'dirt_road' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Dirt Road
          </button>
          <button
            onClick={() => {
              setActiveTab('new_trip');
              setSelectedTrip(null);
              setShowTripModal(true);
            }}
            className={`px-3 py-2 font-semibold border-b-2 transition-colors ${
              activeTab === 'new_trip' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            New Trip
          </button>
        </div>
      </div>

      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 relative max-w-xs">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          <div className="flex items-center gap-2 border border-gray-300 rounded-md px-3 py-2">
            <Calendar className="text-gray-400 w-4 h-4" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="border-0 p-0 focus:ring-0 text-sm w-28"
            />
            <span className="text-gray-400">-</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="border-0 p-0 focus:ring-0 text-sm w-28"
            />
          </div>

          <div className="flex items-center gap-2 border border-gray-300 rounded-md px-3 py-2">
            <input
              type="time"
              value={timeFrom}
              onChange={(e) => setTimeFrom(e.target.value)}
              className="border-0 p-0 focus:ring-0 text-sm w-20"
            />
            <span className="text-gray-400">-</span>
            <input
              type="time"
              value={timeTo}
              onChange={(e) => setTimeTo(e.target.value)}
              className="border-0 p-0 focus:ring-0 text-sm w-20"
            />
          </div>

          <button
            onClick={() => {
              setTimeFrom('00:00');
              setTimeTo('23:59');
            }}
            className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-sm font-medium"
          >
            Reset
          </button>

          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="p-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          >
            {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid3x3 className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                statusFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
              {statusFilter === 'all' && (
                <span className="px-2 py-0.5 bg-white text-blue-600 rounded-full text-xs">
                  {statusCounts.all}
                </span>
              )}
            </button>
            <button
              onClick={() => setStatusFilter('unassigned')}
              className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                statusFilter === 'unassigned' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Unassigned
              {statusFilter === 'unassigned' && (
                <span className="px-2 py-0.5 bg-white text-blue-600 rounded-full text-xs">
                  {statusCounts.unassigned}
                </span>
              )}
            </button>
            <button
              onClick={() => setStatusFilter('assigned')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                statusFilter === 'assigned' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Assigned
              {statusFilter === 'assigned' && (
                <span className="px-2 py-0.5 bg-white text-blue-600 rounded-full text-xs">
                  {statusCounts.assigned}
                </span>
              )}
            </button>
            <button
              onClick={() => setStatusFilter('in_progress')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                statusFilter === 'in_progress' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              In Progress
              {statusFilter === 'in_progress' && (
                <span className="px-2 py-0.5 bg-white text-blue-600 rounded-full text-xs">
                  {statusCounts.in_progress}
                </span>
              )}
            </button>
            <button
              onClick={() => setStatusFilter('cancelled')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                statusFilter === 'cancelled' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Cancelled
              {statusFilter === 'cancelled' && (
                <span className="px-2 py-0.5 bg-white text-blue-600 rounded-full text-xs">
                  {statusCounts.cancelled}
                </span>
              )}
            </button>
            <button
              onClick={() => setStatusFilter('archived')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                statusFilter === 'archived' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Archived
              {statusFilter === 'archived' && (
                <span className="px-2 py-0.5 bg-white text-blue-600 rounded-full text-xs">
                  {statusCounts.archived}
                </span>
              )}
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                statusFilter === 'completed' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Completed
              {statusFilter === 'completed' && (
                <span className="px-2 py-0.5 bg-white text-blue-600 rounded-full text-xs">
                  {statusCounts.completed}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-3">
          <select
            value={selectedMember}
            onChange={(e) => setSelectedMember(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm text-gray-600 bg-white"
          >
            <option value="all">-- Select Member --</option>
            {patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.full_name}
              </option>
            ))}
          </select>

          <select
            value={selectedSpaceType}
            onChange={(e) => setSelectedSpaceType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm text-gray-600 bg-white"
          >
            <option value="all">-- Select Level of Service --</option>
            <option value="AMB">AMB - Ambulatory</option>
            <option value="WAV">WAV - Wheelchair</option>
            <option value="STR">STR - Stretcher</option>
          </select>

          <select
            value={selectedAppointmentType}
            onChange={(e) => setSelectedAppointmentType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm text-gray-600 bg-white"
          >
            <option value="all">-- Select Appointment Type --</option>
            <option value="medical">Medical</option>
            <option value="dialysis">Dialysis</option>
            <option value="physical_therapy">Physical Therapy</option>
            <option value="dental">Dental</option>
            <option value="other">Other</option>
          </select>

          <div className="relative" ref={filtersDropdownRef}>
            <button
              onClick={() => setShowFiltersDropdown(!showFiltersDropdown)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm text-gray-600 bg-white hover:bg-gray-50 flex items-center gap-2"
            >
              <span>Funding Source</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showFiltersDropdown && (
              <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 p-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Funding Source</label>
                    <select
                      value={selectedFundingSource}
                      onChange={(e) => setSelectedFundingSource(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="all">-- Select Funding Source --</option>
                      {fundingSources.map((fs) => (
                        <option key={fs.id} value={fs.id}>
                          {fs.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Level Of Service</label>
                    <select
                      value={selectedLevelOfService}
                      onChange={(e) => setSelectedLevelOfService(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="all">-- Select Level of Service --</option>
                      <option value="basic">Basic</option>
                      <option value="advanced">Advanced</option>
                      <option value="premium">Premium</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Service Area</label>
                    <select
                      value={selectedServiceArea}
                      onChange={(e) => setSelectedServiceArea(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="all">-- Select Service Area --</option>
                      {serviceAreas.map((area) => (
                        <option key={area.id} value={area.id}>
                          {area.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="border-t pt-3 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filterManualTrip}
                        onChange={(e) => setFilterManualTrip(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Manual Trip</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filterMarketplaceTrip}
                        onChange={(e) => setFilterMarketplaceTrip(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Marketplace Trip</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filterGroupByName}
                        onChange={(e) => setFilterGroupByName(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Group By Name</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filterFarmout}
                        onChange={(e) => setFilterFarmout(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Farmout</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filterStandingOrders}
                        onChange={(e) => setFilterStandingOrders(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Standing Orders</span>
                    </label>
                  </div>

                  <div className="border-t pt-3 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setSelectedFundingSource('all');
                        setSelectedLevelOfService('all');
                        setSelectedServiceArea('all');
                        setFilterManualTrip(false);
                        setFilterMarketplaceTrip(false);
                        setFilterGroupByName(false);
                        setFilterFarmout(false);
                        setFilterStandingOrders(false);
                      }}
                      className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                    >
                      Select All
                    </button>
                    <button
                      onClick={() => alert('Trips Report')}
                      className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                    >
                      Trips Report
                    </button>
                    <button
                      onClick={() => alert('Drivers Manifest')}
                      className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                    >
                      Drivers Manifest
                    </button>
                    <button
                      onClick={() => alert('Trips Itinerary')}
                      className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                    >
                      Trips Itinerary
                    </button>
                    <button
                      onClick={() => alert('On Scene Report')}
                      className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                    >
                      On Scene Report
                    </button>
                    <button
                      onClick={() => alert('Save Template')}
                      className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                    >
                      Save Template
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={() => setShowTextImportModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 text-sm font-medium transition-colors"
            >
              <FileText className="w-4 h-4" />
              Import from Text
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center gap-2 text-sm font-medium transition-colors"
            >
              <Upload className="w-4 h-4" />
              Import CSV
            </button>
            <button
              onClick={() => setShowExportModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2 text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span>00:10</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600">Auto Refresh</span>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  autoRefresh ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    autoRefresh ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'drivers_load' ? (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Driver
                  </label>
                  <select
                    value={selectedDriverId}
                    onChange={(e) => setSelectedDriverId(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">-- Select Driver --</option>
                    {drivers.map((driver) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Date
                  </label>
                  <input
                    type="date"
                    value={selectedDriverDate}
                    onChange={(e) => setSelectedDriverDate(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {selectedDriverId && drivers.find(d => d.id === selectedDriverId) && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <Users className="w-5 h-5 text-blue-600" />
                    <div>
                      <div className="font-semibold text-gray-900">
                        {drivers.find(d => d.id === selectedDriverId)?.full_name}
                      </div>
                      <div className="text-sm text-gray-600">
                        {drivers.find(d => d.id === selectedDriverId)?.phone || 'No phone'}
                      </div>
                    </div>
                    <div className="ml-auto">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        drivers.find(d => d.id === selectedDriverId)?.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {drivers.find(d => d.id === selectedDriverId)?.status}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {selectedDriverId && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <Package className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium text-gray-600">Total Trips</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{driverTrips.length}</div>
                  </div>

                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-gray-600">Total Miles</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">
                      {driverTrips.reduce((sum, trip) => sum + (trip.distance_miles || 0), 0).toFixed(1)}
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-gray-600">Completed</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">
                      {driverTrips.filter(t => t.status === 'completed').length} / {driverTrips.length}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                  <div className="p-6 bg-gray-50 border-b">
                    <div className="flex items-center justify-between">
                      <h2 className="font-semibold text-gray-900">Assigned Trips</h2>
                      {loadingDriverTrips && (
                        <div className="text-sm text-gray-600">Loading...</div>
                      )}
                    </div>
                  </div>

                  {driverTrips.length === 0 ? (
                    <div className="p-12 text-center">
                      <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No trips assigned for this date</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Time
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Patient
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Pickup Address
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Dropoff Address
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Distance
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {driverTrips.map((trip) => (
                            <tr
                              key={trip.id}
                              className="hover:bg-gray-50 cursor-pointer"
                              onClick={() => {
                                setSelectedTrip(trip);
                                setShowTripDetailsModal(true);
                              }}
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2 text-sm text-gray-900">
                                  <Clock className="w-4 h-4 text-gray-400" />
                                  {new Date(trip.scheduled_pickup_time).toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true
                                  })}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {trip.patients?.full_name?.startsWith('Unknown-')
                                    ? `No Name (${trip.patients?.member_id || 'No ID'})`
                                    : trip.patients?.full_name || 'Unknown'}
                                </div>
                                {trip.patients?.phone && (
                                  <div className="text-xs text-gray-500">{trip.patients.phone}</div>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-start gap-2 text-sm text-gray-700 max-w-xs">
                                  <MapPin className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                                  <span className="line-clamp-2">{trip.pickup_address}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-start gap-2 text-sm text-gray-700 max-w-xs">
                                  <MapPin className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                                  <span className="line-clamp-2">{trip.dropoff_address}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {trip.distance_miles ? `${trip.distance_miles.toFixed(1)} mi` : 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                  trip.status === 'completed' ? 'bg-green-100 text-green-700' :
                                  trip.status === 'active' || trip.status === 'picked_up' ? 'bg-blue-100 text-blue-700' :
                                  trip.status === 'assigned' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {trip.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ) : filteredTrips.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <MapPin className="w-16 h-16 mb-4 text-gray-300" />
            <p className="text-lg font-medium">No trips found</p>
            <p className="text-sm">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredTrips.map((trip) => (
              <div
                key={trip.id}
                className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-sm text-blue-700 uppercase tracking-wide">
                        {trip.patients?.full_name?.startsWith('Unknown-')
                          ? `NO NAME (${trip.patients?.member_id || 'NO ID'})`
                          : trip.patients?.full_name || 'UNKNOWN PATIENT'}
                      </h3>
                      <p className="text-xs text-gray-500 font-mono">{trip.trip_number || trip.id.slice(0, 13).toUpperCase()}</p>
                    </div>
                    <div className="flex gap-1">
                      {trip.status === 'completed' && (
                        <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded font-medium">
                          Finished
                        </span>
                      )}
                      {trip.broker_name && trip.broker_name !== 'Helping Hands Donation' && (
                        <span className="px-2 py-0.5 bg-teal-600 text-white text-xs rounded font-medium">
                          {trip.broker_name}
                        </span>
                      )}
                      {trip.county && (
                        <span className="px-2 py-0.5 bg-gray-600 text-white text-xs rounded font-medium">
                          El paso county
                        </span>
                      )}
                      {trip.service_area && (
                        <span className="px-2 py-0.5 bg-gray-700 text-white text-xs rounded font-medium">
                          American Logistics
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleContextMenu(e, trip);
                        }}
                        className="p-0.5 hover:bg-gray-100 rounded"
                      >
                        <MoreVertical className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 leading-tight">
                          {trip.pickup_address}
                        </p>
                        <p className="text-xs text-gray-500">{formatTime(trip.scheduled_pickup_time)}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-red-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 leading-tight">
                          {trip.dropoff_address}
                        </p>
                        {trip.scheduled_dropoff_time && (
                          <p className="text-xs text-gray-500">
                            {formatTime(trip.scheduled_dropoff_time)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs text-gray-600 mb-3">
                    <div className="flex items-center gap-1">
                      <Car className="w-3.5 h-3.5" />
                      <span className="font-semibold px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded">{trip.space_type?.toUpperCase() || 'AMB'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Anchor className="w-3.5 h-3.5" />
                      <span>{trip.distance_miles || '0'} mi</span>
                    </div>
                    <button
                      onClick={() => handleLoadedTime(trip.id)}
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Loaded Time</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs text-gray-600 mb-3">
                    <div className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{trip.patients?.phone || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-mono">{trip.trip_number?.slice(-6) || 'mk1duzk2'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Anchor className="w-3.5 h-3.5" />
                      <span>N/A</span>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedTrip(trip);
                        setShowTripDetailsModal(true);
                      }}
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Notes</span>
                    </button>
                    <div className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" />
                      <span className="font-medium">TX</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs mb-3 pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-1 font-semibold text-gray-900">
                      <DollarSign className="w-3.5 h-3.5 text-green-600" />
                      <span>BSR: ${trip.broker_service_rate?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                  </div>

                  {trip.driver_notes && (
                    <div className="mb-2">
                      <p className="text-xs text-gray-600">
                        <span className="font-semibold">Driver Notes:</span> {trip.driver_notes}
                      </p>
                    </div>
                  )}

                  {trip.dispatcher_notes && (
                    <div className="mb-2">
                      <p className="text-xs text-gray-600">
                        <span className="font-semibold">Dispatcher Notes:</span> {trip.dispatcher_notes}
                      </p>
                    </div>
                  )}

                  {trip.status === 'completed' && (trip.on_way_time || trip.on_scene_time || trip.member_onboard_time || trip.finished_time) && (
                    <div className="mb-3 pb-3 border-t border-gray-200 pt-3">
                      <div className="text-xs text-gray-700 space-y-1">
                        {(trip.on_way_time || trip.on_scene_time) && (
                          <p>
                            <span className="font-semibold">On Way At:</span> {trip.on_way_time ? new Date(trip.on_way_time).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                            {' '}<span className="font-semibold">On Scene At:</span> {trip.on_scene_time ? new Date(trip.on_scene_time).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                            {' '}<span className="text-green-600 font-semibold">(On Time)</span>
                          </p>
                        )}
                        {(trip.member_onboard_time || trip.finished_time) && (
                          <p>
                            <span className="font-semibold">Member Onboard At:</span> {trip.member_onboard_time ? new Date(trip.member_onboard_time).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                            {' '}<span className="font-semibold">Finished At:</span> {trip.finished_time ? new Date(trip.finished_time).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                            {' '}<span className="text-green-600 font-semibold">(Early)</span>
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 mt-3">
                    {trip.status === 'in-progress' ? (
                      <>
                        <div className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium flex items-center gap-1.5">
                          <Car className="w-3.5 h-3.5" />
                          In Progress - {trip.profiles?.full_name || 'Driver Assigned'}
                        </div>
                        <button
                          onClick={() => {
                            setSelectedTrip(trip);
                            setShowTripDetailsModal(true);
                          }}
                          className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-xs font-medium hover:bg-gray-200 transition-colors"
                        >
                          Details
                        </button>
                        <button
                          onClick={() => updateTrip(trip.id, { status: 'assigned' })}
                          className="px-3 py-1.5 bg-orange-100 text-orange-700 rounded text-xs font-medium hover:bg-orange-200 transition-colors"
                        >
                          Revert to Assigned
                        </button>
                      </>
                    ) : trip.status === 'assigned' ? (
                      <>
                        <div className="px-3 py-1.5 bg-yellow-600 text-white rounded text-xs font-medium flex items-center gap-1.5">
                          <Car className="w-3.5 h-3.5" />
                          Assigned to {trip.profiles?.full_name || 'Driver'}
                        </div>
                        <button
                          onClick={() => {
                            setTripToAssign(trip);
                            setShowAssignmentModal(true);
                          }}
                          className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-xs font-medium hover:bg-gray-200 transition-colors"
                        >
                          Reassign
                        </button>
                        <button
                          onClick={() => {
                            setSelectedTrip(trip);
                            setShowTripDetailsModal(true);
                          }}
                          className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-xs font-medium hover:bg-gray-200 transition-colors"
                        >
                          Details
                        </button>
                      </>
                    ) : trip.status === 'completed' ? (
                      <>
                        <div className="px-3 py-1.5 bg-green-600 text-white rounded text-xs font-medium flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Completed
                        </div>
                        <button
                          onClick={() => {
                            setSelectedTrip(trip);
                            setShowTripDetailsModal(true);
                          }}
                          className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-xs font-medium hover:bg-gray-200 transition-colors"
                        >
                          View Details
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setTripToAssign(trip);
                            setShowAssignmentModal(true);
                          }}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 transition-colors"
                        >
                          Assign
                        </button>
                        <button
                          onClick={() => {
                            setSelectedTrip(trip);
                            setShowTripDetailsModal(true);
                          }}
                          className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-xs font-medium hover:bg-gray-200 transition-colors"
                        >
                          Details
                        </button>
                        <button
                          onClick={() => updateTrip(trip.id, { confirmation_status: trip.confirmation_status === 'confirmed' ? null : 'confirmed' })}
                          className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-xs font-medium hover:bg-gray-200 transition-colors"
                        >
                          {trip.confirmation_status === 'confirmed' ? 'Un-Mark Confirm' : 'Mark Confirm'}
                        </button>
                        <button
                          onClick={() => updateTrip(trip.id, { phone_attempt_status: trip.phone_attempt_status === 'voicemail' ? null : 'voicemail' })}
                          className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-xs font-medium hover:bg-gray-200 transition-colors"
                        >
                          {trip.phone_attempt_status === 'voicemail' ? 'Un-Mark' : 'Mark'} Voicemail
                        </button>
                        <button
                          onClick={() => updateTrip(trip.id, { is_multiload: !trip.is_multiload })}
                          className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-xs font-medium hover:bg-gray-200 transition-colors"
                        >
                          Mark Multiload
                        </button>
                        <button
                          onClick={() => updateTrip(trip.id, { is_ready: !trip.is_ready })}
                          className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-xs font-medium hover:bg-gray-200 transition-colors"
                        >
                          Mark Ready
                        </button>
                        <button
                          onClick={() => updateTrip(trip.id, { is_dialysis: !trip.is_dialysis })}
                          className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-xs font-medium hover:bg-gray-200 transition-colors"
                        >
                          Mark Dialysis
                        </button>
                        <button
                          onClick={() => {}}
                          className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-xs font-medium hover:bg-gray-200 transition-colors"
                        >
                          Confirmation Text
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showTripModal && (
        <TripModal
          trip={selectedTrip}
          onClose={() => {
            setShowTripModal(false);
            setSelectedTrip(null);
          }}
          onSave={() => {
            loadTrips();
            setShowTripModal(false);
            setSelectedTrip(null);
          }}
        />
      )}

      {showTripDetailsModal && selectedTrip && (
        <TripDetailsModal
          tripId={selectedTrip.id}
          onClose={() => {
            setShowTripDetailsModal(false);
            setSelectedTrip(null);
          }}
        />
      )}

      {showAssignmentModal && tripToAssign && (
        <ClosestDriverAssignment
          trip={tripToAssign}
          onClose={() => {
            setShowAssignmentModal(false);
            setTripToAssign(null);
          }}
          onAssign={async (driverId: string) => {
            try {
              const { error } = await supabase
                .from('trips')
                .update({
                  driver_id: driverId,
                  status: 'assigned'
                })
                .eq('id', tripToAssign.id);

              if (error) throw error;

              await supabase.from('notifications').insert({
                user_id: driverId,
                message: `New trip assigned: ${tripToAssign.pickup_address} to ${tripToAssign.dropoff_address}`,
                trip_id: tripToAssign.id,
                status: 'pending'
              });

              await loadTrips();
              setShowAssignmentModal(false);
              setTripToAssign(null);
            } catch (error) {
              console.error('Error assigning driver:', error);
              throw error;
            }
          }}
        />
      )}

      {showExportModal && (
        <TripExport onClose={() => setShowExportModal(false)} />
      )}

      {showImportModal && (
        <BrokerCSVImport
          onClose={() => setShowImportModal(false)}
          onImportComplete={() => {
            loadTrips();
          }}
        />
      )}

      {showTextImportModal && (
        <BrokerTextImport
          onClose={() => setShowTextImportModal(false)}
          onImportComplete={() => {
            loadTrips();
          }}
        />
      )}
    </div>
  );
}
