<?php

namespace Database\Seeders;

use App\Models\Project;
use App\Models\Specialty;
use App\Models\Sprint;
use App\Models\Task;
use App\Models\TaskComment;
use App\Models\TaskStatus;
use App\Models\Team;
use App\Models\TimeEntry;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Ajoute 9 projets réalistes sans supprimer les données existantes.
 */
class AdditionalProjectsSeeder extends Seeder
{
    private array $sp = [];

    public function run(): void
    {
        // Charger les spécialités en cache
        foreach (Specialty::all() as $s) {
            $this->sp[$s->name] = $s->id;
        }

        // Utilisateurs existants
        $admin  = User::find(1);
        $ahmed  = User::find(2);
        $sami   = User::find(3);
        $ines   = User::find(4);
        $mohamed = User::find(5);
        $leila  = User::find(6);
        $karim  = User::find(7);
        $sonia  = User::find(8);
        $wajdi  = User::find(9);

        // Équipes existantes
        $teamWeb    = Team::find(1);
        $teamMobile = Team::find(2);
        $teamData   = Team::find(3);

        $this->command?->info('📦 Création de 9 projets supplémentaires…');

        $this->seedCRM($teamWeb, $admin, $sami, $ahmed, $wajdi, $sonia);
        $this->seedSecureVault($teamWeb, $admin, $sami, $ines, $wajdi);
        $this->seedEduLearn($teamMobile, $admin, $leila, $ines, $mohamed, $sonia);
        $this->seedSmartRH($teamWeb, $admin, $ahmed, $ines, $mohamed, $wajdi);
        $this->seedCityMap($teamData, $admin, $karim, $mohamed, $ahmed);
        $this->seedFinTrack($teamMobile, $admin, $leila, $ines, $wajdi);
        $this->seedHotelPro($teamWeb, $admin, $sami, $ines, $ahmed, $sonia);
        $this->seedStockMaster($teamWeb, $admin, $wajdi, $mohamed, $sami);
        $this->seedCloudDeploy($teamData, $admin, $karim, $wajdi, $sami);

        $this->command?->info('✅ 9 projets créés avec succès.');
    }

    // ─────────────────────────────────────────────────────────────
    // 1. CRM — Gestion Relation Client
    // ─────────────────────────────────────────────────────────────
    private function seedCRM(Team $team, User $admin, User $sami, User $ahmed, User $wajdi, User $sonia): void
    {
        $p = Project::create([
            'code' => 'CRM', 'team_id' => $team->id,
            'name' => 'CRM — Gestion Relation Client',
            'description' => 'Système CRM complet pour la gestion des contacts, opportunités commerciales, pipeline de ventes, suivi des interactions clients et tableaux de bord analytiques.',
            'status' => 'active', 'priority' => 'high',
            'start_date' => '2026-01-15', 'end_date' => '2026-07-31',
            'owner_id' => $admin->id, 'created_by' => $admin->id,
        ]);
        $p->members()->attach([
            $admin->id  => ['project_role' => 'admin'],
            $sami->id   => ['project_role' => 'admin'],
            $ahmed->id  => ['project_role' => 'member'],
            $wajdi->id  => ['project_role' => 'member'],
            $sonia->id  => ['project_role' => 'member'],
        ]);

        [$sTodo, $sProg, $sRev, $sDone] = $this->createStandardStatuses($p->id);

        $sp1 = Sprint::create(['project_id' => $p->id, 'name' => 'Sprint 1 — Core CRM',
            'goal' => 'Gestion contacts et entreprises.', 'status' => 'completed',
            'start_date' => '2026-01-15', 'end_date' => '2026-01-31',
            'started_at' => '2026-01-15', 'ended_at' => '2026-01-31']);
        $sp2 = Sprint::create(['project_id' => $p->id, 'name' => 'Sprint 2 — Pipeline Ventes',
            'goal' => 'Opportunités, pipeline Kanban, prévisions.', 'status' => 'active',
            'start_date' => '2026-02-01', 'end_date' => '2026-02-28', 'started_at' => '2026-02-01']);
        $sp3 = Sprint::create(['project_id' => $p->id, 'name' => 'Sprint 3 — Analytiques',
            'goal' => 'Tableaux de bord, rapports, exports.', 'status' => 'planned',
            'start_date' => '2026-03-01', 'end_date' => '2026-03-31']);

        $tasks = [
            ['title' => 'Modèle de données contacts & entreprises', 'description' => 'Migrations: contacts, companies, leads, deals, activities. Relations Eloquent et API CRUD.', 'status_id' => $sDone->id, 'sprint_id' => $sp1->id, 'priority' => 'urgent', 'story_points' => 8, 'estimated_hours' => 20, 'actual_hours' => 18, 'progress_percent' => 100, 'workflow_status' => 'done', 'planned_start' => '2026-01-15', 'planned_end' => '2026-01-22', 'due_date' => '2026-01-22', 'created_by' => $admin->id, 'assignees' => [$sami->id], 'specialties' => $this->sps(['Backend'])],
            ['title' => 'Interface liste & fiche contact', 'description' => 'Table contacts avec filtres avancés, vue fiche avec timeline interactions, notes, tags.', 'status_id' => $sDone->id, 'sprint_id' => $sp1->id, 'priority' => 'high', 'story_points' => 5, 'estimated_hours' => 14, 'actual_hours' => 13, 'progress_percent' => 100, 'workflow_status' => 'done', 'planned_start' => '2026-01-18', 'planned_end' => '2026-01-28', 'due_date' => '2026-01-28', 'created_by' => $sami->id, 'assignees' => [$wajdi->id], 'specialties' => $this->sps(['Frontend', 'Design / UX'])],
            ['title' => 'Import contacts — CSV & vCard', 'description' => 'Import en masse via CSV, mapping colonnes dynamique, dédoublonnage, rapport d\'erreurs.', 'status_id' => $sDone->id, 'sprint_id' => $sp1->id, 'priority' => 'medium', 'story_points' => 3, 'estimated_hours' => 10, 'actual_hours' => 11, 'progress_percent' => 100, 'workflow_status' => 'done', 'planned_start' => '2026-01-22', 'planned_end' => '2026-01-31', 'due_date' => '2026-01-31', 'created_by' => $ahmed->id, 'assignees' => [$ahmed->id], 'specialties' => $this->sps(['Backend'])],
            ['title' => 'Pipeline commercial — Kanban deals', 'description' => 'Board Kanban pour opportunités, drag & drop étapes (prospection→négociation→gagné/perdu), valeur pondérée.', 'status_id' => $sProg->id, 'sprint_id' => $sp2->id, 'priority' => 'urgent', 'story_points' => 8, 'estimated_hours' => 18, 'actual_hours' => 9, 'progress_percent' => 55, 'workflow_status' => 'in_progress', 'planned_start' => '2026-02-01', 'planned_end' => '2026-02-14', 'due_date' => '2026-02-14', 'created_by' => $admin->id, 'assignees' => [$sami->id], 'specialties' => $this->sps(['Backend', 'Frontend'])],
            ['title' => 'Agenda & rappels automatiques', 'description' => 'Intégration calendrier, rappels email/SMS, tâches de suivi, synchronisation Google Calendar.', 'status_id' => $sProg->id, 'sprint_id' => $sp2->id, 'priority' => 'high', 'story_points' => 5, 'estimated_hours' => 16, 'actual_hours' => 7, 'progress_percent' => 45, 'workflow_status' => 'in_progress', 'planned_start' => '2026-02-08', 'planned_end' => '2026-02-22', 'due_date' => '2026-02-22', 'created_by' => $sami->id, 'assignees' => [$wajdi->id], 'specialties' => $this->sps(['Backend', 'Frontend'])],
            ['title' => 'Tableau de bord commercial', 'description' => 'KPIs ventes: taux conversion, revenus pipeline, performance équipe, graphiques temporels.', 'status_id' => $sTodo->id, 'sprint_id' => $sp3->id, 'priority' => 'high', 'story_points' => 8, 'estimated_hours' => 22, 'progress_percent' => 0, 'workflow_status' => 'todo', 'planned_start' => '2026-03-01', 'planned_end' => '2026-03-15', 'due_date' => '2026-03-15', 'created_by' => $admin->id, 'assignees' => [$wajdi->id], 'specialties' => $this->sps(['Frontend', 'Data / BI'])],
            ['title' => 'Rapports & exports PDF/Excel', 'description' => 'Générateur de rapports personnalisables, planification envoi automatique, export multi-formats.', 'status_id' => $sTodo->id, 'sprint_id' => $sp3->id, 'priority' => 'medium', 'story_points' => 5, 'estimated_hours' => 14, 'progress_percent' => 0, 'workflow_status' => 'todo', 'planned_start' => '2026-03-15', 'planned_end' => '2026-03-28', 'due_date' => '2026-03-28', 'created_by' => $ahmed->id, 'assignees' => [$ahmed->id], 'specialties' => $this->sps(['Backend'])],
            ['title' => 'Tests fonctionnels CRM', 'description' => 'Suite Pest PHP pour API, tests Playwright pour UI, couverture > 80%.', 'status_id' => $sTodo->id, 'priority' => 'medium', 'story_points' => 3, 'estimated_hours' => 12, 'progress_percent' => 0, 'workflow_status' => 'todo', 'planned_start' => '2026-04-01', 'planned_end' => '2026-04-10', 'due_date' => '2026-04-10', 'created_by' => $admin->id, 'assignees' => [$sonia->id], 'specialties' => $this->sps(['QA / Tests'])],
        ];
        $c = $this->makeTasks($p->id, $admin->id, $tasks);
        $this->dep($c, 1, 0); $this->dep($c, 3, 0); $this->dep($c, 4, 3); $this->dep($c, 5, 3); $this->dep($c, 6, 5); $this->dep($c, 7, 5);
        $this->cmt($c[0], $sami->id, 'Modèle de données validé. 6 tables, relations polymorphiques pour les activités.');
        $this->cmt($c[3], $sami->id, 'Pipeline Kanban à 55% — les étapes et le drag&drop fonctionnent, la valorisation pondérée est en cours.');
        $this->time($c[0], $sami->id, '2026-01-15', 480, 'Migrations contacts et entreprises');
        $this->time($c[1], $wajdi->id, '2026-01-18', 420, 'Interface liste contacts, filtres');
        $this->time($c[3], $sami->id, '2026-02-01', 360, 'Board Kanban drag & drop');
    }

