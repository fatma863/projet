import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { useI18n } from '../../i18n/I18nContext';
import { Search, FolderKanban, ListTodo, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function unwrapList(payload, key) {
  if (!payload) return [];
  const v = payload[key];
  if (Array.isArray(v)) return v;
  if (v?.data && Array.isArray(v.data)) return v.data;
  return [];
}

export default function GlobalSearchBar() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  const wrapRef = useRef(null);

  const debounced = useDebouncedValue(q, 220);

  const { data, isFetching } = useQuery({
    queryKey: ['global-search', debounced],
    queryFn: () => api.get('/search', { params: { q: debounced } }).then((r) => r.data),
    enabled: debounced.length >= 2,
    staleTime: 15_000,
  });

  const tasks = unwrapList(data, 'tasks');
  const projects = unwrapList(data, 'projects');
  const users = unwrapList(data, 'users');
  const hasResults = tasks.length + projects.length + users.length > 0;

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const goTask = useCallback(
    (t) => {
      setOpen(false);
      setQ('');
      navigate(`/projects/${t.project_id}?highlightTask=${t.id}`);
    },
    [navigate],
  );

  const goProject = useCallback(
    (p) => {
      setOpen(false);
      setQ('');
      navigate(`/projects/${p.id}`);
    },
    [navigate],
  );

  return (
    <div ref={wrapRef} className="relative hidden min-w-[200px] max-w-md flex-1 md:block">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={t('layout.searchPlaceholder')}
          className="h-9 w-full rounded-lg border border-border bg-muted/40 py-1 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          autoComplete="off"
        />
        {isFetching && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">…</span>
        )}
      </div>

      <AnimatePresence>
        {open && debounced.length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[min(70vh,420px)] overflow-auto rounded-xl border border-border bg-card py-2 shadow-lg"
          >
            {!hasResults && !isFetching && (
              <p className="px-3 py-4 text-center text-sm text-muted-foreground">Aucun résultat</p>
            )}

            {projects.length > 0 && (
              <div className="mb-2">
                <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Projets</p>
                {projects.map((p) => (
                  <button
                    key={`p-${p.id}`}
                    type="button"
                    onClick={() => goProject(p)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                  >
                    <FolderKanban className="h-4 w-4 shrink-0 text-primary" />
                    <span className="font-medium text-foreground">{p.name}</span>
                    <span className="ml-auto font-mono text-xs text-muted-foreground">{p.code}</span>
                  </button>
                ))}
              </div>
            )}

            {tasks.length > 0 && (
              <div className="mb-2">
                <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tâches</p>
                {tasks.map((t) => (
                  <button
                    key={`t-${t.id}`}
                    type="button"
                    onClick={() => goTask(t)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                  >
                    <ListTodo className="h-4 w-4 shrink-0 text-amber-600" />
                    <span className="line-clamp-2 text-foreground">{t.title}</span>
                    {t.project?.code && (
                      <span className="ml-auto shrink-0 font-mono text-xs text-muted-foreground">{t.project.code}</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {users.length > 0 && (
              <div>
                <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Utilisateurs</p>
                {users.map((u) => (
                  <div
                    key={`u-${u.id}`}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-foreground"
                  >
                    <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="font-medium">{u.name}</span>
                    <span className="text-xs text-muted-foreground">{u.email}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function useDebouncedValue(value, ms) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
