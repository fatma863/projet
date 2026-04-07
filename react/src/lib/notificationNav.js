/**
 * Cible navigation depuis une notification (données Laravel).
 * @returns {{ to: string } | null}
 */
export function getNotificationLink(notification) {
  const d = notification?.data || {};
  const taskId = d.task_id ?? notification?.related_task_id;
  const projectId = d.project_id;

  if (notification?.type === 'project_invitation' && d.token) {
    return { to: `/accept-invite?token=${encodeURIComponent(d.token)}` };
  }

  if (taskId && projectId) {
    return { to: `/projects/${projectId}?highlightTask=${taskId}` };
  }

  if (projectId) {
    return { to: `/projects/${projectId}` };
  }

  return null;
}
