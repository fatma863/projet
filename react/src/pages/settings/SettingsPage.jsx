import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../i18n/I18nContext';
import { formatAppRole } from '../../lib/roles';
import { applyAppTheme, resolveThemeForUser, setStoredThemeForUser } from '../../lib/theme';
import api from '../../lib/api';
import { SpecialtyCardGrid } from '../../components/specialties/SpecialtyCardGrid';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import {
  User,
  Shield,
  Calendar,
  Brain,
  Bell,
  Moon,
  Sun,
  Lock,
  Globe,
  Camera,
  Loader2,
  Settings2,
  BellRing,
} from 'lucide-react';

const MotionSection = motion.section;
const MotionDiv = motion.div;

function SettingsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-56 rounded-lg bg-muted" />
        <div className="h-4 w-96 max-w-full rounded bg-muted" />
      </div>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-48 rounded-xl border border-border bg-card/50" />
      ))}
    </div>
  );
}

function Section({ id, title, icon: SectionIcon, children, delay = 0 }) {
  return (
    <MotionSection
      id={id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="scroll-mt-24"
    >
      <Card className="overflow-hidden transition-shadow duration-200 hover:shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            {SectionIcon && <SectionIcon className="h-5 w-5 shrink-0 text-muted-foreground" />}
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </MotionSection>
  );
}

function NotificationChannelRow({
  id,
  checked,
  onChange,
  disabled,
  icon: Icon,
  title,
  description,
}) {
  return (
    <label
      htmlFor={id}
      className={`flex cursor-pointer items-start gap-4 rounded-xl border border-border bg-muted/20 p-4 transition-colors hover:bg-accent/50 ${
        disabled ? 'pointer-events-none opacity-60' : ''
      }`}
    >
      <input
        id={id}
        type="checkbox"
        className="mt-1 h-4 w-4 shrink-0 rounded border-border"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 font-medium text-foreground">
          {Icon && <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />}
          {title}
        </div>
        {description ? (
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
    </label>
  );
}

function ProfileSection({
  user,
  isAdmin,
  profileMutation,
  avatarMutation,
  fileRef,
  avatarPreview,
  onAvatarPick,
}) {
  const { t, locale } = useI18n();
  const [name, setName] = useState(user.name || '');
  const [email, setEmail] = useState(user.email || '');
  const dateLocale = locale === 'en' ? 'en-US' : 'fr-FR';

  function onProfileSubmit(e) {
    e.preventDefault();
    profileMutation.mutate({ name, email });
  }

  return (
    <form onSubmit={onProfileSubmit} className="space-y-6">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="flex flex-col items-center gap-3">
          <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-border bg-primary/10 shadow-inner transition-transform hover:scale-[1.02]">
            {(avatarPreview || user?.avatar_url) && (
              <img
                src={avatarPreview || user.avatar_url}
                alt=""
                className="h-full w-full object-cover"
              />
            )}
            {!avatarPreview && !user?.avatar_url && (
              <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-primary">
                {user?.name?.[0] || '?'}
              </div>
            )}
            {avatarMutation.isPending && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onAvatarPick}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => fileRef.current?.click()}
            disabled={avatarMutation.isPending}
          >
            <Camera className="h-4 w-4" />
            {t('settings.changePhoto')}
          </Button>
        </div>

        <div className="min-w-0 flex-1 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="settings-name">
              {t('settings.name')}
            </label>
            <Input
              id="settings-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="max-w-md bg-card"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="settings-email">
              {t('settings.email')}
            </label>
            <Input
              id="settings-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="max-w-md bg-card"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              {t('settings.joinedOn')}{' '}
              {user?.created_at
                ? new Date(user.created_at).toLocaleDateString(dateLocale, {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })
                : '—'}
            </span>
          </div>
          {!isAdmin && user?.role && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{t('settings.yourRole')}</span>
              <Badge variant="secondary">
                <Shield className="mr-1 h-3 w-3" />
                {formatAppRole(user.role, locale)}
              </Badge>
            </div>
          )}
          <Button type="submit" disabled={profileMutation.isPending}>
            {profileMutation.isPending ? t('settings.saving') : t('settings.saveProfile')}
          </Button>
        </div>
      </div>
    </form>
  );
}

export default function SettingsPage() {
  const { user, loading, fetchUser } = useAuth();
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();
  const fileRef = useRef(null);
  const isAdmin = Boolean(user?.roles?.includes('admin'));

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState('');
  const [avatarPreview, setAvatarPreview] = useState(null);

  const profileFormKey = user ? `${user.id}|${user.email}|${user.name}` : 'guest';

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  const { data: notifPrefs, isLoading: notifPrefsLoading } = useQuery({
    queryKey: ['notifications', 'preferences'],
    queryFn: async () => (await api.get('/notifications/preferences')).data,
    enabled: Boolean(user) && !loading,
  });

  const { data: mySpecialties = [], refetch: refetchSpecialties } = useQuery({
    queryKey: ['me', 'specialties'],
    queryFn: () => api.get('/me/specialties').then((r) => r.data.specialties ?? []),
    enabled: Boolean(user) && !loading,
  });

  const [selectedSpecialtyIds, setSelectedSpecialtyIds] = useState([]);

  useEffect(() => {
    setSelectedSpecialtyIds(mySpecialties.map((s) => s.id));
  }, [mySpecialties]);

  const specialtyMutation = useMutation({
    mutationFn: (ids) => api.put('/me/specialties', { specialty_ids: ids }),
    onSuccess: () => {
      toast.success('Spécialités mises à jour.');
      refetchSpecialties();
    },
    onError: (e) => {
      toast.error(e?.response?.data?.message || 'Erreur lors de la mise à jour des spécialités.');
    },
  });

  const profileMutation = useMutation({
    mutationFn: (payload) => api.put('/me', payload),
    onSuccess: async () => {
      toast.success(t('settings.toastProfileOk'));
      await fetchUser();
      queryClient.invalidateQueries({ queryKey: ['notifications', 'preferences'] });
    },
    onError: (e) => {
      const msg =
        e?.response?.data?.message ||
        (e?.response?.data?.errors && Object.values(e.response.data.errors).flat().join(' ')) ||
        t('settings.toastProfileErr');
      toast.error(msg);
    },
  });

  const avatarMutation = useMutation({
    mutationFn: (file) => {
      const fd = new FormData();
      fd.append('avatar', file);
      return api.post('/me/avatar', fd);
    },
    onSuccess: async () => {
      toast.success(t('settings.toastAvatarOk'));
      setAvatarPreview(null);
      if (fileRef.current) fileRef.current.value = '';
      await fetchUser();
    },
    onError: (e) => {
      toast.error(e?.response?.data?.message || t('settings.toastAvatarErr'));
    },
  });

  const passwordMutation = useMutation({
    mutationFn: (payload) => api.post('/change-password', payload),
    onSuccess: () => {
      toast.success(t('settings.toastPasswordOk'));
      setCurrentPassword('');
      setNewPassword('');
      setNewPasswordConfirmation('');
    },
    onError: (e) => {
      const msg =
        e?.response?.data?.message ||
        (e?.response?.data?.errors && Object.values(e.response.data.errors).flat().join(' ')) ||
        t('settings.toastPasswordErr');
      toast.error(msg);
    },
  });

  const notifMutation = useMutation({
    mutationFn: (payload) => api.put('/notifications/preferences', payload),
    onSuccess: async () => {
      toast.success(t('settings.toastNotifOk'));
      await fetchUser();
      queryClient.invalidateQueries({ queryKey: ['notifications', 'preferences'] });
    },
    onError: (e) => {
      toast.error(e?.response?.data?.message || t('settings.toastNotifErr'));
    },
  });

  const prefsMutation = useMutation({
    mutationFn: (payload) => api.patch('/me/preferences', payload),
    onSuccess: async (_, vars) => {
      if (vars.theme != null) {
        setStoredThemeForUser(vars.theme, user?.id);
        applyAppTheme(vars.theme);
      }
      if (vars.locale != null || vars.language != null) {
        const lang = (vars.locale || vars.language) === 'en' ? 'en' : 'fr';
        document.documentElement.lang = lang;
      }
      toast.success(t('settings.toastPrefsOk'));
      await fetchUser();
      queryClient.invalidateQueries({ queryKey: ['member-dashboard'] });
    },
    onError: (e) => {
      toast.error(e?.response?.data?.message || t('settings.toastPrefsErr'));
    },
  });

  function onAvatarPick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(URL.createObjectURL(file));
    avatarMutation.mutate(file);
  }

  function onPasswordSubmit(e) {
    e.preventDefault();
    passwordMutation.mutate({
      current_password: currentPassword,
      password: newPassword,
      password_confirmation: newPasswordConfirmation,
    });
  }

  function patchNotif(partial) {
    const base = notifPrefs || {
      notify_in_app: user?.notify_in_app !== false,
      notify_email: Boolean(user?.notify_email),
      notify_type_task_assigned: user?.notify_type_task_assigned !== false,
      notify_type_comment: user?.notify_type_comment !== false,
      notify_type_task_delayed: user?.notify_type_task_delayed !== false,
    };
    notifMutation.mutate({ ...base, ...partial });
  }

  if (loading) {
    return <SettingsSkeleton />;
  }

  const themeValue = resolveThemeForUser(user);
  const localeValue = user?.locale || 'fr';

  const np = notifPrefs || {
    notify_in_app: user?.notify_in_app !== false,
    notify_email: Boolean(user?.notify_email),
    notify_type_task_assigned: user?.notify_type_task_assigned !== false,
    notify_type_comment: user?.notify_type_comment !== false,
    notify_type_task_delayed: user?.notify_type_task_delayed !== false,
  };

  return (
    <div className="space-y-8 pb-10">
      <MotionDiv
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <h1 className="text-2xl font-bold text-foreground">{t('settings.title')}</h1>
        <p className="text-muted-foreground">{t('settings.subtitle')}</p>
        <nav className="mt-4 flex flex-wrap gap-2 text-sm">
          {[
            { href: '#profil', label: t('settings.navProfile') },
            { href: '#specialites', label: 'Spécialités' },
            { href: '#securite', label: t('settings.navSecurity') },
            { href: '#notifications', label: t('settings.navNotifications') },
            { href: '#preferences', label: t('settings.navPreferences') },
          ].map(({ href, label }) => (
            <span
              key={href}
              className="rounded-full border border-border bg-card px-3 py-1 text-foreground cursor-default"
            >
              {label}
            </span>
          ))}
        </nav>
      </MotionDiv>

      <Section id="profil" title={t('settings.sectionProfile')} icon={User} delay={0.02}>
        <ProfileSection
          key={profileFormKey}
          user={user}
          isAdmin={isAdmin}
          profileMutation={profileMutation}
          avatarMutation={avatarMutation}
          fileRef={fileRef}
          avatarPreview={avatarPreview}
          onAvatarPick={onAvatarPick}
        />
      </Section>

      <Section id="specialites" title="Mes spécialités" icon={Brain} delay={0.05}>
        <div className="space-y-5">
          {/* Intro */}
          <div className="flex flex-col gap-1 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
            <p className="text-sm font-medium text-foreground">
              Quelles sont vos compétences techniques ?
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Ces spécialités permettent au système de vous recommander en priorité lors de l'assignation
              de tâches qui requièrent vos compétences.
            </p>
          </div>

          {/* Grille des spécialités */}
          <SpecialtyCardGrid
            value={selectedSpecialtyIds}
            onChange={setSelectedSpecialtyIds}
            disabled={specialtyMutation.isPending}
          />

          {/* Pied de section */}
          <div className="flex items-center justify-between border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">
              {selectedSpecialtyIds.length === 0
                ? 'Aucune spécialité sélectionnée'
                : `${selectedSpecialtyIds.length} spécialité${selectedSpecialtyIds.length > 1 ? 's' : ''} sélectionnée${selectedSpecialtyIds.length > 1 ? 's' : ''}`}
            </p>
            <Button
              type="button"
              disabled={specialtyMutation.isPending}
              onClick={() => specialtyMutation.mutate(selectedSpecialtyIds)}
              className="gap-2"
            >
              {specialtyMutation.isPending ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Enregistrement…
                </>
              ) : (
                'Enregistrer'
              )}
            </Button>
          </div>
        </div>
      </Section>

      <Section id="securite" title={t('settings.sectionSecurity')} icon={Lock} delay={0.06}>
        <div className="space-y-8">
          <form onSubmit={onPasswordSubmit} className="max-w-md space-y-4">
            <p className="text-sm text-muted-foreground">{t('settings.securityIntro')}</p>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="cur-pw">
                {t('settings.currentPassword')}
              </label>
              <Input
                id="cur-pw"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                className="bg-card"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="new-pw">
                {t('settings.newPassword')}
              </label>
              <Input
                id="new-pw"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                className="bg-card"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="new-pw2">
                {t('settings.confirmPassword')}
              </label>
              <Input
                id="new-pw2"
                type="password"
                value={newPasswordConfirmation}
                onChange={(e) => setNewPasswordConfirmation(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                className="bg-card"
              />
            </div>
            <Button type="submit" disabled={passwordMutation.isPending}>
              {passwordMutation.isPending ? t('settings.updatingPassword') : t('settings.updatePassword')}
            </Button>
          </form>
        </div>
      </Section>

      <Section id="notifications" title={t('settings.sectionNotifications')} icon={Bell} delay={0.1}>
        <div className="space-y-6 text-sm">
          {notifPrefsLoading && !notifPrefs ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('settings.notifLoading')}
            </div>
          ) : null}
          <p className="text-muted-foreground">{t('settings.notifIntro')}</p>

          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-semibold text-foreground">{t('settings.notifSectionChannels')}</h4>
              <p className="mt-1 text-xs text-muted-foreground">{t('settings.notifSectionChannelsHelp')}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-1">
              <NotificationChannelRow
                id="notif-in-app"
                icon={BellRing}
                title={t('settings.notifInApp')}
                description={t('settings.notifInAppDesc')}
                checked={np.notify_in_app}
                onChange={(e) => patchNotif({ notify_in_app: e.target.checked })}
                disabled={notifMutation.isPending || notifPrefsLoading}
              />
            </div>
          </div>

          <div className="space-y-3 border-t border-border pt-6">
            <div>
              <h4 className="text-sm font-semibold text-foreground">{t('settings.notifSectionTypes')}</h4>
              <p className="mt-1 text-xs text-muted-foreground">{t('settings.notifSectionTypesHelp')}</p>
            </div>
            <div className="grid gap-2">
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card/40 px-3 py-2.5 transition-colors hover:bg-accent/40">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border"
                  checked={np.notify_type_task_assigned}
                  onChange={(e) => patchNotif({ notify_type_task_assigned: e.target.checked })}
                  disabled={notifMutation.isPending || notifPrefsLoading}
                />
                <span>{t('settings.notifTaskAssigned')}</span>
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card/40 px-3 py-2.5 transition-colors hover:bg-accent/40">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border"
                  checked={np.notify_type_comment}
                  onChange={(e) => patchNotif({ notify_type_comment: e.target.checked })}
                  disabled={notifMutation.isPending || notifPrefsLoading}
                />
                <span>{t('settings.notifComments')}</span>
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card/40 px-3 py-2.5 transition-colors hover:bg-accent/40">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border"
                  checked={np.notify_type_task_delayed}
                  onChange={(e) => patchNotif({ notify_type_task_delayed: e.target.checked })}
                  disabled={notifMutation.isPending || notifPrefsLoading}
                />
                <span>{t('settings.notifDelayed')}</span>
              </label>
            </div>
          </div>
        </div>
      </Section>

      <Section id="preferences" title={t('settings.sectionPreferences')} icon={Settings2} delay={0.14}>
        <div className="flex flex-col gap-6 sm:max-w-lg">
          <p className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            {t('settings.prefsProfileOnlyHint')}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Globe className="h-4 w-4" />
              {t('settings.interfaceLanguage')}
            </span>
            <Select
              value={localeValue}
              onChange={(e) => prefsMutation.mutate({ locale: e.target.value })}
              className="w-44"
              disabled={prefsMutation.isPending}
            >
              <option value="fr">{t('settings.langFr')}</option>
              <option value="en">{t('settings.langEn')}</option>
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Sun className="h-4 w-4" />
              <Moon className="h-4 w-4" />
              {t('settings.theme')}
            </span>
            <Select
              value={themeValue}
              onChange={(e) => prefsMutation.mutate({ theme: e.target.value })}
              className="w-44"
              disabled={prefsMutation.isPending}
            >
              <option value="light">{t('settings.themeLight')}</option>
              <option value="dark">{t('settings.themeDark')}</option>
              <option value="system">{t('settings.themeSystem')}</option>
            </Select>
          </div>
        </div>
      </Section>

    </div>
  );
}
