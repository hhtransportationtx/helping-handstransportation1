import { useState, useEffect } from 'react';
import { Plus, Edit2, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { RateModal } from './RateModal';

type TabType = 'rates' | 'addons' | 'appointmentTypes';

export function RatesManagement() {
  const [activeTab, setActiveTab] = useState<TabType>('rates');

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="flex gap-1 px-6">
          <button
            onClick={() => setActiveTab('rates')}
            className={`px-6 py-4 font-medium border-b-2 transition-colors ${
              activeTab === 'rates'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Rates
          </button>
          <button
            onClick={() => setActiveTab('addons')}
            className={`px-6 py-4 font-medium border-b-2 transition-colors ${
              activeTab === 'addons'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Addons
          </button>
          <button
            onClick={() => setActiveTab('appointmentTypes')}
            className={`px-6 py-4 font-medium border-b-2 transition-colors ${
              activeTab === 'appointmentTypes'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Appointment Types
          </button>
        </div>
      </div>

      {activeTab === 'rates' && <RatesTab />}
      {activeTab === 'addons' && <AddonsTab />}
      {activeTab === 'appointmentTypes' && <AppointmentTypesTab />}
    </div>
  );
}

function RatesTab() {
  const [rates, setRates] = useState<any[]>([]);
  const [fundingSources, setFundingSources] = useState<any[]>([]);
  const [serviceAreas, setServiceAreas] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Active');
  const [fundingSourceFilter, setFundingSourceFilter] = useState('');
  const [serviceAreaFilter, setServiceAreaFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedRate, setSelectedRate] = useState<any | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [ratesRes, sourcesRes, areasRes] = await Promise.all([
        supabase
          .from('rates')
          .select('*, funding_source:funding_sources(name), service_area:service_areas(name)')
          .order('id'),
        supabase
          .from('funding_sources')
          .select('id, name')
          .order('name'),
        supabase
          .from('service_areas')
          .select('id, name')
          .eq('status', 'active')
          .order('name')
      ]);

      if (ratesRes.data) setRates(ratesRes.data);
      if (sourcesRes.data) setFundingSources(sourcesRes.data);
      if (areasRes.data) setServiceAreas(areasRes.data);
    } catch (error) {
      console.error('Error loading rates:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredRates = rates.filter((rate) => {
    const matchesSearch = rate.funding_source?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !statusFilter || rate.status === statusFilter.toLowerCase();
    const matchesFundingSource = !fundingSourceFilter || rate.funding_source_id === fundingSourceFilter;
    const matchesServiceArea = !serviceAreaFilter || rate.service_area_id === serviceAreaFilter;
    return matchesSearch && matchesStatus && matchesFundingSource && matchesServiceArea;
  });

  const getDayBadges = (days: string[]) => {
    const allDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return allDays.map((day) => {
      const isActive = days.includes(day);
      return (
        <span
          key={day}
          className={`px-2 py-1 text-xs rounded font-medium ${
            isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'
          }`}
        >
          {day}
        </span>
      );
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading rates...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => {
              setSelectedRate(null);
              setShowModal(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Rate
          </button>

          <div className="flex items-center gap-4">
            <p className="text-sm text-gray-600">Showing {filteredRates.length} entries</p>

            <select
              value={fundingSourceFilter}
              onChange={(e) => setFundingSourceFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select Funding Source --</option>
              {fundingSources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.name}
                </option>
              ))}
            </select>

            <select
              value={serviceAreaFilter}
              onChange={(e) => setServiceAreaFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select Service Area --</option>
              {serviceAreas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
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

        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Funding Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Service Area
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  LOS
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Space Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Day(s)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Start Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  End Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Base Fare
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Per Mile
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Per Minute
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Minimum Fare
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Cancel Charge
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  No Show Charge
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredRates.map((rate, index) => (
                <tr key={rate.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => {
                        setSelectedRate(rate);
                        setShowModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {rate.funding_source?.name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {rate.service_area?.name || 'All Areas'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {rate.los}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {rate.space_type}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1">
                      {getDayBadges(rate.days || [])}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {rate.start_time}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {rate.end_time}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${rate.base_fare?.toFixed(1) || '0.0'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${rate.per_mile?.toFixed(1) || '0.0'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${rate.per_minute?.toFixed(1) || '0.0'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${rate.minimum_fare?.toFixed(1) || '0.0'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${rate.cancel_charge?.toFixed(1) || '0.0'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${rate.no_show_charge?.toFixed(1) || '0.0'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs rounded font-medium bg-green-100 text-green-700">
                      {rate.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <RateModal
          rate={selectedRate}
          onClose={() => {
            setShowModal(false);
            setSelectedRate(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}

function AddonsTab() {
  const [addons, setAddons] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Active');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAddons();
  }, []);

  async function loadAddons() {
    try {
      const { data, error } = await supabase
        .from('rate_addons')
        .select('*')
        .order('name');

      if (error) throw error;
      setAddons(data || []);
    } catch (error) {
      console.error('Error loading addons:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredAddons = addons.filter((addon) => {
    const matchesSearch = addon.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !statusFilter || addon.status === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading addons...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Addon
          </button>

          <div className="flex items-center gap-4">
            <p className="text-sm text-gray-600">Showing {filteredAddons.length} entries</p>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredAddons.map((addon) => (
                <tr key={addon.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button className="text-blue-600 hover:text-blue-800">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {addon.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {addon.description || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${addon.price?.toFixed(2) || '0.00'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs rounded font-medium bg-green-100 text-green-700">
                      {addon.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AppointmentTypesTab() {
  const [appointmentTypes, setAppointmentTypes] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Active');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAppointmentTypes();
  }, []);

  async function loadAppointmentTypes() {
    try {
      const { data, error } = await supabase
        .from('appointment_types')
        .select('*')
        .order('name');

      if (error) throw error;
      setAppointmentTypes(data || []);
    } catch (error) {
      console.error('Error loading appointment types:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredTypes = appointmentTypes.filter((type) => {
    const matchesSearch = type.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !statusFilter || type.status === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading appointment types...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Appointment Type
          </button>

          <div className="flex items-center gap-4">
            <p className="text-sm text-gray-600">Showing {filteredTypes.length} entries</p>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Duration (min)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Color
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredTypes.map((type) => (
                <tr key={type.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button className="text-blue-600 hover:text-blue-800">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {type.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {type.description || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {type.duration_minutes}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded border border-gray-300"
                        style={{ backgroundColor: type.color }}
                      />
                      <span className="text-sm text-gray-900">{type.color}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs rounded font-medium bg-green-100 text-green-700">
                      {type.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
