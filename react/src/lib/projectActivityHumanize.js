import { WORKFLOW_OPTIONS, PRIORITY_OPTIONS, ISSUE_TYPE_LABELS } from './taskConstants';
import { formatProjectRole } from './roles';

const FIELD_LABELS = {
  title: 'Titre',
  description: 'Description',
  priority: 'Priorité',
  workflow_status: 'Statut',
  status_id: 'Colonne Kanban',
  progress_percent: 'Progression',
  planned_start: 'Début planifié',
  planned_end: 'Fin planifiée',
  due_date: 'Échéance',
  issue_type: 'Type',
  assignee_id: 'Assignation',
  story_points: "Points d'effort",
  sprint_id: 'Sprint',
};

const FIELD_ORDER = [
  'workflow_status', 'priority', 'issue_type', 'title', 'description',
  'status_id', 'progress_percent', 'planned_start', 'planned_end',
  'due_date', 'assignee_id', 'story_points', 'sprint_id',
];

const WORKFLOW_LABELS = {
  todo: 'À faire',
  in_progress: 'En cours',
  done: 'Terminé',
  at_risk: 'À risque',
};

const PRIORITY_LABELS = {
  low: 'Basse',
  medium: 'Moyenne',
  high: 'Haute',
  urgent: 'Urgente',
};

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

function humanizeFieldValue(key, value) {
  if (key === 'workflow_status') return WORKFLOW_LABELS[value] ?? String(value);
  if (key === 'priority') return PRIORITY_LABELS[value] ?? optLabel(PRIORITY_OPTIONS, value);
  if (key === 'issue_type') return ISSUE_TYPE_LABELS[value] ?? String(value);
  if (key === 'progress_percent') return value != null ? `${value} %` : '—';
  if (key === 'story_points') return value != null ? `${value} pts` : '—';
  if (key === 'assignee_id') return value == null ? 'Non assigné' : `Utilisateur #${value}`;
  if (key === 'sprint_id') return value != null ? `Sprint #${value}` : 'Hors sprint';
  if (['planned_start', 'planned_end', 'due_date'].includes(key)) return formatDateFr(value);
  if (key === 'title') return truncate(value, 200);
  if (key === 'description') return truncate(value, 160) || '—';
  return value == null ? '—' : typeof value === 'object' ? JSON.stringify(value) : String(value);
}

export function workflowBadgeClass(status) {
  switch (status) {
    case 'done': return 'border-emerald-500/40 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100';
    case 'in_progress': return 'border-amber-500/40 bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-100';
    case 'at_risk': return 'border-red-500/40 bg-red-50 text-red-900 dark:bg-red-950/50 dark:text-red-100';
    default: return 'border-slate-400/40 bg-slate-50 text-slate-800 dark:bg-slate-900/60 dark:text-slate-100';
  }
}

export function priorityBadgeClass(priority) {
  switch (priority) {
    case 'urgent': return 'border-red-500/40 bg-red-50 text-red-900 dark:bg-red-950/50 dark:text-red-100';
    case 'high': return 'border-orange-500/40 bg-orange-50 text-orange-900 dark:bg-orange-950/50 dark:text-orange-100';
    case 'medium': return 'border-amber-500/40 bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-100';
    case 'low': return 'border-blue-500/40 bg-blue-50 text-blue-900 dark:bg-blue-950/50 dark:text-blue-100';
    default: return 'border-border bg-muted text-foreground';
  }
}

/**
 * Natural-language headline for an activity entry.
 * Uses actor name when provided for richer sentences.
 */
