import { useState, useEffect } from 'react';
import { supabase, FarmoutTrip, Trip, Patient } from '../lib/supabase';
import { Search, Calendar, FileText, Eye } from 'lucide-react';
import { FarmoutDetailModal } from './FarmoutDetailModal';

interface FarmoutTripWithDetails extends FarmoutTrip {
  trips?: Trip & {
    patients?: Patient;
  };
}

type TabType = 'trips' | 'receipts';

export function FarmoutManagement() {
  const [activeTab, setActiveTab] = useState<TabType>('trips');
  const [farmoutTrips, setFarmoutTrips] = useState<FarmoutTripWithDetails[]>([]);
  const [filteredTrips, setFilteredTrips] = useState<FarmoutTripWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTrip, setSelectedTrip] = useState<FarmoutTripWithDetails | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    loadFarmoutTrips();

    const subscription = supabase
      .channel('farmout_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'farmout_trips' },
        () => {
          loadFarmoutTrips();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    filterTrips();
  }, [farmoutTrips, searchQuery, selectedDate]);

  async function loadFarmoutTrips() {
    try {
      const { data, error } = await supabase
        .from('farmout_trips')
        .select(`
          *,
          trips (
            *,
            patients (*)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFarmoutTrips(data || []);
    } catch (error) {
      console.error('Error loading farmout trips:', error);
    } finally {
      setLoading(false);
    }
  }

  function filterTrips() {
    let filtered = [...farmoutTrips];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (trip) =>
          trip.request_id?.toLowerCase().includes(query) ||
          trip.trips?.patients?.full_name.toLowerCase().includes(query) ||
          trip.driver_name?.toLowerCase().includes(query)
      );
    }

    if (selectedDate) {
      filtered = filtered.filter((trip) => {
        const tripDate = new Date(trip.created_at).toISOString().split('T')[0];
        return tripDate === selectedDate;
      });
    }

    setFilteredTrips(filtered);
  }

  function getStatusCounts() {
    const filtered = farmoutTrips.filter((trip) => {
      if (!selectedDate) return true;
      const tripDate = new Date(trip.created_at).toISOString().split('T')[0];
      return tripDate === selectedDate;
    });

    return {
      total: filtered.length,
      inProgress: filtered.filter((t) => t.status === 'processing').length,
      completed: filtered.filter((t) => t.status === 'completed').length,
      cancelled: filtered.filter(
        (t) => t.status === 'driver_canceled' || t.status === 'rider_canceled'
      ).length,
    };
  }

  function getTotalReceipts() {
    return farmoutTrips.filter((trip) => {
      if (!selectedDate) return true;
      const tripDate = new Date(trip.created_at).toISOString().split('T')[0];
      return tripDate === selectedDate && trip.status === 'completed';
    }).length;
  }

  function getTotalFare() {
    return farmoutTrips
      .filter((trip) => {
        if (!selectedDate) return true;
        const tripDate = new Date(trip.created_at).toISOString().split('T')[0];
        return tripDate === selectedDate && trip.status === 'completed';
      })
      .reduce((sum, trip) => sum + (trip.trip_fare || 0), 0);
  }

  const statusCounts = getStatusCounts();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading farmout trips...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="flex gap-1 px-6">
          <button
            onClick={() => setActiveTab('trips')}
            className={`px-6 py-4 font-medium border-b-2 transition-colors ${
              activeTab === 'trips'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Trips
          </button>
          <button
            onClick={() => setActiveTab('receipts')}
            className={`px-6 py-4 font-medium border-b-2 transition-colors ${
              activeTab === 'receipts'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Receipts
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
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
        </div>

        {activeTab === 'trips' ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Trips</p>
                    <p className="text-2xl font-bold text-gray-900">{statusCounts.total}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded flex items-center justify-center">
                    <FileText className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Inprogress Trips</p>
                    <p className="text-2xl font-bold text-gray-900">{statusCounts.inProgress}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded flex items-center justify-center">
                    <FileText className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Completed Trips</p>
                    <p className="text-2xl font-bold text-gray-900">{statusCounts.completed}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded flex items-center justify-center">
                    <FileText className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Cancelled Trips</p>
                    <p className="text-2xl font-bold text-gray-900">{statusCounts.cancelled}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        (7)
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Request ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Requested Time
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
                        Space Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Funding Source
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created At
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredTrips.map((trip) => (
                      <tr
                        key={trip.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => {
                          setSelectedTrip(trip);
                          setShowDetailModal(true);
                        }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <FileText className="w-5 h-5 text-gray-400" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {trip.id.slice(0, 8)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {trip.request_id || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {trip.trips?.scheduled_pickup_time
                            ? new Date(trip.trips.scheduled_pickup_time).toLocaleString('en-US', {
                                month: '2-digit',
                                day: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false,
                              })
                            : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {trip.trips?.patients?.full_name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                          {trip.trips?.pickup_address || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                          {trip.trips?.dropoff_address || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {trip.vehicle_type || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {trip.trips?.funding_source || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(trip.created_at).toLocaleDateString('en-US', {
                            month: '2-digit',
                            day: '2-digit',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {trip.status.replace('_', ' ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Receipts</p>
                    <p className="text-2xl font-bold text-gray-900">{getTotalReceipts()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded flex items-center justify-center">
                    <FileText className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Fare</p>
                    <p className="text-2xl font-bold text-gray-900">{getTotalFare().toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        (5)
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Request ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Driver
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Distance
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Duration
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created At
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Trip Fare
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredTrips
                      .filter((trip) => trip.status === 'completed')
                      .map((trip) => (
                        <tr key={trip.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => {
                                setSelectedTrip(trip);
                                setShowDetailModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <Eye className="w-5 h-5" />
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {trip.id.slice(0, 8)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {trip.request_id || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {trip.trips?.patients?.full_name || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {trip.driver_name || 'Driver 1'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {trip.distance || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {trip.duration || '00:00:00'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(trip.created_at).toLocaleDateString('en-US', {
                              month: '2-digit',
                              day: '2-digit',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${trip.trip_fare?.toFixed(2) || '0.00'}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {showDetailModal && selectedTrip && (
        <FarmoutDetailModal
          farmoutTrip={selectedTrip}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedTrip(null);
          }}
        />
      )}
    </div>
  );
}
