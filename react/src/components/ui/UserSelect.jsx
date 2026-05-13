import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown, Check } from 'lucide-react';

function Avatar({ user, size = 32 }) {
  if (user?.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt={user.name}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  const initials = (user?.name || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      className="flex items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold flex-shrink-0"
      style={{ width: size, height: size }}
    >
      {initials}
    </span>
  );
}

function Option({ user, selected, onClick }) {
  const specs = (user.specialties || []).map((s) => s.name).join(' · ');
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
        selected
          ? 'bg-blue-50 dark:bg-blue-900/30 border-l-2 border-blue-500'
          : 'hover:bg-gray-100 dark:hover:bg-gray-800 border-l-2 border-transparent'
      }`}
    >
      <Avatar user={user} size={36} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate leading-snug text-black dark:text-white">{user.name}</p>
        {specs && (
          <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">{specs}</p>
        )}
      </div>
      {selected && <Check className="h-4 w-4 text-blue-500 flex-shrink-0" />}
    </button>
  );
}

export function UserSelect({ users, value, onChange, placeholder = 'Sélectionner…', disabled }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [dropStyle, setDropStyle] = useState({});
  const triggerRef = useRef(null);
  const dropRef = useRef(null);
  const inputRef = useRef(null);

  const selectedUser = useMemo(
    () => users.find((u) => u.id === (typeof value === 'string' ? Number(value) : value)),
    [users, value],
  );

  const filtered = useMemo(() => {
    if (!search) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        (u.specialties || []).some((s) => s.name.toLowerCase().includes(q)),
    );
  }, [users, search]);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    const maxH = 280;
    const goUp = spaceBelow < maxH && r.top > spaceBelow;
    const left = Math.max(8, Math.min(r.left, window.innerWidth - r.width - 8));
    setDropStyle(
      goUp
        ? { position: 'fixed', left, width: r.width, bottom: window.innerHeight - r.top + 4, maxHeight: Math.min(maxH, r.top - 16) }
        : { position: 'fixed', left, width: r.width, top: r.bottom + 4, maxHeight: Math.min(maxH, spaceBelow - 16) },
    );
  }, []);

  const open = useCallback(() => {
    if (disabled) return;
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 30);
  }, [disabled]);

  const close = useCallback(() => {
    setIsOpen(false);
    setSearch('');
  }, []);

  const selectUser = useCallback((uid) => {
    onChange(uid ? String(uid) : '');
    close();
  }, [onChange, close]);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    let frameId;
    const start = performance.now();
    const loop = (now) => {
      updatePosition();
      if (now - start < 250) frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    window.addEventListener('scroll', updatePosition, { capture: true, passive: true });
    window.addEventListener('resize', updatePosition, { passive: true });
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('scroll', updatePosition, { capture: true });
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (triggerRef.current?.contains(e.target)) return;
      if (dropRef.current?.contains(e.target)) return;
      close();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, close]);

  return (
    <div ref={triggerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => (isOpen ? close() : open())}
        className="flex w-full items-center gap-2.5 rounded-lg border border-input bg-background px-3 py-2 text-sm transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {selectedUser ? (
          <>
            <Avatar user={selectedUser} size={28} />
            <div className="flex-1 text-left min-w-0">
              <span className="block text-sm font-medium truncate">{selectedUser.name}</span>
              {selectedUser.specialties?.length > 0 && (
                <span className="block text-[11px] text-muted-foreground truncate leading-tight">
                  {selectedUser.specialties.map((s) => s.name).join(' · ')}
                </span>
              )}
            </div>
          </>
        ) : (
          <span className="flex-1 text-left text-muted-foreground">{placeholder}</span>
        )}
        <ChevronDown className={`h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && createPortal(
        <div
          ref={dropRef}
          style={dropStyle}
          className="z-[9999] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden flex flex-col"
        >
          <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 bg-white dark:bg-gray-900">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par nom ou spécialité…"
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-black dark:text-white pl-8 pr-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/40 transition-shadow"
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1 overscroll-contain bg-white dark:bg-gray-900">
            {filtered.length === 0 ? (
              <p className="px-3 py-6 text-sm text-gray-500 text-center">Aucun résultat</p>
            ) : (
              filtered.map((u) => (
                <Option
                  key={u.id}
                  user={u}
                  selected={u.id === selectedUser?.id}
                  onClick={() => selectUser(u.id)}
                />
              ))
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
