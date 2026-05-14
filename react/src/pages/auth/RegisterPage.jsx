import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { safeRedirectPath } from '../../lib/safeRedirect';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PasswordInput, PasswordStrength } from '../../components/ui/PasswordInput';
import { Spinner } from '../../components/ui/Spinner';
import { Users, BarChart3, Shield } from 'lucide-react';
import AuthLayout, { AuthLeftPanel } from './AuthLayout';

const registerLeftPanel = (
  <AuthLeftPanel
    gradient="from-violet-600 via-indigo-600 to-blue-700"
    orb2Color="bg-violet-400/20"
    orb3Color="bg-blue-300/10"
  >
    <h1 className="font-display text-4xl font-extrabold tracking-tight">Rejoignez TAC-TIC</h1>
    <p className="mt-2 text-lg font-medium text-white/80">Votre plateforme de gestion de projets</p>
    <div className="mt-10 space-y-4 text-left">
      {[
        { icon: Users, text: 'Collaboration d\'équipe en temps réel' },
        { icon: BarChart3, text: 'Tableaux de bord & analytiques avancés' },
        { icon: Shield, text: 'Sécurité et conformité ISO' },
      ].map((item) => (
        <div key={item.text} className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm">
          <item.icon className="h-5 w-5 shrink-0 text-violet-200" />
          <span className="text-sm font-medium text-white/90">{item.text}</span>
        </div>
      ))}
    </div>
  </AuthLeftPanel>
);

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({ name: '', email: '', password: '', password_confirmation: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    const clientErrors = {};
    if (!form.name.trim()) clientErrors.name = ['Le nom est obligatoire.'];
    if (!form.email.trim()) clientErrors.email = ['L\'email est obligatoire.'];
    if (!form.password) clientErrors.password = ['Le mot de passe est obligatoire.'];
    else if (form.password.length < 8) clientErrors.password = ['Le mot de passe doit contenir au moins 8 caractères.'];
    if (form.password !== form.password_confirmation) {
      clientErrors.password_confirmation = ['La confirmation ne correspond pas.'];
    }
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      return;
    }

    setLoading(true);
    try {
      await register(form.name.trim(), form.email.trim(), form.password, form.password_confirmation);
      navigate(safeRedirectPath(searchParams.get('redirect')));
    } catch (err) {
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      } else {
        setErrors({ general: [err.response?.data?.message || 'Erreur lors de l\'inscription.'] });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout leftPanel={registerLeftPanel}>
      <div className="mb-6 text-center">
        <h2 className="font-display text-2xl font-bold tracking-tight">Créer un compte</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Rejoignez la plateforme de gestion de projets TAC-TIC
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.general && (
          <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errors.general[0]}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">Nom complet</label>
          <Input autoComplete="name" placeholder="Votre nom" value={form.name} onChange={update('name')} />
          {errors.name && <p className="text-xs text-destructive">{errors.name[0]}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Adresse e-mail</label>
          <Input type="email" autoComplete="email" placeholder="votre@email.com" value={form.email} onChange={update('email')} />
          {errors.email && <p className="text-xs text-destructive">{errors.email[0]}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Mot de passe</label>
          <PasswordInput autoComplete="new-password" placeholder="••••••••" value={form.password} onChange={update('password')} />
          <PasswordStrength password={form.password} />
          {errors.password && <p className="text-xs text-destructive">{errors.password[0]}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Confirmer le mot de passe</label>
          <PasswordInput autoComplete="new-password" placeholder="••••••••" value={form.password_confirmation} onChange={update('password_confirmation')} />
          {errors.password_confirmation && <p className="text-xs text-destructive">{errors.password_confirmation[0]}</p>}
        </div>

        <Button type="submit" variant="gradient" className="w-full" disabled={loading}>
          {loading ? <Spinner size="sm" className="text-white" /> : 'Créer mon compte'}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Déjà un compte ?{' '}
          <Link
            to={searchParams.get('redirect') ? `/login?redirect=${encodeURIComponent(searchParams.get('redirect'))}` : '/login'}
            className="font-medium text-primary hover:underline"
          >
            Se connecter
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
