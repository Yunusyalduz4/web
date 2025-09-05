"use client";
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Bell } from 'lucide-react';
import NotificationsModal from './NotificationsModal';
import { useWebSocket } from '../contexts/WebSocketContext';

interface NotificationsButtonProps {
  userType: 'user' | 'business';
}

export default function NotificationsButton({ userType }: NotificationsButtonProps) {
  const { data: session } = useSession();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (session?.user?.id) {
      fetchUnreadCount();
    }
  }, [session]);

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch(`/api/notifications?userType=${userType}&userId=${session?.user?.id}`);
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Unread count fetch error:', error);
    }
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    // Modal kapandığında unread count'u güncelle
    fetchUnreadCount();
  };

  if (!session) return null;

  return (
    <>
      <button
        onClick={handleOpenModal}
        className="relative p-2 hover:bg-white/20 rounded-lg transition-colors group"
        aria-label="Bildirimler"
      >
        <Bell className="w-5 h-5 text-gray-700 group-hover:text-gray-900 transition-colors" />
        
        {/* Unread count badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        
        {/* Hover effect */}
        <div className="absolute inset-0 bg-white/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>

      <NotificationsModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        userType={userType}
      />
    </>
  );
}
