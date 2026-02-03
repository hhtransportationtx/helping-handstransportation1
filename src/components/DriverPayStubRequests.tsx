import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { FileText, Calendar, Send, Clock, CheckCircle, XCircle } from 'lucide-react';

interface PayStubRequest {
  id: string;
  period_start: string;
  period_end: string;
  request_notes: string | null;
  status: 'pending' | 'fulfilled' | 'rejected';
  fulfilled_at: string | null;
  admin_notes: string | null;
  created_at: string;
}

export function DriverPayStubRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<PayStubRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [requestNotes, setRequestNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [companyId, setCompanyId] = useState<string>('');

  useEffect(() => {
    if (user) {
      loadCompanyId();
      loadRequests();
    }
  }, [user]);

  async function loadCompanyId() {
    const { data } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user?.id)
      .maybeSingle();

    if (data?.company_id) {
      setCompanyId(data.company_id);
    }
  }

  async function loadRequests() {
    setLoading(true);
    const { data } = await supabase
      .from('paystub_requests')
      .select('*')
      .eq('driver_id', user?.id)
      .order('created_at', { ascending: false });

    if (data) {
      setRequests(data);
    }
    setLoading(false);
  }

  async function handleSubmitRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !companyId) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('paystub_requests')
        .insert({
          driver_id: user.id,
          company_id: companyId,
          period_start: periodStart,
          period_end: periodEnd,
          request_notes: requestNotes || null,
          status: 'pending',
        });

      if (error) throw error;

      alert('Pay stub request submitted successfully!');
      setShowRequestForm(false);
      setPeriodStart('');
      setPeriodEnd('');
      setRequestNotes('');
      loadRequests();
    } catch (error) {
      console.error('Error submitting request:', error);
      alert('Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'fulfilled':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-600" />;
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'fulfilled':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="w-7 h-7" />
          Request Pay Stubs
        </h1>
        {!showRequestForm && (
          <button
            onClick={() => setShowRequestForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            New Request
          </button>
        )}
      </div>

      {showRequestForm && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Request a Pay Stub</h2>
            <button
              onClick={() => setShowRequestForm(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmitRequest} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pay Period Start
                </label>
                <input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pay Period End
                </label>
                <input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (Optional)
              </label>
              <textarea
                value={requestNotes}
                onChange={(e) => setRequestNotes(e.target.value)}
                rows={3}
                placeholder="Any additional details about your request..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowRequestForm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit Request
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {requests.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No pay stub requests yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Request a pay stub for a specific pay period using the button above
            </p>
          </div>
        ) : (
          requests.map((request) => (
            <div key={request.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-600" />
                  <div>
                    <div className="font-semibold text-gray-900">
                      {new Date(request.period_start).toLocaleDateString()} -{' '}
                      {new Date(request.period_end).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-gray-500">
                      Requested {new Date(request.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(request.status)}
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                      request.status
                    )}`}
                  >
                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                  </span>
                </div>
              </div>

              {request.request_notes && (
                <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs font-medium text-gray-600 mb-1">Your Notes:</div>
                  <div className="text-sm text-gray-700">{request.request_notes}</div>
                </div>
              )}

              {request.admin_notes && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-xs font-medium text-blue-600 mb-1">Admin Response:</div>
                  <div className="text-sm text-gray-700">{request.admin_notes}</div>
                </div>
              )}

              {request.fulfilled_at && (
                <div className="mt-3 text-sm text-gray-500">
                  {request.status === 'fulfilled' ? 'Fulfilled' : 'Responded'} on{' '}
                  {new Date(request.fulfilled_at).toLocaleDateString()}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
