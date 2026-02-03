import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CreditCard, Plus, Save, Trash2, Edit2, X } from 'lucide-react';
import { PaymentQRCodes } from './PaymentQRCodes';

type PaymentSetting = {
  id: string;
  payment_type: 'cash_app' | 'apple_pay' | 'zelle' | 'paypal';
  account_identifier: string;
  display_name: string;
  is_active: boolean;
  instructions: string | null;
  created_at: string;
  updated_at: string;
};

type PaymentTypeInfo = {
  label: string;
  placeholder: string;
  icon: string;
};

const PAYMENT_TYPES: Record<string, PaymentTypeInfo> = {
  cash_app: {
    label: 'Cash App',
    placeholder: '$cashtag (e.g., $YourCompany)',
    icon: '💵',
  },
  apple_pay: {
    label: 'Apple Pay',
    placeholder: 'Phone number or email',
    icon: '',
  },
  zelle: {
    label: 'Zelle',
    placeholder: 'Email or phone number',
    icon: '⚡',
  },
  paypal: {
    label: 'PayPal',
    placeholder: 'Email or PayPal.me link',
    icon: '🅿️',
  },
};

export function PaymentSettings() {
  const [settings, setSettings] = useState<PaymentSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSetting, setEditingSetting] = useState<PaymentSetting | null>(null);
  const [formData, setFormData] = useState({
    payment_type: 'cash_app' as const,
    account_identifier: '',
    display_name: '',
    is_active: true,
    instructions: '',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payment_settings')
        .select('*')
        .order('payment_type');

      if (error) throw error;
      setSettings(data || []);
    } catch (error) {
      console.error('Error loading payment settings:', error);
    } finally {
      setLoading(false);
    }
  }

  function openModal(setting?: PaymentSetting) {
    if (setting) {
      setEditingSetting(setting);
      setFormData({
        payment_type: setting.payment_type,
        account_identifier: setting.account_identifier,
        display_name: setting.display_name,
        is_active: setting.is_active,
        instructions: setting.instructions || '',
      });
    } else {
      setEditingSetting(null);
      setFormData({
        payment_type: 'cash_app',
        account_identifier: '',
        display_name: '',
        is_active: true,
        instructions: '',
      });
    }
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingSetting(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const settingData = {
        ...formData,
        instructions: formData.instructions || null,
        updated_at: new Date().toISOString(),
      };

      if (editingSetting) {
        const { error } = await supabase
          .from('payment_settings')
          .update(settingData)
          .eq('id', editingSetting.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('payment_settings')
          .insert(settingData);
        if (error) throw error;
      }

      await loadSettings();
      closeModal();
    } catch (error) {
      console.error('Error saving payment setting:', error);
      alert('Error saving payment setting');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this payment method?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('payment_settings')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadSettings();
    } catch (error) {
      console.error('Error deleting payment setting:', error);
      alert('Error deleting payment setting');
    }
  }

  async function toggleActive(id: string, currentStatus: boolean) {
    try {
      const { error } = await supabase
        .from('payment_settings')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      await loadSettings();
    } catch (error) {
      console.error('Error updating payment setting:', error);
      alert('Error updating payment setting');
    }
  }

  if (loading && settings.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading payment settings...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payment Settings</h1>
          <p className="text-gray-600 mt-1">
            Configure your payment accounts for private pay invoices
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Payment Method
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {settings.map((setting) => (
          <div
            key={setting.id}
            className={`bg-white rounded-xl shadow-md p-6 border-2 ${
              setting.is_active ? 'border-green-200' : 'border-gray-200'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">
                  {PAYMENT_TYPES[setting.payment_type]?.icon}
                </span>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {setting.display_name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {PAYMENT_TYPES[setting.payment_type]?.label}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleActive(setting.id, setting.is_active)}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    setting.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {setting.is_active ? 'Active' : 'Inactive'}
                </button>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Account</p>
                <p className="text-sm font-medium text-gray-900">
                  {setting.account_identifier}
                </p>
              </div>
              {setting.instructions && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Instructions</p>
                  <p className="text-sm text-gray-700">{setting.instructions}</p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => openModal(setting)}
                className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={() => handleDelete(setting.id)}
                className="bg-red-100 text-red-700 py-2 px-4 rounded-lg font-medium hover:bg-red-200 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {settings.length === 0 && (
        <div className="text-center py-12">
          <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No payment methods configured
          </h3>
          <p className="text-gray-500 mb-4">
            Add your payment accounts to start accepting private payments
          </p>
          <button
            onClick={() => openModal()}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Your First Payment Method
          </button>
        </div>
      )}

      {settings.length > 0 && (
        <div className="mt-12">
          <div className="border-t border-gray-200 pt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment QR Codes</h2>
            <p className="text-gray-600 mb-6">
              Generate QR codes for your payment methods. Print them or share them with members for easy payment.
            </p>
            <PaymentQRCodes isAdminView={true} />
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingSetting ? 'Edit Payment Method' : 'Add Payment Method'}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Type *
                </label>
                <select
                  value={formData.payment_type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      payment_type: e.target.value as any,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={!!editingSetting}
                >
                  {Object.entries(PAYMENT_TYPES).map(([key, info]) => (
                    <option key={key} value={key}>
                      {info.icon} {info.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Display Name *
                </label>
                <input
                  type="text"
                  value={formData.display_name}
                  onChange={(e) =>
                    setFormData({ ...formData, display_name: e.target.value })
                  }
                  placeholder="e.g., Company Cash App"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Identifier *
                </label>
                <input
                  type="text"
                  value={formData.account_identifier}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      account_identifier: e.target.value,
                    })
                  }
                  placeholder={
                    PAYMENT_TYPES[formData.payment_type]?.placeholder
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Instructions (Optional)
                </label>
                <textarea
                  value={formData.instructions}
                  onChange={(e) =>
                    setFormData({ ...formData, instructions: e.target.value })
                  }
                  rows={3}
                  placeholder="e.g., Send payment to this account and include your invoice number in the memo"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) =>
                    setFormData({ ...formData, is_active: e.target.checked })
                  }
                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="text-sm text-gray-700">
                  Active (show this payment method to customers)
                </label>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  {loading ? 'Saving...' : 'Save Payment Method'}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
