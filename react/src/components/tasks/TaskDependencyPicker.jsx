import { useMemo, useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Multi-sélection de tâches prédécesseurs (Gantt / blocage).
 * @param {Array<{id:number,title:string}>} tasks
 * @param {number[]} value — IDs des tâches dont dépend la tâche courante
 * @param {number|null|undefined} excludeTaskId — tâche en cours d’édition
 */
export function TaskDependencyPicker({
  tasks = [],
  value = [],
  onChange,
  disabled,
  placeholder = 'Rechercher une tâche…',
  excludeTaskId = null,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const selected = useMemo(() => {
    return value
      .map((id) => tasks.find((t) => Number(t.id) === Number(id)))
      .filter(Boolean);
  }, [value, tasks]);

  const suggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    const taken = new Set(value.map((id) => Number(id)));
    return tasks
      .filter((t) => {
        if (excludeTaskId != null && Number(t.id) === Number(excludeTaskId)) return false;
        if (taken.has(Number(t.id))) return false;
        if (!q) return true;
        return (t.title || '').toLowerCase().includes(q);
      })
      .slice(0, 30);
  }, [tasks, value, search, excludeTaskId]);

  return (
    <div className="space-y-2" ref={wrapRef}>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((t) => (
            <span
              key={t.id}
              className="inline-flex max-w-full items-center gap-1 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs"
            >
              <span className="truncate font-medium text-foreground" title={t.title}>
                {t.title}
              </span>
              {!disabled && (
                <button
                  type="button"
                  className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive"
                  onClick={() => onChange(value.filter((id) => Number(id) !== Number(t.id)))}
                  aria-label="Retirer la dépendance"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {!disabled && (
        <div
          className={cn(
            'relative',
            open && (suggestions.length > 0 || search.trim()) && 'z-[100]',
          )}
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            autoComplete="off"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className="flex h-10 w-full rounded-md border border-input bg-card py-2 pl-9 pr-3 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {open && suggestions.length > 0 && (
            <ul className="absolute left-0 right-0 top-full z-[110] mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-border bg-card py-1 text-foreground shadow-lg">
              {suggestions.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                    onClick={() => {
                      onChange([...value, t.id]);
                      setSearch('');
                      setOpen(false);
                    }}
                  >
                    <span className="font-medium text-foreground">{t.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {open && search.trim() && suggestions.length === 0 && (
            <p className="absolute left-0 right-0 top-full z-[110] mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-xs text-muted-foreground shadow-lg">
              Aucune tâche disponible.
            </p>
          )}
        </div>
      )}

      {disabled && selected.length === 0 && (
        <p className="text-sm text-muted-foreground">Aucune dépendance</p>
      )}
    </div>
  );
}
