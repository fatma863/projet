import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import api from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PasswordInput, PasswordStrength } from '../../components/ui/PasswordInput';
import { Spinner } from '../../components/ui/Spinner';
import { Lock } from 'lucide-react';
import AuthLayout, { AuthLeftPanel } from './AuthLayout';

const resetLeftPanel = (
  <AuthLeftPanel
    gradient="from-purple-600 via-indigo-600 to-violet-700"
    orb2Color="bg-indigo-400/20"
    orb3Color="bg-purple-300/10"
  >
    <h1 className="font-display text-4xl font-extrabold tracking-tight">TAC-TIC</h1>
    <p className="mt-2 text-lg font-medium text-white/80">Réinitialisez votre mot de passe</p>
    <div className="mt-10 flex items-center justify-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-white/10 backdrop-blur-sm">
        <Lock className="h-12 w-12 text-white/80" />
      </div>
    </div>
  </AuthLeftPanel>
);

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
    <AuthLayout leftPanel={resetLeftPanel}>
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
    </AuthLayout>
  );
}
