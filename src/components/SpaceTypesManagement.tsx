import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit, Search } from 'lucide-react';

interface SpaceType {
  id: string;
  name: string;
  description: string;
  level_of_service: string;
  load_time_minutes: number;
  unload_time_minutes: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export function SpaceTypesManagement() {
  const [spaceTypes, setSpaceTypes] = useState<SpaceType[]>([]);
  const [filteredSpaceTypes, setFilteredSpaceTypes] = useState<SpaceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [showModal, setShowModal] = useState(false);
  const [editingSpaceType, setEditingSpaceType] = useState<SpaceType | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    level_of_service: '',
    load_time_minutes: 15,
    unload_time_minutes: 15,
    status: 'active',
  });

  useEffect(() => {
    loadSpaceTypes();

    const subscription = supabase
      .channel('space_types_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'space_types' },
        () => {
          loadSpaceTypes();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    filterSpaceTypes();
  }, [spaceTypes, searchQuery, statusFilter]);

  async function loadSpaceTypes() {
    try {
      const { data, error } = await supabase
        .from('space_types')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSpaceTypes(data || []);
    } catch (error) {
      console.error('Error loading space types:', error);
    } finally {
      setLoading(false);
    }
  }

  function filterSpaceTypes() {
    let filtered = [...spaceTypes];

    if (statusFilter !== 'all') {
      filtered = filtered.filter((st) => st.status === statusFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (st) =>
          st.name.toLowerCase().includes(query) ||
          st.description?.toLowerCase().includes(query) ||
          st.level_of_service.toLowerCase().includes(query)
      );
    }

    setFilteredSpaceTypes(filtered);
  }

  function openModal(spaceType?: SpaceType) {
    if (spaceType) {
      setEditingSpaceType(spaceType);
      setFormData({
        name: spaceType.name,
        description: spaceType.description || '',
        level_of_service: spaceType.level_of_service,
        load_time_minutes: spaceType.load_time_minutes,
        unload_time_minutes: spaceType.unload_time_minutes,
        status: spaceType.status,
      });
    } else {
      setEditingSpaceType(null);
      setFormData({
        name: '',
        description: '',
        level_of_service: '',
        load_time_minutes: 15,
        unload_time_minutes: 15,
        status: 'active',
      });
    }
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      if (editingSpaceType) {
        const { error } = await supabase
          .from('space_types')
          .update({ ...formData, updated_at: new Date().toISOString() })
          .eq('id', editingSpaceType.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('space_types').insert([formData]);

        if (error) throw error;
      }

      setShowModal(false);
      loadSpaceTypes();
    } catch (error) {
      console.error('Error saving space type:', error);
      alert('Failed to save space type');
    }
  }

  function formatTime(minutes: number) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading space types...</div>
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
            Add Space Type
          </button>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Showing {filteredSpaceTypes.length} entries</span>

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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Level Of Service
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Load Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Unload Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created At</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredSpaceTypes.map((spaceType) => (
                <tr key={spaceType.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => openModal(spaceType)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {spaceType.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{spaceType.description || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {spaceType.level_of_service}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatTime(spaceType.load_time_minutes)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatTime(spaceType.unload_time_minutes)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(spaceType.created_at).toLocaleDateString('en-US', {
                      month: '2-digit',
                      day: '2-digit',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs rounded font-medium ${
                        spaceType.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {spaceType.status.charAt(0).toUpperCase() + spaceType.status.slice(1)}
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
                {editingSpaceType ? 'Edit Space Type' : 'Add Space Type'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    Level Of Service
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.level_of_service}
                    onChange={(e) => setFormData({ ...formData, level_of_service: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Load Time (minutes)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.load_time_minutes}
                    onChange={(e) =>
                      setFormData({ ...formData, load_time_minutes: parseInt(e.target.value) })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unload Time (minutes)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.unload_time_minutes}
                    onChange={(e) =>
                      setFormData({ ...formData, unload_time_minutes: parseInt(e.target.value) })
                    }
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
                  {editingSpaceType ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
