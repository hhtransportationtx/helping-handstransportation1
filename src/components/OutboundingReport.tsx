import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Calendar, Database } from 'lucide-react';

interface OutboundMessage {
  id: string;
  message: string;
  from_number: string;
  to_number: string;
  status: string;
  error_message: string;
  sent_at: string;
  created_at: string;
}

export function OutboundingReport() {
  const [messages, setMessages] = useState<OutboundMessage[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<OutboundMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  useEffect(() => {
    loadMessages();

    const subscription = supabase
      .channel('outbound_messages_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'outbound_messages' },
        () => {
          loadMessages();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [selectedDate]);

  useEffect(() => {
    filterMessages();
  }, [messages, searchQuery]);

  async function loadMessages() {
    try {
      let query = supabase
        .from('outbound_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (selectedDate) {
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);

        query = query
          .gte('created_at', startOfDay.toISOString())
          .lte('created_at', endOfDay.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading outbound messages:', error);
    } finally {
      setLoading(false);
    }
  }

  function filterMessages() {
    let filtered = [...messages];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.message?.toLowerCase().includes(query) ||
          m.from_number?.toLowerCase().includes(query) ||
          m.to_number?.toLowerCase().includes(query) ||
          m.status?.toLowerCase().includes(query)
      );
    }

    setFilteredMessages(filtered);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading outbound messages...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-gray-50">
      <div className="p-6">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="relative ml-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 w-64"
            />
          </div>
        </div>

        {filteredMessages.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <Database className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg mb-2">No Data to show</p>
            <p className="text-gray-400 text-sm">
              No outbound messages found{selectedDate ? ' for the selected date' : ''}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Message
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    From
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Error
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Sent Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Created Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredMessages.map((message) => (
                  <tr key={message.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="max-w-xs truncate">{message.message}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {message.from_number || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {message.to_number}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {message.error_message || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`px-2 py-1 text-xs rounded font-medium ${
                          message.status === 'sent'
                            ? 'bg-green-100 text-green-700'
                            : message.status === 'failed'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {message.status.charAt(0).toUpperCase() + message.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {message.sent_at
                        ? new Date(message.sent_at).toLocaleString()
                        : 'Not sent'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(message.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