export function getActivityHeadline(action, meta = {}, actorName = null) {
  const actor  = actorName ? `${actorName}` : 'Un utilisateur';
  const task   = meta.task_title ? `"${meta.task_title}"` : 'une tâche';
  const proj   = meta.project_name ? `"${meta.project_name}"` : 'un projet';

  switch (action) {
    // ── Task actions ──────────────────────────────────────────────
    case 'task.created':
      return `${actor} a créé la tâche ${task}`;
    case 'task.updated': {
      const changed = meta.changed || {};
      const keys = Object.keys(changed);
      if (keys.length === 1) {
        const k = keys[0];
        if (k === 'workflow_status')
          return `${actor} a changé le statut de ${task}`;
        if (k === 'priority')
          return `${actor} a modifié la priorité de ${task}`;
        if (k === 'progress_percent')
          return `${actor} a mis à jour la progression de ${task}`;
      }
      return `${actor} a modifié la tâche ${task}`;
    }
    case 'task.deleted':
      return `${actor} a supprimé la tâche ${meta.task_title ? `"${meta.task_title}"` : ''}`;
    case 'task.moved': {
      const from = meta.from_status ?? '';
      const to   = meta.to_status ?? '';
      if (from && to)
        return `${actor} a déplacé ${task} de "${from}" vers "${to}"`;
      return `${actor} a déplacé ${task} sur le tableau Kanban`;
    }
    case 'task.assigned':
      return `${actor} a assigné ${task} à ${meta.assigned_user_name ?? `l'utilisateur #${meta.assigned_user_id}`}`;
    case 'task.unassigned':
      return `${actor} a retiré l'assignation de ${task}`;
    case 'task.dependency_added':
      return `${actor} a ajouté une dépendance à ${task}`;
    case 'task.dependency_removed':
      return `${actor} a retiré une dépendance de ${task}`;
    case 'task.comment_added':
      return `${actor} a commenté sur ${task}`;
    case 'task.comment_deleted':
      return `${actor} a supprimé un commentaire sur ${task}`;
    case 'task.time_added':
      return `${actor} a enregistré du temps sur ${task}`;
    case 'task.time_deleted':
      return `${actor} a supprimé une saisie de temps sur ${task}`;

    // ── Project actions ───────────────────────────────────────────
    case 'project.created':
      return `${actor} a créé le projet ${proj}`;
    case 'project.updated':
      return `${actor} a modifié le projet ${proj}`;
    case 'project.deleted':
      return `${actor} a supprimé le projet ${proj}`;
    case 'project.chef_changed':
      return `${actor} a changé le chef de projet`;
    case 'project.member_added':
      return meta.member_name
        ? `${actor} a ajouté ${meta.member_name} au projet`
        : `${actor} a ajouté un membre au projet`;
    case 'project.member_removed':
      return meta.member_name
        ? `${actor} a retiré ${meta.member_name} du projet`
        : `${actor} a retiré un membre du projet`;
    case 'project.member_role_changed':
      return meta.member_name
        ? `${actor} a modifié le rôle de ${meta.member_name}`
        : `${actor} a modifié le rôle d'un membre`;
    case 'project.user_invited':
      return meta.email
        ? `${actor} a invité ${meta.email} à rejoindre le projet`
        : `${actor} a envoyé une invitation`;
    case 'project.paused':
      return meta.pause_reason
        ? `${actor} a mis le projet en pause — ${meta.pause_reason}`
        : `${actor} a mis le projet en pause`;
    case 'project.resumed':
      return meta.resumed_to
        ? `${actor} a repris le projet (statut → ${meta.resumed_to})`
        : `${actor} a repris le projet`;

    default:
      return action.replace(/\./g, ' › ');
  }
}

function humanizeChangedEntry(key, newVal, oldVal) {
  const label   = FIELD_LABELS[key] ?? key.replace(/_/g, ' ');
  const newText = humanizeFieldValue(key, newVal);
  const oldText = oldVal !== undefined ? humanizeFieldValue(key, oldVal) : null;

  let kind = 'text';
  if (key === 'workflow_status') kind = 'workflow';
  else if (key === 'priority') kind = 'priority';
  else if (key === 'issue_type') kind = 'issue';
  else if (key === 'description') kind = 'multiline';

  return {
    key,
    label,
    value: newText,
    oldValue: oldText,
    hasChange: oldText !== null && oldText !== newText,
    kind,
    raw: newVal,
  };
}

export function getChangedRows(changed, oldValues = null) {
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

  return sorted.map((k) => humanizeChangedEntry(k, changed[k], oldValues?.[k]));
}

