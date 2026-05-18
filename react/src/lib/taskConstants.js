/** Types de tickets & workflow (alignés sur tasks.issue_type + workflow_status côté API). */

export const ISSUE_TYPE_OPTIONS = [
  { value: 'task', label: 'Tâche' },
  { value: 'bug', label: 'Anomalie' },
  { value: 'story', label: 'Fonctionnalité' },
];

export const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Basse' },
  { value: 'medium', label: 'Moyenne' },
  { value: 'high', label: 'Haute' },
  { value: 'urgent', label: 'Urgente' },
];

export const WORKFLOW_OPTIONS = [
  { value: 'todo', label: 'À faire' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'done', label: 'Terminé' },
  { value: 'at_risk', label: 'À risque' },
];

export const WORKFLOW_COLUMNS = [
  { id: 'todo', label: 'À faire' },
  { id: 'in_progress', label: 'En cours' },
  { id: 'done', label: 'Terminé' },
];

/** Libellés d’affichage pour le type (cartes Kanban). */
export const ISSUE_TYPE_LABELS = {
  task: 'Tâche',
  bug: 'Anomalie',
  story: 'Fonctionnalité',
};
