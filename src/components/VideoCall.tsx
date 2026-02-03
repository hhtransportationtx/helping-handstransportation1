import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Monitor,
  MonitorOff,
  SwitchCamera,
  X,
  Maximize2,
  Minimize2
} from 'lucide-react';

interface VideoCallProps {
  recipientId: string;
  recipientName: string;
  onClose: () => void;
}

interface CallData {
  callId: string;
  type: 'offer' | 'answer' | 'ice-candidate' | 'end-call';
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
};

export default function VideoCall({ recipientId, recipientName, onClose }: VideoCallProps) {
  const { profile } = useAuth();
  const [callId, setCallId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [callStatus, setCallStatus] = useState<'connecting' | 'ringing' | 'active' | 'ended'>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const signalingChannelRef = useRef<any>(null);

  useEffect(() => {
    initializeCall();

    return () => {
      cleanup();
    };
  }, []);

  const initializeCall = async () => {
    try {
      setIsCalling(true);
      setCallStatus('connecting');

      await setupLocalStream();
      await createCallRecord();
      setupSignalingChannel();
      await createOffer();

      setCallStatus('ringing');
    } catch (err) {
      console.error('Error initializing call:', err);
      setError('Failed to initialize call');
      setIsCalling(false);
    }
  };

  const setupLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Error accessing media devices:', err);
      throw new Error('Camera/microphone access denied');
    }
  };

  const createCallRecord = async () => {
    try {
      const { data, error } = await supabase
        .from('video_calls')
        .insert({
          company_id: profile?.company_id,
          caller_id: profile?.id,
          callee_id: recipientId,
          call_type: 'video',
          status: 'ringing'
        })
        .select()
        .single();

      if (error) throw error;
      setCallId(data.id);
    } catch (err) {
      console.error('Error creating call record:', err);
      throw err;
    }
  };

  const setupSignalingChannel = () => {
    if (!callId) return;

    const channelName = `video-call-${callId}`;
    signalingChannelRef.current = supabase.channel(channelName, {
      config: { broadcast: { self: false } }
    });

    signalingChannelRef.current
      .on('broadcast', { event: 'signal' }, ({ payload }: { payload: CallData }) => {
        handleSignalingMessage(payload);
      })
      .subscribe();
  };

  const createOffer = async () => {
    try {
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = pc;

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      pc.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignalingMessage({
            callId: callId!,
            type: 'ice-candidate',
            candidate: event.candidate.toJSON()
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setIsConnected(true);
          setCallStatus('active');
          updateCallStatus('active');
        } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          setError('Connection lost');
          endCall('connection_error');
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      sendSignalingMessage({
        callId: callId!,
        type: 'offer',
        offer: offer
      });
    } catch (err) {
      console.error('Error creating offer:', err);
      setError('Failed to create call');
    }
  };

  const handleSignalingMessage = async (data: CallData) => {
    try {
      const pc = peerConnectionRef.current;
      if (!pc) return;

      switch (data.type) {
        case 'answer':
          if (data.answer) {
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          }
          break;

        case 'ice-candidate':
          if (data.candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          }
          break;

        case 'end-call':
          endCall('completed');
          break;
      }
    } catch (err) {
      console.error('Error handling signaling message:', err);
    }
  };

  const sendSignalingMessage = (data: CallData) => {
    if (signalingChannelRef.current) {
      signalingChannelRef.current.send({
        type: 'broadcast',
        event: 'signal',
        payload: data
      });
    }
  };

  const updateCallStatus = async (status: string, endReason?: string) => {
    if (!callId) return;

    try {
      const updates: any = { status };

      if (status === 'active') {
        updates.answered_at = new Date().toISOString();
      } else if (status === 'ended') {
        updates.ended_at = new Date().toISOString();
        updates.end_reason = endReason || 'completed';
      }

      await supabase
        .from('video_calls')
        .update(updates)
        .eq('id', callId);
    } catch (err) {
      console.error('Error updating call status:', err);
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        stopScreenShare();
      } else {
        await startScreenShare();
      }
    } catch (err) {
      console.error('Error toggling screen share:', err);
      setError('Failed to share screen');
    }
  };

  const startScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: false
      });

      screenStreamRef.current = screenStream;

      const videoTrack = screenStream.getVideoTracks()[0];
      const pc = peerConnectionRef.current;

      if (pc) {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
      }

      videoTrack.onended = () => {
        stopScreenShare();
      };

      setIsScreenSharing(true);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = screenStream;
      }
    } catch (err) {
      console.error('Error starting screen share:', err);
      throw err;
    }
  };

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }

    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      const pc = peerConnectionRef.current;

      if (pc && videoTrack) {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
    }

    setIsScreenSharing(false);
  };

  const switchCamera = async () => {
    try {
      const newFacingMode = facingMode === 'user' ? 'environment' : 'user';

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacingMode },
        audio: true
      });

      localStreamRef.current = newStream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = newStream;
      }

      const pc = peerConnectionRef.current;
      if (pc) {
        const videoTrack = newStream.getVideoTracks()[0];
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender && videoTrack) {
          sender.replaceTrack(videoTrack);
        }
      }

      setFacingMode(newFacingMode);
    } catch (err) {
      console.error('Error switching camera:', err);
      setError('Failed to switch camera');
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const endCall = async (reason: string = 'completed') => {
    setCallStatus('ended');

    if (callId) {
      sendSignalingMessage({
        callId,
        type: 'end-call'
      });
      await updateCallStatus('ended', reason);
    }

    cleanup();
    onClose();
  };

  const cleanup = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    if (signalingChannelRef.current) {
      signalingChannelRef.current.unsubscribe();
    }
  };

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50' : 'relative'} bg-gray-900 rounded-lg overflow-hidden`}>
      <div className="relative h-full flex flex-col">
        {error && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
            {error}
          </div>
        )}

        <div className="flex-1 relative">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover bg-gray-800"
          />

          <div className="absolute top-4 left-4 bg-black bg-opacity-60 text-white px-4 py-2 rounded-lg">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`} />
              <span className="text-sm font-medium">
                {callStatus === 'connecting' && 'Connecting...'}
                {callStatus === 'ringing' && `Calling ${recipientName}...`}
                {callStatus === 'active' && recipientName}
                {callStatus === 'ended' && 'Call Ended'}
              </span>
            </div>
          </div>

          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="absolute bottom-4 right-4 w-40 h-30 object-cover bg-gray-700 rounded-lg shadow-lg border-2 border-white"
          />

          <button
            onClick={toggleFullscreen}
            className="absolute top-4 right-4 p-2 bg-black bg-opacity-60 text-white rounded-lg hover:bg-opacity-80"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>

        <div className="bg-gray-800 p-4">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={toggleAudio}
              className={`p-4 rounded-full transition-all ${
                isAudioEnabled
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-red-500 hover:bg-red-600 text-white'
              }`}
              title={isAudioEnabled ? 'Mute' : 'Unmute'}
            >
              {isAudioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
            </button>

            <button
              onClick={toggleVideo}
              className={`p-4 rounded-full transition-all ${
                isVideoEnabled
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-red-500 hover:bg-red-600 text-white'
              }`}
              title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
            >
              {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
            </button>

            <button
              onClick={switchCamera}
              className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 text-white transition-all"
              title="Switch camera"
            >
              <SwitchCamera className="w-6 h-6" />
            </button>

            <button
              onClick={toggleScreenShare}
              className={`p-4 rounded-full transition-all ${
                isScreenSharing
                  ? 'bg-blue-500 hover:bg-blue-600 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-white'
              }`}
              title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
            >
              {isScreenSharing ? <MonitorOff className="w-6 h-6" /> : <Monitor className="w-6 h-6" />}
            </button>

            <button
              onClick={() => endCall('completed')}
              className="p-4 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all"
              title="End call"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
