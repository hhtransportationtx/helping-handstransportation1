import { useState, useEffect, useRef } from 'react';
import { supabase, Trip, Patient, Profile } from '../lib/supabase';
import { Search, Calendar, X, Edit, Eye } from 'lucide-react';
import { TripModal } from './TripModal';

interface TripWithDetails extends Trip {
  patients?: Patient;
  profiles?: Profile;
}

type StatusOption = 'scheduled' | 'assigned' | 'in-progress' | 'arrived' | 'completed' | 'cancelled';

const statusOptions: { value: StatusOption; label: string; bgColor: string }[] = [
  { value: 'scheduled', label: 'Unassigned', bgColor: 'bg-white' },
  { value: 'assigned', label: 'Assigned', bgColor: 'bg-green-50' },
  { value: 'in-progress', label: 'En Route', bgColor: 'bg-blue-50' },
  { value: 'arrived', label: 'Arrived', bgColor: 'bg-yellow-50' },
  { value: 'completed', label: 'In Progress', bgColor: 'bg-red-50' },
  { value: 'completed', label: 'Completed', bgColor: 'bg-blue-50' },
  { value: 'cancelled', label: 'Cancelled', bgColor: 'bg-gray-50' },
];

export function ManifestManagement() {
  const [trips, setTrips] = useState<TripWithDetails[]>([]);
  const [filteredTrips, setFilteredTrips] = useState<TripWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedStatuses, setSelectedStatuses] = useState<StatusOption[]>([
    'scheduled',
    'assigned',
    'in-progress',
    'arrived',
  ]);
  const [selectedDriver, setSelectedDriver] = useState('all');
  const [selectedStationManager, setSelectedStationManager] = useState('all');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<TripWithDetails | null>(null);
  const [showTripModal, setShowTripModal] = useState(false);
  const [drivers, setDrivers] = useState<Profile[]>([]);
  const [stationManagers, setStationManagers] = useState<string[]>([]);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadTrips();
    loadDrivers();

    const subscription = supabase
      .channel('manifest_changes')
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
    filterTrips();
  }, [trips, searchQuery, selectedDate, selectedStatuses, selectedDriver, selectedStationManager]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setShowStatusDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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

      const managers = new Set<string>();
      data?.forEach((trip) => {
        if (trip.station_manager) managers.add(trip.station_manager);
      });
      setStationManagers(Array.from(managers).sort());
    } catch (error) {
      console.error('Error loading trips:', error);
    } finally {
      setLoading(false);
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

  function filterTrips() {
    let filtered = [...trips];

    if (selectedDate) {
      filtered = filtered.filter((trip) => {
        const tripDate = new Date(trip.scheduled_pickup_time).toISOString().split('T')[0];
        return tripDate === selectedDate;
      });
    }

    if (selectedStatuses.length > 0) {
      filtered = filtered.filter((trip) => selectedStatuses.includes(trip.status as StatusOption));
    }

    if (selectedDriver !== 'all') {
      filtered = filtered.filter((trip) => trip.driver_id === selectedDriver);
    }

    if (selectedStationManager !== 'all') {
      filtered = filtered.filter((trip) => trip.station_manager === selectedStationManager);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (trip) =>
          trip.patients?.full_name.toLowerCase().includes(query) ||
          trip.pickup_address.toLowerCase().includes(query) ||
          trip.dropoff_address.toLowerCase().includes(query)
      );
    }

    setFilteredTrips(filtered);
  }

  function toggleStatus(status: StatusOption) {
    if (selectedStatuses.includes(status)) {
      setSelectedStatuses(selectedStatuses.filter((s) => s !== status));
    } else {
      setSelectedStatuses([...selectedStatuses, status]);
    }
  }

  function formatTime(dateString: string) {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading manifest...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <Calendar className="w-5 h-5 text-gray-400" />
          </div>

          <div className="relative" ref={statusDropdownRef}>
            <button
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 min-w-[150px] justify-between"
            >
              <span className="text-sm text-gray-700">Status</span>
              {selectedStatuses.length > 0 && (
                <X
                  className="w-4 h-4 text-gray-500 hover:text-gray-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedStatuses([]);
                  }}
                />
              )}
            </button>

            {showStatusDropdown && (
              <div className="absolute top-full mt-2 left-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[200px]">
                {statusOptions.map((option) => (
                  <label
                    key={option.value + option.label}
                    className={`flex items-center gap-2 px-4 py-2 hover:bg-gray-50 cursor-pointer ${option.bgColor}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedStatuses.includes(option.value)}
                      onChange={() => toggleStatus(option.value)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-700">{option.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <select
            value={selectedDriver}
            onChange={(e) => setSelectedDriver(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 min-w-[200px]"
          >
            <option value="all">-- Select Driver --</option>
            {drivers.map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.full_name}
              </option>
            ))}
          </select>

          <select
            value={selectedStationManager}
            onChange={(e) => setSelectedStationManager(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 min-w-[200px]"
          >
            <option value="all">-- Select Station Manager --</option>
            {stationManagers.map((manager) => (
              <option key={manager} value={manager}>
                {manager}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="bg-white border-b border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Funding Source</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Space Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone No.</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pick-Up</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Drop-off</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Miles</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Escort</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loaded Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SP. Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTrips.map((trip) => (
                  <tr key={trip.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedTrip(trip);
                            setShowTripModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="text-blue-600 hover:text-blue-800">
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded">
                        {trip.status === 'completed' ? 'Completed' : trip.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {trip.profiles?.full_name || 'N/A'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {trip.funding_source || 'N/A'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {trip.space_type === 'wheelchair' ? 'WAV (WAV)' : 'AMB (AMB)'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {trip.trip_number || trip.id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {new Date(trip.scheduled_pickup_time).toLocaleDateString('en-US', {
                        month: '2-digit',
                        day: '2-digit',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {formatTime(trip.scheduled_pickup_time)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {trip.patients?.full_name || 'N/A'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {trip.patients?.phone || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                      {trip.pickup_address}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                      {trip.dropoff_address}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {trip.distance_miles || 'N/A'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {trip.escort_required ? 'Yes' : 'No'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {trip.loaded_time ? formatTime(trip.loaded_time) : 'N/A'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">N/A</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
    </div>
  );
}
