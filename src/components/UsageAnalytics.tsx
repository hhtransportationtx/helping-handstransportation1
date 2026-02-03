import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { BarChart3, TrendingUp, Calendar, AlertCircle } from 'lucide-react';

interface UsageData {
  month: string;
  trips_count: number;
  active_drivers: number;
  active_vehicles: number;
  total_miles: number;
}

interface PlanLimits {
  max_drivers: number | null;
  max_vehicles: number | null;
  max_trips_per_month: number | null;
}

export default function UsageAnalytics() {
  const { profile } = useAuth();
  const [usageData, setUsageData] = useState<UsageData[]>([]);
  const [currentUsage, setCurrentUsage] = useState<UsageData | null>(null);
  const [planLimits, setPlanLimits] = useState<PlanLimits | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.company_id) {
      loadUsageData();
      loadPlanLimits();
    }
  }, [profile]);

  const loadUsageData = async () => {
    if (!profile?.company_id) return;

    try {
      const { data, error } = await supabase
        .from('company_usage')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('month', { ascending: false })
        .limit(6);

      if (error) throw error;

      setUsageData(data || []);
      if (data && data.length > 0) {
        setCurrentUsage(data[0]);
      }
    } catch (error) {
      console.error('Error loading usage data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPlanLimits = async () => {
    if (!profile?.company_id) return;

    try {
      const { data, error } = await supabase
        .from('company_subscriptions')
        .select('plan:subscription_plans(max_drivers, max_vehicles, max_trips_per_month)')
        .eq('company_id', profile.company_id)
        .single();

      if (error) throw error;

      if (data && data.plan) {
        setPlanLimits(data.plan as PlanLimits);
      }
    } catch (error) {
      console.error('Error loading plan limits:', error);
    }
  };

  const getUsagePercentage = (current: number, limit: number | null) => {
    if (!limit) return 0;
    return Math.min((current / limit) * 100, 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600 bg-red-100';
    if (percentage >= 75) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading usage data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Usage Analytics</h2>
        <p className="text-gray-600 mt-1">Track your company's platform usage</p>
      </div>

      {currentUsage && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Trips This Month</p>
                <BarChart3 className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{currentUsage.trips_count}</p>
              {planLimits?.max_trips_per_month && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-500">
                      of {planLimits.max_trips_per_month}
                    </span>
                    <span className={`font-medium ${
                      getUsagePercentage(currentUsage.trips_count, planLimits.max_trips_per_month) >= 90
                        ? 'text-red-600'
                        : 'text-gray-600'
                    }`}>
                      {Math.round(getUsagePercentage(currentUsage.trips_count, planLimits.max_trips_per_month))}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        getUsagePercentage(currentUsage.trips_count, planLimits.max_trips_per_month) >= 90
                          ? 'bg-red-600'
                          : getUsagePercentage(currentUsage.trips_count, planLimits.max_trips_per_month) >= 75
                          ? 'bg-yellow-500'
                          : 'bg-green-600'
                      }`}
                      style={{
                        width: `${getUsagePercentage(currentUsage.trips_count, planLimits.max_trips_per_month)}%`
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Active Drivers</p>
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{currentUsage.active_drivers}</p>
              {planLimits?.max_drivers && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-500">
                      of {planLimits.max_drivers}
                    </span>
                    <span className={`font-medium ${
                      getUsagePercentage(currentUsage.active_drivers, planLimits.max_drivers) >= 90
                        ? 'text-red-600'
                        : 'text-gray-600'
                    }`}>
                      {Math.round(getUsagePercentage(currentUsage.active_drivers, planLimits.max_drivers))}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        getUsagePercentage(currentUsage.active_drivers, planLimits.max_drivers) >= 90
                          ? 'bg-red-600'
                          : getUsagePercentage(currentUsage.active_drivers, planLimits.max_drivers) >= 75
                          ? 'bg-yellow-500'
                          : 'bg-green-600'
                      }`}
                      style={{
                        width: `${getUsagePercentage(currentUsage.active_drivers, planLimits.max_drivers)}%`
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Active Vehicles</p>
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{currentUsage.active_vehicles}</p>
              {planLimits?.max_vehicles && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-500">
                      of {planLimits.max_vehicles}
                    </span>
                    <span className={`font-medium ${
                      getUsagePercentage(currentUsage.active_vehicles, planLimits.max_vehicles) >= 90
                        ? 'text-red-600'
                        : 'text-gray-600'
                    }`}>
                      {Math.round(getUsagePercentage(currentUsage.active_vehicles, planLimits.max_vehicles))}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        getUsagePercentage(currentUsage.active_vehicles, planLimits.max_vehicles) >= 90
                          ? 'bg-red-600'
                          : getUsagePercentage(currentUsage.active_vehicles, planLimits.max_vehicles) >= 75
                          ? 'bg-yellow-500'
                          : 'bg-green-600'
                      }`}
                      style={{
                        width: `${getUsagePercentage(currentUsage.active_vehicles, planLimits.max_vehicles)}%`
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Total Miles</p>
                <Calendar className="w-5 h-5 text-orange-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {currentUsage.total_miles.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-2">This month</p>
            </div>
          </div>

          {planLimits && (
            getUsagePercentage(currentUsage.trips_count, planLimits.max_trips_per_month) >= 90 ||
            getUsagePercentage(currentUsage.active_drivers, planLimits.max_drivers) >= 90 ||
            getUsagePercentage(currentUsage.active_vehicles, planLimits.max_vehicles) >= 90
          ) && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900">Approaching Plan Limits</h3>
                <p className="text-sm text-red-700 mt-1">
                  You're approaching your plan limits. Consider upgrading to avoid service interruption.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Usage History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trips</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Drivers</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicles</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Miles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {usageData.map((usage) => (
                <tr key={usage.month} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {new Date(usage.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{usage.trips_count}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{usage.active_drivers}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{usage.active_vehicles}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{usage.total_miles.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {usageData.length === 0 && (
          <div className="text-center py-12">
            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No usage data available yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
