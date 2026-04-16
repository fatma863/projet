import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import api from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PasswordInput, PasswordStrength } from '../../components/ui/PasswordInput';
import { Spinner } from '../../components/ui/Spinner';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const rawEmail = params.get('email') || '';
    setToken(params.get('token') || '');
    try {
      setEmail(decodeURIComponent(rawEmail));
    } catch {
      setEmail(rawEmail);
    }
  }, [params]);

  async function onSubmit(e) {
    e.preventDefault();
    if (!token || !email) {
      toast.error('Lien invalide ou incomplet. Demandez un nouvel e-mail de réinitialisation.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/auth/reset-password', {
        token,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });
      toast.success('Mot de passe réinitialisé. Vous pouvez vous connecter.');
      navigate('/login', { replace: true });
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        (err?.response?.data?.errors && Object.values(err.response.data.errors).flat().join(' ')) ||
        'Impossible de réinitialiser le mot de passe.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left decorative panel */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-purple-600 via-indigo-600 to-violet-700 lg:flex lg:w-1/2 lg:flex-col lg:items-center lg:justify-center lg:p-12">
        {/* Floating orbs */}
        <div className="animate-float absolute -left-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="animate-float absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-indigo-400/20 blur-3xl" style={{ animationDelay: '2s' }} />
        <div className="animate-float absolute left-1/2 top-1/3 h-40 w-40 rounded-full bg-purple-300/10 blur-2xl" style={{ animationDelay: '4s' }} />

        {/* Brand content */}
        <div className="relative z-10 max-w-md text-center text-white">
          <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-2xl font-black backdrop-blur-sm animate-pulse-glow">
            T
          </div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight">TAC-TIC</h1>
          <p className="mt-2 text-lg font-medium text-white/80">Réinitialisez votre mot de passe</p>

          <div className="mt-10 flex items-center justify-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-white/10 backdrop-blur-sm">
              <Lock className="h-12 w-12 text-white/80" />
            </div>
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
              <h2 className="font-display text-2xl font-bold tracking-tight">Nouveau mot de passe</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Choisissez un mot de passe sécurisé. Le lien expire après un délai limité.
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">E-mail</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Nouveau mot de passe</label>
                <PasswordInput
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="••••••••"
                />
                <PasswordStrength password={password} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Confirmer le mot de passe</label>
                <PasswordInput
                  value={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="••••••••"
                />
              </div>

              <Button type="submit" variant="gradient" className="w-full" disabled={submitting}>
                {submitting ? <Spinner size="sm" className="text-white" /> : 'Enregistrer le mot de passe'}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                <Link to="/login" className="font-medium text-primary hover:underline">
                  Retour à la connexion
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