    // ─────────────────────────────────────────────────────────────
    // 2. SecureVault — Gestionnaire de mots de passe
    // ─────────────────────────────────────────────────────────────
    private function seedSecureVault(Team $team, User $admin, User $sami, User $ines, User $wajdi): void
    {
        $p = Project::create([
            'code' => 'SVLT', 'team_id' => $team->id,
            'name' => 'SecureVault — Gestionnaire de mots de passe',
            'description' => 'Application web et mobile de gestion sécurisée de mots de passe : coffre-fort chiffré AES-256, générateur, authentification 2FA, partage sécurisé en équipe.',
            'status' => 'active', 'priority' => 'high',
            'start_date' => '2026-02-01', 'end_date' => '2026-06-30',
            'owner_id' => $sami->id, 'created_by' => $admin->id,
        ]);
        $p->members()->attach([
            $admin->id => ['project_role' => 'admin'],
            $sami->id  => ['project_role' => 'admin'],
            $ines->id  => ['project_role' => 'member'],
            $wajdi->id => ['project_role' => 'member'],
        ]);

        [$sTodo, $sProg, $sRev, $sDone] = $this->createStandardStatuses($p->id);

        $sp1 = Sprint::create(['project_id' => $p->id, 'name' => 'Sprint 1 — Chiffrement & Auth',
            'goal' => 'Core cryptographique et authentification renforcée.', 'status' => 'completed',
            'start_date' => '2026-02-01', 'end_date' => '2026-02-21',
            'started_at' => '2026-02-01', 'ended_at' => '2026-02-21']);
        $sp2 = Sprint::create(['project_id' => $p->id, 'name' => 'Sprint 2 — Coffre & Interface',
            'goal' => 'Gestion entrées, générateur, interface.', 'status' => 'active',
            'start_date' => '2026-02-22', 'end_date' => '2026-03-14', 'started_at' => '2026-02-22']);

        $tasks = [
            ['title' => 'Module chiffrement AES-256-GCM', 'description' => 'Implémentation PHP du chiffrement côté serveur, dérivation clé PBKDF2, zero-knowledge architecture.', 'status_id' => $sDone->id, 'sprint_id' => $sp1->id, 'priority' => 'urgent', 'story_points' => 13, 'estimated_hours' => 28, 'actual_hours' => 30, 'progress_percent' => 100, 'workflow_status' => 'done', 'planned_start' => '2026-02-01', 'planned_end' => '2026-02-10', 'due_date' => '2026-02-10', 'created_by' => $sami->id, 'assignees' => [$sami->id], 'specialties' => $this->sps(['Backend', 'Sécurité'])],
            ['title' => 'Authentification 2FA (TOTP + WebAuthn)', 'description' => 'Intégration TOTP (Google Authenticator), clés de sécurité WebAuthn/FIDO2, codes de secours.', 'status_id' => $sDone->id, 'sprint_id' => $sp1->id, 'priority' => 'urgent', 'story_points' => 8, 'estimated_hours' => 18, 'actual_hours' => 20, 'progress_percent' => 100, 'workflow_status' => 'done', 'planned_start' => '2026-02-08', 'planned_end' => '2026-02-18', 'due_date' => '2026-02-18', 'created_by' => $sami->id, 'assignees' => [$sami->id], 'specialties' => $this->sps(['Backend', 'Sécurité'])],
            ['title' => 'Interface coffre-fort — CRUD entrées', 'description' => 'Création/édition/suppression entrées (logins, cartes, notes sécurisées), icônes favicons, tags, dossiers.', 'status_id' => $sProg->id, 'sprint_id' => $sp2->id, 'priority' => 'high', 'story_points' => 8, 'estimated_hours' => 20, 'actual_hours' => 12, 'progress_percent' => 60, 'workflow_status' => 'in_progress', 'planned_start' => '2026-02-22', 'planned_end' => '2026-03-05', 'due_date' => '2026-03-05', 'created_by' => $admin->id, 'assignees' => [$ines->id], 'specialties' => $this->sps(['Frontend', 'Design / UX'])],
            ['title' => 'Générateur de mots de passe avancé', 'description' => 'Générateur configurable (longueur, complexité, passphrase), intégration HIBP pour vérification fuite.', 'status_id' => $sProg->id, 'sprint_id' => $sp2->id, 'priority' => 'high', 'story_points' => 5, 'estimated_hours' => 10, 'actual_hours' => 5, 'progress_percent' => 50, 'workflow_status' => 'in_progress', 'planned_start' => '2026-02-25', 'planned_end' => '2026-03-06', 'due_date' => '2026-03-06', 'created_by' => $sami->id, 'assignees' => [$wajdi->id], 'specialties' => $this->sps(['Frontend', 'Sécurité'])],
            ['title' => 'Extension navigateur (Chrome/Firefox)', 'description' => 'Extension Manifest V3, remplissage auto formulaires, détection domaine, sync coffre.', 'status_id' => $sTodo->id, 'priority' => 'high', 'story_points' => 13, 'estimated_hours' => 32, 'progress_percent' => 0, 'workflow_status' => 'todo', 'planned_start' => '2026-03-15', 'planned_end' => '2026-04-05', 'due_date' => '2026-04-05', 'created_by' => $sami->id, 'assignees' => [$wajdi->id], 'specialties' => $this->sps(['Frontend'])],
            ['title' => 'Partage sécurisé en équipe', 'description' => 'Partage entrées via chiffrement asymétrique RSA, gestion permissions (lecture/écriture), révocation.', 'status_id' => $sTodo->id, 'priority' => 'medium', 'story_points' => 8, 'estimated_hours' => 20, 'progress_percent' => 0, 'workflow_status' => 'todo', 'planned_start' => '2026-04-06', 'planned_end' => '2026-04-20', 'due_date' => '2026-04-20', 'created_by' => $sami->id, 'assignees' => [$sami->id], 'specialties' => $this->sps(['Backend', 'Sécurité'])],
            ['title' => 'Audit de sécurité & pentest', 'description' => 'Analyse statique SAST, test d\'intrusion, rapport OWASP, correction vulnérabilités.', 'status_id' => $sTodo->id, 'priority' => 'urgent', 'story_points' => 8, 'estimated_hours' => 24, 'progress_percent' => 0, 'workflow_status' => 'todo', 'planned_start' => '2026-05-01', 'planned_end' => '2026-05-15', 'due_date' => '2026-05-15', 'created_by' => $admin->id, 'assignees' => [$sami->id], 'specialties' => $this->sps(['Sécurité'])],
        ];
        $c = $this->makeTasks($p->id, $admin->id, $tasks);
        $this->dep($c, 1, 0); $this->dep($c, 2, 1); $this->dep($c, 3, 2); $this->dep($c, 5, 2); $this->dep($c, 6, 5);
        $this->cmt($c[0], $sami->id, 'Architecture zero-knowledge validée. La clé maître ne transite jamais en clair côté serveur.');
        $this->cmt($c[1], $sami->id, 'TOTP opérationnel. WebAuthn testé avec YubiKey 5. Codes de secours générés avec entropie CSPRNG.');
        $this->cmt($c[2], $ines->id, 'Interface à 60%, les dossiers et la recherche instantanée sont fonctionnels.');
        $this->time($c[0], $sami->id, '2026-02-01', 480, 'Impl crypto AES-256-GCM, PBKDF2');
        $this->time($c[1], $sami->id, '2026-02-08', 480, 'TOTP setup, WebAuthn enregistrement');
        $this->time($c[2], $ines->id, '2026-02-22', 420, 'Composants UI coffre-fort');
    }

