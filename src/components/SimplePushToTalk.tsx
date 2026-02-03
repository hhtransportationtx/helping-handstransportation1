import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Mic, Play, Trash2, Send } from 'lucide-react';

interface VoiceMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  audio_url: string;
  duration: number;
  created_at: string;
  is_played: boolean;
}

interface SimplePushToTalkProps {
  channel?: string;
}

export default function SimplePushToTalk({ channel = 'dispatch' }: SimplePushToTalkProps) {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number>();

  useEffect(() => {
    if (profile?.company_id) {
      loadMessages();
      subscribeToMessages();
    }
  }, [profile?.company_id]);

  const loadMessages = async () => {
    if (!profile?.company_id) return;

    try {
      const { data, error } = await supabase
        .from('voice_messages')
        .select('*')
        .eq('company_id', profile.company_id)
        .eq('channel', channel)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const subscribeToMessages = () => {
    if (!profile?.company_id) return;

    const subscription = supabase
      .channel('voice_messages_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'voice_messages',
          filter: `company_id=eq.${profile.company_id}`
        },
        (payload) => {
          setMessages((prev) => [payload.new as VoiceMessage, ...prev]);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = window.setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const cancelRecording = () => {
    if (isRecording) {
      stopRecording();
    }
    setAudioBlob(null);
    setRecordingTime(0);
  };

  const sendVoiceMessage = async () => {
    if (!audioBlob || !profile?.company_id) return;

    try {
      const fileName = `voice_${Date.now()}.webm`;
      const filePath = `${profile.company_id}/voice-messages/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('voice-messages')
        .upload(filePath, audioBlob);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('voice-messages')
        .getPublicUrl(filePath);

      const { error: insertError } = await supabase
        .from('voice_messages')
        .insert({
          company_id: profile.company_id,
          sender_id: profile.id,
          sender_name: profile.full_name,
          channel,
          audio_url: publicUrl,
          duration: recordingTime,
          is_played: false
        });

      if (insertError) throw insertError;

      setAudioBlob(null);
      setRecordingTime(0);
    } catch (error) {
      console.error('Error sending voice message:', error);
      alert('Failed to send voice message');
    }
  };

  const playMessage = async (message: VoiceMessage) => {
    const audio = new Audio(message.audio_url);
    audio.play();

    if (!message.is_played) {
      await supabase
        .from('voice_messages')
        .update({ is_played: true })
        .eq('id', message.id);
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('voice_messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;
      setMessages(messages.filter(m => m.id !== messageId));
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 max-w-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Push to Talk</h3>
        <span className="text-xs text-gray-500 uppercase">{channel}</span>
      </div>

      <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex items-center gap-2 p-2 rounded ${
              message.sender_id === profile?.id ? 'bg-blue-50' : 'bg-gray-50'
            }`}
          >
            <button
              onClick={() => playMessage(message)}
              className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700"
            >
              <Play className="w-4 h-4" />
            </button>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{message.sender_name}</p>
              <p className="text-xs text-gray-500">
                {formatTime(message.duration)} - {new Date(message.created_at).toLocaleTimeString()}
              </p>
            </div>
            {message.sender_id === profile?.id && (
              <button
                onClick={() => deleteMessage(message.id)}
                className="p-1 text-red-600 hover:bg-red-50 rounded"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
        {messages.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Mic className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No messages yet</p>
          </div>
        )}
      </div>

      {audioBlob ? (
        <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">Recording ready</p>
            <p className="text-xs text-gray-500">{formatTime(recordingTime)}</p>
          </div>
          <button
            onClick={cancelRecording}
            className="px-3 py-2 text-gray-700 hover:bg-gray-200 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={sendVoiceMessage}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
        </div>
      ) : isRecording ? (
        <button
          onClick={stopRecording}
          className="w-full py-4 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2"
        >
          <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
          Recording {formatTime(recordingTime)}
        </button>
      ) : (
        <button
          onClick={startRecording}
          className="w-full py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
        >
          <Mic className="w-5 h-5" />
          Hold to Record
        </button>
      )}
    </div>
  );
}
