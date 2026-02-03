import React, { useState } from 'react';
import { Download, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import DateRangePicker from './DateRangePicker';

interface TripExportProps {
  onClose: () => void;
}

export default function TripExport({ onClose }: TripExportProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [exporting, setExporting] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  const parseAddress = (address: string) => {
    if (!address) return { address: '', city: '', state: '', zip: '' };

    const parts = address.split(',').map(p => p.trim());

    if (parts.length >= 3) {
      const lastPart = parts[parts.length - 1];
      const stateZip = lastPart.match(/([A-Z]{2})\s+(\d{5}(?:-\d{4})?)/);

      if (stateZip) {
        return {
          address: parts.slice(0, -2).join(', '),
          city: parts[parts.length - 2],
          state: stateZip[1],
          zip: stateZip[2]
        };
      }
    }

    return {
      address: parts[0] || '',
      city: parts[1] || '',
      state: parts[2] || '',
      zip: ''
    };
  };

  const escapeCSV = (value: any): string => {
    if (value === null || value === undefined) return '';
    const stringValue = String(value);
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  const exportTrips = async () => {
    if (!startDate || !endDate) {
      alert('Please select both start and end dates');
      return;
    }

    setExporting(true);

    try {
      let query = supabase
        .from('trips')
        .select(`
          *,
          patient:patients(first_name, last_name, phone),
          driver:profiles!trips_driver_id_fkey(first_name, last_name, phone)
        `)
        .gte('scheduled_pickup_time', startDate)
        .lte('scheduled_pickup_time', endDate + 'T23:59:59')
        .order('scheduled_pickup_time', { ascending: true });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data: trips, error } = await query;

      if (error) throw error;

      if (!trips || trips.length === 0) {
        alert('No trips found for the selected date range');
        setExporting(false);
        return;
      }

      const headers = [
        'Bolt Trip ID',
        'Confirmed Driver Name',
        'Confirmed Driver Phone',
        'Pick Up Address',
        'Pick Up City',
        'Pick Up State',
        'Pick Up Zip',
        'Pick Up Notes',
        'Pick Up Date/Time',
        'Drop Off Address',
        'Drop Off City',
        'Drop Off State',
        'Drop Off Zip',
        'Service Level',
        'Trip Miles',
        'Status',
        'Passenger Name',
        'Passenger Count',
        'Pay Amount',
        'Passenger Phone',
        'Cash Fare Amount'
      ];

      const csvRows = [headers.join(',')];

      trips.forEach((trip: any) => {
        const pickupParsed = parseAddress(trip.pickup_address || '');
        const dropoffParsed = parseAddress(trip.dropoff_address || '');

        const driverName = trip.driver
          ? `${trip.driver.first_name || ''} ${trip.driver.last_name || ''}`.trim()
          : '';

        const passengerName = trip.patient
          ? `${trip.patient.first_name || ''} ${trip.patient.last_name || ''}`.trim()
          : '';

        const row = [
          escapeCSV(trip.trip_number || trip.id),
          escapeCSV(driverName),
          escapeCSV(trip.driver?.phone || ''),
          escapeCSV(pickupParsed.address),
          escapeCSV(pickupParsed.city),
          escapeCSV(pickupParsed.state),
          escapeCSV(pickupParsed.zip),
          escapeCSV(trip.pickup_notes || ''),
          escapeCSV(trip.scheduled_pickup_time ? new Date(trip.scheduled_pickup_time).toLocaleString() : ''),
          escapeCSV(dropoffParsed.address),
          escapeCSV(dropoffParsed.city),
          escapeCSV(dropoffParsed.state),
          escapeCSV(dropoffParsed.zip),
          escapeCSV(trip.space_type || trip.trip_type || ''),
          escapeCSV(trip.total_miles || trip.distance || '0'),
          escapeCSV(trip.status || ''),
          escapeCSV(passengerName),
          escapeCSV(trip.passenger_count || '1'),
          escapeCSV(trip.broker_service_rate || trip.fare_amount || '0'),
          escapeCSV(trip.patient?.phone || ''),
          escapeCSV(trip.cash_fare_amount || '0')
        ];

        csvRows.push(row.join(','));
      });

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `trips_export_${startDate}_to_${endDate}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      alert(`Successfully exported ${trips.length} trips`);
      onClose();
    } catch (error: any) {
      console.error('Export error:', error);
      alert(`Export failed: ${error.message}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Export Trips to CSV</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <Download className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
              <div>
                <p className="text-sm text-blue-800">
                  Export trips data including driver info, addresses, passenger details, and fare amounts.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status Filter
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            label="Export Date Range"
          />
        </div>

        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900"
            disabled={exporting}
          >
            Cancel
          </button>
          <button
            onClick={exportTrips}
            disabled={exporting || !startDate || !endDate}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
          >
            {exporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