    // ─────────────────────────────────────────────────────────────
    // 3. EduLearn — Plateforme e-learning
    // ─────────────────────────────────────────────────────────────
    private function seedEduLearn(Team $team, User $admin, User $leila, User $ines, User $mohamed, User $sonia): void
    {
        $p = Project::create([
            'code' => 'EDUL', 'team_id' => $team->id,
            'name' => 'EduLearn — Plateforme e-learning',
            'description' => 'Plateforme d\'apprentissage en ligne : création de cours vidéo, quiz interactifs, certificats, suivi progression apprenant, forum discussion et système de gamification.',
            'status' => 'active', 'priority' => 'medium',
            'start_date' => '2026-01-01', 'end_date' => '2026-09-30',
            'owner_id' => $leila->id, 'created_by' => $admin->id,
        ]);
        $p->members()->attach([
            $admin->id   => ['project_role' => 'admin'],
            $leila->id   => ['project_role' => 'admin'],
            $ines->id    => ['project_role' => 'member'],
            $mohamed->id => ['project_role' => 'member'],
            $sonia->id   => ['project_role' => 'member'],
        ]);

        $sTodo = TaskStatus::create(['project_id' => $p->id, 'name' => 'Backlog',    'color' => '#6B7280', 'order' => 0, 'is_default' => true]);
        $sProg = TaskStatus::create(['project_id' => $p->id, 'name' => 'En cours',   'color' => '#3B82F6', 'order' => 1]);
        $sTest = TaskStatus::create(['project_id' => $p->id, 'name' => 'En test',    'color' => '#F59E0B', 'order' => 2]);
        $sDone = TaskStatus::create(['project_id' => $p->id, 'name' => 'Livré',      'color' => '#10B981', 'order' => 3]);

        $sp1 = Sprint::create(['project_id' => $p->id, 'name' => 'Sprint 1 — Socle & Cours',
            'goal' => 'Création et lecture de cours.', 'status' => 'completed',
            'start_date' => '2026-01-01', 'end_date' => '2026-01-31',
            'started_at' => '2026-01-01', 'ended_at' => '2026-01-31']);
        $sp2 = Sprint::create(['project_id' => $p->id, 'name' => 'Sprint 2 — Interactivité',
            'goal' => 'Quiz, progression, certificats.', 'status' => 'completed',
            'start_date' => '2026-02-01', 'end_date' => '2026-02-28',
            'started_at' => '2026-02-01', 'ended_at' => '2026-02-28']);
        $sp3 = Sprint::create(['project_id' => $p->id, 'name' => 'Sprint 3 — Gamification',
            'goal' => 'Points, badges, classement, forum.', 'status' => 'active',
            'start_date' => '2026-03-01', 'end_date' => '2026-03-31', 'started_at' => '2026-03-01']);

        $tasks = [
            ['title' => 'Système de gestion des cours (LMS core)', 'description' => 'CRUD cours, sections, leçons vidéo/texte, ressources téléchargeables, prérequis, tarification.', 'status_id' => $sDone->id, 'sprint_id' => $sp1->id, 'priority' => 'urgent', 'story_points' => 13, 'estimated_hours' => 32, 'actual_hours' => 30, 'progress_percent' => 100, 'workflow_status' => 'done', 'planned_start' => '2026-01-01', 'planned_end' => '2026-01-15', 'due_date' => '2026-01-15', 'created_by' => $leila->id, 'assignees' => [$leila->id, $ines->id], 'specialties' => $this->sps(['Backend', 'Frontend'])],
            ['title' => 'Lecteur vidéo optimisé & streaming HLS', 'description' => 'Player custom React avec HLS.js, chapitres, vitesse lecture, sous-titres, reprise automatique.', 'status_id' => $sDone->id, 'sprint_id' => $sp1->id, 'priority' => 'high', 'story_points' => 8, 'estimated_hours' => 20, 'actual_hours' => 22, 'progress_percent' => 100, 'workflow_status' => 'done', 'planned_start' => '2026-01-10', 'planned_end' => '2026-01-25', 'due_date' => '2026-01-25', 'created_by' => $admin->id, 'assignees' => [$ines->id], 'specialties' => $this->sps(['Frontend', 'DevOps'])],
            ['title' => 'Moteur de quiz & évaluation', 'description' => 'Types questions (QCM, vrai/faux, texte libre, glisser-déposer), timer, tentatives limitées, résultats détaillés.', 'status_id' => $sDone->id, 'sprint_id' => $sp2->id, 'priority' => 'high', 'story_points' => 8, 'estimated_hours' => 18, 'actual_hours' => 17, 'progress_percent' => 100, 'workflow_status' => 'done', 'planned_start' => '2026-02-01', 'planned_end' => '2026-02-14', 'due_date' => '2026-02-14', 'created_by' => $leila->id, 'assignees' => [$leila->id], 'specialties' => $this->sps(['Backend', 'Frontend'])],
            ['title' => 'Certificats de complétion automatisés', 'description' => 'Génération PDF certificats personnalisés (nom, cours, date, QR code vérification), partage LinkedIn.', 'status_id' => $sDone->id, 'sprint_id' => $sp2->id, 'priority' => 'medium', 'story_points' => 5, 'estimated_hours' => 12, 'actual_hours' => 10, 'progress_percent' => 100, 'workflow_status' => 'done', 'planned_start' => '2026-02-15', 'planned_end' => '2026-02-25', 'due_date' => '2026-02-25', 'created_by' => $mohamed->id, 'assignees' => [$mohamed->id], 'specialties' => $this->sps(['Backend'])],
            ['title' => 'Système de gamification (points, badges)', 'description' => 'XP points, niveaux apprenants, badges déblocables, classement hebdo, streaks d\'apprentissage.', 'status_id' => $sProg->id, 'sprint_id' => $sp3->id, 'priority' => 'medium', 'story_points' => 8, 'estimated_hours' => 20, 'actual_hours' => 10, 'progress_percent' => 50, 'workflow_status' => 'in_progress', 'planned_start' => '2026-03-01', 'planned_end' => '2026-03-15', 'due_date' => '2026-03-15', 'created_by' => $leila->id, 'assignees' => [$ines->id], 'specialties' => $this->sps(['Frontend', 'Backend'])],
            ['title' => 'Forum de discussion par cours', 'description' => 'Threads par leçon, réponses, votes, mentions @utilisateur, notifications temps réel via WebSocket.', 'status_id' => $sProg->id, 'sprint_id' => $sp3->id, 'priority' => 'medium', 'story_points' => 5, 'estimated_hours' => 16, 'actual_hours' => 7, 'progress_percent' => 40, 'workflow_status' => 'in_progress', 'planned_start' => '2026-03-08', 'planned_end' => '2026-03-22', 'due_date' => '2026-03-22', 'created_by' => $admin->id, 'assignees' => [$leila->id], 'specialties' => $this->sps(['Backend', 'Frontend'])],
            ['title' => 'Application mobile apprenants (React Native)', 'description' => 'App iOS/Android : accès cours offline, téléchargement vidéos, notifications push, progression sync.', 'status_id' => $sTodo->id, 'priority' => 'high', 'story_points' => 13, 'estimated_hours' => 40, 'progress_percent' => 0, 'workflow_status' => 'todo', 'planned_start' => '2026-04-01', 'planned_end' => '2026-05-15', 'due_date' => '2026-05-15', 'created_by' => $admin->id, 'assignees' => [$leila->id], 'specialties' => $this->sps(['Mobile'])],
            ['title' => 'Tests QA & accessibilité WCAG', 'description' => 'Tests fonctionnels, performance Lighthouse, conformité WCAG 2.1 AA, tests lecteurs d\'écran.', 'status_id' => $sTodo->id, 'priority' => 'medium', 'story_points' => 5, 'estimated_hours' => 14, 'progress_percent' => 0, 'workflow_status' => 'todo', 'planned_start' => '2026-05-20', 'planned_end' => '2026-05-31', 'due_date' => '2026-05-31', 'created_by' => $admin->id, 'assignees' => [$sonia->id], 'specialties' => $this->sps(['QA / Tests'])],
        ];
        $c = $this->makeTasks($p->id, $admin->id, $tasks);
        $this->dep($c, 1, 0); $this->dep($c, 2, 0); $this->dep($c, 4, 2); $this->dep($c, 5, 0); $this->dep($c, 6, 1);
        $this->cmt($c[0], $leila->id, 'LMS core opérationnel. 15 cours de test chargés, structure modulaire validée.');
        $this->cmt($c[2], $leila->id, 'Quiz engine en production. Taux de complétion moyen sur les tests : 73%.');
        $this->cmt($c[4], $ines->id, 'Système XP fonctionnel. 5 badges implémentés, classement en cours.');
        $this->time($c[0], $leila->id, '2026-01-01', 480, 'Structure LMS, migrations, CRUD cours');
        $this->time($c[1], $ines->id, '2026-01-10', 420, 'Player HLS.js, chapitres vidéo');
        $this->time($c[4], $ines->id, '2026-03-01', 360, 'Système XP et badges');
    }

