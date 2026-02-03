import { useState } from 'react';
import { X, Upload, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DriverOnboardingProps {
  userId: string;
  onComplete: () => void;
}

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

export default function DriverOnboarding({ userId, onComplete }: DriverOnboardingProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    licenseNumber: '',
    licenseState: '',
    licenseExpiry: '',
    ssnLast4: '',
    dateOfBirth: '',
    consentBackgroundCheck: false,
    consentDataSharing: false
  });

  const [uploadedLicense, setUploadedLicense] = useState<File | null>(null);
  const [uploadedLicenseUrl, setUploadedLicenseUrl] = useState<string>('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setUploadedLicense(file);
    setUploadedLicenseUrl(URL.createObjectURL(file));
    setError('');
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      let licensePhotoUrl = '';

      if (uploadedLicense) {
        const fileExt = uploadedLicense.name.split('.').pop();
        const fileName = `${userId}-license-${Date.now()}.${fileExt}`;
        const filePath = `driver-licenses/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, uploadedLicense);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath);

        licensePhotoUrl = publicUrl;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          license_number: formData.licenseNumber,
          driver_license_state: formData.licenseState,
          driver_license_expiry: formData.licenseExpiry,
          ssn_last_4: formData.ssnLast4,
          date_of_birth: formData.dateOfBirth,
          background_check_status: 'in_progress',
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
          ...(licensePhotoUrl && { photo_url: licensePhotoUrl })
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/initiate-background-check`;
      await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          licenseNumber: formData.licenseNumber,
          licenseState: formData.licenseState,
          ssnLast4: formData.ssnLast4,
          dateOfBirth: formData.dateOfBirth
        })
      }).catch(() => {
        console.log('Background check service not configured');
      });

      onComplete();
    } catch (err: any) {
      setError(err.message || 'Failed to complete onboarding');
    } finally {
      setLoading(false);
    }
  };

  const isStep1Valid =
    formData.licenseNumber &&
    formData.licenseState &&
    formData.licenseExpiry;

  const isStep2Valid =
    formData.ssnLast4.length === 4 &&
    formData.dateOfBirth &&
    formData.consentBackgroundCheck &&
    formData.consentDataSharing;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Driver Onboarding</h2>
            <p className="text-sm text-gray-600">Complete your profile to start driving</p>
          </div>
          <div className="text-sm text-gray-600">
            Step {step} of 3
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-1">Driver's License Information</h3>
                    <p className="text-sm text-blue-800">
                      We need your driver's license information to verify your identity and ensure compliance with regulations.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Driver's License Number *
                </label>
                <input
                  type="text"
                  value={formData.licenseNumber}
                  onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., D1234567"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State *
                  </label>
                  <select
                    value={formData.licenseState}
                    onChange={(e) => setFormData({ ...formData, licenseState: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select State</option>
                    {US_STATES.map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expiry Date *
                  </label>
                  <input
                    type="date"
                    value={formData.licenseExpiry}
                    onChange={(e) => setFormData({ ...formData, licenseExpiry: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Driver's License Photo (Optional)
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  {uploadedLicenseUrl ? (
                    <div className="space-y-3">
                      <img
                        src={uploadedLicenseUrl}
                        alt="License"
                        className="max-h-48 mx-auto rounded"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setUploadedLicense(null);
                          setUploadedLicenseUrl('');
                        }}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-sm text-gray-600 mb-2">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">
                        PNG, JPG up to 5MB
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="license-upload"
                      />
                      <label
                        htmlFor="license-upload"
                        className="mt-3 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700"
                      >
                        Choose File
                      </label>
                    </>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  disabled={!isStep1Valid}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-yellow-900 mb-1">Background Check Required</h3>
                    <p className="text-sm text-yellow-800">
                      As per DOT regulations, all drivers must undergo a background check before transporting passengers.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Birth *
                </label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last 4 Digits of Social Security Number *
                </label>
                <input
                  type="text"
                  value={formData.ssnLast4}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setFormData({ ...formData, ssnLast4: value });
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="1234"
                  maxLength={4}
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  We only store the last 4 digits for verification purposes
                </p>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!formData.dateOfBirth || formData.ssnLast4.length !== 4}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-green-900 mb-1">Almost Done!</h3>
                    <p className="text-sm text-green-800">
                      Please review and accept the terms to complete your onboarding.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="consent-background"
                    checked={formData.consentBackgroundCheck}
                    onChange={(e) => setFormData({ ...formData, consentBackgroundCheck: e.target.checked })}
                    className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <label htmlFor="consent-background" className="text-sm text-gray-700 cursor-pointer">
                    I consent to a background check being conducted as required by DOT regulations and company policy.
                    I understand this may include criminal history, driving record, and employment verification.
                  </label>
                </div>

                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="consent-data"
                    checked={formData.consentDataSharing}
                    onChange={(e) => setFormData({ ...formData, consentDataSharing: e.target.checked })}
                    className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <label htmlFor="consent-data" className="text-sm text-gray-700 cursor-pointer">
                    I consent to the collection and processing of my personal information as described in the privacy policy.
                    I understand my data will be securely stored and used only for employment purposes.
                  </label>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
                <p className="font-medium text-gray-900 mb-2">What happens next:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Your background check will be initiated immediately</li>
                  <li>Results typically take 2-5 business days</li>
                  <li>You'll be notified via email once approved</li>
                  <li>After approval, you can start accepting trip assignments</li>
                </ol>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(2)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!isStep2Valid || loading}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      <span>Complete Onboarding</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
