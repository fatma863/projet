import { useEffect, useRef, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, X, Search } from 'lucide-react';
import api from '../../lib/api';
import { cn } from '../../lib/utils';

/**
 * Sélecteur multi-spécialités — version dropdown compacte pour les formulaires.
 *
 * @param {number[]} value
 * @param {(ids: number[]) => void} onChange
 * @param {boolean} disabled
 * @param {string} placeholder
 */
export function SpecialtyMultiSelect({
  value = [],
  onChange,
  disabled = false,
  placeholder = 'Sélectionner des spécialités…',
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapRef = useRef(null);
  const searchRef = useRef(null);

  const { data: allSpecialties = [] } = useQuery({
    queryKey: ['specialties'],
    queryFn: () => api.get('/specialties').then((r) => r.data.specialties ?? []),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  // Focus la recherche à l'ouverture
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50);
  }, [open]);

  const selected = useMemo(
    () => allSpecialties.filter((s) => value.includes(s.id)),
    [allSpecialties, value],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allSpecialties;
    return allSpecialties.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.description ?? '').toLowerCase().includes(q),
    );
  }, [allSpecialties, search]);

  const toggle = (id) => {
    if (disabled) return;
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  };

  const remove = (id, e) => {
    e.stopPropagation();
    onChange(value.filter((v) => v !== id));
  };

  return (
    <div className="relative" ref={wrapRef}>
      {/* Déclencheur */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={cn(
          'flex min-h-[42px] w-full flex-wrap items-center gap-1.5 rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground',
          'transition-all duration-100',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          !disabled && 'hover:border-ring/60',
          disabled && 'cursor-not-allowed opacity-50',
          open && 'border-ring ring-2 ring-ring/20',
        )}
      >
        {selected.length === 0 && (
          <span className="flex-1 text-left text-muted-foreground">{placeholder}</span>
        )}

        {/* Badges des sélectionnées */}
        <div className="flex flex-1 flex-wrap gap-1.5">
          {selected.map((s) => (
            <span
              key={s.id}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium text-white shadow-sm"
              style={{ backgroundColor: s.color ?? '#6366f1' }}
            >
              {s.name}
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => remove(s.id, e)}
                  className="ml-0.5 rounded-full hover:bg-white/20 p-0.5"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </span>
          ))}
        </div>

        <ChevronDown
          className={cn(
            'ml-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150',
            open && 'rotate-180',
          )}
        />
      </button>

      {/* Dropdown */}
      {open && !disabled && (
        <div className="absolute left-0 right-0 top-full z-[120] mt-1.5 rounded-xl border border-border bg-card shadow-xl">
          {/* Barre de recherche */}
          <div className="border-b border-border px-3 py-2">
            <div className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher…"
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Liste */}
          <div className="max-h-52 overflow-y-auto py-1.5">
            {filtered.length === 0 && (
              <p className="px-4 py-3 text-xs text-muted-foreground">Aucun résultat.</p>
            )}
            {filtered.map((s) => {
              const checked = value.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggle(s.id)}
                  className={cn(
                    'flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors',
                    checked ? 'bg-accent/50' : 'hover:bg-accent/30',
                  )}
                >
                  {/* Checkbox personnalisée */}
                  <span
                    className={cn(
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-all',
                      checked ? 'border-transparent text-white' : 'border-border bg-card',
                    )}
                    style={checked ? { backgroundColor: s.color ?? '#6366f1' } : {}}
                  >
                    {checked && (
                      <svg className="h-2.5 w-2.5" viewBox="0 0 10 10" fill="none">
                        <path
                          d="M1.5 5L4 7.5L8.5 2.5"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>

                  {/* Point couleur */}
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full shadow-sm"
                    style={{ backgroundColor: s.color ?? '#6366f1' }}
                  />

                  {/* Texte */}
                  <div className="min-w-0 flex-1">
                    <span className={cn('font-medium', checked ? 'text-foreground' : 'text-foreground/80')}>
                      {s.name}
                    </span>
                    {s.description && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{s.description}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer : sélection rapide */}
          {value.length > 0 && (
            <div className="border-t border-border px-3 py-2">
              <button
                type="button"
                onClick={() => { onChange([]); setSearch(''); }}
                className="text-xs text-muted-foreground hover:text-destructive"
              >
                Tout désélectionner ({value.length})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
