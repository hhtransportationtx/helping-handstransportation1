import React, { useState } from 'react';
import { X, AlertCircle, CheckCircle2, FileText, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface BrokerTextImportProps {
  onClose: () => void;
  onImportComplete: () => void;
}

interface ParsedTrip {
  runToId?: string;
  passengerName: string;
  passengerPhone?: string;
  pickupAddress: string;
  pickupCity?: string;
  pickupState?: string;
  pickupZip?: string;
  pickupTime: string;
  dropoffAddress: string;
  dropoffCity?: string;
  dropoffState?: string;
  dropoffZip?: string;
  serviceLevel?: string;
  tripMiles?: number;
  payAmount?: number;
  notes?: string;
  status?: string;
}

export default function BrokerTextImport({ onClose, onImportComplete }: BrokerTextImportProps) {
  const [textInput, setTextInput] = useState('');
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<{ success: number; errors: string[] } | null>(null);
  const [preview, setPreview] = useState<ParsedTrip[]>([]);

  const parseTextToTrips = (text: string): ParsedTrip[] => {
    const trips: ParsedTrip[] = [];
    const lines = text.split('\n');

    let currentTrip: Partial<ParsedTrip> = {};
    let inTrip = false;
    let collectingAddress = false;
    let addressLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      if (line.match(/^(Run To ID|Trip ID|ID|Trip #|Confirmation):/i)) {
        if (inTrip && currentTrip.passengerName && currentTrip.pickupAddress && currentTrip.dropoffAddress) {
          trips.push(currentTrip as ParsedTrip);
        }
        currentTrip = {};
        inTrip = true;
        currentTrip.runToId = line.split(':')[1]?.trim();
      }
      else if (line.match(/^(Passenger|Patient|Member|Name|Client):/i)) {
        const name = line.split(':')[1]?.trim();
        if (name) {
          currentTrip.passengerName = name;
          inTrip = true;
        }
      }
      else if (line.match(/^(Passenger Phone|Phone|Contact|Cell|Mobile):/i)) {
        currentTrip.passengerPhone = line.split(':')[1]?.trim();
      }
      else if (line.match(/^(Pickup Address|Pick Up|PU Address|From|Origin):/i)) {
        currentTrip.pickupAddress = line.split(':')[1]?.trim() || '';
        collectingAddress = 'pickup';
        addressLines = [currentTrip.pickupAddress];
      }
      else if (line.match(/^(Pickup City|PU City):/i)) {
        currentTrip.pickupCity = line.split(':')[1]?.trim();
      }
      else if (line.match(/^(Pickup State|PU State):/i)) {
        currentTrip.pickupState = line.split(':')[1]?.trim();
      }
      else if (line.match(/^(Pickup Zip|PU Zip):/i)) {
        currentTrip.pickupZip = line.split(':')[1]?.trim();
      }
      else if (line.match(/^(Pickup Time|PU Time|Time|Appt [Tt]ime|Appointment):/i)) {
        const timeStr = line.split(':').slice(1).join(':').trim();
        if (timeStr) {
          currentTrip.pickupTime = timeStr;
          inTrip = true;
        }
      }
      else if (line.match(/^(Dropoff Address|Drop Off|DO Address|Destination|To):/i)) {
        currentTrip.dropoffAddress = line.split(':')[1]?.trim() || '';
        collectingAddress = 'dropoff';
        addressLines = [currentTrip.dropoffAddress];
      }
      else if (line.match(/^(Dropoff City|DO City):/i)) {
        currentTrip.dropoffCity = line.split(':')[1]?.trim();
      }
      else if (line.match(/^(Dropoff State|DO State):/i)) {
        currentTrip.dropoffState = line.split(':')[1]?.trim();
      }
      else if (line.match(/^(Dropoff Zip|DO Zip):/i)) {
        currentTrip.dropoffZip = line.split(':')[1]?.trim();
      }
      else if (line.match(/^(Service Level|Type|Service|Vehicle Type):/i)) {
        currentTrip.serviceLevel = line.split(':')[1]?.trim();
      }
      else if (line.match(/^(Miles|Distance|Trip Miles):/i)) {
        const miles = line.split(':')[1]?.trim();
        currentTrip.tripMiles = miles ? parseFloat(miles.replace(/[^\d.]/g, '')) : undefined;
      }
      else if (line.match(/^(Pay Amount|Amount|Rate|Payment|Unit Price):/i)) {
        const amount = line.split(':')[1]?.trim();
        currentTrip.payAmount = amount ? parseFloat(amount.replace(/[^\d.]/g, '')) : undefined;
      }
      else if (line.match(/^(Notes|Comments|Special Instructions):/i)) {
        currentTrip.notes = line.split(':')[1]?.trim();
      }
      else if (line.match(/^(Status):/i)) {
        currentTrip.status = line.split(':')[1]?.trim();
      }
      else if (line.match(/^(Schedule|Date):/i)) {
        const dateStr = line.split(':')[1]?.trim();
        if (dateStr && !currentTrip.pickupTime) {
          currentTrip.pickupTime = dateStr.split('-')[0]?.trim() || dateStr;
        }
      }
      else if (line.includes('---') || line.includes('===') || line.match(/^-{3,}$/) || line.match(/^={3,}$/)) {
        if (inTrip && currentTrip.passengerName && (currentTrip.pickupAddress || currentTrip.dropoffAddress)) {
          if (!currentTrip.pickupAddress) currentTrip.pickupAddress = 'Not specified';
          if (!currentTrip.dropoffAddress) currentTrip.dropoffAddress = 'Not specified';
          if (!currentTrip.pickupTime) currentTrip.pickupTime = new Date().toISOString();
          trips.push(currentTrip as ParsedTrip);
          currentTrip = {};
          inTrip = false;
        }
        collectingAddress = false;
        addressLines = [];
      }
      else if (collectingAddress && line && !line.includes(':')) {
        if (line.match(/^\d{5}(-\d{4})?$/) || line.match(/^[A-Z]{2}\s+\d{5}/)) {
          addressLines.push(line);
          const fullAddress = addressLines.join(', ');
          if (collectingAddress === 'pickup') {
            currentTrip.pickupAddress = fullAddress;
          } else if (collectingAddress === 'dropoff') {
            currentTrip.dropoffAddress = fullAddress;
          }
          collectingAddress = false;
          addressLines = [];
        } else {
          addressLines.push(line);
        }
      }
    }

    if (inTrip && currentTrip.passengerName && (currentTrip.pickupAddress || currentTrip.dropoffAddress)) {
      if (!currentTrip.pickupAddress) currentTrip.pickupAddress = 'Not specified';
      if (!currentTrip.dropoffAddress) currentTrip.dropoffAddress = 'Not specified';
      if (!currentTrip.pickupTime) currentTrip.pickupTime = new Date().toISOString();
      trips.push(currentTrip as ParsedTrip);
    }

    if (trips.length === 0) {
      const emergencyTrip = tryParseAsSingleDocument(text);
      if (emergencyTrip) {
        trips.push(emergencyTrip);
      }
    }

    return trips;
  };

  const tryParseAsSingleDocument = (text: string): ParsedTrip | null => {
    const trip: Partial<ParsedTrip> = {};

    const passengerMatch = text.match(/(?:Passenger|Patient|Member|Client):\s*([^\n]+)/i);
    if (passengerMatch) {
      const name = passengerMatch[1].trim();
      if (!name.match(/Transportation|Agency|Provider|Company/i)) {
        trip.passengerName = name;
      }
    }

    const phoneMatch = text.match(/(?:Phone|Contact|Cell):\s*([\d\s\-\(\)]+)/i);
    if (phoneMatch) trip.passengerPhone = phoneMatch[1].trim();

    const pickupMatch = text.match(/(?:Pickup|Pick Up|From|Origin)[^:]*:\s*([^\n]+(?:\n[^\n:]+)*?)(?=\n(?:[A-Z][a-z]+:|$))/i);
    if (pickupMatch) {
      const address = pickupMatch[1].trim().split('\n').map(l => l.trim()).join(', ');
      trip.pickupAddress = address;
    }

    const dropoffMatch = text.match(/(?:Dropoff|Drop Off|Destination|To)[^:]*:\s*([^\n]+(?:\n[^\n:]+)*?)(?=\n(?:[A-Z][a-z]+:|$))/i);
    if (dropoffMatch) {
      const address = dropoffMatch[1].trim().split('\n').map(l => l.trim()).join(', ');
      trip.dropoffAddress = address;
    }

    const locationMatch = text.match(/([A-Za-z][^\n]{3,60}?(?:Center|Hospital|Clinic|Medical|Facility|Building|Office|Plaza))\s*[\n\s]+([\d]+[^\n]+?(?:Blvd|Ave|Avenue|St|Street|Road|Dr|Drive|Lane|Way|Circle|Court|Parkway|W\.|E\.|N\.|S\.)\.?[^\n]*?)[\n\s]+([A-Z][a-z\s]+,\s*[A-Z]{2}\s*\d{5})/i);
    if (locationMatch) {
      const facilityName = locationMatch[1].trim();
      const street = locationMatch[2].trim();
      const cityStateZip = locationMatch[3].trim();
      const fullAddress = `${facilityName}, ${street}, ${cityStateZip}`;

      if (!trip.dropoffAddress) {
        trip.dropoffAddress = fullAddress;
      }
    }

    const timeMatch = text.match(/(?:Appt\s*time|Time|Pickup\s*Time|Appointment):\s*([^\n]+)/i);
    if (timeMatch) trip.pickupTime = timeMatch[1].trim();

    const scheduleMatch = text.match(/Schedule:\s*(\d{2}\/\d{2}\/\d{4})/i);
    if (scheduleMatch) {
      const scheduleDate = scheduleMatch[1];
      if (!trip.pickupTime) {
        trip.pickupTime = scheduleDate;
      } else {
        trip.pickupTime = `${scheduleDate} ${trip.pickupTime}`;
      }
    }

    const amountMatch = text.match(/(?:Unit\s*Price|Pay\s*Amount|Rate|Amount):\s*\$?([\d,]+\.?\d*)/i);
    if (amountMatch) {
      trip.payAmount = parseFloat(amountMatch[1].replace(/,/g, ''));
    }

    if (!trip.passengerName) {
      const nameInText = text.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})$/m);
      if (nameInText && !nameInText[1].match(/Transportation|Agency|Provider|Company|Center|Hospital|Clinic|Service|Plan|Total/i)) {
        trip.passengerName = nameInText[1];
      }
    }

    if (!trip.passengerName) {
      const agencyMatch = text.match(/Agency:\s*([^\n]+)/i);
      const fundMatch = text.match(/Fund\s*Identifier:\s*([^\n]+)/i);
      if (agencyMatch || fundMatch) {
        trip.passengerName = `Broker Trip - Add Member Name`;
      }
    }

    if (!trip.passengerName) {
      trip.passengerName = `Import - Add Member Name`;
    }

    if (!trip.pickupAddress) trip.pickupAddress = 'Member Home Address';
    if (!trip.pickupTime) trip.pickupTime = new Date().toISOString();

    return trip as ParsedTrip;
  };

  const handleTextInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setTextInput(text);

    if (text.trim()) {
      const parsed = parseTextToTrips(text);
      setPreview(parsed.slice(0, 5));
    } else {
      setPreview([]);
    }
  };

  const findOrCreatePatient = async (name: string, phone?: string) => {
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

  const importTrips = async () => {
    if (!textInput.trim()) return;

    setImporting(true);
    const errors: string[] = [];
    let successCount = 0;

    try {
      const trips = parseTextToTrips(textInput);

      if (trips.length === 0) {
        setResults({ success: 0, errors: ['No valid trips found in the text. Please check the format.'] });
        setImporting(false);
        return;
      }

      for (let i = 0; i < trips.length; i++) {
        const trip = trips[i];

        try {
          const patientId = await findOrCreatePatient(
            trip.passengerName,
            trip.passengerPhone
          );

          const pickupAddress = [
            trip.pickupAddress,
            trip.pickupCity,
            trip.pickupState && trip.pickupZip ? `${trip.pickupState} ${trip.pickupZip}` : trip.pickupState || trip.pickupZip
          ].filter(Boolean).join(', ');

          const dropoffAddress = [
            trip.dropoffAddress,
            trip.dropoffCity,
            trip.dropoffState && trip.dropoffZip ? `${trip.dropoffState} ${trip.dropoffZip}` : trip.dropoffState || trip.dropoffZip
          ].filter(Boolean).join(', ');

          const scheduledTime = parseDateTime(trip.pickupTime);

          const tripData = {
            trip_number: trip.runToId || null,
            patient_id: patientId,
            pickup_address: pickupAddress,
            dropoff_address: dropoffAddress,
            notes: trip.notes || null,
            scheduled_pickup_time: scheduledTime,
            space_type: trip.serviceLevel || null,
            distance_miles: trip.tripMiles || 0,
            status: trip.status?.toLowerCase() === 'confirmed' ? 'scheduled' : 'pending',
            broker_service_rate: trip.payAmount || null,
            trip_fare: trip.payAmount || null,
            broker_name: 'ALC',
            confirmation_status: 'pending'
          };

          const { error: tripError } = await supabase
            .from('trips')
            .insert(tripData);

          if (tripError) {
            console.error(`Error importing trip ${i + 1}:`, tripError);
            errors.push(`Trip ${i + 1} (${trip.passengerName}): ${tripError.message}`);
          } else {
            successCount++;
          }
        } catch (error: any) {
          console.error(`Exception importing trip ${i + 1}:`, error);
          errors.push(`Trip ${i + 1} (${trip.passengerName}): ${error.message}`);
        }
      }

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
          <h2 className="text-2xl font-bold text-gray-900">Import Trips from Text</h2>
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
                  How to use:
                </p>
                <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                  <li>Paste the trip information directly from your email or document</li>
                  <li>Works with various formats - ALC, Medicare, broker reports, etc.</li>
                  <li>The system will try to find: Passenger/Member name, Addresses, Time, and Amount</li>
                  <li>Separate multiple trips with a line of dashes (---)</li>
                </ul>
                <div className="mt-3 p-2 bg-white rounded text-xs font-mono">
                  <div className="text-gray-600">Example 1 (Structured):</div>
                  <div className="text-blue-900 mt-1">
                    Passenger: John Doe<br/>
                    Pickup Address: 123 Main St<br/>
                    Pickup Time: 01/15/2024 10:00 AM<br/>
                    Destination: 456 Oak Ave<br/>
                    ---
                  </div>
                  <div className="text-gray-600 mt-2">Example 2 (ALC Format):</div>
                  <div className="text-blue-900 mt-1">
                    Member: John Doe<br/>
                    Appt time: 6:30 a.m.<br/>
                    Del Sol Medical Center<br/>
                    10301 Gateway Blvd<br/>
                    El Paso, TX 79925<br/>
                    Unit Price: $45.00
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Paste Trip Information
            </label>
            <textarea
              value={textInput}
              onChange={handleTextInput}
              placeholder="Paste trip information here..."
              className="w-full h-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              disabled={importing || results !== null}
            />
          </div>

          {preview.length > 0 && (
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-5 h-5 text-gray-600" />
                <h3 className="font-semibold text-gray-900">
                  Preview ({preview.length} trip{preview.length !== 1 ? 's' : ''} found)
                </h3>
              </div>
              <div className="space-y-3">
                {preview.map((trip, idx) => (
                  <div key={idx} className="bg-gray-50 p-3 rounded text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      {trip.runToId && (
                        <div>
                          <span className="font-medium text-gray-600">ID:</span> {trip.runToId}
                        </div>
                      )}
                      <div>
                        <span className="font-medium text-gray-600">Passenger:</span> {trip.passengerName}
                      </div>
                      <div className="col-span-2">
                        <span className="font-medium text-gray-600">Pickup:</span> {trip.pickupAddress}
                      </div>
                      <div className="col-span-2">
                        <span className="font-medium text-gray-600">Dropoff:</span> {trip.dropoffAddress}
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Time:</span> {trip.pickupTime}
                      </div>
                      {trip.payAmount && (
                        <div>
                          <span className="font-medium text-gray-600">Amount:</span> ${trip.payAmount}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
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
                    Import Complete: {results.success} trip{results.success !== 1 ? 's' : ''} imported successfully
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
            disabled={!textInput.trim() || importing || results !== null}
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
