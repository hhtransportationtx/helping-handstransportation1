import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface FundingSourceModalProps {
  fundingSource: any;
  onClose: () => void;
}

export function FundingSourceModal({ fundingSource, onClose }: FundingSourceModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    email: '',
    address: '',
    contact_number: '',
    toll_free_number: '',
    priority: 0,
    billing_name: '',
    mailing_address: '',
    odometer: '',
    code: '',
    insurance: '',
    select_broker: '',
    broker_id: '',
    time_mode: 'Both',
    status: 'active',
    level_of_service: [] as string[],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (fundingSource) {
      setFormData({
        name: fundingSource.name || '',
        display_name: fundingSource.display_name || '',
        email: fundingSource.email || '',
        address: fundingSource.address || '',
        contact_number: fundingSource.contact_number || '',
        toll_free_number: fundingSource.toll_free_number || '',
        priority: fundingSource.priority || 0,
        billing_name: fundingSource.billing_name || '',
        mailing_address: fundingSource.mailing_address || '',
        odometer: fundingSource.odometer || '',
        code: fundingSource.code || '',
        insurance: fundingSource.insurance || '',
        select_broker: fundingSource.select_broker || '',
        broker_id: fundingSource.broker_id || '',
        time_mode: fundingSource.time_mode || 'Both',
        status: fundingSource.status || 'active',
        level_of_service: fundingSource.level_of_service || [],
      });
    }
  }, [fundingSource]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) throw new Error('No company assigned');

      const dataToSubmit = {
        ...formData,
        odometer: formData.odometer ? parseFloat(formData.odometer) : null,
        company_id: profile.company_id,
      };

      if (fundingSource) {
        const { error: updateError } = await supabase
          .from('funding_sources')
          .update({
            ...dataToSubmit,
            updated_at: new Date().toISOString(),
          })
          .eq('id', fundingSource.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('funding_sources')
          .insert([dataToSubmit]);

        if (insertError) throw insertError;
      }

      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to save funding source');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-blue-600 text-white p-6 flex items-center justify-between rounded-t-xl">
          <h2 className="text-xl font-bold">
            {fundingSource ? 'Edit Funding Source' : 'Add Funding Source'}
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Unique code"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="email@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
              <input
                type="text"
                value={formData.contact_number}
                onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Toll-Free Number</label>
              <input
                type="text"
                value={formData.toll_free_number}
                onChange={(e) => setFormData({ ...formData, toll_free_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="1-800-000-0000"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Street address, City, State, ZIP"
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Insurance</label>
              <input
                type="text"
                value={formData.insurance}
                onChange={(e) => setFormData({ ...formData, insurance: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Insurance Provider"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
              <input
                type="text"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter display name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <input
                type="number"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Billing Name</label>
              <input
                type="text"
                value={formData.billing_name}
                onChange={(e) => setFormData({ ...formData, billing_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter billing name"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Mailing Address</label>
              <textarea
                value={formData.mailing_address}
                onChange={(e) => setFormData({ ...formData, mailing_address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter mailing address"
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Broker</label>
              <input
                type="text"
                value={formData.select_broker}
                onChange={(e) => setFormData({ ...formData, select_broker: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Select broker"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Broker ID</label>
              <input
                type="text"
                value={formData.broker_id}
                onChange={(e) => setFormData({ ...formData, broker_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter broker ID"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time Mode</label>
              <select
                value={formData.time_mode}
                onChange={(e) => setFormData({ ...formData, time_mode: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Both">Both</option>
                <option value="Pickup Only">Pickup Only</option>
                <option value="Dropoff Only">Dropoff Only</option>
              </select>
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

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Level of Service <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.level_of_service.includes('AMB')}
                    onChange={(e) => {
                      const updated = e.target.checked
                        ? [...formData.level_of_service, 'AMB']
                        : formData.level_of_service.filter(s => s !== 'AMB');
                      setFormData({ ...formData, level_of_service: updated });
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">AMB (Ambulatory)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.level_of_service.includes('WAV')}
                    onChange={(e) => {
                      const updated = e.target.checked
                        ? [...formData.level_of_service, 'WAV']
                        : formData.level_of_service.filter(s => s !== 'WAV');
                      setFormData({ ...formData, level_of_service: updated });
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">WAV (Wheelchair)</span>
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-1">Select the service levels this funding source covers</p>
            </div>

          </div>

          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
