import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { cn } from '../../lib/utils';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Select';
import { Spinner } from '../../components/ui/Spinner';
import {
  Brain, Clock, AlertTriangle, UserCheck, TrendingUp, Zap,
  BarChart3, Table2, Sparkles,
} from 'lucide-react';

export default function AiPage() {
  const [tab, setTab] = useState('estimate');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">IA & Analytics</h1>
        <p className="text-muted-foreground">Estimations intelligentes, analyse des risques et optimisation</p>
      </div>

      <div className="flex gap-1 border-b border-border">
        {[
          { key: 'estimate', label: 'Estimation', icon: Clock },
          { key: 'risk-task', label: 'Risque Tâche', icon: AlertTriangle },
          { key: 'risk-project', label: 'Risque Projet', icon: TrendingUp },
          { key: 'suggest', label: 'Suggestion', icon: UserCheck },
          { key: 'optimize', label: 'Optimisation', icon: Zap },
        ].map((t) => (
          <button
            key={t.key}
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
      {tab === 'risk-project' && <ProjectRiskPanel />}
      {tab === 'suggest' && <SuggestPanel />}
      {tab === 'optimize' && <OptimizePanel />}
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
        {error && <p className="text-sm text-destructive">Erreur: {error.response?.data?.message || error.message}</p>}
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
        {error && <p className="text-sm text-destructive">Erreur: {error.response?.data?.message || error.message}</p>}
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
        {error && <p className="text-sm text-destructive">Erreur: {error.response?.data?.message || error.message}</p>}
        {data && <ProjectRiskResultView data={data} />}
      </CardContent>
    </Card>
  );
}

function SuggestPanel() {
  const [taskId, setTaskId] = useState('');
  const [run, setRun] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['ai-suggest', taskId],
    queryFn: () => api.get(`/ai/suggest-assignment/${taskId}`).then((r) => r.data),
    enabled: run && !!taskId,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <UserCheck className="h-5 w-5 text-green-500" /> Suggestion d'assignation
        </CardTitle>
        <CardDescription>L'IA suggère le meilleur membre à assigner à une tâche</CardDescription>
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
            Suggérer
          </Button>
          {taskId && (
            <span className="text-sm text-muted-foreground">
              Tâche : <span className="font-medium text-foreground">#{taskId}</span>
            </span>
          )}
        </div>
        {error && <p className="text-sm text-destructive">Erreur: {error.response?.data?.message || error.message}</p>}
        {data && (
          <div className="rounded-lg bg-accent/30 p-4 space-y-3">
            <p className="font-medium">{data.title}</p>
            {data.suggested_user && (
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-gradient-to-r from-green-50 to-emerald-50/80 p-4 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-lg font-semibold text-green-800">
                  {data.suggested_user.name?.[0] || '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground">{data.suggested_user.name}</p>
                  <p className="text-sm text-muted-foreground">{data.suggested_user.email}</p>
                </div>
                {data.score != null && <Badge variant="success" className="text-sm">Score : {data.score}</Badge>}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function OptimizePanel() {
  const [projectId, setProjectId] = useState('');
  const [run, setRun] = useState(false);

  const { data: projects } = useQuery({
    queryKey: ['projects-for-ai'],
    queryFn: () => api.get('/projects?per_page=100').then((r) => r.data.data),
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['ai-optimize', projectId],
    queryFn: () => api.get(`/ai/optimize-assignments/${projectId}`).then((r) => r.data),
    enabled: run && !!projectId,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap className="h-5 w-5 text-purple-500" /> Optimisation des assignations
        </CardTitle>
        <CardDescription>Optimise l'ensemble des assignations d'un projet</CardDescription>
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
            Optimiser
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">Erreur: {error.response?.data?.message || error.message}</p>}
        {data && (
          <div className="rounded-lg bg-accent/30 p-4 space-y-3">
            {data.assignments && Array.isArray(data.assignments) && data.assignments.length > 0 ? (
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-left text-xs font-medium text-muted-foreground">
                      <th className="px-4 py-2">Tâche</th>
                      <th className="px-4 py-2">Assignation suggérée</th>
                      <th className="px-4 py-2 text-right">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.assignments.map((a, i) => (
                      <tr key={i} className="hover:bg-muted/15">
                        <td className="px-4 py-3 font-medium">{a.task?.title || `Tâche #${a.task_id}`}</td>
                        <td className="px-4 py-3 text-primary">{a.suggested_user?.name || `Utilisateur #${a.user_id}`}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{a.score ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Aucune proposition d’assignation.</p>
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
    <div className="overflow-hidden rounded-2xl border border-indigo-200/50 bg-gradient-to-br from-slate-50 via-white to-indigo-50/50 p-1 shadow-md">
      <div className="rounded-[14px] bg-white/95 p-5 sm:p-6">
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

function TaskRiskResultView({ data }) {
  const factors = Array.isArray(data.risk_factors) ? data.risk_factors : [];
  const recs = Array.isArray(data.recommendations) ? data.recommendations : [];

  return (
    <div className="space-y-4 rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50/60 via-white to-orange-50/30 p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-lg font-semibold text-foreground">{data.title}</h3>
        {data.risk_score != null && <RiskBadge score={data.risk_score} />}
        {data.risk_level && (
          <Badge variant={data.risk_level === 'high' ? 'destructive' : data.risk_level === 'medium' ? 'warning' : 'success'}>
            {data.risk_level === 'high' ? 'Risque élevé' : data.risk_level === 'medium' ? 'Risque moyen' : 'Risque faible'}
          </Badge>
        )}
      </div>

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
        <p className="rounded-lg border border-border bg-white/80 px-4 py-3 text-sm text-muted-foreground">
          Aucun facteur de risque identifié pour cette tâche.
        </p>
      )}

      {recs.length > 0 && (
        <div className="rounded-xl border border-amber-100 bg-white/90 px-4 py-3">
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
    <div className="space-y-5 rounded-2xl border border-orange-200/70 bg-gradient-to-br from-orange-50/50 via-white to-amber-50/20 p-5 shadow-sm">
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
                m.highlight ? 'border-amber-300 bg-amber-50/90' : 'border-border bg-white/90'
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
                    <td className="px-4 py-2.5 capitalize">{t.priority}</td>
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
        <p className="rounded-lg border border-border bg-white/80 px-4 py-3 text-sm text-muted-foreground">
          Aucune tâche à risque détectée sur ce projet.
        </p>
      )}
    </div>
  );
}

/**
 * Liste des projets → clic → liste des tâches du projet → sélection.
 */
function TaskPickerByProject({ taskId, onTaskChange }) {
  const [projectId, setProjectId] = useState('');

  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ['projects-for-ai-picker'],
    queryFn: () => api.get('/projects?per_page=200').then((r) => r.data.data || []),
  });

  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ['ai-picker-project-tasks', projectId],
    enabled: Boolean(projectId),
    queryFn: () =>
      api.get(`/projects/${projectId}/tasks?all=1`).then((r) => (
        r.data.tasks?.data ?? r.data.tasks ?? r.data.data ?? []
      )),
  });

  const handleProjectSelect = (id) => {
    setProjectId(id);
    onTaskChange('');
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <p className="mb-2 text-sm font-medium text-foreground">1. Choisir un projet</p>
        <div className="max-h-64 overflow-y-auto rounded-lg border border-border bg-card">
          {loadingProjects ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : projects.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Aucun projet accessible.</p>
          ) : (
            <ul className="divide-y divide-border">
              {projects.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => handleProjectSelect(p.id)}
                    className={cn(
                      'w-full px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent/80',
                      projectId === p.id && 'bg-primary/10 font-medium text-primary'
                    )}
                  >
                    <span className="block">{p.name}</span>
                    <span className="text-xs text-muted-foreground">{p.code}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium text-foreground">2. Choisir une tâche</p>
        <div className="max-h-64 overflow-y-auto rounded-lg border border-border bg-card">
          {!projectId ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Sélectionnez d’abord un projet.
            </p>
          ) : loadingTasks ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : tasks.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Aucune tâche dans ce projet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {tasks.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => onTaskChange(String(t.id))}
                    className={cn(
                      'w-full px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent/80',
                      String(taskId) === String(t.id) && 'bg-primary/10 font-medium text-primary'
                    )}
                  >
                    {t.title}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function RiskBadge({ score }) {
  const variant = score >= 60 ? 'destructive' : score >= 30 ? 'warning' : 'success';
  const label = score >= 60 ? 'Élevé' : score >= 30 ? 'Moyen' : 'Faible';
  return <Badge variant={variant}>{score}% — {label}</Badge>;
}
