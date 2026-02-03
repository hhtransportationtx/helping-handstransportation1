import React, { useState } from 'react';
import { Upload, X, Check, AlertCircle, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CSVImportProps {
  onClose: () => void;
}

type EntityType = 'drivers' | 'patients' | 'trips' | 'vehicles' | 'funding_sources';

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

export default function CSVImport({ onClose }: CSVImportProps) {
  const [selectedType, setSelectedType] = useState<EntityType>('drivers');
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const entityTemplates = {
    drivers: {
      name: 'Drivers',
      fields: ['first_name', 'last_name', 'email', 'phone', 'license_number', 'license_expiry', 'hire_date'],
      template: 'first_name,last_name,email,phone,license_number,license_expiry,hire_date\nJohn,Doe,john@example.com,555-0100,DL123456,2025-12-31,2024-01-01'
    },
    patients: {
      name: 'Patients',
      fields: ['first_name', 'last_name', 'date_of_birth', 'phone', 'email', 'address', 'city', 'state', 'zip', 'medicaid_number'],
      template: 'first_name,last_name,date_of_birth,phone,email,address,city,state,zip,medicaid_number\nJane,Smith,1980-05-15,555-0200,jane@example.com,123 Main St,Springfield,IL,62701,MC123456'
    },
    trips: {
      name: 'Trips',
      fields: ['patient_email', 'pickup_address', 'dropoff_address', 'scheduled_pickup_time', 'trip_type', 'notes'],
      template: `patient_email,pickup_address,dropoff_address,scheduled_pickup_time,trip_type,notes\njane@example.com,123 Main St,456 Hospital Rd,${new Date().toISOString().split('T')[0]} 10:00,round_trip,Regular checkup`
    },
    vehicles: {
      name: 'Vehicles',
      fields: ['name', 'make', 'model', 'year', 'vin', 'license_plate', 'capacity', 'vehicle_type'],
      template: 'name,make,model,year,vin,license_plate,capacity,vehicle_type\nVan 1,Ford,Transit,2023,1FTBR1XM0PKA12345,ABC123,8,van'
    },
    funding_sources: {
      name: 'Funding Sources',
      fields: ['name', 'type', 'contact_name', 'contact_email', 'contact_phone'],
      template: 'name,type,contact_name,contact_email,contact_phone\nMedicaid,insurance,John Admin,admin@medicaid.gov,555-0300'
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    const fileName = uploadedFile.name.toLowerCase();
    const isCSV = fileName.endsWith('.csv') || uploadedFile.type === 'text/csv' || uploadedFile.type === 'application/vnd.ms-excel';

    if (isCSV) {
      setFile(uploadedFile);
      setResult(null);
      setCsvData([]);
      setHeaders([]);
      setShowPreview(false);
      parseCSV(uploadedFile);
    } else {
      alert('Please upload a valid CSV file (.csv extension)');
    }
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text || text.trim().length === 0) {
          alert('The CSV file is empty');
          return;
        }

        const lines = text.split(/\r?\n/).filter(line => line.trim());

        if (lines.length === 0) {
          alert('No data found in CSV file');
          return;
        }

        if (lines.length === 1) {
          alert('CSV file only contains headers. Please add data rows.');
          return;
        }

        const headers = parseCSVLine(lines[0]).map(h => h.trim().replace(/^["']|["']$/g, ''));
        setHeaders(headers);

        const data = lines.slice(1).map((line, lineIndex) => {
          const values = parseCSVLine(line);
          const row: any = {};
          headers.forEach((header, index) => {
            row[header] = values[index] ? values[index].replace(/^["']|["']$/g, '').trim() : '';
          });
          return row;
        }).filter(row => {
          return Object.values(row).some(val => val !== '');
        });

        if (data.length === 0) {
          alert('No valid data rows found in CSV file');
          return;
        }

        setCsvData(data);
        setShowPreview(true);
      } catch (error: any) {
        console.error('CSV parsing error:', error);
        alert(`Error parsing CSV file: ${error.message}`);
      }
    };

    reader.onerror = () => {
      alert('Error reading file. Please try again.');
    };

    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const template = entityTemplates[selectedType];
    const blob = new Blob([template.template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedType}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importDrivers = async (data: any[]): Promise<ImportResult> => {
    const result: ImportResult = { success: 0, failed: 0, errors: [] };

    for (const row of data) {
      try {
        const { data: { user }, error: authError } = await supabase.auth.admin.createUser({
          email: row.email,
          password: Math.random().toString(36).slice(-12),
          email_confirm: true,
          user_metadata: {
            first_name: row.first_name,
            last_name: row.last_name,
            phone: row.phone
          }
        });

        if (authError) throw authError;

        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            first_name: row.first_name,
            last_name: row.last_name,
            phone: row.phone,
            role: 'driver',
            license_number: row.license_number,
            license_expiry: row.license_expiry || null,
            hire_date: row.hire_date || null
          })
          .eq('id', user?.id);

        if (profileError) throw profileError;

        result.success++;
      } catch (error: any) {
        result.failed++;
        result.errors.push(`Row ${result.success + result.failed}: ${error.message}`);
      }
    }

    return result;
  };

  const importPatients = async (data: any[]): Promise<ImportResult> => {
    const result: ImportResult = { success: 0, failed: 0, errors: [] };

    for (const row of data) {
      try {
        const { error } = await supabase
          .from('patients')
          .insert({
            first_name: row.first_name,
            last_name: row.last_name,
            date_of_birth: row.date_of_birth || null,
            phone: row.phone,
            email: row.email || null,
            address: row.address || null,
            city: row.city || null,
            state: row.state || null,
            zip: row.zip || null,
            medicaid_number: row.medicaid_number || null
          });

        if (error) throw error;
        result.success++;
      } catch (error: any) {
        result.failed++;
        result.errors.push(`Row ${result.success + result.failed}: ${error.message}`);
      }
    }

    return result;
  };

  const importTrips = async (data: any[]): Promise<ImportResult> => {
    const result: ImportResult = { success: 0, failed: 0, errors: [] };

    for (const row of data) {
      try {
        if (!row.patient_email) {
          throw new Error('patient_email is required');
        }

        const { data: patient, error: patientError } = await supabase
          .from('patients')
          .select('id')
          .eq('email', row.patient_email)
          .maybeSingle();

        if (patientError) throw patientError;
        if (!patient) throw new Error(`Patient with email '${row.patient_email}' not found. Please import the patient first.`);

        if (!row.scheduled_pickup_time) {
          throw new Error('scheduled_pickup_time is required');
        }

        const { error } = await supabase
          .from('trips')
          .insert({
            patient_id: patient.id,
            pickup_address: row.pickup_address,
            dropoff_address: row.dropoff_address,
            scheduled_pickup_time: row.scheduled_pickup_time,
            trip_type: row.trip_type || 'round_trip',
            status: 'scheduled',
            notes: row.notes || null
          });

        if (error) throw error;
        result.success++;
      } catch (error: any) {
        result.failed++;
        result.errors.push(`Row ${result.success + result.failed}: ${error.message}`);
      }
    }

    return result;
  };

  const importVehicles = async (data: any[]): Promise<ImportResult> => {
    const result: ImportResult = { success: 0, failed: 0, errors: [] };

    for (const row of data) {
      try {
        const { error } = await supabase
          .from('vehicles')
          .insert({
            name: row.name,
            make: row.make,
            model: row.model,
            year: parseInt(row.year) || null,
            vin: row.vin || null,
            license_plate: row.license_plate,
            capacity: parseInt(row.capacity) || null,
            vehicle_type: row.vehicle_type || 'sedan',
            status: 'active'
          });

        if (error) throw error;
        result.success++;
      } catch (error: any) {
        result.failed++;
        result.errors.push(`Row ${result.success + result.failed}: ${error.message}`);
      }
    }

    return result;
  };

  const importFundingSources = async (data: any[]): Promise<ImportResult> => {
    const result: ImportResult = { success: 0, failed: 0, errors: [] };

    for (const row of data) {
      try {
        const { error } = await supabase
          .from('funding_sources')
          .insert({
            name: row.name,
            type: row.type || 'insurance',
            contact_name: row.contact_name || null,
            contact_email: row.contact_email || null,
            contact_phone: row.contact_phone || null,
            is_active: true
          });

        if (error) throw error;
        result.success++;
      } catch (error: any) {
        result.failed++;
        result.errors.push(`Row ${result.success + result.failed}: ${error.message}`);
      }
    }

    return result;
  };

  const handleImport = async () => {
    if (csvData.length === 0) {
      alert('No data to import');
      return;
    }

    setImporting(true);
    setResult(null);

    try {
      let importResult: ImportResult;

      switch (selectedType) {
        case 'drivers':
          importResult = await importDrivers(csvData);
          break;
        case 'patients':
          importResult = await importPatients(csvData);
          break;
        case 'trips':
          importResult = await importTrips(csvData);
          break;
        case 'vehicles':
          importResult = await importVehicles(csvData);
          break;
        case 'funding_sources':
          importResult = await importFundingSources(csvData);
          break;
        default:
          throw new Error('Invalid entity type');
      }

      setResult(importResult);
    } catch (error: any) {
      alert(`Import failed: ${error.message}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Import CSV Data</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Data Type
            </label>
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value as EntityType);
                setFile(null);
                setCsvData([]);
                setShowPreview(false);
                setResult(null);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {Object.entries(entityTemplates).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.name}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-blue-900 mb-2">CSV Format Requirements</h3>
                <p className="text-sm text-blue-800 mb-2">
                  Your CSV file should include the following columns:
                </p>
                <div className="text-sm text-blue-800 font-mono bg-white rounded p-2 mb-3">
                  {entityTemplates[selectedType].fields.join(', ')}
                </div>
                <button
                  onClick={downloadTemplate}
                  className="inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Template
                </button>
              </div>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Upload CSV File
              </label>
              {file && (
                <button
                  onClick={() => {
                    setFile(null);
                    setCsvData([]);
                    setHeaders([]);
                    setShowPreview(false);
                    setResult(null);
                  }}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Clear File
                </button>
              )}
            </div>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                id="csv-upload"
                key={file ? file.name : 'empty'}
              />
              <label htmlFor="csv-upload" className="cursor-pointer">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">
                  {file ? `✓ ${file.name}` : 'Click to upload or drag and drop'}
                </p>
                <p className="text-sm text-gray-500">CSV files only</p>
              </label>
            </div>
          </div>

          {showPreview && csvData.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Preview ({csvData.length} rows)
              </h3>
              <div className="border rounded-lg overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {headers.map((header, index) => (
                        <th
                          key={index}
                          className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {csvData.slice(0, 5).map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {headers.map((header, colIndex) => (
                          <td key={colIndex} className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                            {row[header]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {csvData.length > 5 && (
                <p className="text-sm text-gray-500 mt-2">
                  Showing first 5 of {csvData.length} rows
                </p>
              )}
            </div>
          )}

          {result && (
            <div className={`border rounded-lg p-4 ${result.failed === 0 ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
              <div className="flex items-start">
                {result.failed === 0 ? (
                  <Check className="w-5 h-5 text-green-600 mr-3 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5" />
                )}
                <div className="flex-1">
                  <h3 className={`font-medium ${result.failed === 0 ? 'text-green-900' : 'text-yellow-900'} mb-2`}>
                    Import Complete
                  </h3>
                  <p className={`text-sm ${result.failed === 0 ? 'text-green-800' : 'text-yellow-800'} mb-2`}>
                    Successfully imported: {result.success} records
                    {result.failed > 0 && ` | Failed: ${result.failed} records`}
                  </p>
                  {selectedType === 'trips' && result.success > 0 && (
                    <p className={`text-sm ${result.failed === 0 ? 'text-green-800' : 'text-yellow-800'} mt-2 font-medium`}>
                      Note: Trips are filtered by date in the Dispatch Dashboard. Make sure to select the correct date to view your imported trips.
                    </p>
                  )}
                  {result.errors.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-yellow-900 mb-2">Errors:</p>
                      <ul className="text-sm text-yellow-800 space-y-1 max-h-40 overflow-y-auto">
                        {result.errors.slice(0, 10).map((error, index) => (
                          <li key={index} className="text-xs font-mono">• {error}</li>
                        ))}
                        {result.errors.length > 10 && (
                          <li className="text-xs">... and {result.errors.length - 10} more errors</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900"
          >
            Close
          </button>
          <button
            onClick={handleImport}
            disabled={csvData.length === 0 || importing}
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
                Import Data
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
