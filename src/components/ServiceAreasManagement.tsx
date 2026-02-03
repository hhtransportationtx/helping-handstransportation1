import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit, Search } from 'lucide-react';

interface ServiceArea {
  id: string;
  name: string;
  zip_codes: string[];
  status: string;
  created_at: string;
  updated_at: string;
}

export function ServiceAreasManagement() {
  const [serviceAreas, setServiceAreas] = useState<ServiceArea[]>([]);
  const [filteredServiceAreas, setFilteredServiceAreas] = useState<ServiceArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [showModal, setShowModal] = useState(false);
  const [editingServiceArea, setEditingServiceArea] = useState<ServiceArea | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    zip_codes: '',
    status: 'active',
  });

  useEffect(() => {
    loadServiceAreas();

    const subscription = supabase
      .channel('service_areas_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'service_areas' },
        () => {
          loadServiceAreas();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    filterServiceAreas();
  }, [serviceAreas, searchQuery, statusFilter]);

  async function loadServiceAreas() {
    try {
      const { data, error } = await supabase
        .from('service_areas')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setServiceAreas(data || []);
    } catch (error) {
      console.error('Error loading service areas:', error);
    } finally {
      setLoading(false);
    }
  }

  function filterServiceAreas() {
    let filtered = [...serviceAreas];

    if (statusFilter !== 'all') {
      filtered = filtered.filter((sa) => sa.status === statusFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (sa) =>
          sa.name.toLowerCase().includes(query) ||
          sa.zip_codes.some((zip) => zip.includes(query))
      );
    }

    setFilteredServiceAreas(filtered);
  }

  function openModal(serviceArea?: ServiceArea) {
    if (serviceArea) {
      setEditingServiceArea(serviceArea);
      setFormData({
        name: serviceArea.name,
        zip_codes: serviceArea.zip_codes.join(','),
        status: serviceArea.status,
      });
    } else {
      setEditingServiceArea(null);
      setFormData({
        name: '',
        zip_codes: '',
        status: 'active',
      });
    }
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      const zipCodesArray = formData.zip_codes
        .split(',')
        .map((zip) => zip.trim())
        .filter((zip) => zip.length > 0);

      const dataToSave = {
        name: formData.name,
        zip_codes: zipCodesArray,
        status: formData.status,
      };

      if (editingServiceArea) {
        const { error } = await supabase
          .from('service_areas')
          .update({ ...dataToSave, updated_at: new Date().toISOString() })
          .eq('id', editingServiceArea.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('service_areas').insert([dataToSave]);

        if (error) throw error;
      }

      setShowModal(false);
      loadServiceAreas();
    } catch (error) {
      console.error('Error saving service area:', error);
      alert('Failed to save service area');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading service areas...</div>
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
            Add Service Area
          </button>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Showing {filteredServiceAreas.length} entries</span>

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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Zip Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredServiceAreas.map((serviceArea) => (
                <tr key={serviceArea.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => openModal(serviceArea)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {serviceArea.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="max-w-2xl">
                      {serviceArea.zip_codes.length > 0
                        ? serviceArea.zip_codes.slice(0, 20).join(', ') +
                          (serviceArea.zip_codes.length > 20
                            ? `... (+${serviceArea.zip_codes.length - 20} more)`
                            : '')
                        : 'No zip codes'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs rounded font-medium ${
                        serviceArea.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {serviceArea.status.charAt(0).toUpperCase() + serviceArea.status.slice(1)}
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
                {editingServiceArea ? 'Edit Service Area' : 'Add Service Area'}
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Zip Codes (comma-separated)
                  </label>
                  <textarea
                    value={formData.zip_codes}
                    onChange={(e) => setFormData({ ...formData, zip_codes: e.target.value })}
                    rows={4}
                    placeholder="79821,79836,79838,79849,79853,79901,79902..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Enter zip codes separated by commas
                  </p>
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
                  {editingServiceArea ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