    // ─────────────────────────────────────────────────────────────
    // 4. SmartRH — Gestion des ressources humaines
    // ─────────────────────────────────────────────────────────────
    private function seedSmartRH(Team $team, User $admin, User $ahmed, User $ines, User $mohamed, User $wajdi): void
    {
        $p = Project::create([
            'code' => 'SMRH', 'team_id' => $team->id,
            'name' => 'SmartRH — Gestion des Ressources Humaines',
            'description' => 'SIRH complet : gestion des employés, contrats, congés, paie, évaluations de performance, recrutement et onboarding.',
            'status' => 'planning', 'priority' => 'medium',
            'start_date' => '2026-04-01', 'end_date' => '2026-12-31',
            'owner_id' => $ahmed->id, 'created_by' => $admin->id,
        ]);
        $p->members()->attach([
            $admin->id   => ['project_role' => 'admin'],
            $ahmed->id   => ['project_role' => 'admin'],
            $ines->id    => ['project_role' => 'member'],
            $mohamed->id => ['project_role' => 'member'],
            $wajdi->id   => ['project_role' => 'member'],
        ]);

        [$sTodo, $sProg, $sRev, $sDone] = $this->createStandardStatuses($p->id);

        $sp1 = Sprint::create(['project_id' => $p->id, 'name' => 'Sprint 1 — Annuaire & Organigramme',
            'goal' => 'Gestion des employés et structure organisationnelle.', 'status' => 'planned',
            'start_date' => '2026-04-07', 'end_date' => '2026-04-25']);

        $tasks = [
            ['title' => 'Annuaire employés & profils complets', 'description' => 'Fiches employés (infos personnelles, poste, hiérarchie, compétences, documents), recherche avancée, export.', 'status_id' => $sTodo->id, 'sprint_id' => $sp1->id, 'priority' => 'urgent', 'story_points' => 8, 'estimated_hours' => 20, 'progress_percent' => 0, 'workflow_status' => 'todo', 'planned_start' => '2026-04-07', 'planned_end' => '2026-04-16', 'due_date' => '2026-04-16', 'created_by' => $ahmed->id, 'assignees' => [$ahmed->id], 'specialties' => $this->sps(['Backend'])],
            ['title' => 'Organigramme interactif', 'description' => 'Visualisation hiérarchie dynamique, glisser-déposer pour réorganiser, export SVG/PNG.', 'status_id' => $sTodo->id, 'sprint_id' => $sp1->id, 'priority' => 'high', 'story_points' => 5, 'estimated_hours' => 14, 'progress_percent' => 0, 'workflow_status' => 'todo', 'planned_start' => '2026-04-14', 'planned_end' => '2026-04-22', 'due_date' => '2026-04-22', 'created_by' => $admin->id, 'assignees' => [$ines->id], 'specialties' => $this->sps(['Frontend', 'Design / UX'])],
            ['title' => 'Gestion des congés & absences', 'description' => 'Demandes congés, workflow approbation manager, soldes automatiques, calendrier équipe, alertes chevauchement.', 'status_id' => $sTodo->id, 'priority' => 'high', 'story_points' => 8, 'estimated_hours' => 22, 'progress_percent' => 0, 'workflow_status' => 'todo', 'planned_start' => '2026-04-26', 'planned_end' => '2026-05-10', 'due_date' => '2026-05-10', 'created_by' => $ahmed->id, 'assignees' => [$ahmed->id, $wajdi->id], 'specialties' => $this->sps(['Backend', 'Frontend'])],
            ['title' => 'Module recrutement (ATS)', 'description' => 'Offres d\'emploi, candidatures, pipeline recrutement Kanban, évaluation candidats, intégration LinkedIn.', 'status_id' => $sTodo->id, 'priority' => 'medium', 'story_points' => 13, 'estimated_hours' => 32, 'progress_percent' => 0, 'workflow_status' => 'todo', 'planned_start' => '2026-05-15', 'planned_end' => '2026-06-05', 'due_date' => '2026-06-05', 'created_by' => $admin->id, 'assignees' => [$ines->id], 'specialties' => $this->sps(['Backend', 'Frontend'])],
            ['title' => 'Paie & bulletins de salaire', 'description' => 'Calcul paie automatique (cotisations, primes, heures sup), génération bulletins PDF, historique, export comptable.', 'status_id' => $sTodo->id, 'priority' => 'high', 'story_points' => 13, 'estimated_hours' => 40, 'progress_percent' => 0, 'workflow_status' => 'todo', 'planned_start' => '2026-06-10', 'planned_end' => '2026-07-10', 'due_date' => '2026-07-10', 'created_by' => $ahmed->id, 'assignees' => [$ahmed->id, $mohamed->id], 'specialties' => $this->sps(['Backend'])],
            ['title' => 'Évaluations de performance 360°', 'description' => 'Cycles d\'évaluation, formulaires personnalisables, auto-évaluation, évaluation manager/pairs, rapports.', 'status_id' => $sTodo->id, 'priority' => 'medium', 'story_points' => 8, 'estimated_hours' => 24, 'progress_percent' => 0, 'workflow_status' => 'todo', 'planned_start' => '2026-07-15', 'planned_end' => '2026-08-05', 'due_date' => '2026-08-05', 'created_by' => $ahmed->id, 'assignees' => [$wajdi->id], 'specialties' => $this->sps(['Backend', 'Frontend'])],
            ['title' => 'Onboarding digital nouveaux employés', 'description' => 'Parcours onboarding guidé, checklist tâches administratives, formation obligatoires, signature électronique contrats.', 'status_id' => $sTodo->id, 'priority' => 'medium', 'story_points' => 5, 'estimated_hours' => 18, 'progress_percent' => 0, 'workflow_status' => 'todo', 'planned_start' => '2026-08-10', 'planned_end' => '2026-08-25', 'due_date' => '2026-08-25', 'created_by' => $admin->id, 'assignees' => [$ines->id], 'specialties' => $this->sps(['Frontend', 'Design / UX'])],
        ];
        $c = $this->makeTasks($p->id, $admin->id, $tasks);
        $this->dep($c, 1, 0); $this->dep($c, 2, 0); $this->dep($c, 3, 0); $this->dep($c, 4, 2); $this->dep($c, 5, 4); $this->dep($c, 6, 3);
        $this->cmt($c[0], $ahmed->id, 'Spécifications fonctionnelles rédigées. Modèle de données RH finalisé avec le client.');
    }

