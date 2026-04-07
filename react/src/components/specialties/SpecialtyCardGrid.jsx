import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, Loader2 } from 'lucide-react';
import api from '../../lib/api';
import { cn } from '../../lib/utils';

/**
 * Grille de cartes cliquables pour sélectionner des spécialités.
 * Utilisé dans la page Paramètres — affichage inline sans dropdown.
 *
 * @param {number[]} value
 * @param {(ids: number[]) => void} onChange
 * @param {boolean} disabled
 */
export function SpecialtyCardGrid({ value = [], onChange, disabled = false }) {
  const { data: allSpecialties = [], isLoading } = useQuery({
    queryKey: ['specialties'],
    queryFn: () => api.get('/specialties').then((r) => r.data.specialties ?? []),
    staleTime: 5 * 60 * 1000,
  });

  const selectedSet = useMemo(() => new Set(value), [value]);

  const toggle = (id) => {
    if (disabled) return;
    if (selectedSet.has(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Chargement des spécialités…
      </div>
    );
  }

  if (allSpecialties.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
        Aucune spécialité configurée.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {/* Compteur */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Cliquez sur une carte pour la sélectionner / désélectionner
        </p>
        {value.length > 0 && (
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            {value.length} sélectionnée{value.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Grille de cartes */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {allSpecialties.map((s) => {
          const isSelected = selectedSet.has(s.id);
          return (
            <button
              key={s.id}
              type="button"
              disabled={disabled}
              onClick={() => toggle(s.id)}
              className={cn(
                'group relative flex flex-col gap-2 rounded-xl border-2 p-4 text-left transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                isSelected
                  ? 'shadow-sm'
                  : 'border-border bg-card hover:border-border/80 hover:bg-accent/40 hover:shadow-sm',
                disabled && 'cursor-not-allowed opacity-50',
              )}
              style={
                isSelected
                  ? {
                      borderColor: s.color ?? '#6366f1',
                      backgroundColor: `${s.color ?? '#6366f1'}12`,
                    }
                  : {}
              }
            >
              {/* En-tête de la carte */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {/* Point coloré */}
                  <span
                    className="mt-0.5 h-3 w-3 shrink-0 rounded-full shadow-sm"
                    style={{ backgroundColor: s.color ?? '#6366f1' }}
                  />
                  <span
                    className={cn(
                      'text-sm font-semibold leading-tight transition-colors',
                      isSelected ? 'text-foreground' : 'text-foreground/80 group-hover:text-foreground',
                    )}
                  >
                    {s.name}
                  </span>
                </div>

                {/* Checkmark */}
                <span
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-150',
                    isSelected
                      ? 'border-transparent text-white'
                      : 'border-border bg-card group-hover:border-muted-foreground/40',
                  )}
                  style={isSelected ? { backgroundColor: s.color ?? '#6366f1' } : {}}
                >
                  {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                </span>
              </div>

              {/* Description */}
              {s.description && (
                <p
                  className={cn(
                    'line-clamp-2 text-xs leading-relaxed transition-colors',
                    isSelected ? 'text-foreground/70' : 'text-muted-foreground',
                  )}
                >
                  {s.description}
                </p>
              )}

              {/* Barre colorée en bas si sélectionnée */}
              {isSelected && (
                <span
                  className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full opacity-60"
                  style={{ backgroundColor: s.color ?? '#6366f1' }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
