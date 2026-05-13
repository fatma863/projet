import { useState, useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import { getEcho } from '../../lib/echo';
import { ISSUE_TYPE_OPTIONS, PRIORITY_OPTIONS, WORKFLOW_OPTIONS } from '../../lib/taskConstants';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import { Spinner } from '../../components/ui/Spinner';
import { toast } from 'sonner';
import {
  MessageSquare, Users, Trash2, Send, Plus, ChevronDown, ChevronRight,
  LayoutGrid, UserCircle, CalendarRange, SlidersHorizontal, Link2, Sparkles,
  Pencil, Tag, Star,
} from 'lucide-react';
import { MemberAssigneePicker } from '../../components/tasks/MemberAssigneePicker';
import { TaskDependencyPicker } from '../../components/tasks/TaskDependencyPicker';
import { MLRecommendationModal } from '../../components/tasks/MLRecommendationModal';

const EMPTY_FORM = {
  title: '',
  description: '',
  issue_type: 'task',
  priority: 'medium',
  assignee_id: '',
  story_points: '',
  complexity: 5,
  planned_start: '',
  planned_end: '',
  estimated_hours: '',
  workflow_status: 'todo',
  progress_percent: 0,
  ai_auto_assign: false,
  depends_on_task_ids: [],
  specialty_ids: [],
};

function toDateOnly(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function formatDateFr(value) {
  const raw = toDateOnly(value);
  if (!raw) return '—';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('fr-FR');
}

export default function TaskModal({
  open,
  onClose,
  projectId,
  task,
  defaultStatusId: _defaultStatusId,
  defaultWorkflow = 'todo',
  statuses: _statuses,
  canWriteProject = true,
  isAdmin: isAdminProp,
}) {
  const { user } = useAuth();
  const isAdmin = isAdminProp ?? user?.roles?.includes('admin');
  const queryClient = useQueryClient();
  const isEdit = !!task;
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [autoAssignResult, setAutoAssignResult] = useState(null);
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);
  const [showMLModal, setShowMLModal] = useState(false);
  const canEditTask = isEdit ? (isAdmin || Boolean(task?.access?.can_edit)) : canWriteProject;
  const canDeleteTask = isEdit && (isAdmin || Boolean(task?.access?.can_delete));

  const { data: membersRaw } = useQuery({
    queryKey: ['project-members', projectId],
    queryFn: () => api.get(`/projects/${projectId}/members`).then((r) => (
      r.data?.members?.data ?? r.data?.members ?? r.data?.data ?? []
    )),
    enabled: open && Boolean(projectId),
  });

  const { data: projectMeta } = useQuery({
    queryKey: ['project', String(projectId)],
    queryFn: () => api.get(`/projects/${projectId}`).then((r) => (
      r.data?.data ?? r.data?.project ?? r.data
    )),
    enabled: open && Boolean(projectId),
    staleTime: 60_000,
  });

  const memberOptions = useMemo(() => {
    const raw = membersRaw || [];
    return raw
      .map((m) => ({
        id: m.id || m.user_id,
        name: m.name || m.user?.name,
        email: m.email || m.user?.email,
        avatar: m.avatar ?? m.user?.avatar,
        is_app_admin: Boolean(m.is_app_admin ?? m.user?.is_app_admin),
        role: m.role ?? m.pivot?.project_role ?? m.pivot?.role ?? 'member',
        specialties: m.specialties ?? m.user?.specialties ?? [],
      }))
      .filter((m) => m.id && m.name && !m.is_app_admin);
  }, [membersRaw]);

  const memberStats = useMemo(() => {
    const stats = { total: memberOptions.length, admin: 0, member: 0, client: 0 };
    memberOptions.forEach((m) => {
      const role = String(m.role || 'member').toLowerCase();
      if (role === 'admin') stats.admin += 1;
      else if (role === 'client' || role === 'guest') stats.client += 1;
      else stats.member += 1;
    });
    return stats;
  }, [memberOptions]);

  // IDs des membres recommandés (matching spécialités tâche ↔ compétences membre)
  const recommendedIds = useMemo(() => {
    const selectedIds = new Set((form.specialty_ids || []).map((id) => String(id)));
    if (selectedIds.size === 0) return new Set();
    const ids = new Set();
    memberOptions.forEach((m) => {
      const memberSpecIds = (m.specialties || []).map((s) => String(s.id));
      if (memberSpecIds.some((sid) => selectedIds.has(sid))) {
        ids.add(m.id);
      }
    });
    return ids;
  }, [form.specialty_ids, memberOptions]);

  const projectStart = toDateOnly(projectMeta?.start_date);
  const projectEnd = toDateOnly(projectMeta?.end_date);

  const { data: taskDetail } = useQuery({
    queryKey: ['task', task?.id],
    queryFn: () => api.get(`/tasks/${task.id}`).then((r) => r.data.task),
    enabled: open && Boolean(task?.id),
  });

  const { data: projectTasks = [] } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () =>
      api.get(`/projects/${projectId}/tasks?all=1`).then((r) => (
        r.data?.tasks?.data ?? r.data?.tasks ?? r.data?.data ?? []
      )),
    enabled: open && Boolean(projectId),
  });

  const { data: allSpecialties = [] } = useQuery({
    queryKey: ['specialties'],
    queryFn: () => api.get('/specialties').then((r) => r.data?.specialties ?? []),
    staleTime: 5 * 60_000,
  });

  const taskMeta = task ? (taskDetail || task) : null;

  useEffect(() => {
    if (open) {
      if (task) {
        const t = taskDetail || task;
        const depIds = (t.dependencies || [])
          .map((d) => d.depends_on_task_id ?? d.id)
          .filter((id) => id != null);
        const specIds = (t.specialties || []).map((s) => s.id).filter(Boolean).slice(0, 1);
        setForm({
          title: t.title || '',
          description: t.description || '',
          issue_type: t.issue_type || t.type || 'task',
          priority: t.priority || 'medium',
          assignee_id: t.assignee_id ?? t.assignees?.[0]?.id ?? '',
          complexity: t.complexity || 5,
          story_points: t.story_points ?? '',
          planned_start: t.planned_start || t.start_date || '',
          planned_end: t.planned_end || t.end_date || '',
          estimated_hours: t.estimated_hours ?? '',
          workflow_status: t.workflow_status || 'todo',
          progress_percent: t.progress_percent || 0,
          ai_auto_assign: false,
          depends_on_task_ids: depIds,
          specialty_ids: specIds,
        });
      } else {
        setForm({ ...EMPTY_FORM, workflow_status: defaultWorkflow || 'todo' });
      }
      setErrors({});
      setGeneralError(null);
      setActiveTab('details');
      setShowAdvanced(isEdit && !canEditTask);
      setAutoAssignResult(null);
    }
  }, [open, task, taskDetail, defaultWorkflow, isEdit, canEditTask]);

  const saveMutation = useMutation({
    mutationFn: (data) =>
      isEdit ? api.put(`/tasks/${task.id}`, data) : api.post(`/projects/${projectId}/tasks`, data),
    onSuccess: () => {
      const pid = String(projectId);
      queryClient.invalidateQueries({ queryKey: ['tasks', pid] });
      if (task?.id) {
        queryClient.invalidateQueries({ queryKey: ['task', task.id] });
      }
      queryClient.invalidateQueries({ queryKey: ['project-gantt', pid] });
      queryClient.invalidateQueries({ queryKey: ['project-critical-path', pid] });
      queryClient.invalidateQueries({ queryKey: ['project-dashboard', pid] });
      onClose();
    },
    onError: (err) => {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors || {});
        setGeneralError(null);
        return;
      }

      setErrors({});
      setGeneralError(err.response?.data?.message || err.message || 'Erreur lors de la sauvegarde');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/tasks/${task.id}`),
    onSuccess: () => {
      const pid = String(projectId);
      queryClient.invalidateQueries({ queryKey: ['tasks', pid] });
      queryClient.invalidateQueries({ queryKey: ['project-gantt', pid] });
      queryClient.invalidateQueries({ queryKey: ['project-critical-path', pid] });
      queryClient.invalidateQueries({ queryKey: ['project-dashboard', pid] });
      onClose();
    },
  });

  const handleAutoAssign = async () => {
    if (!projectId) return;
    setIsAutoAssigning(true);
    setAutoAssignResult(null);
    try {
      const params = new URLSearchParams();
      (form.specialty_ids || []).forEach((id) => params.append('specialty_ids[]', id));
      if (form.priority)         params.append('priority',         form.priority);
      if (form.issue_type)       params.append('issue_type',       form.issue_type);
      if (form.complexity)       params.append('complexity',       form.complexity);
      if (form.estimated_hours)  params.append('estimated_hours',  form.estimated_hours);
      if (form.planned_end)      params.append('planned_end',      form.planned_end);
      params.append('top_n', '5');
      const res  = await api.get(`/projects/${projectId}/auto-assign?${params.toString()}`);
      const data = res.data;
      setAutoAssignResult(data);
      setShowMLModal(true);
    } catch {
      setAutoAssignResult({ best_user: null, candidates: [], message: "Erreur lors de l'analyse IA. Vérifiez que le service Python est démarré." });
    } finally {
      setIsAutoAssigning(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const nextErrors = {};
    const specialtyIds = Array.isArray(form.specialty_ids)
      ? form.specialty_ids.filter(Boolean).slice(0, 1)
      : [];

    if (!form.title?.trim()) {
      nextErrors.title = ['Le titre est obligatoire.'];
    }
    if (specialtyIds.length !== 1) {
      nextErrors.specialty_ids = ['Veuillez sélectionner une seule spécialité.'];
    }
    if (!form.issue_type || !form.priority) {
      nextErrors.issue_type = ['Le type et la priorité sont obligatoires.'];
    }

    const ps = form.planned_start?.trim() || '';
    const pe = form.planned_end?.trim() || '';
    if ((ps && !pe) || (!ps && pe)) {
      nextErrors.planned_end = ['Indiquez à la fois la date de début et la date de fin, ou laissez les deux vides.'];
    }
    if (ps && pe && pe < ps) {
      nextErrors.planned_end = ['La date de fin doit être postérieure ou égale à la date de début.'];
    }

    if (!isEdit && ps && projectStart && ps < projectStart) {
      nextErrors.planned_start = [`La date de début doit être dans la période projet (à partir du ${formatDateFr(projectStart)}).`];
    }
    if (!isEdit && ps && projectEnd && ps > projectEnd) {
      nextErrors.planned_start = [`La date de début doit être dans la période projet (jusqu'au ${formatDateFr(projectEnd)}).`];
    }
    if (pe && projectStart && pe < projectStart) {
      nextErrors.planned_end = [`La date de fin doit être dans la période projet (à partir du ${formatDateFr(projectStart)}).`];
    }
    if (pe && projectEnd && pe > projectEnd) {
      nextErrors.planned_end = [`La date de fin doit être dans la période projet (jusqu'au ${formatDateFr(projectEnd)}).`];
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setGeneralError(null);
      return;
    }

    const payload = {
      title: form.title.trim(),
      description: form.description || undefined,
      issue_type: form.issue_type,
      priority: form.priority,
      complexity: form.complexity,
      story_points: form.story_points === '' || form.story_points == null ? undefined : Number(form.story_points),
      planned_end: pe || undefined,
      estimated_hours: form.estimated_hours === '' || form.estimated_hours == null ? undefined : Number(form.estimated_hours),
      depends_on_task_ids: Array.isArray(form.depends_on_task_ids) ? form.depends_on_task_ids.map(Number) : [],
      specialty_ids: specialtyIds,
    };

    if (!isEdit) {
      payload.planned_start = ps || undefined;
    }

    const autoAssign = Boolean(form.ai_auto_assign);
    if (isEdit) {
      payload.assignee_id = form.assignee_id ? Number(form.assignee_id) : null;
    } else if (form.assignee_id && !autoAssign) {
      payload.assignee_id = Number(form.assignee_id);
    }

    if (!isEdit) {
      payload.workflow_status = form.workflow_status || 'todo';
      if (autoAssign) {
        payload.ai_auto_assign = true;
      }
    } else {
      payload.workflow_status = form.workflow_status;
      payload.progress_percent = form.progress_percent;
    }

    saveMutation.mutate(payload);
  };

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  return (
    <>
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? (canEditTask ? `Tâche · ${task.title}` : task.title) : 'Nouvelle tâche'}
      size="xl"
    >
      {/* Tabs */}
      <div className="-mt-2 mb-4 flex gap-1 border-b border-border">
        {[
          { key: 'details', label: 'Détails' },
          ...(isEdit ? [
            { key: 'comments', label: 'Commentaires', icon: MessageSquare },
            { key: 'assignees', label: 'Assignés', icon: Users },
          ] : []),
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.icon && <t.icon className="h-4 w-4" />}
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'details' && (
        <form onSubmit={canEditTask ? handleSubmit : (e) => e.preventDefault()} className="space-y-4">
          {generalError && (
            <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {generalError}
            </div>
          )}

          {errors && Object.keys(errors).length > 0 && (
            <div className="space-y-1 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <p className="font-medium">Erreurs de validation</p>
              {Object.entries(errors).map(([key, value]) => (
                <p key={key}>
                  {Array.isArray(value) ? value[0] : String(value)}
                </p>
              ))}
            </div>
          )}

          <div className="grid gap-8 lg:grid-cols-3">
            <div className="space-y-5 lg:col-span-2">
              <section className="rounded-xl border border-border/70 bg-muted/5 p-4 sm:p-5">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
                  <LayoutGrid className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  Informations de base
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium">Titre *</label>
                    <Input value={form.title} onChange={(e) => set('title', e.target.value)} disabled={!canEditTask} placeholder="Résumé court" />
                    {errors.title && <p className="mt-1 text-xs text-destructive">{errors.title[0]}</p>}
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Description</label>
                    <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={4} disabled={!canEditTask} placeholder="Étapes, contexte, critères d’acceptation…" />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Champ Type supprimé */}
                    <div>
                      <label className="mb-1 block text-sm font-medium">Priorité *</label>
                      <Select value={form.priority} onChange={(e) => set('priority', e.target.value)} disabled={!canEditTask}>
                        {PRIORITY_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                      </Select>
                    </div>
                  </div>
                  <div className="max-w-xs">
                    <label className="mb-1 block text-sm font-medium">Effort (points)</label>
                    <Input type="number" min={0} value={form.story_points} onChange={(e) => set('story_points', e.target.value === '' ? '' : Number(e.target.value))} disabled={!canEditTask} placeholder="Optionnel" />
                  </div>
                </div>
              </section>

              {/* ── Spécialités requises ── */}
              <section className="rounded-xl border border-border/70 bg-muted/5 p-4 sm:p-5">
                <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
                  <Tag className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  Spécialités requises
                </h3>
                <p className="mb-3 text-xs text-muted-foreground">
                  Choisissez une spécialité principale pour la tâche. Elle sert à mettre en avant les membres les plus adaptés.
                </p>
                {allSpecialties.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Chargement…</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {allSpecialties.map((s) => {
                      const active = (form.specialty_ids || []).includes(s.id);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          disabled={!canEditTask}
                          onClick={() => {
                            set('specialty_ids', active ? [] : [s.id]);
                          }}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
                            active
                              ? 'border-transparent text-white shadow-sm'
                              : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50'
                          }`}
                          style={active ? { backgroundColor: s.color } : {}}
                          title={s.description || s.name}
                        >
                          {active && <span className="text-[10px]">✓</span>}
                          {s.name}
                        </button>
                      );
                    })}
                  </div>
                )}
                {(form.specialty_ids || []).length > 0 && (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Spécialité sélectionnée — les membres correspondants seront mis en avant dans l&apos;assignation.
                  </p>
                )}
                {errors.specialty_ids && <p className="mt-2 text-xs text-destructive">{errors.specialty_ids[0]}</p>}
              </section>

              {/* ── Assignation ── */}
              <section className="rounded-xl border border-border/70 bg-muted/5 p-4 sm:p-5">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
                  <UserCircle className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  Assignation
                </h3>
                <div className="space-y-4">
                  <div className="rounded-lg border border-border bg-background/70 p-3 text-xs">
                    <p className="font-medium text-foreground">Membres du projet ({memberStats.total})</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-muted-foreground">
                      <span className="rounded-full border border-border bg-card px-2 py-0.5">Administrateurs : {memberStats.admin}</span>
                      <span className="rounded-full border border-border bg-card px-2 py-0.5">Membres : {memberStats.member}</span>
                      <span className="rounded-full border border-border bg-card px-2 py-0.5">Clients : {memberStats.client}</span>
                    </div>
                    <p className="mt-2 text-muted-foreground">
                      Sélectionnez un membre pour cette tâche. Seuls les membres du projet sont proposés.
                    </p>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Membre assigné
                      {recommendedIds.size > 0 && (
                        <span className="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                          {recommendedIds.size} recommandé{recommendedIds.size > 1 ? 's' : ''}
                        </span>
                      )}
                    </label>
                    <MemberAssigneePicker
                      id="task-assignee"
                      members={memberOptions}
                      value={form.assignee_id === '' ? '' : form.assignee_id}
                      onChange={(id) => set('assignee_id', id === '' ? '' : id)}
                      disabled={!canEditTask || Boolean(form.ai_auto_assign)}
                      recommendedIds={recommendedIds}
                    />
                    {recommendedIds.size > 0 && (
                      <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                        ⭐ Les membres marqués &quot;Recommandé&quot; ont les spécialités requises par cette tâche.
                      </p>
                    )}
                  </div>
                  {/* ── Bouton Recommandation IA ── */}
                  {!isEdit && canEditTask && (
                    <div>
                      <button
                        type="button"
                        onClick={handleAutoAssign}
                        disabled={isAutoAssigning}
                        className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-violet-400/50 bg-gradient-to-r from-violet-500/5 to-primary/5 px-4 py-3 text-sm font-medium text-violet-700 dark:text-violet-300 transition-all hover:border-violet-500/70 hover:from-violet-500/10 hover:to-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isAutoAssigning ? (
                          <>
                            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
                            Analyse IA en cours…
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4" />
                            Recommandation IA
                            <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                              ML · 22 features
                            </span>
                          </>
                        )}
                      </button>
                      {autoAssignResult?.best_user && !showMLModal && (
                        <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
                          IA recommande&nbsp;
                          <button type="button" onClick={() => setShowMLModal(true)}
                            className="font-semibold text-violet-600 dark:text-violet-400 underline underline-offset-2 hover:no-underline">
                            {autoAssignResult.best_user.name}
                          </button>
                          &nbsp;· Cliquez pour voir l'analyse
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-xl border border-border/70 bg-muted/5 p-4 sm:p-5">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
                  <CalendarRange className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  Planification
                </h3>
                <p className="mb-3 text-xs text-muted-foreground">
                  Dates prévues (optionnelles). Laissez les deux vides si non planifié. La date de fin est aussi utilisée comme échéance pour les alertes.
                </p>
                {(projectStart || projectEnd) && (
                  <p className="mb-3 rounded-md border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
                    Période du projet: {projectStart ? formatDateFr(projectStart) : 'non définie'} → {projectEnd ? formatDateFr(projectEnd) : 'non définie'}.
                    {' '}Les dates de tâche doivent rester dans cet intervalle.
                  </p>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium">Date de début</label>
                    <Input
                      type="date"
                      value={form.planned_start}
                      onChange={(e) => set('planned_start', e.target.value)}
                      disabled={!canEditTask || isEdit}
                      min={projectStart || undefined}
                      max={projectEnd || undefined}
                    />
                    {isEdit && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        La date de début est figée après la création de la tâche.
                      </p>
                    )}
                    {errors.planned_start && <p className="mt-1 text-xs text-destructive">{errors.planned_start[0]}</p>}
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Date de fin</label>
                    <Input
                      type="date"
                      value={form.planned_end}
                      onChange={(e) => set('planned_end', e.target.value)}
                      disabled={!canEditTask}
                      min={form.planned_start || projectStart || undefined}
                      max={projectEnd || undefined}
                    />
                    {errors.planned_end && <p className="mt-1 text-xs text-destructive">{errors.planned_end[0]}</p>}
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-border/70 bg-muted/5 p-4 sm:p-5">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
                  <Link2 className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  Dépend de
                </h3>
                <p className="mb-3 text-xs text-muted-foreground">
                  Tâches qui doivent être terminées avant (liens Gantt, type fin-début).
                </p>
                <TaskDependencyPicker
                  tasks={projectTasks}
                  value={form.depends_on_task_ids}
                  onChange={(ids) => set('depends_on_task_ids', ids)}
                  excludeTaskId={task?.id}
                  disabled={!canEditTask}
                />
              </section>

              <div>
                <button
                  type="button"
                  onClick={() => setShowAdvanced((v) => !v)}
                  className="mb-3 flex w-full items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-left text-sm font-semibold text-foreground"
                >
                  <span className="flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                    Avancé
                  </span>
                  {showAdvanced ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
                {showAdvanced && (
                  <div className="grid gap-4 rounded-xl border border-border/70 bg-muted/5 p-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium">Complexité (1–10)</label>
                      <Input type="number" min={1} max={10} value={form.complexity} onChange={(e) => set('complexity', Number(e.target.value))} disabled={!canEditTask} />
                      {errors.complexity && <p className="mt-1 text-xs text-destructive">{errors.complexity[0]}</p>}
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Heures estimées</label>
                      <Input type="number" min={0} step={0.5} value={form.estimated_hours} onChange={(e) => set('estimated_hours', e.target.value)} disabled={!canEditTask} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4 rounded-xl border border-border bg-muted/10 p-4 lg:sticky lg:top-0 lg:self-start">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Résumé</h3>
              {(taskMeta || projectMeta) && (
                <div className="space-y-1 rounded-lg border border-dashed border-border bg-background px-3 py-2 text-xs text-muted-foreground">
                  {taskMeta?.id && (
                    <p>
                      ID: <span className="font-medium text-foreground">#{taskMeta.id}</span>
                    </p>
                  )}
                  <p>
                    Projet: <span className="font-medium text-foreground">{projectMeta?.name || taskMeta?.project?.name || '—'}</span>
                  </p>
                  <p>
                    Type: <span className="font-medium text-foreground">{form.issue_type || taskMeta?.issue_type || 'task'}</span>
                  </p>
                  <p>
                    Début / fin: <span className="font-medium text-foreground">{formatDateFr(form.planned_start)} → {formatDateFr(form.planned_end)}</span>
                  </p>
                  {taskMeta?.created_at && (
                    <p>
                      Créée le: <span className="font-medium text-foreground">{formatDateFr(taskMeta.created_at)}</span>
                    </p>
                  )}
                  {taskMeta?.updated_at && (
                    <p>
                      Mise à jour: <span className="font-medium text-foreground">{formatDateFr(taskMeta.updated_at)}</span>
                    </p>
                  )}
                  {taskMeta?.creator?.name && (
                    <p>
                      Créée par: <span className="font-medium text-foreground">{taskMeta.creator.name}</span>
                    </p>
                  )}
                </div>
              )}
              {isEdit && (
                <>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Statut workflow</label>
                    <Select value={form.workflow_status} onChange={(e) => set('workflow_status', e.target.value)} disabled={!canEditTask}>
                      {WORKFLOW_OPTIONS.map((w) => (
                        <option key={w.value} value={w.value}>{w.label}</option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Progression (%)</label>
                    <Input type="number" min={0} max={100} value={form.progress_percent} onChange={(e) => set('progress_percent', Number(e.target.value))} disabled={!canEditTask} />
                  </div>
                </>
              )}
              {!isEdit && (
                <p className="text-xs text-muted-foreground">
                  Les nouvelles tâches démarrent en <strong>À faire</strong> (workflow). Vous pourrez les déplacer sur le tableau après création.
                </p>
              )}
              {isEdit && taskMeta && (taskMeta.estimated_duration != null || taskMeta.risk_level) && (
                <div className="space-y-1 rounded-lg border border-dashed border-border bg-background px-3 py-2 text-xs text-muted-foreground">
                  {taskMeta.estimated_duration != null && (
                    <p>
                      Estimation IA :{' '}
                      <span className="font-medium text-foreground">
                        {(taskMeta.estimated_duration / 60).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} h
                      </span>
                    </p>
                  )}
                  {taskMeta.risk_level && (
                    <p>
                      Risque :{' '}
                      <span className="font-medium text-foreground">
                        {taskMeta.risk_level}
                        {taskMeta.risk_score != null ? ` (${taskMeta.risk_score})` : ''}
                      </span>
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-4">
            <div>
              {isEdit && canDeleteTask && canEditTask && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => { if (window.confirm('Supprimer cette tâche ?')) deleteMutation.mutate(); }}
                >
                  <Trash2 className="mr-1 h-4 w-4" /> Supprimer
                </Button>
              )}
            </div>
            <div className="flex gap-3">
              {canEditTask ? (
                <>
                  <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
                  <Button type="submit" disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer'}
                  </Button>
                </>
              ) : (
                <Button type="button" variant="outline" onClick={onClose}>Fermer</Button>
              )}
            </div>
          </div>
        </form>
      )}

      {activeTab === 'comments' && isEdit && (
        <CommentsTab taskId={task.id} projectId={projectId} canWriteProject={canWriteProject} isAdmin={isAdmin} userId={user?.id} />
      )}
      {activeTab === 'assignees' && isEdit && <AssigneesTab taskId={task.id} isAdmin={isAdmin} canEdit={canEditTask} />}
    </Modal>

    <MLRecommendationModal
      open={showMLModal}
      onClose={() => setShowMLModal(false)}
      result={autoAssignResult}
      selectedId={form.assignee_id}
      onAccept={(id) => {
        set('assignee_id', id);
        set('ai_auto_assign', false);
      }}
    />
    </>
  );
}

function renderCommentBody(text) {
  if (!text) return null;
  return text.split(/(\s+)/).map((token, idx) => (
    token.startsWith('@')
      ? <span key={idx} className="font-medium text-primary">{token}</span>
      : <span key={idx}>{token}</span>
  ));
}

function CommentsTab({ taskId, projectId, canWriteProject, isAdmin, userId }) {
  const queryClient = useQueryClient();
  const [body, setBody] = useState('');
  const [parentId, setParentId] = useState(null);
  const [editing, setEditing] = useState(null);
  const [editBody, setEditBody] = useState('');

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['comments', taskId],
    queryFn: () =>
      api.get(`/tasks/${taskId}/comments`).then((r) => (
        r.data?.comments?.data ?? r.data?.comments ?? r.data?.data ?? []
      )),
  });

  const { data: members } = useQuery({
    queryKey: ['project-members', projectId],
    queryFn: () => api.get(`/projects/${projectId}/members`).then((r) => (
      r.data?.members?.data ?? r.data?.members ?? r.data?.data ?? []
    )),
  });

  useEffect(() => {
    const echo = getEcho();
    const channel = echo.private(`project.${projectId}`);
    const refresh = () => queryClient.invalidateQueries({ queryKey: ['comments', taskId] });

    channel.listen('.task.comment.created', refresh);
    channel.listen('.task.comment.deleted', refresh);

    return () => {
      echo.leave(`private-project.${projectId}`);
    };
  }, [projectId, queryClient, taskId]);

  const addMutation = useMutation({
    mutationFn: ({ text, pid }) => api.post(`/tasks/${taskId}/comments`, { body: text, parent_id: pid || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', taskId] });
      setBody('');
      setParentId(null);
      toast.success('Commentaire publié');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || err?.message || 'Erreur');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, text }) => api.put(`/tasks/${taskId}/comments/${id}`, { body: text }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', taskId] });
      setEditing(null);
      setEditBody('');
      toast.success('Commentaire mis à jour');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId) => api.delete(`/tasks/${taskId}/comments/${commentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', taskId] });
      toast.success('Commentaire supprimé');
    },
  });

  const mentionCandidates = useMemo(() => {
    const raw = members || [];
    return raw
      .map((m) => ({ id: m.id || m.user_id, name: m.name || m.user?.name, email: m.email || m.user?.email }))
      .filter((u) => u.id && u.name);
  }, [members]);

  const mentionMatch = body.match(/@([A-Za-z0-9._-]*)$/);
  const mentionSearch = mentionMatch?.[1]?.toLowerCase() || '';
  const mentionSuggestions = mentionSearch
    ? mentionCandidates.filter((u) =>
      u.name.toLowerCase().includes(mentionSearch) || u.email?.toLowerCase().includes(mentionSearch)).slice(0, 5)
    : [];

  const insertMention = (u) => {
    setBody((prev) => prev.replace(/@([A-Za-z0-9._-]*)$/, `@${(u.email || '').split('@')[0]} `));
  };

  const canDelete = (c) => isAdmin || (userId && Number(c.user?.id) === Number(userId));
  const canEdit = (c) => canWriteProject && (isAdmin || (userId && Number(c.user?.id) === Number(userId)));

  if (isLoading) return <div className="flex justify-center py-6"><Spinner /></div>;

  return (
    <div className="space-y-4">
      <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
        {comments.map((c) => (
          <div key={c.id} className="rounded-lg border border-border/80 bg-accent/20 p-3">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-foreground">{c.user?.name}</span>
              <div className="flex items-center gap-1">
                {c.edited_at && (
                  <span className="text-[10px] text-muted-foreground">modifié</span>
                )}
                <span className="text-xs text-muted-foreground">
                  {new Date(c.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
                {canEdit(c) && (
                  <button
                    type="button"
                    title="Modifier"
                    onClick={() => { setEditing(c.id); setEditBody(c.body); }}
                    className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
                {canDelete(c) && (
                  <button
                    type="button"
                    title="Supprimer"
                    onClick={() => { if (window.confirm('Supprimer ce commentaire ?')) deleteMutation.mutate(c.id); }}
                    className="rounded p-1 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
            {editing === c.id ? (
              <div className="space-y-2">
                <Textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={3} />
                <div className="flex gap-2">
                  <Button size="sm" type="button" onClick={() => updateMutation.mutate({ id: c.id, text: editBody.trim() })} disabled={!editBody.trim()}>
                    Enregistrer
                  </Button>
                  <Button size="sm" type="button" variant="outline" onClick={() => { setEditing(null); setEditBody(''); }}>Annuler</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-foreground">{renderCommentBody(c.body)}</p>
            )}
            {canWriteProject && (
              <button
                type="button"
                className="mt-2 text-xs font-medium text-primary hover:underline"
                onClick={() => { setParentId(c.id); setBody(''); }}
              >
                Répondre
              </button>
            )}
            {(c.replies || []).length > 0 && (
              <div className="mt-3 space-y-2 border-l-2 border-primary/30 pl-3">
                {(c.replies || []).map((r) => (
                  <div key={r.id} className="rounded-md bg-background/80 p-2">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="text-xs font-medium">{r.user?.name}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(r.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                        {canEdit(r) && (
                          <button type="button" className="rounded p-0.5 hover:bg-accent" onClick={() => { setEditing(r.id); setEditBody(r.body); }}>
                            <Pencil className="h-3 w-3" />
                          </button>
                        )}
                        {canDelete(r) && (
                          <button type="button" className="rounded p-0.5 hover:text-destructive" onClick={() => { if (window.confirm('Supprimer ?')) deleteMutation.mutate(r.id); }}>
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    {editing === r.id ? (
                      <div className="space-y-2">
                        <Textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={2} />
                        <div className="flex gap-2">
                          <Button size="sm" type="button" onClick={() => updateMutation.mutate({ id: r.id, text: editBody.trim() })}>OK</Button>
                          <Button size="sm" type="button" variant="outline" onClick={() => { setEditing(null); setEditBody(''); }}>Annuler</Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-foreground">{renderCommentBody(r.body)}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {comments.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">Aucun commentaire</p>
        )}
      </div>

      {parentId && (
        <p className="text-xs text-muted-foreground">
          Réponse au fil ·{' '}
          <button type="button" className="font-medium text-primary hover:underline" onClick={() => setParentId(null)}>Annuler</button>
        </p>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={parentId ? 'Votre réponse… (@ pour mentionner)' : 'Commentaire… (@ pour mentionner)'}
            rows={2}
            disabled={!canWriteProject}
          />
          {mentionSuggestions.length > 0 && (
            <div className="absolute bottom-full left-0 z-10 mb-1 w-full rounded-md border border-border bg-card shadow-lg">
              {mentionSuggestions.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => insertMention(u)}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  {u.name}{' '}
                  <span className="text-xs text-muted-foreground">(@{(u.email || '').split('@')[0]})</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <Button
          size="sm"
          type="button"
          onClick={() => {
            if (!body.trim()) return;
            addMutation.mutate({ text: body.trim(), pid: parentId });
          }}
          disabled={!canWriteProject || !body.trim() || addMutation.isPending}
          className="self-end"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function AssigneesTab({ taskId, isAdmin, canEdit = true }) {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState('');

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users-for-assign', isAdmin],
    enabled: Boolean(isAdmin),
    queryFn: () => api.get('/users?per_page=500').then((r) => r.data.data || []),
  });

  const { data: assignees, isLoading } = useQuery({
    queryKey: ['assignees', taskId],
    queryFn: () => api.get(`/tasks/${taskId}/assignees`).then((r) => (
      r.data?.assignees?.data ?? r.data?.assignees ?? []
    )),
  });

  const assignMutation = useMutation({
    mutationFn: (data) => api.post(`/tasks/${taskId}/assign`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignees', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['member-dashboard'] });
      setUserId('');
      toast.success('Tâche assignée');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || err?.message || 'Assignation impossible');
    },
  });

  const unassignMutation = useMutation({
    mutationFn: (uid) => api.delete(`/tasks/${taskId}/unassign/${uid}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignees', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  if (isLoading) return <div className="flex justify-center py-6"><Spinner /></div>;

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium">{isAdmin ? 'Utilisateur' : 'ID utilisateur'}</label>
            {isAdmin ? (
              <Select value={userId} onChange={(e) => setUserId(e.target.value)}>
                <option value="">Choisir…</option>
                {allUsers.map((u) => (
                  <option key={u.id} value={String(u.id)}>{u.name} — {u.email}</option>
                ))}
              </Select>
            ) : (
              <Input type="number" value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="ID" />
            )}
          </div>
          <Button
            size="sm"
            className="shrink-0"
            onClick={() => assignMutation.mutate({ user_id: parseInt(userId, 10) })}
            disabled={!userId || assignMutation.isPending}
          >
            <Plus className="mr-1 h-4 w-4" /> Assigner
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {assignees?.map((a) => (
          <div key={a.id} className="flex items-center justify-between rounded-lg bg-accent/30 p-3">
            <div className="flex items-center gap-3">
              {(a.avatar_url || a.user?.avatar_url) ? (
                <img src={a.avatar_url || a.user?.avatar_url} alt={a.name || a.user?.name}
                  className="h-8 w-8 shrink-0 rounded-full object-cover ring-2 ring-background" />
              ) : (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
                  {(a.name || a.user?.name || '?')[0]}
                </div>
              )}
              <div>
                <p className="text-sm font-medium">{a.name || a.user?.name}</p>
                <p className="text-xs text-muted-foreground">{a.allocation_percent}% d'allocation</p>
              </div>
            </div>
            {canEdit && (
              <button
                type="button"
                onClick={() => unassignMutation.mutate(a.id || a.user?.id || a.user_id)}
                className="rounded p-1 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
        {assignees?.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">Aucun assigné</p>
        )}
      </div>
    </div>
  );
}
