import { useState, useEffect } from 'react';
import { supabase, Trip, Patient, Profile } from '../lib/supabase';
import {
  Search,
  MapPin,
  Car,
  Phone,
  FileText,
  Clock,
  Anchor,
  Grid3x3,
  List,
  User,
  RotateCw,
  Upload,
  MoreVertical,
  Copy,
  Archive,
  Edit,
  XCircle,
  DollarSign,
  AlertCircle
} from 'lucide-react';
import { TripModal } from './TripModal';
import BrokerCSVImport from './BrokerCSVImport';

interface TripWithDetails extends Trip {
  patients?: Patient;
  profiles?: Profile;
}

type ColumnType = 'alarming' | 'active' | 'schedule' | 'cancelled';

interface TripColumn {
  id: ColumnType;
  title: string;
  count: number;
  bgColor: string;
  trips: TripWithDetails[];
}

export function OperationsManagement() {
  const [trips, setTrips] = useState<TripWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFundingSource, setSelectedFundingSource] = useState('all');
  const [selectedServiceArea, setSelectedServiceArea] = useState('all');
  const [selectedStationManager, setSelectedStationManager] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showTripModal, setShowTripModal] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<TripWithDetails | null>(null);
  const [fundingSources, setFundingSources] = useState<string[]>([]);
  const [serviceAreas, setServiceAreas] = useState<string[]>([]);
  const [stationManagers, setStationManagers] = useState<string[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  useEffect(() => {
    loadTrips();

    const subscription = supabase
      .channel('operations_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trips' },
        () => {
          loadTrips();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    extractUniqueValues();
  }, [trips]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (openDropdownId && !(event.target as Element).closest('.relative')) {
        setOpenDropdownId(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdownId]);

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

  function extractUniqueValues() {
    const sources = new Set<string>();
    const areas = new Set<string>();
    const managers = new Set<string>();

    trips.forEach((trip) => {
      if (trip.funding_source) sources.add(trip.funding_source);
      if (trip.service_area) areas.add(trip.service_area);
      if (trip.station_manager) managers.add(trip.station_manager);
    });

    setFundingSources(Array.from(sources).sort());
    setServiceAreas(Array.from(areas).sort());
    setStationManagers(Array.from(managers).sort());
  }

  function getMinutesUntilPickup(scheduledTime: string): number {
    const now = new Date();
    const scheduled = new Date(scheduledTime);
    const diffMs = scheduled.getTime() - now.getTime();
    return Math.floor(diffMs / 60000);
  }

  function filterTrips(): TripColumn[] {
    let filtered = [...trips];

    if (selectedDate) {
      filtered = filtered.filter((trip) => {
        const tripDate = new Date(trip.scheduled_pickup_time).toISOString().split('T')[0];
        return tripDate === selectedDate;
      });
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (trip) =>
          trip.trip_number?.toLowerCase().includes(query) ||
          trip.patients?.full_name?.toLowerCase().includes(query) ||
          trip.pickup_address.toLowerCase().includes(query) ||
          trip.dropoff_address.toLowerCase().includes(query)
      );
    }

    if (selectedFundingSource !== 'all') {
      filtered = filtered.filter((trip) => trip.funding_source === selectedFundingSource);
    }

    if (selectedServiceArea !== 'all') {
      filtered = filtered.filter((trip) => trip.service_area === selectedServiceArea);
    }

    if (selectedStationManager !== 'all') {
      filtered = filtered.filter((trip) => trip.station_manager === selectedStationManager);
    }

    const alarming: TripWithDetails[] = [];
    const active: TripWithDetails[] = [];
    const cancelled: TripWithDetails[] = [];

    filtered.forEach((trip) => {
      if (trip.status === 'cancelled') {
        cancelled.push(trip);
      } else if (trip.status === 'in-progress' || trip.status === 'assigned') {
        const minutesUntil = getMinutesUntilPickup(trip.scheduled_pickup_time);
        if (minutesUntil <= 15 && minutesUntil >= -30) {
          alarming.push(trip);
        } else if (trip.status === 'in-progress') {
          active.push(trip);
        }
      } else if (trip.status === 'scheduled') {
        const minutesUntil = getMinutesUntilPickup(trip.scheduled_pickup_time);
        if (minutesUntil <= 15 && minutesUntil >= 0) {
          alarming.push(trip);
        }
      }
    });

    return [
      { id: 'alarming', title: 'Alarming', count: alarming.length, bgColor: 'bg-red-50', trips: alarming },
      { id: 'active', title: 'Active', count: active.length, bgColor: 'bg-white', trips: active },
      { id: 'cancelled', title: 'Cancelled', count: cancelled.length, bgColor: 'bg-gray-50', trips: cancelled },
    ];
  }

  async function handleReassign(trip: TripWithDetails) {
    setSelectedTrip(trip);
    setShowTripModal(true);
  }

  async function handleMarkCompleted(tripId: string) {
    try {
      const { error } = await supabase
        .from('trips')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', tripId);

      if (error) throw error;
      await loadTrips();
    } catch (error) {
      console.error('Error marking trip completed:', error);
      alert('Failed to mark trip as completed');
    }
  }

  async function handleFetch(tripId: string) {
    try {
      const { error } = await supabase
        .from('trips')
        .update({ fetch_status: 'fetched', updated_at: new Date().toISOString() })
        .eq('id', tripId);

      if (error) throw error;
      await loadTrips();
    } catch (error) {
      console.error('Error updating fetch status:', error);
      alert('Failed to update fetch status');
    }
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

  function getTimeUrgency(scheduledTime: string): { text: string; isUrgent: boolean; isLate: boolean } {
    const minutes = getMinutesUntilPickup(scheduledTime);
    if (minutes < 0) {
      return { text: `${Math.abs(minutes)} minutes ago`, isUrgent: true, isLate: true };
    } else if (minutes <= 60) {
      return { text: `${minutes} minutes from now`, isUrgent: true, isLate: false };
    }
    return { text: '', isUrgent: false, isLate: false };
  }

  const columns = filterTrips();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading operations...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-100">
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 min-w-[150px] text-sm text-gray-700 font-medium"
          />

          <div className="flex-1 relative max-w-xs">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          <select
            value={selectedFundingSource}
            onChange={(e) => setSelectedFundingSource(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 min-w-[200px] text-sm text-gray-600"
          >
            <option value="all">-- Select Funding Source --</option>
            {fundingSources.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>

          <select
            value={selectedServiceArea}
            onChange={(e) => setSelectedServiceArea(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 min-w-[200px] text-sm text-gray-600"
          >
            <option value="all">-- Select Service Area --</option>
            {serviceAreas.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>

          <select
            value={selectedStationManager}
            onChange={(e) => setSelectedStationManager(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 min-w-[200px] text-sm text-gray-600"
          >
            <option value="all">-- Select Station Manager --</option>
            {stationManagers.map((manager) => (
              <option key={manager} value={manager}>
                {manager}
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Import CSV
          </button>

          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          >
            {viewMode === 'grid' ? <List className="w-5 h-5" /> : <Grid3x3 className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-gray-50">
        <div className="h-full flex gap-4 p-4 overflow-x-auto">
          {columns.map((column) => (
            <div key={column.id} className="flex-shrink-0 w-80 flex flex-col">
              <div className={`mb-3 flex items-center gap-2 ${column.id === 'alarming' ? 'bg-red-600 text-white p-3 rounded-lg shadow-lg' : ''}`}>
                {column.id === 'alarming' && (
                  <AlertCircle className="w-5 h-5 animate-pulse" />
                )}
                <h3 className={`font-semibold text-lg ${column.id === 'alarming' ? 'text-white font-bold' : 'text-gray-800'}`}>
                  {column.title}
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-sm font-semibold ${
                  column.id === 'alarming' ? 'bg-white text-red-700' : 'bg-blue-600 text-white'
                }`}>
                  {column.count}
                </span>
              </div>

              <div className={`flex-1 ${column.bgColor} rounded-lg p-3 overflow-y-auto space-y-3`}>
                {column.trips.map((trip) => {
                  const urgency = getTimeUrgency(trip.scheduled_pickup_time);
                  const cardBgColor = column.id === 'alarming'
                    ? (urgency.isLate ? 'bg-red-100' : 'bg-green-100')
                    : 'bg-white';
                  return (
                    <div
                      key={trip.id}
                      className={`${cardBgColor} rounded-lg shadow-sm p-3 text-sm relative border border-gray-200`}
                    >
                      <div className="mb-2 flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-bold text-blue-700 text-sm uppercase tracking-wide">
                            {trip.patients?.full_name || 'Unknown Member'}
                          </h4>
                          <p className="text-xs text-gray-500">{trip.trip_number || trip.id.slice(0, 8)}</p>
                        </div>
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenDropdownId(openDropdownId === trip.id ? null : trip.id);
                            }}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                          >
                            <MoreVertical className="w-4 h-4 text-gray-600" />
                          </button>
                          {openDropdownId === trip.id && (
                            <div className="absolute right-0 top-6 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[200px] py-1">
                              <button
                                onClick={() => {
                                  handleReassign(trip);
                                  setOpenDropdownId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <RotateCw className="w-4 h-4" />
                                Re-Assign
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedTrip(trip);
                                  setShowTripModal(true);
                                  setOpenDropdownId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <FileText className="w-4 h-4" />
                                Details
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedTrip(trip);
                                  setShowTripModal(true);
                                  setOpenDropdownId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Edit className="w-4 h-4" />
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  alert('Clone trip functionality');
                                  setOpenDropdownId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Copy className="w-4 h-4" />
                                Clone
                              </button>
                              <button
                                onClick={() => {
                                  alert('Trip logs functionality');
                                  setOpenDropdownId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <FileText className="w-4 h-4" />
                                Trip Logs
                              </button>
                              <button
                                onClick={() => {
                                  alert('Add biller note functionality');
                                  setOpenDropdownId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <DollarSign className="w-4 h-4" />
                                Add Biller Note
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedTrip(trip);
                                  setShowTripModal(true);
                                  setOpenDropdownId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <FileText className="w-4 h-4" />
                                Notes
                              </button>
                              {column.id !== 'cancelled' && (
                                <button
                                  onClick={async () => {
                                    if (confirm('Mark this trip as no-show?')) {
                                      try {
                                        const { error } = await supabase
                                          .from('trips')
                                          .update({ status: 'cancelled', updated_at: new Date().toISOString() })
                                          .eq('id', trip.id);
                                        if (error) throw error;
                                        await loadTrips();
                                      } catch (error) {
                                        console.error('Error marking no-show:', error);
                                      }
                                    }
                                    setOpenDropdownId(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <XCircle className="w-4 h-4" />
                                  Mark No Show
                                </button>
                              )}
                              <button
                                onClick={async () => {
                                  if (confirm('Archive this trip?')) {
                                    try {
                                      const { error } = await supabase
                                        .from('trips')
                                        .update({ status: 'completed', updated_at: new Date().toISOString() })
                                        .eq('id', trip.id);
                                      if (error) throw error;
                                      await loadTrips();
                                    } catch (error) {
                                      console.error('Error archiving trip:', error);
                                    }
                                  }
                                  setOpenDropdownId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 border-t border-gray-100"
                              >
                                <Archive className="w-4 h-4" />
                                Archive
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {urgency.isUrgent && column.id === 'alarming' && (
                        <div className="mb-2">
                          <span className={`text-xs font-bold ${urgency.isLate ? 'text-red-700' : 'text-green-700'}`}>
                            {urgency.text}
                          </span>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-1 mb-3">
                        {column.id === 'cancelled' && (
                          <span className="px-2 py-0.5 bg-purple-600 text-white text-xs rounded font-medium">
                            Cancelled
                          </span>
                        )}
                        {trip.status === 'assigned' && column.id !== 'cancelled' && (
                          <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded font-medium">
                            Offered
                          </span>
                        )}
                        {trip.manual_entry && (
                          <span className="px-2 py-0.5 bg-gray-700 text-white text-xs rounded font-medium">
                            Manual
                          </span>
                        )}
                        {trip.time_updated && (
                          <span className="px-2 py-0.5 bg-yellow-600 text-white text-xs rounded font-medium">
                            Time Updated
                          </span>
                        )}
                        {trip.member_onboard && (
                          <span className="px-2 py-0.5 bg-green-600 text-white text-xs rounded font-medium">
                            Member Onboard
                          </span>
                        )}
                        {trip.broker_name && trip.broker_name !== 'Default' && (
                          <span className="px-2 py-0.5 bg-teal-600 text-white text-xs rounded font-medium">
                            {trip.broker_name}
                          </span>
                        )}
                        {trip.service_area && (
                          <span className="px-2 py-0.5 bg-orange-600 text-white text-xs rounded font-medium">
                            American Logistics
                          </span>
                        )}
                        {trip.county && (
                          <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded font-medium">
                            {trip.county}
                          </span>
                        )}
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

                      <div className="flex items-center gap-3 mb-3 text-xs text-gray-600">
                        <div className="flex items-center gap-1">
                          <Car className="w-3.5 h-3.5" />
                          <span className="font-medium">
                            {trip.space_type?.toUpperCase() || 'WAV'} ({trip.space_type?.toUpperCase() || 'WAV'})
                          </span>
                        </div>
                        {trip.distance_miles && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{trip.distance_miles} mi</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-100">
                        <button
                          onClick={() => {
                            setSelectedTrip(trip);
                            setShowTripModal(true);
                          }}
                          className="flex items-center gap-1 text-xs text-gray-600 hover:text-blue-600 transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Notes
                        </button>
                        <button
                          onClick={() => handleFetch(trip.id)}
                          className="flex items-center gap-1 text-xs text-gray-600 hover:text-blue-600 transition-colors"
                        >
                          <Anchor className="w-3.5 h-3.5" />
                          Fetch
                        </button>
                        <button
                          onClick={() => handleLoadedTime(trip.id)}
                          className="flex items-center gap-1 text-xs text-gray-600 hover:text-blue-600 transition-colors"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          Loaded Time
                        </button>
                      </div>

                      {trip.profiles && (
                        <div className="mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                              <User className="w-4 h-4 text-gray-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-gray-900 truncate">
                                {trip.profiles.full_name}
                              </p>
                              <p className="text-xs text-gray-600">{trip.profiles.phone}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleReassign(trip)}
                          className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors"
                        >
                          Reassign
                        </button>
                        {column.id !== 'cancelled' && (
                          <button
                            onClick={() => handleMarkCompleted(trip.id)}
                            className="flex-1 px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-xs font-medium transition-colors"
                          >
                            Mark Completed
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedTrip(trip);
                            setShowTripModal(true);
                          }}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-medium transition-colors"
                        >
                          Details
                        </button>
                      </div>

                      {urgency.isUrgent && column.id === 'alarming' && (
                        <div className={`mt-2 pt-2 border-t ${urgency.isLate ? 'border-red-200' : 'border-green-200'}`}>
                          <p className={`text-xs text-center font-semibold ${urgency.isLate ? 'text-red-600' : 'text-green-600'}`}>
                            {urgency.isLate ? 'LATE - ' : 'UPCOMING - '}{urgency.text}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}

                {column.trips.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <FileText className="w-12 h-12 mb-2" />
                    <p className="text-sm">No trips</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showTripModal && selectedTrip && (
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

      {showImportModal && (
        <BrokerCSVImport
          onClose={() => setShowImportModal(false)}
          onImportComplete={() => {
            loadTrips();
            setShowImportModal(false);
          }}
        />
      )}
    </div>
  );
}
