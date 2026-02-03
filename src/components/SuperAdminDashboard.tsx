import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Building2, Users, TrendingUp, DollarSign, Plus, Search, Edit, Eye } from 'lucide-react';
import CompanyModal from './CompanyModal';

interface Company {
  id: string;
  name: string;
  subdomain: string;
  status: string;
  contact_email: string;
  contact_phone: string;
  created_at: string;
  trial_ends_at: string | null;
}

interface CompanyStats {
  total_companies: number;
  active_companies: number;
  trial_companies: number;
  monthly_revenue: number;
}

export default function SuperAdminDashboard() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [stats, setStats] = useState<CompanyStats>({
    total_companies: 0,
    active_companies: 0,
    trial_companies: 0,
    monthly_revenue: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  useEffect(() => {
    loadCompanies();
    loadStats();
  }, []);

  const loadCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error loading companies:', error);
    }
  };

  const loadStats = async () => {
    try {
      const { data: companies } = await supabase
        .from('companies')
        .select('status');

      const { data: subscriptions } = await supabase
        .from('company_subscriptions')
        .select('plan:subscription_plans(price_monthly)')
        .eq('status', 'active');

      if (companies) {
        const total = companies.length;
        const active = companies.filter(c => c.status === 'active').length;
        const trial = companies.filter(c => c.status === 'trial').length;

        let revenue = 0;
        if (subscriptions) {
          revenue = subscriptions.reduce((sum, sub: any) => {
            return sum + (sub.plan?.price_monthly || 0);
          }, 0);
        }

        setStats({
          total_companies: total,
          active_companies: active,
          trial_companies: trial,
          monthly_revenue: revenue
        });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.subdomain.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.contact_email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'trial': return 'bg-blue-100 text-blue-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleCompanyCreated = () => {
    loadCompanies();
    loadStats();
    setShowCompanyModal(false);
    setSelectedCompany(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Platform Administration</h1>
          <p className="text-gray-600 mt-1">Manage all companies using your SaaS platform</p>
        </div>
        <button
          onClick={() => {
            setSelectedCompany(null);
            setShowCompanyModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Add Company
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Companies</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total_companies}</p>
            </div>
            <Building2 className="w-12 h-12 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Companies</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats.active_companies}</p>
            </div>
            <Users className="w-12 h-12 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">On Trial</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{stats.trial_companies}</p>
            </div>
            <TrendingUp className="w-12 h-12 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Monthly Revenue</p>
              <p className="text-3xl font-bold text-green-600 mt-2">${stats.monthly_revenue.toLocaleString()}</p>
            </div>
            <DollarSign className="w-12 h-12 text-green-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search companies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subdomain</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredCompanies.map((company) => (
                <tr key={company.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{company.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-gray-600">{company.subdomain}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{company.contact_email}</div>
                    <div className="text-sm text-gray-500">{company.contact_phone}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(company.status)}`}>
                      {company.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(company.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedCompany(company);
                          setShowCompanyModal(true);
                        }}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        title="Edit Company"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => window.location.href = `/?company=${company.subdomain}`}
                        className="p-1 text-gray-600 hover:bg-gray-50 rounded"
                        title="View Company"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredCompanies.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No companies found</p>
          </div>
        )}
      </div>

      {showCompanyModal && (
        <CompanyModal
          company={selectedCompany}
          onClose={() => {
            setShowCompanyModal(false);
            setSelectedCompany(null);
          }}
          onSuccess={handleCompanyCreated}
        />
      )}
    </div>
  );
}
