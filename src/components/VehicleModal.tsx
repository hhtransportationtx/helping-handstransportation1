import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Car, ChevronDown, ChevronUp } from 'lucide-react';

interface VehicleModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export function VehicleModal({ onClose, onSuccess }: VehicleModalProps) {
  const [formData, setFormData] = useState({
    vehicle_number: '',
    rig_no: '',
    vehicle_name: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    license_plate: '',
    type: 'sedan',
    space_type: '',
    body_type: '',
    capacity: 4,
    status: 'available',
    vin: '',
    color: '',
    fuel_type: 'Petrol',
    gas_card_number: '',
    current_meter: 0,
    level_of_service: '',
    service_areas: [] as string[],
    equipments: [] as string[],
    funding_sources: [] as string[],
    limitation: '',
    notes: '',
    width_mm: undefined as number | undefined,
    height_mm: undefined as number | undefined,
    length_mm: undefined as number | undefined,
    ground_clearance_mm: undefined as number | undefined,
    bed_length_mm: undefined as number | undefined,
    ramp_width_mm: undefined as number | undefined,
    owner_name: '',
    owner_address: '',
    owner_phone: '',
    owner_business_number: '',
    owner_license_number: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDimensions, setShowDimensions] = useState(false);
  const [showOwnerDetails, setShowOwnerDetails] = useState(false);

  const [availableSpaceTypes, setAvailableSpaceTypes] = useState<Array<{id: string, name: string}>>([]);
  const [availableEquipments, setAvailableEquipments] = useState<Array<{id: string, name: string}>>([]);
  const [availableServiceAreas, setAvailableServiceAreas] = useState<Array<{id: string, name: string}>>([]);
  const [availableFundingSources, setAvailableFundingSources] = useState<Array<{id: string, name: string}>>([]);

  useEffect(() => {
    loadOptions();
  }, []);

  async function loadOptions() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) return;

    const [spaceTypes, equipments, serviceAreas, fundingSources] = await Promise.all([
      supabase.from('space_types').select('id, name').eq('status', 'active').eq('company_id', profile.company_id),
      supabase.from('equipments').select('id, name').eq('status', 'active').eq('company_id', profile.company_id),
      supabase.from('service_areas').select('id, name').eq('status', 'active').eq('company_id', profile.company_id),
      supabase.from('funding_sources').select('id, name').eq('status', 'active').eq('company_id', profile.company_id),
    ]);

