import { WORKFLOW_OPTIONS, PRIORITY_OPTIONS, ISSUE_TYPE_LABELS } from './taskConstants';
import { formatProjectRole } from './roles';

const FIELD_LABELS = {
  title: 'Titre',
  description: 'Description',
  priority: 'Priorité',
  workflow_status: 'État du workflow',
  status_id: 'Colonne Kanban',
  progress_percent: 'Progression',
  planned_start: 'Début planifié',
  planned_end: 'Fin planifiée',
  due_date: 'Échéance',
  issue_type: 'Type de ticket',
  assignee_id: 'Assignation',
  story_points: "Points d'effort",
  sprint_id: 'Sprint',
};

const FIELD_ORDER = [
  'workflow_status',
  'priority',
  'issue_type',
  'title',
  'description',
  'status_id',
  'progress_percent',
  'planned_start',
  'planned_end',
  'due_date',
  'assignee_id',
  'story_points',
  'sprint_id',
];

function optLabel(map, value) {
  if (value == null || value === '') return '—';
  const found = map.find((o) => o.value === value);
  return found?.label ?? String(value);
}

function formatDateFr(iso) {
  if (iso == null || iso === '') return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function truncate(s, max = 120) {
  if (s == null) return '';
  const t = String(s).trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).trim()}…`;
}

/** Couleurs cohérentes avec le workflow (badges). */
export function workflowBadgeClass(status) {
  switch (status) {
    case 'done':
      return 'border-emerald-500/40 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100';
    case 'in_progress':
      return 'border-amber-500/40 bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-100';
    case 'at_risk':
      return 'border-red-500/40 bg-red-50 text-red-900 dark:bg-red-950/50 dark:text-red-100';
    case 'todo':
    default:
      return 'border-slate-400/40 bg-slate-50 text-slate-800 dark:bg-slate-900/60 dark:text-slate-100';
  }
}

export function priorityBadgeClass(priority) {
  switch (priority) {
    case 'urgent':
      return 'border-red-500/40 bg-red-50 text-red-900 dark:bg-red-950/50 dark:text-red-100';
    case 'high':
      return 'border-orange-500/40 bg-orange-50 text-orange-900 dark:bg-orange-950/50 dark:text-orange-100';
    case 'medium':
      return 'border-amber-500/40 bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-100';
    case 'low':
      return 'border-blue-500/40 bg-blue-50 text-blue-900 dark:bg-blue-950/50 dark:text-blue-100';
    default:
      return 'border-border bg-muted text-foreground';
  }
}

/**
 * Ligne principale (titre de carte) pour une entrée d’historique projet.
 */
export function getActivityHeadline(action, meta = {}) {
  const title = meta.task_title ? ` · ${meta.task_title}` : '';
  const projectName = meta.project_name ? ` · ${meta.project_name}` : '';

  switch (action) {
    case 'task.created':
      return `Tâche créée${title}`;
    case 'task.updated':
      return `Tâche mise à jour${title}`;
    case 'task.deleted':
      return `Tâche supprimée${meta.task_title ? ` · ${meta.task_title}` : ''}`;
    case 'task.moved':
      return `Tâche déplacée sur le Kanban${title}`;
    case 'task.assigned':
      return `Tâche assignée${title}`;
    case 'task.unassigned':
      return `Assignation retirée${title}`;
    case 'task.dependency_added':
      return `Dépendance ajoutée${title}`;
    case 'task.dependency_removed':
      return `Dépendance retirée${title}`;
    case 'task.comment_added':
      return `Commentaire ajouté${title}`;
    case 'task.comment_deleted':
      return `Commentaire supprimé${title}`;
    case 'task.time_added':
      return `Temps enregistré${title}`;
    case 'task.time_deleted':
      return `Temps supprimé${title}`;
    case 'project.created':
      return `Projet créé${projectName}`;
    case 'project.updated':
      return `Projet mis à jour${projectName}`;
    case 'project.deleted':
      return `Projet supprimé${projectName}`;
    case 'project.member_role_changed':
      return meta.member_name
        ? `Rôle de ${meta.member_name} modifié`
        : 'Rôle d’un membre modifié';
    case 'project.member_removed':
      return 'Membre retiré du projet';
    case 'project.user_invited':
      return meta.email ? `Invitation envoyée à ${meta.email}` : 'Invitation envoyée';
    default:
      return action.replace(/\./g, ' · ');
  }
}

function humanizeChangedEntry(key, value) {
  const label = FIELD_LABELS[key] ?? key.replace(/_/g, ' ');

  if (key === 'workflow_status') {
    const text = optLabel(WORKFLOW_OPTIONS, value);
    return {
      key,
      label,
      value: text,
      kind: 'workflow',
      raw: value,
    };
  }
  if (key === 'priority') {
    return {
      key,
      label,
      value: optLabel(PRIORITY_OPTIONS, value),
      kind: 'priority',
      raw: value,
    };
  }
  if (key === 'issue_type') {
    return {
      key,
      label,
      value: ISSUE_TYPE_LABELS[value] ?? String(value),
      kind: 'issue',
      raw: value,
    };
  }
  if (key === 'status_id') {
    return {
      key,
      label,
      value: value != null ? `#${value}` : '—',
      kind: 'text',
    };
  }
  if (key === 'assignee_id') {
    return {
      key,
      label,
      value: value == null ? 'Non assigné' : `Utilisateur #${value}`,
      kind: 'text',
    };
  }
  if (key === 'progress_percent') {
    return {
      key,
      label,
      value: value != null ? `${value} %` : '—',
      kind: 'text',
    };
  }
  if (key === 'story_points') {
    return {
      key,
      label,
      value: value != null ? `${value} pts` : '—',
      kind: 'text',
    };
  }
  if (key === 'sprint_id') {
    return {
      key,
      label,
      value: value != null ? `Sprint #${value}` : 'Hors sprint',
      kind: 'text',
    };
  }
  if (['planned_start', 'planned_end', 'due_date'].includes(key)) {
    return {
      key,
      label,
      value: formatDateFr(value),
      kind: 'date',
    };
  }
  if (key === 'title') {
    return { key, label, value: truncate(value, 200), kind: 'text' };
  }
  if (key === 'description') {
    const t = truncate(value, 160);
    return {
      key,
      label,
      value: t || '—',
      kind: 'multiline',
    };
  }

  return {
    key,
    label,
    value: value == null ? '—' : typeof value === 'object' ? JSON.stringify(value) : String(value),
    kind: 'text',
  };
}