    // ─────────────────────────────────────────────────────────────
    // 5. CityMap — Cartographie urbaine intelligente
    // ─────────────────────────────────────────────────────────────
    private function seedCityMap(Team $team, User $admin, User $karim, User $mohamed, User $ahmed): void
    {
        $p = Project::create([
            'code' => 'CMAP', 'team_id' => $team->id,
            'name' => 'CityMap — Cartographie Urbaine Intelligente',
            'description' => 'Plateforme SIG web pour la gestion urbaine : cartographie interactive, analyse spatiale, suivi infrastructure, alertes temps réel (pannes, travaux) et tableaux de bord municipaux.',
            'status' => 'active', 'priority' => 'high',
            'start_date' => '2026-02-15', 'end_date' => '2026-10-31',
            'owner_id' => $karim->id, 'created_by' => $admin->id,
        ]);
        $p->members()->attach([
            $admin->id   => ['project_role' => 'admin'],
            $karim->id   => ['project_role' => 'admin'],
            $mohamed->id => ['project_role' => 'member'],
            $ahmed->id   => ['project_role' => 'member'],
        ]);

        [$sTodo, $sProg, $sRev, $sDone] = $this->createStandardStatuses($p->id);

        $sp1 = Sprint::create(['project_id' => $p->id, 'name' => 'Sprint 1 — Infrastructure Géospatiale',
            'goal' => 'Stack GIS, ingestion données, carte de base.', 'status' => 'completed',
            'start_date' => '2026-02-15', 'end_date' => '2026-03-07',
            'started_at' => '2026-02-15', 'ended_at' => '2026-03-07']);
        $sp2 = Sprint::create(['project_id' => $p->id, 'name' => 'Sprint 2 — Couches & Alertes',
            'goal' => 'Couches thématiques, alertes temps réel.', 'status' => 'active',
            'start_date' => '2026-03-08', 'end_date' => '2026-03-28', 'started_at' => '2026-03-08']);

        $tasks = [
            ['title' => 'Infrastructure PostGIS & API géospatiale', 'description' => 'PostgreSQL + PostGIS, API GeoJSON, requêtes spatiales (within, intersects, buffer), tuiles vectorielles MVT.', 'status_id' => $sDone->id, 'sprint_id' => $sp1->id, 'priority' => 'urgent', 'story_points' => 13, 'estimated_hours' => 32, 'actual_hours' => 34, 'progress_percent' => 100, 'workflow_status' => 'done', 'planned_start' => '2026-02-15', 'planned_end' => '2026-02-26', 'due_date' => '2026-02-26', 'created_by' => $karim->id, 'assignees' => [$karim->id], 'specialties' => $this->sps(['Backend', 'DevOps', 'Data / BI'])],
            ['title' => 'Carte interactive MapLibre GL JS', 'description' => 'Carte vectorielle haute performance, zooms fluides, mode satellite/plan, dessin zones, mesures distances.', 'status_id' => $sDone->id, 'sprint_id' => $sp1->id, 'priority' => 'high', 'story_points' => 8, 'estimated_hours' => 24, 'actual_hours' => 22, 'progress_percent' => 100, 'workflow_status' => 'done', 'planned_start' => '2026-02-20', 'planned_end' => '2026-03-05', 'due_date' => '2026-03-05', 'created_by' => $admin->id, 'assignees' => [$mohamed->id], 'specialties' => $this->sps(['Frontend', 'Data / BI'])],
            ['title' => 'Couches thématiques (réseau, bâtiments)', 'description' => 'Couches infrastructure (électricité, eau, fibre), bâtiments 3D CityGML, végétation, zones inondables.', 'status_id' => $sProg->id, 'sprint_id' => $sp2->id, 'priority' => 'high', 'story_points' => 8, 'estimated_hours' => 28, 'actual_hours' => 14, 'progress_percent' => 50, 'workflow_status' => 'in_progress', 'planned_start' => '2026-03-08', 'planned_end' => '2026-03-20', 'due_date' => '2026-03-20', 'created_by' => $karim->id, 'assignees' => [$karim->id, $ahmed->id], 'specialties' => $this->sps(['Backend', 'Data / BI'])],
            ['title' => 'Système d\'alertes temps réel (WebSocket)', 'description' => 'Alertes pannes réseau, accidents, travaux en cours. Push notifications, historique incidents, API IoT.', 'status_id' => $sProg->id, 'sprint_id' => $sp2->id, 'priority' => 'high', 'story_points' => 8, 'estimated_hours' => 20, 'actual_hours' => 8, 'progress_percent' => 40, 'workflow_status' => 'in_progress', 'planned_start' => '2026-03-12', 'planned_end' => '2026-03-25', 'due_date' => '2026-03-25', 'created_by' => $admin->id, 'assignees' => [$ahmed->id], 'specialties' => $this->sps(['Backend'])],
            ['title' => 'Analyse spatiale & isochrones', 'description' => 'Calcul zones accessibilité (temps marche/voiture), analyse densité population, clustering incidents.', 'status_id' => $sTodo->id, 'priority' => 'medium', 'story_points' => 13, 'estimated_hours' => 36, 'progress_percent' => 0, 'workflow_status' => 'todo', 'planned_start' => '2026-04-01', 'planned_end' => '2026-04-20', 'due_date' => '2026-04-20', 'created_by' => $karim->id, 'assignees' => [$karim->id], 'specialties' => $this->sps(['Data / BI', 'Machine Learning'])],
            ['title' => 'Dashboard municipal — KPIs urbains', 'description' => 'Indicateurs performance urbaine: consommation énergie, taux occupation, mobilité, qualité air, tendances.', 'status_id' => $sTodo->id, 'priority' => 'high', 'story_points' => 8, 'estimated_hours' => 24, 'progress_percent' => 0, 'workflow_status' => 'todo', 'planned_start' => '2026-04-21', 'planned_end' => '2026-05-05', 'due_date' => '2026-05-05', 'created_by' => $admin->id, 'assignees' => [$mohamed->id], 'specialties' => $this->sps(['Frontend', 'Data / BI'])],
        ];
        $c = $this->makeTasks($p->id, $admin->id, $tasks);
        $this->dep($c, 1, 0); $this->dep($c, 2, 0); $this->dep($c, 3, 0); $this->dep($c, 4, 2); $this->dep($c, 5, 4);
        $this->cmt($c[0], $karim->id, 'PostGIS opérationnel. Requêtes spatiales < 50ms sur 500k entités géo. Index GIST configurés.');
        $this->cmt($c[1], $mohamed->id, 'Carte MapLibre en production. Rendu 60fps avec 100k features. Mode 3D bâtiments activé.');
        $this->cmt($c[2], $karim->id, 'Infrastructure électrique (42k segments) chargée. Réseau eau en cours d\'import.');
        $this->time($c[0], $karim->id, '2026-02-15', 480, 'Setup PostGIS, requêtes spatiales');
        $this->time($c[1], $mohamed->id, '2026-02-20', 420, 'Intégration MapLibre, tuiles vectorielles');
    }

    // ─────────────────────────────────────────────────────────────
    // 6. FinTrack — Gestion finance personnelle
    // ─────────────────────────────────────────────────────────────
    private function seedFinTrack(Team $team, User $admin, User $leila, User $ines, User $wajdi): void
    {
        $p = Project::create([
            'code' => 'FTRK', 'team_id' => $team->id,
            'name' => 'FinTrack — Finance Personnelle',
            'description' => 'Application mobile de gestion finances personnelles : agrégation comptes bancaires (Open Banking), catégorisation automatique des dépenses via ML, budgets, objectifs épargne et alertes.',
            'status' => 'planning', 'priority' => 'medium',
            'start_date' => '2026-05-01', 'end_date' => '2026-11-30',
            'owner_id' => $leila->id, 'created_by' => $admin->id,
        ]);
        $p->members()->attach([
            $admin->id => ['project_role' => 'admin'],
            $leila->id => ['project_role' => 'admin'],
            $ines->id  => ['project_role' => 'member'],
            $wajdi->id => ['project_role' => 'member'],
        ]);

        [$sTodo, $sProg, $sRev, $sDone] = $this->createStandardStatuses($p->id);

        $sp1 = Sprint::create(['project_id' => $p->id, 'name' => 'Sprint 1 — Open Banking & Transactions',
            'goal' => 'Connexion comptes bancaires, import transactions.', 'status' => 'planned',
            'start_date' => '2026-05-04', 'end_date' => '2026-05-17']);

        $tasks = [
            ['title' => 'Intégration Open Banking (DSP2)', 'description' => 'Connexion API Plaid/Tink pour agrégation comptes multi-banques, OAuth2, refresh tokens, sync temps réel.', 'status_id' => $sTodo->id, 'sprint_id' => $sp1->id, 'priority' => 'urgent', 'story_points' => 13, 'estimated_hours' => 30, 'progress_percent' => 0, 'workflow_status' => 'todo', 'planned_start' => '2026-05-04', 'planned_end' => '2026-05-14', 'due_date' => '2026-05-14', 'created_by' => $leila->id, 'assignees' => [$leila->id], 'specialties' => $this->sps(['Backend', 'Sécurité'])],
            ['title' => 'Catégorisation ML des dépenses', 'description' => 'Modèle NLP/classification pour catégoriser automatiquement, apprentissage par correction utilisateur, confiance score.', 'status_id' => $sTodo->id, 'priority' => 'high', 'story_points' => 13, 'estimated_hours' => 36, 'progress_percent' => 0, 'workflow_status' => 'todo', 'planned_start' => '2026-05-18', 'planned_end' => '2026-06-05', 'due_date' => '2026-06-05', 'created_by' => $admin->id, 'assignees' => [$wajdi->id], 'specialties' => $this->sps(['Machine Learning', 'Backend'])],
            ['title' => 'Budget & suivi mensuel', 'description' => 'Définition budgets par catégorie, jauge consommation, historique 12 mois, projections, alertes dépassement.', 'status_id' => $sTodo->id, 'priority' => 'high', 'story_points' => 5, 'estimated_hours' => 16, 'progress_percent' => 0, 'workflow_status' => 'todo', 'planned_start' => '2026-06-08', 'planned_end' => '2026-06-20', 'due_date' => '2026-06-20', 'created_by' => $leila->id, 'assignees' => [$ines->id], 'specialties' => $this->sps(['Frontend', 'Mobile'])],
            ['title' => 'Objectifs épargne & simulation', 'description' => 'Pots d\'épargne, projections avec intérêts composés, conseil IA optimisation, virement automatique.', 'status_id' => $sTodo->id, 'priority' => 'medium', 'story_points' => 5, 'estimated_hours' => 14, 'progress_percent' => 0, 'workflow_status' => 'todo', 'planned_start' => '2026-06-22', 'planned_end' => '2026-07-05', 'due_date' => '2026-07-05', 'created_by' => $admin->id, 'assignees' => [$ines->id], 'specialties' => $this->sps(['Frontend', 'Mobile'])],
            ['title' => 'Rapport mensuel & insights IA', 'description' => 'Récap mensuel automatique: tendances dépenses, comparaison mois précédent, conseils personnalisés IA.', 'status_id' => $sTodo->id, 'priority' => 'medium', 'story_points' => 5, 'estimated_hours' => 14, 'progress_percent' => 0, 'workflow_status' => 'todo', 'planned_start' => '2026-07-08', 'planned_end' => '2026-07-20', 'due_date' => '2026-07-20', 'created_by' => $wajdi->id, 'assignees' => [$wajdi->id], 'specialties' => $this->sps(['Backend', 'Machine Learning'])],
        ];
        $c = $this->makeTasks($p->id, $admin->id, $tasks);
        $this->dep($c, 1, 0); $this->dep($c, 2, 0); $this->dep($c, 3, 2); $this->dep($c, 4, 1);
        $this->cmt($c[0], $leila->id, 'Choix de Tink (DSP2 européen) validé. Sandbox API configurée, tests connexion BNP/CA OK.');
    }

