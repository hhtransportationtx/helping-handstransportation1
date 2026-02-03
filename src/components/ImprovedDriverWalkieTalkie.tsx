import { Radio, User, Circle, Mic, MicOff, Users as UsersIcon } from 'lucide-react';
import { useWebRTCWalkieTalkie } from '../hooks/useWebRTCWalkieTalkie';
import { useEffect, useState } from 'react';

export default function ImprovedDriverWalkieTalkie() {
  const {
    onlineUsers,
    isPushingToTalk,
    connectionStatus,
    audioLevel,
    startPushToTalk,
    stopPushToTalk,
  } = useWebRTCWalkieTalkie();

  const [isKeyPressed, setIsKeyPressed] = useState(false);

  const dispatchers = onlineUsers.filter(
    (u) => u.profiles?.role === 'dispatcher' || u.profiles?.role === 'admin'
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isKeyPressed && !isPushingToTalk) {
        e.preventDefault();
        setIsKeyPressed(true);
        startPushToTalk();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isKeyPressed) {
        e.preventDefault();
        setIsKeyPressed(false);
        stopPushToTalk();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isKeyPressed, isPushingToTalk, startPushToTalk, stopPushToTalk]);

  const handleMouseDown = () => {
    startPushToTalk();
  };

  const handleMouseUp = () => {
    stopPushToTalk();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'text-green-500';
      case 'busy':
        return 'text-yellow-500 animate-pulse';
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
          <h2 className="text-lg font-bold text-gray-900">Push-to-Talk Radio</h2>
          <p className="text-xs text-gray-600">{dispatchers.length} dispatchers online</p>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className={`w-2 h-2 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-500' :
            connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
            'bg-gray-400'
          }`} />
          <span className="text-xs text-gray-600">
            {connectionStatus === 'connected' ? 'Connected' :
             connectionStatus === 'connecting' ? 'Connecting...' :
             'Disconnected'}
          </span>
        </div>

        <button
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchEnd={handleMouseUp}
          disabled={dispatchers.length === 0}
          className={`w-full py-6 rounded-xl transition-all font-bold text-lg flex items-center justify-center gap-3 ${
            isPushingToTalk
              ? 'bg-red-600 text-white shadow-xl scale-105'
              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md active:scale-95'
          } ${dispatchers.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isPushingToTalk ? (
            <>
              <Mic className="w-6 h-6 animate-pulse" />
              <span>TRANSMITTING</span>
            </>
          ) : (
            <>
              <MicOff className="w-6 h-6" />
              <span>HOLD TO TALK</span>
            </>
          )}
        </button>

        {isPushingToTalk && (
          <div className="mt-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-gray-600">Audio Level</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all duration-100"
                style={{ width: `${audioLevel}%` }}
              />
            </div>
          </div>
        )}

        <p className="text-xs text-center text-gray-500 mt-3">
          Press and hold SPACE or the button to transmit
        </p>
      </div>

      <div className="border-t pt-4">
        <div className="flex items-center gap-2 mb-3">
          <UsersIcon className="w-4 h-4 text-gray-600" />
          <h3 className="text-sm font-semibold text-gray-900">
            Available Dispatchers
          </h3>
        </div>

        {dispatchers.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            <p className="text-sm">No dispatchers online</p>
            <p className="text-xs mt-1">Wait for a dispatcher to come online</p>
          </div>
        ) : (
          <div className="space-y-2">
            {dispatchers.map((dispatcher) => (
              <div
                key={dispatcher.id}
                className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
              >
                <div className="relative">
                  {dispatcher.profiles?.photo_url ? (
                    <img
                      src={dispatcher.profiles.photo_url}
                      alt={dispatcher.profiles.full_name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <Circle
                    className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 fill-current ${getStatusColor(
                      dispatcher.status
                    )}`}
                  />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {dispatcher.profiles?.full_name || 'Unknown'}
                  </p>
                  <p className="text-xs text-gray-600">
                    {dispatcher.status === 'busy' ? 'Talking' : 'Listening'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
