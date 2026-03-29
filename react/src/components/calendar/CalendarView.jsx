import { useMemo } from 'react';
import { cn } from '../../lib/utils';

const WF_COLORS = {
  done: 'bg-emerald-500',
  in_progress: 'bg-amber-400',
  at_risk: 'bg-red-500',
  todo: 'bg-slate-400',
};

function startOfWeekMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function monthMatrix(year, monthIndex) {
  const first = new Date(year, monthIndex, 1);
  const start = startOfWeekMonday(first);
  const weeks = [];
  let cur = new Date(start);
  for (let w = 0; w < 6; w++) {
    const row = [];
    for (let d = 0; d < 7; d++) {
      row.push(new Date(cur));
      cur = addDays(cur, 1);
    }
    weeks.push(row);
  }
  return weeks;
}

function keyDay(d) {
  return d.toISOString().slice(0, 10);
}

export function CalendarView({ tasks = [], view, anchorDate, onSelectTask }) {
  const weekDays = useMemo(() => {
    const start = startOfWeekMonday(anchorDate);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [anchorDate]);

  const weeks = useMemo(() => {
    const y = anchorDate.getFullYear();
    const m = anchorDate.getMonth();
    return monthMatrix(y, m);
  }, [anchorDate]);

  const tasksByDay = useMemo(() => {
    const map = new Map();
    (tasks || []).forEach((t) => {
      const dates = [t.deadline, t.start_date, t.end_date].filter(Boolean);
      dates.forEach((ds) => {
        const k = ds.slice(0, 10);
        if (!map.has(k)) map.set(k, []);
        const arr = map.get(k);
        if (!arr.some((x) => x.id === t.id)) arr.push(t);
      });
    });
    return map;
  }, [tasks]);

  const todayKey = keyDay(new Date());

  if (view === 'week') {
    return (
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => {
          const k = keyDay(day);
          const list = tasksByDay.get(k) || [];
          const isToday = todayKey === k;
          return (
            <div
              key={k}
              className={cn(
                'min-h-[200px] rounded-lg border border-border bg-card p-2',
                isToday && 'ring-2 ring-primary/40'
              )}
            >
              <div className="mb-2 text-center text-xs font-semibold text-muted-foreground">
                <div>{day.toLocaleDateString('fr-FR', { weekday: 'short' })}</div>
                <div className="text-lg text-foreground">{day.getDate()}</div>
              </div>
              <div className="space-y-1">
                {list.map((t) => (
                  <button
                    key={`${t.id}-${k}`}
                    type="button"
                    onClick={() => onSelectTask?.(t)}
                    className={cn(
                      'w-full rounded px-2 py-1 text-left text-[11px] font-medium text-white shadow-sm',
                      WF_COLORS[t.workflow_status || t.status] || WF_COLORS.todo
                    )}
                  >
                    <span className="line-clamp-2">{t.title}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="grid grid-cols-7 gap-1 pb-2 text-center text-xs font-medium text-muted-foreground">
        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      {weeks.map((row, wi) => (
        <div key={wi} className="grid grid-cols-7 gap-1">
          {row.map((day) => {
            const k = keyDay(day);
            const inMonth = day.getMonth() === anchorDate.getMonth();
            const list = tasksByDay.get(k) || [];
            const isToday = k === todayKey;
            return (
              <div
                key={k}
                className={cn(
                  'min-h-[100px] rounded-md border border-border/80 p-1',
                  !inMonth && 'bg-muted/30 opacity-70',
                  isToday && 'ring-1 ring-primary/50'
                )}
              >
                <div className="text-right text-xs text-muted-foreground">{day.getDate()}</div>
                <div className="mt-1 space-y-0.5">
                  {list.slice(0, 4).map((t) => (
                    <button
                      key={`${t.id}-${k}`}
                      type="button"
                      onClick={() => onSelectTask?.(t)}
                      className={cn(
                        'block w-full truncate rounded px-1 py-0.5 text-left text-[10px] font-medium text-white',
                        WF_COLORS[t.workflow_status || t.status] || WF_COLORS.todo
                      )}
                    >
                      {t.title}
                    </button>
                  ))}
                  {list.length > 4 && (
                    <div className="text-[10px] text-muted-foreground">+{list.length - 4}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
