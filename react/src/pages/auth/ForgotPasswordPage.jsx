import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { motion } from 'framer-motion';
import { ArrowLeft, Mail, CheckCircle2, KeyRound } from 'lucide-react';

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
    <div className="flex min-h-screen">
      {/* Left decorative panel */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-700 lg:flex lg:w-1/2 lg:flex-col lg:items-center lg:justify-center lg:p-12">
        {/* Floating orbs */}
        <div className="animate-float absolute -left-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="animate-float absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-purple-400/20 blur-3xl" style={{ animationDelay: '2s' }} />
        <div className="animate-float absolute left-1/2 top-1/3 h-40 w-40 rounded-full bg-indigo-300/10 blur-2xl" style={{ animationDelay: '4s' }} />

        {/* Brand content */}
        <div className="relative z-10 max-w-md text-center text-white">
          <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-2xl font-black backdrop-blur-sm animate-pulse-glow">
            T
          </div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight">TAC-TIC</h1>
          <p className="mt-2 text-lg font-medium text-white/80">Récupérez votre accès</p>

          <div className="mt-10 flex items-center justify-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-white/10 backdrop-blur-sm">
              <KeyRound className="h-12 w-12 text-white/80" />
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
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} TAC-TIC &mdash; Groupe New Ways
          </p>
        </motion.div>
      </div>
    </div>
  );
}
