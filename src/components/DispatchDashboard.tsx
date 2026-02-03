import { useState, useEffect, useRef } from 'react';
import { supabase, Trip } from '../lib/supabase';
import {
  LayoutDashboard,
  MapPin,
  Calendar,
  User,
  Phone,
  Mail,
  MessageSquare,
  Clock,
  ChevronDown,
  Plus,
  Maximize2,
  Layers,
  Bell,
  Users,
  Car,
  FileText,
  UserCheck,
  BarChart3,
  Settings,
  DollarSign,
  BookOpen,
  Shield,
  Video
} from 'lucide-react';
import { TripModal } from './TripModal';
import { MaintenanceManagement } from './MaintenanceManagement';
import { DriverModal } from './DriverModal';
import { VehicleModal } from './VehicleModal';
import { PatientModal } from './PatientModal';
import { AdminModal } from './AdminModal';
import GroupWalkieTalkie from './GroupWalkieTalkie';
import WalkieTalkieGroupManager from './WalkieTalkieGroupManager';
import VideoCallManager from './VideoCallManager';
import { TripConfirmations } from './TripConfirmations';
import { TripsManagement } from './TripsManagement';
import { OperationsManagement } from './OperationsManagement';
import { NotificationsPanel } from './NotificationsPanel';
import { FarmoutManagement } from './FarmoutManagement';
import { ManifestManagement } from './ManifestManagement';
import { FleetManagement } from './FleetManagement';
import { PlannerManagement } from './PlannerManagement';
import { Profiling } from './Profiling';
import { ReportsManagement } from './ReportsManagement';
import { RatesManagement } from './RatesManagement';
import { Manual } from './Manual';
import { BirthdayReminders } from './BirthdayReminders';

interface Driver {
  id: string;
  full_name: string;
  status: string;
  current_latitude: number | null;
  current_longitude: number | null;
  phone_number?: string;
  email?: string;
}

interface TripWithDetails extends Trip {
  patient?: {
    full_name: string;
    phone: string;
  };
  driver?: Driver;
}

interface Activity {
  id: string;
  type: 'trip_assigned' | 'trip_forwarded' | 'trip_accepted';
  message: string;
  status: string;
  timestamp: string;
  user_name: string;
}

type View = 'dashboard' | 'operations' | 'trips' | 'confirmations' | 'farmout' | 'manifest' | 'profiling' | 'fleet' | 'maintenance' | 'planner' | 'reports' | 'rates' | 'manual' | 'settings' | 'walkie-talkie' | 'video-calls';

