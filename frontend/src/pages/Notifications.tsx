import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, CheckCheck, FileText, MessageSquare, AlertTriangle, ShieldCheck, Info,
} from 'lucide-react';
import { mockNotificationsAPI } from '@/services/mockAPI';
import { Notification } from '@/types';
import { useToast } from '@/contexts/ToastContext';

const TYPE_META: Record<
  Notification['type'],
  { label: string; icon: typeof Bell; badge: string }
> = {
  referral: { label: 'Referral', icon: FileText, badge: 'bg-primary-100 text-primary-700' },
  approval: { label: 'Approval', icon: ShieldCheck, badge: 'bg-warning-100 text-warning-700' },
  message: { label: 'Message', icon: MessageSquare, badge: 'bg-primary-50 text-primary-700' },
  alert: { label: 'Alert', icon: AlertTriangle, badge: 'bg-danger-100 text-danger-700' },
  system: { label: 'System', icon: Info, badge: 'bg-base-300 text-base-700' },
};

const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const { success } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await mockNotificationsAPI.getAll();
      setNotifications(data.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)));
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    await mockNotificationsAPI.markAsRead(id);
    await loadNotifications();
  };

  const handleMarkAllRead = async () => {
    await mockNotificationsAPI.markAllAsRead();
    await loadNotifications();
    success('All caught up', 'Every notification is marked as read.');
  };

  const handleOpen = async (notif: Notification) => {
    if (!notif.isRead) await handleMarkRead(notif.id);
    if (notif.actionUrl?.startsWith('/approvals')) {
      navigate('/approvals');
      return;
    }
    if (notif.type === 'message') {
      navigate('/messages');
      return;
    }
    if (notif.type === 'referral') {
      navigate('/referrals');
      return;
    }
  };

  const visible = filter === 'unread' ? notifications.filter((n) => !n.isRead) : notifications;
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="text-base-500 mt-1 text-sm">
            Referral updates, approvals, and care-team alerts
            {unreadCount > 0 ? ` · ${unreadCount} unread` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={handleMarkAllRead}
          disabled={unreadCount === 0}
          className="neu-btn flex items-center gap-2 text-sm disabled:opacity-50"
        >
          <CheckCheck className="w-4 h-4" />
          Mark all read
        </button>
      </div>

      <div className="neu-card p-6">
        <div className="neu-pressed rounded-xl p-1.5 flex gap-1 mb-5 max-w-xs">
          {[
            { id: 'all' as const, label: 'All' },
            { id: 'unread' as const, label: 'Unread' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                filter === tab.id
                  ? 'bg-base-200 text-primary-700 shadow-neu-btn'
                  : 'text-base-500 hover:text-base-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {loading && (
            <div className="neu-pressed rounded-2xl text-center py-14 text-sm text-base-500">
              Loading notifications...
            </div>
          )}

          {!loading &&
            visible.map((notif) => {
              const meta = TYPE_META[notif.type] || TYPE_META.system;
              const Icon = meta.icon;
              return (
                <button
                  key={notif.id}
                  type="button"
                  onClick={() => handleOpen(notif)}
                  className={`neu-btn w-full flex items-start gap-4 px-5 py-4 text-left ${
                    !notif.isRead ? 'ring-1 ring-primary-200' : ''
                  }`}
                >
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      !notif.isRead ? 'bg-primary-100 text-primary-700' : 'bg-base-200 text-base-500'
                    }`}
                    style={
                      notif.isRead
                        ? { boxShadow: 'inset 3px 3px 6px #d0cec6, inset -3px -3px 6px #ffffff' }
                        : undefined
                    }
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-base-800 text-sm">{notif.title}</h3>
                      <span className={`neu-badge ${meta.badge}`}>{meta.label}</span>
                      {!notif.isRead && (
                        <span className="w-2 h-2 rounded-full bg-primary-600" aria-label="Unread" />
                      )}
                    </div>
                    <p className="text-xs text-base-600 mt-1 leading-relaxed">{notif.message}</p>
                    <p className="text-[10px] text-base-400 mt-2">
                      {new Date(notif.createdAt).toLocaleString()}
                    </p>
                  </div>
                </button>
              );
            })}

          {!loading && visible.length === 0 && (
            <div className="neu-pressed rounded-2xl text-center py-14">
              <Bell className="w-14 h-14 text-base-300 mx-auto mb-3" />
              <p className="text-base-500">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notifications;
