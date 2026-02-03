import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Video, Phone, Search, X, Clock, CheckCircle, XCircle } from 'lucide-react';
import VideoCall from './VideoCall';
import IncomingVideoCall from './IncomingVideoCall';
import { playUrgentAlertSound } from '../lib/notificationSound';

interface User {
  id: string;
  full_name: string;
  role: string;
  phone_number?: string;
}

interface Call {
  id: string;
  caller_id: string;
  callee_id: string;
  status: string;
  started_at: string;
  duration_seconds?: number;
  caller: {
    full_name: string;
  };
  callee: {
    full_name: string;
  };
}

interface IncomingCall {
  id: string;
  caller_id: string;
  caller_name: string;
}

export default function VideoCallManager() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCall, setActiveCall] = useState<{ recipientId: string; recipientName: string } | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [callHistory, setCallHistory] = useState<Call[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.company_id) {
      loadUsers();
      loadCallHistory();
      subscribeToIncomingCalls();
    }
  }, [profile?.company_id]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = users.filter(user =>
        user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchTerm, users]);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, phone_number')
        .eq('company_id', profile?.company_id)
        .neq('id', profile?.id)
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
      setFilteredUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCallHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('video_calls')
        .select(`
          *,
          caller:caller_id (full_name),
          callee:callee_id (full_name)
        `)
        .or(`caller_id.eq.${profile?.id},callee_id.eq.${profile?.id}`)
        .order('started_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setCallHistory(data || []);
    } catch (error) {
      console.error('Error loading call history:', error);
    }
  };

  const subscribeToIncomingCalls = () => {
    const subscription = supabase
      .channel('incoming-calls')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'video_calls',
          filter: `callee_id=eq.${profile?.id}`
        },
        async (payload) => {
          const call = payload.new as any;

          if (call.status === 'ringing') {
            const { data: callerData } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', call.caller_id)
              .single();

            if (callerData) {
              setIncomingCall({
                id: call.id,
                caller_id: call.caller_id,
                caller_name: callerData.full_name
              });

              playUrgentAlertSound();

              if ('vibrate' in navigator) {
                navigator.vibrate([200, 100, 200]);
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const handleStartCall = (userId: string, userName: string) => {
    setActiveCall({
      recipientId: userId,
      recipientName: userName
    });
  };

  const handleCloseCall = () => {
    setActiveCall(null);
    loadCallHistory();
  };

  const handleAcceptCall = () => {
    if (incomingCall) {
      setActiveCall({
        recipientId: incomingCall.caller_id,
        recipientName: incomingCall.caller_name
      });
      setIncomingCall(null);
    }
  };

  const handleDeclineCall = () => {
    setIncomingCall(null);
    loadCallHistory();
  };

  const getCallStatusIcon = (call: Call) => {
    switch (call.status) {
      case 'active':
      case 'ended':
        return call.duration_seconds ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-gray-400" />;
      case 'missed':
        return <XCircle className="w-4 h-4 text-yellow-500" />;
      case 'declined':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'No answer';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCallTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (activeCall) {
    return (
      <VideoCall
        recipientId={activeCall.recipientId}
        recipientName={activeCall.recipientName}
        onClose={handleCloseCall}
      />
    );
  }

  if (incomingCall) {
    return (
      <IncomingVideoCall
        callId={incomingCall.id}
        callerName={incomingCall.caller_name}
        callerId={incomingCall.caller_id}
        onAccept={handleAcceptCall}
        onDecline={handleDeclineCall}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center">
            <Video className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Video Calls</h2>
            <p className="text-sm text-gray-600">Call team members for visual assistance</p>
          </div>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
        >
          <Clock className="w-4 h-4" />
          {showHistory ? 'Show Contacts' : 'Call History'}
        </button>
      </div>

      {showHistory ? (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Recent Calls</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {callHistory.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No call history yet
              </div>
            ) : (
              callHistory.map((call) => {
                const isOutgoing = call.caller_id === profile?.id;
                const otherPerson = isOutgoing ? call.callee : call.caller;

                return (
                  <div key={call.id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getCallStatusIcon(call)}
                      <div>
                        <div className="font-medium text-gray-900">{otherPerson.full_name}</div>
                        <div className="text-sm text-gray-500">
                          {isOutgoing ? 'Outgoing' : 'Incoming'} • {formatCallTime(call.started_at)}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatDuration(call.duration_seconds)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or role..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Available Users ({filteredUsers.length})</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading users...</div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  {searchTerm ? 'No users found matching your search' : 'No users available'}
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="p-4 hover:bg-gray-50 flex items-center justify-between group"
                  >
                    <div>
                      <div className="font-medium text-gray-900">{user.full_name}</div>
                      <div className="text-sm text-gray-500 capitalize">{user.role}</div>
                      {user.phone_number && (
                        <div className="text-xs text-gray-400 mt-1">{user.phone_number}</div>
                      )}
                    </div>
                    <button
                      onClick={() => handleStartCall(user.id, user.full_name)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all opacity-100 group-hover:opacity-100 md:opacity-0"
                    >
                      <Phone className="w-4 h-4" />
                      <span className="hidden sm:inline">Call</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
