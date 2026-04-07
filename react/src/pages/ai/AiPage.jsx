import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { isGuestViewer } from '../../lib/roles';
import { cn } from '../../lib/utils';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Select';
import { Spinner } from '../../components/ui/Spinner';
import {
  Brain, Clock, AlertTriangle, TrendingUp,
  BarChart3, Table2, Sparkles, Scale, Lightbulb, Target,
} from 'lucide-react';

function normalizeWorkflowStatus(raw) {
  const normalized = String(raw ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (normalized === 'done' || normalized === 'completed' || normalized === 'termine') return 'done';
  if (normalized === 'in_progress' || normalized === 'at_risk' || normalized === 'en cours') return 'in_progress';
  return 'todo';
}

function getTaskStatus(task) {
  const statusValue = task?.status;
  const statusFromObject = statusValue && typeof statusValue === 'object' ? statusValue.name : statusValue;
  return statusFromObject || task?.workflow_status || task?.state || task?.etat || 'todo';
}

const PRIORITY_LABEL_FR = {
  low: 'Basse',
  medium: 'Moyenne',
  high: 'Haute',
  urgent: 'Urgente',
};

export default function AiPage() {
  const { user } = useAuth();
  const isInvite = isGuestViewer(user);

  const tabDefs = useMemo(
    () => {
      const all = [
        { key: 'estimate', label: 'Estimation', icon: Clock },
        { key: 'risk-task', label: 'Risque Tâche', icon: AlertTriangle },
        { key: 'risk-project', label: 'Risque Projet', icon: TrendingUp },
        { key: 'recommendations', label: 'Synthèse projet', icon: Lightbulb },
        { key: 'balance', label: 'Équilibre charge', icon: Scale },
      ];
      if (isInvite) {
        return all.filter((t) => !['risk-project', 'recommendations', 'balance'].includes(t.key));
      }
      return all;
    },
    [isInvite],
  );

  const [tab, setTab] = useState('estimate');

  useEffect(() => {
    if (!tabDefs.some((t) => t.key === tab)) {
      setTab('estimate');
    }
  }, [tab, tabDefs]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">IA et analyses</h1>
        <p className="text-muted-foreground">
          Estimation automatique du temps et détection des retards probables (règles métier + historique projet).
        </p>
      </div>

      <div
        className={cn(
          'grid gap-3',
          isInvite ? 'sm:grid-cols-2' : 'sm:grid-cols-3',
        )}
      >
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-primary">
            <Target className="h-4 w-4" />
            <span className="text-sm font-semibold">Estimation</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Durée en heures à partir des story points, priorité, description et tâches similaires terminées sur le projet.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-semibold">Retards probables</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Score de risque (priorité, échéance, avancement vs calendrier, dépendances bloquantes).
          </p>
        </div>
        {!isInvite && (
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2 text-violet-600">
              <Scale className="h-4 w-4" />
              <span className="text-sm font-semibold">Répartition &amp; charge</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Synthèse projet, équilibre de charge et vue globale des risques (onglets dédiés).
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-1 border-b border-border">
        {tabDefs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'estimate' && <EstimatePanel />}
      {tab === 'risk-task' && <TaskRiskPanel />}
      {tab === 'risk-project' && !isInvite && <ProjectRiskPanel />}
      {tab === 'recommendations' && !isInvite && <RecommendationsPanel />}
      {tab === 'balance' && !isInvite && <WorkloadBalancePanel />}
    </div>
  );
}

function EstimatePanel() {
  const [taskId, setTaskId] = useState('');
  const [run, setRun] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['ai-estimate', taskId],
    queryFn: () => api.get(`/ai/estimate/${taskId}`).then((r) => r.data),
    enabled: run && !!taskId,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5 text-primary" /> Estimation de durée
        </CardTitle>
        <CardDescription>L'IA estime la durée d'une tâche selon sa complexité et priorité</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <TaskPickerByProject
          taskId={taskId}
          onTaskChange={(id) => {
            setTaskId(id);
            setRun(false);
          }}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => setRun(true)} disabled={!taskId || isLoading}>
            {isLoading ? <Spinner className="mr-2" /> : <Brain className="mr-2 h-4 w-4" />}
            Estimer
          </Button>
          {taskId && (
            <span className="text-sm text-muted-foreground">
              Tâche sélectionnée : <span className="font-medium text-foreground">#{taskId}</span>
            </span>
          )}
        </div>
        {error && <p className="text-sm text-destructive">Erreur&nbsp;: {error.response?.data?.message || error.message}</p>}
        {data && <EstimateResultView data={data} />}
      </CardContent>
    </Card>
  );
}

function TaskRiskPanel() {
  const [taskId, setTaskId] = useState('');
  const [run, setRun] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['ai-risk-task', taskId],
    queryFn: () => api.get(`/ai/delay-risk/task/${taskId}`).then((r) => r.data),
    enabled: run && !!taskId,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertTriangle className="h-5 w-5 text-amber-500" /> Analyse de risque (Tâche)
        </CardTitle>
        <CardDescription>Évalue le risque de retard d'une tâche spécifique</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <TaskPickerByProject
          taskId={taskId}
          onTaskChange={(id) => {
            setTaskId(id);
            setRun(false);
          }}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => setRun(true)} disabled={!taskId || isLoading}>
            {isLoading ? <Spinner className="mr-2" /> : <Brain className="mr-2 h-4 w-4" />}
            Analyser
          </Button>
          {taskId && (
            <span className="text-sm text-muted-foreground">
              Tâche : <span className="font-medium text-foreground">#{taskId}</span>
            </span>
          )}
        </div>
        {error && <p className="text-sm text-destructive">Erreur&nbsp;: {error.response?.data?.message || error.message}</p>}
        {data && <TaskRiskResultView data={data} />}
      </CardContent>
    </Card>
  );
}

