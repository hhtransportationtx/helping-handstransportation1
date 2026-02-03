import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface OnlineUser {
  id: string;
  user_id: string;
  status: 'online' | 'talking' | 'listening' | 'offline';
  channel: string;
  last_seen: string;
  profiles: {
    id: string;
    full_name: string;
    role: string;
    photo_url: string | null;
  };
}

export function useWalkieTalkie(channel = 'main') {
  const { user, profile } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [isTalking, setIsTalking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [activeCallWith, setActiveCallWith] = useState<string | null>(null);
  const [incomingCall, setIncomingCall] = useState<{ from: string; fromName: string } | null>(null);

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const remoteAudio = useRef<HTMLAudioElement | null>(null);
  const presenceId = useRef<string | null>(null);

  const updatePresence = useCallback(
    async (status: 'online' | 'talking' | 'listening' | 'offline') => {
      if (!user) return;

      try {
        if (presenceId.current) {
          await supabase
            .from('user_presence')
            .update({ status, last_seen: new Date().toISOString() })
            .eq('id', presenceId.current);
        } else {
          const { data } = await supabase
            .from('user_presence')
            .insert({
              user_id: user.id,
              status,
              channel,
              last_seen: new Date().toISOString(),
            })
            .select()
            .single();

          if (data) {
            presenceId.current = data.id;
          }
        }
      } catch (error) {
        console.error('Error updating presence:', error);
      }
    },
    [user, channel]
  );

  const initializePeerConnection = useCallback(() => {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };

    peerConnection.current = new RTCPeerConnection(configuration);

    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate && activeCallWith) {
        supabase.from('webrtc_signals').insert({
          from_user_id: user!.id,
          to_user_id: activeCallWith,
          signal_type: 'ice-candidate',
          signal_data: { candidate: event.candidate },
          channel,
        });
      }
    };

    peerConnection.current.ontrack = (event) => {
      if (!remoteAudio.current) {
        remoteAudio.current = new Audio();
        remoteAudio.current.autoplay = true;
      }
      remoteAudio.current.srcObject = event.streams[0];
      setIsListening(true);
    };

    peerConnection.current.onconnectionstatechange = () => {
      if (peerConnection.current?.connectionState === 'disconnected' ||
          peerConnection.current?.connectionState === 'failed') {
        endCall();
      }
    };
  }, [activeCallWith, user, channel]);

  const startCall = async (targetUserId: string) => {
    try {
      setActiveCallWith(targetUserId);

      localStream.current = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

      initializePeerConnection();

      localStream.current.getTracks().forEach((track) => {
        peerConnection.current!.addTrack(track, localStream.current!);
      });

      const offer = await peerConnection.current!.createOffer();
      await peerConnection.current!.setLocalDescription(offer);

      await supabase.from('webrtc_signals').insert({
        from_user_id: user!.id,
        to_user_id: targetUserId,
        signal_type: 'call-request',
        signal_data: { offer },
        channel,
      });

      setIsTalking(true);
      updatePresence('talking');
    } catch (error) {
      console.error('Error starting call:', error);
      endCall();
    }
  };

  const acceptCall = async (fromUserId: string, offer: RTCSessionDescriptionInit) => {
    try {
      setActiveCallWith(fromUserId);
      setIncomingCall(null);

      localStream.current = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

      initializePeerConnection();

      localStream.current.getTracks().forEach((track) => {
        peerConnection.current!.addTrack(track, localStream.current!);
      });

      await peerConnection.current!.setRemoteDescription(new RTCSessionDescription(offer));

      const answer = await peerConnection.current!.createAnswer();
      await peerConnection.current!.setLocalDescription(answer);

      await supabase.from('webrtc_signals').insert({
        from_user_id: user!.id,
        to_user_id: fromUserId,
        signal_type: 'call-accept',
        signal_data: { answer },
        channel,
      });

      updatePresence('listening');
    } catch (error) {
      console.error('Error accepting call:', error);
      endCall();
    }
  };

  const rejectCall = async () => {
    if (incomingCall) {
      await supabase.from('webrtc_signals').insert({
        from_user_id: user!.id,
        to_user_id: incomingCall.from,
        signal_type: 'call-reject',
        channel,
      });
      setIncomingCall(null);
    }
  };

  const endCall = useCallback(async () => {
    if (activeCallWith) {
      await supabase.from('webrtc_signals').insert({
        from_user_id: user!.id,
        to_user_id: activeCallWith,
        signal_type: 'call-end',
        channel,
      });
    }

    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => track.stop());
      localStream.current = null;
    }

    if (remoteAudio.current) {
      remoteAudio.current.pause();
      remoteAudio.current.srcObject = null;
    }

    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    setIsTalking(false);
    setIsListening(false);
    setActiveCallWith(null);
    updatePresence('online');
  }, [activeCallWith, user, channel, updatePresence]);

  useEffect(() => {
    if (!user) return;

    updatePresence('online');

    const fetchOnlineUsers = async () => {
      const { data } = await supabase
        .from('user_presence')
        .select(`
          *,
          profiles:user_id (
            id,
            full_name,
            role,
            photo_url
          )
        `)
        .eq('channel', channel)
        .neq('user_id', user.id)
        .gte('last_seen', new Date(Date.now() - 5 * 60 * 1000).toISOString());

      if (data) {
        setOnlineUsers(data as OnlineUser[]);
      }
    };

    fetchOnlineUsers();
    const fetchInterval = setInterval(fetchOnlineUsers, 5000);

    const presenceSubscription = supabase
      .channel(`presence:${channel}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence',
          filter: `channel=eq.${channel}`,
        },
        () => {
          fetchOnlineUsers();
        }
      )
      .subscribe();

    const signalSubscription = supabase
      .channel(`signals:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'webrtc_signals',
          filter: `to_user_id=eq.${user.id}`,
        },
        async (payload) => {
          const signal = payload.new;

          if (signal.signal_type === 'call-request') {
            const { data: fromUser } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', signal.from_user_id)
              .single();

            setIncomingCall({
              from: signal.from_user_id,
              fromName: fromUser?.full_name || 'Unknown',
            });
          } else if (signal.signal_type === 'call-accept' && peerConnection.current) {
            await peerConnection.current.setRemoteDescription(
              new RTCSessionDescription(signal.signal_data.answer)
            );
          } else if (signal.signal_type === 'ice-candidate' && peerConnection.current) {
            await peerConnection.current.addIceCandidate(
              new RTCIceCandidate(signal.signal_data.candidate)
            );
          } else if (signal.signal_type === 'call-end' || signal.signal_type === 'call-reject') {
            endCall();
          }
        }
      )
      .subscribe();

    return () => {
      updatePresence('offline');
      clearInterval(fetchInterval);
      presenceSubscription.unsubscribe();
      signalSubscription.unsubscribe();
      endCall();
    };
  }, [user, channel, updatePresence, endCall]);

  return {
    onlineUsers,
    isTalking,
    isListening,
    activeCallWith,
    incomingCall,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
  };
}
