import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { safeRedirectPath } from '../../lib/safeRedirect';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PasswordInput, PasswordStrength } from '../../components/ui/PasswordInput';
import { Spinner } from '../../components/ui/Spinner';
import { motion } from 'framer-motion';
import { Users, BarChart3, Shield } from 'lucide-react';

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
    <div className="flex min-h-screen">
      {/* Left decorative panel */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-700 lg:flex lg:w-1/2 lg:flex-col lg:items-center lg:justify-center lg:p-12">
        {/* Floating orbs */}
        <div className="animate-float absolute -left-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="animate-float absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-violet-400/20 blur-3xl" style={{ animationDelay: '2s' }} />
        <div className="animate-float absolute left-1/2 top-1/3 h-40 w-40 rounded-full bg-blue-300/10 blur-2xl" style={{ animationDelay: '4s' }} />

        {/* Brand content */}
        <div className="relative z-10 max-w-md text-center text-white">
          <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-2xl font-black backdrop-blur-sm animate-pulse-glow">
            T
          </div>
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

          <p className="mt-12 text-xs text-white/40">Propulsé par Groupe New Ways</p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex w-full items-center justify-center bg-background p-6 lg:w-1/2 lg:p-12">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          {/* Mobile brand */}
          <div className="mb-8 text-center lg:hidden">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-sm font-black text-white shadow-lg shadow-indigo-500/25">
                T
              </div>
              <span className="font-display text-xl font-bold tracking-tight">TAC-TIC</span>
            </Link>
          </div>

          <div className="rounded-2xl border-0 bg-card/80 p-8 shadow-2xl backdrop-blur-sm lg:bg-card lg:backdrop-blur-none">
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
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} TAC-TIC &mdash; Groupe New Ways
          </p>
        </motion.div>
      </div>
    </div>
  );
}
