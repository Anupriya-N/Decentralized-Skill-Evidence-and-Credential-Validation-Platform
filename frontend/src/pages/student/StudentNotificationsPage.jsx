import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { formatDateTime } from '../../utils/formatUtils';
import { Bell, CheckCheck, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export const StudentNotificationsPage = () => {
  const { user } = useAuth();
  const { notifications, markNotificationRead } = useApp();

  const userNotifs = notifications.filter(n => !n.recipientUserId || n.recipientUserId === user?.id);

  const markAllRead = () => {
    userNotifs.forEach(n => markNotificationRead(n.id));
    toast.success('All notifications marked as read.');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Notifications</h1>
          <p className="text-xs text-slate-500 mt-0.5">Stay updated on verifications, approvals, and credential requests.</p>
        </div>
        {userNotifs.some(n => !n.readAt) && (
          <Button variant="secondary" size="sm" icon={CheckCheck} onClick={markAllRead}>
            Mark All Read
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {userNotifs.length === 0 ? (
          <Card className="text-center py-12 text-xs text-slate-400">
            <Bell className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            No notifications available.
          </Card>
        ) : (
          userNotifs.map(n => (
            <Card
              key={n.id}
              className={`p-4 transition-all ${
                !n.readAt ? 'border-l-4 border-l-brand-600 bg-brand-50/20' : 'bg-white'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">{n.title}</h3>
                    {!n.readAt && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded uppercase bg-brand-100 text-brand-700">
                        New
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>
                  <span className="text-[10px] text-slate-400 font-mono block pt-1">
                    {formatDateTime(n.createdAt)}
                  </span>
                </div>
                {!n.readAt && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markNotificationRead(n.id)}
                  >
                    Mark Read
                  </Button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
