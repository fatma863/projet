import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/Button';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6">
      {/* Decorative orbs */}
      <div className="animate-float absolute -left-32 -top-32 h-80 w-80 rounded-full bg-indigo-400/10 blur-3xl dark:bg-indigo-400/5" />
      <div className="animate-float absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-violet-400/10 blur-3xl dark:bg-violet-400/5" style={{ animationDelay: '3s' }} />

      <div className="relative text-center">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="font-display text-7xl font-extrabold sm:text-9xl bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent"
        >
          404
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-4 font-display text-2xl font-bold text-foreground sm:text-3xl"
        >
          Page introuvable
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-3 text-muted-foreground"
        >
          Désolé, la page que vous recherchez n&apos;existe pas ou a été déplacée.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <Link to="/dashboard">
            <Button variant="gradient">
              <Home className="mr-2 h-4 w-4" /> Tableau de bord
            </Button>
          </Link>
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Retour
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