function ProjectRiskPanel() {
  const [projectId, setProjectId] = useState('');
  const [run, setRun] = useState(false);

  const { data: projects } = useQuery({
    queryKey: ['projects-for-ai'],
    queryFn: () => api.get('/projects?per_page=100').then((r) => r.data.data),
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['ai-risk-project', projectId],
    queryFn: () => api.get(`/ai/delay-risk/project/${projectId}`).then((r) => r.data),
    enabled: run && !!projectId,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5 text-orange-500" /> Analyse de risque (Projet)
        </CardTitle>
        <CardDescription>Évalue le risque global de retard d'un projet</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Projet</label>
            <Select value={projectId} onChange={(e) => { setProjectId(e.target.value); setRun(false); }} className="w-60">
              <option value="">Choisir un projet</option>
              {projects?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </div>
          <Button onClick={() => setRun(true)} disabled={!projectId || isLoading}>
            {isLoading ? <Spinner className="mr-2" /> : <Brain className="mr-2 h-4 w-4" />}
            Analyser
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">Erreur&nbsp;: {error.response?.data?.message || error.message}</p>}
        {data && <ProjectRiskResultView data={data} />}
      </CardContent>
    </Card>
  );
}

function RecommendationsPanel() {
  const [projectId, setProjectId] = useState('');
  const [run, setRun] = useState(false);

  const { data: projects } = useQuery({
    queryKey: ['projects-for-ai'],
    queryFn: () => api.get('/projects?per_page=100').then((r) => r.data.data),
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['ai-recommendations', projectId],
    queryFn: () => api.get(`/ai/recommendations/project/${projectId}`).then((r) => r.data),
    enabled: run && !!projectId,
  });

  const sum = data?.summary;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Lightbulb className="h-5 w-5 text-amber-500" /> Synthèse et recommandations projet
        </CardTitle>
        <CardDescription>
          Priorité suggérée, échéance indicative et pistes de rééquilibrage lorsque des retards sont détectés.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Projet</label>
            <Select value={projectId} onChange={(e) => { setProjectId(e.target.value); setRun(false); }} className="w-60">
              <option value="">Choisir un projet</option>
              {projects?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </div>
          <Button onClick={() => setRun(true)} disabled={!projectId || isLoading}>
            {isLoading ? <Spinner className="mr-2" /> : <Brain className="mr-2 h-4 w-4" />}
            Générer
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">Erreur&nbsp;: {error.response?.data?.message || error.message}</p>}
        {data && (
          <div className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm">
            {sum && (
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-center">
                  <p className="text-xs font-medium text-muted-foreground">Tâches actives</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums">{sum.active_tasks}</p>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-3 text-center dark:border-amber-900 dark:bg-amber-950/30">
                  <p className="text-xs font-medium text-muted-foreground">En retard</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-amber-900 dark:text-amber-200">{sum.overdue_tasks}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-center">
                  <p className="text-xs font-medium text-muted-foreground">Focus priorité</p>
                  <p className="mt-1 text-sm font-semibold capitalize">{PRIORITY_LABEL_FR[sum.suggested_priority_focus] || sum.suggested_priority_focus}</p>
                </div>
              </div>
            )}
            {data.deadline_suggestion && (
              <div className="rounded-lg border border-sky-200/80 bg-sky-50/50 px-4 py-3 dark:border-sky-900 dark:bg-sky-950/20">
                <p className="text-xs font-semibold uppercase tracking-wide text-sky-800 dark:text-sky-300">Échéance indicative</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">{data.deadline_suggestion}</p>
                {data.deadline_suggestion_label && (
                  <p className="mt-1 text-sm text-muted-foreground">{data.deadline_suggestion_label}</p>
                )}
              </div>
            )}
            {data.redistribution_suggestion && (
              <div className="overflow-hidden rounded-lg border border-violet-200/70 bg-violet-50/40 dark:border-violet-900 dark:bg-violet-950/20">
                <div className="border-b border-violet-200/60 px-4 py-2 text-sm font-semibold dark:border-violet-800">
                  Répartition ({data.redistribution_suggestion.tasks_overdue_count} tâche(s) en retard)
                </div>
                <p className="px-4 py-2 text-sm text-muted-foreground">{data.redistribution_suggestion.reason}</p>
                {Array.isArray(data.redistribution_suggestion.target_users_low_workload) && (
                  <div className="overflow-x-auto px-2 pb-3">
                    <table className="w-full min-w-[400px] text-sm">
                      <thead>
                        <tr className="text-left text-xs text-muted-foreground">
                          <th className="px-2 py-1.5">Membre</th>
                          <th className="px-2 py-1.5 text-right">Tâches actives</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {data.redistribution_suggestion.target_users_low_workload.map((u) => (
                          <tr key={u.user_id}>
                            <td className="px-2 py-2 font-medium">{u.name}</td>
                            <td className="px-2 py-2 text-right tabular-nums">{u.active_tasks}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
            {!data.deadline_suggestion && !data.redistribution_suggestion && (
              <p className="text-sm text-muted-foreground">Aucune alerte de synthèse pour ce projet.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function WorkloadBalancePanel() {
  const [projectId, setProjectId] = useState('');
  const [run, setRun] = useState(false);

  const { data: projects } = useQuery({
    queryKey: ['projects-for-ai'],
    queryFn: () => api.get('/projects?per_page=100').then((r) => r.data.data),
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['ai-workload-balance', projectId],
    queryFn: () => api.get(`/ai/workload-balance/${projectId}`).then((r) => r.data),
    enabled: run && !!projectId,
  });

  const metrics = data?.balance_metrics;
  const hints = Array.isArray(data?.rebalance_hints) ? data.rebalance_hints : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Scale className="h-5 w-5 text-violet-500" /> Équilibre de charge par membre
        </CardTitle>
        <CardDescription>
          Heures ouvertes estimées, tâches actives et retard par personne ; dispersion de l’équipe pour repérer les surcharges.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Projet</label>
            <Select value={projectId} onChange={(e) => { setProjectId(e.target.value); setRun(false); }} className="w-60">
              <option value="">Choisir un projet</option>
              {projects?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </div>
          <Button onClick={() => setRun(true)} disabled={!projectId || isLoading}>
            {isLoading ? <Spinner className="mr-2" /> : <BarChart3 className="mr-2 h-4 w-4" />}
            Analyser
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">Erreur&nbsp;: {error.response?.data?.message || error.message}</p>}
        {data && (
          <div className="space-y-4">
            {metrics && (
              <div className="flex flex-wrap gap-3 rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm">
                <span>
                  Moyenne charge : <strong className="tabular-nums">{metrics.average_workload_score}</strong>
                </span>
                <span className="text-muted-foreground">|</span>
                <span>
                  Dispersion : <strong className="tabular-nums">{metrics.spread}</strong>
                </span>
                {metrics.imbalanced && (
                  <Badge variant="warning">Équipe déséquilibrée</Badge>
                )}
              </div>
            )}
            {Array.isArray(data.members) && data.members.length > 0 ? (
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-left text-xs font-medium text-muted-foreground">
                      <th className="px-4 py-2">Membre</th>
                      <th className="px-4 py-2 text-right">Score charge</th>
                      <th className="px-4 py-2 text-right">Heures ouvertes</th>
                      <th className="px-4 py-2 text-right">Actives</th>
                      <th className="px-4 py-2 text-right">Retard</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.members.map((m) => (
                      <tr key={m.user_id} className="hover:bg-muted/15">
                        <td className="px-4 py-3">
                          <span className="font-medium">{m.name}</span>
                          <span className="ml-2 block text-xs text-muted-foreground">{m.email}</span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium">{m.workload_score}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{m.open_estimated_hours}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{m.active_tasks}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{m.overdue_tasks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Aucun membre trouvé pour ce projet.</p>
            )}
            {hints.length > 0 && (
              <div className="rounded-lg border border-violet-200/60 bg-violet-50/30 px-4 py-3 dark:border-violet-900 dark:bg-violet-950/20">
                <p className="mb-2 text-sm font-semibold">Conseils</p>
                <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                  {hints.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function estimationMethodLabel(method) {
  const labels = {
    rule_based: 'Règles métier (priorité, description, historique)',
    similar_tasks_same_project: 'Tâches similaires (même projet)',
    similar_tasks_global: 'Tâches similaires (tous projets)',
    project_historical_average: 'Moyenne historique du projet',
  };
  return labels[method] || method;
}

function impactLabel(impact) {
  const m = { critical: 'Critique', high: 'Élevé', medium: 'Moyen', low: 'Faible' };
  return m[impact] || impact;
}

function EstimateResultView({ data }) {
  const confidencePct = Math.round((data.confidence ?? 0) * 100);
  const hours = data.estimated_hours;
  const days = data.estimated_days;
  const mins = data.estimated_duration_minutes ?? data.estimated_duration;

  return (
    <div className="overflow-hidden rounded-2xl border border-indigo-200/50 bg-gradient-to-br from-slate-50 via-white to-indigo-50/50 p-1 shadow-md dark:border-indigo-900/40 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/50">
      <div className="rounded-[14px] bg-card p-5 sm:p-6 dark:bg-slate-900/70">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2 text-indigo-600">
              <Sparkles className="h-4 w-4 shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-wide">Résultat d’estimation</span>
            </div>
            <h3 className="text-lg font-semibold leading-snug text-foreground">{data.title}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">Tâche n° {data.task_id}</p>
          </div>
          {hours != null && (
            <Badge variant="success" className="shrink-0 text-sm">
              {Number(hours).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} h estimées
            </Badge>
          )}
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-emerald-200/90 bg-gradient-to-b from-emerald-50 to-white px-4 py-4 text-center shadow-sm">
            <p className="text-xs font-medium text-emerald-800">Charge estimée</p>
            <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-emerald-950">
              {hours != null ? `${Number(hours).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} h` : '—'}
            </p>
          </div>
          <div className="rounded-xl border border-sky-200/90 bg-gradient-to-b from-sky-50 to-white px-4 py-4 text-center shadow-sm">
            <p className="text-xs font-medium text-sky-800">Durée calendaire</p>
            <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-sky-950">
              {days != null ? `${Number(days).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} j` : '—'}
            </p>
            {mins != null && (
              <p className="mt-1 text-[11px] text-sky-800/95">
                {mins} min ({data.method === 'rule_based' ? 'estimation automatique' : 'planification'})
              </p>
            )}
            <p className="mt-1 text-[11px] text-sky-700/90">Ordre de grandeur pour la planification</p>
          </div>
          <div className="rounded-xl border border-violet-200/90 bg-gradient-to-b from-violet-50 to-white px-4 py-4 text-center shadow-sm">
            <p className="text-xs font-medium text-violet-800">Confiance</p>
            <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-violet-950">{confidencePct} %</p>
            <div className="mx-auto mt-2 h-2 max-w-[9rem] overflow-hidden rounded-full bg-violet-200">
              <div
                className="h-full rounded-full bg-violet-500 transition-all"
                style={{ width: `${Math.min(100, confidencePct)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mb-6 overflow-hidden rounded-xl border border-border shadow-sm">
          <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-2.5">
            <Table2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Détails du calcul</span>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-border">
              <tr>
                <td className="w-[40%] px-4 py-2.5 text-muted-foreground">Méthode</td>
                <td className="px-4 py-2.5 font-medium text-foreground">{estimationMethodLabel(data.method)}</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 text-muted-foreground">Taille de l’échantillon</td>
                <td className="px-4 py-2.5 font-medium tabular-nums">{data.sample_size != null ? data.sample_size : '—'}</td>
              </tr>
              {data.average_completion_time_days != null && (
                <tr>
                  <td className="px-4 py-2.5 text-muted-foreground">Temps moyen de complétion (historique)</td>
                  <td className="px-4 py-2.5 font-medium tabular-nums">
                    {`${Number(data.average_completion_time_days).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} j`}
                  </td>
                </tr>
              )}
              {data.comparable_range && (
                <tr>
                  <td className="px-4 py-2.5 text-muted-foreground">Fourchette (heures réelles, comparables)</td>
                  <td className="px-4 py-2.5 font-medium tabular-nums">
                    {data.comparable_range.min} — {data.comparable_range.max} h
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {Array.isArray(data.comparable_tasks) && data.comparable_tasks.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-border shadow-sm">
            <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-2.5">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Tâches comparables utilisées</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2">ID</th>
                    <th className="px-4 py-2">Titre</th>
                    <th className="px-4 py-2 text-right">Heures réelles</th>
                    <th className="px-4 py-2 text-right">Jours (réalis.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.comparable_tasks.map((ct) => (
                    <tr key={ct.id} className="hover:bg-muted/30">
                      <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">#{ct.id}</td>
                      <td className="px-4 py-2.5">{ct.title}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{ct.actual_hours ?? '—'}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{ct.completion_days ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const SCHEDULE_HEALTH_LABEL = {
  critical: 'Planning critique',
  watch: 'À surveiller',
  ok: 'Sous contrôle',
};

function TaskRiskResultView({ data }) {
  const factors = Array.isArray(data.risk_factors) ? data.risk_factors : [];
  const recs = Array.isArray(data.recommendations) ? data.recommendations : [];
  const insights = Array.isArray(data.insights) ? data.insights : [];
  const delayPct = data.delay_probability_percent ?? data.risk_score;
  const health = data.schedule_health;

  return (
    <div className="space-y-4 rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50/60 via-white to-orange-50/30 p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-lg font-semibold text-foreground">{data.title}</h3>
        {data.risk_score != null && <RiskBadge score={data.risk_score} />}
        {delayPct != null && (
          <Badge variant="outline" className="tabular-nums" title="Probabilité de retard (modèle heuristique)">
            Retard probable : {delayPct}%
          </Badge>
        )}
        {health && (
          <Badge
            variant={health === 'critical' ? 'destructive' : health === 'watch' ? 'warning' : 'success'}
          >
            {SCHEDULE_HEALTH_LABEL[health] || health}
          </Badge>
        )}
        {data.risk_level && (
          <Badge variant={data.risk_level === 'high' ? 'destructive' : data.risk_level === 'medium' ? 'warning' : 'success'}>
            {data.risk_level === 'high' ? 'Risque élevé' : data.risk_level === 'medium' ? 'Risque moyen' : 'Risque faible'}
          </Badge>
        )}
      </div>

      {insights.length > 0 && (
        <div className="rounded-xl border border-amber-100 bg-white/80 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-950/20">
          <p className="mb-2 text-sm font-semibold text-foreground">Analyse</p>
          <ul className="list-inside list-disc space-y-1.5 text-sm text-muted-foreground">
            {insights.map((line, i) => (
              <li key={i} className="leading-relaxed">{line}</li>
            ))}
          </ul>
        </div>
      )}

      {factors.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-border shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2.5">Code</th>
                <th className="px-3 py-2.5">Détail</th>
                <th className="px-3 py-2.5">Impact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {factors.map((f, i) => (
                <tr key={i} className="hover:bg-muted/20">
                  <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-muted-foreground">{f.factor}</td>
                  <td className="px-3 py-2.5 text-foreground">{f.detail}</td>
                  <td className="px-3 py-2.5">
                    <Badge variant="outline" className="font-normal">
                      {impactLabel(f.impact)}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Aucun facteur de risque identifié pour cette tâche.
        </p>
      )}

      {recs.length > 0 && (
        <div className="rounded-xl border border-amber-100 bg-card px-4 py-3 dark:border-amber-900/40 dark:bg-amber-950/20">
          <p className="mb-2 text-sm font-semibold text-foreground">Recommandations</p>
          <ul className="list-inside list-disc space-y-1.5 text-sm text-muted-foreground">
            {recs.map((r, i) => (
              <li key={i} className="leading-relaxed">{r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ProjectRiskResultView({ data }) {
  const s = data.summary;
  const tasks = Array.isArray(data.tasks) ? data.tasks : [];

  return (
    <div className="space-y-5 rounded-2xl border border-orange-200/70 bg-gradient-to-br from-orange-50/50 via-white to-amber-50/20 p-5 shadow-sm dark:border-orange-900/50 dark:from-slate-900 dark:via-slate-900 dark:to-amber-950/30">
      {s && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: 'Tâches analysées', value: s.total_analyzed },
            { label: 'À risque', value: s.at_risk, highlight: true },
            { label: 'Critique', value: s.critical },
            { label: 'Élevé', value: s.high },
            { label: 'Moyen / Faible', value: `${s.medium} / ${s.low}` },
          ].map((m) => (
            <div
              key={m.label}
              className={cn(
                'rounded-xl border px-4 py-3 text-center shadow-sm',
                m.highlight
                  ? 'border-amber-300 bg-amber-50/90 dark:border-amber-700 dark:bg-amber-950/40'
                  : 'border-border bg-card dark:bg-slate-900/60'
              )}
            >
              <p className="text-xs font-medium text-muted-foreground">{m.label}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{m.value}</p>
            </div>
          ))}
        </div>
      )}

      {tasks.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-border shadow-sm">
          <div className="border-b border-border bg-muted/50 px-4 py-2.5 text-sm font-semibold">Tâches à risque</div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left text-xs font-medium text-muted-foreground">
                  <th className="px-4 py-2">Tâche</th>
                  <th className="px-4 py-2">Priorité</th>
                  <th className="px-4 py-2">Échéance</th>
                  <th className="px-4 py-2 text-right">Prog.</th>
                  <th className="px-4 py-2 text-right">Risque</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tasks.map((t) => (
                  <tr key={t.task_id} className="hover:bg-muted/15">
                    <td className="px-4 py-2.5">
                      <span className="font-medium">{t.title}</span>
                      <span className="ml-2 font-mono text-xs text-muted-foreground">#{t.task_id}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      {PRIORITY_LABEL_FR[t.priority] || t.priority || '—'}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-muted-foreground">{t.due_date || '—'}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{t.progress ?? t.progress_percent ?? '—'}%</td>
                    <td className="px-4 py-2.5 text-right">
                      <RiskBadge score={t.risk_score} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Aucune tâche à risque détectée sur ce projet.
        </p>
      )}
    </div>
  );
}

/** Sélecteur en deux étapes : projet puis tâche. */
function TaskPickerByProject({ taskId, onTaskChange }) {
  const [projectId, setProjectId] = useState('');

  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ['projects-for-ai-picker'],
    queryFn: () => api.get('/projects?per_page=200').then((r) => r.data.data || []),
  });

  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ['ai-picker-project-tasks', projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const selectedProjectId = Number(projectId);
      const normalizeList = (rawTasks) => (Array.isArray(rawTasks) ? rawTasks : [])
        .filter((t) => t?.project_id == null || Number(t.project_id) === selectedProjectId)
        .map((t) => ({ ...t, workflow_status: normalizeWorkflowStatus(getTaskStatus(t)) }));

      try {
        const r = await api.get(`/projects/${projectId}/tasks?all=1`);
        const list = normalizeList(r.data?.tasks?.data ?? r.data?.tasks ?? r.data?.data ?? []);
        if (import.meta.env.DEV) {
          console.debug('[AiPage] project tasks response', {
            projectId: selectedProjectId,
            count: list.length,
          });
        }
        if (list.length > 0) return list;
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('[AiPage] /projects/{id}/tasks failed, using fallback', error?.response?.data ?? error?.message);
        }
      }

      const fallback = await api.get(`/tasks?all=1&project_id=${selectedProjectId}`);
      const fallbackList = normalizeList(fallback.data?.tasks?.data ?? fallback.data?.tasks ?? fallback.data?.data ?? []);
      if (import.meta.env.DEV) {
        console.debug('[AiPage] fallback global tasks response', {
          projectId: selectedProjectId,
          count: fallbackList.length,
        });
      }
      return fallbackList;
    },
  });

  const handleProjectSelect = (id) => {
    setProjectId(id);
    onTaskChange('');
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">1. Choisir un projet</label>
        <Select
          value={projectId}
          onChange={(e) => handleProjectSelect(e.target.value)}
          disabled={loadingProjects}
          className="w-full"
        >
          <option value="">{loadingProjects ? 'Chargement des projets…' : 'Choisir un projet'}</option>
          {projects.map((p) => (
            <option key={p.id} value={String(p.id)}>
              {p.name}{p.code ? ` (${p.code})` : ''}
            </option>
          ))}
        </Select>
        {!loadingProjects && projects.length === 0 && (
          <p className="mt-1 text-xs text-muted-foreground">Aucun projet accessible.</p>
        )}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">2. Choisir une tâche</label>
        <Select
          value={taskId || ''}
          onChange={(e) => onTaskChange(e.target.value)}
          disabled={!projectId || loadingTasks || tasks.length === 0}
          className="w-full"
        >
          <option value="">
            {!projectId
              ? 'Sélectionnez d’abord un projet'
              : loadingTasks
                ? 'Chargement des tâches…'
                : tasks.length === 0
                  ? 'Aucune tâche dans ce projet'
                  : 'Choisir une tâche'}
          </option>
          {tasks.map((t) => (
            <option key={t.id} value={String(t.id)}>
              #{t.id} - {t.title}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}

function RiskBadge({ score }) {
  const variant = score >= 60 ? 'destructive' : score >= 30 ? 'warning' : 'success';
  const label = score >= 60 ? 'Élevé' : score >= 30 ? 'Moyen' : 'Faible';
  return <Badge variant={variant}>{score}% — {label}</Badge>;
}
