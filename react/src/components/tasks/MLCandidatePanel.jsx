import { useState } from 'react';
import { ChevronDown, ChevronRight, Brain, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function scoreColor(score) {
  if (score >= 75) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 50) return 'text-amber-600 dark:text-amber-400';
  return 'text-rose-500 dark:text-rose-400';
}

function barColor(score) {
  if (score >= 75) return 'bg-emerald-500';
  if (score >= 50) return 'bg-amber-500';
  return 'bg-rose-400';
}

function ScoreBar({ score, relative }) {
  return (
    <div className="mt-1 flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor(score)}`}
          style={{ width: `${relative ?? score}%` }}
        />
      </div>
      <span className={`w-9 text-right text-[11px] font-semibold tabular-nums ${scoreColor(score)}`}>
        {score}%
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Feature breakdown (expandable)
// ---------------------------------------------------------------------------

const FEATURE_GROUPS = {
  'Compétences': ['specialty_exact_match', 'specialty_partial_match', 'specialty_breadth'],
  'Charge / Dispo': ['current_task_load', 'capacity_utilization', 'overdue_ratio_inv'],
  'Performance': ['overall_completion_rate', 'on_time_rate', 'hours_accuracy'],
  'Affinité tâche': ['same_priority_success', 'same_type_success', 'complexity_affinity'],
  'Contexte projet': ['project_familiarity', 'team_familiarity', 'project_role_weight'],
  'Tendance récente': ['recent_velocity', 'performance_trend', 'recent_on_time_rate'],
  'Risque': ['at_risk_tasks_inv', 'experience_depth', 'collaboration_score', 'sprint_alignment'],
};

function FeatureBreakdown({ breakdown }) {
  if (!breakdown || Object.keys(breakdown).length === 0) return null;

  return (
    <div className="mt-2 space-y-2 px-3 pb-2">
      {Object.entries(FEATURE_GROUPS).map(([group, feats]) => {
        const relevant = feats.filter((f) => breakdown[f]);
        if (!relevant.length) return null;

        const groupAvg =
          relevant.reduce((sum, f) => sum + (breakdown[f]?.value ?? 0), 0) / relevant.length;
        const groupPct = Math.round(groupAvg * 100);

        return (
          <div key={group}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {group}
              </span>
              <span className={`text-[10px] font-semibold tabular-nums ${scoreColor(groupPct)}`}>
                {groupPct}%
              </span>
            </div>
            <div className="mt-0.5 space-y-0.5">
              {relevant.map((fname) => {
                const feat = breakdown[fname];
                const pct  = Math.round((feat?.value ?? 0) * 100);
                return (
                  <div key={fname} className="flex items-center gap-2">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted/60">
                      <div
                        className={`h-full rounded-full ${barColor(pct)}`}
                        style={{ width: `${pct}%`, opacity: 0.7 }}
                      />
                    </div>
                    <span className="w-32 truncate text-right text-[9px] text-muted-foreground">
                      {feat?.label ?? fname}
                    </span>
                    <span className={`w-7 text-right text-[9px] font-medium tabular-nums ${scoreColor(pct)}`}>
                      {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single candidate card
// ---------------------------------------------------------------------------

function CandidateCard({ candidate, rank, isSelected, onSelect }) {
  const [expanded, setExpanded] = useState(false);
  const hasBreakdown = candidate.feature_breakdown && Object.keys(candidate.feature_breakdown).length > 0;

  return (
    <div
      className={`border-b border-border last:border-0 transition-colors ${
        isSelected ? 'bg-primary/5' : 'hover:bg-accent/50'
      }`}
    >
      {/* Main row */}
      <button
        type="button"
        onClick={() => onSelect(candidate.id)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
      >
        {/* Rank badge */}
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold
            ${rank === 1 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
              : rank === 2 ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
              : 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'}`}
        >
          {rank}
        </span>

        {/* Avatar */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
          {candidate.name?.[0]?.toUpperCase() ?? '?'}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate text-sm font-medium text-foreground">{candidate.name}</p>
            {rank === 1 && (
              <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                Recommandé ML
              </span>
            )}
            {isSelected && (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />
            )}
          </div>
          <ScoreBar score={candidate.score} relative={candidate.relative_score} />

          {/* Strengths */}
          {candidate.strengths?.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {candidate.strengths.map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                >
                  + {s}
                </span>
              ))}
            </div>
          )}

          {/* Weaknesses */}
          {candidate.weaknesses?.length > 0 && (
            <div className="mt-0.5 flex flex-wrap gap-1">
              {candidate.weaknesses.map((w) => (
                <span
                  key={w}
                  className="rounded-full bg-rose-50 px-1.5 py-0.5 text-[9px] font-medium text-rose-600 dark:bg-rose-900/30 dark:text-rose-400"
                >
                  – {w}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Expand toggle */}
        {hasBreakdown && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
            className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
            title="Détail des features ML"
          >
            {expanded
              ? <ChevronDown className="h-3.5 w-3.5" />
              : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        )}
      </button>

      {/* Feature breakdown (expandable) */}
      {expanded && hasBreakdown && (
        <FeatureBreakdown breakdown={candidate.feature_breakdown} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Model info badge
// ---------------------------------------------------------------------------

function ModelBadge({ info }) {
  if (!info) return null;
  const isTrained = info.is_trained;
  return (
    <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold
      ${isTrained
        ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'
        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
      }`}
    >
      <Brain className="h-3 w-3" />
      {isTrained
        ? `Modèle entraîné · ${info.n_samples ?? '?'} samples${info.accuracy ? ` · acc ${(info.accuracy * 100).toFixed(0)}%` : ''}`
        : 'Poids par défaut (modèle non entraîné)'}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main exported component
// ---------------------------------------------------------------------------

export function MLCandidatePanel({ result, selectedId, onSelect }) {
  const candidates = result?.candidates ?? result?.top_users ?? [];
  const modelInfo  = result?.model_info;
  const hasResults = candidates.length > 0;

  if (!hasResults) {
    return (
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-4 text-sm text-muted-foreground">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
          <div>
            <p className="font-medium text-foreground">Aucun membre disponible</p>
            <p className="text-xs">{result?.message ?? 'Aucun membre compatible trouvé.'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-3 py-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <TrendingUp className="h-3.5 w-3.5 text-violet-500" />
          Recommandations ML ({candidates.length} candidats)
        </p>
        <ModelBadge info={modelInfo} />
      </div>

      {/* Candidates */}
      <div className="divide-y divide-border">
        {candidates.map((c, idx) => (
          <CandidateCard
            key={c.id ?? c.user_id}
            candidate={{ ...c, id: c.id ?? c.user_id }}
            rank={idx + 1}
            isSelected={String(selectedId) === String(c.id ?? c.user_id)}
            onSelect={onSelect}
          />
        ))}
      </div>

      {/* Footer hint */}
      <div className="border-t border-border bg-muted/20 px-3 py-1.5">
        <p className="text-[10px] text-muted-foreground">
          Cliquez sur un candidat pour le sélectionner · Flèche pour voir les 22 features ML
        </p>
      </div>
    </div>
  );
}
