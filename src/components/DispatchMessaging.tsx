import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Send, User, Search, Phone, Video, MoreVertical, Paperclip } from 'lucide-react';

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  message: string;
  created_at: string;
  read: boolean;
  sender?: {
    full_name: string;
    photo_url?: string;
  };
}

interface Conversation {
  user_id: string;
  user_name: string;
  user_photo?: string;
  last_message?: string;
  last_message_time?: string;
  unread_count: number;
}

export default function DispatchMessaging() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  useEffect(() => {
    if (selectedConversation && user) {
      loadMessages(selectedConversation.user_id);
      markAsRead(selectedConversation.user_id);

      const subscription = supabase
        .channel(`messages-${user.id}-${selectedConversation.user_id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
          },
          (payload) => {
            const newMsg = payload.new as Message;
            if (
              (newMsg.sender_id === user.id && newMsg.recipient_id === selectedConversation.user_id) ||
              (newMsg.sender_id === selectedConversation.user_id && newMsg.recipient_id === user.id)
            ) {
              setMessages(prev => [...prev, newMsg]);
              if (newMsg.sender_id === selectedConversation.user_id) {
                markAsRead(selectedConversation.user_id);
              }
            }
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [selectedConversation, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function loadConversations() {
    try {
      const { data: drivers, error: driversError } = await supabase
        .from('profiles')
        .select('id, full_name, photo_url')
        .eq('role', 'driver');

      if (driversError) throw driversError;

      const conversationsData: Conversation[] = [];

      for (const driver of drivers || []) {
        const { data: lastMessage } = await supabase
          .from('messages')
          .select('message, created_at')
          .or(`sender_id.eq.${driver.id},recipient_id.eq.${driver.id}`)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const { count: unreadCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('sender_id', driver.id)
          .eq('recipient_id', user?.id)
          .eq('read', false);

        conversationsData.push({
          user_id: driver.id,
          user_name: driver.full_name,
          user_photo: driver.photo_url,
          last_message: lastMessage?.message,
          last_message_time: lastMessage?.created_at,
          unread_count: unreadCount || 0,
        });
      }

      conversationsData.sort((a, b) => {
        const timeA = a.last_message_time ? new Date(a.last_message_time).getTime() : 0;
        const timeB = b.last_message_time ? new Date(b.last_message_time).getTime() : 0;
        return timeB - timeA;
      });

      setConversations(conversationsData);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  }

  async function loadMessages(userId: string) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!sender_id(full_name, photo_url)
        `)
        .or(`and(sender_id.eq.${user?.id},recipient_id.eq.${userId}),and(sender_id.eq.${userId},recipient_id.eq.${user?.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }

  async function sendMessage() {
    if (!newMessage.trim() || !selectedConversation || !user) return;

    setSending(true);
    try {
      const { error } = await supabase.from('messages').insert({
        sender_id: user.id,
        recipient_id: selectedConversation.user_id,
        message: newMessage.trim(),
        read: false,
      });

      if (error) throw error;

      setNewMessage('');
      await loadConversations();
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  }

  async function markAsRead(userId: string) {
    try {
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('sender_id', userId)
        .eq('recipient_id', user?.id)
        .eq('read', false);

      await loadConversations();
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  const filteredConversations = conversations.filter(conv =>
    conv.user_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex overflow-hidden bg-white">
      <div className="w-96 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search drivers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map((conv) => (
            <div
              key={conv.user_id}
              onClick={() => setSelectedConversation(conv)}
              className={`p-4 cursor-pointer border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                selectedConversation?.user_id === conv.user_id ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="relative flex-shrink-0">
                  {conv.user_photo ? (
                    <img
                      src={conv.user_photo}
                      alt={conv.user_name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="w-6 h-6 text-blue-600" />
                    </div>
                  )}
                  {conv.unread_count > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-white">{conv.unread_count}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-gray-900 truncate">{conv.user_name}</h3>
                    {conv.last_message_time && (
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        {new Date(conv.last_message_time).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    )}
                  </div>
                  {conv.last_message && (
                    <p className="text-sm text-gray-600 truncate">{conv.last_message}</p>
                  )}
                </div>
              </div>
            </div>
          ))}

          {filteredConversations.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <User className="w-12 h-12 mb-2 opacity-50" />
              <p className="text-sm">No conversations found</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedConversation.user_photo ? (
                    <img
                      src={selectedConversation.user_photo}
                      alt={selectedConversation.user_name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-900">{selectedConversation.user_name}</h3>
                    <p className="text-sm text-green-600">Online</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <Phone className="w-5 h-5 text-gray-600" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <Video className="w-5 h-5 text-gray-600" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <MoreVertical className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              <div className="space-y-4">
                {messages.map((message) => {
                  const isSender = message.sender_id === user?.id;
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex gap-2 max-w-md ${isSender ? 'flex-row-reverse' : 'flex-row'}`}>
                        {!isSender && (
                          <div className="flex-shrink-0">
                            {selectedConversation.user_photo ? (
                              <img
                                src={selectedConversation.user_photo}
                                alt={selectedConversation.user_name}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                <User className="w-4 h-4 text-blue-600" />
                              </div>
                            )}
                          </div>
                        )}
                        <div
                          className={`px-4 py-2 rounded-2xl ${
                            isSender
                              ? 'bg-blue-600 text-white'
                              : 'bg-white text-gray-900 border border-gray-200'
                          }`}
                        >
                          <p className="text-sm break-words">{message.message}</p>
                          <p
                            className={`text-xs mt-1 ${
                              isSender ? 'text-blue-200' : 'text-gray-500'
                            }`}
                          >
                            {new Date(message.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex items-end gap-2">
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0">
                  <Paperclip className="w-5 h-5 text-gray-600" />
                </button>
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Type a message..."
                  rows={1}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sending}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">Press Enter to send, Shift+Enter for new line</p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center text-gray-500">
              <User className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Select a conversation</p>
              <p className="text-sm">Choose a driver from the list to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
