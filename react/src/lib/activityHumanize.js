/**
 * Humanise une ligne du fil d'activité global.
 *
 * @param {object} activity — entrée API activity feed
 * @param {{ id?: number, name?: string }} [currentUser]
 */
export function humanizeActivityLine(activity, currentUser) {
  const name        = activity.actor?.name || 'Un membre';
  const meta        = activity.metadata || {};
  const title       = meta.task_title || (activity.target_type === 'task' ? `Tâche #${activity.target_id}` : '');
  const projectName = meta.project_name;

  switch (activity.action) {
    case 'created_task':
      return {
        line:  `${name} a créé la tâche`,
        quote: title ? `« ${title} »` : null,
        extra: projectName || null,
      };

    case 'updated_task':
      return {
        line:  `${name} a mis à jour une tâche`,
        quote: title ? `« ${title} »` : null,
        extra: projectName || null,
      };

    case 'deleted_task':
      return {
        line:  `${name} a supprimé la tâche`,
        quote: title ? `« ${title} »` : null,
        extra: projectName || null,
      };

    case 'assigned_task': {
      const assigneeId = meta.assignee_user_id;
      const isYou      = currentUser?.id != null && assigneeId === currentUser.id;
      return {
        line:  isYou ? `${name} vous a assigné une tâche` : `${name} a assigné une tâche`,
        quote: title ? `« ${title} »` : null,
        extra: projectName || null,
      };
    }

    case 'completed_task':
      return {
        line:  `${name} a terminé la tâche`,
        quote: title ? `« ${title} »` : null,
        extra: projectName || null,
      };

    case 'commented_task':
      return {
        line:  `${name} a commenté sur`,
        quote: title ? `« ${title} »` : null,
        extra: projectName || null,
      };

    case 'joined_project':
      return {
        line:  `${name} a rejoint le projet`,
        quote: projectName ? `« ${projectName} »` : null,
        extra: null,
      };

    case 'created_project':
      return {
        line:  `${name} a créé le projet`,
        quote: projectName ? `« ${projectName} »` : null,
        extra: null,
      };

    case 'project.paused':
      return {
        line:  `${name} a mis le projet en pause`,
        quote: projectName ? `« ${projectName} »` : null,
        extra: meta.pause_reason || null,
      };

    case 'project.resumed':
      return {
        line:  `${name} a repris le projet`,
        quote: projectName ? `« ${projectName} »` : null,
        extra: null,
      };

    default:
      return {
        line:  `${name} — ${activity.action.replace(/_/g, ' ')}`,
        quote: title || null,
        extra: projectName || null,
      };
  }
}
