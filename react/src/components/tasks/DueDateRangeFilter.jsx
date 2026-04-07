import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { cn } from '../../lib/utils';
import { getDueDatePresets } from '../../lib/dueDateRangePresets';

/**
 * @param {{ due_from: string, due_to: string }} value
 * @param {(next: { due_from: string, due_to: string }) => void} onChange
 * @param {boolean} [showResetDates]
 */
export function DueDateRangeFilter({ value, onChange, className, idPrefix = 'due-range', showResetDates = true }) {
  const applyPreset = (key) => {
    const p = getDueDatePresets()[key];
    onChange({ due_from: p.due_from, due_to: p.due_to });
  };

  const clearDates = () => onChange({ due_from: '', due_to: '' });

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">Date d&apos;échéance</p>
        {showResetDates && (value.due_from || value.due_to) && (
          <button
            type="button"
            onClick={clearDates}
            className="text-xs font-medium text-primary underline-offset-2 hover:underline"
          >
            Effacer les dates
          </button>
        )}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor={`${idPrefix}-from`} className="mb-1 block text-xs text-muted-foreground">
            Du
          </label>
          <Input
            id={`${idPrefix}-from`}
            type="date"
            value={value.due_from}
            onChange={(e) => onChange({ ...value, due_from: e.target.value })}
            title="Date début"
            placeholder="Date début"
            className="w-full min-w-0"
          />
        </div>
        <span
          className="hidden shrink-0 self-center pb-0 text-sm text-muted-foreground sm:inline sm:pb-6"
          aria-hidden
        >
          →
        </span>
        <div className="min-w-0 flex-1">
          <label htmlFor={`${idPrefix}-to`} className="mb-1 block text-xs text-muted-foreground">
            Au
          </label>
          <Input
            id={`${idPrefix}-to`}
            type="date"
            value={value.due_to}
            onChange={(e) => onChange({ ...value, due_to: e.target.value })}
            title="Date fin"
            placeholder="Date fin"
            className="w-full min-w-0"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 pt-0.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs font-normal"
          onClick={() => applyPreset('today')}
        >
          Aujourd&apos;hui
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs font-normal"
          onClick={() => applyPreset('thisWeek')}
        >
          Cette semaine
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs font-normal"
          onClick={() => applyPreset('thisMonth')}
        >
          Ce mois
        </Button>
      </div>
    </div>
  );
}