export function DispatchDashboard() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trips, setTrips] = useState<TripWithDetails[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showTripModal, setShowTripModal] = useState(false);
  const [selectedServiceArea, setSelectedServiceArea] = useState('all');
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);

  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const addMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadDrivers();
    loadTrips();
    loadActivities();

    const interval = setInterval(() => {
      loadDrivers();
      loadActivities();
    }, 30000);

    const handleClickOutside = (event: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(event.target as Node)) {
        setShowAddMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      clearInterval(interval);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selectedDate]);

  useEffect(() => {
    if (window.google && mapRef.current && !googleMapRef.current) {
      initMap();
    }
  }, [drivers]);

  useEffect(() => {
    if (googleMapRef.current) {
      googleMapRef.current.setMapTypeId(mapType);
    }
  }, [mapType]);

  const loadDrivers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'driver');

    if (data) {
      setDrivers(data);
      updateMapMarkers(data);
    }
  };

  const loadTrips = async () => {
    const { data } = await supabase
      .from('trips')
      .select(`
        *,
        patient:patients(full_name, phone),
        driver:profiles(id, full_name)
      `)
      .gte('scheduled_pickup_time', `${selectedDate}T00:00:00`)
      .lt('scheduled_pickup_time', `${selectedDate}T23:59:59`)
      .order('scheduled_pickup_time', { ascending: false })
      .limit(10);

    if (data) {
      setTrips(data);
    }
  };

  const loadActivities = async () => {
    const { data, error } = await supabase
      .from('trips')
      .select(`
        *,
        patient:patients(full_name, phone),
        driver:profiles(id, full_name, email)
      `)
      .eq('status', 'accepted')
      .not('driver_id', 'is', null)
      .gte('scheduled_pickup_time', `${selectedDate}T00:00:00`)
      .lt('scheduled_pickup_time', `${selectedDate}T23:59:59`)
      .order('scheduled_pickup_time', { ascending: false })
      .limit(10);

    if (data) {
      const mappedActivities: Activity[] = data.map((trip: any) => ({
        id: trip.id,
        type: 'trip_accepted',
        message: `Trip assigned to ${trip.driver?.full_name || 'Unknown Driver'}`,
        status: 'Accepted',
        timestamp: trip.scheduled_pickup_time,
        user_name: trip.driver?.full_name || 'Unknown Driver'
      }));
      setActivities(mappedActivities);
    }
  };

  const initMap = () => {
    if (!mapRef.current || !window.google) return;

    const center = drivers.length > 0 && drivers[0].current_latitude && drivers[0].current_longitude
      ? { lat: drivers[0].current_latitude, lng: drivers[0].current_longitude }
      : { lat: 39.8283, lng: -98.5795 };

    googleMapRef.current = new google.maps.Map(mapRef.current, {
      zoom: 5,
      center,
      mapTypeId: mapType,
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });
  };

  const updateMapMarkers = (driverData: Driver[]) => {
    if (!googleMapRef.current || !window.google) return;

    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    const driversInProgress = trips
      .filter(t => t.status === 'in_progress' && t.driver_id)
      .map(t => t.driver_id);

    driverData.forEach(driver => {
      if (driver.current_latitude && driver.current_longitude) {
        const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(driver.full_name)}&background=random&size=80`;

        const hasActiveTrip = driversInProgress.includes(driver.id);
        let statusColor = '#6b7280';
        let statusLabel = 'Offline';

        if (driver.status === 'active') {
          if (hasActiveTrip) {
            statusColor = '#9333ea';
            statusLabel = 'In Progress';
          } else {
            statusColor = '#10b981';
            statusLabel = 'Available';
          }
        }

        const markerIcon = {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg width="60" height="60" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <clipPath id="circle-clip-${driver.id}">
                  <circle cx="30" cy="30" r="26"/>
                </clipPath>
              </defs>
              <circle cx="30" cy="30" r="28" fill="white"/>
              <circle cx="30" cy="30" r="26" fill="#e5e7eb"/>
              <image href="${avatarUrl}" x="4" y="4" width="52" height="52" clip-path="url(#circle-clip-${driver.id})"/>
              <circle cx="30" cy="30" r="28" fill="none" stroke="white" stroke-width="4"/>
              <circle cx="48" cy="48" r="8" fill="${statusColor}" stroke="white" stroke-width="2"/>
            </svg>
          `)}`,
          scaledSize: new google.maps.Size(60, 60),
          anchor: new google.maps.Point(30, 30)
        };

        const marker = new google.maps.Marker({
          position: { lat: driver.current_latitude, lng: driver.current_longitude },
          map: googleMapRef.current,
          title: driver.full_name,
          icon: markerIcon
        });

        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div class="p-3">
              <div class="flex items-center gap-3 mb-2">
                <img
                  src="${avatarUrl}"
                  alt="${driver.full_name}"
                  class="w-12 h-12 rounded-full"
                />
                <div>
                  <strong class="text-lg">${driver.full_name}</strong><br/>
                  <span class="text-sm" style="color: ${statusColor}">
                    ${statusLabel}
                  </span>
                </div>
              </div>
              ${driver.phone_number ? `<div class="text-sm text-gray-600">📞 ${driver.phone_number}</div>` : ''}
            </div>
          `
        });

        marker.addListener('click', () => {
          infoWindow.open(googleMapRef.current, marker);
        });

        markersRef.current.push(marker);
      }
    });
  };

  const driversWithTripsInProgress = trips
    .filter(t => t.status === 'in_progress' && t.driver_id)
    .map(t => t.driver_id);

  const driversWithLocation = drivers.filter(d =>
    d.current_latitude !== null && d.current_longitude !== null
  );

  const driverStats = {
    available: drivers.filter(d =>
      d.status === 'active' && !driversWithTripsInProgress.includes(d.id)
    ).length,
    busy: 0,
    offline: drivers.filter(d => d.status !== 'active').length,
    inProgress: driversWithTripsInProgress.length,
    withLocation: driversWithLocation.length
  };

  return (
    <div className="h-screen flex bg-gray-50 overflow-hidden">
      <aside className="w-48 md:w-64 bg-gradient-to-b from-slate-800 to-slate-900 text-white flex flex-col">
        <div className="p-3 md:p-6 border-b border-slate-700">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-12 md:h-12 bg-gradient-to-r from-pink-500 to-red-500 rounded-lg flex items-center justify-center">
              <Car className="w-4 h-4 md:w-7 md:h-7" />
            </div>
            <div>
              <h1 className="font-bold text-sm md:text-lg">Helping Hands</h1>
              <p className="text-xs text-slate-400">Transport</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-3 md:py-6">
          <button
            onClick={() => setCurrentView('dashboard')}
            className={`w-full px-3 py-2 md:px-6 md:py-3 flex items-center gap-2 md:gap-3 text-sm md:text-base transition-colors ${
              currentView === 'dashboard'
                ? 'bg-slate-700/50 border-l-4 border-pink-500 text-white'
                : 'hover:bg-slate-700/30 text-slate-300 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 md:w-5 md:h-5" />
            <span className="font-medium">Dashboard</span>
          </button>
          <button
            onClick={() => setCurrentView('operations')}
            className={`w-full px-3 py-2 md:px-6 md:py-3 flex items-center gap-2 md:gap-3 text-sm md:text-base transition-colors ${
              currentView === 'operations'
                ? 'bg-slate-700/50 border-l-4 border-pink-500 text-white'
                : 'hover:bg-slate-700/30 text-slate-300 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4 md:w-5 md:h-5" />
            <span className="font-medium">Operations</span>
          </button>
          <button
            onClick={() => setCurrentView('trips')}
            className={`w-full px-3 py-2 md:px-6 md:py-3 flex items-center gap-2 md:gap-3 text-sm md:text-base transition-colors ${
              currentView === 'trips'
                ? 'bg-slate-700/50 border-l-4 border-pink-500 text-white'
                : 'hover:bg-slate-700/30 text-slate-300 hover:text-white'
            }`}
          >
            <MapPin className="w-4 h-4 md:w-5 md:h-5" />
            <span className="font-medium">Trips</span>
          </button>
          <button
            onClick={() => setCurrentView('confirmations')}
            className={`w-full px-3 py-2 md:px-6 md:py-3 flex items-center gap-2 md:gap-3 text-sm md:text-base transition-colors ${
              currentView === 'confirmations'
                ? 'bg-slate-700/50 border-l-4 border-pink-500 text-white'
                : 'hover:bg-slate-700/30 text-slate-300 hover:text-white'
            }`}
          >
            <Bell className="w-4 h-4 md:w-5 md:h-5" />
            <span className="font-medium">Confirmations</span>
          </button>
          <button
            onClick={() => setCurrentView('farmout')}
            className={`w-full px-3 py-2 md:px-6 md:py-3 flex items-center gap-2 md:gap-3 text-sm md:text-base transition-colors ${
              currentView === 'farmout'
                ? 'bg-slate-700/50 border-l-4 border-pink-500 text-white'
                : 'hover:bg-slate-700/30 text-slate-300 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4 md:w-5 md:h-5" />
            <span className="font-medium">Farmout</span>
          </button>
          <button
            onClick={() => setCurrentView('manifest')}
            className={`w-full px-3 py-2 md:px-6 md:py-3 flex items-center gap-2 md:gap-3 text-sm md:text-base transition-colors ${
              currentView === 'manifest'
                ? 'bg-slate-700/50 border-l-4 border-pink-500 text-white'
                : 'hover:bg-slate-700/30 text-slate-300 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4 md:w-5 md:h-5" />
            <span className="font-medium">Manifest</span>
          </button>
          <button
            onClick={() => setCurrentView('profiling')}
            className={`w-full px-3 py-2 md:px-6 md:py-3 flex items-center gap-2 md:gap-3 text-sm md:text-base transition-colors ${
              currentView === 'profiling'
                ? 'bg-slate-700/50 border-l-4 border-pink-500 text-white'
                : 'hover:bg-slate-700/30 text-slate-300 hover:text-white'
            }`}
          >
            <UserCheck className="w-4 h-4 md:w-5 md:h-5" />
            <span className="font-medium">Profiling</span>
          </button>
          <button
            onClick={() => setCurrentView('fleet')}
            className={`w-full px-3 py-2 md:px-6 md:py-3 flex items-center gap-2 md:gap-3 text-sm md:text-base transition-colors ${
              currentView === 'fleet'
                ? 'bg-slate-700/50 border-l-4 border-pink-500 text-white'
                : 'hover:bg-slate-700/30 text-slate-300 hover:text-white'
            }`}
          >
            <Car className="w-4 h-4 md:w-5 md:h-5" />
            <span className="font-medium">Fleet</span>
          </button>
          <button
            onClick={() => setCurrentView('maintenance')}
            className={`w-full px-3 py-2 md:px-6 md:py-3 flex items-center gap-2 md:gap-3 text-sm md:text-base transition-colors ${
              currentView === 'maintenance'
                ? 'bg-slate-700/50 border-l-4 border-pink-500 text-white'
                : 'hover:bg-slate-700/30 text-slate-300 hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4 md:w-5 md:h-5" />
            <span className="font-medium">Maintenance</span>
          </button>
          <button
            onClick={() => setCurrentView('planner')}
            className={`w-full px-3 py-2 md:px-6 md:py-3 flex items-center gap-2 md:gap-3 text-sm md:text-base transition-colors ${
              currentView === 'planner'
                ? 'bg-slate-700/50 border-l-4 border-pink-500 text-white'
                : 'hover:bg-slate-700/30 text-slate-300 hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4 md:w-5 md:h-5" />
            <span className="font-medium">Planner</span>
          </button>
          <button
            onClick={() => setCurrentView('reports')}
            className={`w-full px-3 py-2 md:px-6 md:py-3 flex items-center gap-2 md:gap-3 text-sm md:text-base transition-colors ${
              currentView === 'reports'
                ? 'bg-slate-700/50 border-l-4 border-pink-500 text-white'
                : 'hover:bg-slate-700/30 text-slate-300 hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4 md:w-5 md:h-5" />
            <span className="font-medium">Reports</span>
          </button>
          <button
            onClick={() => setCurrentView('rates')}
            className={`w-full px-3 py-2 md:px-6 md:py-3 flex items-center gap-2 md:gap-3 text-sm md:text-base transition-colors ${
              currentView === 'rates'
                ? 'bg-slate-700/50 border-l-4 border-pink-500 text-white'
                : 'hover:bg-slate-700/30 text-slate-300 hover:text-white'
            }`}
          >
            <DollarSign className="w-4 h-4 md:w-5 md:h-5" />
            <span className="font-medium">Rates</span>
          </button>
          <button
            onClick={() => setCurrentView('manual')}
            className={`w-full px-3 py-2 md:px-6 md:py-3 flex items-center gap-2 md:gap-3 text-sm md:text-base transition-colors ${
              currentView === 'manual'
                ? 'bg-slate-700/50 border-l-4 border-pink-500 text-white'
                : 'hover:bg-slate-700/30 text-slate-300 hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4 md:w-5 md:h-5" />
            <span className="font-medium">Manual</span>
          </button>
          <button
            onClick={() => setCurrentView('video-calls')}
            className={`w-full px-3 py-2 md:px-6 md:py-3 flex items-center gap-2 md:gap-3 text-sm md:text-base transition-colors ${
              currentView === 'video-calls'
                ? 'bg-slate-700/50 border-l-4 border-pink-500 text-white'
                : 'hover:bg-slate-700/30 text-slate-300 hover:text-white'
            }`}
          >
            <Video className="w-4 h-4 md:w-5 md:h-5" />
            <span className="font-medium">Video Calls</span>
          </button>
        </nav>

        <div className="p-2 md:p-4 border-t border-slate-700">
          <button
            onClick={() => setCurrentView('settings')}
            className={`w-full px-3 py-2 md:px-4 md:py-2 flex items-center gap-2 md:gap-3 text-sm md:text-base transition-colors rounded-lg ${
              currentView === 'settings'
                ? 'bg-slate-700/50 text-white'
                : 'hover:bg-slate-700/30 text-slate-300 hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4 md:w-5 md:h-5" />
            <span className="font-medium">Settings</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span>{new Date().toLocaleString('en-US', {
                month: '2-digit',
                day: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              })}</span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setCurrentView('notifications')}
                className="p-2 hover:bg-gray-100 rounded-lg relative"
              >
                <Bell className="w-5 h-5 text-gray-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <div className="relative" ref={addMenuRef}>
                <button
                  onClick={() => setShowAddMenu(!showAddMenu)}
                  className="w-10 h-10 bg-gradient-to-r from-pink-500 to-red-500 text-white rounded-full hover:from-pink-600 hover:to-red-600 transition-all shadow-lg flex items-center justify-center"
                >
                  <Plus className="w-6 h-6" />
                </button>
                {showAddMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                    <button
                      onClick={() => {
                        setShowTripModal(true);
                        setShowAddMenu(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-gray-700 hover:bg-pink-50 flex items-center gap-3 transition-colors"
                    >
                      <Plus className="w-4 h-4 text-pink-600" />
                      <span className="font-medium">New Trip</span>
                    </button>
                    <button
                      onClick={() => {
                        alert('Import file functionality - Upload CSV/Excel files for bulk trip import');
                        setShowAddMenu(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-gray-700 hover:bg-pink-50 flex items-center gap-3 transition-colors"
                    >
                      <FileText className="w-4 h-4 text-pink-600" />
                      <span className="font-medium">Import File</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowDriverModal(true);
                        setShowAddMenu(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-gray-700 hover:bg-pink-50 flex items-center gap-3 transition-colors"
                    >
                      <User className="w-4 h-4 text-pink-600" />
                      <span className="font-medium">Add Driver</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowAdminModal(true);
                        setShowAddMenu(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-gray-700 hover:bg-pink-50 flex items-center gap-3 transition-colors"
                    >
                      <Shield className="w-4 h-4 text-pink-600" />
                      <span className="font-medium">Add Admin</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowVehicleModal(true);
                        setShowAddMenu(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-gray-700 hover:bg-pink-50 flex items-center gap-3 transition-colors"
                    >
                      <Car className="w-4 h-4 text-pink-600" />
                      <span className="font-medium">Add Vehicle</span>
                    </button>
                    <button
                      onClick={() => {
                        setCurrentView('profiling');
                        setShowAddMenu(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-gray-700 hover:bg-pink-50 flex items-center gap-3 transition-colors"
                    >
                      <Users className="w-4 h-4 text-pink-600" />
                      <span className="font-medium">Add Staff</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowPatientModal(true);
                        setShowAddMenu(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-gray-700 hover:bg-pink-50 flex items-center gap-3 transition-colors"
                    >
                      <UserCheck className="w-4 h-4 text-pink-600" />
                      <span className="font-medium">Add Member</span>
                    </button>
                    <button
                      onClick={() => {
                        alert('Add Funding Source - Navigate to Fleet > Funding Sources to add a new funding source');
                        setShowAddMenu(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-gray-700 hover:bg-pink-50 flex items-center gap-3 transition-colors"
                    >
                      <DollarSign className="w-4 h-4 text-pink-600" />
                      <span className="font-medium">Add Funding Source</span>
                    </button>
                    <button
                      onClick={() => {
                        setCurrentView('rates');
                        setShowAddMenu(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-gray-700 hover:bg-pink-50 flex items-center gap-3 transition-colors"
                    >
                      <FileText className="w-4 h-4 text-pink-600" />
                      <span className="font-medium">Add Rate</span>
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={() => alert('Open messaging center - View all conversations and send messages')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <MessageSquare className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex items-center gap-3 pl-3 border-l border-gray-200">
                <img
                  src="https://ui-avatars.com/api/?name=Helping+Hands&background=1e40af&color=fff"
                  alt="Profile"
                  className="w-10 h-10 rounded-full"
                />
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">Helping Hands Transport...</p>
                  <p className="text-xs text-pink-600">Full Access</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="bg-white border-b border-gray-200 px-6 py-3">
          <div className="flex items-center gap-6 overflow-x-auto">
            {activities.slice(0, 4).map((activity, idx) => (
              <div key={idx} className="flex items-center gap-3 min-w-max">
                <img
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(activity.user_name)}&background=random`}
                  alt={activity.user_name}
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">{activity.user_name}</p>
                  <p className="text-xs text-gray-600">{activity.message}</p>
                  <p className="text-xs text-gray-500">{new Date(activity.timestamp).toLocaleString()}</p>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                  {activity.status}
                </span>
              </div>
            ))}
            {activities.length === 0 && (
              <p className="text-sm text-gray-500">No recent activity</p>
            )}
            <button
              onClick={() => setCurrentView('reports')}
              className="ml-auto px-4 py-2 bg-gradient-to-r from-pink-500 to-red-500 text-white text-sm font-medium rounded-lg hover:from-pink-600 hover:to-red-600 transition-all flex items-center gap-2 shadow-md"
            >
              See All
              <BarChart3 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {currentView === 'maintenance' ? (
            <MaintenanceManagement />
          ) : currentView === 'confirmations' ? (
            <TripConfirmations />
          ) : currentView === 'trips' ? (
            <TripsManagement />
          ) : currentView === 'operations' ? (
            <OperationsManagement />
          ) : currentView === 'farmout' ? (
            <FarmoutManagement />
          ) : currentView === 'notifications' ? (
            <NotificationsPanel />
          ) : currentView === 'manifest' ? (
            <ManifestManagement />
          ) : currentView === 'profiling' ? (
            <Profiling />
          ) : currentView === 'fleet' ? (
            <FleetManagement />
          ) : currentView === 'planner' ? (
            <PlannerManagement />
          ) : currentView === 'reports' ? (
            <ReportsManagement />
          ) : currentView === 'rates' ? (
            <RatesManagement />
          ) : currentView === 'manual' ? (
            <Manual />
          ) : currentView === 'walkie-talkie' ? (
            <WalkieTalkieGroupManager />
          ) : currentView === 'video-calls' ? (
            <VideoCallManager />
          ) : currentView !== 'dashboard' ? (
            <div className="flex-1 flex items-center justify-center bg-white">
              <div className="text-center">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
                  {currentView === 'operations' && <FileText className="w-8 h-8 text-pink-600" />}
                  {currentView === 'trips' && <MapPin className="w-8 h-8 text-pink-600" />}
                  {currentView === 'farmout' && <Users className="w-8 h-8 text-pink-600" />}
                  {currentView === 'manifest' && <FileText className="w-8 h-8 text-pink-600" />}
                  {currentView === 'profiling' && <UserCheck className="w-8 h-8 text-pink-600" />}
                  {currentView === 'fleet' && <Car className="w-8 h-8 text-pink-600" />}
                  {currentView === 'planner' && <Calendar className="w-8 h-8 text-pink-600" />}
                  {currentView === 'reports' && <BarChart3 className="w-8 h-8 text-pink-600" />}
                  {currentView === 'rates' && <DollarSign className="w-8 h-8 text-pink-600" />}
                  {currentView === 'manual' && <BookOpen className="w-8 h-8 text-pink-600" />}
                  {currentView === 'settings' && <Settings className="w-8 h-8 text-pink-600" />}
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2 capitalize">{currentView}</h2>
                <p className="text-gray-600">This section is under development</p>
                <button
                  onClick={() => setCurrentView('dashboard')}
                  className="mt-6 px-6 py-2 bg-gradient-to-r from-pink-500 to-red-500 text-white rounded-lg hover:from-pink-600 hover:to-red-600 transition-all shadow-md"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-green-700">Available</span>
                    <User className="w-4 h-4 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold text-green-700">{driverStats.available}</p>
                </div>
                <div className="bg-pink-50 rounded-lg p-3 border border-pink-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-pink-700">With GPS</span>
                    <MapPin className="w-4 h-4 text-pink-600" />
                  </div>
                  <p className="text-2xl font-bold text-pink-700">{driverStats.withLocation}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-700">Offline</span>
                    <User className="w-4 h-4 text-gray-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-700">{driverStats.offline}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-purple-700">In Progress</span>
                    <User className="w-4 h-4 text-purple-600" />
                  </div>
                  <p className="text-2xl font-bold text-purple-700">{driverStats.inProgress}</p>
                </div>
              </div>

              <BirthdayReminders />

              <div className="relative">
                <select
                  value={selectedServiceArea}
                  onChange={(e) => setSelectedServiceArea(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg appearance-none bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">-- Select Service Area --</option>
                  <option value="north">North Region</option>
                  <option value="south">South Region</option>
                  <option value="east">East Region</option>
                  <option value="west">West Region</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>

              <div className="mt-3">
                <GroupWalkieTalkie onManageGroups={() => setCurrentView('walkie-talkie')} />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {drivers.map((driver) => {
                const hasActiveTrip = driversWithTripsInProgress.includes(driver.id);
                let statusColor = 'bg-gray-500';
                let statusLabel = 'Offline';

                if (driver.status === 'active') {
                  if (hasActiveTrip) {
                    statusColor = 'bg-purple-500';
                    statusLabel = 'In Progress';
                  } else {
                    statusColor = 'bg-green-500';
                    statusLabel = 'Available';
                  }
                }

                return (
                  <div
                    key={driver.id}
                    className="px-4 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img
                          src={`https://ui-avatars.com/api/?name=${encodeURIComponent(driver.full_name)}&background=random`}
                          alt={driver.full_name}
                          className="w-12 h-12 rounded-full"
                        />
                        <span className={`absolute bottom-0 right-0 w-3 h-3 ${statusColor} border-2 border-white rounded-full`}></span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{driver.full_name}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-gray-500">
                            {statusLabel}
                          </p>
                          {driver.current_latitude && driver.current_longitude ? (
                            <span className="text-xs text-pink-600 flex items-center gap-0.5" title="GPS location available">
                              <MapPin className="w-3 h-3" />
                              GPS
                            </span>
                          ) : driver.status === 'active' ? (
                            <span className="text-xs text-orange-600 flex items-center gap-0.5" title="No GPS location">
                              <MapPin className="w-3 h-3" />
                              No GPS
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                      {driver.email && (
                        <button className="p-1.5 hover:bg-gray-200 rounded transition-colors" title="Email">
                          <Mail className="w-4 h-4 text-gray-600" />
                        </button>
                      )}
                      {driver.phone_number && (
                        <button className="p-1.5 hover:bg-gray-200 rounded transition-colors" title="Call">
                          <Phone className="w-4 h-4 text-gray-600" />
                        </button>
                      )}
                      <button className="p-1.5 hover:bg-gray-200 rounded transition-colors" title="Message">
                        <MessageSquare className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  </div>
                </div>
                );
              })}

              {drivers.length === 0 && (
                <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                  <User className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-sm">No drivers available</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 relative">
            <div className="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-lg border border-gray-200">
              <button
                onClick={() => setMapType('roadmap')}
                className={`px-4 py-2 text-sm font-medium border-r border-gray-200 ${
                  mapType === 'roadmap'
                    ? 'bg-gradient-to-r from-pink-500 to-red-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                } rounded-l-lg transition-all`}
              >
                Map
              </button>
              <button
                onClick={() => setMapType('satellite')}
                className={`px-4 py-2 text-sm font-medium ${
                  mapType === 'satellite'
                    ? 'bg-gradient-to-r from-pink-500 to-red-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                } rounded-r-lg transition-all`}
              >
                Satellite
              </button>
            </div>

            <button
              onClick={() => setIsMapFullscreen(!isMapFullscreen)}
              className="absolute top-4 right-4 z-10 p-2 bg-white rounded-lg shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              title="Toggle Fullscreen"
            >
              <Maximize2 className="w-5 h-5 text-gray-700" />
            </button>

            <button
              onClick={() => alert('Toggle map layers - Switch between traffic, transit, and bike layers')}
              className="absolute top-16 right-4 z-10 p-2 bg-white rounded-lg shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              title="Layers"
            >
              <Layers className="w-5 h-5 text-gray-700" />
            </button>

            <div ref={mapRef} className="w-full h-full">
              {!window.google && (
                <div className="flex items-center justify-center h-full bg-gray-100">
                  <div className="text-center">
                    <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">Loading map...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
            </>
          )}
        </div>
      </div>

      {showTripModal && (
        <TripModal
          onClose={() => {
            setShowTripModal(false);
            loadTrips();
            loadActivities();
          }}
        />
      )}

      {showDriverModal && (
        <DriverModal
          onClose={() => {
            setShowDriverModal(false);
            loadDrivers();
          }}
        />
      )}

      {showVehicleModal && (
        <VehicleModal
          onClose={() => {
            setShowVehicleModal(false);
          }}
          onSuccess={() => {
            setShowVehicleModal(false);
          }}
        />
      )}

      {showPatientModal && (
        <PatientModal
          patient={null}
          onClose={() => {
            setShowPatientModal(false);
          }}
        />
      )}

      {showAdminModal && (
        <AdminModal
          onClose={() => {
            setShowAdminModal(false);
          }}
        />
      )}
    </div>
  );
}
