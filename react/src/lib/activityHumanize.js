/**
 * @param {object} activity — entrée API activity feed
 * @param {{ id?: number, name?: string }} [currentUser]
 */
export function humanizeActivityLine(activity, currentUser) {
  const name = activity.actor?.name || 'Un membre';
  const meta = activity.metadata || {};
  const title = meta.task_title || (activity.target_type === 'task' ? `Tâche #${activity.target_id}` : '');
  const projectName = meta.project_name;

  switch (activity.action) {
    case 'created_task':
      return {
        line: `${name} a créé la tâche`,
        quote: title ? `« ${title} »` : null,
        extra: projectName ? projectName : null,
      };
    case 'updated_task':
      return {
        line: `${name} a mis à jour une tâche`,
        quote: title ? `« ${title} »` : null,
        extra: projectName || null,
      };
    case 'assigned_task': {
      const assigneeId = meta.assignee_user_id;
      const isYou = currentUser?.id != null && assigneeId === currentUser.id;
      return {
        line: isYou ? `${name} vous a assigné une tâche` : `${name} a assigné une tâche`,
        quote: title ? `« ${title} »` : null,
        extra: projectName || null,
      };
    }
    case 'joined_project':
      return {
        line: `${name} a rejoint le projet`,
        quote: projectName ? `« ${projectName} »` : null,
        extra: null,
      };
    default:
      return {
        line: `${name} — ${activity.action}`,
        quote: title || null,
        extra: null,
      };
  }
}
