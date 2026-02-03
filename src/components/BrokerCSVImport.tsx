import React, { useState } from 'react';
import { Upload, X, AlertCircle, CheckCircle2, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface BrokerCSVImportProps {
  onClose: () => void;
  onImportComplete: () => void;
}

interface BrokerTripRow {
  'Run To ID'?: string;
  'Bolt Trip ID'?: string;
  'Confirmed Driver Name'?: string;
  'Confirmed Driver Phone'?: string;
  'Pickup Address'?: string;
  'Pickup City'?: string;
  'Pickup State'?: string;
  'Pickup Zip'?: string;
  'Pickup Notes'?: string;
  'Pickup Time'?: string;
  'Shared Address'?: string;
  'Round Info'?: string;
  'Round BilTo'?: string;
  'Service Level'?: string;
  'Trip Miles'?: string;
  'Status'?: string;
  'Passenger Name'?: string;
  'Passenger Count'?: string;
  'Pay Amount'?: string;
  'Passenger Phone Number'?: string;
  'Cash Fare Amount'?: string;
  'Dropoff Address'?: string;
  'Dropoff City'?: string;
  'Dropoff State'?: string;
  'Dropoff Zip'?: string;
  'Trip Number'?: string;
  'Name'?: string;
  'Member Phone'?: string;
  'Pickup Address 2'?: string;
  'Destination Name'?: string;
  'Destination Address'?: string;
  'Destination Address 2'?: string;
  'Trip Date'?: string;
  'Appointment Time'?: string;
  'Mileage'?: string;
  'Vehicle Type'?: string;
  'Special Needs'?: string;
  'Provider Notes'?: string;
  'Additional Passengers'?: string;
  'Additional Passenger Count'?: string;
  'Wheelchair'?: string;
  [key: string]: string | undefined;
}

export default function BrokerCSVImport({ onClose, onImportComplete }: BrokerCSVImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<{ success: number; errors: string[] } | null>(null);
  const [preview, setPreview] = useState<BrokerTripRow[]>([]);

  const parseCSV = (text: string): BrokerTripRow[] => {
    const rows: BrokerTripRow[] = [];
    let currentRow: string[] = [];
    let currentField = '';
    let insideQuotes = false;
    let headers: string[] = [];

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          currentField += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if ((char === '\n' || char === '\r') && !insideQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }

        currentRow.push(currentField.trim());

        if (currentRow.some(field => field.length > 0)) {
          if (headers.length === 0) {
            headers = currentRow;
            console.log('CSV Headers:', headers);
          } else {
            const row: any = {};
            headers.forEach((header, index) => {
              row[header] = currentRow[index] || '';
            });
            rows.push(row as BrokerTripRow);
          }
        }

        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }

    if (currentField || currentRow.length > 0) {
      currentRow.push(currentField.trim());
      if (currentRow.some(field => field.length > 0) && headers.length > 0) {
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = currentRow[index] || '';
        });
        rows.push(row as BrokerTripRow);
      }
    }

    console.log(`Parsed ${rows.length} data rows from CSV`);
    return rows;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    const text = await selectedFile.text();
    const parsed = parseCSV(text);
    setPreview(parsed.slice(0, 5));
  };

  const findOrCreatePatient = async (name: string, phone: string) => {
    const fullName = name.trim();

    const { data: existing } = await supabase
      .from('patients')
      .select('id')
      .ilike('full_name', fullName)
      .maybeSingle();

    if (existing) {
      return existing.id;
    }

    const { data: newPatient, error } = await supabase
      .from('patients')
      .insert({
        full_name: fullName,
        phone: phone || null
      })
      .select('id')
      .single();

    if (error) throw error;
    return newPatient.id;
  };

  const parseDateTime = (dateTimeStr: string): string => {
    if (!dateTimeStr) return new Date().toISOString();

    try {
      const date = new Date(dateTimeStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    } catch (e) {
      console.error('Date parse error:', e);
    }

    return new Date().toISOString();
  };

  const isA2CareFormat = (row: BrokerTripRow): boolean => {
    return 'Name' in row && 'Trip Number' in row && 'Destination Name' in row;
  };

  const importTrips = async () => {
    if (!file) return;

    setImporting(true);
    const errors: string[] = [];
    let successCount = 0;

    try {
      const text = await file.text();
      const rows = parseCSV(text);

      console.log(`Processing ${rows.length} rows from CSV`);

      const isA2Care = rows.length > 0 && isA2CareFormat(rows[0]);
      console.log(`Detected format: ${isA2Care ? 'A2Care' : 'Standard'}`);

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];

        try {
          let passengerName: string;
          let passengerPhone: string;
          let pickupAddress: string;
          let dropoffAddress: string;
          let scheduledTime: string;
          let tripNumber: string | null;
          let miles: number;
          let notes: string | null;
          let spaceType: string | null;

          if (isA2Care) {
            passengerName = row['Name']?.trim() || `Unknown-${Date.now()}-${i}`;
            passengerPhone = row['Member Phone'] || '';

            const pickupAddr = row['Pickup Address'] || '';
            const pickupAddr2 = row['Pickup Address 2'] || '';
            pickupAddress = pickupAddr2 || pickupAddr;

            const destName = row['Destination Name'] || '';
            const destAddr = row['Destination Address'] || '';
            const destAddr2 = row['Destination Address 2'] || '';
            dropoffAddress = [destName, destAddr, destAddr2].filter(Boolean).join(', ');

            const tripDate = row['Trip Date'] || '';
            const apptTime = row['Appointment Time'] || row['Pickup Time'] || '';

            if (apptTime === 'Will Call') {
              scheduledTime = parseDateTime(tripDate + ' 12:00 PM');
            } else if (tripDate && apptTime) {
              scheduledTime = parseDateTime(tripDate + ' ' + apptTime);
            } else {
              scheduledTime = parseDateTime(tripDate || apptTime);
            }

            tripNumber = row['Trip Number'] || null;
            miles = parseFloat(row['Mileage']) || 0;

            const specialNeeds = row['Special Needs'] || '';
            const providerNotes = row['Provider Notes'] || '';
            const isWheelchair = row['Wheelchair']?.toLowerCase() === 'true';
            notes = [specialNeeds, providerNotes].filter(Boolean).join(' | ') || null;

            spaceType = row['Vehicle Type'] || (isWheelchair ? 'Wheelchair Van' : null);
          } else {
            passengerName = row['Passenger Name']?.trim() || `Unknown-${Date.now()}-${i}`;
            passengerPhone = row['Passenger Phone Number'] || '';

            pickupAddress = [
              row['Pickup Address'],
              row['Pickup City'],
              `${row['Pickup State']} ${row['Pickup Zip']}`
            ].filter(Boolean).join(', ');

            dropoffAddress = [
              row['Dropoff Address'] || row['Shared Address'],
              row['Dropoff City'],
              `${row['Dropoff State']} ${row['Dropoff Zip']}`
            ].filter(Boolean).join(', ');

            scheduledTime = parseDateTime(row['Pickup Time'] || '');
            tripNumber = row['Run To ID'] || row['Bolt Trip ID'] || null;
            miles = parseFloat(row['Trip Miles'] || '0') || 0;
            notes = row['Pickup Notes'] || null;
            spaceType = row['Service Level'] || null;
          }

          if (!pickupAddress || !dropoffAddress) {
            errors.push(`Row ${i + 2}: Missing pickup or dropoff address`);
            continue;
          }

          const patientId = await findOrCreatePatient(passengerName, passengerPhone);

          const tripData = {
            trip_number: tripNumber,
            patient_id: patientId,
            pickup_address: pickupAddress,
            dropoff_address: dropoffAddress,
            notes: notes,
            scheduled_pickup_time: scheduledTime,
            space_type: spaceType,
            distance_miles: miles,
            status: 'pending',
            broker_service_rate: null,
            trip_fare: null,
            broker_name: isA2Care ? 'A2Care' : 'ALC',
            confirmation_status: 'pending'
          };

          const { error: tripError } = await supabase
            .from('trips')
            .insert(tripData);

          if (tripError) {
            console.error(`Error importing row ${i + 2}:`, tripError);
            errors.push(`Row ${i + 2}: ${tripError.message}`);
          } else {
            successCount++;
            console.log(`Successfully imported row ${i + 2}`);
          }
        } catch (error: any) {
          console.error(`Exception importing row ${i + 2}:`, error);
          errors.push(`Row ${i + 2}: ${error.message}`);
        }
      }

      console.log(`Import complete: ${successCount} success, ${errors.length} errors`);
      setResults({ success: successCount, errors });

      if (successCount > 0) {
        setTimeout(() => {
          onImportComplete();
          if (errors.length === 0) {
            onClose();
          }
        }, 2000);
      }
    } catch (error: any) {
      console.error('Import failed:', error);
      setResults({ success: 0, errors: [error.message] });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
          <h2 className="text-2xl font-bold text-gray-900">Import Trips from Broker CSV</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-blue-800 font-medium mb-2">
                  Supported CSV Formats:
                </p>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-blue-700 font-semibold">A2Care Format:</p>
                    <p className="text-xs text-blue-700 font-mono">
                      Trip Number, Name, Member Phone, Pickup Address, Pickup Address 2,
                      Destination Name, Destination Address, Trip Date, Appointment Time,
                      Mileage, Vehicle Type, Special Needs, Wheelchair
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-700 font-semibold">Standard Format:</p>
                    <p className="text-xs text-blue-700 font-mono">
                      Run To ID, Passenger Name, Passenger Phone Number, Pickup Address,
                      Pickup Time, Dropoff Address, Service Level, Trip Miles
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload" className="cursor-pointer">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-700 mb-2">
                {file ? file.name : 'Click to upload CSV file'}
              </p>
              <p className="text-sm text-gray-500">
                {file ? 'Click to select a different file' : 'Select a CSV file from your broker'}
              </p>
            </label>
          </div>

          {preview.length > 0 && (
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-5 h-5 text-gray-600" />
                <h3 className="font-semibold text-gray-900">
                  Preview (First 5 Rows) - {isA2CareFormat(preview[0]) ? 'A2Care Format' : 'Standard Format'}
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-1 text-left">Trip#</th>
                      <th className="px-2 py-1 text-left">Passenger</th>
                      <th className="px-2 py-1 text-left">Pickup</th>
                      <th className="px-2 py-1 text-left">Destination</th>
                      <th className="px-2 py-1 text-left">Time</th>
                      <th className="px-2 py-1 text-left">Miles</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {preview.map((row, idx) => {
                      const isA2Care = isA2CareFormat(row);
                      return (
                        <tr key={idx}>
                          <td className="px-2 py-1">{row['Trip Number'] || row['Run To ID'] || row['Bolt Trip ID']}</td>
                          <td className="px-2 py-1">{row['Name'] || row['Passenger Name']}</td>
                          <td className="px-2 py-1 max-w-xs truncate">
                            {isA2Care ? (row['Pickup Address 2'] || row['Pickup Address']) : row['Pickup Address']}
                          </td>
                          <td className="px-2 py-1 max-w-xs truncate">
                            {isA2Care ? row['Destination Name'] : row['Dropoff Address']}
                          </td>
                          <td className="px-2 py-1">
                            {isA2Care ? `${row['Trip Date']} ${row['Appointment Time']}` : row['Pickup Time']}
                          </td>
                          <td className="px-2 py-1">{row['Mileage'] || row['Trip Miles']}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {results && (
            <div className={`border rounded-lg p-4 ${
              results.errors.length === 0 ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
            }`}>
              <div className="flex items-start gap-3">
                {results.errors.length === 0 ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 mb-2">
                    Import Complete: {results.success} trips imported successfully
                  </p>
                  {results.errors.length > 0 && (
                    <div className="mt-3">
                      <p className="font-medium text-gray-700 mb-2">Errors ({results.errors.length}):</p>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {results.errors.map((error, idx) => (
                          <p key={idx} className="text-sm text-red-700">
                            {error}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50 sticky bottom-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900"
            disabled={importing}
          >
            {results ? 'Close' : 'Cancel'}
          </button>
          <button
            onClick={importTrips}
            disabled={!file || importing || results !== null}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
          >
            {importing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Importing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Import Trips
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