export function getActivityContextRows(action, meta = {}) {
  const rows = [];
  switch (action) {
    case 'task.created':
      if (meta.status_id != null) rows.push({ key: 'kanban', label: 'Colonne initiale', value: `#${meta.status_id}`, kind: 'text' });
      break;
    case 'task.moved':
      if (meta.from_status) rows.push({ key: 'from', label: 'Colonne source', value: meta.from_status, kind: 'text' });
      if (meta.to_status) rows.push({ key: 'to', label: 'Colonne cible', value: meta.to_status, kind: 'text' });
      else if (meta.status_id != null) rows.push({ key: 'status', label: 'Colonne cible', value: `#${meta.status_id}`, kind: 'text' });
      if (meta.kanban_order != null) rows.push({ key: 'order', label: 'Position', value: String(meta.kanban_order), kind: 'text' });
      break;
    case 'task.assigned':
      if (meta.assigned_user_name) rows.push({ key: 'assignee', label: 'Assigné à', value: meta.assigned_user_name, kind: 'text' });
      else if (meta.assigned_user_id != null) rows.push({ key: 'assignee', label: 'Assigné à', value: `Utilisateur #${meta.assigned_user_id}`, kind: 'text' });
      if (meta.allocation_percent != null) rows.push({ key: 'alloc', label: 'Allocation', value: `${meta.allocation_percent} %`, kind: 'text' });
      break;
    case 'task.unassigned':
      if (meta.unassigned_user_id != null) rows.push({ key: 'was', label: 'Membre retiré', value: `Utilisateur #${meta.unassigned_user_id}`, kind: 'text' });
      break;
    case 'task.dependency_added':
      if (meta.depends_on_task_id != null) rows.push({ key: 'dep', label: 'Dépend de', value: `Tâche #${meta.depends_on_task_id}`, kind: 'text' });
      if (meta.type) rows.push({ key: 'depType', label: 'Type', value: meta.type, kind: 'text' });
      break;
    case 'task.dependency_removed':
      if (meta.depends_on_task_id != null) rows.push({ key: 'dep', label: 'Dépendance vers', value: `Tâche #${meta.depends_on_task_id}`, kind: 'text' });
      break;
    case 'task.comment_added':
      if (meta.comment_preview) rows.push({ key: 'preview', label: 'Aperçu', value: `« ${truncate(meta.comment_preview, 200)} »`, kind: 'multiline' });
      break;
    case 'task.time_added':
      if (meta.minutes != null) rows.push({ key: 'time', label: 'Durée', value: `${meta.minutes} min`, kind: 'text' });
      break;
    case 'project.member_role_changed':
      if (meta.member_name) rows.push({ key: 'member', label: 'Utilisateur', value: meta.member_name, kind: 'text' });
      if (meta.role) rows.push({ key: 'role', label: 'Nouveau rôle', value: formatProjectRole(meta.role), kind: 'text' });
      break;
    case 'project.member_removed':
      if (meta.member_id != null) rows.push({ key: 'mid', label: 'Utilisateur (ID)', value: `#${meta.member_id}`, kind: 'text' });
      break;
    case 'project.user_invited':
      if (meta.email) rows.push({ key: 'email', label: 'E-mail', value: meta.email, kind: 'text' });
      if (meta.role) rows.push({ key: 'invrole', label: 'Rôle proposé', value: formatProjectRole(meta.role), kind: 'text' });
      break;
    case 'project.created':
      if (meta.project_code) rows.push({ key: 'code', label: 'Code', value: meta.project_code, kind: 'text' });
      break;
    case 'project.paused':
      if (meta.pause_reason)    rows.push({ key: 'reason',   label: 'Raison',          value: meta.pause_reason,    kind: 'text' });
      if (meta.previous_status) rows.push({ key: 'prev',     label: 'Statut précédent', value: meta.previous_status, kind: 'text' });
      if (meta.actor_name)      rows.push({ key: 'pausedBy', label: 'Mis en pause par', value: meta.actor_name,      kind: 'text' });
      break;
    case 'project.resumed':
      if (meta.resumed_to)  rows.push({ key: 'resumedTo', label: 'Repris avec statut', value: meta.resumed_to,  kind: 'text' });
      if (meta.actor_name)  rows.push({ key: 'resumedBy', label: 'Repris par',         value: meta.actor_name,  kind: 'text' });
      break;
    default:
      break;
  }
  return rows;
}

export function getActivityDetailRows(action, meta = {}, oldValues = null, newValues = null) {
  // For task.updated: use new_values + old_values for before/after display
  const changedRows =
    action === 'task.updated'
      ? (() => {
          const source = newValues || meta.changed;
          if (!source || typeof source !== 'object') return [];
          return getChangedRows(source, oldValues || null);
        })()
      : [];

  const contextRows = getActivityContextRows(action, meta);
  const seen = new Set(changedRows.map((r) => r.key));
  const extra = contextRows.filter((r) => !seen.has(r.key));

  return [...changedRows, ...extra];
}

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
  if (action === 'project.paused') return 'pause';
  if (action === 'project.resumed') return 'play';
  if (action.startsWith('project.')) return 'folder';
  return 'activity';
}
