import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useGoogleMaps } from '../hooks/useGoogleMaps';
import { MapPin, Plus, Trash2, Edit2, Save, X, AlertTriangle, CheckCircle } from 'lucide-react';

interface ServiceArea {
  id: string;
  name: string;
  color: string;
  coordinates: Array<{ lat: number; lng: number }>;
  active: boolean;
  alert_on_entry: boolean;
  alert_on_exit: boolean;
  created_at: string;
}

interface GeofenceAlert {
  id: string;
  driver_id: string;
  service_area_id: string;
  alert_type: 'entry' | 'exit';
  timestamp: string;
  driver_name?: string;
  area_name?: string;
}

export default function GeofencingManagement() {
  const [serviceAreas, setServiceAreas] = useState<ServiceArea[]>([]);
  const [selectedArea, setSelectedArea] = useState<ServiceArea | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingCoordinates, setDrawingCoordinates] = useState<Array<{ lat: number; lng: number }>>([]);
  const [editingArea, setEditingArea] = useState<Partial<ServiceArea>>({
    name: '',
    color: '#3b82f6',
    alert_on_entry: true,
    alert_on_exit: true,
    active: true
  });
  const [recentAlerts, setRecentAlerts] = useState<GeofenceAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const polygonsRef = useRef<google.maps.Polygon[]>([]);
  const drawingPolygonRef = useRef<google.maps.Polygon | null>(null);
  const { isLoaded } = useGoogleMaps();

  useEffect(() => {
    loadServiceAreas();
    loadRecentAlerts();
    monitorDriverLocations();
  }, []);

  useEffect(() => {
    if (isLoaded && mapRef.current && !googleMapRef.current) {
      initMap();
    }
  }, [isLoaded]);

  useEffect(() => {
    if (googleMapRef.current) {
      renderServiceAreas();
    }
  }, [serviceAreas]);

  async function loadServiceAreas() {
    try {
      const { data, error } = await supabase
        .from('service_areas')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setServiceAreas((data || []).map(area => ({
        ...area,
        coordinates: JSON.parse(area.boundary_coordinates || '[]')
      })));
    } catch (error) {
      console.error('Error loading service areas:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadRecentAlerts() {
    try {
      const { data, error } = await supabase
        .from('geofence_alerts')
        .select(`
          *,
          driver:profiles!driver_id(full_name),
          service_area:service_areas!service_area_id(name)
        `)
        .order('timestamp', { ascending: false })
        .limit(10);

      if (error) throw error;

      setRecentAlerts((data || []).map((alert: any) => ({
        ...alert,
        driver_name: alert.driver?.full_name,
        area_name: alert.service_area?.name
      })));
    } catch (error) {
      console.error('Error loading alerts:', error);
    }
  }

  function monitorDriverLocations() {
    const subscription = supabase
      .channel('driver-geofence-monitoring')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: 'role=eq.driver'
        },
        async (payload) => {
          const driver = payload.new;
          if (driver.current_latitude && driver.current_longitude) {
            await checkGeofenceViolations(driver);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }

  async function checkGeofenceViolations(driver: any) {
    const point = new google.maps.LatLng(driver.current_latitude, driver.current_longitude);

    for (const area of serviceAreas) {
      if (!area.active) continue;

      const polygon = new google.maps.Polygon({
        paths: area.coordinates
      });

      const isInside = google.maps.geometry.poly.containsLocation(point, polygon);

      const lastAlert = recentAlerts.find(
        alert => alert.driver_id === driver.id && alert.service_area_id === area.id
      );

      if (isInside && area.alert_on_entry && (!lastAlert || lastAlert.alert_type === 'exit')) {
        await createGeofenceAlert(driver.id, area.id, 'entry');
      } else if (!isInside && area.alert_on_exit && lastAlert?.alert_type === 'entry') {
        await createGeofenceAlert(driver.id, area.id, 'exit');
      }
    }
  }

  async function createGeofenceAlert(driverId: string, areaId: string, alertType: 'entry' | 'exit') {
    try {
      await supabase.from('geofence_alerts').insert({
        driver_id: driverId,
        service_area_id: areaId,
        alert_type: alertType,
        timestamp: new Date().toISOString()
      });

      await loadRecentAlerts();
    } catch (error) {
      console.error('Error creating geofence alert:', error);
    }
  }

  function initMap() {
    if (!mapRef.current || !window.google) return;

    googleMapRef.current = new google.maps.Map(mapRef.current, {
      zoom: 10,
      center: { lat: 34.0522, lng: -118.2437 },
      mapTypeId: 'roadmap',
      zoomControl: true,
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: false,
    });

    googleMapRef.current.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (isDrawing && e.latLng) {
        const newCoord = { lat: e.latLng.lat(), lng: e.latLng.lng() };
        const updatedCoords = [...drawingCoordinates, newCoord];
        setDrawingCoordinates(updatedCoords);
        updateDrawingPolygon(updatedCoords);
      }
    });

    renderServiceAreas();
  }

  function renderServiceAreas() {
    if (!googleMapRef.current || !window.google) return;

    polygonsRef.current.forEach(polygon => polygon.setMap(null));
    polygonsRef.current = [];

    serviceAreas.forEach(area => {
      const polygon = new google.maps.Polygon({
        paths: area.coordinates,
        strokeColor: area.color,
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: area.color,
        fillOpacity: area.active ? 0.35 : 0.15,
        map: googleMapRef.current,
      });

      polygon.addListener('click', () => {
        setSelectedArea(area);
      });

      polygonsRef.current.push(polygon);
    });
  }

  function updateDrawingPolygon(coordinates: Array<{ lat: number; lng: number }>) {
    if (!googleMapRef.current || !window.google) return;

    if (drawingPolygonRef.current) {
      drawingPolygonRef.current.setMap(null);
    }

    if (coordinates.length > 0) {
      drawingPolygonRef.current = new google.maps.Polygon({
        paths: coordinates,
        strokeColor: editingArea.color || '#3b82f6',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: editingArea.color || '#3b82f6',
        fillOpacity: 0.35,
        map: googleMapRef.current,
      });
    }
  }

  function startDrawing() {
    setIsDrawing(true);
    setDrawingCoordinates([]);
    setEditingArea({
      name: '',
      color: '#3b82f6',
      alert_on_entry: true,
      alert_on_exit: true,
      active: true
    });
  }

  function cancelDrawing() {
    setIsDrawing(false);
    setDrawingCoordinates([]);
    if (drawingPolygonRef.current) {
      drawingPolygonRef.current.setMap(null);
      drawingPolygonRef.current = null;
    }
  }

  async function saveServiceArea() {
    if (!editingArea.name || drawingCoordinates.length < 3) {
      alert('Please provide a name and draw at least 3 points');
      return;
    }

    try {
      const { error } = await supabase.from('service_areas').insert({
        name: editingArea.name,
        color: editingArea.color,
        boundary_coordinates: JSON.stringify(drawingCoordinates),
        alert_on_entry: editingArea.alert_on_entry,
        alert_on_exit: editingArea.alert_on_exit,
        active: editingArea.active
      });

      if (error) throw error;

      await loadServiceAreas();
      cancelDrawing();
      alert('Service area created successfully');
    } catch (error) {
      console.error('Error saving service area:', error);
      alert('Failed to save service area');
    }
  }

  async function deleteServiceArea(id: string) {
    if (!confirm('Are you sure you want to delete this service area?')) return;

    try {
      const { error } = await supabase.from('service_areas').delete().eq('id', id);
      if (error) throw error;

      await loadServiceAreas();
      setSelectedArea(null);
      alert('Service area deleted');
    } catch (error) {
      console.error('Error deleting service area:', error);
      alert('Failed to delete service area');
    }
  }

  async function toggleAreaActive(id: string, active: boolean) {
    try {
      const { error } = await supabase
        .from('service_areas')
        .update({ active })
        .eq('id', id);

      if (error) throw error;
      await loadServiceAreas();
    } catch (error) {
      console.error('Error updating service area:', error);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden bg-gray-50">
      <div className="w-96 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Service Areas</h2>
          <button
            onClick={startDrawing}
            disabled={isDrawing}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create New Area
          </button>
        </div>

        {isDrawing && (
          <div className="p-6 bg-blue-50 border-b border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-3">Drawing Mode</h3>
            <p className="text-sm text-blue-700 mb-4">Click on the map to add boundary points</p>

            <div className="space-y-3 mb-4">
              <input
                type="text"
                placeholder="Area Name"
                value={editingArea.name || ''}
                onChange={(e) => setEditingArea({ ...editingArea, name: e.target.value })}
                className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />

              <div>
                <label className="block text-sm font-medium text-blue-900 mb-1">Color</label>
                <input
                  type="color"
                  value={editingArea.color || '#3b82f6'}
                  onChange={(e) => setEditingArea({ ...editingArea, color: e.target.value })}
                  className="w-full h-10 rounded-lg cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingArea.alert_on_entry || false}
                    onChange={(e) => setEditingArea({ ...editingArea, alert_on_entry: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                  <span className="text-sm text-blue-900">Alert on entry</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingArea.alert_on_exit || false}
                    onChange={(e) => setEditingArea({ ...editingArea, alert_on_exit: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                  <span className="text-sm text-blue-900">Alert on exit</span>
                </label>
              </div>

              <p className="text-xs text-blue-600">Points drawn: {drawingCoordinates.length}</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={saveServiceArea}
                disabled={drawingCoordinates.length < 3}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
              <button
                onClick={cancelDrawing}
                className="flex-1 bg-gray-600 text-white py-2 rounded-lg font-medium hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Existing Areas</h3>
          <div className="space-y-3">
            {serviceAreas.map(area => (
              <div
                key={area.id}
                onClick={() => setSelectedArea(area)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedArea?.id === area.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: area.color }}
                    ></div>
                    <span className="font-semibold text-gray-900">{area.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={area.active}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleAreaActive(area.id, e.target.checked);
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                    </label>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteServiceArea(area.id);
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex gap-2 text-xs">
                  {area.alert_on_entry && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded">Entry Alert</span>
                  )}
                  {area.alert_on_exit && (
                    <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded">Exit Alert</span>
                  )}
                </div>
              </div>
            ))}

            {serviceAreas.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No service areas defined</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">Recent Alerts</h3>
          <div className="space-y-2">
            {recentAlerts.map(alert => (
              <div key={alert.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                {alert.alert_type === 'entry' ? (
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {alert.driver_name} {alert.alert_type === 'entry' ? 'entered' : 'exited'}
                  </p>
                  <p className="text-xs text-gray-600">{alert.area_name}</p>
                  <p className="text-xs text-gray-500">{new Date(alert.timestamp).toLocaleString()}</p>
                </div>
              </div>
            ))}

            {recentAlerts.length === 0 && (
              <p className="text-center text-sm text-gray-500 py-4">No recent alerts</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 relative">
        <div ref={mapRef} className="w-full h-full"></div>
        {!isLoaded && (
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading map...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