    // ─────────────────────────────────────────────────────────────
    // 7. HotelPro — Gestion hôtelière
    // ─────────────────────────────────────────────────────────────
    private function seedHotelPro(Team $team, User $admin, User $sami, User $ines, User $ahmed, User $sonia): void
    {
        $p = Project::create([
            'code' => 'HTLP', 'team_id' => $team->id,
            'name' => 'HotelPro — Système de Gestion Hôtelière',
            'description' => 'PMS hôtelier complet : réservations en ligne, gestion chambres et tarifs, check-in/out, housekeeping, facturation, channel manager (Booking.com, Airbnb) et reporting revenue.',
            'status' => 'active', 'priority' => 'high',
            'start_date' => '2026-01-20', 'end_date' => '2026-08-31',
            'owner_id' => $ahmed->id, 'created_by' => $admin->id,
        ]);
        $p->members()->attach([
            $admin->id  => ['project_role' => 'admin'],
            $sami->id   => ['project_role' => 'admin'],
            $ines->id   => ['project_role' => 'member'],
            $ahmed->id  => ['project_role' => 'member'],
            $sonia->id  => ['project_role' => 'member'],
        ]);

        [$sTodo, $sProg, $sRev, $sDone] = $this->createStandardStatuses($p->id);

        $sp1 = Sprint::create(['project_id' => $p->id, 'name' => 'Sprint 1 — Réservations & Rooms',
            'goal' => 'Moteur de réservation et gestion des chambres.', 'status' => 'completed',
            'start_date' => '2026-01-20', 'end_date' => '2026-02-10',
            'started_at' => '2026-01-20', 'ended_at' => '2026-02-10']);
        $sp2 = Sprint::create(['project_id' => $p->id, 'name' => 'Sprint 2 — Check-in/out & Facturation',
            'goal' => 'Opérations hôtelières et facturation.', 'status' => 'active',
            'start_date' => '2026-02-11', 'end_date' => '2026-03-05', 'started_at' => '2026-02-11']);

        $tasks = [
            ['title' => 'Moteur de disponibilité & réservation', 'description' => 'Calendrier disponibilités temps réel, tarifs dynamiques (saisons, règles), réservation multi-chambres, options (petit-déj, parking).', 'status_id' => $sDone->id, 'sprint_id' => $sp1->id, 'priority' => 'urgent', 'story_points' => 13, 'estimated_hours' => 28, 'actual_hours' => 26, 'progress_percent' => 100, 'workflow_status' => 'done', 'planned_start' => '2026-01-20', 'planned_end' => '2026-02-01', 'due_date' => '2026-02-01', 'created_by' => $sami->id, 'assignees' => [$sami->id], 'specialties' => $this->sps(['Backend'])],
            ['title' => 'Plan interactif chambres & housekeeping', 'description' => 'Vue plan hôtel drag & drop, statuts chambres (propre/sale/occupée), planning ménage, alertes priorité.', 'status_id' => $sDone->id, 'sprint_id' => $sp1->id, 'priority' => 'high', 'story_points' => 8, 'estimated_hours' => 18, 'actual_hours' => 19, 'progress_percent' => 100, 'workflow_status' => 'done', 'planned_start' => '2026-01-25', 'planned_end' => '2026-02-07', 'due_date' => '2026-02-07', 'created_by' => $admin->id, 'assignees' => [$ines->id], 'specialties' => $this->sps(['Frontend', 'Design / UX'])],
            ['title' => 'Check-in/Check-out & profils clients', 'description' => 'Processus check-in (scan ID, préférences, carte clé), check-out automatique, profils clients CRM, historique séjours.', 'status_id' => $sProg->id, 'sprint_id' => $sp2->id, 'priority' => 'urgent', 'story_points' => 8, 'estimated_hours' => 20, 'actual_hours' => 11, 'progress_percent' => 60, 'workflow_status' => 'in_progress', 'planned_start' => '2026-02-11', 'planned_end' => '2026-02-22', 'due_date' => '2026-02-22', 'created_by' => $sami->id, 'assignees' => [$sami->id, $ahmed->id], 'specialties' => $this->sps(['Backend', 'Frontend'])],
            ['title' => 'Facturation & caisse hôtelière', 'description' => 'Génération factures, split bills, paiement multi-modes (CB, espèces, virement), remises, TVA, export comptable.', 'status_id' => $sProg->id, 'sprint_id' => $sp2->id, 'priority' => 'high', 'story_points' => 8, 'estimated_hours' => 22, 'actual_hours' => 9, 'progress_percent' => 40, 'workflow_status' => 'in_progress', 'planned_start' => '2026-02-18', 'planned_end' => '2026-03-03', 'due_date' => '2026-03-03', 'created_by' => $ahmed->id, 'assignees' => [$ahmed->id], 'specialties' => $this->sps(['Backend'])],
            ['title' => 'Channel Manager (Booking.com, Airbnb)', 'description' => 'Synchronisation bidirectionnelle des stocks et tarifs avec les OTA, import réservations automatique, gestion overbooking.', 'status_id' => $sRev->id, 'priority' => 'urgent', 'story_points' => 13, 'estimated_hours' => 32, 'actual_hours' => 30, 'progress_percent' => 95, 'workflow_status' => 'in_progress', 'planned_start' => '2026-02-01', 'planned_end' => '2026-02-28', 'due_date' => '2026-02-28', 'created_by' => $sami->id, 'assignees' => [$sami->id], 'specialties' => $this->sps(['Backend'])],
            ['title' => 'Revenue management & reporting', 'description' => 'KPIs RevPAR, taux occupation, ADR, forecast, segmentation clients, rapport mensuel automatique.', 'status_id' => $sTodo->id, 'priority' => 'high', 'story_points' => 8, 'estimated_hours' => 24, 'progress_percent' => 0, 'workflow_status' => 'todo', 'planned_start' => '2026-03-10', 'planned_end' => '2026-03-28', 'due_date' => '2026-03-28', 'created_by' => $admin->id, 'assignees' => [$ines->id], 'specialties' => $this->sps(['Frontend', 'Data / BI'])],
            ['title' => 'Tests QA & formation personnel', 'description' => 'Tests bout en bout scénarios hôteliers, documentation utilisateur, sessions formation équipe réception.', 'status_id' => $sTodo->id, 'priority' => 'medium', 'story_points' => 5, 'estimated_hours' => 16, 'progress_percent' => 0, 'workflow_status' => 'todo', 'planned_start' => '2026-04-01', 'planned_end' => '2026-04-12', 'due_date' => '2026-04-12', 'created_by' => $admin->id, 'assignees' => [$sonia->id], 'specialties' => $this->sps(['QA / Tests'])],
        ];
        $c = $this->makeTasks($p->id, $admin->id, $tasks);
        $this->dep($c, 2, 0); $this->dep($c, 3, 0); $this->dep($c, 5, 3); $this->dep($c, 6, 5);
        $this->cmt($c[0], $sami->id, 'Moteur de réservation opérationnel avec 45 types de chambres et 12 règles tarifaires.');
        $this->cmt($c[4], $sami->id, 'Channel Manager à 95%, synchronisation Booking.com validée. Airbnb en tests finaux.');
        $this->cmt($c[2], $ahmed->id, 'Check-in en cours. Intégration scan passeport bloquée par librairie tierce — workaround en cours.');
        $this->time($c[0], $sami->id, '2026-01-20', 480, 'Moteur disponibilité, locking optimiste');
        $this->time($c[1], $ines->id, '2026-01-25', 420, 'Plan hôtel SVG, statuts chambres');
        $this->time($c[4], $sami->id, '2026-02-01', 480, 'API Booking.com, sync bidirectionnelle');
    }

