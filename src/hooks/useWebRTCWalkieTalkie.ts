import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface OnlineUser {
  id: string;
  user_id: string;
  status: 'online' | 'busy' | 'offline';
  channel: string;
  last_seen: string;
  profiles: {
    id: string;
    full_name: string;
    role: string;
    photo_url: string | null;
  };
}

export function useWebRTCWalkieTalkie(channel = 'main') {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [isPushingToTalk, setIsPushingToTalk] = useState(false);
  const [activeChannel, setActiveChannel] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [audioLevel, setAudioLevel] = useState(0);

  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStream = useRef<MediaStream | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const presenceUpdateInterval = useRef<NodeJS.Timeout | null>(null);

  const updatePresence = useCallback(
    async (status: 'online' | 'busy' | 'offline') => {
      if (!user) return;

      try {
        const { data: existing } = await supabase
          .from('user_presence')
          .select('id')
          .eq('user_id', user.id)
          .eq('channel', channel)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('user_presence')
            .update({ status, last_seen: new Date().toISOString() })
            .eq('id', existing.id);
        } else {
          await supabase.from('user_presence').insert({
            user_id: user.id,
            status,
            channel,
            last_seen: new Date().toISOString(),
          });
        }
      } catch (error) {
        console.error('Error updating presence:', error);
      }
    },
    [user, channel]
  );

  const initializeAudioAnalyser = useCallback((stream: MediaStream) => {
    audioContext.current = new AudioContext();
    analyser.current = audioContext.current.createAnalyser();
    const source = audioContext.current.createMediaStreamSource(stream);
    source.connect(analyser.current);
    analyser.current.fftSize = 256;

    const dataArray = new Uint8Array(analyser.current.frequencyBinCount);

    const updateLevel = () => {
      if (analyser.current && isPushingToTalk) {
        analyser.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setAudioLevel(Math.min(100, (average / 128) * 100));
        requestAnimationFrame(updateLevel);
      } else {
        setAudioLevel(0);
      }
    };

    updateLevel();
  }, [isPushingToTalk]);

  const createPeerConnection = useCallback((targetUserId: string) => {
    const configuration: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
      ],
    };

    const pc = new RTCPeerConnection(configuration);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        supabase.from('webrtc_signals').insert({
          from_user_id: user!.id,
          to_user_id: targetUserId,
          signal_type: 'ice-candidate',
          signal_data: event.candidate.toJSON(),
          channel,
        }).catch(err => console.error('Failed to send ICE candidate:', err));
      }
    };

    pc.ontrack = (event) => {
      const audio = new Audio();
      audio.srcObject = event.streams[0];
      audio.autoplay = true;
      audio.volume = 1.0;
    };

    pc.onconnectionstatechange = () => {
      console.log(`Connection state with ${targetUserId}:`, pc.connectionState);
      if (pc.connectionState === 'connected') {
        setConnectionStatus('connected');
      } else if (pc.connectionState === 'failed') {
        console.error(`Connection failed with ${targetUserId}`);
      }
    };

    pc.onicecandidateerror = (event) => {
      console.error('ICE candidate error:', event);
    };

    return pc;
  }, [user, channel]);

  const startPushToTalk = async () => {
    if (!user || isPushingToTalk) return;

    try {
      setConnectionStatus('connecting');

      localStream.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      initializeAudioAnalyser(localStream.current);
      setIsPushingToTalk(true);
      setActiveChannel(channel);

      const otherUsers = onlineUsers.filter((u) => u.status === 'online');

      if (otherUsers.length === 0) {
        console.log('No other users online to connect to');
        setConnectionStatus('connected');
      }

      for (const targetUser of otherUsers) {
        const pc = createPeerConnection(targetUser.user_id);
        peerConnections.current.set(targetUser.user_id, pc);

        localStream.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStream.current!);
        });

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const { error } = await supabase.from('webrtc_signals').insert({
          from_user_id: user.id,
          to_user_id: targetUser.user_id,
          signal_type: 'offer',
          signal_data: offer,
          channel,
        });

        if (error) {
          console.error('Failed to send offer:', error);
        }
      }

      updatePresence('busy');
    } catch (error) {
      console.error('Error starting push to talk:', error);
      stopPushToTalk();
    }
  };

  const stopPushToTalk = useCallback(() => {
    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => track.stop());
      localStream.current = null;
    }

    if (audioContext.current) {
      audioContext.current.close();
      audioContext.current = null;
    }

    peerConnections.current.forEach((pc) => {
      pc.close();
    });
    peerConnections.current.clear();

    setIsPushingToTalk(false);
    setActiveChannel(null);
    setConnectionStatus('disconnected');
    setAudioLevel(0);

    if (user) {
      updatePresence('online');
    }
  }, [user, updatePresence]);

  const handleIncomingSignal = useCallback(
    async (signal: any) => {
      const { from_user_id, signal_type, signal_data } = signal;

      try {
        if (signal_type === 'offer') {
          let pc = peerConnections.current.get(from_user_id);

          if (!pc) {
            pc = createPeerConnection(from_user_id);
            peerConnections.current.set(from_user_id, pc);
          }

          await pc.setRemoteDescription(new RTCSessionDescription(signal_data));

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          const { error } = await supabase.from('webrtc_signals').insert({
            from_user_id: user!.id,
            to_user_id: from_user_id,
            signal_type: 'answer',
            signal_data: answer,
            channel,
          });

          if (error) {
            console.error('Failed to send answer:', error);
          }
        } else if (signal_type === 'answer') {
          const pc = peerConnections.current.get(from_user_id);

          if (pc && pc.signalingState !== 'stable') {
            await pc.setRemoteDescription(new RTCSessionDescription(signal_data));
          }
        } else if (signal_type === 'ice-candidate') {
          const pc = peerConnections.current.get(from_user_id);

          if (pc && signal_data) {
            await pc.addIceCandidate(new RTCIceCandidate(signal_data));
          }
        }
      } catch (error) {
        console.error('Error handling signal:', error);
      }
    },
    [user, channel, createPeerConnection]
  );

  useEffect(() => {
    if (!user) return;

    updatePresence('online');

    presenceUpdateInterval.current = setInterval(() => {
      updatePresence(isPushingToTalk ? 'busy' : 'online');
    }, 30000);

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
        .gte('last_seen', new Date(Date.now() - 2 * 60 * 1000).toISOString());

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
      .channel(`signals:${user.id}:${channel}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'webrtc_signals',
          filter: `to_user_id=eq.${user.id}`,
        },
        (payload) => {
          handleIncomingSignal(payload.new);
        }
      )
      .subscribe();

    return () => {
      updatePresence('offline');
      clearInterval(fetchInterval);
      if (presenceUpdateInterval.current) {
        clearInterval(presenceUpdateInterval.current);
      }
      presenceSubscription.unsubscribe();
      signalSubscription.unsubscribe();
      stopPushToTalk();
    };
  }, [user, channel, updatePresence, handleIncomingSignal, stopPushToTalk, isPushingToTalk]);

  return {
    onlineUsers,
    isPushingToTalk,
    activeChannel,
    connectionStatus,
    audioLevel,
    startPushToTalk,
    stopPushToTalk,
  };
}
