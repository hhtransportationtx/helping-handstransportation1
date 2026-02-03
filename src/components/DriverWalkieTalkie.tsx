import { Radio, PhoneCall, PhoneOff, User, Circle } from 'lucide-react';
import { useWalkieTalkieSimple } from '../hooks/useWalkieTalkieSimple';

export default function DriverWalkieTalkie() {
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

  const dispatchers = onlineUsers.filter(
    (u) => u.profiles?.role === 'dispatcher' || u.profiles?.role === 'admin'
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'text-green-500';
      case 'talking':
        return 'text-red-500 animate-pulse';
      case 'listening':
        return 'text-yellow-500';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
          <Radio className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Radio</h2>
          <p className="text-xs text-gray-600">{dispatchers.length} dispatchers online</p>
        </div>
      </div>

      {incomingCall && (
        <div className="mb-4 p-4 bg-blue-50 border-2 border-blue-300 rounded-lg animate-pulse">
          <div className="flex flex-col gap-3">
            <div>
              <p className="font-semibold text-blue-900">Incoming Call</p>
              <p className="text-sm text-blue-700">{incomingCall.fromName}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={acceptCall}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 font-semibold"
              >
                <PhoneCall className="w-5 h-5" />
                Accept
              </button>
              <button
                onClick={rejectCall}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 font-semibold"
              >
                <PhoneOff className="w-5 h-5" />
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
              <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                <Radio className="w-6 h-6 text-white animate-pulse" />
              </div>
              <div>
                <p className="font-bold text-green-900 text-lg">
                  {callStatus || 'Connected'}
                </p>
                <p className="text-sm text-green-700">
                  {onlineUsers.find((u) => u.user_id === activeCallWith)?.profiles?.full_name || 'Dispatcher'}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={endCall}
            className="w-full mt-3 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 font-semibold"
          >
            <PhoneOff className="w-5 h-5" />
            End Call
          </button>
        </div>
      )}

      {!activeCallWith && !incomingCall && (
        <div className="space-y-2">
          {dispatchers.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              <p className="text-sm">No dispatchers online</p>
            </div>
          ) : (
            <div className="space-y-2">
              {dispatchers.map((dispatcher) => (
                <button
                  key={dispatcher.id}
                  onClick={() => startCall(dispatcher.user_id)}
                  className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors border border-gray-200 hover:border-blue-300"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {dispatcher.profiles?.photo_url ? (
                        <img
                          src={dispatcher.profiles.photo_url}
                          alt={dispatcher.profiles.full_name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-white" />
                        </div>
                      )}
                      <Circle
                        className={`absolute -bottom-1 -right-1 w-4 h-4 fill-current ${getStatusColor(
                          dispatcher.status
                        )}`}
                      />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">
                        {dispatcher.profiles?.full_name || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-600">
                        {dispatcher.status === 'busy'
                          ? 'On another call'
                          : 'Available'}
                      </p>
                    </div>
                  </div>
                  {dispatcher.status === 'online' && (
                    <div className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm font-medium flex items-center gap-2">
                      <PhoneCall className="w-4 h-4" />
                      Call
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
