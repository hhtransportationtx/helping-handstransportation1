import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Building2, Palette, CreditCard, BarChart3 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import UsageAnalytics from './UsageAnalytics';

interface CompanyInfo {
  id: string;
  name: string;
  subdomain: string;
  logo_url: string;
  primary_color: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  timezone: string;
  status: string;
  trial_ends_at: string | null;
}

interface Subscription {
  plan: {
    name: string;
    description: string;
    price_monthly: number;
  };
  status: string;
  billing_cycle: string;
  current_period_end: string;
}

export default function CompanySettings() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'general' | 'branding' | 'subscription' | 'usage'>('general');
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    timezone: 'America/New_York',
    logo_url: '',
    primary_color: '#3B82F6'
  });

  useEffect(() => {
    loadCompanyData();
  }, [profile]);

  const loadCompanyData = async () => {
    if (!profile?.company_id) return;

    try {
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', profile.company_id)
        .single();

      if (companyError) throw companyError;

      setCompany(companyData);
      setFormData({
        name: companyData.name || '',
        contact_email: companyData.contact_email || '',
        contact_phone: companyData.contact_phone || '',
        address: companyData.address || '',
        city: companyData.city || '',
        state: companyData.state || '',
        zip_code: companyData.zip_code || '',
        timezone: companyData.timezone || 'America/New_York',
        logo_url: companyData.logo_url || '',
        primary_color: companyData.primary_color || '#3B82F6'
      });

      const { data: subData } = await supabase
        .from('company_subscriptions')
        .select('*, plan:subscription_plans(*)')
        .eq('company_id', profile.company_id)
        .single();

      if (subData) {
        setSubscription(subData as any);
      }
    } catch (error) {
      console.error('Error loading company data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!company) return;

    setSaving(true);
    setMessage('');

    try {
      const { error } = await supabase
        .from('companies')
        .update({
          name: formData.name,
          contact_email: formData.contact_email,
          contact_phone: formData.contact_phone,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zip_code: formData.zip_code,
          timezone: formData.timezone,
          logo_url: formData.logo_url,
          primary_color: formData.primary_color
        })
        .eq('id', company.id);

      if (error) throw error;

      setMessage('Settings saved successfully');
      loadCompanyData();
    } catch (error: any) {
      console.error('Error saving settings:', error);
      setMessage('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Company information not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Company Settings</h1>
        <p className="text-gray-600 mt-1">Manage your company information and preferences</p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <div className="flex gap-4 px-6">
            <button
              onClick={() => setActiveTab('general')}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'general'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                General
              </div>
            </button>
            <button
              onClick={() => setActiveTab('branding')}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'branding'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Branding
              </div>
            </button>
            <button
              onClick={() => setActiveTab('subscription')}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'subscription'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Subscription
              </div>
            </button>
            <button
              onClick={() => setActiveTab('usage')}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'usage'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Usage
              </div>
            </button>
          </div>
        </div>

        <div className="p-6">
          {message && (
            <div className={`mb-6 px-4 py-3 rounded ${
              message.includes('success')
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {message}
            </div>
          )}

          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Zip Code
                  </label>
                  <input
                    type="text"
                    value={formData.zip_code}
                    onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
              </div>
            </div>
          )}

          {activeTab === 'branding' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Logo URL
                </label>
                <input
                  type="url"
                  value={formData.logo_url}
                  onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com/logo.png"
                />
                {formData.logo_url && (
                  <div className="mt-3">
                    <img src={formData.logo_url} alt="Company logo" className="h-16 object-contain" />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Primary Brand Color
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="color"
                    value={formData.primary_color}
                    onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                    className="h-10 w-20 border border-gray-300 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.primary_color}
                    onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="#3B82F6"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-1">This color will be used throughout your company portal</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">Preview</p>
                <div className="bg-white p-6 rounded border border-gray-200">
                  <div className="flex items-center gap-3 mb-4">
                    {formData.logo_url && (
                      <img src={formData.logo_url} alt="Logo" className="h-10" />
                    )}
                    <h3 className="text-xl font-bold" style={{ color: formData.primary_color }}>
                      {formData.name}
                    </h3>
                  </div>
                  <button
                    className="px-4 py-2 rounded-lg text-white"
                    style={{ backgroundColor: formData.primary_color }}
                  >
                    Sample Button
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'subscription' && subscription && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {subscription.plan.name} Plan
                    </h3>
                    <p className="text-gray-600 mt-1">{subscription.plan.description}</p>
                    <div className="mt-4 flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-gray-900">
                        ${subscription.plan.price_monthly}
                      </span>
                      <span className="text-gray-600">/ month</span>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    subscription.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {subscription.status}
                  </span>
                </div>

                {company.status === 'trial' && company.trial_ends_at && (
                  <div className="mt-4 pt-4 border-t border-blue-200">
                    <p className="text-sm text-blue-900">
                      Your trial ends on {new Date(company.trial_ends_at).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm text-gray-600">
                  Billing cycle renews on {new Date(subscription.current_period_end).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'usage' && <UsageAnalytics />}

          {(activeTab === 'general' || activeTab === 'branding') && (
            <div className="flex justify-end pt-6 border-t border-gray-200 mt-6">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
