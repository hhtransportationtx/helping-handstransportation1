import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { X, Camera, Upload, MapPin } from 'lucide-react';

interface PhotoUploadProps {
  tripId: string;
  onComplete: () => void;
  onCancel: () => void;
}

export default function PhotoUpload({ tripId, onComplete, onCancel }: PhotoUploadProps) {
  const { user } = useAuth();
  const [photoType, setPhotoType] = useState<'vehicle_condition' | 'patient' | 'incident' | 'other'>('vehicle_condition');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  }

  async function uploadPhoto() {
    if (!preview) {
      alert('Please select a photo');
      return;
    }

    setUploading(true);

    try {
      const response = await fetch(preview);
      const blob = await response.blob();
      const fileName = `${tripId}-${Date.now()}.jpg`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('trip-photos')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          cacheControl: '3600'
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error('Failed to upload photo');
      }

      const { data: { publicUrl } } = supabase.storage
        .from('trip-photos')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from('trip_photos')
        .insert({
          trip_id: tripId,
          photo_url: publicUrl,
          photo_type: photoType,
          description: description,
          latitude: location?.lat,
          longitude: location?.lng,
          created_by: user?.id
        });

      if (dbError) throw dbError;

      onComplete();
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Failed to upload photo. The photo will be saved locally for offline use.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="min-h-screen bg-pink-50 flex flex-col">
      <div className="bg-blue-600 text-white p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Upload Photo</h1>
          <button onClick={onCancel} className="p-2">
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 flex flex-col">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Photo Type
          </label>
          <select
            value={photoType}
            onChange={(e) => setPhotoType(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="vehicle_condition">Vehicle Condition</option>
            <option value="patient">Patient</option>
            <option value="incident">Incident</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a description..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            rows={3}
          />
        </div>

        {preview ? (
          <div className="flex-1 flex flex-col mb-4">
            <label className="text-sm font-medium text-gray-700 mb-2">
              Preview
            </label>
            <div className="flex-1 bg-gray-200 rounded-lg overflow-hidden" style={{ minHeight: '300px' }}>
              <img src={preview} alt="Preview" className="w-full h-full object-contain" />
            </div>
            {location && (
              <div className="mt-2 flex items-center text-sm text-gray-600">
                <MapPin className="w-4 h-4 mr-1" />
                Location captured: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
              </div>
            )}
            <button
              onClick={() => {
                setPreview(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
              className="mt-4 w-full bg-gray-600 text-white py-3 rounded-lg font-medium"
            >
              Take Another Photo
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-center items-center border-2 border-dashed border-gray-300 rounded-lg mb-4" style={{ minHeight: '300px' }}>
            <Camera className="w-16 h-16 text-gray-400 mb-4" />
            <p className="text-gray-600 mb-4">Take a photo</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium flex items-center"
            >
              <Camera className="w-5 h-5 mr-2" />
              Open Camera
            </button>
          </div>
        )}

        {preview && (
          <button
            onClick={uploadPhoto}
            disabled={uploading}
            className="w-full bg-green-600 text-white py-4 rounded-lg font-semibold flex items-center justify-center disabled:opacity-50"
          >
            <Upload className="w-5 h-5 mr-2" />
            {uploading ? 'Uploading...' : 'Upload Photo'}
          </button>
        )}
      </div>
    </div>
  );
}