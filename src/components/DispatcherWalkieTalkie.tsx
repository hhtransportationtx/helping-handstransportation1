import { Radio, PhoneCall, PhoneOff, User, Circle } from 'lucide-react';
import { useWalkieTalkieSimple } from '../hooks/useWalkieTalkieSimple';

export default function DispatcherWalkieTalkie() {
  const {
    onlineUsers,
    isInCall,
    activeCallWith,
    incomingCall,
    callStatus,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
  } = useWalkieTalkieSimple();

  const drivers = onlineUsers.filter((u) => u.profiles?.role === 'driver');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'text-green-500';
      case 'busy':
        return 'text-red-500 animate-pulse';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online':
        return 'Available';
      case 'busy':
        return 'On Call';
      default:
        return 'Offline';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
          <Radio className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Walkie Talkie</h2>
          <p className="text-sm text-gray-600">Talk to drivers instantly</p>
        </div>
      </div>

      {incomingCall && (
        <div className="mb-4 p-4 bg-blue-50 border-2 border-blue-300 rounded-lg animate-pulse">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-blue-900">Incoming Call</p>
              <p className="text-sm text-blue-700">{incomingCall.fromName}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={acceptCall}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <PhoneCall className="w-4 h-4" />
                Accept
              </button>
              <button
                onClick={rejectCall}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <PhoneOff className="w-4 h-4" />
                Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {activeCallWith && (
        <div className="mb-4 p-4 bg-green-50 border-2 border-green-300 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                <Radio className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div>
                <p className="font-semibold text-green-900">
                  {callStatus || 'Connected'}
                </p>
                <p className="text-sm text-green-700">
                  {onlineUsers.find((u) => u.user_id === activeCallWith)?.profiles?.full_name || 'Driver'}
                </p>
              </div>
            </div>
            <button
              onClick={endCall}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <PhoneOff className="w-4 h-4" />
              End Call
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">Online Drivers</h3>
          <span className="text-sm text-gray-600">{drivers.length} online</span>
        </div>

        {drivers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No drivers online</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {drivers.map((driver) => (
              <div
                key={driver.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    {driver.profiles?.photo_url ? (
                      <img
                        src={driver.profiles.photo_url}
                        alt={driver.profiles.full_name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                    )}
                    <Circle
                      className={`absolute -bottom-1 -right-1 w-4 h-4 fill-current ${getStatusColor(
                        driver.status
                      )}`}
                    />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{driver.profiles?.full_name || 'Unknown Driver'}</p>
                    <p className={`text-xs ${getStatusColor(driver.status)}`}>
                      {getStatusText(driver.status)}
                    </p>
                  </div>
                </div>

                {!activeCallWith && driver.status === 'online' && (
                  <button
                    onClick={() => startCall(driver.user_id)}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
                  >
                    <PhoneCall className="w-4 h-4" />
                    Call
                  </button>
                )}

                {activeCallWith === driver.user_id && (
                  <span className="px-3 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium flex items-center gap-2">
                    <Radio className="w-4 h-4 animate-pulse" />
                    Active
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-semibold text-gray-900 mb-2">How to Use</h4>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• Click "Call" to connect via phone call with a driver</li>
          <li>• Drivers must have phone numbers in their profiles</li>
          <li>• Calls are routed through Twilio Voice</li>
          <li>• Click "End Call" to disconnect</li>
        </ul>
      </div>
    </div>
  );
}
