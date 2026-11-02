import { storageService } from './storageService';

/**
 * Notification Service
 * Manages event alerts across verifications, claims, and approvals.
 */

export const notificationService = {
  getUserNotifications(userId) {
    const notifs = storageService.getNotifications();
    return notifs.filter(n => !n.recipientUserId || n.recipientUserId === userId);
  },

  createNotification(notifData) {
    const notifs = storageService.getNotifications();
    const newNotif = {
      id: `notif-${Date.now()}`,
      recipientUserId: notifData.recipientUserId || null,
      type: notifData.type || 'info',
      title: notifData.title,
      message: notifData.message,
      readAt: null,
      createdAt: new Date().toISOString()
    };
    storageService.setNotifications([newNotif, ...notifs]);
    return newNotif;
  },

  markAsRead(notificationId) {
    const notifs = storageService.getNotifications();
    const updated = notifs.map(n => 
      n.id === notificationId ? { ...n, readAt: new Date().toISOString() } : n
    );
    storageService.setNotifications(updated);
    return updated;
  }
};
