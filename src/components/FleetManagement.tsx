import { useState, useEffect } from 'react';
import { supabase, Vehicle, Profile } from '../lib/supabase';
import { Search, Edit, MapPin, Plus, QrCode } from 'lucide-react';
import { VehicleModal } from './VehicleModal';
import { SpaceTypesManagement } from './SpaceTypesManagement';
import { EquipmentsManagement } from './EquipmentsManagement';
import { ServiceAreasManagement } from './ServiceAreasManagement';
import { EquipmentPlanningManagement } from './EquipmentPlanningManagement';
import { FundingSourcesManagement } from './FundingSourcesManagement';
import { VehicleQRCodes } from './VehicleQRCodes';

type TabType = 'vehicles' | 'spaceTypes' | 'equipments' | 'serviceAreas' | 'equipmentPlanning' | 'fundingSources';

interface VehicleWithDriver extends Vehicle {
  profiles?: Profile;
}

export function FleetManagement() {
  const [activeTab, setActiveTab] = useState<TabType>('vehicles');
  const [vehicles, setVehicles] = useState<VehicleWithDriver[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<VehicleWithDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleWithDriver | null>(null);
  const [showQRCodes, setShowQRCodes] = useState(false);

  useEffect(() => {
    loadVehicles();

    const subscription = supabase
      .channel('fleet_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vehicles' },
        () => {
          loadVehicles();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    filterVehicles();
  }, [vehicles, searchQuery, statusFilter]);

  async function loadVehicles() {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVehicles(data || []);
    } catch (error) {
      console.error('Error loading vehicles:', error);
    } finally {
      setLoading(false);
    }
  }

  function filterVehicles() {
    let filtered = [...vehicles];

    if (statusFilter !== 'all') {
      filtered = filtered.filter((v) => v.status === statusFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (v) =>
          v.vehicle_name?.toLowerCase().includes(query) ||
          v.vehicle_number?.toLowerCase().includes(query) ||
          v.license_plate?.toLowerCase().includes(query)
      );
    }

    setFilteredVehicles(filtered);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading fleet...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="flex gap-1 px-6">
          <button
            onClick={() => setActiveTab('vehicles')}
            className={`px-6 py-4 font-medium border-b-2 transition-colors ${
              activeTab === 'vehicles'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Vehicles
          </button>
          <button
            onClick={() => setActiveTab('spaceTypes')}
            className={`px-6 py-4 font-medium border-b-2 transition-colors ${
              activeTab === 'spaceTypes'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Space Types
          </button>
          <button
            onClick={() => setActiveTab('equipments')}
            className={`px-6 py-4 font-medium border-b-2 transition-colors ${
              activeTab === 'equipments'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Equipments
          </button>
          <button
            onClick={() => setActiveTab('serviceAreas')}
            className={`px-6 py-4 font-medium border-b-2 transition-colors ${
              activeTab === 'serviceAreas'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Service Areas
          </button>
          <button
            onClick={() => setActiveTab('equipmentPlanning')}
            className={`px-6 py-4 font-medium border-b-2 transition-colors ${
              activeTab === 'equipmentPlanning'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Equipment Planning
          </button>
          <button
            onClick={() => setActiveTab('fundingSources')}
            className={`px-6 py-4 font-medium border-b-2 transition-colors ${
              activeTab === 'fundingSources'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Funding Sources
          </button>
        </div>
      </div>

      {activeTab === 'vehicles' && (
        <div className="flex-1 overflow-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setSelectedVehicle(null);
                    setShowVehicleModal(true);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add Vehicle
                </button>
                <button
                  onClick={() => setShowQRCodes(true)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center gap-2"
                >
                  <QrCode className="w-5 h-5" />
                  Print QR Codes
                </button>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">Showing {filteredVehicles.length} entries</span>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="all">All</option>
                </select>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 w-64"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name (8)</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rig No.</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Model</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Capacity</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vin</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tracking No.</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created At</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredVehicles.map((vehicle) => (
                    <tr key={vehicle.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedVehicle(vehicle);
                              setShowVehicleModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button className="text-blue-600 hover:text-blue-800">
                            <MapPin className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              vehicle.vehicle_type === 'wheelchair' ? 'bg-blue-500' : 'bg-green-500'
                            }`}
                          >
                            {vehicle.vehicle_type === 'wheelchair' ? (
                              <span className="text-white text-xl">♿</span>
                            ) : (
                              <span className="text-white text-xl">🚶</span>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {vehicle.vehicle_type === 'wheelchair' ? 'WAV (WAV)' : 'AMB (AMB)'}
                            </p>
                            <p className="text-xs text-gray-500">{vehicle.vehicle_name || 'Unnamed'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {vehicle.vehicle_number || 'N/A'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {vehicle.profiles && (
                            <>
                              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                                <span className="text-xs font-medium text-gray-600">
                                  {vehicle.profiles.full_name.charAt(0)}
                                </span>
                              </div>
                              <span className="text-sm text-gray-900">{vehicle.profiles.full_name}</span>
                            </>
                          )}
                          {!vehicle.profiles && <span className="text-sm text-gray-500">N/A</span>}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {vehicle.make} {vehicle.model}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {vehicle.capacity || 'N/A'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {vehicle.vin || 'N/A'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {vehicle.tracking_device_id || 'N/A'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">Panel</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(vehicle.created_at).toLocaleDateString('en-US', {
                          month: '2-digit',
                          day: '2-digit',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded font-medium">
                          {vehicle.status.charAt(0).toUpperCase() + vehicle.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'spaceTypes' && <SpaceTypesManagement />}
      {activeTab === 'equipments' && <EquipmentsManagement />}
      {activeTab === 'serviceAreas' && <ServiceAreasManagement />}
      {activeTab === 'equipmentPlanning' && <EquipmentPlanningManagement />}
      {activeTab === 'fundingSources' && <FundingSourcesManagement />}

      {showVehicleModal && (
        <VehicleModal
          vehicle={selectedVehicle}
          onClose={() => {
            setShowVehicleModal(false);
            setSelectedVehicle(null);
          }}
          onSave={() => {
            loadVehicles();
            setShowVehicleModal(false);
            setSelectedVehicle(null);
          }}
        />
      )}

      {showQRCodes && (
        <VehicleQRCodes
          onClose={() => setShowQRCodes(false)}
        />
      )}
    </div>
  );
}
