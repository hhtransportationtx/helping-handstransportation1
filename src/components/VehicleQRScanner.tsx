import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Camera, CheckCircle, AlertCircle } from 'lucide-react';

interface VehicleQRScannerProps {
  driverId: string;
  onClose: () => void;
  onAssigned: () => void;
}

export function VehicleQRScanner({ driverId, onClose, onAssigned }: VehicleQRScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [manualEntry, setManualEntry] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);
        startScanning();
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('Unable to access camera. Please check permissions or use manual entry.');
    }
  }

  function stopCamera() {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
  }

  function startScanning() {
    if (scanIntervalRef.current) return;

    scanIntervalRef.current = window.setInterval(() => {
      scanFrame();
    }, 500);
  }

  async function scanFrame() {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    if ('BarcodeDetector' in window) {
      try {
        const barcodeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
        const barcodes = await barcodeDetector.detect(canvas);

        if (barcodes.length > 0) {
          await handleQRCode(barcodes[0].rawValue);
        }
      } catch (err) {
        console.error('Barcode detection error:', err);
      }
    }
  }

  async function handleQRCode(data: string) {
    if (scanning) return;

    setScanning(true);
    setError(null);

    try {
      const qrData = JSON.parse(data);

      if (qrData.type !== 'vehicle_assignment') {
        throw new Error('Invalid QR code type');
      }

      await assignVehicle(qrData.vehicleId);
    } catch (err) {
      console.error('QR processing error:', err);
      setError('Invalid QR code. Please try again.');
      setScanning(false);
    }
  }

  async function assignVehicle(vehicleId: string) {
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data: existingAssignments } = await supabase
        .from('vehicle_assignments')
        .select('id')
        .eq('driver_id', driverId)
        .eq('assigned_date', today)
        .is('unassigned_at', null);

      if (existingAssignments && existingAssignments.length > 0) {
        await supabase
          .from('vehicle_assignments')
          .update({ unassigned_at: new Date().toISOString() })
          .eq('driver_id', driverId)
          .eq('assigned_date', today)
          .is('unassigned_at', null);
      }

      const { error: insertError } = await supabase
        .from('vehicle_assignments')
        .insert({
          vehicle_id: vehicleId,
          driver_id: driverId,
          assigned_date: today,
          assigned_by: driverId,
          assignment_method: 'qr_scan'
        });

      if (insertError) throw insertError;

      setSuccess(true);
      stopCamera();
      setTimeout(() => {
        onAssigned();
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Assignment error:', err);
      setError(err.message || 'Failed to assign vehicle');
      setScanning(false);
    }
  }

  async function handleManualEntry() {
    if (!manualEntry.trim()) {
      setError('Please enter a vehicle ID or scan QR code');
      return;
    }

    setScanning(true);
    setError(null);

    try {
      let vehicleId = manualEntry.trim();

      const { data: vehicle } = await supabase
        .from('vehicles')
        .select('id')
        .or(`id.eq.${vehicleId},rig_no.eq.${vehicleId},vehicle_name.ilike.%${vehicleId}%`)
        .single();

      if (!vehicle) {
        throw new Error('Vehicle not found');
      }

      await assignVehicle(vehicle.id);
    } catch (err: any) {
      setError(err.message || 'Vehicle not found');
      setScanning(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full overflow-hidden">
        <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Scan Vehicle QR Code</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {success ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Vehicle Assigned!</h3>
              <p className="text-gray-600">Your vehicle has been assigned successfully.</p>
            </div>
          ) : (
            <>
              {!cameraActive ? (
                <div className="space-y-6">
                  <button
                    onClick={startCamera}
                    className="w-full py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-3"
                  >
                    <Camera className="w-6 h-6" />
                    Start Camera to Scan
                  </button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-white text-gray-500">Or enter manually</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <input
                      type="text"
                      value={manualEntry}
                      onChange={(e) => setManualEntry(e.target.value)}
                      placeholder="Enter Vehicle Rig # or Name"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleManualEntry();
                        }
                      }}
                    />
                    <button
                      onClick={handleManualEntry}
                      disabled={scanning}
                      className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {scanning ? 'Assigning...' : 'Assign Vehicle'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative bg-black rounded-lg overflow-hidden">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-96 object-cover"
                    />
                    <canvas ref={canvasRef} className="hidden" />

                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-64 h-64 border-4 border-blue-500 rounded-lg"></div>
                    </div>

                    {scanning && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <div className="bg-white rounded-lg px-6 py-4">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                          <p className="mt-2 text-sm text-gray-600">Processing...</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={stopCamera}
                    className="w-full py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors"
                  >
                    Stop Camera
                  </button>

                  <p className="text-sm text-center text-gray-600">
                    Position the QR code within the frame
                  </p>
                </div>
              )}

              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