    // ─────────────────────────────────────────────────────────────
    // 8. StockMaster — Gestion des stocks
    // ─────────────────────────────────────────────────────────────
    private function seedStockMaster(Team $team, User $admin, User $wajdi, User $mohamed, User $sami): void
    {
        $p = Project::create([
            'code' => 'STKM', 'team_id' => $team->id,
            'name' => 'StockMaster — Gestion des Stocks & Entrepôts',
            'description' => 'Solution WMS pour la gestion des stocks : réceptions, expéditions, mouvements, RFID/QR codes, alertes seuils réapprovisionnement, prédiction ruptures via ML et intégration ERP.',
            'status' => 'on_hold', 'priority' => 'medium',
            'start_date' => '2026-03-01', 'end_date' => '2026-09-30',
            'owner_id' => $wajdi->id, 'created_by' => $admin->id,
        ]);
        $p->members()->attach([
            $admin->id   => ['project_role' => 'admin'],
            $wajdi->id   => ['project_role' => 'admin'],
            $mohamed->id => ['project_role' => 'member'],
            $sami->id    => ['project_role' => 'member'],
        ]);

        $sTodo   = TaskStatus::create(['project_id' => $p->id, 'name' => 'À faire',     'color' => '#6B7280', 'order' => 0, 'is_default' => true]);
        $sProg   = TaskStatus::create(['project_id' => $p->id, 'name' => 'En cours',    'color' => '#3B82F6', 'order' => 1]);
        $sBlock  = TaskStatus::create(['project_id' => $p->id, 'name' => 'Bloqué',      'color' => '#EF4444', 'order' => 2]);
        $sDone   = TaskStatus::create(['project_id' => $p->id, 'name' => 'Terminé',     'color' => '#10B981', 'order' => 3]);

        $sp1 = Sprint::create(['project_id' => $p->id, 'name' => 'Sprint 1 — Catalogue & Mouvements',
            'goal' => 'CRUD articles, mouvements stock, traçabilité.', 'status' => 'active',
            'start_date' => '2026-03-01', 'end_date' => '2026-03-21', 'started_at' => '2026-03-01']);

        $tasks = [
            ['title' => 'Catalogue articles & gestion lots/séries', 'description' => 'CRUD articles (code, désignation, unités, famille), gestion lots, numéros de série, codes-barres EAN/QR.', 'status_id' => $sDone->id, 'sprint_id' => $sp1->id, 'priority' => 'urgent', 'story_points' => 8, 'estimated_hours' => 18, 'actual_hours' => 16, 'progress_percent' => 100, 'workflow_status' => 'done', 'planned_start' => '2026-03-01', 'planned_end' => '2026-03-10', 'due_date' => '2026-03-10', 'created_by' => $wajdi->id, 'assignees' => [$wajdi->id], 'specialties' => $this->sps(['Backend'])],
            ['title' => 'Mouvements stock (entrées/sorties/transferts)', 'description' => 'Réceptions fournisseurs, bons livraison, transferts inter-entrepôts, ajustements inventaire, traçabilité complète.', 'status_id' => $sProg->id, 'sprint_id' => $sp1->id, 'priority' => 'urgent', 'story_points' => 8, 'estimated_hours' => 20, 'actual_hours' => 12, 'progress_percent' => 65, 'workflow_status' => 'in_progress', 'planned_start' => '2026-03-08', 'planned_end' => '2026-03-18', 'due_date' => '2026-03-18', 'created_by' => $wajdi->id, 'assignees' => [$wajdi->id, $sami->id], 'specialties' => $this->sps(['Backend'])],
            ['title' => 'Interface mobile scan RFID/QR (React Native)', 'description' => 'App mobile entrepôt : scan code-barres/QR, saisie mouvements offline, sync différée, écrans optimisés gants.', 'status_id' => $sBlock->id, 'sprint_id' => $sp1->id, 'priority' => 'high', 'story_points' => 8, 'estimated_hours' => 24, 'actual_hours' => 8, 'progress_percent' => 30, 'workflow_status' => 'at_risk', 'planned_start' => '2026-03-10', 'planned_end' => '2026-03-20', 'due_date' => '2026-03-20', 'created_by' => $admin->id, 'assignees' => [$mohamed->id], 'specialties' => $this->sps(['Mobile'])],
            ['title' => 'Alertes réapprovisionnement & seuils', 'description' => 'Calcul automatique points de commande, alertes email/SMS, génération bons de commande fournisseurs.', 'status_id' => $sTodo->id, 'priority' => 'high', 'story_points' => 5, 'estimated_hours' => 14, 'progress_percent' => 0, 'workflow_status' => 'todo', 'planned_start' => '2026-04-01', 'planned_end' => '2026-04-12', 'due_date' => '2026-04-12', 'created_by' => $wajdi->id, 'assignees' => [$wajdi->id], 'specialties' => $this->sps(['Backend'])],
            ['title' => 'Prédiction ruptures stock (ML)', 'description' => 'Modèle time-series (Prophet/LSTM) pour prévoir la demande, optimiser les stocks de sécurité, saisonnalité.', 'status_id' => $sTodo->id, 'priority' => 'medium', 'story_points' => 13, 'estimated_hours' => 36, 'progress_percent' => 0, 'workflow_status' => 'todo', 'planned_start' => '2026-05-01', 'planned_end' => '2026-05-25', 'due_date' => '2026-05-25', 'created_by' => $admin->id, 'assignees' => [$sami->id], 'specialties' => $this->sps(['Machine Learning', 'Data / BI'])],
            ['title' => 'Intégration ERP (SAP/Odoo)', 'description' => 'Connecteur bidirectionnel avec SAP B1 ou Odoo, sync articles/commandes/factures, mapping champs, monitoring.', 'status_id' => $sTodo->id, 'priority' => 'high', 'story_points' => 13, 'estimated_hours' => 40, 'progress_percent' => 0, 'workflow_status' => 'todo', 'planned_start' => '2026-06-01', 'planned_end' => '2026-06-25', 'due_date' => '2026-06-25', 'created_by' => $admin->id, 'assignees' => [$wajdi->id, $sami->id], 'specialties' => $this->sps(['Backend'])],
        ];
        $c = $this->makeTasks($p->id, $admin->id, $tasks);
        $this->dep($c, 1, 0); $this->dep($c, 2, 0); $this->dep($c, 3, 1); $this->dep($c, 4, 1); $this->dep($c, 5, 1);
        $this->cmt($c[0], $wajdi->id, 'Catalogue 5000 articles importé depuis l\'ERP client. Codes-barres EAN-13 générés automatiquement.');
        $this->cmt($c[2], $mohamed->id, 'Bloqué sur l\'accès au SDK RFID propriétaire — en attente de la licence du fournisseur. Relance envoyée.');
        $this->cmt($c[1], $sami->id, 'Réceptions et sorties fonctionnelles. Les transferts inter-dépôts sont en cours de validation.');
        $this->time($c[0], $wajdi->id, '2026-03-01', 420, 'CRUD articles, gestion lots EAN');
        $this->time($c[1], $wajdi->id, '2026-03-08', 480, 'Mouvements entrées/sorties, traçabilité');
    }

