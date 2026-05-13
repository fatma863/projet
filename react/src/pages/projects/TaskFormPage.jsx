import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import { PRIORITY_OPTIONS, WORKFLOW_OPTIONS } from '../../lib/taskConstants';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { toast } from 'sonner';
import {
  LayoutGrid, CalendarRange, Tag, UserCircle, ArrowLeft,
  ChevronRight, ChevronLeft, Check, Sparkles, AlertTriangle,
  Link2, Star, BarChart3, Trash2,
} from 'lucide-react';
import { MemberAssigneePicker } from '../../components/tasks/MemberAssigneePicker';
import { TaskDependencyPicker } from '../../components/tasks/TaskDependencyPicker';
import { MLRecommendationModal } from '../../components/tasks/MLRecommendationModal';
import { MembersPerformanceModal } from '../../components/tasks/MembersPerformanceModal';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STEPS = [
  { id: 'basics',      label: 'Informations de base',   icon: LayoutGrid,   desc: 'Titre, description, type et priorité' },
  { id: 'planning',    label: 'Planification',           icon: CalendarRange,desc: 'Dates, durée et complexité' },
  { id: 'specialties', label: 'Compétences & Liens',     icon: Tag,          desc: 'Spécialité requise et dépendances' },
  { id: 'assignation', label: 'Assignation',             icon: UserCircle,   desc: 'Membre assigné et recommandation IA' },
];

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
  depends_on_task_ids: [],
  specialty_ids: [],
};

function toDateOnly(v) { return v ? String(v).slice(0, 10) : ''; }
function fmtFr(v) {
  const d = new Date(toDateOnly(v));
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('fr-FR');
}

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------

