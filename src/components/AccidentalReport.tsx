import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Download, FileText } from 'lucide-react';

interface AccidentReport {
  id: string;
  track_id: string;
  driver_id: string;
  trip_id: string;
  location: string;
  latitude: number;
  longitude: number;
  description: string;
  severity: string;
  status: string;
  reported_at: string;
  driver_name?: string;
}

export function AccidentalReport() {
  const [accidents, setAccidents] = useState<AccidentReport[]>([]);
  const [filteredAccidents, setFilteredAccidents] = useState<AccidentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadAccidents();

    const subscription = supabase
      .channel('accident_reports_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'accident_reports' },
        () => {
          loadAccidents();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    filterAccidents();
  }, [accidents, searchQuery]);

  async function loadAccidents() {
    try {
      const { data, error } = await supabase
        .from('accident_reports')
        .select(
          `
          *,
          driver:profiles!accident_reports_driver_id_fkey(full_name)
        `
        )
        .order('reported_at', { ascending: false });

      if (error) throw error;

      const formattedData = data?.map((a: any) => ({
        ...a,
        driver_name: a.driver?.full_name || 'Unknown Driver',
      }));

      setAccidents(formattedData || []);
    } catch (error) {
      console.error('Error loading accident reports:', error);
    } finally {
      setLoading(false);
    }
  }

  function filterAccidents() {
    let filtered = [...accidents];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.track_id.toLowerCase().includes(query) ||
          a.driver_name?.toLowerCase().includes(query) ||
          a.location?.toLowerCase().includes(query)
      );
    }

    setFilteredAccidents(filtered);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading accident reports...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-gray-50">
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-gray-600">Showing {filteredAccidents.length} entries</p>

          <div className="relative">
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

        {filteredAccidents.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <p className="text-gray-500">No accident reports found</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Track ID.
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Driver
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Severity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Report
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredAccidents.map((accident) => (
                  <tr key={accident.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {accident.track_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {accident.driver_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(accident.reported_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{accident.location}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`px-2 py-1 text-xs rounded font-medium ${
                          accident.severity === 'severe'
                            ? 'bg-red-100 text-red-700'
                            : accident.severity === 'moderate'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {accident.severity.charAt(0).toUpperCase() + accident.severity.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        <button className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 flex items-center gap-1">
                          <Download className="w-3 h-3" />
                          Modivcare
                        </button>
                        <button className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          Nemt
                        </button>
                      </div>
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