/**
 * Détails lisibles (remplace l’affichage JSON de meta.changed).
 */
export function getChangedRows(changed) {
  if (!changed || typeof changed !== 'object') return [];
  const keys = Object.keys(changed);
  if (keys.length === 0) return [];

  const sorted = [...keys].sort((a, b) => {
    const ia = FIELD_ORDER.indexOf(a);
    const ib = FIELD_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  return sorted.map((k) => humanizeChangedEntry(k, changed[k]));
}

/**
 * Contexte supplémentaire selon l’action (hors bloc "changed").
 */
export function getActivityContextRows(action, meta = {}) {
  const rows = [];

  switch (action) {
    case 'task.created':
      if (meta.status_id != null) {
        rows.push({ key: 'kanban', label: 'Colonne Kanban initiale', value: `#${meta.status_id}`, kind: 'text' });
      }
      break;
    case 'task.moved':
      if (meta.status_id != null) {
        rows.push({ key: 'status', label: 'Colonne cible', value: `#${meta.status_id}`, kind: 'text' });
      }
      if (meta.kanban_order != null) {
        rows.push({ key: 'order', label: 'Position dans la colonne', value: String(meta.kanban_order), kind: 'text' });
      }
      break;
    case 'task.assigned':
      if (meta.assigned_user_id != null) {
        rows.push({
          key: 'assignee',
          label: 'Assigné à',
          value: `Utilisateur #${meta.assigned_user_id}`,
          kind: 'text',
        });
      }
      if (meta.allocation_percent != null) {
        rows.push({ key: 'alloc', label: 'Allocation', value: `${meta.allocation_percent} %`, kind: 'text' });
      }
      break;
    case 'task.unassigned':
      if (meta.unassigned_user_id != null) {
        rows.push({
          key: 'was',
          label: 'Membre retiré',
          value: `Utilisateur #${meta.unassigned_user_id}`,
          kind: 'text',
        });
      }
      break;
    case 'task.dependency_added':
      if (meta.depends_on_task_id != null) {
        rows.push({
          key: 'dep',
          label: 'Dépend de la tâche',
          value: `#${meta.depends_on_task_id}`,
          kind: 'text',
        });
      }
      if (meta.type) {
        rows.push({ key: 'depType', label: 'Type', value: meta.type, kind: 'text' });
      }
      break;
    case 'task.dependency_removed':
      if (meta.depends_on_task_id != null) {
        rows.push({
          key: 'dep',
          label: 'Dépendance vers la tâche',
          value: `#${meta.depends_on_task_id}`,
          kind: 'text',
        });
      }
      break;
    case 'task.comment_added':
      if (meta.comment_preview) {
        rows.push({
          key: 'preview',
          label: 'Aperçu',
          value: `« ${truncate(meta.comment_preview, 200)} »`,
          kind: 'multiline',
        });
      }
      break;
    case 'project.member_role_changed':
      if (meta.member_name) {
        rows.push({ key: 'member', label: 'Membre', value: meta.member_name, kind: 'text' });
      }
      if (meta.role) {
        rows.push({
          key: 'role',
          label: 'Nouveau rôle',
          value: formatProjectRole(meta.role),
          kind: 'text',
        });
      }
      break;
    case 'project.member_removed':
      if (meta.member_id != null) {
        rows.push({ key: 'mid', label: 'Membre (ID)', value: `#${meta.member_id}`, kind: 'text' });
      }
      break;
    case 'project.user_invited':
      if (meta.email) {
        rows.push({ key: 'email', label: 'E-mail', value: meta.email, kind: 'text' });
      }
      if (meta.role) {
        rows.push({
          key: 'invrole',
          label: 'Rôle proposé',
          value: formatProjectRole(meta.role),
          kind: 'text',
        });
      }
      break;
    case 'project.created':
      if (meta.project_code) {
        rows.push({ key: 'code', label: 'Code', value: meta.project_code, kind: 'text' });
      }
      break;
    default:
      break;
  }

  return rows;
}

/**
 * Toutes les lignes de détail à afficher sous une entrée.
 */
export function getActivityDetailRows(action, meta = {}) {
  const changedRows =
    action === 'task.updated' && meta.changed && typeof meta.changed === 'object'
      ? getChangedRows(meta.changed)
      : [];

  const contextRows = getActivityContextRows(action, meta);

  // Évite doublons si jamais les mêmes clés
  const seen = new Set(changedRows.map((r) => r.key));
  const extra = contextRows.filter((r) => !seen.has(r.key));

  return [...changedRows, ...extra];
}

/**
 * Clé d’icône Lucide pour l’entrée.
 */
export function getActivityIconName(action) {
  if (action.startsWith('task.comment')) return 'message';
  if (action.startsWith('task.time')) return 'clock';
  if (action.includes('dependency')) return 'link';
  if (action === 'task.created') return 'plus';
  if (action === 'task.updated') return 'pencil';
  if (action === 'task.deleted') return 'trash';
  if (action === 'task.moved') return 'layout';
  if (action === 'task.assigned' || action === 'task.unassigned') return 'user';
  if (action.startsWith('project.member') || action === 'project.user_invited') return 'users';
  if (action.startsWith('project.')) return 'folder';
  return 'activity';
}
