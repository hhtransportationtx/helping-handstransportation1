import { useState, useEffect } from 'react';
import { supabase, Invoice } from '../lib/supabase';
import { DollarSign, FileText, Clock, CheckCircle, XCircle, Plus, Sparkles } from 'lucide-react';
import { InvoiceModal } from './InvoiceModal';
import { BillingAIAssistant } from './BillingAIAssistant';

export function BillingDashboard() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all');
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    paid: 0,
    overdue: 0,
  });

  useEffect(() => {
    loadInvoices();
  }, [filter]);

  async function loadInvoices() {
    setLoading(true);
    try {
      let query = supabase
        .from('invoices')
        .select(`
          *,
          trip:trips(*),
          patient:patients(*)
        `)
        .order('billing_date', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      if (error) throw error;

      const invoices = data || [];
      setInvoices(invoices);

      const total = invoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
      const pending = invoices
        .filter((inv) => inv.status === 'pending')
        .reduce((sum, inv) => sum + Number(inv.amount), 0);
      const paid = invoices
        .filter((inv) => inv.status === 'paid')
        .reduce((sum, inv) => sum + Number(inv.amount), 0);
      const overdue = invoices
        .filter((inv) => inv.status === 'overdue')
        .reduce((sum, inv) => sum + Number(inv.amount), 0);

      setStats({ total, pending, paid, overdue });
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoading(false);
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'overdue':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <FileText className="w-5 h-5 text-gray-600" />;
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Billing & Claims</h1>
          <p className="text-gray-600 mt-1">Manage invoices and payments</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAIAssistant(true)}
            className="bg-violet-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-violet-700 transition-colors flex items-center gap-2"
          >
            <Sparkles className="w-5 h-5" />
            AI Assistant
          </button>
          <button
            onClick={() => {
              setSelectedInvoice(null);
              setShowModal(true);
            }}
            className="bg-brand-pink text-white px-6 py-3 rounded-lg font-medium hover:bg-brand-red transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Invoice
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-8 h-8 text-brand-pink" />
            <h3 className="text-sm font-medium text-gray-600">Total Revenue</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">${stats.total.toFixed(2)}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <h3 className="text-sm font-medium text-gray-600">Paid</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">${stats.paid.toFixed(2)}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-8 h-8 text-yellow-600" />
            <h3 className="text-sm font-medium text-gray-600">Pending</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">${stats.pending.toFixed(2)}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-2">
            <XCircle className="w-8 h-8 text-red-600" />
            <h3 className="text-sm font-medium text-gray-600">Overdue</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">${stats.overdue.toFixed(2)}</p>
        </div>
      </div>

      <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
        {['all', 'pending', 'paid', 'overdue'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status as typeof filter)}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              filter === status
                ? 'bg-brand-pink text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : invoices.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No invoices found</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {invoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    onClick={() => {
                      setSelectedInvoice(invoice);
                      setShowModal(true);
                    }}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(invoice.status)}
                        <span className="font-medium text-gray-900">
                          {invoice.invoice_number}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-gray-900">{invoice.patient?.full_name}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-semibold text-gray-900">
                        ${Number(invoice.amount).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(invoice.status)}`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {new Date(invoice.billing_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <InvoiceModal
          invoice={selectedInvoice}
          onClose={() => {
            setShowModal(false);
            setSelectedInvoice(null);
            loadInvoices();
          }}
        />
      )}

      {showAIAssistant && (
        <BillingAIAssistant
          onClose={() => setShowAIAssistant(false)}
          invoices={invoices}
        />
      )}
    </div>
  );
}