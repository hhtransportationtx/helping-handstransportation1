import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Mic, MicOff, Radio, Users, ChevronDown, Settings } from 'lucide-react';

interface Group {
  id: string;
  name: string;
  color: string;
  description: string;
  member_count: number;
}

interface Participant {
  id: string;
  name: string;
  role: string;
  speaking: boolean;
}

export default function GroupWalkieTalkie({ onManageGroups }: { onManageGroups?: () => void }) {
  const { profile } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showGroupSelector, setShowGroupSelector] = useState(false);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [error, setError] = useState<string | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const realtimeChannelRef = useRef<any>(null);
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  useEffect(() => {
    if (profile?.company_id) {
      loadGroups();
      initializeAudio();
    }

    return () => {
      cleanup();
    };
  }, [profile?.company_id]);

  useEffect(() => {
    if (selectedGroup) {
      joinChannel(selectedGroup.id);
    }

    return () => {
      if (realtimeChannelRef.current) {
        realtimeChannelRef.current.unsubscribe();
      }
    };
  }, [selectedGroup]);

  const loadGroups = async () => {
    if (!profile?.company_id) return;

    try {
      const { data: memberData, error } = await supabase
        .from('walkie_talkie_group_members')
        .select(`
          group_id,
          walkie_talkie_groups (
            id,
            name,
            description,
            color
          )
        `)
        .eq('user_id', profile.id);

      if (error) throw error;

      const userGroups = memberData
        ?.map((m: any) => m.walkie_talkie_groups)
        .filter((g: any) => g !== null) || [];

      setGroups(userGroups);

      if (userGroups.length > 0 && !selectedGroup) {
        setSelectedGroup(userGroups[0]);
      }
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  };

  const initializeAudio = async () => {
    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      localStreamRef.current = stream;
      stream.getTracks().forEach(track => track.enabled = false);
    } catch (err) {
      console.error('Error initializing audio:', err);
      setError('Microphone access denied. Please enable microphone permissions.');
    }
  };

  const joinChannel = (groupId: string) => {
    if (!profile?.company_id) return;

    const channelName = `walkie-talkie-${profile.company_id}-${groupId}`;

    realtimeChannelRef.current = supabase.channel(channelName, {
      config: {
        broadcast: { self: true }
      }
    });

    realtimeChannelRef.current
      .on('broadcast', { event: 'user-joined' }, ({ payload }: any) => {
        handleUserJoined(payload);
      })
      .on('broadcast', { event: 'user-left' }, ({ payload }: any) => {
        handleUserLeft(payload);
      })
      .on('broadcast', { event: 'audio-start' }, ({ payload }: any) => {
        handleAudioStart(payload);
      })
      .on('broadcast', { event: 'audio-stop' }, ({ payload }: any) => {
        handleAudioStop(payload);
      })
      .on('broadcast', { event: 'audio-chunk' }, ({ payload }: any) => {
        handleAudioChunk(payload);
      })
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          broadcastUserJoined();
          updateActiveStatus(groupId, true);
        }
      });
  };

  const updateActiveStatus = async (groupId: string, isActive: boolean) => {
    try {
      await supabase
        .from('walkie_talkie_group_members')
        .update({
          is_active: isActive,
          last_active_at: new Date().toISOString()
        })
        .eq('group_id', groupId)
        .eq('user_id', profile?.id);
    } catch (error) {
      console.error('Error updating active status:', error);
    }
  };

  const broadcastUserJoined = () => {
    if (!realtimeChannelRef.current || !profile) return;

    realtimeChannelRef.current.send({
      type: 'broadcast',
      event: 'user-joined',
      payload: {
        userId: profile.id,
        name: profile.full_name,
        role: profile.role
      }
    });
  };

  const handleUserJoined = (payload: any) => {
    if (payload.userId === profile?.id) return;

    setParticipants(prev => {
      if (prev.find(p => p.id === payload.userId)) return prev;
      return [...prev, {
        id: payload.userId,
        name: payload.name,
        role: payload.role,
        speaking: false
      }];
    });
  };

  const handleUserLeft = (payload: any) => {
    setParticipants(prev => prev.filter(p => p.id !== payload.userId));
    stopPlayingAudio(payload.userId);
  };

  const handleAudioStart = (payload: any) => {
    if (payload.userId === profile?.id) return;

    setParticipants(prev =>
      prev.map(p => p.id === payload.userId ? { ...p, speaking: true } : p)
    );
  };

  const handleAudioStop = (payload: any) => {
    if (payload.userId === profile?.id) return;

    setParticipants(prev =>
      prev.map(p => p.id === payload.userId ? { ...p, speaking: false } : p)
    );

    stopPlayingAudio(payload.userId);
  };

  const handleAudioChunk = async (payload: any) => {
    if (payload.userId === profile?.id) return;
    if (!audioContextRef.current) return;

    try {
      const audioData = Uint8Array.from(atob(payload.audioData), c => c.charCodeAt(0));
      const audioBuffer = await audioContextRef.current.decodeAudioData(audioData.buffer);

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.start(0);
    } catch (err) {
      console.error('Error playing audio chunk:', err);
    }
  };

  const stopPlayingAudio = (userId: string) => {
    const audioElement = audioElementsRef.current.get(userId);
    if (audioElement) {
      audioElement.pause();
      audioElement.srcObject = null;
      audioElementsRef.current.delete(userId);
    }
  };

  const startTransmitting = async () => {
    if (!localStreamRef.current || !realtimeChannelRef.current || !profile) return;

    try {
      localStreamRef.current.getTracks().forEach(track => track.enabled = true);
      setIsTransmitting(true);
      setError(null);

      realtimeChannelRef.current.send({
        type: 'broadcast',
        event: 'audio-start',
        payload: {
          userId: profile.id,
          name: profile.full_name
        }
      });

      startStreamingAudio();
    } catch (err) {
      console.error('Error starting transmission:', err);
      setError('Failed to start transmission');
    }
  };

  const stopTransmitting = () => {
    if (!localStreamRef.current || !realtimeChannelRef.current || !profile) return;

    localStreamRef.current.getTracks().forEach(track => track.enabled = false);
    setIsTransmitting(false);

    realtimeChannelRef.current.send({
      type: 'broadcast',
      event: 'audio-stop',
      payload: {
        userId: profile.id
      }
    });
  };

  const startStreamingAudio = () => {
    if (!localStreamRef.current || !audioContextRef.current || !realtimeChannelRef.current) return;

    const mediaStreamSource = audioContextRef.current.createMediaStreamSource(localStreamRef.current);
    const scriptProcessor = audioContextRef.current.createScriptProcessor(4096, 1, 1);

    mediaStreamSource.connect(scriptProcessor);
    scriptProcessor.connect(audioContextRef.current.destination);

    scriptProcessor.onaudioprocess = (e) => {
      if (!isTransmitting) return;

      const inputData = e.inputBuffer.getChannelData(0);
      const pcmData = new Int16Array(inputData.length);

      for (let i = 0; i < inputData.length; i++) {
        pcmData[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
      }

      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));

      realtimeChannelRef.current?.send({
        type: 'broadcast',
        event: 'audio-chunk',
        payload: {
          userId: profile?.id,
          audioData: base64Audio
        }
      });
    };
  };

  const cleanup = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    if (realtimeChannelRef.current) {
      realtimeChannelRef.current.unsubscribe();
    }

    if (selectedGroup) {
      updateActiveStatus(selectedGroup.id, false);
    }

    audioElementsRef.current.clear();
  };

  const handleMouseDown = () => {
    startTransmitting();
  };

  const handleMouseUp = () => {
    stopTransmitting();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    startTransmitting();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    stopTransmitting();
  };

  if (!selectedGroup) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md">
        <div className="text-center py-8">
          <Radio className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">No groups available</p>
          {onManageGroups && (
            <button
              onClick={onManageGroups}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Manage Groups
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Radio className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Live Walkie Talkie</h3>
        </div>
        {onManageGroups && (
          <button
            onClick={onManageGroups}
            className="p-1 text-gray-500 hover:text-gray-700"
          >
            <Settings className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="relative mb-6">
        <button
          onClick={() => setShowGroupSelector(!showGroupSelector)}
          className="w-full flex items-center justify-between px-4 py-3 border-2 rounded-lg hover:bg-gray-50"
          style={{ borderColor: selectedGroup.color }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: selectedGroup.color }}
            />
            <div className="text-left">
              <div className="font-semibold text-gray-900">{selectedGroup.name}</div>
              {selectedGroup.description && (
                <div className="text-xs text-gray-500">{selectedGroup.description}</div>
              )}
            </div>
          </div>
          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showGroupSelector ? 'rotate-180' : ''}`} />
        </button>

        {showGroupSelector && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
            {groups.map((group) => (
              <button
                key={group.id}
                onClick={() => {
                  setSelectedGroup(group);
                  setShowGroupSelector(false);
                  setParticipants([]);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
              >
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: group.color }}
                />
                <div className="text-left flex-1">
                  <div className="font-medium text-gray-900">{group.name}</div>
                  {group.description && (
                    <div className="text-xs text-gray-500">{group.description}</div>
                  )}
                </div>
                {group.id === selectedGroup.id && (
                  <div className="w-2 h-2 bg-blue-600 rounded-full" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">
            Active Users: {participants.length + 1}
          </span>
        </div>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          <div className={`flex items-center gap-2 text-sm p-2 rounded ${
            isTransmitting ? 'bg-blue-100 text-blue-700' : 'text-gray-600'
          }`}>
            {isTransmitting ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
            <span className="font-medium">You</span>
            {isTransmitting && (
              <span className="ml-auto flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                <span className="text-xs">Speaking</span>
              </span>
            )}
          </div>
          {participants.map((participant) => (
            <div
              key={participant.id}
              className={`flex items-center gap-2 text-sm p-2 rounded ${
                participant.speaking ? 'bg-green-100 text-green-700' : 'text-gray-600'
              }`}
            >
              {participant.speaking ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
              <span>{participant.name}</span>
              <span className="text-xs text-gray-500">({participant.role})</span>
              {participant.speaking && (
                <span className="ml-auto flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
                  <span className="text-xs">Speaking</span>
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="text-center mb-4">
        <p className="text-sm text-gray-600">
          Press and hold to talk
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Audio streams live to all users in this group
        </p>
      </div>

      <button
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`w-full py-6 rounded-xl font-semibold text-white transition-all transform active:scale-95 flex items-center justify-center gap-3 ${
          isTransmitting
            ? 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200'
            : 'shadow-lg'
        }`}
        style={{
          backgroundColor: isTransmitting ? undefined : selectedGroup.color
        }}
      >
        {isTransmitting ? (
          <>
            <div className="w-4 h-4 bg-white rounded-full animate-pulse" />
            <Mic className="w-6 h-6" />
            <span className="text-lg">TRANSMITTING</span>
          </>
        ) : (
          <>
            <Mic className="w-6 h-6" />
            <span className="text-lg">PRESS TO TALK</span>
          </>
        )}
      </button>

      <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: selectedGroup.color + '20', borderColor: selectedGroup.color, borderWidth: 1 }}>
        <p className="text-xs" style={{ color: selectedGroup.color }}>
          <strong>Live Mode:</strong> Your voice is transmitted in real-time to all members of {selectedGroup.name}.
        </p>
      </div>
    </div>
  );
}
