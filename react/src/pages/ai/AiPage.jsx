import { useState, useEffect, useMemo, useRef } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
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
  MessageSquare, Send, Bot, User as UserIcon, Zap, CheckCircle2,
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

function ChatMessage({ content }) {
  // Parse simple markdown: **bold**, bullet lists (- or *), numbered lists, line breaks
  const lines = content.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    if (!line) { i++; continue; }

    // Bullet list item
    if (/^[-*•]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*•]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*•]\s+/, ''));
        i++;
      }
      elements.push(
        <ul key={i} className="mt-1 space-y-0.5 pl-3">
          {items.map((item, j) => (
            <li key={j} className="flex gap-1.5 text-sm">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered list
    if (/^\d+\.\s+/.test(line)) {
      const items = [];
      let num = 1;
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i++; num++;
      }
      elements.push(
        <ol key={i} className="mt-1 space-y-0.5 pl-3">
          {items.map((item, j) => (
            <li key={j} className="flex gap-1.5 text-sm">
              <span className="shrink-0 font-semibold text-violet-500">{j + 1}.</span>
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={i} className="text-sm leading-relaxed">{renderInline(line)}</p>
    );
    i++;
  }

  return <div className="flex flex-col gap-1">{elements}</div>;
}

function renderInline(text) {
  // Split by **bold**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function AiPoweredBadge({ powered }) {
  if (!powered) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-violet-500/10 to-indigo-500/10 px-2 py-0.5 text-[11px] font-semibold text-violet-700 ring-1 ring-violet-200 dark:text-violet-300 dark:ring-violet-800">
      <Zap className="h-3 w-3" /> IA réelle
    </span>
  );
}

export default function AiPage() {
  const { user } = useAuth();
  const isInvite = isGuestViewer(user);
  const isAdmin = user?.roles?.includes('admin');
  const isMember = !isAdmin && !isInvite;

  const [chatOpen, setChatOpen] = useState(false);

  const tabDefs = useMemo(
    () => {
      // Chat tab is NOT shown to admins — it's a floating icon for members only
      const all = [
        { key: 'estimate', label: 'Estimation', icon: Clock },
        { key: 'risk-task', label: 'Risque tâche', icon: AlertTriangle },
        { key: 'risk-project', label: 'Risque projet', icon: TrendingUp },
        { key: 'recommendations', label: 'Synthèse', icon: Lightbulb },
        { key: 'balance', label: 'Charge', icon: Scale },
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
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">Intelligence Artificielle</h1>
            <span className="rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 px-2.5 py-0.5 text-xs font-semibold text-white shadow-sm">
              Propulsé par LLM
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Analyses intelligentes, estimations contextuelles et assistant conversationnel alimentés par un modèle de langage réel.
          </p>
        </div>
      </div>

      {/* Feature cards */}
      <div className={cn('grid gap-3', isInvite ? 'sm:grid-cols-2' : 'sm:grid-cols-3')}>
        <div className="rounded-xl border border-indigo-200/60 bg-gradient-to-br from-indigo-50/80 to-white p-4 shadow-sm dark:border-indigo-900/40 dark:from-indigo-950/30 dark:to-transparent">
          <div className="mb-2 flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <Target className="h-4 w-4" />
            <span className="text-sm font-semibold">Estimation intelligente</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Durée estimée par heuristiques + justification générée par IA à partir de la complexité et du contexte.
          </p>
        </div>
        <div className="rounded-xl border border-amber-200/60 bg-gradient-to-br from-amber-50/80 to-white p-4 shadow-sm dark:border-amber-900/40 dark:from-amber-950/30 dark:to-transparent">
          <div className="mb-2 flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-semibold">Détection de risques</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Score de risque multi-facteurs enrichi par des insights et recommandations générés par LLM.
          </p>
        </div>
        {isMember && (
          <div className="rounded-xl border border-violet-200/60 bg-gradient-to-br from-violet-50/80 to-white p-4 shadow-sm dark:border-violet-900/40 dark:from-violet-950/30 dark:to-transparent">
            <div className="mb-2 flex items-center gap-2 text-violet-600 dark:text-violet-400">
              <span className="text-lg">🤖</span>
              <span className="text-sm font-semibold">Assistant IA personnel</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Votre assistant personnel flottant — posez toutes vos questions en bas à droite.
            </p>
          </div>
        )}
      </div>

      {/* Tabs */}
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
            {t.key === 'chat' && (
              <span className="ml-1 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-700 dark:bg-violet-900/50 dark:text-violet-300">
                NEW
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'estimate' && <EstimatePanel />}
      {tab === 'risk-task' && <TaskRiskPanel />}
      {tab === 'risk-project' && !isInvite && <ProjectRiskPanel />}
      {tab === 'recommendations' && !isInvite && <RecommendationsPanel />}
      {tab === 'balance' && !isInvite && <WorkloadBalancePanel />}

      {/* Floating animated assistant — members only */}
      {isMember && (
        <>
          <FloatingAssistantButton onClick={() => setChatOpen(true)} />
          {chatOpen && (
            <ChatModal onClose={() => setChatOpen(false)} />
          )}
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  ESTIMATE PANEL                                                              */
/* ─────────────────────────────────────────────────────────────────────────── */
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
        <CardDescription>
          Estimation basée sur les story points, la priorité et l'historique — justifiée par l'IA
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <TaskPickerByProject
          taskId={taskId}
          onTaskChange={(id) => { setTaskId(id); setRun(false); }}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => setRun(true)} disabled={!taskId || isLoading}>
            {isLoading ? <Spinner className="mr-2" /> : <Brain className="mr-2 h-4 w-4" />}
            Estimer
          </Button>
          {taskId && (
            <span className="text-sm text-muted-foreground">
              Tâche : <span className="font-medium text-foreground">#{taskId}</span>
            </span>
          )}
        </div>
        {error && <ErrorMessage error={error} />}
        {data && <EstimateResultView data={data} />}
      </CardContent>
    </Card>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  TASK RISK PANEL                                                             */
/* ─────────────────────────────────────────────────────────────────────────── */
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
          <AlertTriangle className="h-5 w-5 text-amber-500" /> Analyse de risque — Tâche
        </CardTitle>
        <CardDescription>Détection multi-facteurs enrichie par des recommandations IA</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <TaskPickerByProject
          taskId={taskId}
          onTaskChange={(id) => { setTaskId(id); setRun(false); }}
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
        {error && <ErrorMessage error={error} />}
        {data && <TaskRiskResultView data={data} />}
      </CardContent>
    </Card>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  PROJECT RISK PANEL                                                          */
/* ─────────────────────────────────────────────────────────────────────────── */
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
          <TrendingUp className="h-5 w-5 text-orange-500" /> Analyse de risque — Projet
        </CardTitle>
        <CardDescription>Vue globale du risque de retard sur toutes les tâches actives</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Projet</label>
            <Select value={projectId} onChange={(e) => { setProjectId(e.target.value); setRun(false); }} className="w-64">
              <option value="">Choisir un projet</option>
              {projects?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </div>
          <Button onClick={() => setRun(true)} disabled={!projectId || isLoading}>
            {isLoading ? <Spinner className="mr-2" /> : <Brain className="mr-2 h-4 w-4" />}
            Analyser
          </Button>
        </div>
        {error && <ErrorMessage error={error} />}
        {data && <ProjectRiskResultView data={data} />}
      </CardContent>
    </Card>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  RECOMMENDATIONS PANEL                                                       */
/* ─────────────────────────────────────────────────────────────────────────── */
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
          <Lightbulb className="h-5 w-5 text-amber-500" /> Synthèse et recommandations
        </CardTitle>
        <CardDescription>
          Analyse de l'état du projet avec synthèse narrative et actions prioritaires générées par IA
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Projet</label>
            <Select value={projectId} onChange={(e) => { setProjectId(e.target.value); setRun(false); }} className="w-64">
              <option value="">Choisir un projet</option>
              {projects?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </div>
          <Button onClick={() => setRun(true)} disabled={!projectId || isLoading}>
            {isLoading ? <Spinner className="mr-2" /> : <Brain className="mr-2 h-4 w-4" />}
            Générer
          </Button>
        </div>
        {error && <ErrorMessage error={error} />}
        {data && (
          <div className="space-y-4">
            {/* Metrics */}
            {sum && (
              <div className="grid gap-3 sm:grid-cols-3">
                <MetricCard label="Tâches actives" value={sum.active_tasks} />
                <MetricCard label="En retard" value={sum.overdue_tasks} variant="warning" />
                <MetricCard label="Focus priorité" value={PRIORITY_LABEL_FR[sum.suggested_priority_focus] || sum.suggested_priority_focus} small />
              </div>
            )}

            {/* AI Synthesis */}
            {data.ai_synthesis && (
              <div className="rounded-xl border border-violet-200/70 bg-gradient-to-br from-violet-50/60 to-white p-4 dark:border-violet-900/40 dark:from-violet-950/20 dark:to-transparent">
                <div className="mb-2 flex items-center gap-2">
                  <Bot className="h-4 w-4 text-violet-600" />
                  <span className="text-sm font-semibold text-violet-900 dark:text-violet-300">Synthèse IA</span>
                  <AiPoweredBadge powered={data.ai_powered} />
                </div>
                <p className="text-sm leading-relaxed text-foreground">{data.ai_synthesis}</p>
              </div>
            )}

            {/* AI Actions */}
            {Array.isArray(data.ai_actions) && data.ai_actions.length > 0 && (
              <div className="rounded-xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50/50 to-white p-4 dark:border-emerald-900/40 dark:from-emerald-950/20 dark:to-transparent">
                <div className="mb-3 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-semibold text-emerald-900 dark:text-emerald-300">Actions prioritaires recommandées</span>
                </div>
                <ol className="space-y-2">
                  {data.ai_actions.map((action, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                        {i + 1}
                      </span>
                      <span className="text-foreground">{action}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Deadline */}
            {data.deadline_suggestion && (
              <div className="rounded-xl border border-sky-200/70 bg-gradient-to-br from-sky-50/60 to-white px-4 py-3 dark:border-sky-900/40 dark:from-sky-950/20 dark:to-transparent">
                <p className="text-xs font-semibold uppercase tracking-wide text-sky-800 dark:text-sky-300">Échéance indicative</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-foreground">{data.deadline_suggestion}</p>
                {data.deadline_suggestion_label && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{data.deadline_suggestion_label}</p>
                )}
              </div>
            )}

            {/* Redistribution */}
            {data.redistribution_suggestion && (
              <div className="overflow-hidden rounded-xl border border-violet-200/60 bg-violet-50/30 dark:border-violet-900 dark:bg-violet-950/20">
                <div className="border-b border-violet-200/60 px-4 py-2.5 text-sm font-semibold dark:border-violet-800">
                  Répartition — {data.redistribution_suggestion.tasks_overdue_count} tâche(s) en retard
                </div>
                <p className="px-4 py-2 text-sm text-muted-foreground">{data.redistribution_suggestion.reason}</p>
                {Array.isArray(data.redistribution_suggestion.target_users_low_workload) && (
                  <div className="overflow-x-auto px-2 pb-3">
                    <table className="w-full min-w-[360px] text-sm">
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

            {!data.ai_synthesis && !data.deadline_suggestion && !data.redistribution_suggestion && (
              <p className="text-sm text-muted-foreground">Aucune alerte pour ce projet.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  WORKLOAD BALANCE PANEL                                                      */
/* ─────────────────────────────────────────────────────────────────────────── */
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
          <Scale className="h-5 w-5 text-violet-500" /> Équilibre de charge
        </CardTitle>
        <CardDescription>
          Métriques de charge par membre avec conseils de rééquilibrage générés par IA
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Projet</label>
            <Select value={projectId} onChange={(e) => { setProjectId(e.target.value); setRun(false); }} className="w-64">
              <option value="">Choisir un projet</option>
              {projects?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </div>
          <Button onClick={() => setRun(true)} disabled={!projectId || isLoading}>
            {isLoading ? <Spinner className="mr-2" /> : <BarChart3 className="mr-2 h-4 w-4" />}
            Analyser
          </Button>
        </div>
        {error && <ErrorMessage error={error} />}
        {data && (
          <div className="space-y-4">
            {metrics && (
              <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Charge moyenne : </span>
                  <strong className="tabular-nums">{metrics.average_workload_score}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Dispersion : </span>
                  <strong className="tabular-nums">{metrics.spread}</strong>
                </div>
                {metrics.imbalanced && <Badge variant="warning">Équipe déséquilibrée</Badge>}
                <AiPoweredBadge powered={data.ai_powered} />
              </div>
            )}
            {Array.isArray(data.members) && data.members.length > 0 ? (
              <div className="overflow-hidden rounded-xl border border-border shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-left text-xs font-medium text-muted-foreground">
                      <th className="px-4 py-2.5">Membre</th>
                      <th className="px-4 py-2.5 text-right">Score</th>
                      <th className="px-4 py-2.5 text-right">Heures ouvertes</th>
                      <th className="px-4 py-2.5 text-right">Actives</th>
                      <th className="px-4 py-2.5 text-right">Retard</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.members.map((m) => (
                      <tr key={m.user_id} className="hover:bg-muted/15">
                        <td className="px-4 py-3">
                          <span className="font-medium">{m.name}</span>
                          <span className="ml-2 block text-xs text-muted-foreground">{m.email}</span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold">{m.workload_score}</td>
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
              <div className="rounded-xl border border-violet-200/60 bg-violet-50/30 p-4 dark:border-violet-900 dark:bg-violet-950/20">
                <div className="mb-2.5 flex items-center gap-2">
                  <Bot className="h-4 w-4 text-violet-600" />
                  <span className="text-sm font-semibold">Conseils IA</span>
                </div>
                <ul className="space-y-2">
                  {hints.map((h, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="mt-0.5 text-violet-500">›</span>
                      <span className="text-muted-foreground">{h}</span>
                    </li>
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

/* ─────────────────────────────────────────────────────────────────────────── */
/*  FLOATING ASSISTANT BUTTON — Members only                                   */
/* ─────────────────────────────────────────────────────────────────────────── */
function FloatingAssistantButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Ouvrir l'assistant IA"
      style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 50 }}
      className="group flex h-16 w-16 items-center justify-center rounded-full shadow-2xl outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
    >
      {/* Pulse ring */}
      <span
        className="absolute h-16 w-16 rounded-full bg-violet-400 opacity-30"
        style={{ animation: 'ping 2s cubic-bezier(0,0,0.2,1) infinite' }}
      />
      {/* Glow ring */}
      <span className="absolute h-16 w-16 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 opacity-80 blur-sm" />
      {/* Button face */}
      <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg transition-transform duration-200 group-hover:scale-110 group-active:scale-95">
        {/* Cartoon robot face */}
        <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-9 w-9">
          {/* Antenna */}
          <line x1="20" y1="3" x2="20" y2="9" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="20" cy="2.5" r="2" fill="#fbbf24"/>
          {/* Head */}
          <rect x="8" y="9" width="24" height="20" rx="5" fill="white" fillOpacity="0.95"/>
          {/* Eyes */}
          <rect x="12" y="14" width="6" height="5" rx="2" fill="#6d28d9"/>
          <rect x="22" y="14" width="6" height="5" rx="2" fill="#6d28d9"/>
          {/* Eye shine */}
          <circle cx="14" cy="15.5" r="1" fill="white"/>
          <circle cx="24" cy="15.5" r="1" fill="white"/>
          {/* Smile */}
          <path d="M14 23 Q20 27 26 23" stroke="#6d28d9" strokeWidth="2" strokeLinecap="round" fill="none"/>
          {/* Cheeks */}
          <circle cx="11" cy="22" r="2.5" fill="#f9a8d4" fillOpacity="0.6"/>
          <circle cx="29" cy="22" r="2.5" fill="#f9a8d4" fillOpacity="0.6"/>
          {/* Neck */}
          <rect x="17" y="29" width="6" height="3" rx="1" fill="white" fillOpacity="0.7"/>
          {/* Body */}
          <rect x="11" y="32" width="18" height="6" rx="3" fill="white" fillOpacity="0.5"/>
        </svg>
      </span>
      {/* Tooltip */}
      <span className="absolute right-[4.5rem] top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
        Assistant IA
      </span>
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  CHAT MODAL — Floating panel for members                                    */
/* ─────────────────────────────────────────────────────────────────────────── */
function ChatModal({ onClose }) {
  return (
    <div
      style={{ position: 'fixed', bottom: '6.5rem', right: '2rem', zIndex: 50 }}
      className="flex w-[370px] flex-col overflow-hidden rounded-2xl border border-violet-200/60 bg-white shadow-2xl dark:border-violet-900/40 dark:bg-slate-900"
    >
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-violet-100 bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 dark:border-violet-900">
        {/* Mini robot */}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20">
          <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-6 w-6">
            <circle cx="20" cy="2.5" r="2" fill="#fbbf24"/>
            <line x1="20" y1="4" x2="20" y2="8" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            <rect x="8" y="8" width="24" height="18" rx="5" fill="white" fillOpacity="0.9"/>
            <rect x="12" y="13" width="5" height="4" rx="1.5" fill="#6d28d9"/>
            <rect x="23" y="13" width="5" height="4" rx="1.5" fill="#6d28d9"/>
            <circle cx="13.5" cy="14" r="0.8" fill="white"/>
            <circle cx="24.5" cy="14" r="0.8" fill="white"/>
            <path d="M14 21 Q20 25 26 21" stroke="#6d28d9" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
            <circle cx="11" cy="20" r="2" fill="#f9a8d4" fillOpacity="0.5"/>
            <circle cx="29" cy="20" r="2" fill="#f9a8d4" fillOpacity="0.5"/>
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-white">Assistant IA</p>
          <p className="text-[11px] text-violet-200">En ligne · Propulsé par LLM</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
          aria-label="Fermer"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/>
          </svg>
        </button>
      </div>
      {/* Chat body */}
      <ChatPanel compact />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  CHAT PANEL — Assistant conversationnel IA                                  */
/* ─────────────────────────────────────────────────────────────────────────── */
function ChatPanel({ compact = false }) {
  const [projectId, setProjectId] = useState('');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Bonjour ! Je suis votre assistant IA de gestion de projet. Posez-moi toutes vos questions : état du projet, risques, priorisation, organisation d\'équipe…',
    },
  ]);
  const bottomRef = useRef(null);

  const { data: projects } = useQuery({
    queryKey: ['projects-for-ai'],
    queryFn: () => api.get('/projects?per_page=100').then((r) => r.data.data),
  });

  const { mutate: sendMessage, isPending } = useMutation({
    mutationFn: (payload) => api.post('/ai/chat', payload).then((r) => r.data),
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.response, ai_powered: data.ai_powered },
      ]);
    },
    onError: (err) => {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Erreur : ${err.response?.data?.message || err.message}`, error: true },
      ]);
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isPending]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isPending) return;
    setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
    setInput('');
    sendMessage({ message: trimmed, project_id: projectId || null });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const SUGGESTIONS = [
    'Quelles tâches sont les plus à risque ?',
    'Comment équilibrer la charge de l\'équipe ?',
    'Quelle est la priorité recommandée ?',
    'Y a-t-il des blocages détectés ?',
  ];

  const inner = (
    <div className={cn('flex flex-col gap-3', compact ? 'p-3' : 'p-0')}>
      {/* Project selector */}
      {!compact && (
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Contexte projet (optionnel)
            </label>
            <Select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="w-64">
              <option value="">Sans contexte de projet</option>
              {projects?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </div>
          {projectId && (
            <Badge variant="outline" className="mt-4 text-xs">
              Contexte : {projects?.find((p) => String(p.id) === projectId)?.name}
            </Badge>
          )}
        </div>
      )}

      {compact && (
        <Select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="w-full text-xs">
          <option value="">Sans contexte projet</option>
          {projects?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
      )}

      {/* Messages */}
      <div className={cn(
        'flex flex-col gap-3 overflow-y-auto rounded-xl border border-border bg-muted/10',
        compact ? 'max-h-[260px] min-h-[160px] p-3' : 'max-h-[420px] min-h-[280px] p-4',
      )}>
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                'flex gap-3',
                msg.role === 'user' ? 'flex-row-reverse' : 'flex-row',
              )}
            >
              {/* Avatar */}
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold shadow-sm',
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : msg.error
                      ? 'bg-destructive/10 text-destructive'
                      : 'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300',
                )}
              >
                {msg.role === 'user' ? <UserIcon className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>
              {/* Bubble */}
              <div
                className={cn(
                  'max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm',
                  msg.role === 'user'
                    ? 'rounded-tr-sm bg-primary text-primary-foreground'
                    : msg.error
                      ? 'rounded-tl-sm bg-destructive/10 text-destructive'
                      : 'rounded-tl-sm bg-card text-foreground ring-1 ring-border',
                )}
              >
                {msg.role === 'assistant' && !msg.error
                  ? <ChatMessage content={msg.content} />
                  : <p className="text-sm leading-relaxed">{msg.content}</p>
                }
                {msg.ai_powered && (
                  <div className="mt-1.5 flex items-center gap-1 text-[10px] text-violet-500 dark:text-violet-400">
                    <Zap className="h-2.5 w-2.5" /> IA
                  </div>
                )}
              </div>
            </div>
          ))}
          {isPending && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300">
                <Bot className="h-4 w-4" />
              </div>
              <div className="rounded-2xl rounded-tl-sm bg-card px-4 py-3 ring-1 ring-border">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400 [animation-delay:0ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400 [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400 [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggestions rapides */}
        {messages.length <= 1 && (
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => { setInput(s); }}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Posez votre question… (Entrée pour envoyer)"
            rows={compact ? 1 : 2}
            className="flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isPending}
            className={cn('shrink-0 rounded-xl', compact ? 'h-10 w-10' : 'h-[52px] w-12')}
          >
            {isPending ? <Spinner /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        {!compact && (
          <p className="text-center text-[11px] text-muted-foreground">
            Maj+Entrée pour un saut de ligne · L'IA peut faire des erreurs
          </p>
        )}
      </div>
  );

  if (compact) return inner;

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="h-5 w-5 text-violet-500" />
          Assistant IA
          <AiPoweredBadge powered />
        </CardTitle>
        <CardDescription>
          Posez vos questions en langage naturel — l'IA analyse le contexte de votre projet en temps réel
        </CardDescription>
      </CardHeader>
      <CardContent>{inner}</CardContent>
    </Card>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  RESULT VIEWS                                                                */
/* ─────────────────────────────────────────────────────────────────────────── */
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
              <span className="text-xs font-semibold uppercase tracking-wide">Résultat d'estimation</span>
              <AiPoweredBadge powered={data.ai_powered} />
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
          <div className="rounded-xl border border-emerald-200/90 bg-gradient-to-b from-emerald-50 to-white px-4 py-4 text-center shadow-sm dark:border-emerald-900/40 dark:from-emerald-950/20 dark:to-transparent">
            <p className="text-xs font-medium text-emerald-800 dark:text-emerald-400">Charge estimée</p>
            <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-emerald-950 dark:text-emerald-200">
              {hours != null ? `${Number(hours).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} h` : '—'}
            </p>
          </div>
          <div className="rounded-xl border border-sky-200/90 bg-gradient-to-b from-sky-50 to-white px-4 py-4 text-center shadow-sm dark:border-sky-900/40 dark:from-sky-950/20 dark:to-transparent">
            <p className="text-xs font-medium text-sky-800 dark:text-sky-400">Durée calendaire</p>
            <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-sky-950 dark:text-sky-200">
              {days != null ? `${Number(days).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} j` : '—'}
            </p>
            {mins != null && (
              <p className="mt-1 text-[11px] text-sky-700 dark:text-sky-500">{mins} min</p>
            )}
          </div>
          <div className="rounded-xl border border-violet-200/90 bg-gradient-to-b from-violet-50 to-white px-4 py-4 text-center shadow-sm dark:border-violet-900/40 dark:from-violet-950/20 dark:to-transparent">
            <p className="text-xs font-medium text-violet-800 dark:text-violet-400">Confiance</p>
            <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-violet-950 dark:text-violet-200">{confidencePct} %</p>
            <div className="mx-auto mt-2 h-2 max-w-[9rem] overflow-hidden rounded-full bg-violet-200 dark:bg-violet-900/50">
              <div
                className="h-full rounded-full bg-violet-500 transition-all"
                style={{ width: `${Math.min(100, confidencePct)}%` }}
              />
            </div>
          </div>
        </div>

        {/* AI Justification */}
        {data.ai_justification && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-violet-200/60 bg-violet-50/40 px-4 py-3 dark:border-violet-900/40 dark:bg-violet-950/20">
            <Bot className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
            <p className="text-sm text-foreground">{data.ai_justification}</p>
          </div>
        )}

        <div className="mb-6 overflow-hidden rounded-xl border border-border shadow-sm">
          <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-2.5">
            <Table2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Détails du calcul</span>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-border">
              <tr>
                <td className="w-[42%] px-4 py-2.5 text-muted-foreground">Méthode</td>
                <td className="px-4 py-2.5 font-medium">{estimationMethodLabel(data.method)}</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 text-muted-foreground">Taille de l'échantillon</td>
                <td className="px-4 py-2.5 font-medium tabular-nums">{data.sample_size != null ? data.sample_size : '—'}</td>
              </tr>
              {data.average_completion_time_days != null && (
                <tr>
                  <td className="px-4 py-2.5 text-muted-foreground">Temps moyen historique</td>
                  <td className="px-4 py-2.5 font-medium tabular-nums">
                    {`${Number(data.average_completion_time_days).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} j`}
                  </td>
                </tr>
              )}
              {data.comparable_range && (
                <tr>
                  <td className="px-4 py-2.5 text-muted-foreground">Fourchette (heures réelles)</td>
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
                    <th className="px-4 py-2 text-right">Jours</th>
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
    <div className="space-y-4 rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50/60 via-white to-orange-50/30 p-5 shadow-sm dark:border-amber-900/50 dark:from-slate-900 dark:via-slate-900 dark:to-amber-950/20">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-lg font-semibold text-foreground">{data.title}</h3>
        {data.risk_score != null && <RiskBadge score={data.risk_score} />}
        {delayPct != null && (
          <Badge variant="outline" className="tabular-nums">
            Retard probable : {delayPct}%
          </Badge>
        )}
        {health && (
          <Badge variant={health === 'critical' ? 'destructive' : health === 'watch' ? 'warning' : 'success'}>
            {SCHEDULE_HEALTH_LABEL[health] || health}
          </Badge>
        )}
        <AiPoweredBadge powered={data.ai_powered} />
      </div>

      {insights.length > 0 && (
        <div className="rounded-xl border border-amber-100 bg-white/80 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-950/20">
          <div className="mb-2 flex items-center gap-2">
            <Bot className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-semibold">Analyse</span>
          </div>
          <ul className="space-y-1.5">
            {insights.map((line, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 text-amber-500">›</span>
                <span className="text-muted-foreground">{line}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {factors.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-border shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2.5">Facteur</th>
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
                    <Badge variant="outline" className="font-normal">{impactLabel(f.impact)}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Aucun facteur de risque identifié.
        </p>
      )}

      {recs.length > 0 && (
        <div className="rounded-xl border border-amber-100 bg-card px-4 py-3 dark:border-amber-900/40 dark:bg-amber-950/20">
          <div className="mb-2 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-semibold">Recommandations</span>
          </div>
          <ul className="space-y-1.5">
            {recs.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 text-amber-500">›</span>
                <span className="text-muted-foreground">{r}</span>
              </li>
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
                  : 'border-border bg-card dark:bg-slate-900/60',
              )}
            >
              <p className="text-xs font-medium text-muted-foreground">{m.label}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{m.value}</p>
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
                    <td className="px-4 py-2.5">{PRIORITY_LABEL_FR[t.priority] || t.priority || '—'}</td>
                    <td className="px-4 py-2.5 tabular-nums text-muted-foreground">{t.due_date || '—'}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{t.progress ?? t.progress_percent ?? '—'}%</td>
                    <td className="px-4 py-2.5 text-right"><RiskBadge score={t.risk_score} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Aucune tâche à risque détectée.
        </p>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  SHARED COMPONENTS                                                           */
/* ─────────────────────────────────────────────────────────────────────────── */
function MetricCard({ label, value, variant, small }) {
  return (
    <div
      className={cn(
        'rounded-lg border px-4 py-3 text-center',
        variant === 'warning'
          ? 'border-amber-200 bg-amber-50/80 dark:border-amber-900 dark:bg-amber-950/30'
          : 'border-border bg-muted/30',
      )}
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={cn('mt-1 font-bold tabular-nums', small ? 'text-sm capitalize' : 'text-2xl')}>{value}</p>
    </div>
  );
}

function ErrorMessage({ error }) {
  return (
    <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
      Erreur : {error.response?.data?.message || error.message}
    </p>
  );
}

/** Sélecteur deux étapes : projet → tâche */
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
        if (list.length > 0) return list;
      } catch {
        // fallback
      }

      const fallback = await api.get(`/tasks?all=1&project_id=${selectedProjectId}`);
      return normalizeList(fallback.data?.tasks?.data ?? fallback.data?.tasks ?? fallback.data?.data ?? []);
    },
  });

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">1. Choisir un projet</label>
        <Select
          value={projectId}
          onChange={(e) => { setProjectId(e.target.value); onTaskChange(''); }}
          disabled={loadingProjects}
          className="w-full"
        >
          <option value="">{loadingProjects ? 'Chargement…' : 'Choisir un projet'}</option>
          {projects.map((p) => (
            <option key={p.id} value={String(p.id)}>
              {p.name}{p.code ? ` (${p.code})` : ''}
            </option>
          ))}
        </Select>
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
              ? 'Sélectionnez un projet d\'abord'
              : loadingTasks
                ? 'Chargement…'
                : tasks.length === 0
                  ? 'Aucune tâche'
                  : 'Choisir une tâche'}
          </option>
          {tasks.map((t) => (
            <option key={t.id} value={String(t.id)}>
              #{t.id} — {t.title}
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
