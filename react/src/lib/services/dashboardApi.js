import api from '../api';

export function fetchMemberDashboard() {
  return api.get('/member/dashboard').then((r) => r.data);
}

export function fetchAdminDashboard() {
  return api.get('/admin/dashboard').then((r) => r.data.dashboard);
}

export function fetchActivityFeed(params = {}) {
  return api
    .get('/activity/feed', {
      params: { per_page: 15, page: 1, ...params },
    })
    .then((r) => r.data);
}
