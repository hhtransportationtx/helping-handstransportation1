import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Video, Phone, PhoneOff, X } from 'lucide-react';

interface IncomingVideoCallProps {
  callId: string;
  callerName: string;
  callerId: string;
  onAccept: () => void;
  onDecline: () => void;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
};

interface CallData {
  callId: string;
  type: 'offer' | 'answer' | 'ice-candidate' | 'end-call';
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

export default function IncomingVideoCall({
  callId,
  callerName,
  callerId,
  onAccept,
  onDecline
}: IncomingVideoCallProps) {
  const { profile } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [callStatus, setCallStatus] = useState<'ringing' | 'connecting' | 'active' | 'ended'>('ringing');

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const signalingChannelRef = useRef<any>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  useEffect(() => {
    setupSignalingChannel();

    return () => {
      cleanup();
    };
  }, []);

  const setupSignalingChannel = () => {
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

  const handleSignalingMessage = async (data: CallData) => {
    try {
      switch (data.type) {
        case 'offer':
          if (data.offer && callStatus === 'connecting') {
            await handleOffer(data.offer);
          }
          break;

        case 'ice-candidate':
          if (data.candidate) {
            const pc = peerConnectionRef.current;
            if (pc && pc.remoteDescription) {
              await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            } else {
              pendingCandidatesRef.current.push(data.candidate);
            }
          }
          break;

        case 'end-call':
          handleCallEnded();
          break;
      }
    } catch (err) {
      console.error('Error handling signaling message:', err);
    }
  };

  const handleAccept = async () => {
    try {
      setCallStatus('connecting');
      await setupLocalStream();
      await updateCallStatus('active');
      onAccept();
    } catch (err) {
      console.error('Error accepting call:', err);
      handleDecline();
    }
  };

  const handleDecline = async () => {
    await updateCallStatus('declined');
    sendSignalingMessage({
      callId,
      type: 'end-call'
    });
    cleanup();
    onDecline();
  };

  const setupLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
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

  const handleOffer = async (offer: RTCSessionDescriptionInit) => {
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
            callId,
            type: 'ice-candidate',
            candidate: event.candidate.toJSON()
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setIsConnected(true);
          setCallStatus('active');
        } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          handleCallEnded();
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      for (const candidate of pendingCandidatesRef.current) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      pendingCandidatesRef.current = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      sendSignalingMessage({
        callId,
        type: 'answer',
        answer: answer
      });
    } catch (err) {
      console.error('Error handling offer:', err);
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

  const updateCallStatus = async (status: string) => {
    try {
      const updates: any = { status };

      if (status === 'active') {
        updates.answered_at = new Date().toISOString();
      } else if (status === 'declined' || status === 'ended') {
        updates.ended_at = new Date().toISOString();
        updates.end_reason = status === 'declined' ? 'declined' : 'completed';
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

  const handleCallEnded = async () => {
    setCallStatus('ended');
    await updateCallStatus('ended');
    cleanup();
    onDecline();
  };

  const cleanup = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    if (signalingChannelRef.current) {
      signalingChannelRef.current.unsubscribe();
    }
  };

  if (callStatus === 'ringing') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
          <div className="text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
              <Video className="w-12 h-12 text-white" />
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Incoming Video Call
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              {callerName} is calling...
            </p>

            <div className="flex gap-4">
              <button
                onClick={handleDecline}
                className="flex-1 py-4 px-6 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all"
              >
                <PhoneOff className="w-5 h-5" />
                Decline
              </button>
              <button
                onClick={handleAccept}
                className="flex-1 py-4 px-6 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all"
              >
                <Phone className="w-5 h-5" />
                Accept
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (callStatus === 'connecting' || callStatus === 'active') {
    return (
      <div className="fixed inset-0 bg-gray-900 z-50">
        <div className="relative h-full flex flex-col">
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
                  {callStatus === 'connecting' ? 'Connecting...' : callerName}
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
          </div>

          <div className="bg-gray-800 p-4">
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={toggleAudio}
                className={`p-4 rounded-full ${
                  isAudioEnabled ? 'bg-gray-700' : 'bg-red-500'
                } text-white`}
              >
                <span className="sr-only">{isAudioEnabled ? 'Mute' : 'Unmute'}</span>
              </button>

              <button
                onClick={toggleVideo}
                className={`p-4 rounded-full ${
                  isVideoEnabled ? 'bg-gray-700' : 'bg-red-500'
                } text-white`}
              >
                <span className="sr-only">{isVideoEnabled ? 'Camera off' : 'Camera on'}</span>
              </button>

              <button
                onClick={handleCallEnded}
                className="p-4 rounded-full bg-red-500 hover:bg-red-600 text-white"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
