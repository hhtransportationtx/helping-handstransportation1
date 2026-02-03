import { useState, useEffect, useRef } from 'react';
import { supabase, Trip, Patient, Profile, Mapper } from '../lib/supabase';
import { Maximize2, Calendar, Clock, Zap, CheckCircle, AlertCircle, Save, MapPin, Navigation, Search, Plus, Edit2, Trash2 } from 'lucide-react';
import { useGoogleMaps } from '../hooks/useGoogleMaps';
import { useAuth } from '../contexts/AuthContext';

type TabType = 'playground' | 'schedule' | 'mapper' | 'template' | 'holidays' | 'violationSets';

interface TripWithDetails extends Trip {
  patients?: Patient;
}

interface AutoScheduleResult {
  success: boolean;
  trip_id: string;
  driver_id: string;
  driver_name: string;
  message: string;
}

interface ViolationSet {
  id: string;
  name: string;
  pickup_early: number;
  pickup_late: number;
  dropoff_early: number;
  dropoff_late: number;
  max_onboard_time: number;
  overlap_indication: string;
  break_cushion: number;
  max_distance: number;
  max_trips: number;
  allow_onboard_violations: boolean;
  allow_capacity_violations: boolean;
  ab_driver_preference: boolean;
}

export function PlannerManagement() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('playground');
  const [trips, setTrips] = useState<TripWithDetails[]>([]);
  const [unscheduledTrips, setUnscheduledTrips] = useState<TripWithDetails[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedServiceArea, setSelectedServiceArea] = useState('all');
  const [selectedDrivers, setSelectedDrivers] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [serviceAreas, setServiceAreas] = useState<string[]>([]);
  const [drivers, setDrivers] = useState<Profile[]>([]);
  const [scheduling, setScheduling] = useState(false);
  const [results, setResults] = useState<AutoScheduleResult[]>([]);
  const [autoScheduleEnabled, setAutoScheduleEnabled] = useState(false);
  const [violationSets, setViolationSets] = useState<ViolationSet[]>([]);
  const [batchSet, setBatchSet] = useState<ViolationSet | null>(null);
  const [singleSet, setSingleSet] = useState<ViolationSet | null>(null);
  const [saving, setSaving] = useState(false);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');

  const [mappers, setMappers] = useState<Mapper[]>([]);
  const [mapperSearch, setMapperSearch] = useState('');
  const [mapperView, setMapperView] = useState<'vehicles' | 'drivers'>('vehicles');
  const [showMapperModal, setShowMapperModal] = useState(false);
  const [selectedMapper, setSelectedMapper] = useState<Mapper | null>(null);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const { isLoaded } = useGoogleMaps();

  useEffect(() => {
    loadTrips();
    loadUnscheduledTrips();
    loadDrivers();

    const subscription = supabase
      .channel('planner_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trips' },
        () => {
          loadTrips();
          loadUnscheduledTrips();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [selectedDate]);

  useEffect(() => {
    if (isLoaded && mapRef.current && !mapInstanceRef.current) {
      const map = new google.maps.Map(mapRef.current, {
        center: { lat: 37.7749, lng: -122.4194 },
        zoom: 10,
        mapTypeId: mapType,
      });
      mapInstanceRef.current = map;
    }
  }, [isLoaded, mapType]);

  useEffect(() => {
    if (mapInstanceRef.current) {
      updateMapMarkers();
    }
  }, [trips, drivers]);

  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setMapTypeId(mapType);
    }
  }, [mapType]);

  useEffect(() => {
    if (mapInstanceRef.current) {
      updateMapMarkers();
    }
  }, [selectedServiceArea, selectedDrivers, selectedStatus]);

  useEffect(() => {
    if (autoScheduleEnabled) {
      const interval = setInterval(() => {
        autoScheduleTrips();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [autoScheduleEnabled]);

  useEffect(() => {
    if (activeTab === 'violationSets') {
      loadViolationSets();
    } else if (activeTab === 'mapper') {
      loadMappers();
    }
  }, [activeTab]);

  async function loadTrips() {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select(`
          *,
          patients (*)
        `)
        .order('scheduled_pickup_time', { ascending: true });

      if (error) throw error;

      const filtered = (data || []).filter((trip) => {
        const tripDate = new Date(trip.scheduled_pickup_time).toISOString().split('T')[0];
        return tripDate === selectedDate;
      });

      setTrips(filtered);

      const areas = new Set<string>();
      data?.forEach((trip) => {
        if (trip.service_area) areas.add(trip.service_area);
      });
      setServiceAreas(Array.from(areas).sort());
    } catch (error) {
      console.error('Error loading trips:', error);
    }
  }

  async function loadUnscheduledTrips() {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select(`
          *,
          patients (*)
        `)
        .is('driver_id', null)
        .in('status', ['scheduled', 'pending'])
        .order('scheduled_pickup_time', { ascending: true })
        .limit(50);

      if (error) throw error;
      setUnscheduledTrips(data || []);
    } catch (error) {
      console.error('Error loading unscheduled trips:', error);
    }
  }

  async function loadDrivers() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'driver')
        .order('full_name', { ascending: true });

      if (error) throw error;
      setDrivers(data || []);
    } catch (error) {
      console.error('Error loading drivers:', error);
    }
  }

  function updateMapMarkers() {
    if (!mapInstanceRef.current) return;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    const bounds = new google.maps.LatLngBounds();
    let hasValidLocation = false;

    const filteredTrips = getFilteredTrips();

    filteredTrips.forEach((trip) => {
      if (trip.pickup_lat && trip.pickup_lng) {
        const pickupMarker = new google.maps.Marker({
          position: { lat: trip.pickup_lat, lng: trip.pickup_lng },
          map: mapInstanceRef.current!,
          title: `Pickup: ${trip.patients?.full_name || 'Unknown'}`,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#22c55e',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
        });

        const pickupInfoWindow = new google.maps.InfoWindow({
          content: `
            <div style="padding: 8px;">
              <strong>Pickup</strong><br/>
              ${trip.patients?.full_name || 'Unknown'}<br/>
              ${trip.pickup_address}<br/>
              ${new Date(trip.scheduled_pickup_time).toLocaleString()}
            </div>
          `,
        });

        pickupMarker.addListener('click', () => {
          pickupInfoWindow.open(mapInstanceRef.current!, pickupMarker);
        });

        markersRef.current.push(pickupMarker);
        bounds.extend({ lat: trip.pickup_lat, lng: trip.pickup_lng });
        hasValidLocation = true;
      }

      if (trip.dropoff_lat && trip.dropoff_lng) {
        const dropoffMarker = new google.maps.Marker({
          position: { lat: trip.dropoff_lat, lng: trip.dropoff_lng },
          map: mapInstanceRef.current!,
          title: `Dropoff: ${trip.patients?.full_name || 'Unknown'}`,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#ef4444',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
        });

        const dropoffInfoWindow = new google.maps.InfoWindow({
          content: `
            <div style="padding: 8px;">
              <strong>Dropoff</strong><br/>
              ${trip.patients?.full_name || 'Unknown'}<br/>
              ${trip.dropoff_address}
            </div>
          `,
        });

        dropoffMarker.addListener('click', () => {
          dropoffInfoWindow.open(mapInstanceRef.current!, dropoffMarker);
        });

        markersRef.current.push(dropoffMarker);
        bounds.extend({ lat: trip.dropoff_lat, lng: trip.dropoff_lng });
        hasValidLocation = true;
      }
    });

    const activeDrivers = selectedDrivers === 'all'
      ? drivers.filter(d => d.status === 'active')
      : drivers.filter(d => d.id === selectedDrivers && d.status === 'active');

    activeDrivers.forEach((driver) => {
      if (driver.current_latitude && driver.current_longitude) {
        const driverMarker = new google.maps.Marker({
          position: { lat: driver.current_latitude, lng: driver.current_longitude },
          map: mapInstanceRef.current!,
          title: driver.full_name,
          icon: {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 6,
            fillColor: '#3b82f6',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
            rotation: 0,
          },
        });

        const driverInfoWindow = new google.maps.InfoWindow({
          content: `
            <div style="padding: 8px;">
              <strong>Driver</strong><br/>
              ${driver.full_name}<br/>
              ${driver.phone || 'No phone'}
            </div>
          `,
        });

        driverMarker.addListener('click', () => {
          driverInfoWindow.open(mapInstanceRef.current!, driverMarker);
        });

        markersRef.current.push(driverMarker);
        bounds.extend({ lat: driver.current_latitude, lng: driver.current_longitude });
        hasValidLocation = true;
      }
    });

    if (hasValidLocation && filteredTrips.length > 0) {
      mapInstanceRef.current!.fitBounds(bounds);
    }
  }

  function getFilteredTrips(): TripWithDetails[] {
    return trips.filter((trip) => {
      if (selectedServiceArea !== 'all' && trip.service_area !== selectedServiceArea) {
        return false;
      }
      if (selectedDrivers !== 'all' && trip.driver_id !== selectedDrivers) {
        return false;
      }
      if (selectedStatus !== 'all' && trip.status !== selectedStatus) {
        return false;
      }
      return true;
    });
  }

  function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3959;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  async function findBestDriver(trip: TripWithDetails) {
    const { data: drivers } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'driver')
      .eq('status', 'active')
      .not('current_latitude', 'is', null)
      .not('current_longitude', 'is', null);

    if (!drivers || drivers.length === 0) return null;

    const { data: assignedTrips } = await supabase
      .from('trips')
      .select('driver_id')
      .not('driver_id', 'is', null)
      .in('status', ['assigned', 'in-progress', 'arrived']);

    const driverWorkload = new Map<string, number>();
    assignedTrips?.forEach((t) => {
      const count = driverWorkload.get(t.driver_id) || 0;
      driverWorkload.set(t.driver_id, count + 1);
    });

    let bestDriver = null;
    let bestScore = -Infinity;

    for (const driver of drivers) {
      const workload = driverWorkload.get(driver.id) || 0;
      const workloadScore = 10 - workload;

      let distanceScore = 5;
      if (trip.pickup_lat && trip.pickup_lng && driver.current_latitude && driver.current_longitude) {
        const distance = calculateDistance(
          trip.pickup_lat,
          trip.pickup_lng,
          driver.current_latitude,
          driver.current_longitude
        );
        distanceScore = Math.max(0, 10 - distance / 2);
      }

      const totalScore = workloadScore * 0.4 + distanceScore * 0.6;

      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestDriver = driver;
      }
    }

    return bestDriver;
  }

  async function autoScheduleTrips() {
    if (unscheduledTrips.length === 0) return;

    setScheduling(true);
    const newResults: AutoScheduleResult[] = [];

    for (const trip of unscheduledTrips.slice(0, 10)) {
      const driver = await findBestDriver(trip);

      if (driver) {
        const { error } = await supabase
          .from('trips')
          .update({
            driver_id: driver.id,
            status: 'assigned',
            auto_scheduled: true,
          })
          .eq('id', trip.id);

        if (!error) {
          newResults.push({
            success: true,
            trip_id: trip.id,
            driver_id: driver.id,
            driver_name: driver.full_name,
            message: `Assigned to ${driver.full_name}`,
          });
        } else {
          newResults.push({
            success: false,
            trip_id: trip.id,
            driver_id: '',
            driver_name: '',
            message: 'Failed to assign',
          });
        }
      } else {
        newResults.push({
          success: false,
          trip_id: trip.id,
          driver_id: '',
          driver_name: '',
          message: 'No available drivers',
        });
      }
    }

    setResults(newResults);
    await loadUnscheduledTrips();
    setScheduling(false);
  }

  async function scheduleTrip(trip: TripWithDetails) {
    setScheduling(true);
    const driver = await findBestDriver(trip);

    if (driver) {
      const { error } = await supabase
        .from('trips')
        .update({
          driver_id: driver.id,
          status: 'assigned',
          auto_scheduled: true,
        })
        .eq('id', trip.id);

      if (!error) {
        setResults([
          {
            success: true,
            trip_id: trip.id,
            driver_id: driver.id,
            driver_name: driver.full_name,
            message: `Successfully assigned to ${driver.full_name}`,
          },
        ]);
        await loadUnscheduledTrips();
      } else {
        setResults([
          {
            success: false,
            trip_id: trip.id,
            driver_id: '',
            driver_name: '',
            message: 'Failed to assign trip',
          },
        ]);
      }
    } else {
      setResults([
        {
          success: false,
          trip_id: trip.id,
          driver_id: '',
          driver_name: '',
          message: 'No available drivers found',
        },
      ]);
    }

    setScheduling(false);
  }

  async function loadViolationSets() {
    try {
      const { data, error } = await supabase
        .from('violation_sets')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      if (data) {
        setViolationSets(data);
        const batch = data.find(set => set.name === 'batch');
        const single = data.find(set => set.name === 'single');
        if (batch) setBatchSet(batch);
        if (single) setSingleSet(single);
      }
    } catch (error) {
      console.error('Error loading violation sets:', error);
    }
  }

  async function saveViolationSets() {
    setSaving(true);
    try {
      const updates = [];

      if (batchSet) {
        updates.push(
          supabase
            .from('violation_sets')
            .update({
              pickup_early: batchSet.pickup_early,
              pickup_late: batchSet.pickup_late,
              dropoff_early: batchSet.dropoff_early,
              dropoff_late: batchSet.dropoff_late,
              max_onboard_time: batchSet.max_onboard_time,
              overlap_indication: batchSet.overlap_indication,
              break_cushion: batchSet.break_cushion,
              max_distance: batchSet.max_distance,
              max_trips: batchSet.max_trips,
              allow_onboard_violations: batchSet.allow_onboard_violations,
              allow_capacity_violations: batchSet.allow_capacity_violations,
              ab_driver_preference: batchSet.ab_driver_preference,
              updated_at: new Date().toISOString(),
            })
            .eq('name', 'batch')
        );
      }

      if (singleSet) {
        updates.push(
          supabase
            .from('violation_sets')
            .update({
              pickup_early: singleSet.pickup_early,
              pickup_late: singleSet.pickup_late,
              dropoff_early: singleSet.dropoff_early,
              dropoff_late: singleSet.dropoff_late,
              max_onboard_time: singleSet.max_onboard_time,
              overlap_indication: singleSet.overlap_indication,
              break_cushion: singleSet.break_cushion,
              max_distance: singleSet.max_distance,
              max_trips: singleSet.max_trips,
              allow_onboard_violations: singleSet.allow_onboard_violations,
              allow_capacity_violations: singleSet.allow_capacity_violations,
              ab_driver_preference: singleSet.ab_driver_preference,
              updated_at: new Date().toISOString(),
            })
            .eq('name', 'single')
        );
      }

      await Promise.all(updates);
      await loadViolationSets();
    } catch (error) {
      console.error('Error saving violation sets:', error);
    } finally {
      setSaving(false);
    }
  }

  async function loadMappers() {
    try {
      const { data, error } = await supabase
        .from('mappers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMappers(data || []);
    } catch (error) {
      console.error('Error loading mappers:', error);
    }
  }

  async function deleteMapper(id: string) {
    try {
      const { error } = await supabase.from('mappers').delete().eq('id', id);
      if (error) throw error;
      await loadMappers();
    } catch (error) {
      console.error('Error deleting mapper:', error);
    }
  }

  function getFilteredMappers() {
    if (!mapperSearch) return mappers;
    return mappers.filter((mapper) =>
      mapper.title.toLowerCase().includes(mapperSearch.toLowerCase())
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="flex gap-1 px-6">
          <button
            onClick={() => setActiveTab('playground')}
            className={`px-6 py-4 font-medium border-b-2 transition-colors ${
              activeTab === 'playground'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Playground
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`px-6 py-4 font-medium border-b-2 transition-colors ${
              activeTab === 'schedule'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Schedule
          </button>
          <button
            onClick={() => setActiveTab('mapper')}
            className={`px-6 py-4 font-medium border-b-2 transition-colors ${
              activeTab === 'mapper'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Mapper
          </button>
          <button
            onClick={() => setActiveTab('template')}
            className={`px-6 py-4 font-medium border-b-2 transition-colors ${
              activeTab === 'template'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Template
          </button>
          <button
            onClick={() => setActiveTab('holidays')}
            className={`px-6 py-4 font-medium border-b-2 transition-colors ${
              activeTab === 'holidays'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Holidays
          </button>
          <button
            onClick={() => setActiveTab('violationSets')}
            className={`px-6 py-4 font-medium border-b-2 transition-colors ${
              activeTab === 'violationSets'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Violation Sets
          </button>
        </div>
      </div>

      {activeTab === 'playground' && (
        <div className="flex-1 overflow-auto p-6">
          <div className="flex items-center gap-4 mb-4">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />

            <select
              value={selectedServiceArea}
              onChange={(e) => setSelectedServiceArea(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 min-w-[250px]"
            >
              <option value="all">-- Select Service Area --</option>
              {serviceAreas.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>

            <select
              value={selectedDrivers}
              onChange={(e) => setSelectedDrivers(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 min-w-[200px]"
            >
              <option value="all">-- Select Drivers --</option>
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.full_name}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 min-w-[150px]"
            >
              <option value="all">Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="assigned">Assigned</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 mb-6">
            <div className="relative">
              <div className="absolute top-2 left-2 z-10 bg-white rounded-lg shadow-md overflow-hidden flex">
                <button
                  onClick={() => setMapType('roadmap')}
                  className={`px-3 py-2 border-r border-gray-200 hover:bg-gray-50 transition-colors ${
                    mapType === 'roadmap' ? 'bg-blue-50 text-blue-600 font-medium' : ''
                  }`}
                >
                  Map
                </button>
                <button
                  onClick={() => setMapType('satellite')}
                  className={`px-3 py-2 hover:bg-gray-50 transition-colors ${
                    mapType === 'satellite' ? 'bg-blue-50 text-blue-600 font-medium' : ''
                  }`}
                >
                  Satellite
                </button>
              </div>
              <div className="absolute top-2 right-2 z-10 flex gap-2">
                <div className="bg-white rounded-lg shadow-md px-3 py-2 text-sm text-gray-700">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                    Pickup
                  </span>
                </div>
                <div className="bg-white rounded-lg shadow-md px-3 py-2 text-sm text-gray-700">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                    Dropoff
                  </span>
                </div>
                <div className="bg-white rounded-lg shadow-md px-3 py-2 text-sm text-gray-700">
                  <span className="flex items-center gap-2">
                    <Navigation className="w-3 h-3 text-blue-600" />
                    Driver
                  </span>
                </div>
              </div>
              <div ref={mapRef} className="h-96 bg-gray-100 rounded-lg">
                {!isLoaded && (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-gray-500">Loading map...</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="font-medium text-gray-900">Trips ({getFilteredTrips().length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">From Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">To Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Funding Source
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Space Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Service Area
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Pickup Address
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Dropoff Address
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Distance</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone No.</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {getFilteredTrips().map((trip) => (
                    <tr key={trip.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {new Date(trip.scheduled_pickup_time).toLocaleDateString('en-US', {
                          month: '2-digit',
                          day: '2-digit',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {new Date(trip.scheduled_pickup_time).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false,
                        })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {trip.actual_dropoff_time
                          ? new Date(trip.actual_dropoff_time).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: false,
                            })
                          : 'N/A'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {trip.funding_source || 'N/A'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {trip.patients?.full_name || 'N/A'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {trip.space_type === 'wheelchair' ? 'WAV' : 'AMB'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {trip.service_area || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">{trip.pickup_address}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">{trip.dropoff_address}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {trip.distance_miles || 'N/A'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {trip.patients?.phone || 'N/A'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {trip.trip_number || trip.id.slice(0, 8)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{trip.status}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {trip.dispatcher_notes || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'schedule' && (
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Auto Scheduler</h2>
                <p className="text-gray-600">Intelligent trip assignment based on driver availability and location</p>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-3 bg-white px-6 py-3 rounded-lg shadow border border-gray-200">
                  <input
                    type="checkbox"
                    checked={autoScheduleEnabled}
                    onChange={(e) => setAutoScheduleEnabled(e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="font-medium text-gray-700">Auto-Schedule (30s)</span>
                </label>

                <button
                  onClick={autoScheduleTrips}
                  disabled={scheduling || unscheduledTrips.length === 0}
                  className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-all shadow hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Zap className="w-5 h-5" />
                  Schedule All
                </button>
              </div>
            </div>

            {results.length > 0 && (
              <div className="mb-6 bg-white rounded-lg shadow border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Recent Scheduling Results</h3>
                <div className="space-y-2">
                  {results.map((result, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                      {result.success ? (
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                      )}
                      <span className="text-sm text-gray-700">{result.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
              <div className="p-6 bg-gray-50 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-gray-900">Unscheduled Trips</h3>
                  </div>
                  <span className="text-sm text-gray-600">{unscheduledTrips.length} trips waiting</span>
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {unscheduledTrips.map((trip) => (
                  <div key={trip.id} className="p-6 hover:bg-gray-50 transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900">{trip.patients?.full_name}</h3>
                          <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                            {trip.status}
                          </span>
                          {trip.space_type === 'wheelchair' && (
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                              Wheelchair
                            </span>
                          )}
                        </div>

                        <div className="space-y-1 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            {new Date(trip.scheduled_pickup_time).toLocaleString()}
                          </div>
                          <div>From: {trip.pickup_address}</div>
                          <div>To: {trip.dropoff_address}</div>
                        </div>
                      </div>

                      <button
                        onClick={() => scheduleTrip(trip)}
                        disabled={scheduling}
                        className="ml-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Schedule Now
                      </button>
                    </div>
                  </div>
                ))}

                {unscheduledTrips.length === 0 && (
                  <div className="p-12 text-center">
                    <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">All Trips Scheduled</h3>
                    <p className="text-gray-600">No trips are waiting to be assigned to drivers</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'violationSets' && (
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-2 gap-6 mb-6">
              {batchSet && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Batch</h2>

                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-4">Driver Load</h3>
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <label className="text-sm text-gray-700 w-32">Pickup Early:</label>
                          <input
                            type="number"
                            value={batchSet.pickup_early}
                            onChange={(e) => setBatchSet({ ...batchSet, pickup_early: parseInt(e.target.value) || 0 })}
                            className="px-3 py-2 border border-gray-300 rounded-lg w-24 text-center"
                          />
                          <span className="text-sm text-gray-500">minutes</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <label className="text-sm text-gray-700 w-32">Pickup Late:</label>
                          <input
                            type="number"
                            value={batchSet.pickup_late}
                            onChange={(e) => setBatchSet({ ...batchSet, pickup_late: parseInt(e.target.value) || 0 })}
                            className="px-3 py-2 border border-gray-300 rounded-lg w-24 text-center"
                          />
                          <span className="text-sm text-gray-500">minutes</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <label className="text-sm text-gray-700 w-32">Dropoff Early:</label>
                          <input
                            type="number"
                            value={batchSet.dropoff_early}
                            onChange={(e) => setBatchSet({ ...batchSet, dropoff_early: parseInt(e.target.value) || 0 })}
                            className="px-3 py-2 border border-gray-300 rounded-lg w-24 text-center"
                          />
                          <span className="text-sm text-gray-500">minutes</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <label className="text-sm text-gray-700 w-32">Dropoff Late:</label>
                          <input
                            type="number"
                            value={batchSet.dropoff_late}
                            onChange={(e) => setBatchSet({ ...batchSet, dropoff_late: parseInt(e.target.value) || 0 })}
                            className="px-3 py-2 border border-gray-300 rounded-lg w-24 text-center"
                          />
                          <span className="text-sm text-gray-500">minutes</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <label className="text-sm text-gray-700 w-32">Max Onboard Time:</label>
                          <input
                            type="number"
                            value={batchSet.max_onboard_time}
                            onChange={(e) => setBatchSet({ ...batchSet, max_onboard_time: parseInt(e.target.value) || 0 })}
                            className="px-3 py-2 border border-gray-300 rounded-lg w-24 text-center"
                          />
                          <span className="text-sm text-gray-500">minutes</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-4">Planning</h3>
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <label className="text-sm text-gray-700 w-32">Overlap Indication:</label>
                          <input
                            type="text"
                            value={batchSet.overlap_indication}
                            onChange={(e) => setBatchSet({ ...batchSet, overlap_indication: e.target.value })}
                            className="px-3 py-2 border border-gray-300 rounded-lg w-24 text-center"
                          />
                          <span className="text-sm text-gray-500">minutes</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <label className="text-sm text-gray-700 w-32">Break Cushion:</label>
                          <input
                            type="number"
                            value={batchSet.break_cushion}
                            onChange={(e) => setBatchSet({ ...batchSet, break_cushion: parseInt(e.target.value) || 0 })}
                            className="px-3 py-2 border border-gray-300 rounded-lg w-24 text-center"
                          />
                          <span className="text-sm text-gray-500">minutes</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <label className="text-sm text-gray-700 w-32">Max Distance:</label>
                          <input
                            type="number"
                            value={batchSet.max_distance}
                            onChange={(e) => setBatchSet({ ...batchSet, max_distance: parseInt(e.target.value) || 0 })}
                            className="px-3 py-2 border border-gray-300 rounded-lg w-24 text-center"
                          />
                          <span className="text-sm text-gray-500">miles</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <label className="text-sm text-gray-700 w-32">Max Trips:</label>
                          <input
                            type="number"
                            value={batchSet.max_trips}
                            onChange={(e) => setBatchSet({ ...batchSet, max_trips: parseInt(e.target.value) || 0 })}
                            className="px-3 py-2 border border-gray-300 rounded-lg w-24 text-center"
                          />
                        </div>

                        <div className="space-y-2 pt-2">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={batchSet.allow_onboard_violations}
                              onChange={(e) => setBatchSet({ ...batchSet, allow_onboard_violations: e.target.checked })}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">Allow Onboard Violation(s)</span>
                          </label>

                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={batchSet.allow_capacity_violations}
                              onChange={(e) => setBatchSet({ ...batchSet, allow_capacity_violations: e.target.checked })}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">Allow Capacity Violation(s)</span>
                          </label>

                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={batchSet.ab_driver_preference}
                              onChange={(e) => setBatchSet({ ...batchSet, ab_driver_preference: e.target.checked })}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">A/B Driver Preference</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {singleSet && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Single</h2>

                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-4">Driver Load</h3>
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <label className="text-sm text-gray-700 w-32">Pickup Early:</label>
                          <input
                            type="number"
                            value={singleSet.pickup_early}
                            onChange={(e) => setSingleSet({ ...singleSet, pickup_early: parseInt(e.target.value) || 0 })}
                            className="px-3 py-2 border border-gray-300 rounded-lg w-24 text-center"
                          />
                          <span className="text-sm text-gray-500">minutes</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <label className="text-sm text-gray-700 w-32">Pickup Late:</label>
                          <input
                            type="number"
                            value={singleSet.pickup_late}
                            onChange={(e) => setSingleSet({ ...singleSet, pickup_late: parseInt(e.target.value) || 0 })}
                            className="px-3 py-2 border border-gray-300 rounded-lg w-24 text-center"
                          />
                          <span className="text-sm text-gray-500">minutes</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <label className="text-sm text-gray-700 w-32">Dropoff Early:</label>
                          <input
                            type="number"
                            value={singleSet.dropoff_early}
                            onChange={(e) => setSingleSet({ ...singleSet, dropoff_early: parseInt(e.target.value) || 0 })}
                            className="px-3 py-2 border border-gray-300 rounded-lg w-24 text-center"
                          />
                          <span className="text-sm text-gray-500">minutes</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <label className="text-sm text-gray-700 w-32">Dropoff Late:</label>
                          <input
                            type="number"
                            value={singleSet.dropoff_late}
                            onChange={(e) => setSingleSet({ ...singleSet, dropoff_late: parseInt(e.target.value) || 0 })}
                            className="px-3 py-2 border border-gray-300 rounded-lg w-24 text-center"
                          />
                          <span className="text-sm text-gray-500">minutes</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <label className="text-sm text-gray-700 w-32">Max Onboard Time:</label>
                          <input
                            type="number"
                            value={singleSet.max_onboard_time}
                            onChange={(e) => setSingleSet({ ...singleSet, max_onboard_time: parseInt(e.target.value) || 0 })}
                            className="px-3 py-2 border border-gray-300 rounded-lg w-24 text-center"
                          />
                          <span className="text-sm text-gray-500">minutes</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-4">Planning</h3>
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <label className="text-sm text-gray-700 w-32">Overlap Indication:</label>
                          <input
                            type="text"
                            value={singleSet.overlap_indication}
                            onChange={(e) => setSingleSet({ ...singleSet, overlap_indication: e.target.value })}
                            className="px-3 py-2 border border-gray-300 rounded-lg w-24 text-center"
                          />
                          <span className="text-sm text-gray-500">minutes</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <label className="text-sm text-gray-700 w-32">Break Cushion:</label>
                          <input
                            type="number"
                            value={singleSet.break_cushion}
                            onChange={(e) => setSingleSet({ ...singleSet, break_cushion: parseInt(e.target.value) || 0 })}
                            className="px-3 py-2 border border-gray-300 rounded-lg w-24 text-center"
                          />
                          <span className="text-sm text-gray-500">minutes</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <label className="text-sm text-gray-700 w-32">Max Distance:</label>
                          <input
                            type="number"
                            value={singleSet.max_distance}
                            onChange={(e) => setSingleSet({ ...singleSet, max_distance: parseInt(e.target.value) || 0 })}
                            className="px-3 py-2 border border-gray-300 rounded-lg w-24 text-center"
                          />
                          <span className="text-sm text-gray-500">miles</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <label className="text-sm text-gray-700 w-32">Max Trips:</label>
                          <input
                            type="number"
                            value={singleSet.max_trips}
                            onChange={(e) => setSingleSet({ ...singleSet, max_trips: parseInt(e.target.value) || 0 })}
                            className="px-3 py-2 border border-gray-300 rounded-lg w-24 text-center"
                          />
                        </div>

                        <div className="space-y-2 pt-2">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={singleSet.allow_onboard_violations}
                              onChange={(e) => setSingleSet({ ...singleSet, allow_onboard_violations: e.target.checked })}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">Allow Onboard Violation(s)</span>
                          </label>

                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={singleSet.allow_capacity_violations}
                              onChange={(e) => setSingleSet({ ...singleSet, allow_capacity_violations: e.target.checked })}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">Allow Capacity Violation(s)</span>
                          </label>

                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={singleSet.ab_driver_preference}
                              onChange={(e) => setSingleSet({ ...singleSet, ab_driver_preference: e.target.checked })}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">A/B Driver Preference</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={saveViolationSets}
                disabled={saving}
                className="flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-all shadow hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-5 h-5" />
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'mapper' && (
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search"
                    value={mapperSearch}
                    onChange={(e) => setMapperSearch(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 w-64"
                  />
                </div>
                <span className="text-sm text-gray-600">Showing {getFilteredMappers().length} entries</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="bg-white rounded-lg border border-gray-200 flex overflow-hidden">
                  <button
                    onClick={() => setMapperView('vehicles')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      mapperView === 'vehicles'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Vehicles
                  </button>
                  <button
                    onClick={() => setMapperView('drivers')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      mapperView === 'drivers'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Drivers
                  </button>
                </div>

                <button
                  onClick={() => {
                    setSelectedMapper(null);
                    setShowMapperModal(true);
                  }}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Add Mapper
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created At
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {getFilteredMappers().map((mapper) => (
                    <tr key={mapper.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedMapper(mapper);
                              setShowMapperModal(true);
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this mapper?')) {
                                deleteMapper(mapper.id);
                              }
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{mapper.title}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(mapper.created_at).toLocaleDateString('en-US', {
                          month: '2-digit',
                          day: '2-digit',
                          year: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))}
                  {getFilteredMappers().length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-gray-500">
                        No mappers found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab !== 'playground' && activeTab !== 'schedule' && activeTab !== 'violationSets' && activeTab !== 'mapper' && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-500 text-lg">
              {activeTab === 'template' && 'Template management coming soon'}
              {activeTab === 'holidays' && 'Holidays configuration coming soon'}
            </p>
          </div>
        </div>
      )}

      {showMapperModal && (
        <MapperModal
          mapper={selectedMapper}
          onClose={() => {
            setShowMapperModal(false);
            setSelectedMapper(null);
          }}
          onSave={() => {
            loadMappers();
            setShowMapperModal(false);
            setSelectedMapper(null);
          }}
        />
      )}
    </div>
  );
}

type DriverWithAssignment = Profile & {
  photo_url?: string;
  vehicle_id?: string | null;
};

type VehicleOption = {
  id: string;
  display_name: string;
};

function MapperModal({
  mapper,
  onClose,
  onSave,
}: {
  mapper: Mapper | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const { user } = useAuth();
  const [drivers, setDrivers] = useState<DriverWithAssignment[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [mapper]);

  async function loadData() {
    setLoading(true);
    try {
      const { data: driversData, error: driversError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'driver')
        .order('full_name');

      if (driversError) throw driversError;

      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('id, vehicle_number, vehicle_name, make, model')
        .order('vehicle_number');

      if (vehiclesError) throw vehiclesError;

      setDrivers(driversData || []);
      setVehicles(
        (vehiclesData || []).map((v) => ({
          id: v.id,
          display_name: v.vehicle_name || `${v.vehicle_number} - ${v.make} ${v.model}`,
        }))
      );

      if (mapper?.configuration) {
        const config = mapper.configuration as Record<string, unknown>;
        if (config.assignments && typeof config.assignments === 'object') {
          setAssignments(config.assignments as Record<string, string>);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleAssignmentChange(driverId: string, vehicleId: string) {
    setAssignments((prev) => ({
      ...prev,
      [driverId]: vehicleId,
    }));
  }

  async function handleSave() {
    if (!user) return;

    setSaving(true);
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

      const configuration = {
        assignments,
        updated_at: new Date().toISOString(),
      };

      if (mapper) {
        const { error } = await supabase
          .from('mappers')
          .update({
            configuration,
            updated_at: new Date().toISOString(),
          })
          .eq('id', mapper.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('mappers').insert({
          title: `Driver-Vehicle Map ${new Date().toLocaleDateString()}`,
          mapper_type: 'driver_vehicle',
          configuration,
          company_id: profile.company_id,
          created_by: user.id,
        });

        if (error) throw error;
      }

      onSave();
    } catch (error) {
      console.error('Error saving mapper:', error);
    } finally {
      setSaving(false);
    }
  }

  const assignedDrivers = drivers.filter((d) => assignments[d.id]);
  const unassignedDrivers = drivers.filter((d) => !assignments[d.id]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {mapper ? mapper.title : 'Add Mapper'}
          </h2>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Assigned</h3>
              </div>
              <div className="p-6">
                {assignedDrivers.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No assigned drivers</p>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm font-medium text-gray-700 px-2">
                      <div>Driver</div>
                      <div>Fleet</div>
                    </div>
                    {assignedDrivers.map((driver) => (
                      <div key={driver.id} className="grid grid-cols-2 gap-4 items-center">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-medium flex-shrink-0">
                            {driver.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">{driver.full_name}</p>
                            <p className="text-sm text-gray-500 truncate">{driver.email}</p>
                          </div>
                        </div>
                        <select
                          value={assignments[driver.id] || ''}
                          onChange={(e) => handleAssignmentChange(driver.id, e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="">-- Select Fleet --</option>
                          {vehicles.map((vehicle) => (
                            <option key={vehicle.id} value={vehicle.id}>
                              {vehicle.display_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-100 px-6 py-3 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Unassigned</h3>
              </div>
              <div className="p-6">
                {unassignedDrivers.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">All drivers assigned</p>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm font-medium text-gray-700 px-2">
                      <div>Driver</div>
                      <div>Fleet</div>
                    </div>
                    {unassignedDrivers.map((driver) => (
                      <div key={driver.id} className="grid grid-cols-2 gap-4 items-center">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-medium flex-shrink-0">
                            {driver.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">{driver.full_name}</p>
                            <p className="text-sm text-gray-500 truncate">{driver.email}</p>
                          </div>
                        </div>
                        <select
                          value={assignments[driver.id] || ''}
                          onChange={(e) => handleAssignmentChange(driver.id, e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="">-- Select Fleet --</option>
                          {vehicles.map((vehicle) => (
                            <option key={vehicle.id} value={vehicle.id}>
                              {vehicle.display_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
