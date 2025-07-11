import React, { useState, useEffect, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';
import socketService from '../services/socket';
import './NotificationCenter.css';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  readAt?: string;
  createdAt: string;
  relatedId?: string;
  relatedType?: string;
}

interface NotificationCenterProps {
  onClose?: () => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ onClose }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchUnreadCount();
      
      // リアルタイム通知の購読
      const socket = socketService.getSocket();
      socket?.on('notification', handleNewNotification);
      
      return () => {
        socket?.off('notification');
      };
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async (pageNum = 1) => {
    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/notifications?page=${pageNum}&limit=20`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      if (!response.ok) throw new Error('Failed to fetch notifications');
      
      const data = await response.json();
      
      if (pageNum === 1) {
        setNotifications(data.notifications);
      } else {
        setNotifications(prev => [...prev, ...data.notifications]);
      }
      
      setHasMore(data.page < data.totalPages);
      setUnreadCount(data.unreadCount);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/notifications/unread-count`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      if (!response.ok) throw new Error('Failed to fetch unread count');
      
      const data = await response.json();
      setUnreadCount(data.count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const handleNewNotification = (notification: Notification) => {
    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);
    
    // ブラウザ通知を表示
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/logo192.png'
      });
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/notifications/${notificationId}/read`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      if (!response.ok) throw new Error('Failed to mark as read');
      
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, read: true, readAt: new Date().toISOString() } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/notifications/mark-all-read`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      if (!response.ok) throw new Error('Failed to mark all as read');
      
      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchNotifications(nextPage);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'quest_created':
        return '🆕';
      case 'quest_accepted':
        return '✋';
      case 'quest_completed':
      case 'quest_completed_self':
        return '✅';
      case 'level_up':
        return '🎉';
      case 'achievement_unlocked':
        return '🏆';
      default:
        return '📢';
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  return (
    <div className="notification-center" ref={dropdownRef}>
      <button
        className="notification-bell"
        onClick={() => {
          setShowDropdown(!showDropdown);
          requestNotificationPermission();
        }}
      >
        <svg className="notification-bell__icon" viewBox="0 0 24 24">
          <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
        </svg>
        {unreadCount > 0 && (
          <span className="notification-bell__badge">{unreadCount}</span>
        )}
      </button>

      {showDropdown && (
        <div className="notification-dropdown">
          <div className="notification-dropdown__header">
            <h3>通知</h3>
            {unreadCount > 0 && (
              <button
                className="notification-dropdown__mark-all"
                onClick={markAllAsRead}
              >
                すべて既読にする
              </button>
            )}
          </div>

          <div className="notification-dropdown__content">
            {loading && notifications.length === 0 ? (
              <div className="notification-dropdown__loading">読み込み中...</div>
            ) : notifications.length === 0 ? (
              <div className="notification-dropdown__empty">
                <p>通知はありません</p>
              </div>
            ) : (
              <>
                {notifications.map(notification => (
                  <div
                    key={notification.id}
                    className={`notification-item ${
                      !notification.read ? 'notification-item--unread' : ''
                    }`}
                    onClick={() => !notification.read && markAsRead(notification.id)}
                  >
                    <div className="notification-item__icon">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="notification-item__content">
                      <div className="notification-item__title">
                        {notification.title}
                      </div>
                      <div className="notification-item__message">
                        {notification.message}
                      </div>
                      <div className="notification-item__time">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                          locale: ja
                        })}
                      </div>
                    </div>
                  </div>
                ))}
                {hasMore && (
                  <button
                    className="notification-dropdown__load-more"
                    onClick={loadMore}
                    disabled={loading}
                  >
                    {loading ? '読み込み中...' : 'もっと見る'}
                  </button>
                )}
              </>
            )}
          </div>

          <div className="notification-dropdown__footer">
            <a
              href="/settings/notifications"
              className="notification-dropdown__settings"
            >
              通知設定
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;