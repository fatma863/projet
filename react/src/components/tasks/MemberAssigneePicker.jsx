import { useMemo, useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { formatProjectRole } from '../../lib/roles';
import { cn } from '../../lib/utils';

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

/**
 * Sélecteur de membre projet avec recherche locale (nom, e-mail, rôle).
 * @param {Array<{id:number,name:string,email?:string,avatar?:string|null,role?:string}>} members
 * @param {string|number|''} value — user id ou vide
 * @param {Set<number>} recommendedIds — IDs des membres recommandés (badge affiché)
 */
export function MemberAssigneePicker({
  members = [],
  value,
  onChange,
  disabled,
  placeholder = 'Rechercher par nom ou e-mail…',
  id: inputId,
  recommendedIds = new Set(),
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

  const selected = useMemo(
    () => members.find((m) => String(m.id) === String(value)),
    [members, value],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? members.filter((m) => {
          const name = (m.name || '').toLowerCase();
          const email = (m.email || '').toLowerCase();
          const role = formatProjectRole(m.role).toLowerCase();
          return name.includes(q) || email.includes(q) || role.includes(q);
        })
      : [...members].sort((a, b) => {
          // membres recommandés en premier
          const ar = recommendedIds.has(a.id) ? 0 : 1;
          const br = recommendedIds.has(b.id) ? 0 : 1;
          return ar - br;
        });
    return list.slice(0, 60);
  }, [members, search, recommendedIds]);

  if (disabled && !selected) {
    return (
      <div className="rounded-md border border-dashed border-border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
        Non assigné
      </div>
    );
  }

  if (selected && !open) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2">
        {selected.avatar ? (
          <img
            src={selected.avatar}
            alt=""
            className="h-9 w-9 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
            {initials(selected.name)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{selected.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {formatProjectRole(selected.role)} · {selected.email || '—'}
          </p>
        </div>
        {!disabled && (
          <button
            type="button"
            className="shrink-0 text-xs font-medium text-primary hover:underline"
            onClick={() => {
              onChange('');
              setSearch('');
            }}
          >
            Retirer
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={cn('relative', open && 'z-[100]')} ref={wrapRef}>
      <label htmlFor={inputId} className="sr-only">
        Assigné
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          id={inputId}
          type="text"
          autoComplete="off"
          disabled={disabled}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="flex h-10 w-full rounded-md border border-input bg-card py-2 pl-9 pr-3 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
      {open && !disabled && (
        <div className="absolute left-0 right-0 top-full z-[110] mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-border bg-card py-1 text-foreground shadow-lg">
          {filtered.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">Aucun membre ne correspond.</p>
          )}
          {filtered.map((m) => (
            <button
              key={m.id}
              type="button"
              className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-accent"
              onClick={() => {
                onChange(m.id);
                setOpen(false);
                setSearch('');
              }}
            >
              {m.avatar ? (
                <img src={m.avatar} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
              ) : (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                  {initials(m.name)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{m.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {formatProjectRole(m.role)} · {m.email || '—'}
                </p>
              </div>
              {recommendedIds.has(m.id) && (
                <span className="ml-1 shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                  Recommandé
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
