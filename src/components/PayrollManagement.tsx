import { useState, useEffect } from 'react';
import { supabase, Profile } from '../lib/supabase';
import { DollarSign, Download, Clock, TrendingUp, Users, FileText } from 'lucide-react';
import { DriverPayStubs } from './DriverPayStubs';
import DateRangePicker from './DateRangePicker';

interface PayRate {
  id: string;
  driver_id: string;
  hourly_rate: number;
  wheelchair_bonus: number;
  mileage_rate: number;
  effective_date: string;
}

interface PayrollPeriod {
  id: string;
  start_date: string;
  end_date: string;
  status: string;
  total_amount: number;
  processed_at: string | null;
}

interface PayrollEntry {
  id: string;
  payroll_period_id: string;
  driver_id: string;
  driver_name: string;
  total_trips: number;
  active_hours: number;
  total_miles: number;
  wheelchair_hours: number;
  ambulatory_hours: number;
  hourly_pay: number;
  mileage_pay: number;
  bonus_pay: number;
  total_pay: number;
}

export function PayrollManagement() {
  const [drivers, setDrivers] = useState<Profile[]>([]);
  const [payRates, setPayRates] = useState<PayRate[]>([]);
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriod | null>(null);
  const [entries, setEntries] = useState<PayrollEntry[]>([]);
  const [processing, setProcessing] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [editingRate, setEditingRate] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'payroll' | 'paystubs'>('payroll');

  useEffect(() => {
    loadDrivers();
    loadPayRates();
    loadPeriods();
  }, []);

  useEffect(() => {
    if (selectedPeriod) {
      loadPayrollEntries(selectedPeriod.id);
    }
  }, [selectedPeriod]);

  async function loadDrivers() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'driver')
      .order('full_name');

    if (data) setDrivers(data);
  }

  async function loadPayRates() {
    const { data } = await supabase
      .from('driver_pay_rates')
      .select('*')
      .order('effective_date', { ascending: false });

    if (data) setPayRates(data);
  }

  async function loadPeriods() {
    const { data } = await supabase
      .from('payroll_periods')
      .select('*')
      .order('start_date', { ascending: false });

    if (data) setPeriods(data);
  }

  async function loadPayrollEntries(periodId: string) {
    const { data } = await supabase
      .from('payroll_entries')
      .select(`
        *,
        profiles!payroll_entries_driver_id_fkey(full_name)
      `)
      .eq('payroll_period_id', periodId);

    if (data) {
      const formatted = data.map((entry: any) => ({
        ...entry,
        driver_name: entry.profiles?.full_name || 'Unknown',
      }));
      setEntries(formatted);
    }
  }

  async function updatePayRate(driverId: string, field: string, value: number) {
    const existingRate = payRates.find(r => r.driver_id === driverId);

    if (existingRate) {
      await supabase
        .from('driver_pay_rates')
        .update({
          [field]: value,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingRate.id);
    } else {
      await supabase
        .from('driver_pay_rates')
        .insert({
          driver_id: driverId,
          [field]: value,
        });
    }

    await loadPayRates();
  }

  async function calculatePayroll() {
    if (!startDate || !endDate) {
      alert('Please select start and end dates');
      return;
    }

    setProcessing(true);

    try {
      const { data: period } = await supabase
        .from('payroll_periods')
        .insert({
          start_date: startDate,
          end_date: endDate,
          status: 'draft',
        })
        .select()
        .single();

      if (!period) throw new Error('Failed to create payroll period');

      const { data: trips } = await supabase
        .from('trips')
        .select('*')
        .eq('status', 'completed')
        .gte('actual_pickup_time', startDate)
        .lte('actual_dropoff_time', endDate)
        .not('driver_id', 'is', null)
        .not('actual_pickup_time', 'is', null)
        .not('actual_dropoff_time', 'is', null);

      if (!trips || trips.length === 0) {
        alert('No completed trips found for this period');
        setProcessing(false);
        return;
      }

      const driverStats = new Map<string, {
        trips: number;
        activeMinutes: number;
        miles: number;
        wheelchairMinutes: number;
        ambulatoryMinutes: number;
      }>();

      trips.forEach((trip: any) => {
        const pickupTime = new Date(trip.actual_pickup_time);
        const dropoffTime = new Date(trip.actual_dropoff_time);
        const activeMinutes = (dropoffTime.getTime() - pickupTime.getTime()) / 1000 / 60;

        const stats = driverStats.get(trip.driver_id) || {
          trips: 0,
          activeMinutes: 0,
          miles: 0,
          wheelchairMinutes: 0,
          ambulatoryMinutes: 0,
        };

        stats.trips += 1;
        stats.activeMinutes += activeMinutes;
        stats.miles += trip.distance_miles || 0;

        if (trip.space_type === 'wheelchair') {
          stats.wheelchairMinutes += activeMinutes;
        } else {
          stats.ambulatoryMinutes += activeMinutes;
        }

        driverStats.set(trip.driver_id, stats);
      });

      let totalPeriodAmount = 0;

      for (const [driverId, stats] of driverStats) {
        const rate = payRates.find(r => r.driver_id === driverId);
        const hourlyRate = rate?.hourly_rate || 10.50;

        const activeHours = stats.activeMinutes / 60;
        const wheelchairHours = stats.wheelchairMinutes / 60;
        const ambulatoryHours = stats.ambulatoryMinutes / 60;

        const hourlyPay = activeHours * hourlyRate;
        const bonusPay = 0;
        const mileagePay = 0;
        const totalPay = hourlyPay;

        totalPeriodAmount += totalPay;

        await supabase
          .from('payroll_entries')
          .insert({
            payroll_period_id: period.id,
            driver_id: driverId,
            total_trips: stats.trips,
            active_hours: activeHours,
            total_miles: stats.miles,
            wheelchair_hours: wheelchairHours,
            ambulatory_hours: ambulatoryHours,
            hourly_pay: hourlyPay,
            mileage_pay: mileagePay,
            bonus_pay: bonusPay,
            total_pay: totalPay,
          });
      }

      await supabase
        .from('payroll_periods')
        .update({ total_amount: totalPeriodAmount })
        .eq('id', period.id);

      await loadPeriods();
      setSelectedPeriod(period);
    } catch (error) {
      console.error('Error calculating payroll:', error);
      alert('Failed to calculate payroll');
    } finally {
      setProcessing(false);
    }
  }

  function exportToCSV() {
    if (!selectedPeriod || entries.length === 0) return;

    const headers = [
      'Driver Name',
      'Total Trips',
      'Active Hours',
      'Total Miles',
      'WAV Hours',
      'AMB Hours',
      'Total Pay',
    ];

    const rows = entries.map(entry => [
      entry.driver_name,
      entry.total_trips,
      entry.active_hours.toFixed(2),
      entry.total_miles.toFixed(2),
      entry.wheelchair_hours.toFixed(2),
      entry.ambulatory_hours.toFixed(2),
      `$${entry.total_pay.toFixed(2)}`,
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll_${selectedPeriod.start_date}_${selectedPeriod.end_date}.csv`;
    a.click();
  }

  function setQuickPeriod(type: 'week' | 'biweek') {
    const today = new Date();
    const dayOfWeek = today.getDay();

    const lastWednesday = new Date(today);
    if (dayOfWeek === 3) {
      lastWednesday.setDate(today.getDate() - 7);
    } else if (dayOfWeek < 3) {
      lastWednesday.setDate(today.getDate() - (dayOfWeek + 4));
    } else {
      lastWednesday.setDate(today.getDate() - (dayOfWeek - 3));
    }

    const end = new Date(lastWednesday);
    const start = new Date(lastWednesday);

    if (type === 'week') {
      start.setDate(end.getDate() - 6);
    } else {
      start.setDate(end.getDate() - 13);
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  }

  const getDriverRate = (driverId: string) => {
    return payRates.find(r => r.driver_id === driverId);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payroll Management</h1>
        <p className="text-gray-600">Calculate driver pay based on active trip time only</p>
      </div>

      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('payroll')}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
            activeTab === 'payroll'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
          }`}
        >
          <DollarSign className="w-5 h-5" />
          Payroll Processing
        </button>
        <button
          onClick={() => setActiveTab('paystubs')}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
            activeTab === 'paystubs'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
          }`}
        >
          <FileText className="w-5 h-5" />
          Pay Stubs
        </button>
      </div>

      {activeTab === 'paystubs' ? (
        <DriverPayStubs />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">Active Drivers</p>
              <p className="text-2xl font-bold text-gray-900">{drivers.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-sm text-gray-600">Payroll Periods</p>
              <p className="text-2xl font-bold text-gray-900">{periods.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-sm text-gray-600">Selected Period Total</p>
              <p className="text-2xl font-bold text-gray-900">
                ${selectedPeriod?.total_amount?.toFixed(2) || '0.00'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Driver Pay Rates</h2>
          </div>
          <div className="p-6 overflow-auto max-h-96">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Driver</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Hourly Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {drivers.map((driver) => {
                  const rate = getDriverRate(driver.id);
                  const isEditing = editingRate === driver.id;

                  return (
                    <tr key={driver.id} onClick={() => setEditingRate(driver.id)} className="cursor-pointer hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{driver.full_name}</td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            defaultValue={rate?.hourly_rate || 10.50}
                            onBlur={(e) => updatePayRate(driver.id, 'hourly_rate', parseFloat(e.target.value))}
                            className="w-20 px-2 py-1 border border-gray-300 rounded"
                            autoFocus
                          />
                        ) : (
                          <span className="text-sm text-gray-900">${rate?.hourly_rate?.toFixed(2) || '10.50'}/hr</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Create Payroll Period</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setQuickPeriod('week')}
                  className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-sm"
                >
                  Last Week
                </button>
                <button
                  onClick={() => setQuickPeriod('biweek')}
                  className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-sm"
                >
                  Last 2 Weeks
                </button>
              </div>

              <DateRangePicker
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
                label="Payroll Period"
              />

              <button
                onClick={calculatePayroll}
                disabled={processing || !startDate || !endDate}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Clock className="w-5 h-5" />
                {processing ? 'Processing...' : 'Calculate Payroll'}
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent Periods</h3>
              <div className="space-y-2 max-h-48 overflow-auto">
                {periods.map((period) => (
                  <button
                    key={period.id}
                    onClick={() => setSelectedPeriod(period)}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                      selectedPeriod?.id === period.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(period.start_date).toLocaleDateString()} - {new Date(period.end_date).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-500 capitalize">{period.status}</p>
                      </div>
                      <p className="text-sm font-bold text-gray-900">${period.total_amount?.toFixed(2)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedPeriod && entries.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Payroll Details: {new Date(selectedPeriod.start_date).toLocaleDateString()} - {new Date(selectedPeriod.end_date).toLocaleDateString()}
              </h2>
              <p className="text-sm text-gray-600 mt-1">Active time only - downtime excluded</p>
            </div>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trips</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Active Hours</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Miles</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">WAV Hours</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">AMB Hours</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Pay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{entry.driver_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{entry.total_trips}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{entry.active_hours.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{entry.total_miles.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{entry.wheelchair_hours.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{entry.ambulatory_hours.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900">${entry.total_pay.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={6} className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Total:</td>
                  <td className="px-4 py-3 text-sm font-bold text-gray-900">${selectedPeriod.total_amount?.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
