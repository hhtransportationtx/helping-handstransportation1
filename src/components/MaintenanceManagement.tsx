import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, X, Car, DollarSign, Fuel, TrendingUp, Calendar, FileText } from 'lucide-react';

interface Vehicle {
  id: string;
  vehicle_number: string;
  make: string;
  model: string;
  year: number;
  license_plate: string;
}

interface MaintenanceRecord {
  id: string;
  vehicle_id: string;
  maintenance_type: string;
  description: string;
  cost: number;
  odometer_reading: number;
  service_date: string;
  next_service_date: string | null;
  next_service_odometer: number | null;
  vendor_name: string;
  invoice_number: string | null;
  notes: string | null;
  vehicle?: Vehicle;
}

interface ExpenseRecord {
  id: string;
  vehicle_id: string;
  expense_type: string;
  description: string;
  amount: number;
  expense_date: string;
  vendor_name: string | null;
  receipt_url: string | null;
  notes: string | null;
  vehicle?: Vehicle;
}

interface FuelRecord {
  id: string;
  vehicle_id: string;
  gallons: number;
  cost_per_gallon: number;
  total_cost: number;
  odometer_reading: number;
  fuel_date: string;
  location: string | null;
  fuel_type: string;
  notes: string | null;
  vehicle?: Vehicle;
}

type TabType = 'maintenance' | 'expenses' | 'fuel' | 'statistics';

