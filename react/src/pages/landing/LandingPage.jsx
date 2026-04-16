import { Link } from 'react-router-dom';
import { useRef, useState, useEffect } from 'react';
import { motion, useInView } from 'framer-motion';
import { Button } from '../../components/ui/Button';
import {
  FolderKanban, Brain, CalendarRange, Users, BarChart3,
  ArrowRight, Shield, Globe, Smartphone, Network, Award,
  CheckCircle2, Star, MapPin, Mail, Phone, ChevronRight,
} from 'lucide-react';

/* ── Animated section wrapper ─────────────────────────────────────────────── */
function AnimatedSection({ children, className = '', delay = 0 }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.6, ease: 'easeOut', delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Animated counter ─────────────────────────────────────────────────────── */
function AnimatedNumber({ value, suffix = '' }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(0);
  const numericValue = parseInt(value, 10);

  useEffect(() => {
    if (!isInView || isNaN(numericValue)) return;
    let start = 0;
    const duration = 1500;
    const startTime = performance.now();
    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      start = Math.round(eased * numericValue);
      setDisplay(start);
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }, [isInView, numericValue]);

  if (isNaN(numericValue)) {
    return <span ref={ref}>{value}</span>;
  }
  return <span ref={ref}>{display}{suffix}</span>;
}

/* ── Feature cards ─────────────────────────────────────────────────────────── */
const features = [
  {
    icon: FolderKanban,
    title: 'Tableau Kanban',
    description: 'Organisez vos tâches avec un tableau Kanban intuitif. Glissez-déposez pour changer le statut en temps réel.',
    gradient: 'from-indigo-500 to-cyan-400',
  },
  {
    icon: CalendarRange,
    title: 'Diagramme de Gantt',
    description: 'Visualisez la chronologie, le chemin critique et les dépendances de vos projets.',
    gradient: 'from-emerald-500 to-teal-400',
  },
  {
    icon: Brain,
    title: 'Intelligence Artificielle',
    description: 'Estimation de durée, détection de risques, optimisation des assignations et assistant IA conversationnel.',
    gradient: 'from-violet-500 to-purple-400',
  },
  {
    icon: Users,
    title: 'Gestion d\'équipes',
    description: 'Équipes, rôles, compétences, charge de travail — tout centralisé pour une collaboration fluide.',
    gradient: 'from-amber-500 to-orange-400',
  },
  {
    icon: BarChart3,
    title: 'Tableaux de bord',
    description: 'Métriques en temps réel, progression, risques et productivité sur des dashboards personnalisés.',
    gradient: 'from-rose-500 to-pink-400',
  },
  {
    icon: Shield,
    title: 'Sécurité & Permissions',
    description: 'Authentification sécurisée, gestion de rôles granulaire et contrôle d\'accès par projet.',
    gradient: 'from-cyan-500 to-indigo-400',
  },
];

/* ── Services TAC-TIC ──────────────────────────────────────────────────────── */
const services = [
  {
    icon: Globe,
    title: 'Développement Web & Mobile',
    description: 'Applications web et mobiles sur-mesure, de la conception à la mise en production, avec les technologies les plus modernes.',
    gradient: 'from-indigo-600 to-violet-500',
  },
  {
    icon: Network,
    title: 'Réseaux & Télécommunications',
    description: 'Infrastructures IP/MPLS, consulting télécom et solutions réseau adaptées à vos besoins d\'entreprise.',
    gradient: 'from-emerald-600 to-cyan-500',
  },
  {
    icon: Smartphone,
    title: 'Transformation Digitale',
    description: 'Accompagnement stratégique dans votre transition numérique : audit, intégration et conduite du changement.',
    gradient: 'from-violet-600 to-purple-500',
  },
];

/* ── Client testimonials ───────────────────────────────────────────────────── */
const testimonials = [
  {
    company: 'Ooredoo Tunisie',
    contact: 'Mr Hedi DELLAGI',
    quote: 'Pleine satisfaction sur la qualité, les délais et le respect du cahier des charges.',
  },
  {
    company: 'INRAP',
    contact: 'Dr Mohamed HAMMAMI',
    quote: 'Équipe experte, professionnelle et toujours à l\'écoute de nos besoins.',
  },
  {
    company: 'Advice Engineering',
    contact: 'Mr Mezen KANDIL',
    quote: 'Service rapide, qualité irréprochable et une réactivité exemplaire.',
  },
  {
    company: 'Mission Excellence',
    contact: 'Mr Mohamed SBOUI',
    quote: 'Travail d\'équipe remarquable, qualité et livraison dans les délais.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Navbar ──────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-sm font-black text-white shadow-md shadow-indigo-500/25 animate-pulse-glow">
              T
            </div>
            <div className="flex flex-col">
              <span className="font-display text-base font-bold leading-tight tracking-tight">TAC-TIC</span>
              <span className="hidden text-[10px] font-medium leading-tight text-muted-foreground sm:block">Groupe New Ways</span>
            </div>
          </Link>

          <div className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
            {['services', 'features', 'clients', 'contact'].map((id) => (
              <a
                key={id}
                href={`#${id}`}
                className="relative py-1 transition-colors hover:text-foreground after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-primary after:transition-all after:duration-300 hover:after:w-full"
              >
                {id === 'services' ? 'Services' : id === 'features' ? 'Fonctionnalités' : id === 'clients' ? 'Clients' : 'Contact'}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost" className="text-sm">Connexion</Button>
            </Link>
            <Link to="/register">
              <Button variant="gradient" className="text-sm">
                Commencer <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-indigo-50 via-background to-violet-50/50 dark:from-indigo-950/30 dark:via-background dark:to-violet-950/20" />
        <div className="animate-float absolute -right-48 -top-48 -z-10 h-96 w-96 rounded-full bg-indigo-400/10 blur-3xl dark:bg-indigo-400/5" />
        <div className="animate-float absolute -bottom-32 -left-32 -z-10 h-80 w-80 rounded-full bg-violet-400/10 blur-3xl dark:bg-violet-400/5" style={{ animationDelay: '3s' }} />

        <div className="mx-auto max-w-7xl px-6 py-20 sm:py-28 lg:py-36">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="mx-auto max-w-3xl text-center"
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-200/60 bg-indigo-50 px-4 py-1.5 text-sm font-semibold text-indigo-700 dark:border-indigo-800/60 dark:bg-indigo-950/50 dark:text-indigo-300">
              <Award className="h-4 w-4" /> ISO 27001 & 9001 certifié
            </div>
            <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Gérez vos projets avec{' '}
              <span className="animate-gradient bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 bg-clip-text text-transparent dark:from-indigo-400 dark:via-violet-400 dark:to-indigo-400">
                précision et intelligence
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
              La plateforme de gestion de projets propulsée par l&apos;IA. Planification, collaboration et suivi en temps réel pour des équipes performantes.
            </p>
            <p className="mt-3 text-sm font-medium italic text-muted-foreground/80">
              &laquo; Quel que soit votre rêve… Considérez-le réalisé ! &raquo;
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link to="/register">
                <Button variant="gradient" size="lg" className="px-8 text-base">
                  Démarrer gratuitement <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <a href="#features">
                <Button variant="outline" size="lg" className="px-8 text-base">
                  Découvrir les fonctionnalités
                </Button>
              </a>
            </div>
          </motion.div>

          {/* Stats bar */}
          <AnimatedSection className="mx-auto mt-20 grid max-w-3xl grid-cols-2 gap-6 sm:grid-cols-4" delay={0.3}>
            {[
              { value: '12', suffix: '+', label: 'Années d\'expérience' },
              { value: 'ISO 27001', label: 'Sécurité de l\'information' },
              { value: 'ISO 9001', label: 'Management qualité' },
              { value: '100', suffix: '+', label: 'Projets livrés' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
                  {stat.suffix ? <AnimatedNumber value={stat.value} suffix={stat.suffix} /> : stat.value}
                </p>
                <p className="mt-1 text-xs font-medium text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </AnimatedSection>
        </div>
      </section>

      {/* ── Services TAC-TIC ───────────────────────────────────────────────── */}
      <section id="services" className="border-t border-border/60 bg-muted/30 py-20 dark:bg-muted/10">
        <div className="mx-auto max-w-7xl px-6">
          <AnimatedSection className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Nos services</p>
            <h2 className="font-display mt-2 text-3xl font-bold sm:text-4xl">
              L&apos;expertise TAC-TIC à votre service
            </h2>
            <p className="mt-4 text-muted-foreground">
              Depuis 2012, nous accompagnons les entreprises dans leur transformation digitale avec des solutions sur-mesure.
            </p>
          </AnimatedSection>

          <div className="mt-14 grid gap-8 lg:grid-cols-3">
            {services.map((svc, i) => (
              <AnimatedSection key={svc.title} delay={i * 0.15}>
                <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/5 dark:hover:shadow-indigo-500/10">
                  <div className={`mb-5 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${svc.gradient} text-white shadow-lg`}>
                    <svc.icon className="h-7 w-7" />
                  </div>
                  <h3 className="mb-3 text-xl font-bold">{svc.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{svc.description}</p>
                  <div className={`absolute -bottom-1 left-0 h-1 w-full bg-gradient-to-r ${svc.gradient} opacity-0 transition-opacity group-hover:opacity-100`} />
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── Platform Features ──────────────────────────────────────────────── */}
      <section id="features" className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <AnimatedSection className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Fonctionnalités</p>
            <h2 className="font-display mt-2 text-3xl font-bold sm:text-4xl">
              Tout ce dont vous avez besoin
            </h2>
            <p className="mt-4 text-muted-foreground">
              Des outils puissants pour planifier, suivre et optimiser vos projets d&apos;équipe.
            </p>
          </AnimatedSection>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => (
              <AnimatedSection key={feature.title} delay={i * 0.1}>
                <div className="group rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-500/5 dark:hover:shadow-indigo-500/10">
                  <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${feature.gradient} text-white shadow-md`}>
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mb-2 text-lg font-bold">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────────────── */}
      <section className="border-t border-border/60 bg-muted/30 py-20 dark:bg-muted/10">
        <div className="mx-auto max-w-7xl px-6">
          <AnimatedSection className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold">Comment ça marche ?</h2>
            <p className="mt-3 text-muted-foreground">Démarrez en 3 étapes simples</p>
          </AnimatedSection>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {[
              { step: '1', title: 'Créez votre projet', desc: 'Définissez le périmètre, l\'équipe et les jalons de votre projet.' },
              { step: '2', title: 'Organisez les tâches', desc: 'Ajoutez des tâches, assignez-les, suivez la progression en Kanban ou Gantt.' },
              { step: '3', title: 'Analysez avec l\'IA', desc: 'Obtenez des estimations, détectez les risques et optimisez votre charge.' },
            ].map((item, i) => (
              <AnimatedSection key={item.step} delay={i * 0.2} className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-2xl font-bold text-white shadow-lg shadow-indigo-500/25">
                  {item.step}
                </div>
                <h3 className="mb-2 text-lg font-bold">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── Certifications ─────────────────────────────────────────────────── */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <AnimatedSection className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Certifications</p>
            <h2 className="font-display mt-2 text-3xl font-bold">Qualité et confiance certifiées</h2>
          </AnimatedSection>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'ISO 27001', desc: 'Sécurité de l\'information', icon: Shield },
              { label: 'ISO 9001', desc: 'Management de la qualité', icon: Award },
              { label: 'VMware Partner', desc: 'Partenaire technologique', icon: CheckCircle2 },
              { label: 'Red Hat Partner', desc: 'Solutions open source', icon: CheckCircle2 },
            ].map((cert, i) => (
              <AnimatedSection key={cert.label} delay={i * 0.1}>
                <div className="flex flex-col items-center rounded-2xl border border-border bg-card p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                    <cert.icon className="h-6 w-6" />
                  </div>
                  <p className="font-bold">{cert.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{cert.desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

     

      {/* ── CTA Section ────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-700 py-20">
        <div className="animate-float absolute -left-24 -top-24 h-64 w-64 rounded-full bg-white/5 blur-2xl" />
        <div className="animate-float absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-white/5 blur-2xl" style={{ animationDelay: '2s' }} />
        <AnimatedSection className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">Prêt à transformer votre gestion de projets ?</h2>
          <p className="mt-4 text-lg text-indigo-100">
            Rejoignez les entreprises qui font confiance à TAC-TIC pour livrer leurs projets dans les délais et avec qualité.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/register">
              <Button size="lg" className="bg-white px-8 text-base font-bold text-indigo-700 shadow-xl hover:bg-indigo-50 active:scale-[0.97]">
                Démarrer maintenant <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="border-white/30 px-8 text-base text-white hover:bg-white/10">
                Se connecter
              </Button>
            </Link>
          </div>
        </AnimatedSection>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer id="contact" className="border-t border-border bg-card">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-xs font-black text-white">
                  T
                </div>
                <span className="font-display text-sm font-bold">TAC-TIC</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Filiale de Groupe New Ways. Ingénierie informatique, réseaux et transformation digitale depuis 2012.
              </p>
            </div>

            {/* Platform */}
            <div>
              <h4 className="mb-3 text-sm font-bold">Plateforme</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="transition-colors hover:text-foreground">Fonctionnalités</a></li>
                <li><a href="#services" className="transition-colors hover:text-foreground">Services</a></li>
                <li><a href="#clients" className="transition-colors hover:text-foreground">Clients</a></li>
              </ul>
            </div>

            {/* Certifications */}
            <div>
              <h4 className="mb-3 text-sm font-bold">Certifications</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> ISO 27001</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> ISO 9001</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> VMware Partner</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Red Hat Partner</li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="mb-3 text-sm font-bold">Contact</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>Technoparc El Ghazala, Bât. I3, 1er étage, 2088 Ariana, Tunisie</span>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0" />
                  <a href="tel:+21636365558" className="transition-colors hover:text-foreground">+216 36 365 558</a>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 shrink-0" />
                  <a href="mailto:contact@tac-tic.net" className="transition-colors hover:text-foreground">contact@tac-tic.net</a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 sm:flex-row">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} TAC-TIC &mdash; Filiale de Groupe New Ways. Tous droits réservés.
            </p>
            <a href="https://www.tac-tic.net" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
              www.tac-tic.net
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
