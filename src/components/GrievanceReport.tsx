import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Package, FileText } from 'lucide-react';

interface Grievance {
  id: string;
  trip_id: string;
  driver_id: string;
  patient_id: string;
  type: string;
  description: string;
  status: string;
  reported_at: string;
  driver_name?: string;
  patient_name?: string;
}

export function GrievanceReport() {
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGrievances();

    const subscription = supabase
      .channel('grievances_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'grievances' },
        () => {
          loadGrievances();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function loadGrievances() {
    try {
      const { data, error } = await supabase
        .from('grievances')
        .select(
          `
          *,
          driver:profiles!grievances_driver_id_fkey(full_name),
          patient:patients!grievances_patient_id_fkey(full_name)
        `
        )
        .order('reported_at', { ascending: false });

      if (error) throw error;

      const formattedData = data?.map((g: any) => ({
        ...g,
        driver_name: g.driver?.full_name || 'N/A',
        patient_name: g.patient?.full_name || 'N/A',
      }));

      setGrievances(formattedData || []);
    } catch (error) {
      console.error('Error loading grievances:', error);
    } finally {
      setLoading(false);
    }
  }

  const itemLostCount = grievances.filter((g) => g.type === 'item_lost').length;
  const grievanceCount = grievances.filter((g) => g.type === 'grievance').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading grievances...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-gray-50">
      <div className="p-6">
        <div className="mb-6">
          <p className="text-sm text-gray-600">Showing {grievances.length} entries</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg p-8 border border-gray-200">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Item Lost</p>
                <p className="text-4xl font-bold text-gray-900">{itemLostCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-8 border border-gray-200">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-orange-100 rounded-lg flex items-center justify-center">
                <FileText className="w-8 h-8 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Grievance</p>
                <p className="text-4xl font-bold text-gray-900">{grievanceCount}</p>
              </div>
            </div>
          </div>
        </div>

        {grievances.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <p className="text-gray-500">No grievances or items lost reported</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Trip ID.
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Driver
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Report
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {grievances.map((grievance) => (
                  <tr key={grievance.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {grievance.trip_id ? grievance.trip_id.substring(0, 8) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {grievance.driver_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {grievance.patient_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(grievance.reported_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`px-2 py-1 text-xs rounded font-medium ${
                          grievance.type === 'item_lost'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-orange-100 text-orange-700'
                        }`}
                      >
                        {grievance.type === 'item_lost' ? 'Item Lost' : 'Grievance'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {grievance.description || 'No description'}
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