    // ─────────────────────────────────────────────────────────────
    // 9. CloudDeploy — Infrastructure automatisée
    // ─────────────────────────────────────────────────────────────
    private function seedCloudDeploy(Team $team, User $admin, User $karim, User $wajdi, User $sami): void
    {
        $p = Project::create([
            'code' => 'CLDP', 'team_id' => $team->id,
            'name' => 'CloudDeploy — Infrastructure as Code',
            'description' => 'Plateforme DevOps interne : déploiement Kubernetes, Infrastructure as Code (Terraform), pipelines CI/CD, observabilité (logs, métriques, alertes), gestion secrets et auto-scaling.',
            'status' => 'active', 'priority' => 'high',
            'start_date' => '2026-01-10', 'end_date' => '2026-07-31',
            'owner_id' => $karim->id, 'created_by' => $admin->id,
        ]);
        $p->members()->attach([
            $admin->id => ['project_role' => 'admin'],
            $karim->id => ['project_role' => 'admin'],
            $wajdi->id => ['project_role' => 'member'],
            $sami->id  => ['project_role' => 'member'],
        ]);

        $sTodo = TaskStatus::create(['project_id' => $p->id, 'name' => 'À planifier', 'color' => '#6B7280', 'order' => 0, 'is_default' => true]);
        $sProg = TaskStatus::create(['project_id' => $p->id, 'name' => 'En cours',    'color' => '#3B82F6', 'order' => 1]);
        $sRev  = TaskStatus::create(['project_id' => $p->id, 'name' => 'En review',   'color' => '#F59E0B', 'order' => 2]);
        $sDone = TaskStatus::create(['project_id' => $p->id, 'name' => 'Déployé',     'color' => '#10B981', 'order' => 3]);

        $sp1 = Sprint::create(['project_id' => $p->id, 'name' => 'Sprint 1 — K8s & Terraform',
            'goal' => 'Cluster Kubernetes et IaC Terraform.', 'status' => 'completed',
            'start_date' => '2026-01-10', 'end_date' => '2026-01-31',
            'started_at' => '2026-01-10', 'ended_at' => '2026-01-31']);
        $sp2 = Sprint::create(['project_id' => $p->id, 'name' => 'Sprint 2 — CI/CD & Observabilité',
            'goal' => 'Pipelines GitOps et stack monitoring.', 'status' => 'completed',
            'start_date' => '2026-02-01', 'end_date' => '2026-02-28',
            'started_at' => '2026-02-01', 'ended_at' => '2026-02-28']);
        $sp3 = Sprint::create(['project_id' => $p->id, 'name' => 'Sprint 3 — Sécurité & Auto-scaling',
            'goal' => 'Hardening sécurité, HPA, gestion secrets.', 'status' => 'active',
            'start_date' => '2026-03-01', 'end_date' => '2026-04-15', 'started_at' => '2026-03-01']);

        $tasks = [
            ['title' => 'Cluster Kubernetes (EKS/GKE) multi-zones', 'description' => 'Provisionnement cluster K8s managé, node pools, networking (Cilium), ingress controller, namespaces équipes.', 'status_id' => $sDone->id, 'sprint_id' => $sp1->id, 'priority' => 'urgent', 'story_points' => 13, 'estimated_hours' => 32, 'actual_hours' => 35, 'progress_percent' => 100, 'workflow_status' => 'done', 'planned_start' => '2026-01-10', 'planned_end' => '2026-01-20', 'due_date' => '2026-01-20', 'created_by' => $karim->id, 'assignees' => [$karim->id], 'specialties' => $this->sps(['DevOps'])],
            ['title' => 'Infrastructure as Code — Terraform modules', 'description' => 'Modules Terraform réutilisables (VPC, RDS, S3, IAM), état distant S3+DynamoDB, workspaces environnements.', 'status_id' => $sDone->id, 'sprint_id' => $sp1->id, 'priority' => 'urgent', 'story_points' => 8, 'estimated_hours' => 24, 'actual_hours' => 22, 'progress_percent' => 100, 'workflow_status' => 'done', 'planned_start' => '2026-01-15', 'planned_end' => '2026-01-28', 'due_date' => '2026-01-28', 'created_by' => $karim->id, 'assignees' => [$karim->id, $wajdi->id], 'specialties' => $this->sps(['DevOps'])],
            ['title' => 'Pipelines CI/CD GitOps (ArgoCD + GitHub Actions)', 'description' => 'GitOps avec ArgoCD, workflows GitHub Actions (test→build→push→deploy), rollback automatique, canary deployments.', 'status_id' => $sDone->id, 'sprint_id' => $sp2->id, 'priority' => 'urgent', 'story_points' => 13, 'estimated_hours' => 28, 'actual_hours' => 30, 'progress_percent' => 100, 'workflow_status' => 'done', 'planned_start' => '2026-02-01', 'planned_end' => '2026-02-16', 'due_date' => '2026-02-16', 'created_by' => $karim->id, 'assignees' => [$karim->id, $sami->id], 'specialties' => $this->sps(['DevOps', 'Backend'])],
            ['title' => 'Stack observabilité (Prometheus, Grafana, Loki)', 'description' => 'Prometheus scraping, dashboards Grafana (latences, erreurs, saturation), logs Loki, traces Tempo, alertes PagerDuty.', 'status_id' => $sDone->id, 'sprint_id' => $sp2->id, 'priority' => 'high', 'story_points' => 8, 'estimated_hours' => 20, 'actual_hours' => 18, 'progress_percent' => 100, 'workflow_status' => 'done', 'planned_start' => '2026-02-10', 'planned_end' => '2026-02-25', 'due_date' => '2026-02-25', 'created_by' => $admin->id, 'assignees' => [$wajdi->id], 'specialties' => $this->sps(['DevOps'])],
            ['title' => 'Gestion secrets (HashiCorp Vault)', 'description' => 'Déploiement Vault, dynamic secrets (BD, cloud), rotation automatique, intégration K8s Vault Agent Injector.', 'status_id' => $sProg->id, 'sprint_id' => $sp3->id, 'priority' => 'urgent', 'story_points' => 8, 'estimated_hours' => 22, 'actual_hours' => 14, 'progress_percent' => 65, 'workflow_status' => 'in_progress', 'planned_start' => '2026-03-01', 'planned_end' => '2026-03-15', 'due_date' => '2026-03-15', 'created_by' => $karim->id, 'assignees' => [$karim->id], 'specialties' => $this->sps(['DevOps', 'Sécurité'])],
            ['title' => 'Auto-scaling & optimisation coûts cloud', 'description' => 'HPA/VPA/KEDA pour scalabilité dynamique, Cluster Autoscaler, Spot instances, rightsizing, budget alerts.', 'status_id' => $sRev->id, 'sprint_id' => $sp3->id, 'priority' => 'high', 'story_points' => 8, 'estimated_hours' => 20, 'actual_hours' => 18, 'progress_percent' => 90, 'workflow_status' => 'in_progress', 'planned_start' => '2026-03-10', 'planned_end' => '2026-03-25', 'due_date' => '2026-03-25', 'created_by' => $karim->id, 'assignees' => [$wajdi->id], 'specialties' => $this->sps(['DevOps'])],
            ['title' => 'Hardening sécurité K8s (CIS Benchmark)', 'description' => 'Audit CIS Kubernetes Benchmark, Network Policies, Pod Security Standards, OPA Gatekeeper policies, Falco runtime security.', 'status_id' => $sProg->id, 'sprint_id' => $sp3->id, 'priority' => 'urgent', 'story_points' => 8, 'estimated_hours' => 26, 'actual_hours' => 15, 'progress_percent' => 55, 'workflow_status' => 'in_progress', 'planned_start' => '2026-03-15', 'planned_end' => '2026-04-05', 'due_date' => '2026-04-05', 'created_by' => $sami->id, 'assignees' => [$sami->id, $karim->id], 'specialties' => $this->sps(['DevOps', 'Sécurité'])],
            ['title' => 'Documentation & runbooks opérationnels', 'description' => 'Runbooks incidents (restart pods, rollback deploy, recovery BD), architecture decision records (ADR), onboarding dev.', 'status_id' => $sTodo->id, 'priority' => 'medium', 'story_points' => 3, 'estimated_hours' => 16, 'progress_percent' => 0, 'workflow_status' => 'todo', 'planned_start' => '2026-04-08', 'planned_end' => '2026-04-15', 'due_date' => '2026-04-15', 'created_by' => $admin->id, 'assignees' => [$wajdi->id], 'specialties' => $this->sps(['DevOps'])],
        ];
        $c = $this->makeTasks($p->id, $admin->id, $tasks);
        $this->dep($c, 1, 0); $this->dep($c, 2, 0); $this->dep($c, 3, 0); $this->dep($c, 4, 0); $this->dep($c, 5, 0); $this->dep($c, 6, 2); $this->dep($c, 7, 3);
        $this->cmt($c[0], $karim->id, 'Cluster EKS 3 zones en production. 99.95% uptime sur le dernier mois. Cilium remplace kube-proxy avec succès.');
        $this->cmt($c[2], $sami->id, 'GitOps en prod sur 4 microservices. Temps de déploiement moyen réduit de 45min à 8min. 🚀');
        $this->cmt($c[3], $wajdi->id, 'Grafana: 23 dashboards. MTTD alertes critiques — 2min30. SLO error budget 99.9% respecté.');
        $this->cmt($c[4], $karim->id, 'Vault opérationnel. DB credentials rotés toutes les 24h automatiquement. Transit engine configuré.');
        $this->cmt($c[6], $sami->id, 'Score CIS Benchmark : 87/100. Network Policies implémentées. OPA policies en test avant activation.');
        $this->time($c[0], $karim->id, '2026-01-10', 480, 'Setup EKS multi-AZ, networking Cilium');
        $this->time($c[1], $karim->id, '2026-01-15', 420, 'Modules Terraform VPC, RDS, S3');
        $this->time($c[2], $karim->id, '2026-02-01', 480, 'ArgoCD setup, GitHub Actions workflows');
        $this->time($c[3], $wajdi->id, '2026-02-10', 480, 'Prometheus, Grafana dashboards');
        $this->time($c[4], $karim->id, '2026-03-01', 420, 'Vault HA, dynamic secrets BD');
        $this->time($c[5], $wajdi->id, '2026-03-10', 360, 'HPA config, Spot instances, cost optimization');
    }

    // ─────────────────────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────────────────────

    private function sps(array $names): array
    {
        return array_values(array_filter(array_map(fn ($n) => $this->sp[$n] ?? null, $names)));
    }

    private function createStandardStatuses(int $projectId): array
    {
        return [
            TaskStatus::create(['project_id' => $projectId, 'name' => 'À faire',  'color' => '#6B7280', 'order' => 0, 'is_default' => true]),
            TaskStatus::create(['project_id' => $projectId, 'name' => 'En cours', 'color' => '#3B82F6', 'order' => 1]),
            TaskStatus::create(['project_id' => $projectId, 'name' => 'En revue', 'color' => '#F59E0B', 'order' => 2]),
            TaskStatus::create(['project_id' => $projectId, 'name' => 'Terminé',  'color' => '#10B981', 'order' => 3]),
        ];
    }

    /** @return Task[] */
    private function makeTasks(int $projectId, int $createdBy, array $tasksData): array
    {
        $created = [];
        foreach ($tasksData as $i => $data) {
            $assignees   = $data['assignees'] ?? [];
            $specialties = $data['specialties'] ?? [];
            unset($data['assignees'], $data['specialties']);

            $task = Task::create(array_merge($data, [
                'project_id'   => $projectId,
                'created_by'   => $data['created_by'] ?? $createdBy,
                'kanban_order' => $i,
                'position'     => $i,
            ]));

            foreach ($assignees as $userId) {
                $task->assignees()->syncWithoutDetaching([$userId => ['allocation_percent' => 100]]);
            }
            if (! empty($specialties)) {
                $task->specialties()->sync($specialties);
            }
            $created[] = $task;
        }
        return $created;
    }

    private function dep(array $tasks, int $from, int $to): void
    {
        if (isset($tasks[$from], $tasks[$to])) {
            $tasks[$from]->dependencies()->syncWithoutDetaching([$tasks[$to]->id => ['type' => 'FS']]);
        }
    }

    private function cmt(Task $task, int $userId, string $body): void
    {
        TaskComment::create(['task_id' => $task->id, 'user_id' => $userId, 'body' => $body]);
    }

    private function time(Task $task, int $userId, string $date, int $minutes, string $note): void
    {
        TimeEntry::create(['task_id' => $task->id, 'user_id' => $userId, 'date' => $date, 'minutes' => $minutes, 'note' => $note, 'source' => 'manual']);
    }
}
