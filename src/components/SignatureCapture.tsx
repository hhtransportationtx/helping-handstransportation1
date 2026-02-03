import { useRef, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, RotateCcw, Check } from 'lucide-react';

interface SignatureCaptureProps {
  tripId: string;
  onComplete: () => void;
  onCancel: () => void;
}

export default function SignatureCapture({ tripId, onComplete, onCancel }: SignatureCaptureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signedBy, setSignedBy] = useState('');
  const [signerRole, setSignerRole] = useState<'driver' | 'member' | 'facility'>('member');
  const [saving, setSaving] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  function startDrawing(e: React.TouchEvent | React.MouseEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsDrawing(true);
    setHasDrawn(true);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function draw(e: React.TouchEvent | React.MouseEvent) {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function stopDrawing() {
    setIsDrawing(false);
  }

  function clearSignature() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  }

  async function saveSignature() {
    if (!signedBy.trim()) {
      alert('Please enter the name of the person signing');
      return;
    }

    if (!hasDrawn) {
      alert('Please provide a signature');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    setSaving(true);

    try {
      const signatureData = canvas.toDataURL('image/png');
      const now = new Date().toISOString();

      const { error: signatureError } = await supabase
        .from('trip_signatures')
        .insert({
          trip_id: tripId,
          signature_data: signatureData,
          signed_by: signedBy,
          signature_type: signerRole,
          signed_at: now
        });

      if (signatureError) throw signatureError;

      const tripUpdates: any = {
        status: 'completed',
        finished_time: now,
        member_signature: signatureData,
        member_signature_timestamp: now,
        actual_dropoff_time: now
      };

      const { error: tripError } = await supabase
        .from('trips')
        .update(tripUpdates)
        .eq('id', tripId);

      if (tripError) throw tripError;

      alert('Trip completed successfully! Signature captured for billing.');
      onComplete();
    } catch (error) {
      console.error('Error saving signature:', error);
      alert('Failed to save signature and complete trip');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-pink-50 flex flex-col">
      <div className="bg-blue-600 text-white p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Member Signature Required</h1>
          <button onClick={onCancel} className="p-2">
            <X className="w-6 h-6" />
          </button>
        </div>
        <p className="text-sm mt-1 text-blue-100">Required for billing and payment processing</p>
      </div>

      <div className="flex-1 p-4 flex flex-col">
        <div className="mb-4 bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
          <p className="text-sm text-yellow-800">
            <strong>Important:</strong> Member signature is required to receive payment for this trip. Please ensure the member or their authorized representative signs below.
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Who is signing?
          </label>
          <select
            value={signerRole}
            onChange={(e) => setSignerRole(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="member">Member (Patient)</option>
            <option value="facility">Facility Representative</option>
            <option value="driver">Driver</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Name of Person Signing
          </label>
          <input
            type="text"
            value={signedBy}
            onChange={(e) => setSignedBy(e.target.value)}
            placeholder="Enter full name"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">
              Sign Below
            </label>
            <button
              onClick={clearSignature}
              className="flex items-center text-sm text-blue-600 font-medium"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Clear
            </button>
          </div>

          <div className="flex-1 bg-white border-2 border-gray-300 rounded-lg overflow-hidden" style={{ minHeight: '300px' }}>
            <canvas
              ref={canvasRef}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              className="w-full h-full touch-none"
              style={{ touchAction: 'none' }}
            />
          </div>
        </div>

        <button
          onClick={saveSignature}
          disabled={saving}
          className="mt-4 w-full bg-green-600 text-white py-4 rounded-lg font-semibold flex items-center justify-center disabled:opacity-50"
        >
          <Check className="w-5 h-5 mr-2" />
          {saving ? 'Saving...' : 'Save Signature'}
        </button>
      </div>
    </div>
  );
}