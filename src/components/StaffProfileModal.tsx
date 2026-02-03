import { useState, useRef, useEffect } from 'react';
import { FileText, X, RotateCcw, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface StaffProfileModalProps {
  staff: any;
  onClose: () => void;
}

export function StaffProfileModal({ staff, onClose }: StaffProfileModalProps) {
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatureUrl, setSignatureUrl] = useState(staff.signature_url);
  const [isEditing, setIsEditing] = useState(false);
  const [editedStaff, setEditedStaff] = useState(staff);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordMode, setPasswordMode] = useState<'auto' | 'manual'>('auto');
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const handleSignatureSaved = (url: string) => {
    setSignatureUrl(url);
    setShowSignatureModal(false);
  };

  const handleSaveChanges = async () => {
    setSaving(true);
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          first_name: editedStaff.first_name,
          last_name: editedStaff.last_name,
          phone: editedStaff.phone,
          email: editedStaff.email,
          position: editedStaff.position,
          status: editedStaff.status,
          first_start_date: editedStaff.first_start_date,
          date_of_birth: editedStaff.date_of_birth,
        })
        .eq('id', staff.id);

      if (updateError) throw updateError;

      setIsEditing(false);
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to save changes');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedStaff(staff);
    setIsEditing(false);
    setError('');
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleAutoGenerate = () => {
    setPasswordMode('auto');
    setNewPassword(generatePassword());
    setShowPasswordModal(true);
  };

  const handleManualGenerate = () => {
    setPasswordMode('manual');
    setNewPassword('');
    setShowPasswordModal(true);
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setChangingPassword(true);
    setError('');

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/change-user-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: staff.id,
          newPassword: newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change password');
      }

      setShowPasswordModal(false);
      setNewPassword('');
      alert('Password changed successfully');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to change password');
      }
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex items-center justify-between rounded-t-xl">
            <h2 className="text-xl font-bold">Staff Profile</h2>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {staff.photo_url ? (
                    <img
                      src={staff.photo_url}
                      alt={staff.full_name}
                      className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                    />
                  ) : (
                    <img
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(staff.full_name || 'U')}&background=random&size=80`}
                      alt={staff.full_name}
                      className="w-20 h-20 rounded-full"
                    />
                  )}
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-2xl font-bold text-gray-900">{staff.full_name}</h3>
                      {isEditing ? (
                        <select
                          value={editedStaff.status || 'active'}
                          onChange={(e) => setEditedStaff({ ...editedStaff, status: e.target.value })}
                          className="px-3 py-1 text-sm font-medium border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="on_leave">On Leave</option>
                        </select>
                      ) : (
                        <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded capitalize">
                          {staff.status || 'Active'}
                        </span>
                      )}
                    </div>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedStaff.position || editedStaff.role || ''}
                        onChange={(e) => setEditedStaff({ ...editedStaff, position: e.target.value })}
                        className="mt-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        placeholder="Position"
                      />
                    ) : (
                      <p className="text-gray-600">{staff.position || staff.role || 'Staff'}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <button
                        onClick={handleCancelEdit}
                        disabled={saving}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveChanges}
                        disabled={saving}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Edit profile
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2 bg-white border border-gray-200 rounded-lg p-6">
                <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                  <div>
                    <span className="text-gray-500 block mb-1">First Name</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedStaff.first_name || ''}
                        onChange={(e) => setEditedStaff({ ...editedStaff, first_name: e.target.value })}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-gray-900 font-medium">{staff.first_name || staff.full_name?.split(' ')[0] || 'N/A'}</p>
                    )}
                  </div>
                  <div>
                    <span className="text-gray-500 block mb-1">Last Name</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedStaff.last_name || ''}
                        onChange={(e) => setEditedStaff({ ...editedStaff, last_name: e.target.value })}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-gray-900 font-medium">{staff.last_name || staff.full_name?.split(' ').slice(1).join(' ') || 'N/A'}</p>
                    )}
                  </div>
                  <div>
                    <span className="text-gray-500 block mb-1">Email</span>
                    {isEditing ? (
                      <input
                        type="email"
                        value={editedStaff.email || ''}
                        onChange={(e) => setEditedStaff({ ...editedStaff, email: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-gray-900 font-medium text-xs break-all">{staff.email || 'N/A'}</p>
                    )}
                  </div>
                  <div>
                    <span className="text-gray-500 block mb-1">Phone</span>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={editedStaff.phone || ''}
                        onChange={(e) => setEditedStaff({ ...editedStaff, phone: e.target.value })}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-gray-900 font-medium">{staff.phone || 'N/A'}</p>
                    )}
                  </div>
                  <div>
                    <span className="text-gray-500">Role</span>
                    <p className="text-gray-900 font-medium capitalize">{staff.role || 'Staff'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Code</span>
                    <p className="text-gray-900 font-medium">{staff.staff?.code || staff.code || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Employee ID</span>
                    <p className="text-gray-900 font-medium">{staff.employee_id || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 block mb-1">Date of Birth</span>
                    {isEditing ? (
                      <input
                        type="date"
                        value={editedStaff.date_of_birth || ''}
                        onChange={(e) => setEditedStaff({ ...editedStaff, date_of_birth: e.target.value })}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-gray-900 font-medium">
                        {staff.date_of_birth ? new Date(staff.date_of_birth).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : 'N/A'}
                      </p>
                    )}
                  </div>
                  <div>
                    <span className="text-gray-500 block mb-1">First Start Date</span>
                    {isEditing ? (
                      <input
                        type="date"
                        value={editedStaff.first_start_date || ''}
                        onChange={(e) => setEditedStaff({ ...editedStaff, first_start_date: e.target.value })}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-gray-900 font-medium">
                        {staff.first_start_date ? new Date(staff.first_start_date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : 'N/A'}
                      </p>
                    )}
                  </div>
                  <div>
                    <span className="text-gray-500">Start Date</span>
                    <p className="text-gray-900 font-medium">
                      {staff.start_date ? new Date(staff.start_date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : 'N/A'}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500">Status</span>
                    <p className="text-gray-900 font-medium capitalize">{staff.status || 'Active'}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Change Password</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAutoGenerate}
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Auto Generate
                    </button>
                    <button
                      onClick={handleManualGenerate}
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Manual Generate
                    </button>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Signature</h3>
                    <button
                      onClick={() => setShowSignatureModal(true)}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {signatureUrl ? 'Update' : 'Add/Update'}
                    </button>
                  </div>
                  {signatureUrl ? (
                    <img src={signatureUrl} alt="Signature" className="w-full h-24 object-contain border border-gray-200 rounded bg-white" />
                  ) : (
                    <div className="w-full h-24 border-2 border-dashed border-gray-300 rounded flex items-center justify-center">
                      <div className="text-center">
                        <FileText className="w-8 h-8 text-gray-400 mx-auto mb-1" />
                        <p className="text-sm text-gray-500">No signature</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Shift (Day Wise)</h3>
                  <div className="space-y-2 text-sm">
                    {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => (
                      <div key={day} className="flex justify-between items-center">
                        <span className="text-blue-600 font-medium">{day}</span>
                        <span className="text-gray-600">00:00 - 23:59</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showSignatureModal && (
        <StaffSignatureModal
          staffId={staff.id}
          staffName={staff.full_name}
          existingSignature={signatureUrl}
          onClose={() => setShowSignatureModal(false)}
          onSave={handleSignatureSaved}
        />
      )}

      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Change Password</h2>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setNewPassword('');
                  setError('');
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {passwordMode === 'auto' ? 'Generated Password' : 'New Password'}
                  </label>
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    readOnly={passwordMode === 'auto'}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                    placeholder={passwordMode === 'manual' ? 'Enter new password' : ''}
                  />
                  {passwordMode === 'auto' && (
                    <p className="text-xs text-gray-500 mt-1">
                      Copy this password and share it securely with the staff member
                    </p>
                  )}
                </div>

                {passwordMode === 'auto' && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(newPassword);
                      alert('Password copied to clipboard');
                    }}
                    className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Copy Password
                  </button>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowPasswordModal(false);
                      setNewPassword('');
                      setError('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleChangePassword}
                    disabled={changingPassword || !newPassword}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {changingPassword ? 'Changing...' : 'Change Password'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

interface StaffSignatureModalProps {
  staffId: string;
  staffName: string;
  existingSignature?: string;
  onClose: () => void;
  onSave: (signatureUrl: string) => void;
}

function StaffSignatureModal({ staffId, staffName, existingSignature, onClose, onSave }: StaffSignatureModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (existingSignature) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width / 2, canvas.height / 2);
        setHasDrawn(true);
      };
      img.src = existingSignature;
    }
  }, [existingSignature]);

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

  async function handleSaveSignature() {
    if (!hasDrawn) {
      setError('Please provide a signature');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    setSaving(true);
    setError('');

    try {
      const signatureData = canvas.toDataURL('image/png');

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          signature_url: signatureData,
          signature_created_at: new Date().toISOString(),
        })
        .eq('id', staffId);

      if (updateError) throw updateError;

      onSave(signatureData);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to save signature');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Staff Signature</h2>
            <p className="text-sm text-gray-600 mt-1">{staffName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                Sign Below
              </label>
              <button
                onClick={clearSignature}
                className="flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Clear
              </button>
            </div>

            <div className="bg-white border-2 border-gray-300 rounded-lg overflow-hidden" style={{ height: '300px' }}>
              <canvas
                ref={canvasRef}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                className="w-full h-full touch-none cursor-crosshair"
                style={{ touchAction: 'none' }}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSignature}
                disabled={saving || !hasDrawn}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <Check className="w-5 h-5 mr-2" />
                {saving ? 'Saving...' : 'Save Signature'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
