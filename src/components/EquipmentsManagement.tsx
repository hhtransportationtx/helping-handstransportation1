import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit, Search } from 'lucide-react';

interface Equipment {
  id: string;
  name: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export function EquipmentsManagement() {
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [filteredEquipments, setFilteredEquipments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [showModal, setShowModal] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active',
  });

  useEffect(() => {
    loadEquipments();

    const subscription = supabase
      .channel('equipments_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'equipments' },
        () => {
          loadEquipments();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    filterEquipments();
  }, [equipments, searchQuery, statusFilter]);

  async function loadEquipments() {
    try {
      const { data, error } = await supabase
        .from('equipments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEquipments(data || []);
    } catch (error) {
      console.error('Error loading equipments:', error);
    } finally {
      setLoading(false);
    }
  }

  function filterEquipments() {
    let filtered = [...equipments];

    if (statusFilter !== 'all') {
      filtered = filtered.filter((eq) => eq.status === statusFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (eq) =>
          eq.name.toLowerCase().includes(query) || eq.description?.toLowerCase().includes(query)
      );
    }

    setFilteredEquipments(filtered);
  }

  function openModal(equipment?: Equipment) {
    if (equipment) {
      setEditingEquipment(equipment);
      setFormData({
        name: equipment.name,
        description: equipment.description || '',
        status: equipment.status,
      });
    } else {
      setEditingEquipment(null);
      setFormData({
        name: '',
        description: '',
        status: 'active',
      });
    }
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      if (editingEquipment) {
        const { error } = await supabase
          .from('equipments')
          .update({ ...formData, updated_at: new Date().toISOString() })
          .eq('id', editingEquipment.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('equipments').insert([formData]);

        if (error) throw error;
      }

      setShowModal(false);
      loadEquipments();
    } catch (error) {
      console.error('Error saving equipment:', error);
      alert('Failed to save equipment');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading equipments...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => openModal()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Equipment
          </button>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Showing {filteredEquipments.length} entries</span>

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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Created At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredEquipments.map((equipment) => (
                <tr key={equipment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => openModal(equipment)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {equipment.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{equipment.description || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(equipment.created_at).toLocaleDateString('en-US', {
                      month: '2-digit',
                      day: '2-digit',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs rounded font-medium ${
                        equipment.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {equipment.status.charAt(0).toUpperCase() + equipment.status.slice(1)}
                    </span>
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
                {editingEquipment ? 'Edit Equipment' : 'Add Equipment'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
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
                  {editingEquipment ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
