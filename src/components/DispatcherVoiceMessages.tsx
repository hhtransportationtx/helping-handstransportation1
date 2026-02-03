import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Send, Play, Pause, Trash2, Volume2, Users, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface VoiceMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  audio_url: string;
  duration_seconds: number;
  created_at: string;
  listened_by: string[];
  recipient_id?: string;
  recipient_name?: string;
}

interface Driver {
  id: string;
  full_name: string;
  status: string;
}

export function DispatcherVoiceMessages() {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [showDriverSelect, setShowDriverSelect] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioElementsRef = useRef<{ [key: string]: HTMLAudioElement }>({});
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchMessages();
    fetchDrivers();
    startPolling();

    return () => {
      stopPolling();
      Object.values(audioElementsRef.current).forEach(audio => {
        audio.pause();
        audio.src = '';
      });

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const fetchDrivers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, status')
      .eq('role', 'driver')
      .order('full_name');

    if (!error && data) {
      setDrivers(data);
    }
  };

  const startPolling = () => {
    pollingIntervalRef.current = setInterval(() => {
      fetchMessages();
    }, 5000);
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('voice_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setMessages(data);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      streamRef.current = stream;
      audioChunksRef.current = [];

      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg';
        } else {
          mimeType = '';
        }
      }

      const options = mimeType ? { mimeType } : {};
      const mediaRecorder = new MediaRecorder(stream, options);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' });
        await uploadVoiceMessage(audioBlob);

        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        alert('Recording error occurred');
        stopRecording();
      };

      mediaRecorder.start(1000);
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingTime(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          alert('Microphone permission denied. Please allow microphone access.');
        } else if (error.name === 'NotFoundError') {
          alert('No microphone found. Please connect a microphone.');
        } else {
          alert('Could not access microphone: ' + error.message);
        }
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  };

  const uploadVoiceMessage = async (audioBlob: Blob) => {
    if (!user || !profile) return;

    setIsUploading(true);
    try {
      const fileName = `${user.id}/${Date.now()}.webm`;

      const { error: uploadError } = await supabase.storage
        .from('voice-messages')
        .upload(fileName, audioBlob, {
          contentType: 'audio/webm',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('voice-messages')
        .getPublicUrl(fileName);

      const selectedDriver = selectedDriverId
        ? drivers.find(d => d.id === selectedDriverId)
        : null;

      const { error: insertError } = await supabase
        .from('voice_messages')
        .insert({
          sender_id: user.id,
          sender_name: profile.full_name || 'Dispatcher',
          sender_role: 'dispatcher',
          audio_url: publicUrl,
          duration_seconds: recordingTime,
          recipient_id: selectedDriverId,
          recipient_name: selectedDriver?.full_name || null
        });

      if (insertError) throw insertError;

      setRecordingTime(0);
      fetchMessages();
    } catch (error) {
      console.error('Error uploading voice message:', error);
      alert('Failed to send voice message');
    } finally {
      setIsUploading(false);
    }
  };

  const togglePlayMessage = (message: VoiceMessage) => {
    if (playingId === message.id) {
      const audio = audioElementsRef.current[message.id];
      if (audio) {
        audio.pause();
        setPlayingId(null);
      }
    } else {
      Object.values(audioElementsRef.current).forEach(audio => audio.pause());

      let audio = audioElementsRef.current[message.id];
      if (!audio) {
        audio = new Audio(message.audio_url);
        audioElementsRef.current[message.id] = audio;

        audio.onended = () => {
          setPlayingId(null);
          markAsListened(message.id);
        };

        audio.onerror = () => {
          console.error('Error playing audio');
          setPlayingId(null);
        };
      }

      audio.play().then(() => {
        setPlayingId(message.id);
        markAsListened(message.id);
      }).catch(err => {
        console.error('Error playing audio:', err);
      });
    }
  };

  const markAsListened = async (messageId: string) => {
    if (!user) return;

    const message = messages.find(m => m.id === messageId);
    if (!message || message.listened_by.includes(user.id)) return;

    const { error } = await supabase
      .from('voice_messages')
      .update({
        listened_by: [...message.listened_by, user.id]
      })
      .eq('id', messageId);

    if (!error) {
      fetchMessages();
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!confirm('Delete this voice message?')) return;

    const { error } = await supabase
      .from('voice_messages')
      .delete()
      .eq('id', messageId);

    if (!error) {
      fetchMessages();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const selectedDriver = selectedDriverId
    ? drivers.find(d => d.id === selectedDriverId)
    : null;

  return (
    <div className="flex flex-col bg-gray-50" style={{ height: 'calc(100vh - 64px)' }}>
      <div className="bg-white border-b border-gray-200 p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Volume2 className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Voice Messages</h2>
              <p className="text-sm text-gray-500">Send voice notes to drivers</p>
            </div>
          </div>
          <button
            onClick={() => setShowDriverSelect(!showDriverSelect)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            {selectedDriver ? <User className="w-4 h-4" /> : <Users className="w-4 h-4" />}
            {selectedDriver ? selectedDriver.full_name : 'Broadcast'}
          </button>
        </div>

        {showDriverSelect && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-2">Send message to:</p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              <button
                onClick={() => {
                  setSelectedDriverId(null);
                  setShowDriverSelect(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  !selectedDriverId
                    ? 'bg-blue-600 text-white'
                    : 'bg-white hover:bg-gray-100 text-gray-900'
                }`}
              >
                <Users className="w-4 h-4" />
                <span className="font-medium">All Drivers (Broadcast)</span>
              </button>
              {drivers.map(driver => (
                <button
                  key={driver.id}
                  onClick={() => {
                    setSelectedDriverId(driver.id);
                    setShowDriverSelect(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                    selectedDriverId === driver.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-white hover:bg-gray-100 text-gray-900'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <div className="flex-1">
                    <div className="font-medium">{driver.full_name}</div>
                    <div className="text-xs opacity-75">{driver.status || 'Available'}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ minHeight: 0 }}>
        {messages.map((message) => {
          const isOwn = message.sender_id === user?.id;
          const hasListened = user ? message.listened_by.includes(user.id) : false;
          const isPlaying = playingId === message.id;

          return (
            <div
              key={message.id}
              className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-xs ${isOwn ? 'bg-blue-600 text-white' : 'bg-white text-gray-900'} rounded-lg shadow p-3`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium opacity-90">
                    {message.sender_name}
                  </span>
                  <span className={`text-xs ${isOwn ? 'text-blue-100' : 'text-gray-400'}`}>
                    {message.sender_role === 'dispatcher' ? '📋' : '🚗'}
                  </span>
                  {message.recipient_name && (
                    <span className={`text-xs ${isOwn ? 'text-blue-100' : 'text-gray-400'}`}>
                      → {message.recipient_name}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => togglePlayMessage(message)}
                    className={`p-2 rounded-full ${isOwn ? 'bg-blue-500 hover:bg-blue-400' : 'bg-gray-100 hover:bg-gray-200'} transition-colors`}
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5" />
                    )}
                  </button>

                  <div className="flex-1">
                    <div className={`h-8 flex items-center gap-0.5 ${isOwn ? 'text-blue-100' : 'text-gray-400'}`}>
                      {Array.from({ length: 20 }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-1 rounded-full ${isOwn ? 'bg-blue-300' : 'bg-gray-300'}`}
                          style={{
                            height: `${Math.random() * 100}%`,
                            minHeight: '20%'
                          }}
                        />
                      ))}
                    </div>
                    <div className={`text-xs mt-1 ${isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
                      {formatTime(message.duration_seconds)}
                    </div>
                  </div>

                  {isOwn && (
                    <button
                      onClick={() => deleteMessage(message.id)}
                      className="p-1 hover:bg-blue-500 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between mt-2 text-xs opacity-75">
                  <span>{formatTimestamp(message.created_at)}</span>
                  {!isOwn && !hasListened && (
                    <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-xs">New</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {messages.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Volume2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No voice messages yet</p>
            <p className="text-sm">Record a message to get started</p>
          </div>
        )}
      </div>

      <div className="bg-white border-t border-gray-200 p-4 flex-shrink-0">
        {isUploading ? (
          <div className="flex items-center justify-center gap-2 text-blue-600">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span>Sending...</span>
          </div>
        ) : isRecording ? (
          <div className="flex items-center gap-3">
            <button
              onClick={stopRecording}
              className="flex-1 bg-red-600 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-red-700 transition-colors"
            >
              <Square className="w-5 h-5" />
              Stop Recording
            </button>
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg font-medium flex items-center gap-2">
              <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
              {formatTime(recordingTime)}
            </div>
          </div>
        ) : (
          <button
            onClick={startRecording}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
          >
            <Mic className="w-5 h-5" />
            Start Recording
          </button>
        )}
      </div>
    </div>
  );
}
