import api from '../api';
import { unwrapCollection } from '../unwrapApi';

export function fetchNotifications(params = {}) {
  return api
    .get('/notifications', {
      params: { per_page: 50, ...params },
    })
    .then((r) => {
      const d = r.data;
      return {
        notifications: unwrapCollection(d, 'notifications'),
        unread_count: d.unread_count ?? 0,
        meta: d.meta,
      };
    });
}

export function fetchNotificationsSummary(params = {}) {
  return api
    .get('/notifications/summary', { params })
    .then((r) => {
      const d = r.data;
      const raw = d.notifications;
      const list = Array.isArray(raw) ? raw : raw?.data || [];
      return {
        notifications: list,
        unread_count: d.unread_count ?? 0,
      };
    });
}

export function markNotificationRead(notificationId) {
  return api.post('/notifications/read', { notification_id: notificationId });
}

export function markAllNotificationsRead() {
  return api.post('/notifications/read-all');
}
