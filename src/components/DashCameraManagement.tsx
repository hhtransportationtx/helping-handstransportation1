import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Video,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Filter,
  Download,
  Eye,
  Search,
  TrendingDown,
  TrendingUp,
  Activity,
  Settings,
} from 'lucide-react';
import { RavenConfiguration } from './RavenConfiguration';
import { RavenWebhookTester } from './RavenWebhookTester';

interface DashCameraEvent {
  id: string;
  vehicle_id: string;
  driver_id: string;
  event_type: string;
  severity: string;
  event_timestamp: string;
  video_url: string;
  thumbnail_url: string;
  location_lat: number;
  location_lng: number;
  speed_mph: number;
  reviewed: boolean;
  reviewed_by: string;
  reviewed_at: string;
  notes: string;
  vehicles?: {
    vehicle_name: string;
    vehicle_number: string;
  };
  profiles?: {
    full_name: string;
  };
}

interface SafetyScore {
  id: string;
  driver_id: string;
  date: string;
  overall_score: number;
  harsh_braking_count: number;
  harsh_acceleration_count: number;
  harsh_cornering_count: number;
  distraction_count: number;
  speeding_count: number;
  miles_driven: number;
  profiles?: {
    full_name: string;
  };
}

export function DashCameraManagement() {
  const [events, setEvents] = useState<DashCameraEvent[]>([]);
  const [safetyScores, setSafetyScores] = useState<SafetyScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'events' | 'scores' | 'setup' | 'test'>('events');
  const [selectedEvent, setSelectedEvent] = useState<DashCameraEvent | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [severityFilter, setSeverityFilter] = useState('all');
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadEvents();
    loadSafetyScores();

    const subscription = supabase
      .channel('dash_camera_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dash_camera_events' },
        () => {
          loadEvents();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'driver_safety_scores' },
        () => {
          loadSafetyScores();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function loadEvents() {
    try {
      const { data, error } = await supabase
        .from('dash_camera_events')
        .select(`
          *,
          vehicles (vehicle_name, vehicle_number),
          profiles (full_name)
        `)
        .order('event_timestamp', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Supabase error loading events:', error);
        alert(`Error loading events: ${error.message}`);
        throw error;
      }

      console.log('Loaded events:', data?.length || 0);
      setEvents(data || []);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadSafetyScores() {
    try {
      const { data, error } = await supabase
        .from('driver_safety_scores')
        .select(`
          *,
          profiles (full_name)
        `)
        .order('date', { ascending: false })
        .limit(50);

      if (error) throw error;
      setSafetyScores(data || []);
    } catch (error) {
      console.error('Error loading safety scores:', error);
    }
  }

  async function syncRavenData() {
    setSyncing(true);
    try {
      const { data: mappedVehicles, error } = await supabase
        .from('vehicle_camera_config')
        .select('vehicle_id, raven_device_id, vehicles(vehicle_number)')
        .not('raven_device_id', 'is', null);

      if (error) throw error;

      if (!mappedVehicles || mappedVehicles.length === 0) {
        alert('No vehicles are mapped to Raven devices. Please configure vehicle mappings in the Setup tab first.');
        setSyncing(false);
        return;
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/raven-connected-sync`;
      const headers = {
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      };

      let totalEvents = 0;
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      for (const vehicle of mappedVehicles) {
        try {
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              action: 'sync_events',
              vehicleId: vehicle.vehicle_id,
              startDate,
              endDate,
            }),
          });

          if (response.ok) {
            const result = await response.json();
            totalEvents += result.eventsImported || 0;
          }
        } catch (err) {
          console.error(`Failed to sync vehicle ${vehicle.vehicle_id}:`, err);
        }
      }

      alert(`Successfully synced ${totalEvents} events from ${mappedVehicles.length} vehicles (last 30 days)`);
      loadEvents();
    } catch (error) {
      console.error('Sync error:', error);
      alert('Failed to sync with Raven Connected. Please check your API key configuration.');
    } finally {
      setSyncing(false);
    }
  }

  async function markAsReviewed(eventId: string) {
    const notes = prompt('Add review notes (optional):');
    const { data: userData } = await supabase.auth.getUser();

    await supabase
      .from('dash_camera_events')
      .update({
        reviewed: true,
        reviewed_by: userData.user?.id,
        reviewed_at: new Date().toISOString(),
        notes: notes || '',
      })
      .eq('id', eventId);

    loadEvents();
  }

  function getSeverityColor(severity: string) {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      default:
        return 'bg-blue-100 text-blue-700 border-blue-300';
    }
  }

  function getScoreColor(score: number) {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-yellow-600';
    if (score >= 60) return 'text-orange-600';
    return 'text-red-600';
  }

  const filteredEvents = events.filter((event) => {
    if (severityFilter !== 'all' && event.severity !== severityFilter) return false;
    if (eventTypeFilter !== 'all' && !event.event_type.includes(eventTypeFilter)) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        event.profiles?.full_name.toLowerCase().includes(query) ||
        event.vehicles?.vehicle_name?.toLowerCase().includes(query) ||
        event.event_type.toLowerCase().includes(query)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dash camera data...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Raven Connected Dash Cameras</h1>
            <p className="text-gray-600">Monitor safety events and driver performance</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveView('events')}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                activeView === 'events'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Video className="w-4 h-4 inline mr-2" />
              Events
            </button>
            <button
              onClick={() => setActiveView('scores')}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                activeView === 'scores'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Activity className="w-4 h-4 inline mr-2" />
              Safety Scores
            </button>
            <button
              onClick={() => setActiveView('setup')}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                activeView === 'setup'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Settings className="w-4 h-4 inline mr-2" />
              Setup
            </button>
            <button
              onClick={() => setActiveView('test')}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                activeView === 'test'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <CheckCircle className="w-4 h-4 inline mr-2" />
              Test
            </button>
          </div>
        </div>

        {activeView === 'events' && (
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search driver or vehicle..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Event Types</option>
              <option value="braking">Harsh Braking</option>
              <option value="acceleration">Harsh Acceleration</option>
              <option value="cornering">Harsh Cornering</option>
              <option value="distraction">Driver Distraction</option>
              <option value="speeding">Speeding</option>
            </select>

            <button
              onClick={syncRavenData}
              disabled={syncing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {syncing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Syncing...
                </>
              ) : (
                'Sync Data'
              )}
            </button>
          </div>
        )}
      </div>

      {activeView === 'events' && (
        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredEvents.map((event) => (
              <div key={event.id} className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                <div className="relative">
                  {event.thumbnail_url ? (
                    <img
                      src={event.thumbnail_url}
                      alt="Event thumbnail"
                      className="w-full h-48 object-cover"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                      <Video className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium border ${getSeverityColor(
                        event.severity
                      )}`}
                    >
                      {event.severity.toUpperCase()}
                    </span>
                  </div>
                  {event.reviewed && (
                    <div className="absolute top-3 right-3">
                      <CheckCircle className="w-6 h-6 text-green-600 bg-white rounded-full" />
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">
                      {event.event_type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </h3>
                    <span className="text-xs text-gray-500">
                      {event.speed_mph ? `${event.speed_mph} mph` : 'N/A'}
                    </span>
                  </div>

                  <div className="space-y-1 text-sm text-gray-600 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Driver:</span>
                      {event.profiles?.full_name || 'Unknown'}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Vehicle:</span>
                      {event.vehicles?.vehicle_name || 'Unknown'}
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {new Date(event.event_timestamp).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {event.video_url && (
                      <button
                        onClick={() => {
                          setSelectedEvent(event);
                          setShowVideoModal(true);
                        }}
                        className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        View Video
                      </button>
                    )}
                    {!event.reviewed && (
                      <button
                        onClick={() => markAsReviewed(event.id)}
                        className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        Mark Reviewed
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredEvents.length === 0 && (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Events Found</h3>
              <p className="text-gray-600">
                {events.length === 0
                  ? 'No dash camera events in database. Click "Sync Data" to import events.'
                  : `No events match your filters (${events.length} total events available)`
                }
              </p>
            </div>
          )}
        </div>
      )}

      {activeView === 'scores' && (
        <div className="flex-1 overflow-auto p-6">
          <div className="bg-white rounded-lg shadow border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Driver
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Safety Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Harsh Braking
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Harsh Accel
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Cornering
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Distraction
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Speeding
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Miles Driven
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {safetyScores.map((score) => (
                    <tr key={score.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{score.profiles?.full_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(score.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`text-2xl font-bold ${getScoreColor(score.overall_score)}`}>
                            {score.overall_score}
                          </span>
                          {score.overall_score >= 90 ? (
                            <TrendingUp className="w-5 h-5 text-green-600" />
                          ) : (
                            <TrendingDown className="w-5 h-5 text-red-600" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span
                          className={`px-2 py-1 rounded text-sm ${
                            score.harsh_braking_count > 0 ? 'bg-red-100 text-red-700' : 'text-gray-600'
                          }`}
                        >
                          {score.harsh_braking_count}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span
                          className={`px-2 py-1 rounded text-sm ${
                            score.harsh_acceleration_count > 0 ? 'bg-red-100 text-red-700' : 'text-gray-600'
                          }`}
                        >
                          {score.harsh_acceleration_count}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span
                          className={`px-2 py-1 rounded text-sm ${
                            score.harsh_cornering_count > 0 ? 'bg-red-100 text-red-700' : 'text-gray-600'
                          }`}
                        >
                          {score.harsh_cornering_count}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span
                          className={`px-2 py-1 rounded text-sm ${
                            score.distraction_count > 0 ? 'bg-red-100 text-red-700' : 'text-gray-600'
                          }`}
                        >
                          {score.distraction_count}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span
                          className={`px-2 py-1 rounded text-sm ${
                            score.speeding_count > 0 ? 'bg-red-100 text-red-700' : 'text-gray-600'
                          }`}
                        >
                          {score.speeding_count}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {score.miles_driven || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {safetyScores.length === 0 && (
            <div className="text-center py-12">
              <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Safety Scores Yet</h3>
              <p className="text-gray-600">Safety scores will appear here once events are processed</p>
            </div>
          )}
        </div>
      )}

      {activeView === 'setup' && (
        <div className="flex-1 overflow-auto">
          <RavenConfiguration />
        </div>
      )}

      {activeView === 'test' && (
        <div className="flex-1 overflow-auto">
          <RavenWebhookTester />
        </div>
      )}

      {showVideoModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Event Video</h2>
              <button
                onClick={() => {
                  setShowVideoModal(false);
                  setSelectedEvent(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              {selectedEvent.video_url ? (
                <video controls className="w-full rounded-lg" src={selectedEvent.video_url}>
                  Your browser does not support video playback.
                </video>
              ) : (
                <div className="text-center py-12">
                  <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                  <p className="text-gray-600">Video not available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
