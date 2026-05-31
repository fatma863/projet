import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../i18n/I18nContext';
import api from '../../lib/api';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import {
  Plus, Search, FolderKanban, Calendar, Users, MoreVertical,
  Pencil, Trash2, Eye, X, RotateCcw, ChevronDown, Check, Crown,
} from 'lucide-react';
import { isGuestViewer } from '../../lib/roles';

const EMPTY_FORM = {
  name: '',
  code: '',
  description: '',
  team_id: '',
  status: 'planning',
  start_date: '',
  end_date: '',
  chef_id: '',
  memberIds: [],
  priority: 'medium',
};

function parseUsersResponse(res) {
  const raw = res.data.data;
  return Array.isArray(raw) ? raw : raw?.data || [];
}

export default function ProjectsPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const isAdmin = user?.roles?.includes('admin');
  const isViewer = isGuestViewer(user);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [menuOpen, setMenuOpen] = useState(null);
  const [formSession, setFormSession] = useState(0);
  const [notice, setNotice] = useState(null);

  const STATUS_OPTIONS = [
    { value: 'planning', label: t('projects.statuses.planning'), variant: 'secondary' },
    { value: 'active', label: t('projects.statuses.active'), variant: 'success' },
    { value: 'on_hold', label: t('projects.statuses.on_hold'), variant: 'warning' },
    { value: 'completed', label: t('projects.statuses.completed'), variant: 'default' },
    { value: 'cancelled', label: t('projects.statuses.cancelled'), variant: 'destructive' },
  ];

  const PRIORITY_OPTIONS = [
    { value: 'low', label: t('projects.priorityLabels.low') },
    { value: 'medium', label: t('projects.priorityLabels.medium') },
    { value: 'high', label: t('projects.priorityLabels.high') },
  ];

  const getStatusBadge = (status) => {
    const opt = STATUS_OPTIONS.find((s) => s.value === status);
    return opt ? <Badge variant={opt.variant}>{opt.label}</Badge> : <Badge>{status}</Badge>;
  };

  const { data, isLoading } = useQuery({
    queryKey: ['projects', { search, status: filterStatus }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterStatus) params.set('status', filterStatus);
      params.set('per_page', '50');
      return api.get(`/projects?${params}`).then((r) => r.data.data);
    },
  });

  const { data: teams } = useQuery({
    queryKey: ['teams-list'],
    enabled: isAdmin,
    queryFn: () => api.get('/teams?per_page=100').then((r) => r.data.data),
    staleTime: 300_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/projects/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });

  const openEdit = (project) => {
    setEditingProject(project);
    setShowForm(true);
    setFormSession((s) => s + 1);
    setMenuOpen(null);
  };

  const openCreate = () => {
    setEditingProject(null);
    setShowForm(true);
    setFormSession((s) => s + 1);
  };

  const handleDelete = (id) => {
    if (window.confirm(t('projects.deleteConfirmSimple'))) {
      deleteMutation.mutate(id);
    }
    setMenuOpen(null);
  };

  return (
    <div className="space-y-6">
      {notice && (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 shadow-sm"
        >
          {notice}
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('projects.title')}</h1>
          <p className="text-muted-foreground">
            {isAdmin
              ? t('projects.subtitleAdmin')
              : isViewer
                ? t('projects.subtitleViewer')
                : t('projects.subtitleMember')}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> {t('projects.newProject')}
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('projects.searchProjects')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">{t('projects.allStatuses')}</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </Select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 gap-1.5"
          onClick={() => {
            setSearch('');
            setFilterStatus('');
          }}
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden />
          {t('projects.resetFilters')}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : data?.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FolderKanban className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">{t('projects.noProjects')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.map((project) => (
            <Card
              key={project.id}
              className={`group relative transition-shadow hover:shadow-md ${
                project.is_paused || project.status === 'on_hold'
                  ? 'border-amber-300 bg-amber-50/40 dark:border-amber-700/60 dark:bg-amber-950/20'
                  : ''
              }`}
            >
              <CardContent className="p-5">
                <div className="absolute right-3 top-3">
                  <button
                    onClick={() => setMenuOpen(menuOpen === project.id ? null : project.id)}
                    className="rounded-md p-1 opacity-0 hover:bg-accent group-hover:opacity-100"
                    disabled={!isAdmin}
                  >
                    <MoreVertical className="h-4 w-4 text-muted-foreground" />
                  </button>
                  {menuOpen === project.id && isAdmin && (
                    <div className="absolute right-0 top-8 z-10 w-40 rounded-md border border-border bg-card py-1 text-foreground shadow-lg">
                      <Link
                        to={`/projects/${project.id}`}
                        className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                      >
                        <Eye className="h-4 w-4" /> {t('common.view')}
                      </Link>
                      <button
                        onClick={() => openEdit(project)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                      >
                        <Pencil className="h-4 w-4" /> {t('common.edit')}
                      </button>
                      <button
                        onClick={() => handleDelete(project.id)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" /> {t('common.delete')}
                      </button>
                    </div>
                  )}
                </div>

                <Link to={`/projects/${project.id}`} className="block">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-mono font-semibold text-primary">
                      {project.code}
                    </span>
                    {getStatusBadge(project.status)}
                    {project.priority && (
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {PRIORITY_OPTIONS.find((p) => p.value === project.priority)?.label || project.priority}
                      </Badge>
                    )}
                    {(project.is_paused || project.status === 'on_hold') && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 ring-1 ring-amber-300 dark:bg-amber-900/40 dark:text-amber-300">
                        ⏸️ PAUSE
                      </span>
                    )}
                  </div>
                  <h3 className="mb-1 font-semibold text-foreground">{project.name}</h3>
                  {project.description && (
                    <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                      {project.description}
                    </p>
                  )}
                  {/* Pause reason */}
                  {(project.is_paused || project.status === 'on_hold') && project.pause_reason && (
                    <div className="mb-2 flex items-start gap-1.5 rounded-md bg-amber-100 px-2.5 py-1.5 text-xs text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                      <span className="shrink-0">⏸️</span>
                      <span className="line-clamp-2">{project.pause_reason}</span>
                    </div>
                  )}
                  {/* Chef de projet */}
                  {project.chef && (
                    <div className="flex items-center gap-1.5 mb-3 text-xs">
                      <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <span className="text-muted-foreground">{t('projects.leaderLabel')}&nbsp;:</span>
                      <span className="font-semibold text-foreground">{project.chef.name}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {project.team && (
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" /> {project.team.name}
                      </span>
                    )}
                    {project.start_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(project.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <FolderKanban className="h-3.5 w-3.5" /> {t('projects.tasksCount', { count: project.tasks_count || 0 })}
                    </span>
                  </div>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ProjectFormModal
        key={formSession}
        open={showForm}
        onClose={() => { setShowForm(false); setEditingProject(null); }}
        project={editingProject}
        teams={teams || []}
        onSuccess={(message) => {
          setNotice(message);
          window.setTimeout(() => setNotice(null), 6000);
        }}
      />
    </div>
  );
}

/* ── User avatar + name + specialty picker ── */
function UserAvatar({ user, size = 32 }) {
  if (user.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt={user.name}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  const initials = user.name
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

function UserSelectOption({ user, selected, onClick }) {
  const specs = user.specialties?.map((s) => s.name).join(' · ');
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
        selected ? 'bg-blue-50 dark:bg-blue-900/30 border-l-2 border-blue-500' : 'hover:bg-gray-100 dark:hover:bg-gray-800 border-l-2 border-transparent'
      }`}
    >
      <UserAvatar user={user} size={36} />
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

function UserSelect({ users, value, onChange, placeholder, disabled }) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [dropStyle, setDropStyle] = useState({});
  const triggerRef = useRef(null);
  const dropRef = useRef(null);
  const inputRef = useRef(null);

  const resolvedPlaceholder = placeholder ?? t('common.search') + '…';

  const selectedUser = useMemo(
    () => users.find((u) => u.id === (typeof value === 'string' ? Number(value) : value)),
    [users, value],
  );

  const filtered = useMemo(
    () => {
      if (!search) return users;
      const q = search.toLowerCase();
      return users.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          (u.specialties || []).some((s) => s.name.toLowerCase().includes(q))
      );
    },
    [users, search],
  );

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    const maxH = 260;
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

  // Dynamically update position while open: covers modal animation, scroll, and resize
  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    // Recompute every frame for the modal's open animation duration (~200ms)
    let frameId;
    const start = performance.now();
    const animationLoop = (now) => {
      updatePosition();
      if (now - start < 250) {
        frameId = requestAnimationFrame(animationLoop);
      }
    };
    frameId = requestAnimationFrame(animationLoop);

    window.addEventListener('scroll', updatePosition, { capture: true, passive: true });
    window.addEventListener('resize', updatePosition, { passive: true });

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('scroll', updatePosition, { capture: true });
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, updatePosition]);

  // Close on outside click only
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (triggerRef.current?.contains(e.target)) return;
      if (dropRef.current?.contains(e.target)) return;
      close();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, close]);

  return (
    <div ref={triggerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => isOpen ? close() : open()}
        className="flex w-full items-center gap-2.5 rounded-lg border border-input bg-background px-3 py-2 text-sm transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {selectedUser ? (
          <>
            <UserAvatar user={selectedUser} size={28} />
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
          <span className="flex-1 text-left text-muted-foreground">{resolvedPlaceholder}</span>
        )}
        <ChevronDown className={`h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && createPortal(
        <div ref={dropRef} style={dropStyle} className="z-[9999] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden flex flex-col backdrop-blur-none">
          <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 bg-white dark:bg-gray-900">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 dark:text-gray-500 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('common.search') + '…'}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-black dark:text-white pl-8 pr-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/40 transition-shadow"
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1 overscroll-contain bg-white dark:bg-gray-900">
            {filtered.length === 0 ? (
              <p className="px-3 py-6 text-sm text-gray-500 dark:text-gray-400 text-center">{t('common.noResults')}</p>
            ) : (
              filtered.map((u) => (
                <UserSelectOption
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

function ProjectFormModal({ open, onClose, project, teams, onSuccess }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const isEdit = !!project;
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const STATUS_OPTIONS = [
    { value: 'planning', label: t('projects.statuses.planning'), variant: 'secondary' },
    { value: 'active', label: t('projects.statuses.active'), variant: 'success' },
    { value: 'on_hold', label: t('projects.statuses.on_hold'), variant: 'warning' },
    { value: 'completed', label: t('projects.statuses.completed'), variant: 'default' },
    { value: 'cancelled', label: t('projects.statuses.cancelled'), variant: 'destructive' },
  ];

  const PRIORITY_OPTIONS = [
    { value: 'low', label: t('projects.priorityLabels.low') },
    { value: 'medium', label: t('projects.priorityLabels.medium') },
    { value: 'high', label: t('projects.priorityLabels.high') },
  ];

  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['users', 'project-form'],
    queryFn: () => api.get('/users?per_page=200').then(parseUsersResponse),
    enabled: open,
  });

  const { data: projectDetail, isLoading: loadingDetail } = useQuery({
    queryKey: ['project', project?.id, 'form'],
    queryFn: () => api.get(`/projects/${project.id}`).then((r) => r.data.project),
    enabled: open && isEdit && !!project?.id,
  });

  useEffect(() => {
    if (!open) return;
    if (!isEdit) {
      setForm({ ...EMPTY_FORM });
      setErrors({});
      return;
    }
    if (!projectDetail) return;
    const ownerId = projectDetail.owner?.id;
    const chefId = projectDetail.chef_id ?? projectDetail.project_manager_id;
    const memberIds = (projectDetail.members || [])
      .map((m) => m.id)
      .filter((id) => id !== ownerId && id !== (chefId ?? null));
    setForm({
      name: projectDetail.name || '',
      code: projectDetail.code || '',
      description: projectDetail.description || '',
      team_id: projectDetail.team_id || '',
      status: projectDetail.status || 'planning',
      start_date: projectDetail.start_date || '',
      end_date: projectDetail.end_date || '',
      chef_id: chefId ? String(chefId) : '',
      memberIds,
      priority: projectDetail.priority || 'medium',
    });
    setErrors({});
  }, [open, isEdit, projectDetail]);

  const chefNum = form.chef_id ? Number(form.chef_id) : null;
  const chefRequired = false;
  const ownerId = isEdit ? projectDetail?.owner?.id : authUser?.id;
  const nonAdminUsers = users.filter((u) => !u.roles?.includes('admin'));
  const availableMembers = nonAdminUsers.filter(
    (u) =>
      u.id !== chefNum
      && u.id !== ownerId
      && !form.memberIds.includes(u.id)
  );

  const addMember = (userId) => {
    const id = Number(userId);
    if (!id || id === chefNum || id === ownerId || form.memberIds.includes(id)) return;
    setForm((f) => ({ ...f, memberIds: [...f.memberIds, id] }));
  };

  const removeMember = (userId) => {
    setForm((f) => ({ ...f, memberIds: f.memberIds.filter((id) => id !== userId) }));
  };

  const mutation = useMutation({
    mutationFn: (data) =>
      isEdit ? api.put(`/projects/${project.id}`, data) : api.post('/projects', data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      if (project?.id) {
        queryClient.invalidateQueries({ queryKey: ['project', project.id] });
      }
      onSuccess?.(res.data?.message || (isEdit ? 'Projet mis à jour.' : 'Projet créé avec succès.'));
      onClose();
    },
    onError: (err) => {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors || {});
        return;
      }
      setErrors({
        general: [err.response?.data?.message || err.message || 'Erreur de création'],
      });
    },
  });

  const validateClient = () => {
    const next = {};
    if (!form.name.trim()) next.name = ['Le nom est obligatoire.'];
    if (!form.code.trim()) next.code = ['Le code est obligatoire.'];
    if (chefRequired && !form.chef_id) {
      next.chef_id = ['Le chef de projet est obligatoire.'];
    }
    if (form.start_date && form.end_date) {
      const a = new Date(form.start_date);
      const b = new Date(form.end_date);
      if (b < a) {
        next.end_date = ['La date de fin doit être postérieure ou égale à la date de début.'];
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateClient()) return;

    const payload = {
      name: form.name.trim(),
      code: form.code.trim(),
      description: form.description.trim() || null,
      status: form.status,
      priority: form.priority,
      members: form.memberIds,
    };
    if (form.chef_id) {
      payload.chef_id = Number(form.chef_id);
    } else if (isEdit) {
      payload.chef_id = null;
    }
    if (form.team_id) payload.team_id = Number(form.team_id);
    if (form.start_date) payload.start_date = form.start_date;
    if (form.end_date) payload.end_date = form.end_date;

    mutation.mutate(payload);
  };

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const selectedMemberUsers = form.memberIds
    .map((id) => users.find((u) => u.id === id))
    .filter(Boolean);

  const showLoading = loadingUsers || (isEdit && loadingDetail);

  const formId = 'project-form-modal';
  const footerButtons = !showLoading ? (
    <>
      <Button type="button" variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
      <Button type="submit" form={formId} disabled={mutation.isPending}>
        {mutation.isPending ? t('common.saving') : isEdit ? t('common.edit') : t('common.create')}
      </Button>
    </>
  ) : null;

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? t('projects.editProject') : t('projects.newProject')} size="lg" footer={footerButtons}>
      {showLoading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <form id={formId} onSubmit={handleSubmit} className="space-y-3">
          {errors.general && (
            <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive border border-destructive/20">
              {errors.general[0]}
            </div>
          )}

          {/* Nom + Code */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">{t('common.name')} <span className="text-destructive">*</span></label>
              <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder={t('projects.projectName')} />
              {errors.name && <p className="mt-0.5 text-xs text-destructive">{errors.name[0]}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Code <span className="text-destructive">*</span></label>
              <Input value={form.code} onChange={(e) => set('code', e.target.value.toUpperCase())} maxLength={10} placeholder="PROJ" />
              {errors.code && <p className="mt-0.5 text-xs text-destructive">{errors.code[0]}</p>}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-sm font-medium">{t('common.description')}</label>
            <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={2} placeholder={t('projects.projectDescription') + '…'} />
          </div>

          {/* Équipe / Statut / Priorité */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium">{t('projects.projectTeam')}</label>
              <Select value={form.team_id} onChange={(e) => {
                const teamId = e.target.value;
                if (!teamId) {
                  setForm((f) => ({ ...f, team_id: '', chef_id: '', memberIds: [] }));
                  return;
                }
                const selectedTeam = teams.find((t) => String(t.id) === teamId);
                if (!selectedTeam) {
                  set('team_id', teamId);
                  return;
                }
                const leaderId = selectedTeam.team_leader_id;
                const leaderUser = users.find((u) => u.id === leaderId);
                const leaderIsAdmin = leaderUser?.roles?.includes('admin');
                const ownerNum = isEdit ? projectDetail?.owner?.id : authUser?.id;
                const newMemberIds = (selectedTeam.members || [])
                  .map((m) => m.id)
                  .filter((id) => {
                    const u = users.find((u) => u.id === id);
                    return u && !u.roles?.includes('admin') && id !== ownerNum && id !== leaderId;
                  });
                setForm((f) => ({
                  ...f,
                  team_id: teamId,
                  chef_id: leaderId && !leaderIsAdmin ? String(leaderId) : '',
                  memberIds: newMemberIds,
                }));
              }}>
                <option value="">{t('common.none')}</option>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t('common.status')}</label>
              <Select value={form.status} onChange={(e) => set('status', e.target.value)}>
                {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t('tasks.priority')}</label>
              <Select value={form.priority} onChange={(e) => set('priority', e.target.value)}>
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </Select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">{t('projects.startDate')}</label>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => {
                  const next = e.target.value;
                  set('start_date', next);
                  // Réinitialise la date de fin si elle devient invalide
                  if (form.end_date && next && form.end_date < next) {
                    set('end_date', '');
                  }
                }}
              />
              {errors.start_date && <p className="mt-0.5 text-xs text-destructive">{errors.start_date[0]}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t('projects.endDate')}</label>
              <Input
                type="date"
                value={form.end_date}
                min={form.start_date || undefined}
                onChange={(e) => set('end_date', e.target.value)}
              />
              {errors.end_date && <p className="mt-0.5 text-xs text-destructive">{errors.end_date[0]}</p>}
            </div>
          </div>

          <div className="border-t border-border pt-1" />

          {/* Chef de projet */}
          <div>
            <label className="mb-1 block text-sm font-medium">{t('projects.chefDeProjet')}</label>
            {form.team_id ? (
              (() => {
                const chefUser = form.chef_id ? users.find((u) => u.id === Number(form.chef_id)) : null;
                return chefUser ? (
                  <div className="flex items-center gap-2.5 rounded-lg border border-input bg-muted/30 px-3 py-2">
                    <UserAvatar user={chefUser} size={28} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{chefUser.name}</p>
                      {chefUser.specialties?.length > 0 && (
                        <p className="text-[11px] text-muted-foreground truncate leading-tight">
                          {chefUser.specialties.map((s) => s.name).join(' · ')}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="rounded-lg border border-input bg-muted/30 px-3 py-2 text-sm italic text-muted-foreground">
                    Aucun chef défini dans cette équipe
                  </p>
                );
              })()
            ) : (
              <UserSelect
                users={nonAdminUsers}
                value={form.chef_id}
                onChange={(v) => {
                  setForm((f) => ({
                    ...f,
                    chef_id: v,
                    memberIds: f.memberIds.filter((id) => Number(id) !== Number(v)),
                  }));
                }}
                placeholder={t('projects.chefDeProjet') + '…'}
              />
            )}
            {errors.chef_id && (
              <p className="mt-0.5 text-xs text-destructive">{errors.chef_id[0]}</p>
            )}
            <p className="mt-0.5 text-xs text-muted-foreground">
              {form.team_id
                ? 'Chef de l\'équipe sélectionnée · retirez l\'équipe pour modifier manuellement.'
                : 'Optionnel · seuls les membres non-admin peuvent être désignés chef.'}
            </p>
          </div>

          {/* Membres */}
          <div>
            <label className="mb-1 block text-sm font-medium">{t('projects.members')}</label>
            {form.team_id ? (
              selectedMemberUsers.length > 0 ? (
                <div className="rounded-lg border border-input bg-muted/30 divide-y divide-border">
                  {selectedMemberUsers.map((u) => (
                    <div key={u.id} className="flex items-center gap-2.5 px-3 py-1.5">
                      <UserAvatar user={u} size={28} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{u.name}</p>
                        {u.specialties?.length > 0 && (
                          <p className="text-[11px] text-muted-foreground truncate leading-tight">
                            {u.specialties.map((s) => s.name).join(' · ')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-lg border border-input bg-muted/30 px-3 py-2 text-sm italic text-muted-foreground">
                  Aucun autre membre dans cette équipe
                </p>
              )
            ) : (
              <>
                {selectedMemberUsers.length > 0 && (
                  <div className="mb-2 rounded-lg border border-border divide-y divide-border bg-accent/20">
                    {selectedMemberUsers.map((u) => (
                      <div key={u.id} className="flex items-center gap-2 px-3 py-1.5">
                        <UserAvatar user={u} size={28} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{u.name}</p>
                          {u.specialties?.length > 0 && (
                            <p className="text-[11px] text-muted-foreground truncate leading-tight">
                              {u.specialties.map((s) => s.name).join(' · ')}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeMember(u.id)}
                          className="rounded-md p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          aria-label={`${t('projects.removeMember')} ${u.name}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <UserSelect
                  users={availableMembers}
                  value=""
                  onChange={(v) => { addMember(v); }}
                  placeholder={availableMembers.length === 0 ? t('projects.noMembersAvailable') : t('projects.addMember') + '…'}
                  disabled={availableMembers.length === 0}
                />
              </>
            )}
            {form.team_id && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Membres de l'équipe sélectionnée · retirez l'équipe pour modifier manuellement.
              </p>
            )}
          </div>
        </form>
      )}
    </Modal>
  );
}
