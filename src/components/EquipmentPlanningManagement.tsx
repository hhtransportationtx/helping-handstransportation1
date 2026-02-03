import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Edit } from 'lucide-react';

interface VehicleEquipmentPlanning {
  id: string;
  vehicle_id: string;
  space_type_id: string;
  equipment_ids: string[];
  vehicles?: {
    vehicle_number: string;
    vehicle_name: string;
    make: string;
    model: string;
  };
  space_types?: {
    name: string;
  };
}

interface Vehicle {
  id: string;
  vehicle_number: string;
  vehicle_name: string;
  make: string;
  model: string;
}

interface SpaceType {
  id: string;
  name: string;
}

interface Equipment {
  id: string;
  name: string;
}

export function EquipmentPlanningManagement() {
  const [vehiclePlanning, setVehiclePlanning] = useState<VehicleEquipmentPlanning[]>([]);
  const [filteredPlanning, setFilteredPlanning] = useState<VehicleEquipmentPlanning[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [spaceTypes, setSpaceTypes] = useState<SpaceType[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingPlanning, setEditingPlanning] = useState<VehicleEquipmentPlanning | null>(null);
  const [formData, setFormData] = useState({
    vehicle_id: '',
    space_type_id: '',
    equipment_ids: [] as string[],
  });

  useEffect(() => {
    loadData();

    const subscription = supabase
      .channel('equipment_planning_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vehicle_equipment_planning' },
        () => {
          loadVehiclePlanning();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    filterPlanning();
  }, [vehiclePlanning, searchQuery]);

  async function loadData() {
    await Promise.all([
      loadVehicles(),
      loadSpaceTypes(),
      loadEquipments(),
      loadVehiclePlanning(),
    ]);
    setLoading(false);
  }

  async function loadVehicles() {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, vehicle_number, vehicle_name, make, model')
        .eq('status', 'active')
        .order('vehicle_name');

      if (error) throw error;
      setVehicles(data || []);
    } catch (error) {
      console.error('Error loading vehicles:', error);
    }
  }

  async function loadSpaceTypes() {
    try {
      const { data, error } = await supabase
        .from('space_types')
        .select('id, name')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setSpaceTypes(data || []);
    } catch (error) {
      console.error('Error loading space types:', error);
    }
  }

  async function loadEquipments() {
    try {
      const { data, error } = await supabase
        .from('equipments')
        .select('id, name')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setEquipments(data || []);
    } catch (error) {
      console.error('Error loading equipments:', error);
    }
  }

  async function loadVehiclePlanning() {
    try {
      const { data, error } = await supabase
        .from('vehicle_equipment_planning')
        .select(
          `
          *,
          vehicles (vehicle_number, vehicle_name, make, model),
          space_types (name)
        `
        )
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVehiclePlanning(data || []);
    } catch (error) {
      console.error('Error loading vehicle equipment planning:', error);
    }
  }

  function filterPlanning() {
    let filtered = [...vehiclePlanning];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (vp) =>
          vp.vehicles?.vehicle_name?.toLowerCase().includes(query) ||
          vp.vehicles?.vehicle_number?.toLowerCase().includes(query) ||
          vp.space_types?.name?.toLowerCase().includes(query)
      );
    }

    setFilteredPlanning(filtered);
  }

  function openModal(planning?: VehicleEquipmentPlanning) {
    if (planning) {
      setEditingPlanning(planning);
      setFormData({
        vehicle_id: planning.vehicle_id,
        space_type_id: planning.space_type_id || '',
        equipment_ids: planning.equipment_ids || [],
      });
    } else {
      setEditingPlanning(null);
      setFormData({
        vehicle_id: '',
        space_type_id: '',
        equipment_ids: [],
      });
    }
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      if (editingPlanning) {
        const { error } = await supabase
          .from('vehicle_equipment_planning')
          .update({ ...formData, updated_at: new Date().toISOString() })
          .eq('id', editingPlanning.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('vehicle_equipment_planning').insert([formData]);

        if (error) throw error;
      }

      setShowModal(false);
      loadVehiclePlanning();
    } catch (error) {
      console.error('Error saving equipment planning:', error);
      alert('Failed to save equipment planning');
    }
  }

  function getEquipmentNames(equipmentIds: string[]) {
    if (!equipmentIds || equipmentIds.length === 0) return '';
    return equipments
      .filter((eq) => equipmentIds.includes(eq.id))
      .map((eq) => eq.name)
      .join(', ');
  }

  function toggleEquipment(equipmentId: string) {
    setFormData((prev) => ({
      ...prev,
      equipment_ids: prev.equipment_ids.includes(equipmentId)
        ? prev.equipment_ids.filter((id) => id !== equipmentId)
        : [...prev.equipment_ids, equipmentId],
    }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading equipment planning...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="text-sm text-gray-600">Showing {filteredPlanning.length} entries</div>

          <div className="flex items-center gap-4">
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rig#</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Space Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rig Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  HHT-Driver App
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  NEMT MAX APP
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredPlanning.map((planning) => (
                <tr key={planning.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {planning.vehicles?.vehicle_number || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {planning.space_types?.name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {planning.vehicles
                      ? `${planning.vehicles.make} ${planning.vehicles.model}`
                      : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {planning.equipment_ids?.some((id) =>
                      equipments.find((eq) => eq.id === id && eq.name === 'HHT-Driver App')
                    ) ? (
                      <button
                        onClick={() => openModal(planning)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    ) : (
                      ''
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {planning.equipment_ids?.some((id) =>
                      equipments.find((eq) => eq.id === id && eq.name === 'NEMT MAX APP')
                    ) ? (
                      <button
                        onClick={() => openModal(planning)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    ) : (
                      ''
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingPlanning ? 'Edit Equipment Planning' : 'Add Equipment Planning'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle</label>
                  <select
                    required
                    disabled={!!editingPlanning}
                    value={formData.vehicle_id}
                    onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  >
                    <option value="">Select Vehicle</option>
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.vehicle_number} - {vehicle.vehicle_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Space Type</label>
                  <select
                    value={formData.space_type_id}
                    onChange={(e) => setFormData({ ...formData, space_type_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Space Type</option>
                    {spaceTypes.map((spaceType) => (
                      <option key={spaceType.id} value={spaceType.id}>
                        {spaceType.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Equipments</label>
                  <div className="space-y-2">
                    {equipments.map((equipment) => (
                      <label key={equipment.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.equipment_ids.includes(equipment.id)}
                          onChange={() => toggleEquipment(equipment.id)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-900">{equipment.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingPlanning ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
