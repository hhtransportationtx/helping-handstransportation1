import { FarmoutTrip, Trip } from '../lib/supabase';
import { X, MapPin } from 'lucide-react';

interface FarmoutDetailModalProps {
  farmoutTrip: FarmoutTrip & { trips?: Trip & { patients?: { full_name: string; phone: string } } };
  onClose: () => void;
  onFarmOut?: () => void;
}

export function FarmoutDetailModal({ farmoutTrip, onClose, onFarmOut }: FarmoutDetailModalProps) {
  const trip = farmoutTrip.trips;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Details</h2>
          <div className="flex items-center gap-3">
            {onFarmOut && (
              <button
                onClick={onFarmOut}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors"
              >
                Farm out
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <div className="mb-6">
                <div className="flex items-start gap-2 mb-3">
                  <MapPin className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900">{trip?.pickup_address || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-5 h-5 text-red-600 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900">{trip?.dropoff_address || 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center mb-6">
                <p className="text-gray-500">Map View</p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Cancellation Info</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Cancellation Type</span>
                    <span className="text-sm font-medium text-gray-900">
                      {farmoutTrip.cancellation_type || 'UNKNOWN'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Time Stamp</span>
                    <span className="text-sm font-medium text-gray-900">
                      {farmoutTrip.cancellation_time
                        ? new Date(farmoutTrip.cancellation_time).toLocaleString()
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Wait Time Minutes</span>
                    <span className="text-sm font-medium text-gray-900">{farmoutTrip.wait_time_minutes || 0}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Level of Service Information</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Vehicle Type</span>
                    <span className="text-sm font-medium text-gray-900">{farmoutTrip.vehicle_type || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Product ID</span>
                    <span className="text-sm font-medium text-gray-900">{farmoutTrip.product_id || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Vehicle Information</h3>
                <div className="space-y-3">
                  {farmoutTrip.vehicle_image_url && (
                    <div className="bg-gray-100 rounded h-24 flex items-center justify-center">
                      <p className="text-sm text-gray-500">Vehicle Image</p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">License Plate</span>
                      <span className="text-sm font-medium text-gray-900">{farmoutTrip.license_plate || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Vehicle Color</span>
                      <span className="text-sm font-medium text-gray-900">{farmoutTrip.vehicle_color || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Vehicle Make</span>
                      <span className="text-sm font-medium text-gray-900">{farmoutTrip.vehicle_make || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Vehicle Model</span>
                      <span className="text-sm font-medium text-gray-900">{farmoutTrip.vehicle_model || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Fare Estimation</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Value</span>
                    <span className="text-sm font-medium text-gray-900">
                      {farmoutTrip.trip_fare ? `$${farmoutTrip.trip_fare.toFixed(2)}` : '$N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Currency Code</span>
                    <span className="text-sm font-medium text-gray-900">USD</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Other Information</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Distance</span>
                    <span className="text-sm font-medium text-gray-900">
                      {farmoutTrip.distance ? `${farmoutTrip.distance} mi` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Duration</span>
                    <span className="text-sm font-medium text-gray-900">{farmoutTrip.duration || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-900 mb-3">General Information</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Request Id</span>
                    <span className="text-sm font-medium text-gray-900">{farmoutTrip.request_id || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Request Time</span>
                    <span className="text-sm font-medium text-gray-900">
                      {trip?.scheduled_pickup_time
                        ? new Date(trip.scheduled_pickup_time).toLocaleString()
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Status</span>
                    <span className="text-sm font-medium text-gray-900">
                      {farmoutTrip.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Expense Memo</span>
                    <span className="text-sm font-medium text-gray-900">{farmoutTrip.expense_memo || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Is Eligible For Refund</span>
                    <span className="text-sm font-medium text-gray-900">
                      {farmoutTrip.is_eligible_for_refund ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Passenger Information</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Passenger Name</span>
                    <span className="text-sm font-medium text-gray-900">
                      {trip?.patients?.full_name || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Phone Number</span>
                    <span className="text-sm font-medium text-gray-900">{trip?.patients?.phone || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Guest ID</span>
                    <span className="text-sm font-medium text-gray-900">{farmoutTrip.guest_id || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {farmoutTrip.driver_name && (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Driver Information</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Driver Name</span>
                      <span className="text-sm font-medium text-gray-900">{farmoutTrip.driver_name}</span>
                    </div>
                    {farmoutTrip.driver_phone && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Driver Phone</span>
                        <span className="text-sm font-medium text-gray-900">{farmoutTrip.driver_phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <button className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                View Receipt
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
