import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Building2 } from 'lucide-react';

interface Company {
  id: string;
  name: string;
  subdomain: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  timezone: string;
  status: string;
  logo_url: string;
  primary_color: string;
}

interface CompanyModalProps {
  company: Company | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CompanyModal({ company, onClose, onSuccess }: CompanyModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    subdomain: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    timezone: 'America/New_York',
    status: 'trial',
    logo_url: '',
    primary_color: '#3B82F6'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name || '',
        subdomain: company.subdomain || '',
        contact_email: company.contact_email || '',
        contact_phone: company.contact_phone || '',
        address: company.address || '',
        city: company.city || '',
        state: company.state || '',
        zip_code: company.zip_code || '',
        timezone: company.timezone || 'America/New_York',
        status: company.status || 'trial',
        logo_url: company.logo_url || '',
        primary_color: company.primary_color || '#3B82F6'
      });
    }
  }, [company]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const subdomain = formData.subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '');

      if (company) {
        const { error: updateError } = await supabase
          .from('companies')
          .update({
            name: formData.name,
            subdomain,
            contact_email: formData.contact_email,
            contact_phone: formData.contact_phone,
            address: formData.address,
            city: formData.city,
            state: formData.state,
            zip_code: formData.zip_code,
            timezone: formData.timezone,
            status: formData.status,
            logo_url: formData.logo_url,
            primary_color: formData.primary_color
          })
          .eq('id', company.id);

        if (updateError) throw updateError;
      } else {
        const { data: newCompany, error: insertError } = await supabase
          .from('companies')
          .insert([{
            name: formData.name,
            subdomain,
            contact_email: formData.contact_email,
            contact_phone: formData.contact_phone,
            address: formData.address,
            city: formData.city,
            state: formData.state,
            zip_code: formData.zip_code,
            timezone: formData.timezone,
            status: formData.status,
            logo_url: formData.logo_url,
            primary_color: formData.primary_color
          }])
          .select()
          .single();

        if (insertError) throw insertError;

        if (newCompany) {
          const { data: plans } = await supabase
            .from('subscription_plans')
            .select('id')
            .eq('name', 'Starter')
            .single();

          if (plans) {
            await supabase
              .from('company_subscriptions')
              .insert([{
                company_id: newCompany.id,
                plan_id: plans.id,
                status: 'trialing',
                billing_cycle: 'monthly'
              }]);
          }
        }
      }

      onSuccess();
    } catch (err: any) {
      console.error('Error saving company:', err);
      setError(err.message || 'Failed to save company');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              {company ? 'Edit Company' : 'Add New Company'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Acme Transportation"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subdomain
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  required
                  value={formData.subdomain}
                  onChange={(e) => setFormData({ ...formData, subdomain: e.target.value.toLowerCase() })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="acme"
                  pattern="[a-z0-9-]+"
                />
                <span className="text-gray-500">.yourdomain.com</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="trial">Trial</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Email
              </label>
              <input
                type="email"
                required
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="admin@acme.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Phone
              </label>
              <input
                type="tel"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="+1 (555) 000-0000"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="123 Main St"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="New York"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State
              </label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="NY"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Zip Code
              </label>
              <input
                type="text"
                value={formData.zip_code}
                onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="10001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Timezone
              </label>
              <select
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Primary Color
              </label>
              <input
                type="color"
                value={formData.primary_color}
                onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                className="w-full h-10 px-1 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Logo URL
              </label>
              <input
                type="url"
                value={formData.logo_url}
                onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="https://example.com/logo.png"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : company ? 'Update Company' : 'Create Company'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
