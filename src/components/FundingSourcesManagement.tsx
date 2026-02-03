import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Edit, Plus, Map as MapIcon, List } from 'lucide-react';
import { FundingSourceModal } from './FundingSourceModal';
import { useGoogleMaps } from '../hooks/useGoogleMaps';

interface FundingSource {
  id: string;
  name: string;
  email: string;
  address: string;
  contact_number: string;
  odometer: string;
  code: string;
  insurance: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export function FundingSourcesManagement() {
  const [fundingSources, setFundingSources] = useState<FundingSource[]>([]);
  const [filteredFundingSources, setFilteredFundingSources] = useState<FundingSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [viewMode, setViewMode] = useState<'list' | 'mapper'>('list');
  const [showModal, setShowModal] = useState(false);
  const [selectedFundingSource, setSelectedFundingSource] = useState<FundingSource | null>(null);
  const [serviceAreas, setServiceAreas] = useState<any[]>([]);
  const [fundingSourceCoverage, setFundingSourceCoverage] = useState<Map<string, string[]>>(new Map());

  useEffect(() => {
    loadFundingSources();
    if (viewMode === 'mapper') {
      loadMapperData();
    }

    const subscription = supabase
      .channel('funding_sources_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'funding_sources' },
        () => {
          loadFundingSources();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (viewMode === 'mapper') {
      loadMapperData();
    }
  }, [viewMode]);

  useEffect(() => {
    filterFundingSources();
  }, [fundingSources, searchQuery, statusFilter]);

  async function loadFundingSources() {
    try {
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Profile error:', profileError);
        throw new Error('Failed to load profile');
      }

      if (!profile?.company_id) {
        console.error('No company_id found in profile:', profile);
        throw new Error('No company assigned to your account');
      }

      const { data, error } = await supabase
        .from('funding_sources')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('name', { ascending: true });

      if (error) {
        console.error('Funding sources query error:', error);
        throw error;
      }

      console.log('Loaded funding sources:', data);
      setFundingSources(data || []);
    } catch (error: any) {
      console.error('Error loading funding sources:', error);
      setError(error.message || 'Failed to load funding sources');
    } finally {
      setLoading(false);
    }
  }

  function filterFundingSources() {
    let filtered = [...fundingSources];

    if (statusFilter !== 'all') {
      filtered = filtered.filter((fs) => fs.status === statusFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (fs) =>
          fs.name?.toLowerCase().includes(query) ||
          fs.email?.toLowerCase().includes(query) ||
          fs.address?.toLowerCase().includes(query) ||
          fs.code?.toLowerCase().includes(query)
      );
    }

    setFilteredFundingSources(filtered);
  }

  async function loadMapperData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) return;

      const [areasRes, ratesRes] = await Promise.all([
        supabase
          .from('service_areas')
          .select('*')
          .eq('company_id', profile.company_id)
          .order('name'),
        supabase
          .from('rates')
          .select('funding_source_id, service_area_id, funding_source:funding_sources(id, name)')
          .eq('company_id', profile.company_id)
          .eq('status', 'active')
      ]);

      if (areasRes.data) {
        setServiceAreas(areasRes.data);
      }

      if (ratesRes.data) {
        const coverageMap = new Map<string, string[]>();

        ratesRes.data.forEach((rate: any) => {
          const areaId = rate.service_area_id || 'all';
          const fundingSourceName = rate.funding_source?.name;

          if (fundingSourceName) {
            if (!coverageMap.has(areaId)) {
              coverageMap.set(areaId, []);
            }
            const sources = coverageMap.get(areaId)!;
            if (!sources.includes(fundingSourceName)) {
              sources.push(fundingSourceName);
            }
          }
        });

        setFundingSourceCoverage(coverageMap);
      }
    } catch (error) {
      console.error('Error loading mapper data:', error);
    }
  }

  function handleEdit(fundingSource: FundingSource) {
    setSelectedFundingSource(fundingSource);
    setShowModal(true);
  }

  function handleAddNew() {
    setSelectedFundingSource(null);
    setShowModal(true);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading funding sources...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-red-600 font-medium mb-2">Error loading funding sources</div>
          <div className="text-gray-600 text-sm mb-4">{error}</div>
          <button
            onClick={() => {
              setLoading(true);
              loadFundingSources();
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white p-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={handleAddNew}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Funding Source
          </button>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              Showing {filteredFundingSources.length} entries
            </span>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="all">All</option>
            </select>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 w-64 text-sm"
              />
            </div>

            <div className="flex bg-blue-600 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-blue-600'
                }`}
              >
                List
              </button>
              <button
                onClick={() => setViewMode('mapper')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  viewMode === 'mapper'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-blue-600'
                }`}
              >
                Mapper
              </button>
            </div>
          </div>
        </div>

        {viewMode === 'list' ? (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Actions</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Address</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Contact No.</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Odometer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Insurance</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredFundingSources.map((fundingSource) => (
                  <tr key={fundingSource.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4">
                      <button
                        onClick={() => handleEdit(fundingSource)}
                        className="p-1.5 hover:bg-blue-50 rounded transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4 text-blue-600" />
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-blue-600 font-semibold text-sm">
                            {fundingSource.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{fundingSource.name}</p>
                          {fundingSource.email && (
                            <p className="text-xs text-gray-500">{fundingSource.email}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700">
                      {fundingSource.address || 'N/A'}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700">
                      {fundingSource.contact_number || 'N/A'}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700">
                      {fundingSource.odometer || 'N/A'}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700">
                      {fundingSource.code || 'N/A'}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700">
                      {fundingSource.insurance || 'N/A'}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          fundingSource.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {fundingSource.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredFundingSources.length === 0 && (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <p className="text-lg font-medium">No funding sources found</p>
                <p className="text-sm">Try adjusting your filters or add a new funding source</p>
              </div>
            )}
          </div>
        ) : (
          <MapperView
            serviceAreas={serviceAreas}
            fundingSourceCoverage={fundingSourceCoverage}
            filteredFundingSources={filteredFundingSources}
          />
        )}
      </div>

      {showModal && (
        <FundingSourceModal
          fundingSource={selectedFundingSource}
          onClose={() => {
            setShowModal(false);
            setSelectedFundingSource(null);
            loadFundingSources();
          }}
        />
      )}
    </div>
  );
}

interface MapperViewProps {
  serviceAreas: any[];
  fundingSourceCoverage: Map<string, string[]>;
  filteredFundingSources: FundingSource[];
}

function MapperView({ serviceAreas, fundingSourceCoverage, filteredFundingSources }: MapperViewProps) {
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [selectedFundingSource, setSelectedFundingSource] = useState<string | null>(null);

  const colors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#EC4899', '#14B8A6', '#F97316', '#06B6D4', '#84CC16'
  ];

  const getFundingSourceColor = (fundingSourceName: string) => {
    const index = filteredFundingSources.findIndex(fs => fs.name === fundingSourceName);
    return colors[index % colors.length];
  };

  const getAreaFundingSources = (areaId: string) => {
    const sources = fundingSourceCoverage.get(areaId) || [];
    const globalSources = fundingSourceCoverage.get('all') || [];
    const allSources = [...new Set([...sources, ...globalSources])];
    return allSources.filter(name =>
      filteredFundingSources.some(fs => fs.name === name)
    );
  };

  const filteredAreas = serviceAreas.filter(area => {
    if (!selectedFundingSource) return true;
    return getAreaFundingSources(area.id).includes(selectedFundingSource);
  });

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="grid grid-cols-12 h-[calc(100vh-300px)]">
        <div className="col-span-3 border-r border-gray-200 overflow-y-auto">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-semibold text-gray-900">Funding Sources</h3>
            <p className="text-xs text-gray-500 mt-1">Click to filter by source</p>
          </div>

          <div className="p-2">
            <button
              onClick={() => setSelectedFundingSource(null)}
              className={`w-full text-left px-3 py-2 rounded-lg mb-1 transition-colors ${
                !selectedFundingSource
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'hover:bg-gray-50'
              }`}
            >
              All Funding Sources
            </button>

            {filteredFundingSources.map((fs, index) => {
              const areasCount = serviceAreas.filter(area =>
                getAreaFundingSources(area.id).includes(fs.name)
              ).length;

              return (
                <button
                  key={fs.id}
                  onClick={() => setSelectedFundingSource(fs.name)}
                  className={`w-full text-left px-3 py-2 rounded-lg mb-1 transition-colors ${
                    selectedFundingSource === fs.name
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: colors[index % colors.length] }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {fs.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {areasCount} {areasCount === 1 ? 'area' : 'areas'}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="col-span-9 overflow-y-auto">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-semibold text-gray-900">Service Areas Coverage</h3>
            <p className="text-xs text-gray-500 mt-1">
              {selectedFundingSource
                ? `Showing areas covered by ${selectedFundingSource}`
                : 'Showing all service areas and their funding sources'
              }
            </p>
            {fundingSourceCoverage.size === 0 && (
              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                <strong>Note:</strong> To connect funding sources to service areas, go to the <strong>Rates</strong> tab and create rates for each funding source and service area combination.
              </div>
            )}
          </div>

          <div className="p-6">
            {filteredAreas.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <MapIcon className="w-16 h-16 mb-4 text-gray-300" />
                <p className="text-lg font-medium">No service areas found</p>
                <p className="text-sm">
                  {selectedFundingSource
                    ? `${selectedFundingSource} doesn't cover any service areas yet`
                    : 'No service areas available'
                  }
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {filteredAreas.map((area) => {
                  const fundingSources = getAreaFundingSources(area.id);
                  const isSelected = selectedArea === area.id;

                  return (
                    <div
                      key={area.id}
                      onClick={() => setSelectedArea(isSelected ? null : area.id)}
                      className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 shadow-lg'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 text-lg mb-1">
                            {area.name}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {area.zip_codes?.length || 0} ZIP codes
                          </p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          area.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {area.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="text-xs font-medium text-gray-500 uppercase">
                          Funding Sources ({fundingSources.length})
                        </div>
                        {fundingSources.length === 0 ? (
                          <p className="text-sm text-gray-400 italic">
                            No funding sources configured
                          </p>
                        ) : (
                          <div className="space-y-1">
                            {fundingSources.map((sourceName) => {
                              const color = getFundingSourceColor(sourceName);
                              return (
                                <div
                                  key={sourceName}
                                  className="flex items-center gap-2 text-sm"
                                >
                                  <div
                                    className="w-2 h-2 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: color }}
                                  />
                                  <span className="text-gray-700 truncate">
                                    {sourceName}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {isSelected && area.zip_codes && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="text-xs font-medium text-gray-500 uppercase mb-2">
                            ZIP Codes
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {(Array.isArray(area.zip_codes) ? area.zip_codes : []).map((zip: string) => (
                              <span
                                key={zip}
                                className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                              >
                                {zip}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
