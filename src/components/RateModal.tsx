import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface RateModalProps {
  rate: any;
  onClose: () => void;
}

interface Zone {
  id: string;
  name: string;
  rate: number;
}

export function RateModal({ rate, onClose }: RateModalProps) {
  const [formData, setFormData] = useState({
    funding_source_id: '',
    service_area_id: '',
    los: '',
    space_type: '',
    days: [] as string[],
    start_time: '00:00',
    end_time: '23:59',
    base_fare: 0,
    for_miles: 0,
    per_mile: 0,
    per_minute: 0,
    wait_time: 0,
    every_minutes: 0,
    free_quota_minutes: 0,
    minimum_fare: 0,
    cancel_charge: 0,
    no_show_charge: 0,
    calculate_zone_per_mile: false,
    zones: [] as Zone[],
    code: '',
    per_mile_code: '',
    dry_run_code: '',
    base_fare_code: '',
    wait_time_code: '',
    weekend_night_code: '',
    response_night_code: '',
    status: 'active',
  });
  const [fundingSources, setFundingSources] = useState<any[]>([]);
  const [serviceAreas, setServiceAreas] = useState<any[]>([]);
  const [spaceTypes, setSpaceTypes] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const allDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  useEffect(() => {
    loadData();
    if (rate) {
      setFormData({
        funding_source_id: rate.funding_source_id || '',
        service_area_id: rate.service_area_id || '',
        los: rate.los || '',
        space_type: rate.space_type || '',
        days: rate.days || [],
        start_time: rate.start_time || '00:00',
        end_time: rate.end_time || '23:59',
        base_fare: rate.base_fare || 0,
        for_miles: rate.for_miles || 0,
        per_mile: rate.per_mile || 0,
        per_minute: rate.per_minute || 0,
        wait_time: rate.wait_time || 0,
        every_minutes: rate.every_minutes || 0,
        free_quota_minutes: rate.free_quota_minutes || 0,
        minimum_fare: rate.minimum_fare || 0,
        cancel_charge: rate.cancel_charge || 0,
        no_show_charge: rate.no_show_charge || 0,
        calculate_zone_per_mile: rate.calculate_zone_per_mile || false,
        zones: rate.zones || [],
        code: rate.code || '',
        per_mile_code: rate.per_mile_code || '',
        dry_run_code: rate.dry_run_code || '',
        base_fare_code: rate.base_fare_code || '',
        wait_time_code: rate.wait_time_code || '',
        weekend_night_code: rate.weekend_night_code || '',
        response_night_code: rate.response_night_code || '',
        status: rate.status || 'active',
      });
    }
  }, [rate]);

  async function loadData() {
    try {
      const [fundingSourcesRes, serviceAreasRes, spaceTypesRes] = await Promise.all([
        supabase
          .from('funding_sources')
          .select('id, name')
          .eq('status', 'active')
          .order('name'),
        supabase
          .from('service_areas')
          .select('id, name')
          .eq('status', 'active')
          .order('name'),
        supabase
          .from('space_types')
          .select('name, level_of_service')
          .eq('status', 'active')
          .order('name'),
      ]);

      if (fundingSourcesRes.data) setFundingSources(fundingSourcesRes.data);
      if (serviceAreasRes.data) setServiceAreas(serviceAreasRes.data);
      if (spaceTypesRes.data) setSpaceTypes(spaceTypesRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  const toggleDay = (day: string) => {
    setFormData((prev) => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter((d) => d !== day)
        : [...prev.days, day],
    }));
  };

  const addZone = () => {
    setFormData((prev) => ({
      ...prev,
      zones: [...prev.zones, { id: crypto.randomUUID(), name: '', rate: 0 }],
    }));
  };

  const removeZone = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      zones: prev.zones.filter((z) => z.id !== id),
    }));
  };

  const updateZone = (id: string, field: keyof Zone, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      zones: prev.zones.map((z) => (z.id === id ? { ...z, [field]: value } : z)),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      if (!formData.funding_source_id) {
        throw new Error('Please select a funding source');
      }
      if (!formData.los) {
        throw new Error('Please select a level of service');
      }
      if (!formData.space_type) {
        throw new Error('Please select a space type');
      }
      if (formData.days.length === 0) {
        throw new Error('Please select at least one day');
      }

      if (rate) {
        const { error: updateError } = await supabase
          .from('rates')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', rate.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from('rates').insert([formData]);

        if (insertError) throw insertError;
      }

      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to save rate');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-[1024px] max-h-[90vh] flex flex-col m-8">
        <div className="bg-blue-600 text-white p-6 flex items-center justify-between rounded-t-xl flex-shrink-0">
          <h2 className="text-xl font-bold">{rate ? 'Edit' : 'Add Rate'}</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          <form id="rate-form" onSubmit={handleSubmit} className="p-6">
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Funding Source <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.funding_source_id}
                onChange={(e) => setFormData({ ...formData, funding_source_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select...</option>
                {fundingSources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Service Area
              </label>
              <select
                value={formData.service_area_id}
                onChange={(e) => setFormData({ ...formData, service_area_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Areas</option>
                {serviceAreas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Level of Service <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.los}
                onChange={(e) => setFormData({ ...formData, los: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select...</option>
                {Array.from(new Set(spaceTypes.map((st) => st.level_of_service))).map((los) => (
                  <option key={los} value={los}>
                    {los}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Space Type <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.space_type}
                onChange={(e) => setFormData({ ...formData, space_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select...</option>
                {spaceTypes.map((st) => (
                  <option key={st.name} value={st.name}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
              <input
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Day(s) <span className="text-red-500">*</span>
              </label>
              <div className={`flex flex-wrap gap-1 p-2 border rounded-lg ${
                formData.days.length === 0 ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}>
                {allDays.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                      formData.days.includes(day)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
              {formData.days.length === 0 && (
                <p className="mt-1 text-xs text-red-600">Please select at least one day</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Base Fare</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={formData.base_fare}
                  onChange={(e) => setFormData({ ...formData, base_fare: parseFloat(e.target.value) || 0 })}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">For</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={formData.for_miles}
                  onChange={(e) => setFormData({ ...formData, for_miles: parseFloat(e.target.value) || 0 })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-600">
                  Mile
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Per Mile</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={formData.per_mile}
                  onChange={(e) => setFormData({ ...formData, per_mile: parseFloat(e.target.value) || 0 })}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Per Minute</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={formData.per_minute}
                  onChange={(e) => setFormData({ ...formData, per_minute: parseFloat(e.target.value) || 0 })}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Fare</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={formData.minimum_fare}
                  onChange={(e) => setFormData({ ...formData, minimum_fare: parseFloat(e.target.value) || 0 })}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Wait Time</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={formData.wait_time}
                  onChange={(e) => setFormData({ ...formData, wait_time: parseFloat(e.target.value) || 0 })}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Every</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={formData.every_minutes}
                  onChange={(e) => setFormData({ ...formData, every_minutes: parseFloat(e.target.value) || 0 })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-600">
                  Minutes
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Free Quota</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={formData.free_quota_minutes}
                  onChange={(e) => setFormData({ ...formData, free_quota_minutes: parseFloat(e.target.value) || 0 })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-600">
                  Minutes
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cancel Charges</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={formData.cancel_charge}
                  onChange={(e) => setFormData({ ...formData, cancel_charge: parseFloat(e.target.value) || 0 })}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">No Show Charges</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={formData.no_show_charge}
                  onChange={(e) => setFormData({ ...formData, no_show_charge: parseFloat(e.target.value) || 0 })}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Zones</h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.calculate_zone_per_mile}
                  onChange={(e) => setFormData({ ...formData, calculate_zone_per_mile: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Calculate Zone Per Mile</span>
              </label>
            </div>
            <button
              type="button"
              onClick={addZone}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm font-medium mb-3"
            >
              <Plus className="w-4 h-4" />
              Zone
            </button>
            <div className="space-y-2">
              {formData.zones.map((zone) => (
                <div key={zone.id} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Zone name"
                    value={zone.name}
                    onChange={(e) => updateZone(zone.id, 'name', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Rate"
                    value={zone.rate}
                    onChange={(e) => updateZone(zone.id, 'rate', parseFloat(e.target.value) || 0)}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeZone(zone.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Per Mile Code</label>
              <input
                type="text"
                value={formData.per_mile_code}
                onChange={(e) => setFormData({ ...formData, per_mile_code: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dry Run Code</label>
              <input
                type="text"
                value={formData.dry_run_code}
                onChange={(e) => setFormData({ ...formData, dry_run_code: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Base Fare Code</label>
              <input
                type="text"
                value={formData.base_fare_code}
                onChange={(e) => setFormData({ ...formData, base_fare_code: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Wait Time Code</label>
              <input
                type="text"
                value={formData.wait_time_code}
                onChange={(e) => setFormData({ ...formData, wait_time_code: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Weekend Night Code</label>
              <input
                type="text"
                value={formData.weekend_night_code}
                onChange={(e) => setFormData({ ...formData, weekend_night_code: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Response Night Code</label>
              <input
                type="text"
                value={formData.response_night_code}
                onChange={(e) => setFormData({ ...formData, response_night_code: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          </form>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-white rounded-b-xl flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="rate-form"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Update'}
          </button>
        </div>
      </div>
    </div>
  );
}