function StepIndicator({ current }) {
  return (
    <div className="flex items-start justify-center gap-0 mb-8 px-4">
      {STEPS.map((step, idx) => {
        const Icon = step.icon;
        const isActive    = idx === current;
        const isCompleted = idx < current;
        return (
          <div key={step.id} className="flex items-center">
            {idx > 0 && (
              <div className={`h-0.5 w-12 sm:w-20 mt-5 flex-shrink-0 transition-colors ${isCompleted ? 'bg-primary' : 'bg-border'}`} />
            )}
            <div className="flex flex-col items-center gap-1.5 w-20 sm:w-24">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-200 ${
                isActive    ? 'border-primary bg-primary text-primary-foreground shadow-md' :
                isCompleted ? 'border-primary bg-primary/15 text-primary' :
                              'border-border bg-background text-muted-foreground'
              }`}>
                {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
              </div>
              <span className={`text-[10px] font-medium text-center leading-tight max-w-[72px] ${
                isActive ? 'text-primary' : isCompleted ? 'text-foreground' : 'text-muted-foreground'
              }`}>
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Per-step validation
// ---------------------------------------------------------------------------

function validateStep(step, form, projectStart, projectEnd, isEdit) {
  const e = {};
  if (step === 0) {
    if (!form.title?.trim()) e.title = 'Le titre est obligatoire.';
    if (!form.priority)       e.priority = 'La priorité est obligatoire.';
  }
  if (step === 1) {
    const ps = form.planned_start?.trim() || '';
    const pe = form.planned_end?.trim()   || '';

    if ((ps && !pe) || (!ps && pe)) {
      e.planned_end = 'Indiquez les deux dates ou laissez les deux vides.';
    }
    if (ps && pe && pe < ps) {
      e.planned_end = 'La date de fin doit être postérieure ou égale à la date de début.';
    }

    // Vérification que les dates restent dans la période du projet
    if (!isEdit && ps && projectStart && ps < projectStart) {
      e.planned_start = `La date de début doit être dans la période projet (à partir du ${fmtFr(projectStart)}).`;
    }
    if (!isEdit && ps && projectEnd && ps > projectEnd) {
      e.planned_start = `La date de début ne peut pas dépasser la fin du projet (${fmtFr(projectEnd)}).`;
    }
    if (pe && projectStart && pe < projectStart) {
      e.planned_end = `La date de fin doit être dans la période projet (à partir du ${fmtFr(projectStart)}).`;
    }
    if (pe && projectEnd && pe > projectEnd) {
      e.planned_end = `La date de fin ne peut pas dépasser la fin du projet (${fmtFr(projectEnd)}).`;
    }
  }
  if (step === 2) {
    const ids = (form.specialty_ids || []).filter(Boolean);
    if (ids.length !== 1) e.specialty_ids = 'Veuillez sélectionner exactement une spécialité.';
  }
  return e;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function TaskFormPage() {
  const { id: projectId, taskId } = useParams();
  const isEdit = Boolean(taskId);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes('admin');
  const queryClient = useQueryClient();

  const [step, setStep]             = useState(0);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [errors, setErrors]         = useState({});
  const [autoAssignResult, setAR]   = useState(null);
  const [isAutoAssigning, setIA]    = useState(false);
  const [showMLModal, setMLModal]   = useState(false);
  const [mlTriggered, setMLTrigg]   = useState(false);
  const [showPerfModal, setPerfModal] = useState(false);

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  // ── Remote data ──────────────────────────────────────────────────────────

  const { data: taskDetail, isLoading: loadingTask } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => api.get(`/tasks/${taskId}`).then(r => r.data.task),
    enabled: isEdit && Boolean(taskId),
  });

  const { data: membersRaw = [] } = useQuery({
    queryKey: ['project-members', projectId],
    queryFn: () => api.get(`/projects/${projectId}/members`).then(r =>
      r.data?.members?.data ?? r.data?.members ?? r.data?.data ?? []
    ),
    staleTime: 120_000,
  });

  const { data: projectMeta } = useQuery({
    queryKey: ['project', String(projectId)],
    queryFn: () => api.get(`/projects/${projectId}`).then(r =>
      r.data?.data ?? r.data?.project ?? r.data
    ),
    staleTime: 120_000,
  });

  // Reuse the cached task list from ProjectDetailPage — avoids a duplicate fetch
  const { data: projectTasks = [] } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () =>
      api.get(`/projects/${projectId}/tasks?all=1`).then(r =>
        r.data?.tasks?.data ?? r.data?.tasks ?? r.data?.data ?? []
      ),
    staleTime: 120_000,
  });

  const { data: allSpecialties = [] } = useQuery({
    queryKey: ['specialties'],
    queryFn: () => api.get('/specialties').then(r => r.data?.specialties ?? []),
    staleTime: 10 * 60_000,  // specialties rarely change
  });

  // ── Init form for edit ────────────────────────────────────────────────────

  useEffect(() => {
    if (isEdit && taskDetail) {
      const t = taskDetail;
      setForm({
        title:          t.title || '',
        description:    t.description || '',
        issue_type:     t.issue_type || 'task',
        priority:       t.priority || 'medium',
        assignee_id:    t.assignee_id ?? t.assignees?.[0]?.id ?? '',
        story_points:   t.story_points ?? '',
        complexity:     t.complexity || 5,
        planned_start:  toDateOnly(t.planned_start || t.start_date),
        planned_end:    toDateOnly(t.planned_end || t.end_date),
        estimated_hours: t.estimated_hours ?? '',
        workflow_status: t.workflow_status || 'todo',
        progress_percent: t.progress_percent || 0,
        depends_on_task_ids: (t.dependencies || []).map(d => d.depends_on_task_id ?? d.id).filter(Boolean),
        specialty_ids:  (t.specialties || []).map(s => s.id).filter(Boolean).slice(0, 1),
      });
    } else if (!isEdit) {
      const wf = searchParams.get('workflow') || 'todo';
      setForm({ ...EMPTY_FORM, workflow_status: wf });
    }
    setErrors({});
    setAR(null);
    setMLTrigg(false);
    setStep(0);
  }, [isEdit, taskDetail, searchParams]);

  // ── Members helpers ───────────────────────────────────────────────────────

  const memberOptions = useMemo(() => {
    return (membersRaw || [])
      .map(m => ({
        id:          m.id || m.user_id,
        name:        m.name || m.user?.name,
        email:       m.email || m.user?.email,
        avatar:      m.avatar ?? m.user?.avatar,
        is_app_admin: Boolean(m.is_app_admin ?? m.user?.is_app_admin),
        role:        m.role ?? m.pivot?.project_role ?? m.pivot?.role ?? 'member',
        specialties: m.specialties ?? m.user?.specialties ?? [],
      }))
      .filter(m => m.id && m.name && !m.is_app_admin);
  }, [membersRaw]);

  const recommendedIds = useMemo(() => {
    const sel = new Set((form.specialty_ids || []).map(String));
    if (!sel.size) return new Set();
    const ids = new Set();
    memberOptions.forEach(m => {
      if ((m.specialties || []).some(s => sel.has(String(s.id)))) ids.add(m.id);
    });
    return ids;
  }, [form.specialty_ids, memberOptions]);

  const projectStart = toDateOnly(projectMeta?.start_date);
  const projectEnd   = toDateOnly(projectMeta?.end_date);

  // ── ML auto-trigger on step 3 ─────────────────────────────────────────────

  useEffect(() => {
    if (step === 3 && !mlTriggered && !isAutoAssigning && projectId) {
      setMLTrigg(true);
      doAutoAssign();
    }
  }, [step]);

  const doAutoAssign = async () => {
    setIA(true);
    setAR(null);
    try {
      const params = new URLSearchParams();
      (form.specialty_ids || []).forEach(id => params.append('specialty_ids[]', id));
      if (form.priority)        params.append('priority',        form.priority);
      if (form.issue_type)      params.append('issue_type',      form.issue_type);
      if (form.complexity)      params.append('complexity',      form.complexity);
      if (form.estimated_hours) params.append('estimated_hours', form.estimated_hours);
      if (form.planned_end)     params.append('planned_end',     form.planned_end);
      params.append('top_n', '5');
      const res = await api.get(`/projects/${projectId}/auto-assign?${params}`);
      setAR(res.data);
    } catch {
      setAR({ best_user: null, candidates: [], message: "Service IA indisponible." });
    } finally {
      setIA(false);
    }
  };

  // ── Save ──────────────────────────────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: (data) =>
      isEdit
        ? api.put(`/tasks/${taskId}`, data)
        : api.post(`/projects/${projectId}/tasks`, data),
    onSuccess: () => {
      const pid = String(projectId);
      queryClient.invalidateQueries({ queryKey: ['tasks', pid] });
      queryClient.invalidateQueries({ queryKey: ['project-gantt', pid] });
      queryClient.invalidateQueries({ queryKey: ['project-dashboard', pid] });
      if (taskId) queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      toast.success(isEdit ? 'Tâche mise à jour' : 'Tâche créée');
      navigate(`/projects/${projectId}`);
    },
    onError: (err) => {
      if (err.response?.status === 422) {
        const serverErrors = err.response.data.errors || {};
        setErrors(Object.fromEntries(
          Object.entries(serverErrors).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])
        ));
        // Redirect to the step that has the error
        const errorKeys = Object.keys(serverErrors);
        const stepMap = {
          title: 0, description: 0, issue_type: 0, priority: 0, story_points: 0,
          planned_start: 1, planned_end: 1, estimated_hours: 1, complexity: 1,
          workflow_status: 1, duration_days: 1,
          specialty_ids: 2, depends_on_task_ids: 2,
          assignee_id: 3,
        };
        const firstErrorStep = errorKeys.reduce((min, k) => {
          const s = stepMap[k] ?? 0;
          return s < min ? s : min;
        }, 3);
        setStep(firstErrorStep);
      } else {
        toast.error(err.response?.data?.message || 'Erreur lors de la sauvegarde');
      }
    },
  });

  const handleSubmit = () => {
    const stepErrors = validateStep(step, form, projectStart, projectEnd, isEdit);
    if (Object.keys(stepErrors).length) {
      setErrors(stepErrors);
      return;
    }

    const specialtyIds = (form.specialty_ids || []).filter(Boolean).slice(0, 1);
    const ps = form.planned_start?.trim() || '';
    const pe = form.planned_end?.trim()   || '';

    const payload = {
      title:           form.title.trim(),
      description:     form.description || undefined,
      issue_type:      form.issue_type,
      priority:        form.priority,
      complexity:      form.complexity,
      story_points:    form.story_points === '' ? undefined : Number(form.story_points),
      planned_end:     pe || undefined,
      estimated_hours: form.estimated_hours === '' ? undefined : Number(form.estimated_hours),
      depends_on_task_ids: (form.depends_on_task_ids || []).map(Number),
      specialty_ids:   specialtyIds,
      workflow_status: form.workflow_status || 'todo',
    };

    if (!isEdit) {
      payload.planned_start = ps || undefined;
    }

    if (isEdit) {
      payload.assignee_id    = form.assignee_id ? Number(form.assignee_id) : null;
      payload.progress_percent = form.progress_percent;
    } else if (form.assignee_id) {
      payload.assignee_id = Number(form.assignee_id);
    }

    saveMutation.mutate(payload);
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/tasks/${taskId}`),
    onSuccess: () => {
      const pid = String(projectId);
      queryClient.invalidateQueries({ queryKey: ['tasks', pid] });
      queryClient.invalidateQueries({ queryKey: ['project-dashboard', pid] });
      toast.success('Tâche supprimée');
      navigate(`/projects/${projectId}`);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Erreur lors de la suppression');
    },
  });

  const handleDelete = () => {
    if (window.confirm(`Supprimer la tâche "${taskDetail?.title || ''}" ? Cette action est irréversible.`)) {
      deleteMutation.mutate();
    }
  };

  // ── Step navigation ───────────────────────────────────────────────────────

  const goNext = () => {
    const stepErrors = validateStep(step, form, projectStart, projectEnd, isEdit);
    if (Object.keys(stepErrors).length) {
      setErrors(stepErrors);
      return;
    }
    setErrors({});
    setStep(s => Math.min(s + 1, STEPS.length - 1));
  };

  const goPrev = () => {
    setErrors({});
    setStep(s => Math.max(s - 1, 0));
  };

  // ── Loading state ─────────────────────────────────────────────────────────

  if (isEdit && loadingTask) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const canEdit = isEdit
    ? (isAdmin || Boolean(taskDetail?.access?.can_edit))
    : true;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(`/projects/${projectId}`)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">
            {projectMeta?.name ?? `Projet #${projectId}`}
          </p>
          <h1 className="text-lg font-semibold text-foreground">
            {isEdit ? `Modifier la tâche${taskDetail?.title ? ` · ${taskDetail.title}` : ''}` : 'Nouvelle tâche'}
          </h1>
        </div>
        {isEdit && canEdit && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Supprimer
          </button>
        )}
      </div>

      {/* Step indicator */}
      <StepIndicator current={step} />

      {/* Step description */}
      <div className="mb-6 text-center">
        <p className="text-sm text-muted-foreground">{STEPS[step].desc}</p>
      </div>

      {/* Global error */}
      {Object.keys(errors).length > 0 && (
        <div className="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {Object.values(errors)[0]}
        </div>
      )}

      {/* Step content */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm">

        {/* ── STEP 0: Informations de base ── */}
        {step === 0 && (
          <div className="space-y-5">
            <SectionTitle icon={LayoutGrid} label="Informations de base" />
            <div>
              <label className="mb-1.5 block text-sm font-medium">Titre *</label>
              <Input
                value={form.title}
                onChange={e => set('title', e.target.value)}
                disabled={!canEdit}
                placeholder="Résumé court de la tâche…"
                autoFocus
              />
              {errors.title && <FieldError msg={errors.title} />}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Description</label>
              <Textarea
                value={form.description}
                onChange={e => set('description', e.target.value)}
                rows={5}
                disabled={!canEdit}
                placeholder="Étapes, contexte, critères d'acceptation…"
              />
            </div>

            <div className="max-w-xs">
              <label className="mb-1.5 block text-sm font-medium">Priorité *</label>
              <Select value={form.priority} onChange={e => set('priority', e.target.value)} disabled={!canEdit}>
                {PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
              {errors.priority && <FieldError msg={errors.priority} />}
            </div>

            <div className="max-w-xs">
              <label className="mb-1.5 block text-sm font-medium">Effort (points)</label>
              <Input
                type="number" min={0}
                value={form.story_points}
                onChange={e => set('story_points', e.target.value === '' ? '' : Number(e.target.value))}
                disabled={!canEdit}
                placeholder="Optionnel"
              />
            </div>
          </div>
        )}

        {/* ── STEP 1: Planification ── */}
        {step === 1 && (
          <div className="space-y-5">
            <SectionTitle icon={CalendarRange} label="Planification" />

            {(projectStart || projectEnd) && (
              <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                Période du projet : {projectStart ? fmtFr(projectStart) : 'non définie'} → {projectEnd ? fmtFr(projectEnd) : 'non définie'}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Date de début</label>
                <Input
                  type="date"
                  value={form.planned_start}
                  onChange={e => set('planned_start', e.target.value)}
                  disabled={!canEdit || isEdit}
                  min={!isEdit ? (projectStart || undefined) : undefined}
                  max={!isEdit ? (projectEnd   || undefined) : undefined}
                />
                {isEdit && <p className="mt-1 text-xs text-muted-foreground">Figée après création.</p>}
                {errors.planned_start && <FieldError msg={errors.planned_start} />}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Date de fin</label>
                <Input
                  type="date"
                  value={form.planned_end}
                  onChange={e => set('planned_end', e.target.value)}
                  disabled={!canEdit}
                  min={form.planned_start || projectStart || undefined}
                  max={projectEnd || undefined}
                />
                {errors.planned_end && <FieldError msg={errors.planned_end} />}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Heures estimées</label>
                <Input type="number" min={0} step={0.5}
                  value={form.estimated_hours}
                  onChange={e => set('estimated_hours', e.target.value)}
                  disabled={!canEdit}
                  placeholder="Ex : 8"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Complexité (1–10)</label>
                <Input type="number" min={1} max={10}
                  value={form.complexity}
                  onChange={e => set('complexity', Number(e.target.value))}
                  disabled={!canEdit}
                />
              </div>
            </div>

            {isEdit && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Statut workflow</label>
                  <Select value={form.workflow_status} onChange={e => set('workflow_status', e.target.value)} disabled={!canEdit}>
                    {WORKFLOW_OPTIONS.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
                  </Select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Progression (%)</label>
                  <Input type="number" min={0} max={100}
                    value={form.progress_percent}
                    onChange={e => set('progress_percent', Number(e.target.value))}
                    disabled={!canEdit}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: Compétences & Liens ── */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <SectionTitle icon={Tag} label="Spécialité requise" />
              <p className="mb-3 text-xs text-muted-foreground">
                Choisissez <strong>une</strong> spécialité principale. Elle guide la recommandation IA au step suivant.
              </p>
              {allSpecialties.length === 0 ? (
                <p className="text-xs text-muted-foreground">Chargement…</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {allSpecialties.map(s => {
                    const active = (form.specialty_ids || []).includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        disabled={!canEdit}
                        onClick={() => set('specialty_ids', active ? [] : [s.id])}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${
                          active
                            ? 'border-transparent text-white shadow-sm'
                            : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground'
                        }`}
                        style={active ? { backgroundColor: s.color } : {}}
                      >
                        {active && <Check className="h-3.5 w-3.5" />}
                        {s.name}
                      </button>
                    );
                  })}
                </div>
              )}
              {errors.specialty_ids && <FieldError msg={errors.specialty_ids} />}
            </div>

            <div>
              <SectionTitle icon={Link2} label="Dépendances" />
              <p className="mb-3 text-xs text-muted-foreground">
                Tâches qui doivent être terminées avant (liens Gantt fin-début).
              </p>
              <TaskDependencyPicker
                tasks={projectTasks}
                value={form.depends_on_task_ids}
                onChange={ids => set('depends_on_task_ids', ids)}
                excludeTaskId={taskId ? Number(taskId) : undefined}
                disabled={!canEdit}
              />
            </div>
          </div>
        )}

        {/* ── STEP 3: Assignation ── */}
        {step === 3 && (
          <div className="space-y-5">
            <SectionTitle icon={UserCircle} label="Assignation" />

            {/* ML result card */}
            <div className={`rounded-xl border-2 p-4 transition-all ${
              isAutoAssigning
                ? 'border-violet-200 bg-violet-50/30 dark:border-violet-800/40 dark:bg-violet-900/10'
                : autoAssignResult?.best_user
                  ? 'border-violet-300/60 bg-gradient-to-br from-violet-50/40 to-transparent dark:border-violet-800/30 dark:from-violet-900/10'
                  : 'border-border bg-muted/20'
            }`}>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/40">
                    <Sparkles className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">Recommandation IA</span>
                  <span className="rounded-full bg-violet-100 dark:bg-violet-900/30 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:text-violet-300">
                    22 features ML
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => { setMLTrigg(false); doAutoAssign(); }}
                  disabled={isAutoAssigning}
                  className="text-xs text-violet-600 dark:text-violet-400 hover:underline disabled:opacity-50"
                >
                  Relancer
                </button>
              </div>

              {isAutoAssigning ? (
                <div className="flex items-center gap-3 py-3">
                  <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
                  <span className="text-sm text-violet-700 dark:text-violet-300">
                    Analyse de {memberOptions.length} membre{memberOptions.length !== 1 ? 's' : ''} · 22 features…
                  </span>
                </div>
              ) : autoAssignResult?.best_user ? (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
                      {(autoAssignResult.best_user.name || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{autoAssignResult.best_user.name}</p>
                      <p className="text-xs text-muted-foreground">{autoAssignResult.best_user.email}</p>
                    </div>
                    <div className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                      autoAssignResult.best_user.score >= 75 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                      autoAssignResult.best_user.score >= 50 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                                               'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'
                    }`}>
                      {autoAssignResult.best_user.score}%
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setMLModal(true)}
                      className="rounded-lg border border-violet-300 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 dark:border-violet-700 dark:bg-violet-900/30 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/50 transition-colors"
                    >
                      Voir l'analyse
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        set('assignee_id', autoAssignResult.best_user.id ?? autoAssignResult.best_user.user_id);
                        toast.success(`${autoAssignResult.best_user.name} sélectionné`);
                      }}
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      Accepter
                    </button>
                  </div>
                </div>
              ) : autoAssignResult?.candidates?.length === 0 ? (
                <div className="flex items-center gap-2 py-2 text-sm text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                  {autoAssignResult?.message || 'Aucun candidat disponible.'}
                </div>
              ) : (
                <p className="py-2 text-sm text-muted-foreground">
                  Renseignez la spécialité et les détails de la tâche pour obtenir une recommandation.
                </p>
              )}
            </div>

            {/* Manual picker */}
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  Membre assigné
                  {recommendedIds.size > 0 && (
                    <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                      <Star className="inline h-2.5 w-2.5 mr-0.5" />
                      {recommendedIds.size} recommandé{recommendedIds.size > 1 ? 's' : ''}
                    </span>
                  )}
                </label>
                <button
                  type="button"
                  onClick={() => setPerfModal(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                >
                  <BarChart3 className="h-3.5 w-3.5 text-primary" />
                  Voir performances
                </button>
              </div>
              <MemberAssigneePicker
                id="task-assignee"
                members={memberOptions}
                value={form.assignee_id === '' ? '' : form.assignee_id}
                onChange={id => set('assignee_id', id === '' ? '' : id)}
                disabled={!canEdit}
                recommendedIds={recommendedIds}
              />
              {form.assignee_id && (
                <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                  ✓ Assigné à {memberOptions.find(m => String(m.id) === String(form.assignee_id))?.name ?? `#${form.assignee_id}`}
                </p>
              )}
            </div>

            {/* Summary recap */}
            <SummaryRecap form={form} projectMeta={projectMeta} taskDetail={taskDetail} isEdit={isEdit} />
          </div>
        )}
      </div>

      {/* Footer navigation */}
      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={goPrev}
          disabled={step === 0}
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-4 w-4" />
          Précédent
        </button>

        <span className="text-xs text-muted-foreground">
          Étape {step + 1} / {STEPS.length}
        </span>

        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={goNext}
            className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Suivant
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={saveMutation.isPending || !canEdit}
          >
            {saveMutation.isPending
              ? 'Enregistrement…'
              : isEdit ? 'Enregistrer les modifications' : 'Créer la tâche'}
          </Button>
        )}
      </div>

      {/* ML full analysis modal */}
      <MLRecommendationModal
        open={showMLModal}
        onClose={() => setMLModal(false)}
        result={autoAssignResult}
        selectedId={form.assignee_id}
        onAccept={(id) => {
          set('assignee_id', id);
          setMLModal(false);
        }}
      />

      {/* Members performance modal (stays on step 4) */}
      <MembersPerformanceModal
        open={showPerfModal}
        onClose={() => setPerfModal(false)}
        projectId={projectId}
        assigneeId={form.assignee_id}
        onAssign={(id) => {
          set('assignee_id', id);
          toast.success(`${memberOptions.find(m => String(m.id) === String(id))?.name ?? 'Membre'} assigné`);
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function SectionTitle({ icon: Icon, label }) {
  return (
    <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground border-b border-border/60 pb-2">
      <Icon className="h-4 w-4 shrink-0 text-primary" />
      {label}
    </h2>
  );
}

function FieldError({ msg }) {
  return <p className="mt-1 text-xs text-destructive">{msg}</p>;
}

function SummaryRecap({ form, projectMeta, taskDetail, isEdit }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/10 px-4 py-3 text-xs text-muted-foreground space-y-1">
      <p className="font-semibold text-foreground mb-2">Récapitulatif</p>
      <p>Projet : <span className="text-foreground font-medium">{projectMeta?.name ?? '—'}</span></p>
      <p>Titre : <span className="text-foreground font-medium">{form.title || '—'}</span></p>
      <p>Type · Priorité : <span className="text-foreground font-medium">{form.issue_type} · {form.priority}</span></p>
      {(form.planned_start || form.planned_end) && (
        <p>Dates : <span className="text-foreground font-medium">{fmtFr(form.planned_start)} → {fmtFr(form.planned_end)}</span></p>
      )}
      {form.estimated_hours && (
        <p>Heures estimées : <span className="text-foreground font-medium">{form.estimated_hours}h</span></p>
      )}
      {isEdit && taskDetail?.created_at && (
        <p>Créée le : <span className="text-foreground font-medium">{fmtFr(taskDetail.created_at)}</span></p>
      )}
    </div>
  );
}
