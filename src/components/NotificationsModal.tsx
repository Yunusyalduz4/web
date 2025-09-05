"use client";
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Bell, X, Check, Clock, AlertCircle } from 'lucide-react';
import { useRealTimeNotifications } from '../hooks/useRealTimeUpdates';

interface Notification {
  id: string;
  message: string;
  read: boolean;
  created_at: string;
  type?: 'appointment' | 'review' | 'system' | 'reminder';
}

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userType: 'user' | 'business';
}

export default function NotificationsModal({ isOpen, onClose, userType }: NotificationsModalProps) {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // WebSocket entegrasyonu
  const userId = session?.user?.id;
  const businessId = session?.user?.businessId;
  const { setCallbacks: setNotificationCallbacks } = useRealTimeNotifications(userId, businessId);

  useEffect(() => {
    if (isOpen && session) {
      fetchNotifications();
    }
  }, [isOpen, session]);

  // WebSocket callback'lerini ayarla
  useEffect(() => {
    setNotificationCallbacks({
      onNotificationSent: () => {
        console.log('🔄 Yeni bildirim geldi - liste güncelleniyor');
        fetchNotifications();
      },
      onNotificationRead: () => {
        console.log('🔄 Bildirim okundu - liste güncelleniyor');
        fetchNotifications();
      }
    });
  }, [setNotificationCallbacks]);

  const fetchNotifications = async () => {
    if (!session?.user?.id) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/notifications?userType=${userType}&userId=${session.user.id}`);
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Bildirimler yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId 
              ? { ...notif, read: true }
              : notif
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Bildirim okundu olarak işaretlenirken hata:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userType, userId: session?.user?.id }),
      });
      
      if (response.ok) {
        setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Tüm bildirimler okundu olarak işaretlenirken hata:', error);
    }
  };

  const getNotificationIcon = (type?: string) => {
    switch (type) {
      case 'appointment':
      case 'new_appointment':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'review':
      case 'new_review':
        return <Check className="w-4 h-4 text-green-500" />;
      case 'reminder':
      case 'appointment_reminder':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'appointment_status_update':
        return <Clock className="w-4 h-4 text-purple-500" />;
      case 'business_approval':
        return <Check className="w-4 h-4 text-indigo-500" />;
      case 'employee_appointment':
        return <Clock className="w-4 h-4 text-cyan-500" />;
      case 'favorite_business':
        return <Bell className="w-4 h-4 text-pink-500" />;
      case 'system':
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Az önce';
    if (diffInHours < 24) return `${diffInHours} saat önce`;
    if (diffInHours < 48) return 'Dün';
    
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-32">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl max-h-[70vh] overflow-hidden transform">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-900">
              Bildirimler
              {unreadCount > 0 && (
                <span className="ml-2 px-2 py-1 text-xs font-medium bg-red-500 text-white rounded-full">
                  {unreadCount}
                </span>
              )}
            </h2>
          </div>
          
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Tümünü okundu işaretle
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"></div>
              <p className="text-gray-500 text-sm">Bildirimler yükleniyor...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Henüz bildiriminiz yok</p>
              <p className="text-gray-400 text-xs mt-1">
                {userType === 'user' 
                  ? 'Randevu güncellemeleri burada görünecek'
                  : 'Yeni randevu talepleri burada görünecek'
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                    !notification.read ? 'bg-blue-50/50' : ''
                  }`}
                  onClick={() => !notification.read && markAsRead(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${
                        notification.read ? 'text-gray-600' : 'text-gray-900 font-medium'
                      }`}>
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDate(notification.created_at)}
                      </p>
                    </div>
                    
                    {!notification.read && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-4 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-500 text-center">
              {notifications.length} bildirim
              {unreadCount > 0 && ` • ${unreadCount} okunmamış`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
