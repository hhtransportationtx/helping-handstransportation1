import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Play, Pause, Volume2, ArrowLeft } from 'lucide-react';
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

interface DriverVoiceMessagesProps {
  onBack: () => void;
}

export function DriverVoiceMessages({ onBack }: DriverVoiceMessagesProps) {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioElementsRef = useRef<{ [key: string]: HTMLAudioElement }>({});
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchMessages();
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

  useEffect(() => {
    if (user) {
      const unread = messages.filter(m => !m.listened_by.includes(user.id) && m.sender_id !== user.id).length;
      setUnreadCount(unread);
    }
  }, [messages, user]);

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
    if (!user) return;

    const { data, error } = await supabase
      .from('voice_messages')
      .select('*')
      .or(`recipient_id.is.null,recipient_id.eq.${user.id}`)
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

      const { error: insertError } = await supabase
        .from('voice_messages')
        .insert({
          sender_id: user.id,
          sender_name: profile.full_name || 'Driver',
          sender_role: 'driver',
          audio_url: publicUrl,
          duration_seconds: recordingTime
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

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="bg-blue-600 text-white p-4 flex-shrink-0">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={onBack} className="p-1 hover:bg-blue-700 rounded">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <Volume2 className="w-6 h-6" />
          <div className="flex-1">
            <h2 className="text-lg font-semibold">Voice Messages</h2>
            <p className="text-sm text-blue-100">Communicate with dispatch</p>
          </div>
          {unreadCount > 0 && (
            <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
              {unreadCount}
            </div>
          )}
        </div>
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
                  {!isOwn && message.recipient_id && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${isOwn ? 'bg-blue-500 text-white' : 'bg-green-100 text-green-800'}`}>
                      Direct
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

      <div className="bg-white border-t border-gray-200 p-4 safe-area-bottom flex-shrink-0">
        {isUploading ? (
          <div className="flex items-center justify-center gap-2 text-blue-600">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span>Sending...</span>
          </div>
        ) : isRecording ? (
          <div className="space-y-3">
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
              Recording: {formatTime(recordingTime)}
            </div>
            <button
              onClick={stopRecording}
              className="w-full bg-red-600 text-white py-4 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-red-700 transition-colors text-lg"
            >
              <Square className="w-6 h-6" />
              Stop & Send
            </button>
          </div>
        ) : (
          <button
            onClick={startRecording}
            className="w-full bg-blue-600 text-white py-4 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors text-lg"
          >
            <Mic className="w-6 h-6" />
            Tap to Record
          </button>
        )}
      </div>
    </div>
  );
}
