import { useState, useEffect } from 'react';
import { supabase, Notification } from '../lib/supabase';
import { Search, Calendar, User } from 'lucide-react';

interface NotificationWithUser extends Notification {
  profiles?: {
    id: string;
    full_name: string;
    email: string | null;
    photo_url: string | null;
  };
}

export function NotificationsPanel() {
  const [notifications, setNotifications] = useState<NotificationWithUser[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<NotificationWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  useEffect(() => {
    loadNotifications();

    const subscription = supabase
      .channel('notifications_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    filterNotifications();
  }, [notifications, searchQuery, selectedDate]);

  async function loadNotifications() {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          profiles (
            id,
            full_name,
            email,
            photo_url
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  }

  function filterNotifications() {
    let filtered = [...notifications];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (notification) =>
          notification.message.toLowerCase().includes(query) ||
          notification.profiles?.full_name.toLowerCase().includes(query)
      );
    }

    if (selectedDate) {
      filtered = filtered.filter((notification) => {
        const notificationDate = new Date(notification.created_at).toISOString().split('T')[0];
        return notificationDate === selectedDate;
      });
    }

    setFilteredNotifications(filtered);
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading notifications...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500">
              Showing {filteredNotifications.length} {filteredNotifications.length === 1 ? 'entry' : 'entries'}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <Calendar className="w-5 h-5 text-gray-400" />
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 w-64"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <p className="text-lg font-medium">No notifications found</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      {notification.profiles?.photo_url ? (
                        <img
                          src={notification.profiles.photo_url}
                          alt={notification.profiles.full_name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-gray-600" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {notification.profiles?.full_name || 'Unknown User'}
                      </h3>
                      <p className="text-sm text-gray-700 mb-2">{notification.message}</p>
                      <p className="text-xs text-gray-500">{formatDate(notification.created_at)}</p>
                    </div>

                    <div className="flex-shrink-0">
                      <span className="px-3 py-1 bg-blue-600 text-white text-sm font-medium rounded">
                        {notification.status.charAt(0).toUpperCase() + notification.status.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
