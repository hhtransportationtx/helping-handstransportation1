import { Radio, User, Circle, Mic, MicOff, Users as UsersIcon } from 'lucide-react';
import { useWebRTCWalkieTalkie } from '../hooks/useWebRTCWalkieTalkie';
import { useEffect, useState } from 'react';

export default function ImprovedDispatcherWalkieTalkie() {
  const {
    onlineUsers,
    isPushingToTalk,
    connectionStatus,
    audioLevel,
    startPushToTalk,
    stopPushToTalk,
  } = useWebRTCWalkieTalkie();

  const [isKeyPressed, setIsKeyPressed] = useState(false);

  const drivers = onlineUsers.filter((u) => u.profiles?.role === 'driver');

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

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online':
        return 'Listening';
      case 'busy':
        return 'Talking';
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
          <h2 className="text-xl font-bold text-gray-900">Push-to-Talk Radio</h2>
          <p className="text-sm text-gray-600">Broadcast to all drivers instantly</p>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className={`w-2.5 h-2.5 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-500' :
            connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
            'bg-gray-400'
          }`} />
          <span className="text-sm text-gray-600 font-medium">
            {connectionStatus === 'connected' ? 'Ready to Broadcast' :
             connectionStatus === 'connecting' ? 'Connecting...' :
             'Disconnected'}
          </span>
        </div>

        <button
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchEnd={handleMouseUp}
          disabled={drivers.length === 0}
          className={`w-full py-8 rounded-2xl transition-all font-bold text-xl flex items-center justify-center gap-4 ${
            isPushingToTalk
              ? 'bg-red-600 text-white shadow-2xl scale-105'
              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg active:scale-95'
          } ${drivers.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isPushingToTalk ? (
            <>
              <Mic className="w-8 h-8 animate-pulse" />
              <span>BROADCASTING TO {drivers.length} DRIVER{drivers.length !== 1 ? 'S' : ''}</span>
            </>
          ) : (
            <>
              <MicOff className="w-8 h-8" />
              <span>HOLD TO BROADCAST</span>
            </>
          )}
        </button>

        {isPushingToTalk && (
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2">
              <Mic className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-600 font-medium">Voice Level</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all duration-100"
                style={{ width: `${audioLevel}%` }}
              />
            </div>
          </div>
        )}

        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-center text-blue-900 font-medium">
            Press and hold SPACE or the button to transmit
          </p>
          <p className="text-xs text-center text-blue-700 mt-1">
            All online drivers will hear your voice in real-time
          </p>
        </div>
      </div>

      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <UsersIcon className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Online Drivers</h3>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            drivers.length > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
          }`}>
            {drivers.length} online
          </span>
        </div>

        {drivers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="font-medium">No drivers online</p>
            <p className="text-sm mt-1">Drivers will appear here when they connect</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {drivers.map((driver) => (
              <div
                key={driver.id}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  driver.status === 'busy'
                    ? 'bg-yellow-50 border-2 border-yellow-300'
                    : 'bg-gray-50 border border-gray-200'
                }`}
              >
                <div className="relative">
                  {driver.profiles?.photo_url ? (
                    <img
                      src={driver.profiles.photo_url}
                      alt={driver.profiles.full_name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                  )}
                  <Circle
                    className={`absolute -bottom-1 -right-1 w-4 h-4 fill-current ${getStatusColor(
                      driver.status
                    )}`}
                  />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">
                    {driver.profiles?.full_name || 'Unknown Driver'}
                  </p>
                  <p className={`text-sm ${getStatusColor(driver.status)}`}>
                    {getStatusText(driver.status)}
                  </p>
                </div>
                {driver.status === 'busy' && (
                  <div className="flex items-center gap-1 text-yellow-600">
                    <Radio className="w-4 h-4 animate-pulse" />
                    <span className="text-xs font-medium">Speaking</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