    if (spaceTypes.data) setAvailableSpaceTypes(spaceTypes.data);
    if (equipments.data) setAvailableEquipments(equipments.data);
    if (serviceAreas.data) setAvailableServiceAreas(serviceAreas.data);
    if (fundingSources.data) setAvailableFundingSources(fundingSources.data);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) throw new Error('No company associated with user');

      const { error: insertError } = await supabase
        .from('vehicles')
        .insert([{ ...formData, company_id: profile.company_id }]);

      if (insertError) throw insertError;

      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleArrayItem = (array: string[], item: string) => {
    if (array.includes(item)) {
      return array.filter(i => i !== item);
    } else {
      return [...array, item];
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Car className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Add Vehicle</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rig No. <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.rig_no}
                onChange={(e) => setFormData({ ...formData, rig_no: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., BatMobile"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service Area(s)
              </label>
              <div className="relative">
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      setFormData({
                        ...formData,
                        service_areas: toggleArrayItem(formData.service_areas, e.target.value)
                      });
                    }
                  }}
                >
                  <option value="">Select service areas...</option>
                  {availableServiceAreas.map(area => (
                    <option key={area.id} value={area.name}>
                      {area.name} {formData.service_areas.includes(area.name) ? '✓' : ''}
                    </option>
                  ))}
                </select>
              </div>
              {formData.service_areas.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {formData.service_areas.map(area => (
                    <span key={area} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                      {area}
                      <button
                        type="button"
                        onClick={() => setFormData({
                          ...formData,
                          service_areas: formData.service_areas.filter(a => a !== area)
                        })}
                        className="hover:text-blue-900"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Level of Service
              </label>
              <select
                value={formData.level_of_service}
                onChange={(e) => setFormData({ ...formData, level_of_service: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select...</option>
                <option value="WAV">WAV</option>
                <option value="AMB">AMB</option>
                <option value="BLS">BLS</option>
                <option value="ALS">ALS</option>
                <option value="CCT">CCT</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Space Type
              </label>
              <select
                value={formData.space_type}
                onChange={(e) => setFormData({ ...formData, space_type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select...</option>
                {availableSpaceTypes.map(type => (
                  <option key={type.id} value={type.name}>{type.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Body Type
              </label>
              <select
                value={formData.body_type}
                onChange={(e) => setFormData({ ...formData, body_type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select...</option>
                <option value="Full Cut">Full Cut</option>
                <option value="Mid Cut">Mid Cut</option>
                <option value="Mini Cut">Mini Cut</option>
                <option value="Standard">Standard</option>
                <option value="Extended">Extended</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Equipments
              </label>
              <div className="relative">
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      setFormData({
                        ...formData,
                        equipments: toggleArrayItem(formData.equipments, e.target.value)
                      });
                    }
                  }}
                >
                  <option value="">Select equipment...</option>
                  {availableEquipments.map(eq => (
                    <option key={eq.id} value={eq.name}>
                      {eq.name} {formData.equipments.includes(eq.name) ? '✓' : ''}
                    </option>
                  ))}
                </select>
              </div>
              {formData.equipments.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {formData.equipments.map(eq => (
                    <span key={eq} className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                      {eq}
                      <button
                        type="button"
                        onClick={() => setFormData({
                          ...formData,
                          equipments: formData.equipments.filter(e => e !== eq)
                        })}
                        className="hover:text-green-900"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Capacity
              </label>
              <input
                type="number"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="1"
                max="20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Funding Sources
              </label>
              <div className="relative">
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      setFormData({
                        ...formData,
                        funding_sources: toggleArrayItem(formData.funding_sources, e.target.value)
                      });
                    }
                  }}
                >
                  <option value="">Select funding sources...</option>
                  {availableFundingSources.map(fs => (
                    <option key={fs.id} value={fs.name}>
                      {fs.name} {formData.funding_sources.includes(fs.name) ? '✓' : ''}
                    </option>
                  ))}
                </select>
              </div>
              {formData.funding_sources.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {formData.funding_sources.slice(0, 2).map(fs => (
                    <span key={fs} className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                      {fs}
                      <button
                        type="button"
                        onClick={() => setFormData({
                          ...formData,
                          funding_sources: formData.funding_sources.filter(f => f !== fs)
                        })}
                        className="hover:text-purple-900"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {formData.funding_sources.length > 2 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                      +{formData.funding_sources.length - 2} more
                    </span>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                VIN
              </label>
              <input
                type="text"
                value={formData.vin}
                onChange={(e) => setFormData({ ...formData, vin: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Vehicle Identification Number"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                License Plate <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.license_plate}
                onChange={(e) => setFormData({ ...formData, license_plate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., BATMOBILE"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Meter
              </label>
              <input
                type="number"
                value={formData.current_meter}
                onChange={(e) => setFormData({ ...formData, current_meter: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Odometer reading"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Year <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="1900"
                max={new Date().getFullYear() + 1}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Make & Model <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={`${formData.make} ${formData.model}`.trim()}
                onChange={(e) => {
                  const parts = e.target.value.split(' ');
                  setFormData({
                    ...formData,
                    make: parts[0] || '',
                    model: parts.slice(1).join(' ') || ''
                  });
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Ford Transit Connect"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color
              </label>
              <input
                type="text"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Black"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fuel Type
              </label>
              <select
                value={formData.fuel_type}
                onChange={(e) => setFormData({ ...formData, fuel_type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Petrol">Petrol</option>
                <option value="Diesel">Diesel</option>
                <option value="Electric">Electric</option>
                <option value="Hybrid">Hybrid</option>
                <option value="CNG">CNG</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gas Card Number
              </label>
              <input
                type="text"
                value={formData.gas_card_number}
                onChange={(e) => setFormData({ ...formData, gas_card_number: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="N/A"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="active">Active</option>
                <option value="available">Available</option>
                <option value="in_use">In Use</option>
                <option value="maintenance">Maintenance</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vehicle Number
              </label>
              <input
                type="text"
                value={formData.vehicle_number}
                onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Internal ID"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Limitation
              </label>
              <textarea
                value={formData.limitation}
                onChange={(e) => setFormData({ ...formData, limitation: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Any vehicle limitations..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Additional notes..."
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <button
              type="button"
              onClick={() => setShowDimensions(!showDimensions)}
              className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              {showDimensions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Dimensions
            </button>

            {showDimensions && (
              <div className="mt-4 grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Width (mm)
                  </label>
                  <input
                    type="number"
                    value={formData.width_mm || ''}
                    onChange={(e) => setFormData({ ...formData, width_mm: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Height (mm)
                  </label>
                  <input
                    type="number"
                    value={formData.height_mm || ''}
                    onChange={(e) => setFormData({ ...formData, height_mm: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Length (mm)
                  </label>
                  <input
                    type="number"
                    value={formData.length_mm || ''}
                    onChange={(e) => setFormData({ ...formData, length_mm: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ground Clearance (mm)
                  </label>
                  <input
                    type="number"
                    value={formData.ground_clearance_mm || ''}
                    onChange={(e) => setFormData({ ...formData, ground_clearance_mm: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bed Length (mm)
                  </label>
                  <input
                    type="number"
                    value={formData.bed_length_mm || ''}
                    onChange={(e) => setFormData({ ...formData, bed_length_mm: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ramp Width (mm)
                  </label>
                  <input
                    type="number"
                    value={formData.ramp_width_mm || ''}
                    onChange={(e) => setFormData({ ...formData, ramp_width_mm: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="border-t pt-4">
            <button
              type="button"
              onClick={() => setShowOwnerDetails(!showOwnerDetails)}
              className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              {showOwnerDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Owner Details
            </button>

            {showOwnerDetails && (
              <div className="mt-4 grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    value={formData.owner_name}
                    onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <input
                    type="text"
                    value={formData.owner_address}
                    onChange={(e) => setFormData({ ...formData, owner_address: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.owner_phone}
                    onChange={(e) => setFormData({ ...formData, owner_phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Number
                  </label>
                  <input
                    type="text"
                    value={formData.owner_business_number}
                    onChange={(e) => setFormData({ ...formData, owner_business_number: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    License Number
                  </label>
                  <input
                    type="text"
                    value={formData.owner_license_number}
                    onChange={(e) => setFormData({ ...formData, owner_license_number: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Adding Vehicle...' : 'Add Vehicle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
