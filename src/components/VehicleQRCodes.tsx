import { useState, useEffect } from 'react';
import { supabase, Vehicle } from '../lib/supabase';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, Download, X } from 'lucide-react';

interface VehicleQRCodesProps {
  onClose: () => void;
}

export function VehicleQRCodes({ onClose }: VehicleQRCodesProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicles, setSelectedVehicles] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadVehicles();
  }, []);

  async function loadVehicles() {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('status', 'active')
        .order('vehicle_name');

      if (error) throw error;
      setVehicles(data || []);
    } catch (error) {
      console.error('Error loading vehicles:', error);
    } finally {
      setLoading(false);
    }
  }

  function toggleVehicle(vehicleId: string) {
    const newSelected = new Set(selectedVehicles);
    if (newSelected.has(vehicleId)) {
      newSelected.delete(vehicleId);
    } else {
      newSelected.add(vehicleId);
    }
    setSelectedVehicles(newSelected);
  }

  function selectAll() {
    if (selectedVehicles.size === vehicles.length) {
      setSelectedVehicles(new Set());
    } else {
      setSelectedVehicles(new Set(vehicles.map(v => v.id)));
    }
  }

  function handlePrint() {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const selectedVehiclesList = vehicles.filter(v => selectedVehicles.has(v.id));

    const qrCodesHTML = selectedVehiclesList.map(vehicle => {
      const qrData = JSON.stringify({
        type: 'vehicle_assignment',
        vehicleId: vehicle.id,
        vehicleName: vehicle.vehicle_name || vehicle.rig_no,
        rigNo: vehicle.rig_no,
        timestamp: Date.now()
      });

      return `
        <div style="page-break-after: always; padding: 40px; text-align: center;">
          <div style="border: 3px solid #000; padding: 30px; display: inline-block; border-radius: 10px;">
            <h1 style="margin: 0 0 20px 0; font-size: 32px; font-weight: bold;">
              ${vehicle.vehicle_name || vehicle.rig_no || 'Vehicle'}
            </h1>
            <div style="margin: 20px 0;">
              <svg id="qr-${vehicle.id}" xmlns="http://www.w3.org/2000/svg"></svg>
            </div>
            <p style="margin: 20px 0 10px 0; font-size: 24px; font-weight: 600;">
              Rig #: ${vehicle.rig_no || 'N/A'}
            </p>
            <p style="margin: 10px 0 0 0; font-size: 18px; color: #666;">
              ${vehicle.model || ''}
            </p>
            <p style="margin: 20px 0 0 0; font-size: 16px; color: #666;">
              Scan to assign this vehicle
            </p>
          </div>
        </div>
      `;
    }).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Vehicle QR Codes</title>
          <style>
            @media print {
              @page { margin: 0; }
              body { margin: 0; }
            }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
            }
          </style>
        </head>
        <body>
          ${qrCodesHTML}
          <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
          <script>
            ${selectedVehiclesList.map(vehicle => {
              const qrData = JSON.stringify({
                type: 'vehicle_assignment',
                vehicleId: vehicle.id,
                vehicleName: vehicle.vehicle_name || vehicle.rig_no,
                rigNo: vehicle.rig_no,
                timestamp: Date.now()
              });
              return `
                new QRCode(document.getElementById('qr-${vehicle.id}'), {
                  text: '${qrData.replace(/'/g, "\\'")}',
                  width: 300,
                  height: 300
                });
              `;
            }).join('\n')}

            setTimeout(() => {
              window.print();
              window.close();
            }, 500);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Vehicle QR Codes</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={selectAll}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors text-sm font-medium"
              >
                {selectedVehicles.size === vehicles.length ? 'Deselect All' : 'Select All'}
              </button>
              <span className="text-sm text-gray-600">
                {selectedVehicles.size} of {vehicles.length} selected
              </span>
            </div>
            <button
              onClick={handlePrint}
              disabled={selectedVehicles.size === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
            >
              <Printer className="w-5 h-5" />
              Print QR Codes
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vehicles.map((vehicle) => {
              const qrData = JSON.stringify({
                type: 'vehicle_assignment',
                vehicleId: vehicle.id,
                vehicleName: vehicle.vehicle_name || vehicle.rig_no,
                rigNo: vehicle.rig_no,
                timestamp: Date.now()
              });

              return (
                <div
                  key={vehicle.id}
                  onClick={() => toggleVehicle(vehicle.id)}
                  className={`border-2 rounded-lg p-4 cursor-pointer transition ${
                    selectedVehicles.has(vehicle.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <input
                      type="checkbox"
                      checked={selectedVehicles.has(vehicle.id)}
                      onChange={() => toggleVehicle(vehicle.id)}
                      className="w-5 h-5 text-blue-600 rounded"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">
                        {vehicle.vehicle_name || vehicle.rig_no || 'Unnamed Vehicle'}
                      </h3>
                      <p className="text-sm text-gray-600">Rig #: {vehicle.rig_no}</p>
                    </div>
                  </div>

                  <div className="flex justify-center p-4 bg-white rounded-lg">
                    <QRCodeSVG
                      value={qrData}
                      size={150}
                      level="H"
                      includeMargin
                    />
                  </div>

                  <p className="text-xs text-center text-gray-500 mt-3">
                    {vehicle.model || 'No model'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
