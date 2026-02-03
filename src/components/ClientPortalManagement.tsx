import React, { useState, useEffect } from 'react';
import { Building2, Plus, X, Key, Mail, Phone, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ClientPortal {
  id: string;
  organization_name: string;
  organization_type: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  address: string | null;
  billing_address: string | null;
  status: string;
  api_key: string;
  created_at: string;
}

export default function ClientPortalManagement() {
  const [portals, setPortals] = useState<ClientPortal[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    organization_name: '',
    organization_type: 'nursing_home',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    billing_address: ''
  });

  useEffect(() => {
    loadPortals();
  }, []);

  const loadPortals = async () => {
    const { data, error } = await supabase
      .from('client_portals')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPortals(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase
      .from('client_portals')
      .insert([formData]);

    if (!error) {
      setShowModal(false);
      setFormData({
        organization_name: '',
        organization_type: 'nursing_home',
        contact_name: '',
        contact_email: '',
        contact_phone: '',
        address: '',
        billing_address: ''
      });
      loadPortals();
    }

    setLoading(false);
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    await supabase
      .from('client_portals')
      .update({ status: newStatus })
      .eq('id', id);
    loadPortals();
  };

  const copyApiKey = (apiKey: string) => {
    navigator.clipboard.writeText(apiKey);
    alert('API Key copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Client Portal Management</h1>
            <p className="text-gray-600">Manage self-service portals for nursing homes and private clients</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl"
          >
            <Plus className="w-5 h-5" />
            Add Portal
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {portals.map((portal) => (
            <div key={portal.id} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all p-6 border border-gray-100">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Building2 className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{portal.organization_name}</h3>
                    <span className="text-sm text-gray-500 capitalize">
                      {portal.organization_type.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => toggleStatus(portal.id, portal.status)}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    portal.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {portal.status}
                </button>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="w-4 h-4" />
                  {portal.contact_name}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="w-4 h-4" />
                  {portal.contact_email}
                </div>
                {portal.contact_phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="w-4 h-4" />
                    {portal.contact_phone}
                  </div>
                )}
                {portal.address && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4" />
                    {portal.address}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500">API Key</span>
                    <button
                      onClick={() => copyApiKey(portal.api_key)}
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs"
                    >
                      <Key className="w-3 h-3" />
                      Copy Key
                    </button>
                  </div>
                  <div className="bg-gray-50 p-2 rounded text-xs font-mono truncate">
                    {portal.api_key}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500">Portal Login URL</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/client-portal`);
                        alert('Portal URL copied to clipboard!');
                      }}
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs"
                    >
                      <Key className="w-3 h-3" />
                      Copy URL
                    </button>
                  </div>
                  <div className="bg-blue-50 p-2 rounded text-xs font-mono truncate text-blue-800">
                    {window.location.origin}/client-portal
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center p-6 border-b">
                <h2 className="text-2xl font-bold text-gray-900">Add Client Portal</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Organization Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.organization_name}
                    onChange={(e) => setFormData({ ...formData, organization_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Organization Type
                  </label>
                  <select
                    value={formData.organization_type}
                    onChange={(e) => setFormData({ ...formData, organization_type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="nursing_home">Nursing Home</option>
                    <option value="private_pay">Private Pay</option>
                    <option value="medical_facility">Medical Facility</option>
                    <option value="dialysis_center">Dialysis Center</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.contact_name}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Billing Address
                  </label>
                  <input
                    type="text"
                    value={formData.billing_address}
                    onChange={(e) => setFormData({ ...formData, billing_address: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 font-medium"
                  >
                    {loading ? 'Creating...' : 'Create Portal'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
