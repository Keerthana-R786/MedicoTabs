import React, { useState, useEffect } from 'react';
import { Bell, LogOut, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { notificationsAPI } from '@/services/api';
import { Notification } from '@/types';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await notificationsAPI.getAll();
      setNotifications(data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <header className="app-header px-6 py-4 mx-4 mt-4 mb-2">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Welcome, Dr. {user?.lastName}
          </h2>
          <p className="text-sm text-white/55 mt-0.5">{user?.organization}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotifications(!showNotifications)}
              className="app-header__icon-btn"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="app-header__badge">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-3 w-80 neu-card p-0 z-50 overflow-hidden">
                <div className="p-4 border-b border-base-300 flex items-center justify-between">
                  <h3 className="font-bold text-base-800 text-sm">Notifications</h3>
                  <Link
                    to="/notifications"
                    onClick={() => setShowNotifications(false)}
                    className="text-xs font-semibold text-primary-700 hover:text-primary-800"
                  >
                    View all
                  </Link>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-base-400 text-sm">No notifications</div>
                  ) : (
                    notifications.slice(0, 5).map((notif) => (
                      <Link
                        key={notif.id}
                        to="/notifications"
                        onClick={() => setShowNotifications(false)}
                        className={`block px-4 py-3 border-b border-base-100 transition-colors ${
                          !notif.isRead ? 'bg-primary-50' : 'bg-base-200'
                        }`}
                      >
                        <p className="font-semibold text-sm text-base-800">{notif.title}</p>
                        <p className="text-xs text-base-500 mt-1">{notif.message}</p>
                        <p className="text-[10px] text-base-400 mt-1.5">
                          {new Date(notif.createdAt).toLocaleString()}
                        </p>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="app-header__user flex items-center gap-3 pl-2.5 pr-4 py-1.5">
            <div className="app-header__avatar w-9 h-9 rounded-full flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-primary-800" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-white">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-[10px] text-white/50 uppercase tracking-wider font-medium">
                {user?.role?.replace('_', ' ')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            className="app-header__icon-btn"
            title="Logout"
            aria-label="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
