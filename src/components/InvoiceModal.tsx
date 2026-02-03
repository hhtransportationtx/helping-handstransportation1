import { useState, useEffect } from 'react';
import { supabase, Invoice, Trip, Patient } from '../lib/supabase';
import { X, Save } from 'lucide-react';

type InvoiceModalProps = {
  invoice: Invoice | null;
  onClose: () => void;
};

export function InvoiceModal({ invoice, onClose }: InvoiceModalProps) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    trip_id: invoice?.trip_id || '',
    patient_id: invoice?.patient_id || '',
    invoice_number: invoice?.invoice_number || `INV-${Date.now()}`,
    amount: invoice?.amount?.toString() || '',
    status: invoice?.status || 'pending',
    billing_date: invoice?.billing_date || new Date().toISOString().split('T')[0],
    due_date: invoice?.due_date || '',
    paid_date: invoice?.paid_date || '',
    payment_method: invoice?.payment_method || '',
    notes: invoice?.notes || '',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [tripsRes, patientsRes] = await Promise.all([
        supabase
          .from('trips')
          .select('*, patient:patients(*)')
          .eq('status', 'completed')
          .order('created_at', { ascending: false }),
        supabase.from('patients').select('*').order('full_name'),
      ]);

      if (tripsRes.data) setTrips(tripsRes.data);
      if (patientsRes.data) setPatients(patientsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const invoiceData = {
        ...formData,
        amount: parseFloat(formData.amount),
        due_date: formData.due_date || null,
        paid_date: formData.paid_date || null,
        payment_method: formData.payment_method || null,
        notes: formData.notes || null,
      };

      const wasUnpaid = invoice?.status !== 'paid';
      const isNowPaid = formData.status === 'paid';

      if (invoice) {
        const { error } = await supabase
          .from('invoices')
          .update(invoiceData)
          .eq('id', invoice.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('invoices').insert(invoiceData);
        if (error) throw error;
      }

      if (wasUnpaid && isNowPaid && formData.patient_id) {
        try {
          await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-invoice-notification`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                invoice_number: formData.invoice_number,
                amount: formData.amount,
                patient_id: formData.patient_id,
                payment_method: formData.payment_method,
                paid_date: formData.paid_date,
              }),
            }
          );
        } catch (notifError) {
          console.error('Error sending notification:', notifError);
        }
      }

      onClose();
    } catch (error) {
      console.error('Error saving invoice:', error);
      alert('Error saving invoice');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {invoice ? 'Edit Invoice' : 'New Invoice'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invoice Number *
              </label>
              <input
                type="text"
                value={formData.invoice_number}
                onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Trip
            </label>
            <select
              value={formData.trip_id}
              onChange={(e) => {
                const selectedTrip = trips.find((t) => t.id === e.target.value);
                setFormData({
                  ...formData,
                  trip_id: e.target.value,
                  patient_id: selectedTrip?.patient_id || formData.patient_id,
                });
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a trip</option>
              {trips.map((trip) => (
                <option key={trip.id} value={trip.id}>
                  {new Date(trip.scheduled_pickup_time).toLocaleDateString()} -{' '}
                  {trip.patient?.full_name} - {trip.pickup_address}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Patient *
            </label>
            <select
              value={formData.patient_id}
              onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select a patient</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.full_name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Method
              </label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select method</option>
                <option value="cash">Cash</option>
                <option value="check">Check</option>
                <option value="credit_card">Credit Card</option>
                <option value="cash_app">Cash App</option>
                <option value="apple_pay">Apple Pay</option>
                <option value="zelle">Zelle</option>
                <option value="paypal">PayPal</option>
                <option value="insurance">Insurance</option>
                <option value="medicaid">Medicaid</option>
                <option value="medicare">Medicare</option>
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Billing Date *
              </label>
              <input
                type="date"
                value={formData.billing_date}
                onChange={(e) => setFormData({ ...formData, billing_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Due Date
              </label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Paid Date
              </label>
              <input
                type="date"
                value={formData.paid_date}
                onChange={(e) => setFormData({ ...formData, paid_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              {loading ? 'Saving...' : 'Save Invoice'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}