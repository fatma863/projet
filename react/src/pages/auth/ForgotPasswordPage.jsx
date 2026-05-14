import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { ArrowLeft, Mail, CheckCircle2, KeyRound } from 'lucide-react';
import AuthLayout, { AuthLeftPanel } from './AuthLayout';

const forgotLeftPanel = (
  <AuthLeftPanel
    gradient="from-indigo-600 via-purple-600 to-violet-700"
    orb2Color="bg-purple-400/20"
    orb3Color="bg-indigo-300/10"
  >
    <h1 className="font-display text-4xl font-extrabold tracking-tight">TAC-TIC</h1>
    <p className="mt-2 text-lg font-medium text-white/80">Récupérez votre accès</p>
    <div className="mt-10 flex items-center justify-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-white/10 backdrop-blur-sm">
        <KeyRound className="h-12 w-12 text-white/80" />
      </div>
    </div>
  </AuthLeftPanel>
);

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) {
      setError('Veuillez saisir votre adresse e-mail.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      setSent(true);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Impossible d\'envoyer le lien de réinitialisation. Veuillez réessayer.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout leftPanel={forgotLeftPanel}>
      <div className="mb-6 text-center">
        <h2 className="font-display text-2xl font-bold tracking-tight">
          {sent ? 'E-mail envoyé' : 'Mot de passe oublié'}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {sent
            ? 'Vérifiez votre boîte de réception pour le lien de réinitialisation.'
            : 'Entrez votre adresse e-mail pour recevoir un lien de réinitialisation.'}
        </p>
      </div>

      {sent ? (
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-3 rounded-xl bg-emerald-50 px-4 py-6 dark:bg-emerald-950/20">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            <p className="text-center text-sm text-emerald-700 dark:text-emerald-400">
              Si un compte existe pour <span className="font-medium">{email}</span>, vous recevrez un e-mail avec les instructions.
            </p>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => { setSent(false); setEmail(''); }}
          >
            <Mail className="mr-2 h-4 w-4" />
            Envoyer à une autre adresse
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            <Link to="/login" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
              <ArrowLeft className="h-3.5 w-3.5" />
              Retour à la connexion
            </Link>
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Adresse e-mail</label>
            <Input
              type="email"
              autoComplete="email"
              placeholder="votre@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <Button type="submit" variant="gradient" className="w-full" disabled={loading}>
            {loading ? <Spinner size="sm" className="text-white" /> : 'Envoyer le lien'}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            <Link to="/login" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
              <ArrowLeft className="h-3.5 w-3.5" />
              Retour à la connexion
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