export function MaintenanceManagement() {
  const [activeTab, setActiveTab] = useState<TabType>('maintenance');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [expenseRecords, setExpenseRecords] = useState<ExpenseRecord[]>([]);
  const [fuelRecords, setFuelRecords] = useState<FuelRecord[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      loadVehicles(),
      loadMaintenanceRecords(),
      loadExpenseRecords(),
      loadFuelRecords()
    ]);
    setLoading(false);
  };

  const loadVehicles = async () => {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .order('vehicle_number');

    if (!error && data) setVehicles(data);
  };

  const loadMaintenanceRecords = async () => {
    const { data, error } = await supabase
      .from('vehicle_maintenance')
      .select('*, vehicle:vehicles(*)')
      .order('service_date', { ascending: false });

    if (!error && data) setMaintenanceRecords(data);
  };

  const loadExpenseRecords = async () => {
    const { data, error } = await supabase
      .from('vehicle_expenses')
      .select('*, vehicle:vehicles(*)')
      .order('expense_date', { ascending: false });

    if (!error && data) setExpenseRecords(data);
  };

  const loadFuelRecords = async () => {
    const { data, error } = await supabase
      .from('fuel_records')
      .select('*, vehicle:vehicles(*)')
      .order('fuel_date', { ascending: false });

    if (!error && data) setFuelRecords(data);
  };

  const filteredMaintenanceRecords = selectedVehicle === 'all'
    ? maintenanceRecords
    : maintenanceRecords.filter(r => r.vehicle_id === selectedVehicle);

  const filteredExpenseRecords = selectedVehicle === 'all'
    ? expenseRecords
    : expenseRecords.filter(r => r.vehicle_id === selectedVehicle);

  const filteredFuelRecords = selectedVehicle === 'all'
    ? fuelRecords
    : fuelRecords.filter(r => r.vehicle_id === selectedVehicle);

  const totalMaintenanceCost = filteredMaintenanceRecords.reduce((sum, r) => sum + Number(r.cost), 0);
  const totalExpenses = filteredExpenseRecords.reduce((sum, r) => sum + Number(r.amount), 0);
  const totalFuelCost = filteredFuelRecords.reduce((sum, r) => sum + Number(r.total_cost), 0);
  const totalGallons = filteredFuelRecords.reduce((sum, r) => sum + Number(r.gallons), 0);

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Fleet Maintenance</h1>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Record
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1">
            <select
              value={selectedVehicle}
              onChange={(e) => setSelectedVehicle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Vehicles</option>
              {vehicles.map(vehicle => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.vehicle_number} - {vehicle.make} {vehicle.model} ({vehicle.license_plate})
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('maintenance')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                activeTab === 'maintenance'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Maintenance
            </button>
            <button
              onClick={() => setActiveTab('expenses')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                activeTab === 'expenses'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Expenses
            </button>
            <button
              onClick={() => setActiveTab('fuel')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                activeTab === 'fuel'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Fuel
            </button>
            <button
              onClick={() => setActiveTab('statistics')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                activeTab === 'statistics'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Statistics
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Car className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">Total Maintenance</p>
            <p className="text-2xl font-bold text-gray-900">${totalMaintenanceCost.toFixed(2)}</p>
            <p className="text-xs text-gray-500 mt-1">{filteredMaintenanceRecords.length} records</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">Total Expenses</p>
            <p className="text-2xl font-bold text-gray-900">${totalExpenses.toFixed(2)}</p>
            <p className="text-xs text-gray-500 mt-1">{filteredExpenseRecords.length} records</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Fuel className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">Total Fuel Cost</p>
            <p className="text-2xl font-bold text-gray-900">${totalFuelCost.toFixed(2)}</p>
            <p className="text-xs text-gray-500 mt-1">{totalGallons.toFixed(1)} gallons</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">Total Costs</p>
            <p className="text-2xl font-bold text-gray-900">
              ${(totalMaintenanceCost + totalExpenses + totalFuelCost).toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 mt-1">All categories</p>
          </div>
        </div>

        {activeTab === 'statistics' ? (
          <StatisticsView
            vehicles={vehicles}
            maintenanceRecords={maintenanceRecords}
            expenseRecords={expenseRecords}
            fuelRecords={fuelRecords}
          />
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {activeTab === 'maintenance' && (
              <MaintenanceTable records={filteredMaintenanceRecords} onRefresh={loadMaintenanceRecords} />
            )}
            {activeTab === 'expenses' && (
              <ExpensesTable records={filteredExpenseRecords} onRefresh={loadExpenseRecords} />
            )}
            {activeTab === 'fuel' && (
              <FuelTable records={filteredFuelRecords} onRefresh={loadFuelRecords} />
            )}
          </div>
        )}
      </div>

      {showModal && (
        <AddRecordModal
          type={activeTab}
          vehicles={vehicles}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

function MaintenanceTable({ records, onRefresh }: { records: MaintenanceRecord[]; onRefresh: () => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Odometer</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {records.map((record) => (
            <tr key={record.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {new Date(record.service_date).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {record.vehicle?.vehicle_number}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                  {record.maintenance_type}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-gray-900">{record.description}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.vendor_name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {record.odometer_reading.toLocaleString()} mi
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                ${record.cost.toFixed(2)}
              </td>
            </tr>
          ))}
          {records.length === 0 && (
            <tr>
              <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                No maintenance records found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ExpensesTable({ records, onRefresh }: { records: ExpenseRecord[]; onRefresh: () => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {records.map((record) => (
            <tr key={record.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {new Date(record.expense_date).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {record.vehicle?.vehicle_number}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                  {record.expense_type}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-gray-900">{record.description}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.vendor_name || '-'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                ${record.amount.toFixed(2)}
              </td>
            </tr>
          ))}
          {records.length === 0 && (
            <tr>
              <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                No expense records found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function FuelTable({ records, onRefresh }: { records: FuelRecord[]; onRefresh: () => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gallons</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price/Gal</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Odometer</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Cost</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {records.map((record) => (
            <tr key={record.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {new Date(record.fuel_date).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {record.vehicle?.vehicle_number}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full capitalize">
                  {record.fuel_type}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {record.gallons.toFixed(2)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${record.cost_per_gallon.toFixed(3)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {record.odometer_reading.toLocaleString()} mi
              </td>
              <td className="px-6 py-4 text-sm text-gray-900">{record.location || '-'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                ${record.total_cost.toFixed(2)}
              </td>
            </tr>
          ))}
          {records.length === 0 && (
            <tr>
              <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                No fuel records found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function AddRecordModal({
  type,
  vehicles,
  onClose,
  onSuccess
}: {
  type: TabType;
  vehicles: Vehicle[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState<any>({
    vehicle_id: vehicles[0]?.id || '',
    date: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (type === 'maintenance') {
        await supabase.from('vehicle_maintenance').insert({
          ...formData,
          service_date: formData.date,
          created_by: user.id
        });
      } else if (type === 'expenses') {
        await supabase.from('vehicle_expenses').insert({
          ...formData,
          expense_date: formData.date,
          created_by: user.id
        });
      } else {
        await supabase.from('fuel_records').insert({
          ...formData,
          fuel_date: formData.date,
          total_cost: Number(formData.gallons) * Number(formData.cost_per_gallon),
          created_by: user.id
        });
      }

      onSuccess();
    } catch (error) {
      console.error('Error adding record:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            Add {type === 'maintenance' ? 'Maintenance' : type === 'expenses' ? 'Expense' : 'Fuel'} Record
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle</label>
            <select
              value={formData.vehicle_id}
              onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              {vehicles.map(vehicle => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.vehicle_number} - {vehicle.make} {vehicle.model}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {type === 'maintenance' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Maintenance Type</label>
                <select
                  value={formData.maintenance_type || ''}
                  onChange={(e) => setFormData({ ...formData, maintenance_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select type</option>
                  <option value="oil_change">Oil Change</option>
                  <option value="tire_rotation">Tire Rotation</option>
                  <option value="brake_service">Brake Service</option>
                  <option value="inspection">Inspection</option>
                  <option value="transmission">Transmission Service</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={2}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Odometer Reading</label>
                  <input
                    type="number"
                    value={formData.odometer_reading || ''}
                    onChange={(e) => setFormData({ ...formData, odometer_reading: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.cost || ''}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name</label>
                <input
                  type="text"
                  value={formData.vendor_name || ''}
                  onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number (Optional)</label>
                <input
                  type="text"
                  value={formData.invoice_number || ''}
                  onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </>
          )}

          {type === 'expenses' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expense Type</label>
                <select
                  value={formData.expense_type || ''}
                  onChange={(e) => setFormData({ ...formData, expense_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select type</option>
                  <option value="insurance">Insurance</option>
                  <option value="registration">Registration</option>
                  <option value="parking">Parking</option>
                  <option value="tolls">Tolls</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={2}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount || ''}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name (Optional)</label>
                <input
                  type="text"
                  value={formData.vendor_name || ''}
                  onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </>
          )}

          {type === 'fuel' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fuel Type</label>
                <select
                  value={formData.fuel_type || 'regular'}
                  onChange={(e) => setFormData({ ...formData, fuel_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="regular">Regular</option>
                  <option value="premium">Premium</option>
                  <option value="diesel">Diesel</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gallons</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.gallons || ''}
                    onChange={(e) => setFormData({ ...formData, gallons: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost per Gallon</label>
                  <input
                    type="number"
                    step="0.001"
                    value={formData.cost_per_gallon || ''}
                    onChange={(e) => setFormData({ ...formData, cost_per_gallon: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Odometer Reading</label>
                <input
                  type="number"
                  value={formData.odometer_reading || ''}
                  onChange={(e) => setFormData({ ...formData, odometer_reading: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location (Optional)</label>
                <input
                  type="text"
                  value={formData.location || ''}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Gas station name or address"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface StatisticsViewProps {
  vehicles: Vehicle[];
  maintenanceRecords: MaintenanceRecord[];
  expenseRecords: ExpenseRecord[];
  fuelRecords: FuelRecord[];
}

function StatisticsView({ vehicles, maintenanceRecords, expenseRecords, fuelRecords }: StatisticsViewProps) {
  const [drivers, setDrivers] = useState<any[]>([]);

  useEffect(() => {
    loadDrivers();
  }, []);

  const loadDrivers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'driver');

    if (!error && data) setDrivers(data);
  };

  const vehicleStats = vehicles.map((vehicle) => {
    const vehicleMaintenance = maintenanceRecords.filter((r) => r.vehicle_id === vehicle.id);
    const vehicleExpenses = expenseRecords.filter((r) => r.vehicle_id === vehicle.id);
    const vehicleFuel = fuelRecords.filter((r) => r.vehicle_id === vehicle.id);

    const totalMaintenance = vehicleMaintenance.reduce((sum, r) => sum + (r.cost || 0), 0);
    const totalExpenses = vehicleExpenses.reduce((sum, r) => sum + (r.amount || 0), 0);
    const totalFuel = vehicleFuel.reduce((sum, r) => sum + (r.total_cost || 0), 0);
    const gasolineCost = totalFuel;
    const servicesCost = totalMaintenance;
    const expensesCost = totalExpenses;
    const maintenanceCost = totalMaintenance + totalExpenses + totalFuel;

    const driver = drivers.find((d) => d.id === (vehicle as any).driver_id);

    return {
      vehicle,
      totalMaintenances: vehicleMaintenance.length,
      gasolineCost,
      servicesCost,
      expensesCost,
      maintenanceCost,
      driver,
    };
  });

  const totalExpenseCost = vehicleStats.reduce((sum, s) => sum + s.expensesCost, 0);
  const totalGasolineCost = vehicleStats.reduce((sum, s) => sum + s.gasolineCost, 0);
  const totalServiceCost = vehicleStats.reduce((sum, s) => sum + s.servicesCost, 0);
  const totalMaintenancesCount = vehicleStats.reduce((sum, s) => sum + s.totalMaintenances, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Total Expense Cost</p>
          <p className="text-2xl font-bold text-blue-600">$ {totalExpenseCost.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Total Gasoline Cost</p>
          <p className="text-2xl font-bold text-green-600">$ {totalGasolineCost.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Total Service Cost</p>
          <p className="text-2xl font-bold text-red-600">$ {totalServiceCost.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Maintenances Count</p>
          <p className="text-2xl font-bold text-gray-900">$ {totalMaintenancesCount.toFixed(2)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vehicleStats.map((stat) => (
          <div key={stat.vehicle.id} className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200">
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                <Car className="w-6 h-6 text-gray-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500">
                    {stat.vehicle.vehicle_number}
                  </span>
                  {stat.driver && (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-blue-600">
                          {stat.driver.full_name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-blue-600">{stat.driver.full_name}</p>
                        <p className="text-xs text-gray-500">{stat.driver.email}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <h3 className="font-medium text-gray-900 mb-4">Maintenance Information</h3>

            <div className="space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Total Maintenances</span>
                <span className="text-sm font-medium text-gray-900">{stat.totalMaintenances}</span>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Gasoline</span>
                <span className="text-sm font-medium text-gray-900">$ {stat.gasolineCost.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Services</span>
                <span className="text-sm font-medium text-gray-900">$ {stat.servicesCost.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Expenses</span>
                <span className="text-sm font-medium text-gray-900">$ {stat.expensesCost.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-sm font-medium text-gray-900">Maintenance Cost</span>
                <span className="text-sm font-bold text-gray-900">$ {stat.maintenanceCost.toFixed(2)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}