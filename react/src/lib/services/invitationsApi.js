import api from '../api';

export function fetchMyInvites() {
  return api.get('/my-invites').then((r) => r.data);
}

/** Acceptation invitation projet (alias REST vers InvitationController). */
export function acceptProjectInvite(token) {
  return api.post('/invites/accept', { token });
}

export function declineProjectInvite(token) {
  return api.post('/invites/decline', { token });
}
