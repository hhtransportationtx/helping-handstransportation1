import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MessageSquare, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';

interface SMSLog {
  id: string;
  phone_number: string;
  recipient_name: string;
  recipient_email: string;
  recipient_role: string;
  message_type: string;
  status: 'sent' | 'failed' | 'pending';
  twilio_sid: string | null;
  error_message: string | null;
  created_at: string;
}

export function SMSLogsViewer() {
  const [logs, setLogs] = useState<SMSLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'sent' | 'failed'>('all');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('sms_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;

      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching SMS logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filter]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = 'px-2 py-1 rounded-full text-xs font-medium';
    switch (status) {
      case 'sent':
        return <span className={`${baseClasses} bg-green-100 text-green-700`}>Sent</span>;
      case 'failed':
        return <span className={`${baseClasses} bg-red-100 text-red-700`}>Failed</span>;
      case 'pending':
        return <span className={`${baseClasses} bg-yellow-100 text-yellow-700`}>Pending</span>;
      default:
        return null;
    }
  };

  const stats = {
    total: logs.length,
    sent: logs.filter(log => log.status === 'sent').length,
    failed: logs.filter(log => log.status === 'failed').length,
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">SMS Delivery Logs</h2>
            <p className="text-sm text-gray-600 mt-1">Track all SMS notifications sent from the system</p>
          </div>
          <button
            onClick={fetchLogs}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Sent</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border-2 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Delivered</p>
                <p className="text-2xl font-bold text-green-600">{stats.sent}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border-2 border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Failed</p>
                <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md">
          <div className="p-4 border-b border-gray-200">
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('sent')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === 'sent'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Sent
              </button>
              <button
                onClick={() => setFilter('failed')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === 'failed'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Failed
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading logs...</div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No SMS logs found</div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recipient</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(log.status)}
                          {getStatusBadge(log.status)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium text-gray-900">{log.recipient_name}</div>
                          <div className="text-sm text-gray-500">{log.recipient_email}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{log.phone_number}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                          {log.recipient_role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 capitalize">{log.message_type}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {log.twilio_sid && (
                          <div className="text-xs text-gray-500 font-mono">{log.twilio_sid}</div>
                        )}
                        {log.error_message && (
                          <div className="text-xs text-red-600 max-w-xs truncate" title={log.error_message}>
                            {log.error_message}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
