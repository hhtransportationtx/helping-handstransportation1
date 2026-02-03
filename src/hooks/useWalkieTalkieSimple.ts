import { useState, useEffect, useCallback } from 'react';
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

interface CallRequest {
  from_user_id: string;
  to_user_id: string;
  from_name: string;
  call_id: string;
}

export function useWalkieTalkieSimple(channel = 'main') {
  const { user, profile } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [isInCall, setIsInCall] = useState(false);
  const [activeCallWith, setActiveCallWith] = useState<string | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallRequest | null>(null);
  const [callStatus, setCallStatus] = useState<string>('');

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
          await supabase
            .from('user_presence')
            .insert({
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

  const startCall = async (targetUserId: string) => {
    if (!user || !profile) return;

    try {
      setCallStatus('Calling...');
      setActiveCallWith(targetUserId);
      setIsInCall(true);

      const callId = `call_${Date.now()}_${user.id}_${targetUserId}`;

      const { data: targetProfile } = await supabase
        .from('profiles')
        .select('phone, full_name')
        .eq('id', targetUserId)
        .maybeSingle();

      if (!targetProfile?.phone) {
        setCallStatus('User has no phone number');
        setTimeout(() => endCall(), 2000);
        return;
      }

      await supabase.from('call_events').insert({
        from_user_id: user.id,
        to_user_id: targetUserId,
        event_type: 'incoming_call',
        call_id: callId,
        metadata: {
          caller_name: profile.full_name,
          caller_phone: profile.phone,
        },
      });

      const twilioAccountSid = import.meta.env.VITE_TWILIO_ACCOUNT_SID;
      const twilioAuthToken = import.meta.env.VITE_TWILIO_AUTH_TOKEN;
      const twilioPhoneNumber = import.meta.env.VITE_TWILIO_PHONE_NUMBER;

      if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
        setCallStatus('Twilio not configured');
        setTimeout(() => endCall(), 2000);
        return;
      }

      const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Calls.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: targetProfile.phone,
            From: twilioPhoneNumber,
            Url: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/twilio-voice?to=${encodeURIComponent(profile.phone || '')}`,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to initiate call');
      }

      setCallStatus('Ringing...');
      updatePresence('busy');
    } catch (error) {
      console.error('Error starting call:', error);
      setCallStatus('Call failed');
      setTimeout(() => endCall(), 2000);
    }
  };

  const endCall = useCallback(async () => {
    setIsInCall(false);
    setActiveCallWith(null);
    setIncomingCall(null);
    setCallStatus('');
    updatePresence('online');
  }, [updatePresence]);

  const acceptCall = async () => {
    if (!incomingCall) return;

    setActiveCallWith(incomingCall.from_user_id);
    setIsInCall(true);
    setCallStatus('Connected');
    setIncomingCall(null);
    updatePresence('busy');
  };

  const rejectCall = async () => {
    if (!incomingCall || !user) return;

    await supabase.from('call_events').insert({
      from_user_id: user.id,
      to_user_id: incomingCall.from_user_id,
      event_type: 'reject',
      call_id: incomingCall.call_id,
    });

    setIncomingCall(null);
  };

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

    const callEventSubscription = supabase
      .channel(`call_events:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_events',
          filter: `to_user_id=eq.${user.id}`,
        },
        async (payload) => {
          const event = payload.new;

          if (event.event_type === 'incoming_call') {
            const { data: fromUser } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', event.from_user_id)
              .maybeSingle();

            setIncomingCall({
              from_user_id: event.from_user_id,
              to_user_id: user.id,
              from_name: fromUser?.full_name || 'Unknown',
              call_id: event.call_id || `call_${Date.now()}`,
            });
          } else if (event.event_type === 'call_ended' || event.event_type === 'reject') {
            endCall();
          } else if (event.event_type === 'call_accepted') {
            setCallStatus('Connected');
          }
        }
      )
      .subscribe();

    return () => {
      updatePresence('offline');
      clearInterval(fetchInterval);
      presenceSubscription.unsubscribe();
      callEventSubscription.unsubscribe();
    };
  }, [user, channel, updatePresence, endCall]);

  return {
    onlineUsers,
    isInCall,
    activeCallWith,
    incomingCall,
    callStatus,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
  };
}
