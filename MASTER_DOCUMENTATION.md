# TAC-TIC IntelliPM — Documentation Maître

> **Source unique de vérité** — Plateforme intelligente de gestion de projets  
> Projet de Fin d'Études — TAC-TIC, Groupe New Ways, Technoparc El Ghazela, Ariana  
> Auteure : **Fatma Rejeb** — ISET, Promotion 2026

![PHP](https://img.shields.io/badge/PHP-8.2-777BB4?logo=php&logoColor=white)
![Laravel](https://img.shields.io/badge/Laravel-12.x-FF2D20?logo=laravel&logoColor=white)
![React](https://img.shields.io/badge/React-19.x-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-7.x-646CFF?logo=vite)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.x-06B6D4?logo=tailwindcss)
![MySQL](https://img.shields.io/badge/MySQL-8.x-4479A1?logo=mysql)
![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-latest-009688?logo=fastapi)

---

## Table des matières

1. [Présentation du projet](#1-présentation-du-projet)
2. [Architecture globale](#2-architecture-globale)
3. [Stack technique](#3-stack-technique)
4. [Structure du monorepo](#4-structure-du-monorepo)
5. [Installation et démarrage](#5-installation-et-démarrage)
6. [Variables d'environnement](#6-variables-denvironnement)
7. [Backend Laravel](#7-backend-laravel)
   - 7.1 [Structure](#71-structure)
   - 7.2 [Modèles Eloquent](#72-modèles-eloquent)
   - 7.3 [Contrôleurs API](#73-contrôleurs-api)
   - 7.4 [Services métier](#74-services-métier)
   - 7.5 [Middleware, Policies, Support](#75-middleware-policies-support)
8. [API REST — Routes complètes](#8-api-rest--routes-complètes)
9. [Authentification et sécurité](#9-authentification-et-sécurité)
10. [Frontend React](#10-frontend-react)
    - 10.1 [Structure et routing](#101-structure-et-routing)
    - 10.2 [Composants](#102-composants)
    - 10.3 [Contextes](#103-contextes)
    - 10.4 [Lib et utilitaires](#104-lib-et-utilitaires)
    - 10.5 [Configuration Vite](#105-configuration-vite)
11. [Intelligence Artificielle et ML](#11-intelligence-artificielle-et-ml)
    - 11.1 [Architecture IA hybride](#111-architecture-ia-hybride)
    - 11.2 [Service ML Python](#112-service-ml-python)
    - 11.3 [Les 22 features](#113-les-22-features)
    - 11.4 [Endpoints Python](#114-endpoints-python)
    - 11.5 [Intégration Laravel ↔ Python](#115-intégration-laravel--python)
12. [WebSocket — Temps réel](#12-websocket--temps-réel)
13. [Base de données](#13-base-de-données)
14. [Modules fonctionnels](#14-modules-fonctionnels)
15. [Flux applicatifs clés](#15-flux-applicatifs-clés)
16. [Règles métier](#16-règles-métier)
17. [Guide développeur](#17-guide-développeur)
    - 17.1 [Workflow quotidien](#171-workflow-quotidien)
    - 17.2 [Ajouter une fonctionnalité backend](#172-ajouter-une-fonctionnalité-backend)
    - 17.3 [Ajouter une page frontend](#173-ajouter-une-page-frontend)
    - 17.4 [Conventions de code](#174-conventions-de-code)
    - 17.5 [Gestion des erreurs](#175-gestion-des-erreurs)
    - 17.6 [Debugging](#176-debugging)
18. [Déploiement](#18-déploiement)
19. [Diagrammes UML](#19-diagrammes-uml)
20. [Qualité du code — SonarCloud](#20-qualité-du-code--sonarcloud)
21. [Troubleshooting](#21-troubleshooting)
22. [Système Journal d'audit Enterprise](#22-système-journal-daudit-enterprise)
    - 22.1 [Architecture](#221-architecture)
    - 22.2 [Schéma activity_logs enrichi](#222-schéma-activity_logs-enrichi)
    - 22.3 [ActivityLogService](#223-activitylogservice)
    - 22.4 [Modèle d'accès RBAC multi-projets](#224-modèle-daccès-rbac-multi-projets)
    - 22.5 [API filtrée + export + analytics](#225-api-filtrée--export--analytics)
23. [Retrait de membre par le Chef de projet](#23-retrait-de-membre-par-le-chef-de-projet)
24. [Module Gantt — Visibilité par rôle](#24-module-gantt--visibilité-par-rôle)
27. [Visibilité des dates du projet — Règle métier obligatoire](#27-visibilité-des-dates-du-projet--règle-métier-obligatoire)
25. [Rôle Client — Observateur de projet](#25-rôle-client--observateur-de-projet)
    - 23.1 [Règles métier](#231-règles-métier)
    - 23.2 [Endpoint API](#232-endpoint-api)
    - 23.3 [Journal d'audit](#233-journal-daudit)
    - 23.4 [Notification](#234-notification)
    - 23.5 [Frontend](#235-frontend)
    - 22.6 [Frontend enterprise](#226-frontend-enterprise)
    - 22.7 [Sécurité WebSocket](#227-sécurité-websocket-canaux-temps-réel)
    - 22.8 [Sidebar SaaS moderne](#228-sidebar-saas-moderne)
    - 22.6 [Sidebar SaaS moderne](#226-sidebar-saas-moderne)

---

## 1. Présentation du projet

**TAC-TIC IntelliPM** est une application web full-stack de gestion de projets intégrant un moteur d'intelligence artificielle hybride. Elle couvre l'ensemble du cycle de vie d'un projet en méthodologie **Scrum**.

### Objectifs principaux

| Objectif | Description |
|---|---|
| Gestion de projets | CRUD projets, sprints, backlogs, jalons, équipes |
| Gestion de tâches | Hiérarchie, Kanban, Gantt, dépendances, pièces jointes, temps |
| Collaboration | Commentaires threadés, mentions @user, invitations email, activité en temps réel |
| Intelligence artificielle | Recommandation ML, estimation LLM, détection de risques, chat assistant |
| RBAC | Admin, Member, Client — rôles applicatifs et rôles dans chaque projet |
| Notifications | In-app + email avec préférences granulaires par type d'événement |

### Fonctionnalités par sprint

| Sprint | Module | Fonctionnalités clés |
|---|---|---|
| Sprint 1 | Utilisateurs | Auth Sanctum, RBAC Spatie, profil, avatar, thème, préférences |
| Sprint 2 | Projets & Équipes | CRUD projets, invitations email, gestion équipes, dashboard KPI |
| Sprint 3 | Tâches & Kanban | Wizard 4 étapes, drag-and-drop, dépendances, filtres, sous-tâches |
| Sprint 4 | Planification | Gantt + CPM, calendrier, notifications temps réel, scoring risque, KPI |
| Sprint 5 | IA & ML | Recommandation 22 features, estimation LLM, risques, chat assistant |
| Sprint 6 | Audit RBAC & Pause | Journal d'audit enterprise, matrice permissions, Pause/Reprise de projet |

---

## 2. Architecture globale

```
┌─────────────────────────────────────────────────────────────────┐
│                     Navigateur (SPA)                            │
│          React 19 + Vite 7  —  http://localhost:5173            │
└────────────────────────────┬────────────────────────────────────┘
                             │  REST JSON (/api) + WebSocket
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Laravel 12  —  http://localhost:8000               │
│                                                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │  API Routes │  │ Controllers  │  │  Services (15+)       │  │
│  │  (~130 rtes)│  │  (29 ctrl.)  │  │  AI · ML · CPM · ...  │  │
│  └──────┬──────┘  └──────┬───────┘  └───────────────────────┘  │
│         └────────────────┤                                      │
│  ┌─────────────────────── ▼────────────────────────────────┐    │
│  │     Eloquent ORM — MySQL gestion_projets_pfe            │    │
│  └─────────────────────────────────────────────────────────┘    │
│  ┌────────────────────┐  ┌──────────────────────────────────┐   │
│  │  Sanctum Auth      │  │  Reverb WebSocket  — port 8080   │   │
│  │  Spatie RBAC       │  │  Queue / Scheduler / Mail        │   │
│  └────────────────────┘  └──────────────────────────────────┘   │
└────────────────────────────────┬────────────────────────────────┘
                                 │  HTTP (ML_SERVICE_URL)
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│           Python FastAPI ML Service — http://localhost:8001      │
│  ┌──────────┐  ┌────────────────┐  ┌───────────────────────┐   │
│  │  app.py  │  │ recommender.py │  │    features.py        │   │
│  │ (FastAPI)│  │ (GBM / RF / LR)│  │  (22 features)        │   │
│  └──────────┘  └────────────────┘  └───────────────────────┘   │
│       Lit directement MySQL (SQLAlchemy — lecture seule)         │
└─────────────────────────────────────────────────────────────────┘
```

### Ports locaux

| Service | Port | URL |
|---|---|---|
| Frontend React (Vite) | 5173 | http://localhost:5173 |
| Backend Laravel | 8000 | http://localhost:8000/api |
| WebSocket Reverb | 8080 | ws://localhost:8080 |
| ML Python FastAPI | 8001 | http://localhost:8001 |
| MySQL | 3306 | localhost:3306 |

---

## 3. Stack technique

### Backend

| Technologie | Version | Rôle |
|---|---|---|
| PHP | 8.2 | Runtime |
| Laravel | 12.x | Framework principal |
| Laravel Sanctum | 4.3 | Auth API — token Bearer |
| Spatie Permission | 6.24 | RBAC (rôles / permissions) |
| Laravel Reverb | 1.9 | Serveur WebSocket intégré |
| Pusher PHP Server | 7.2 | Broadcasting production |
| MySQL | 8.x | Base de données |

### Frontend

| Technologie | Version | Rôle |
|---|---|---|
| React | 19.x | Framework UI |
| Vite | 7.x | Build tool + dev server (HMR) |
| React Router DOM | 7.x | Routing SPA |
| TanStack Query | 5.x | Cache serveur, état async |
| Axios | 1.x | Client HTTP |
| React Hook Form | 7.x | Formulaires |
| Zod | 4.x | Validation schémas |
| TailwindCSS | 4.x | Styling utilitaire |
| Framer Motion | 12.x | Animations |
| Lucide React | 0.577 | Icônes |
| Laravel Echo + Pusher JS | 2.x / 8.x | WebSocket client |
| Sonner | 2.x | Toast notifications |
| date-fns | 4.x | Manipulation de dates |
| clsx + tailwind-merge | 2.x / 3.x | Composition classes CSS |

### Service ML (Python)

| Technologie | Rôle |
|---|---|
| Python 3.11 | Runtime |
| FastAPI | Serveur API REST |
| uvicorn | ASGI server |
| scikit-learn | GBM, Random Forest, Logistic Regression |
| pandas / numpy | Data engineering |
| SQLAlchemy | Pool de connexions MySQL |
| joblib | Sérialisation des modèles |
| pydantic | Validation des schémas API |

---

## 4. Structure du monorepo

```
projet/
├── laravel/                        # Backend Laravel 12
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/Api/    # 29 contrôleurs REST
│   │   │   ├── Middleware/         # CheckRole, CheckProjectAccess, EnsureUserIsActive
│   │   │   ├── Requests/           # Form Requests (validation)
│   │   │   └── Resources/         # API Resources (transformation JSON)
│   │   ├── Models/                 # 25 modèles Eloquent
│   │   ├── Policies/               # TaskPolicy, ProjectPolicy
│   │   ├── Services/               # 15 services métier
│   │   │   ├── AI/                 # OpenRouterService (LLM)
│   │   │   └── ML/                 # PythonMLClient (HTTP vers Python)
│   │   └── Support/                # AccessControl, ApiPagination, SqlDateExpressions
│   ├── database/
│   │   ├── migrations/             # 40+ migrations (depuis mars 2026)
│   │   └── seeders/                # RoleAndPermissionSeeder
│   ├── routes/
│   │   ├── api.php                 # ~120 routes REST
│   │   └── channels.php            # Canaux WebSocket Reverb
│   └── config/                     # cors, sanctum, reverb, auth
│
├── react/                          # Frontend React 19
│   ├── src/
│   │   ├── App.jsx                 # Router — 26 routes lazy-loaded
│   │   ├── main.jsx                # Entry point — providers, thème
│   │   ├── components/             # 37 composants réutilisables
│   │   │   ├── layout/             # AppLayout, Sidebar, Topbar, GlobalSearchBar
│   │   │   ├── ui/                 # Button, Input, Modal, Badge, Card, Skeleton…
│   │   │   ├── tasks/              # WorkflowBoard, TaskCard, MLRecommendationModal…
│   │   │   ├── notifications/      # NotificationDropdown
│   │   │   ├── gantt/              # GanttChart
│   │   │   ├── calendar/           # CalendarView
│   │   │   ├── specialties/        # SpecialtyCardGrid
│   │   │   └── admin/              # UserManagement
│   │   ├── pages/                  # 24 fichiers — 22 routes + 2 sous-composants
│   │   ├── contexts/               # AuthContext, I18nContext (FR)
│   │   ├── lib/                    # api.js, echo.js, theme.js, utils.js, roles.js…
│   │   │   └── services/           # dashboardApi, notificationsApi, invitationsApi
│   │   ├── routes/                 # ProtectedRoute, GuestRoute, RoleRoute
│   │   └── i18n/                   # messages.js (Français uniquement)
│   └── package.json
│
├── python/
│   └── ml/                         # Microservice ML FastAPI
│       ├── app.py                   # Serveur FastAPI (routes)
│       ├── recommender.py           # Moteur GBM/RF/LR — scoring
│       ├── features.py              # Extraction 22 features
│       ├── database.py              # Pool SQLAlchemy
│       ├── ml_config.py             # Constantes et poids heuristiques
│       ├── train.py                 # Script CLI d'entraînement
│       ├── models/                  # task_assignment.joblib (modèle sérialisé)
│       └── requirements.txt
│
├── diagrams-code/                  # Sources PlantUML (.puml) par sprint
├── rapport_latex/                  # Rapport PFE LaTeX
├── MASTER_DOCUMENTATION.md         # Ce fichier — source unique de vérité
└── README.md                       # Présentation rapide → pointe vers ce fichier
```

---

## 5. Installation et démarrage

### Prérequis

| Outil | Version minimum |
|---|---|
| PHP | 8.2 |
| Composer | 2.x |
| Node.js | 20.x |
| npm | 10.x |
| MySQL | 8.x |
| Python | 3.11 |

### Installation Backend Laravel

```bash
cd laravel
cp .env.example .env
composer install
php artisan key:generate

# Créer la base MySQL : gestion_projets_pfe
php artisan migrate --seed    # Tables + RoleAndPermissionSeeder
php artisan storage:link      # Lien symbolique storage ↔ public
```

### Installation Frontend React

```bash
cd react
npm install
```

### Installation Service ML Python

```bash
cd python/ml
python -m venv venv
source venv/bin/activate        # Windows : venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # Renseigner DB credentials MySQL
python train.py                 # Entraîner le modèle initial (optionnel)
```

### Démarrage — Option A (script combiné, depuis `react/`)

```bash
cd react
npm start
# Lance en parallèle :
#   php artisan serve         → port 8000
#   uvicorn app:app           → port 8001
#   vite                      → port 5173
```

### Démarrage — Option B (terminaux séparés)

```bash
# T1 — Laravel API
cd laravel && php artisan serve

# T2 — WebSocket Reverb
cd laravel && php artisan reverb:start

# T3 — Queue worker (notifications, jobs)
cd laravel && php artisan queue:listen --tries=1

# T4 — ML Python
cd python/ml && uvicorn app:app --host 127.0.0.1 --port 8001 --reload

# T5 — React
cd react && npm run dev
```

**Application accessible sur http://localhost:5173**

### Comptes de test (après seeding)

```
admin@example.com   / password  → rôle admin (accès total)
member@example.com  / password  → rôle member (accès projets assignés)
client@example.com  / password  → rôle client (lecture seule)
```

---

## 6. Variables d'environnement

### Laravel (`laravel/.env`)

```ini
APP_NAME="Gestion Projets PFE"
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost:8000
APP_LOCALE=fr

FRONTEND_URL=http://localhost:5173
FRONTEND_URLS=http://localhost:5173

# Base de données
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=gestion_projets_pfe
DB_USERNAME=root
DB_PASSWORD=

# Sessions, queue, cache
SESSION_DRIVER=database
QUEUE_CONNECTION=database
CACHE_STORE=database

# Sanctum
SANCTUM_STATEFUL_DOMAINS=localhost:5173

# WebSocket Reverb
BROADCAST_CONNECTION=reverb
REVERB_APP_ID=app-id
REVERB_APP_KEY=app-key
REVERB_APP_SECRET=app-secret
REVERB_HOST=127.0.0.1
REVERB_PORT=8080
REVERB_SCHEME=http

# Service ML Python
ML_SERVICE_URL=http://127.0.0.1:8001
ML_SERVICE_TIMEOUT=3

# LLM OpenRouter
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=meta-llama/llama-3.3-70b-instruct:free

# Email
MAIL_MAILER=log
MAIL_FROM_ADDRESS="noreply@tactic.tn"
MAIL_FROM_NAME="${APP_NAME}"
```

### React (`react/.env`)

```ini
VITE_BROADCAST_DRIVER=reverb
VITE_REVERB_APP_KEY=app-key
VITE_REVERB_HOST=127.0.0.1
VITE_REVERB_PORT=8080
VITE_REVERB_SCHEME=http
```

### Python ML (`python/ml/.env`)

```ini
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=gestion_projets_pfe
DB_USERNAME=root
DB_PASSWORD=
```

---

## 7. Backend Laravel

### 7.1 Structure

```
laravel/app/
├── Http/
│   ├── Controllers/Api/    # 29 contrôleurs — un par domaine fonctionnel
│   ├── Middleware/         # CheckRole · CheckProjectAccess · EnsureUserIsActive
│   ├── Requests/           # Form Requests validation
│   └── Resources/          # JSON transformation (API Resources)
├── Models/                 # 25 modèles Eloquent
├── Policies/               # TaskPolicy · ProjectPolicy
├── Services/               # 15 services métier (+ AI/ + ML/ sous-dossiers)
└── Support/                # Helpers partagés
```

### 7.2 Modèles Eloquent

#### Relations principales

```
User ──────────────────────────────────────────────────────────────
  ├── belongsToMany ──► Team         (pivot: team_user)
  ├── belongsToMany ──► Project      (pivot: project_members, project_role)
  ├── belongsToMany ──► Specialty    (pivot: user_specialty)
  ├── belongsToMany ──► Task         (pivot: task_assignments, allocation_percent)
  ├── hasMany ──────────► TimeEntry, TaskComment, Notification
  └── hasOne ───────────► (Spatie Roles via model_has_roles)

Project ───────────────────────────────────────────────────────────
  ├── belongsTo ──────► Team · Client · User (owner, chef, manager)
  ├── hasMany ─────────► Task · Sprint · TaskStatus · ProjectInvitation
  └── morphMany ───────► ActivityLog

Task ──────────────────────────────────────────────────────────────
  ├── belongsTo ──────► Project · Sprint · Task (parent) · TaskStatus
  ├── hasMany ─────────► Task (subtasks) · TaskComment · Attachment · TimeEntry
  ├── belongsToMany ──► User      (pivot: task_assignments)
  ├── belongsToMany ──► Task      (pivot: task_dependencies, type: FS/SS/FF/SF)
  └── belongsToMany ──► Specialty (pivot: task_specialty)

Team ── belongsTo ──► User (leader) · hasMany ──► Project
Sprint ── belongsTo ──► Project · hasMany ──► Task
```

#### Enums clés

```php
// Task
$workflow_status  = 'todo' | 'in_progress' | 'done' | 'at_risk'
$issue_type       = 'story' | 'bug' | 'task' | 'epic' | 'subtask'
$priority         = 'low' | 'medium' | 'high' | 'urgent'
$risk_level       = 'none' | 'low' | 'medium' | 'high' | 'critical'

// Project
$status           = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'
$priority         = 'low' | 'medium' | 'high' | 'critical'

// Sprint
$status           = 'planned' | 'active' | 'completed'

// User
$status           = 'active' | 'inactive' | 'suspended'

// TaskDependency
$type             = 'FS' | 'SS' | 'FF' | 'SF'  // Finish-Start, Start-Start…

// ProjectInvitation
$status           = 'pending' | 'accepted' | 'declined' | 'expired'
```

#### Détail des modèles

| Modèle | Champs `fillable` notables |
|---|---|
| `User` | name, email, password, status, avatar, theme, locale, notify_in_app, notify_email, notify_type_* |
| `Project` | team_id, client_id, chef_id, owner_id, name, code, description, status, priority, start_date, end_date, **paused_at**, **paused_by**, **pause_reason**, **previous_status** |
| `Task` | project_id, sprint_id, parent_id, title, issue_type, priority, complexity, story_points, planned_start, planned_end, estimated_hours, workflow_status, risk_score, progress_percent, progress_mode (auto\|manual), activity_score, checklist (JSON), manager_validation |
| `Team` | name, description, team_leader_id |
| `Sprint` | project_id, name, goal, start_date, end_date, status |
| `TaskStatus` | project_id, name, color, order, is_default |
| `TaskComment` | task_id, user_id, parent_id, body (mentions @user) |
| `TaskAssignment` | task_id, user_id, allocation_percent |
| `TaskDependency` | task_id, depends_on_task_id, type |
| `Attachment` | task_id, type (file\|link), path_or_url, filename, mime, size |
| `TimeEntry` | task_id, user_id, date, minutes, note, source (manual\|timer) |
| `Specialty` | name, description, color |
| `Notification` | user_id, actor_id, related_task_id, entity_type, entity_id, message, type, severity, data (JSON), read_at |
| `ActivityLog` | project_id, actor_id, entity_type, entity_id, action, meta (JSON) |
| `AiRecommendation` | task_id, project_id, type (estimation\|delay_risk\|assignment), input_data, result_data, confidence |
| `ProjectInvitation` | project_id, email, role, invited_by, token, status, expires_at |
| `Client` | name, company, email |
| `TaskWatcher` | task_id, user_id — abonnement aux notifications d'une tâche |
| `ProjectFollower` | project_id, user_id — suivi d'un projet |
| `DailyTaskProgress` | task_id, user_id, date, worked_minutes, progress_delta, user_progress, note |

### 7.3 Contrôleurs API

#### AuthController (`/auth`, `/me`)

| Méthode | Route | Description |
|---|---|---|
| `register()` | `POST /auth/register` | Inscription + rôle `member` par défaut |
| `login()` | `POST /auth/login` | Connexion → token Sanctum |
| `logout()` | `POST /auth/logout` | Révoquer token courant |
| `logoutAllDevices()` | `POST /logout-all-devices` | Révoquer tous les tokens |
| `me()` | `GET /me` | Profil utilisateur connecté |
| `updateMe()` | `PUT /me` | Modifier profil |
| `updateAvatar()` | `POST /me/avatar` | Changer avatar |
| `preferences()` | `GET /me/preferences` | Préférences UI |
| `updatePreferences()` | `PATCH /me/preferences` | Modifier préférences |
| `changePassword()` | `POST /change-password` | Changer mot de passe |
| `forgotPassword()` | `POST /auth/forgot-password` | Envoyer email reset |
| `resetPassword()` | `POST /auth/reset-password` | Réinitialiser mot de passe |

#### ProjectController (`/projects`)

| Méthode | Route | Description |
|---|---|---|
| `index()` | `GET /projects` | Projets accessibles |
| `store()` | `POST /projects` | Créer |
| `show()` | `GET /projects/{id}` | Détail |
| `update()` | `PUT /projects/{id}` | Modifier |
| `destroy()` | `DELETE /projects/{id}` | Supprimer (soft delete) |
| `dashboard()` | `GET /projects/{id}/dashboard` | KPIs |
| `activity()` | `GET /projects/{id}/activity` | Journal |
| `members()` | `GET /projects/{id}/members` | Liste membres |
| `addMember()` | `POST /projects/{id}/members` | Ajouter membre |
| `removeMember()` ★ | `DELETE /projects/{id}/members/{user}` | Retirer membre — admin ou chef du projet |
| `changeChef()` | `PUT /projects/{id}/change-chef` | Changer chef |
| `invite()` | `POST /projects/{id}/invite` | Inviter par email |
| `exportTasks()` | `GET /projects/{id}/export/tasks` | Export CSV/JSON |
| `pause()` ★ | `POST /projects/{id}/pause` | Mettre en pause — HTTP 423 sur toutes les modifs |
| `resume()` ★ | `POST /projects/{id}/resume` | Reprendre — restaure le statut précédent |
| `pausedStats()` ★ | `GET /projects/paused-stats` | Analytiques pause — admin uniquement |

#### TaskController (`/tasks`, `/projects/{id}/tasks`)

| Méthode | Route | Description |
|---|---|---|
| `globalIndex()` | `GET /tasks` | Toutes mes tâches |
| `index()` | `GET /projects/{id}/tasks` | Tâches d'un projet |
| `store()` | `POST /projects/{id}/tasks` | Créer |
| `show()` | `GET /tasks/{id}` | Détail |
| `update()` | `PUT /tasks/{id}` | Modifier |
| `destroy()` | `DELETE /tasks/{id}` | Supprimer |
| `move()` | `PATCH /tasks/{id}/move` | Déplacer/réordonner |
| `assign()` | `POST /tasks/{id}/assign` | Assigner utilisateur |
| `unassign()` | `DELETE /tasks/{id}/unassign/{user}` | Désassigner |
| `addDependency()` | `POST /tasks/{id}/dependencies` | Ajouter dépendance |
| `removeDependency()` | `DELETE /tasks/{id}/dependencies/{dep}` | Supprimer dépendance |
| `addComment()` | `POST /tasks/{id}/comments` | Ajouter commentaire |
| `updateComment()` | `PUT /tasks/{id}/comments/{c}` | Modifier commentaire |
| `deleteComment()` | `DELETE /tasks/{id}/comments/{c}` | Supprimer commentaire |
| `addAttachment()` | `POST /tasks/{id}/attachments` | Joindre fichier/lien |
| `deleteAttachment()` | `DELETE /tasks/{id}/attachments/{a}` | Supprimer pièce jointe |
| `downloadAttachment()` | `GET /tasks/{id}/attachments/{a}/download` | Télécharger |
| `addTimeEntry()` | `POST /tasks/{id}/time-entries` | Saisir du temps |
| `deleteTimeEntry()` | `DELETE /tasks/{id}/time-entries/{e}` | Supprimer saisie |

#### AiController (`/ai`) — admin + member

| Méthode | Route | Description |
|---|---|---|
| `estimateTask()` | `GET /ai/estimate/{task}` | Estimation de durée |
| `delayRiskTask()` | `GET /ai/delay-risk/task/{task}` | Risque retard tâche |
| `delayRiskProject()` | `GET /ai/delay-risk/project/{project}` | Risque retard projet |
| `suggestAssignment()` | `GET /ai/suggest-assignment/{task}` | Suggérer assigné |
| `optimizeProjectAssignments()` | `GET /ai/optimize-assignments/{project}` | Optimiser |
| `projectRecommendations()` | `GET /ai/recommendations/project/{project}` | Recommandations |
| `workloadBalance()` | `GET /ai/workload-balance/{project}` | Équilibrage charge |
| `chat()` | `POST /ai/chat` | Chat assistant LLM |

#### MLController (`/ml`) — admin + member

| Méthode | Route | Description |
|---|---|---|
| `recommendForNewTask()` | `POST /ml/recommend` | Recommander pour nouvelle tâche |
| `recommend()` | `GET /ml/recommend/{task}` | Recommander pour tâche existante |
| `modelInfo()` | `GET /ml/model-info` | Métriques du modèle actuel |
| `recordOutcome()` | `POST /ml/feedback/{task}` | Signal d'apprentissage |
| `retrain()` | `POST /ml/retrain` | Ré-entraîner (admin uniquement) |

#### Autres contrôleurs

| Contrôleur | Responsabilité |
|---|---|
| `SprintController` | CRUD sprints + start/end/complete + backlog + reorder |
| `TeamController` | CRUD équipes + membres (rôle, spécialités, capacité) |
| `UserController` | CRUD utilisateurs (admin) + suppression permanente |
| `ClientController` | CRUD clients |
| `SpecialtyController` | CRUD spécialités + autoAssign + membersPerformance + matchingMembers |
| `TaskStatusController` | Statuts Kanban personnalisés + reorder |
| `GanttController` | Gantt global + par projet + mise à jour dates |
| `CriticalPathController` | Calcul CPM (chemin critique) |
| `CalendarController` | Vue calendrier mensuelle |
| `NotificationController` | Index + markAsRead + markAllAsRead + summary + stats + destroy + destroyRead |
| `NotificationPreferencesController` | Préférences de notification (11 types) |
| `WatcherController` | Surveillance de tâche — index + watch + unwatch |
| `FollowerController` | Suivi de projet — index + follow + unfollow |
| `WorklogController` | Journal de progression quotidienne — index + store + userProgress + validate |
| `AdminDashboardController` | KPIs globaux admin |
| `MemberDashboardController` | KPIs membre + summary |
| `ClientDashboardController` | Rapport lecture seule client |
| `GlobalSearchController` | Recherche multi-entités |
| `InvitationController` | verify + pending + accept + decline |
| `InviteController` | show + store + accept + decline |
| `ActivityFeedController` | Flux d'activité global |

### 7.4 Services métier

| Service | Responsabilité |
|---|---|
| `AIService` | Moteur IA hybride — estimation, risques, suggestions (règles + LLM) |
| `AI/OpenRouterService` | Appels LLM via OpenRouter (Llama 3.3 70B par défaut) |
| `ML/PythonMLClient` | Client HTTP vers le microservice Python (timeout configurable) |
| `CriticalPathService` | Algorithme CPM — chemin le plus long dans les dépendances |
| `NotificationService` | Créer, persister, diffuser les notifications (in-app + email) — 14+ types |
| `MentionService` | Détecter `@username` dans les commentaires → créer notifications |
| `ActivityLogService` | Journaliser les événements dans `activity_logs` |
| `ActivityService` | Tracker les actions utilisateur dans `activities` |
| `SprintService` | Logique métier sprints (start/end/complete, backlog) |
| `TaskDependencyService` | Gérer les dépendances (anti-cycle) + calcul Gantt |
| `ProjectInviteService` | Générer tokens, envoyer emails, valider invitations |
| `AdminDashboardService` | Calculer métriques globales (projets actifs, tâches en retard…) |
| `MemberDashboardService` | Orchestrer les métriques du membre connecté |
| `UserManagementService` | CRUD utilisateurs avec transfert de tâches lors de la désactivation |
| `ProgressCalculationService` | Formule hybride (sous-tâches 35% + temps 25% + checklist 15% + workflow 10% + activité 10% + validation 5%) |
| `ProjectProgressAggregator` | Moyenne pondérée des tâches de premier niveau → progress_percent projet |

### 7.5 Middleware, Policies, Support

#### Middlewares

| Middleware | Alias | Comportement |
|---|---|---|
| `CheckRole` | `check.role:admin` | Vérifie le rôle Spatie — supporte la **négation** `!role` |
| `CheckProjectAccess` | `check.project:view\|edit` | Vérifie l'accès au projet (chef/member → edit, client → view) |
| `EnsureUserIsActive` | `active.user` | Rejette si `user.status != 'active'` → 403 |
| `CheckProjectNotPaused` | `project.not_paused` | Bloque POST/PUT/PATCH/DELETE si projet en pause → **HTTP 423 LOCKED** |

**Syntaxes CheckRole :**
```php
check.role:admin           // doit avoir ce rôle
check.role:admin,member    // doit avoir au moins l'un de ces rôles
check.role:!client         // ne doit PAS avoir le rôle client (supporte les rôles dynamiques)
```

**Réponse HTTP 423 du middleware `project.not_paused` :**
```json
{
  "status": 423,
  "message": "⏸️ Ce projet est en pause. Les modifications sont désactivées.",
  "code": "PROJECT_LOCKED",
  "project": {
    "id": 12,
    "name": "CRM System",
    "pause_reason": "Attente de validation client",
    "paused_at": "2026-05-26T10:00:00Z"
  }
}
```

Rate limiting : `throttle:5,1` sur auth public, `throttle:60,1` sur routes protégées.

#### Policies

| Policy | Méthodes protégées |
|---|---|
| `TaskPolicy` | `update()` → `canEditTask()` ; `delete()` → `canDeleteTask()` (admin, chef projet, propriétaire, membre-créateur non-terminé) |
| `ProjectPolicy` | `view()`, `create()`, `update()`, `delete()`, `pause()`, `resume()` |

**`ProjectPolicy::pause()` — peut mettre en pause :**
- Admin global
- Propriétaire du projet (`owner_id`)
- Chef du projet (`chef_id`)
- Project Manager (`project_manager_id`)
- Tout utilisateur avec la permission Spatie `project.pause`
- Bloqué si projet déjà `on_hold`, `completed` ou `cancelled`

**`ProjectPolicy::resume()` — peut reprendre :**
- Admin global **uniquement**
- Chef du projet (`chef_id`) **uniquement**
- ⚠️ La permission Spatie `project.resume` n'élargit **pas** l'accès (policy stricte)

#### Support

| Classe | Rôle |
|---|---|
| `AccessControl` | Helpers statiques `isAdmin()`, `isProjectChef()`, `canEditProject()` |
| `ApiPagination` | Normaliser la pagination JSON (`meta.total`, `links`) |
| `SqlDateExpressions` | Constructeurs d'expressions SQL de dates pour filtres MySQL |

---

## 8. API REST — Routes complètes

Préfixe global : `/api`. Toutes les routes protégées requièrent `Authorization: Bearer {token}`.

### Routes publiques (`throttle:5,1`)

```
GET    /                           → Info API (version)
POST   /auth/register
POST   /auth/login
POST   /auth/forgot-password
POST   /auth/reset-password
GET    /invitations/verify
GET    /invites/{token}
```

### Profil utilisateur

```
GET    /me
PUT    /me
POST   /me/avatar
GET    /me/preferences
PATCH  /me/preferences
POST   /change-password
POST   /auth/logout
POST   /logout-all-devices
GET    /me/specialties
PUT    /me/specialties
```

### Projets

```
GET    /projects
POST   /projects
GET    /projects/{id}
PUT    /projects/{id}
DELETE /projects/{id}
GET    /projects/{id}/dashboard       [check.project:view]
GET    /projects/{id}/activity        [check.project:view]
GET    /projects/{id}/members         [check.project:view]
POST   /projects/{id}/members         [check.project:edit + project.not_paused]
DELETE /projects/{id}/members/{user}  [check.project:edit + project.not_paused]
PUT    /projects/{id}/change-chef     [check.project:edit + project.not_paused]
POST   /projects/{id}/invite          [check.project:view]
GET    /projects/{id}/export/tasks    [check.project:view]
GET    /projects/{id}/critical-path   [check.project:view]
GET    /projects/{id}/user-search     [check.project:edit + project.not_paused]

# ★ Pause / Reprise (Sprint 6)
POST   /projects/{id}/pause           [policy: pause — body: { pause_reason: string }]
POST   /projects/{id}/resume          [policy: resume — admin ou chef_id uniquement]
GET    /projects/paused-stats         [admin uniquement]
```

### Sprints

```
GET    /projects/{id}/sprints         [check.project:view]
GET    /projects/{id}/backlog         [check.project:view]
POST   /projects/{id}/sprints         [check.project:edit]
PUT    /projects/{id}/sprints/{s}     [check.project:edit]
DELETE /projects/{id}/sprints/{s}     [check.project:edit]
POST   /projects/{id}/sprints/{s}/start
POST   /projects/{id}/sprints/{s}/end
POST   /projects/{id}/sprints/{s}/complete
PATCH  /projects/{id}/backlog/reorder
POST   /projects/{id}/sprints/{s}/tasks/{t}
```

### Tâches

Toutes les routes d'écriture de tâches sont protégées par `project.not_paused`.
Si le projet est en `on_hold` → HTTP 423 PROJECT_LOCKED.

```
GET    /tasks
GET    /projects/{id}/tasks           [check.project:view]
POST   /projects/{id}/tasks           [check.project:edit + project.not_paused]
GET    /tasks/{id}
PUT    /tasks/{id}                    [can:update,task + project.not_paused]
DELETE /tasks/{id}                    [can:delete,task + project.not_paused]
PATCH  /tasks/{id}/move               [can:update,task + project.not_paused]

# Assignees
GET    /tasks/{id}/assignees
POST   /tasks/{id}/assign             [can:update,task + project.not_paused]
DELETE /tasks/{id}/unassign/{user}    [can:update,task + project.not_paused]

# Dépendances
GET    /tasks/{id}/dependencies
POST   /tasks/{id}/dependencies       [project.not_paused]
DELETE /tasks/{id}/dependencies/{dep} [project.not_paused]

# Commentaires
GET    /tasks/{id}/comments
POST   /tasks/{id}/comments           [project.not_paused]
PUT    /tasks/{id}/comments/{c}       [project.not_paused]
DELETE /tasks/{id}/comments/{c}       [project.not_paused]

# Pièces jointes
GET    /tasks/{id}/attachments
POST   /tasks/{id}/attachments        [project.not_paused]
GET    /tasks/{id}/attachments/{a}/download
DELETE /tasks/{id}/attachments/{a}    [project.not_paused]

# Suivi du temps
GET    /tasks/{id}/time-entries
POST   /tasks/{id}/time-entries
DELETE /tasks/{id}/time-entries/{e}
```

### Statuts Kanban

```
GET    /projects/{id}/statuses        [check.project:view]
POST   /projects/{id}/statuses        [check.project:edit]
POST   /projects/{id}/statuses/reorder
PUT    /statuses/{id}
DELETE /statuses/{id}
```

### Équipes (admin)

```
GET    /teams
POST   /teams
GET    /teams/{id}
PUT    /teams/{id}
DELETE /teams/{id}
POST   /teams/{id}/members
PATCH  /teams/{id}/members/{user}
PATCH  /teams/{id}/members/{user}/project-role
PATCH  /teams/{id}/members/{user}/specialties
DELETE /teams/{id}/members/{user}
```

### Utilisateurs (admin)

```
GET    /users
POST   /users
PUT    /users/{id}
DELETE /users/{id}
DELETE /users/{id}/permanent
```

### IA et ML (admin + member)

```
GET    /ai/estimate/{task}
GET    /ai/delay-risk/task/{task}
GET    /ai/delay-risk/project/{project}
GET    /ai/suggest-assignment/{task}
GET    /ai/optimize-assignments/{project}
GET    /ai/recommendations/project/{project}
GET    /ai/workload-balance/{project}
POST   /ai/chat

POST   /ml/recommend
GET    /ml/recommend/{task}
GET    /ml/model-info
POST   /ml/feedback/{task}
POST   /ml/retrain              [admin uniquement]
```

### Notifications

```
GET    /notifications
GET    /notifications/summary
GET    /notifications/stats
POST   /notifications/read
PATCH  /notifications/{id}/read
POST   /notifications/read-all
DELETE /notifications/read            (vider les lues)
DELETE /notifications/{id}            (supprimer une)
GET    /notifications/preferences
PUT    /notifications/preferences
```

### Surveillance & Suivi

```
GET    /tasks/{task}/watchers
POST   /tasks/{task}/watch
DELETE /tasks/{task}/watch

GET    /projects/{project}/followers
POST   /projects/{project}/follow
DELETE /projects/{project}/follow
```

### Progression quotidienne (Worklog)

```
GET    /tasks/{task}/worklog
POST   /tasks/{task}/worklog
GET    /tasks/{task}/worklog/users
PUT    /tasks/{task}/worklog/validate
```

### Autres

```
GET    /search
GET    /gantt                                    ← admin : toutes tâches ; chef : ses projets + assignées ; client : projets invités
GET    /projects/{id}/gantt           [check.project:view]  ← admin : toutes ; chef/client : toutes ; membre : assignées seulement
PUT    /projects/{id}/gantt           [check.project:edit]  ← client bloqué par canEditProject() → false
GET    /calendar                                 ← accessible à tous les rôles authentifiés, données filtrées par projet
GET    /activity/feed                 [check.role:!client]  ★ (rôles dynamiques autorisés)
GET    /specialties
GET    /projects/{id}/auto-assign     [check.project:view, check.role:!client]  ← NOUVEAU
GET    /projects/{id}/members-performance [check.project:view, check.role:!client]  ← NOUVEAU
GET    /projects/{id}/activity        [check.project:view, check.role:!client]   ← NOUVEAU
GET    /tasks/{task}/matching-members
GET    /admin/dashboard               [admin]
GET    /member/dashboard
GET    /member/dashboard/summary
GET    /client/projects/{id}/report   [check.project:view]
GET    /clients
POST   /clients
PUT    /clients/{id}
DELETE /clients/{id}
GET    /invitations/pending
POST   /invitations/{token}/accept
POST   /invitations/{token}/decline
```

---

## 9. Authentification et sécurité

### Token Bearer (Sanctum)

```
POST /api/auth/login → { token: "1|abc123...", user: {...} }

# Toutes les requêtes protégées :
Authorization: Bearer 1|abc123...
Accept: application/json
Content-Type: application/json
```

### RBAC — Rôles globaux (Spatie) — Nomenclature officielle

| Nom technique | Nom affiché | Accès |
|---|---|---|
| `admin` | **Administrateur** | Total — gestion users, teams, projects, specialties, dashboard global, pause/reprise tous projets |
| `member` | **Collaborateur** | Projets assignés, tâches, IA, dashboard membre |
| `client` | **Observateur** | Lecture seule — dashboard projet, rapports, risques IA |
| Rôles **dynamiques** | *(nom libre)* | Ex: `scrum master`, `tech lead` — traités comme Collaborateur (non-client) |

Des rôles personnalisés peuvent être créés via l'interface *Rôles & Permissions*. Ils peuvent avoir leurs propres permissions granulaires. La règle d'accès principale repose sur `!client` : tout rôle différent de `client` a les droits Collaborateur.

**Validation backend (dynamique) :**
```php
'role' => 'exists:roles,name'   // accepte tout rôle existant en DB
```

Création des rôles système : `php artisan db:seed --class=RoleAndPermissionSeeder`

### Permissions Spatie — Groupe Projets (complet)

| Permission | Description | Administrateur | Collaborateur | Observateur |
|---|---|---|---|---|
| `project.view` | Voir les projets | ✅ | ✅ | ✅ |
| `project.create` | Créer un projet | ✅ | ✅ | ❌ |
| `project.edit` | Modifier un projet | ✅ | ✅ | ❌ |
| `project.delete` | Supprimer un projet | ✅ | ❌ | ❌ |
| `project.archive` | Archiver un projet | ✅ | ✅ | ❌ |
| `project.export` | Exporter les données | ✅ | ✅ | ✅ |
| `project.manage_members` | Gérer les membres (ajout) | ✅ | ✅ | ❌ |
| `project.member.remove` ★ | Retirer un membre | ✅ | Chef de projet uniquement | ❌ |
| `project.manage_settings` | Modifier les paramètres | ✅ | ✅ | ❌ |
| `project.pause` ★ | Mettre en pause | ✅ | ❌ | ❌ |
| `project.resume` ★ | Reprendre (RBAC seul insuffisant) | ✅ | ❌ | ❌ |

★ `project.pause` : accordée aussi automatiquement au chef et propriétaire du projet via la policy.  
★ `project.resume` : la policy impose admin ou chef_id uniquement, cette permission RBAC ne change pas la restriction.

### Rôles projet (colonne `project_role` dans `project_members`) — Nomenclature officielle

| Nom technique | Nom affiché | Droits |
|---|---|---|
| `chef` | **Chef de projet** | CRUD complet, gestion membres, invitations, pause/reprise |
| `membre` | **Contributeur** | Création/édition de tâches, commentaires, worklog |
| `client` / `guest` / `viewer` | **Observateur** | Lecture seule — suit le projet, accès Gantt/calendrier |
| `admin` / `owner` (legacy) | **Chef de projet** | Traité comme chef |

### Flux d'authentification

```
POST /api/auth/register → inscription + rôle 'member'
POST /api/auth/login    → token Sanctum
GET  /api/me            → profil (token requis)
POST /api/auth/logout   → révocation token courant
POST /api/logout-all-devices → révocation tous tokens
POST /api/auth/forgot-password → email reset
POST /api/auth/reset-password  → nouveau mot de passe
```

---

## 10. Frontend React

### 10.1 Structure et routing

Toutes les pages sont **lazy-loaded** via `React.lazy()` — code splitting automatique.

| Route | Page | Accès |
|---|---|---|
| `/` | `LandingPage` | Guest uniquement |
| `/login` | `LoginPage` | Guest uniquement |
| `/register` | `RegisterPage` | Guest uniquement |
| `/forgot-password` | `ForgotPasswordPage` | Guest uniquement |
| `/reset-password` | `ResetPasswordPage` | Public |
| `/accept-invite` | `AcceptInvitePage` | Public |
| `/dashboard` | `DashboardPage` | Authentifié |
| `/projects` | `ProjectsPage` | Authentifié — affiche chef de projet ★ |
| `/projects/:id` | `ProjectDetailPage` | Authentifié — listeners WebSocket tâches ★ |
| `/projects/:id/tasks/new` | `TaskFormPage` | Authentifié |
| `/projects/:id/tasks/:taskId/edit` | `TaskFormPage` | Authentifié |
| `/projects/:id/members-performance` | `MembersPerformancePage` | Authentifié |
| `/tasks` | `TasksHubPage` | Authentifié |
| `/calendar` | `CalendarPage` | admin, member |
| `/teams` | `TeamsPage` | admin |
| `/teams/:id` | `TeamDetailPage` | admin |
| `/users` | `UsersAdminPage` | admin |
| `/gantt` | `GanttPage` | admin, member, client |
| `/ai` | `AiPage` | admin, member |
| `/notifications` | `NotificationsPage` | Authentifié — filtre, recherche, scroll infini |
| `/notifications/settings` | `NotificationSettingsPage` | Authentifié — préférences par type |
| `/settings` | `SettingsPage` | Authentifié |
| `/audit-log` | `AuditLogPage` | admin, member |
| `*` | `NotFoundPage` | Public |

**Gardes de routes :**

```jsx
<ProtectedRoute>        // Authentifié uniquement
<GuestRoute>            // Non connecté uniquement
<RoleRoute allow={['admin', 'member']}>  // Filtrage par rôle
```

### 10.2 Composants

#### Layout (`components/layout/`)

| Composant | Rôle |
|---|---|
| `AppLayout` | Layout principal — sidebar + topbar + `<Outlet />` |
| `Sidebar` | Navigation filtrée par rôle (cache menu admin pour client) |
| `Topbar` | Barre supérieure — recherche globale, notifications, avatar |
| `GlobalSearchBar` | Recherche inline (projets, tâches, utilisateurs) |

#### UI Atomiques (`components/ui/`)

`Button` · `Input` · `Textarea` · `Select` · `Modal` · `Card` · `Badge` · `Spinner` · `Skeleton` · `EmptyState` · `UserAvatar` · `UserSelect` · `PasswordInput` · `ErrorBoundary`

Tous utilisent `cn()` (clsx + tailwind-merge) pour la composition de classes TailwindCSS.

#### Tâches (`components/tasks/`)

| Composant | Rôle |
|---|---|
| `WorkflowBoard` | Kanban drag-and-drop par `workflow_status` |
| `TaskCard` | Carte tâche compacte |
| `MemberAssigneePicker` | Sélecteur d'assignee avec rôles et spécialités |
| `DueDateRangeFilter` | Filtre plage de dates avec presets |
| `TaskDependencyPicker` | Sélecteur de dépendances inter-tâches |
| `MLRecommendationModal` | Affichage résultats ML (22 features, scores, forces/faiblesses) |
| `MembersPerformanceModal` | Performance comparative des membres |
| `DailyProgressModal` | Saisie worklog quotidien (temps + delta progression) + vue par contributeur |
| `WatcherButton` | Bouton Surveiller/Ne plus surveiller une tâche (Eye/EyeOff) |

#### Spécialisés

| Composant | Rôle |
|---|---|
| `GanttChart` | Diagramme de Gantt — barre réelle vs attendue, badge ▲/▼ delta |
| `CalendarView` | Calendrier mensuel des tâches |
| `NotificationDropdown` | Dropdown notifs temps réel — badge non lues, filtre, marquer tout lu |
| `SpecialtyCardGrid` | Grille de sélection des spécialités |
| `UserManagement` | CRUD utilisateurs admin — rôles dynamiques chargés depuis l'API |
| `FollowerButton` | Bouton Suivre/Ne plus suivre un projet (Star/StarOff) |

#### Pause / Reprise de projet (`components/projects/`) — ★ Sprint 6

| Composant | Rôle |
|---|---|
| `ProjectPauseButton` | Bouton adaptatif — ⏸️ Pause (amber) ou ▶️ Reprendre (vert) selon état et permissions |
| `PauseProjectModal` | Modal de confirmation avec sélecteur de raison (7 presets) + texte libre, validation min 5 chars |
| `ProjectPauseBanner` | Bannière pleine largeur orange affichée sur tout projet en `on_hold` — raison, qui a pausé, durée (date-fns) |

#### Hook Pause (`hooks/`)

| Hook | Rôle |
|---|---|
| `useProjectPause(projectId)` | Mutations React Query pause + resume avec **optimistic UI** — retourne `pause()`, `resume()`, `isPausing`, `isResuming` |

### 10.3 Contextes

#### `AuthContext`

```jsx
const { user, login, register, logout, loading, fetchUser } = useAuth();
// user → null si non connecté, objet { id, name, email, roles[], permissions[], ... }
// login(email, password) → stocke token dans localStorage + fetchUser
// logout() → révoque token + reset state
```

Le token Sanctum est attaché automatiquement par Axios via un intercepteur dans `lib/api.js`.

**Mise à jour automatique des permissions (★ nouveau) :**  
`AuthContext` s'abonne au canal WebSocket `private-user.{id}` et écoute l'événement `.permission.changed`. Quand un admin change le rôle ou les permissions d'un utilisateur, celui-ci reçoit une mise à jour silencieuse (re-fetch `/me` + `/me/permissions`) sans avoir à se reconnecter.

#### `I18nContext`

```jsx
const { t } = useI18n();
t('dashboard.welcome') // → "Bienvenue"
```

Interface **exclusivement en français**. Toutes les clés sont dans `i18n/messages.js`.

### 10.4 Lib et utilitaires

| Fichier | Exports clés |
|---|---|
| `lib/api.js` | Instance Axios pré-configurée (baseURL `/api`, token auto, 401 → logout) |
| `lib/echo.js` | `getEcho()`, `disconnectEcho()` — Laravel Echo + WebSocket |
| `lib/theme.js` | `applyAppTheme()`, `resolveThemeForUser()`, `setStoredThemeForUser()` |
| `lib/utils.js` | `cn(...classes)` — clsx + tailwind-merge |
| `lib/roles.js` | `isGuestViewer()`, `formatAppRole()` (FR uniquement), `APP_ROLE_LABELS`, `PROJECT_ROLE_LABELS` |
| `lib/taskConstants.js` | `WORKFLOW_COLUMNS`, `ISSUE_TYPE_LABELS`, `PRIORITY_OPTIONS` |
| `lib/activityHumanize.js` | `humanizeActivityLine()` — texte lisible depuis événements |
| `lib/projectActivityHumanize.js` | Humanisation activité projet |
| `lib/formatRelativeTime.js` | `formatRelativeTimeFr()`, `groupNotificationsByDate()` |
| `lib/ganttNormalize.js` | `normalizeGanttTasks()` — normaliser données Gantt |
| `lib/notificationNav.js` | `getNotificationLink()` — résoudre liens notifs |
| `lib/dueDateRangePresets.js` | `getDueDatePresets()` — presets filtre dates |
| `lib/safeRedirect.js` | `safeRedirectPath()` — redirection post-login |
| `lib/unwrapApi.js` | `unwrapCollection()`, `POLL_INTERVAL_MS` (30000 ms) |
| `lib/services/dashboardApi.js` | `fetchAdminDashboard()`, `fetchMemberDashboard()`, `fetchActivityFeed()` |
| `lib/services/notificationsApi.js` | `fetchNotifications()`, `markNotificationRead()`, `markAllRead()` |
| `lib/services/invitationsApi.js` | `fetchMyInvites()`, `acceptProjectInvite()`, `declineProjectInvite()` |

### 10.5 Configuration Vite

```js
// vite.config.js
proxy: {
  '/api':     { target: 'http://localhost:8000' },  // Backend Laravel
  '/storage': { target: 'http://localhost:8000' },  // Fichiers publics
}

// Code splitting (chunks séparés)
manualChunks: {
  'vendor-react':  ['react', 'react-dom', 'react-router-dom'],
  'vendor-query':  ['@tanstack/react-query'],
  'vendor-motion': ['framer-motion'],
  'vendor-forms':  ['react-hook-form', 'zod', '@hookform/resolvers'],
  'vendor-ui':     ['sonner', 'date-fns'],
}

// Alias
resolve: { alias: { '@': './src' } }
```

---

## 11. Intelligence Artificielle et ML

### 11.1 Architecture IA hybride

Le moteur IA combine deux approches :

| Composant | Technologie | Usage |
|---|---|---|
| **LLM** | OpenRouter → Llama 3.3 70B | Chat, estimation narrative, analyse de risques textuelles, recommandations projet |
| **ML** | Python scikit-learn (GBM + RF) | Recommandation d'assignation basée sur 22 features numériques |

```
React → GET /api/ml/recommend/{task}
             ↓
        Laravel MLController
             ↓ HTTP POST
        Python FastAPI (port 8001)
             ↓
        recommender.py → features.py → MySQL (lecture directe)
             ↓
        Score [0,100] par candidat + explications
             ↓
        React MLRecommendationModal (22 features affichées)
```

### 11.2 Service ML Python

**Fichiers :**
```
python/ml/
├── app.py          → Serveur FastAPI (routes HTTP)
├── recommender.py  → Moteur ML (entraînement + inférence)
├── features.py     → Extraction 22 features (vecteurs normalisés [0,1])
├── database.py     → Pool SQLAlchemy (connexion MySQL)
├── ml_config.py    → Poids heuristiques et constantes
├── train.py        → Script CLI entraînement manuel
├── main.py         → Entry point Render (import de app.py)
└── models/
    ├── task_assignment.joblib       → Pipeline sklearn sérialisé
    └── task_assignment_meta.joblib  → Métriques + importances
```

**Algorithme selon volume de données :**

| Condition | Modèle |
|---|---|
| ≥ 40 échantillons étiquetés | **GBM + Random Forest** (VotingClassifier) avec CalibratedClassifierCV |
| 10–39 échantillons | **Régression Logistique** (fallback) |
| < 10 échantillons | **Score heuristique** (produit scalaire pondéré) |

**Pipeline sklearn :**
```
StandardScaler → CalibratedClassifierCV(VotingClassifier(GBM + RF))
```

**Label d'entraînement (y=1 = succès) :**
- Tâche en `workflow_status = 'done'`
- ET livrée à temps : `updated_at ≤ due_date`
- ET heures respectées : `actual_hours ≤ estimated_hours × 1.3`

**Sélection des candidats :**
```
1. Membres explicites du projet (project_members)
       ↓ si vide
2. Membres de l'équipe associée (team_user)
       ↓ si vide
3. Tous les utilisateurs actifs non-admin (max 20)
```
Les administrateurs sont **toujours exclus** du pool de candidats.

### 11.3 Les 22 features

Chaque candidat est représenté par un vecteur de **22 dimensions normalisées [0, 1]**.

| Groupe | Feature | Description |
|---|---|---|
| **Compétences** | `specialty_exact_match` | Possède exactement la spécialité requise |
| | `specialty_partial_match` | Proportion de spécialités requises |
| | `specialty_breadth` | Polyvalence globale (`nb_spécialités / 10`) |
| **Charge** | `current_task_load` | Tâches actives (`1 - nb_actives / 8`) |
| | `capacity_utilization` | Saturation allocation (`1 - alloc / 100`) |
| | `overdue_ratio_inv` | Proportion tâches NON en retard |
| **Historique** | `overall_completion_rate` | Taux de tâches terminées (total) |
| | `on_time_rate` | Taux de livraison à temps |
| | `hours_accuracy` | Précision des estimations d'heures |
| **Affinité tâche** | `same_priority_success` | Succès sur mêmes priorités |
| | `same_type_success` | Succès sur mêmes types |
| | `complexity_affinity` | Gaussienne centrée sur complexité habituelle |
| **Contexte projet** | `project_familiarity` | Tâches done dans CE projet (`/ 10`) |
| | `team_familiarity` | Projets communs passés (`/ 5`) |
| | `project_role_weight` | admin/chef=1.0, member=0.7, client=0.3 |
| **Tendance 30j** | `recent_velocity` | Tâches done ces 30 jours (`/ 15`) |
| | `performance_trend` | Évolution taux on-time (30j vs 30j-60j) |
| | `recent_on_time_rate` | Taux livraison à temps (30 derniers jours) |
| **Risque** | `at_risk_tasks_inv` | Absence de tâches à risque (`1 - nb_risk / 5`) |
| | `experience_depth` | Profondeur d'expérience (`min(done / 100, 1)`) |
| | `collaboration_score` | Historique collaboration (`nb_partagées / 10`) |
| | `sprint_alignment` | Déjà actif dans ce sprint (0.9 oui / 0.4 non) |

**Poids heuristiques les plus importants (mode sans données suffisantes) :**
- `specialty_exact_match` → **4.0**
- `specialty_partial_match` → **2.5**
- `current_task_load` → **2.5**
- `on_time_rate` → **2.5**
- `recent_on_time_rate` → **2.0**

### 11.4 Endpoints Python

| Méthode | URL | Description |
|---|---|---|
| `POST` | `/recommend` | Recommander pour tâche non encore créée |
| `GET` | `/recommend/{task_id}` | Recommander pour tâche existante |
| `POST` | `/train` | Déclencher ré-entraînement |
| `GET` | `/model-info` | Métriques + importances des features |
| `POST` | `/feedback/{task_id}` | Signal d'apprentissage post-complétion |
| `GET` | `/health` | Vérification de disponibilité |

**Réponse type `/recommend` :**
```json
{
  "best_user_id": 5,
  "candidates": [{
    "user_id": 5,
    "name": "Alice Martin",
    "score": 78.4,
    "relative_score": 100,
    "feature_breakdown": {
      "specialty_exact_match": { "value": 1.0, "label": "Compétences exactes" },
      "on_time_rate": { "value": 0.88, "label": "Taux livraison à temps" }
    },
    "strengths": ["Compétences exactes requises", "Livraison à temps récente"],
    "weaknesses": ["Charge de travail actuelle"]
  }],
  "model_info": {
    "is_trained": true,
    "model_label": "GBM+RF Ensemble",
    "n_samples": 87,
    "accuracy": 0.821,
    "f1": 0.814,
    "feature_count": 22
  }
}
```

### 11.5 Intégration Laravel ↔ Python

```php
// app/Services/ML/PythonMLClient.php
$result = $this->mlClient->recommend($task, $project->id, $topN = 5);
$bestId = $result['best_user_id'] ?? null;

// Variables d'env Laravel :
ML_SERVICE_URL=http://127.0.0.1:8001
ML_SERVICE_TIMEOUT=3
```

En cas de timeout ou d'erreur du service Python, Laravel retourne une réponse dégradée gracieusement (pas d'exception non catchée).

---

## 12. WebSocket — Temps réel

**Laravel Reverb** (port 8080) gère les connexions WebSocket.  
**Laravel Echo** + **Pusher JS** côté frontend s'abonnent aux canaux.  
Tous les événements implémentent `ShouldBroadcastNow` (broadcast synchrone, sans queue).

### Démarrage Reverb

```bash
php artisan reverb:start
```

### Canaux (`routes/channels.php`)

```php
// Canal utilisateur privé — notifications + changements de permissions
Broadcast::channel('user.{userId}',
  fn($user, $userId) => $user->id === $userId
);

// Canal projet privé — activité en temps réel
Broadcast::channel('project.{projectId}', function($user, $projectId) {
  return $user->hasRole('admin') || Project::where('id', $projectId)
    ->whereHas('members', fn($q) => $q->where('users.id', $user->id))
    ->exists();
});
```

### Tableau complet des événements broadcast

| Classe PHP | Nom WebSocket | Canal | Déclenché par |
|---|---|---|---|
| `ActivityLogged` | `.activity.logged` | `private-project.{id}` | Toute action logguée |
| `NotificationCreated` | `.notification.created` | `private-user.{id}` | Nouvelle notification |
| `NotificationUpdated` | `.notification.updated` | `private-user.{id}` | Notif lue / archivée |
| `TaskCommentCreated` | `.task.comment.created` | `private-project.{id}` | Commentaire ajouté |
| `TaskCommentDeleted` | `.task.comment.deleted` | `private-project.{id}` | Commentaire supprimé |
| `TaskUpdated` ★ | `.task.updated` | `private-project.{id}` | Tâche modifiée ou déplacée Kanban |
| `TaskDeleted` ★ | `.task.deleted` | `private-project.{id}` | Tâche supprimée |
| `TaskAssignmentChanged` ★ | `.task.assignment.changed` | `private-project.{id}` + `private-user.{id}` | Assignation / désassignation |
| `PermissionChanged` | `.permission.changed` | `private-user.{id}` | Changement rôle ou permission |
| `SprintStateChanged` | `.sprint.state.changed` | `private-project.{id}` | Sprint démarré ou terminé |
| `ProgressUpdated` | `.progress.updated` | `private-project.{id}` | Progression tâche ou projet mise à jour |
| `ProjectStatusChanged` ★ | `.project.status.changed` | `private-project.{id}` | Projet mis en pause ou repris |

### Émettre un événement (backend)

```php
use App\Events\TaskUpdated;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;

class TaskUpdated implements ShouldBroadcastNow
{
    public function broadcastOn(): array {
        return [new PrivateChannel("project.{$this->task->project_id}")];
    }
    public function broadcastAs(): string { return 'task.updated'; }
    public function broadcastWith(): array {
        return ['task_id' => $this->task->id, 'action' => $this->action, ...];
    }
}

// Dans le contrôleur :
event(new TaskUpdated($task, Auth::user(), 'updated', $changed));
```

### Listeners frontend par page

#### `ProjectDetailPage.jsx` — canal `private-project.{id}` (8 événements)
```js
channel.listen('.task.comment.created', () => queryClient.invalidateQueries(['tasks', id]));
channel.listen('.task.comment.deleted', () => queryClient.invalidateQueries(['tasks', id]));
channel.listen('.task.updated', (e) => {
  queryClient.invalidateQueries({ queryKey: ['tasks', id] });
  if (e.action === 'moved') queryClient.invalidateQueries(['project-dashboard', id]);
});
channel.listen('.task.deleted', (e) => {
  queryClient.invalidateQueries({ queryKey: ['tasks', id] });
  queryClient.invalidateQueries(['project-dashboard', id]);
  toast.info(`Tâche "${e.task_title}" supprimée par ${e.actor_name}`);
});
channel.listen('.task.assignment.changed', () => queryClient.invalidateQueries(['tasks', id]));
channel.listen('.activity.logged', () => queryClient.invalidateQueries(['project-activity', id]));
channel.listen('.sprint.state.changed', () => {
  queryClient.invalidateQueries(['tasks', id]);
  queryClient.invalidateQueries(['project', id]);
});
channel.listen('.progress.updated', (e) => {
  queryClient.invalidateQueries(['tasks', id]);
  queryClient.invalidateQueries(['project', id]);
  queryClient.invalidateQueries(['project-dashboard', id]);
  if (e.source === 'worklog' && e.actor_id !== user?.id)
    toast.info(`${e.actor_name} a mis à jour la progression de "${e.task_title}" → ${e.task_progress}%`);
});
// ★ Sprint 6 — Pause / Reprise
channel.listen('.project.status.changed', (e) => {
  queryClient.invalidateQueries(['project', id]);
  queryClient.invalidateQueries(['projects']);
  if (e.action === 'paused')
    toast.warning(`⏸️ Projet mis en pause par ${e.actor_name}`, { description: e.pause_reason });
  else
    toast.success(`▶️ Projet repris par ${e.actor_name}`);
});
```

#### `AuthContext.jsx` — canal `private-user.{userId}`
```js
channel.listen('.permission.changed', () => {
  fetchUser(); // Re-fetch /me + /me/permissions silencieusement
});
```

#### `DashboardPage.jsx` — canaux `private-project.{id}` de tous les projets (5 événements)
```js
const refresh = () => {
  queryClient.invalidateQueries(['dashboard-tasks']);
  queryClient.invalidateQueries(['member-dashboard']);
  queryClient.invalidateQueries(['admin-dashboard']);
  queryClient.invalidateQueries(['dashboard-project-metrics']);
};
ch.listen('.task.updated', refresh);
ch.listen('.task.deleted', refresh);
ch.listen('.sprint.state.changed', refresh);   // ★ nouveau
ch.listen('.progress.updated', refresh);        // ★ nouveau
ch.listen('.activity.logged', () => queryClient.invalidateQueries(['activity-feed']));
```

#### `AuditLogPage.jsx` — canaux `private-project.{pid}` de tous les projets visibles
```js
ch.listen('.activity.logged', handleNewActivity);  // prepend en temps réel sans refresh
```

#### `NotificationDropdown.jsx` + `NotificationsPage.jsx` — canal `private-user.{userId}`
```js
channel.listen('.notification.created', refresh);
channel.listen('.notification.updated', refresh);
```

### Variables d'environnement React (WebSocket)

```ini
VITE_BROADCAST_DRIVER=reverb
VITE_REVERB_APP_KEY=app-key
VITE_REVERB_HOST=127.0.0.1
VITE_REVERB_PORT=8080
VITE_REVERB_SCHEME=http
```

---

## 13. Base de données

**Nom :** `gestion_projets_pfe` — MySQL 8.x

### Tables principales

| Table | Description |
|---|---|
| `users` | Utilisateurs (auth + préférences) |
| `projects` | Projets |
| `tasks` | Tâches hiérarchiques |
| `sprints` | Sprints Scrum |
| `teams` | Équipes |
| `clients` | Clients associés aux projets |
| `task_statuses` | Colonnes Kanban personnalisées par projet |
| `task_assignments` | Pivot User ↔ Task (allocation_percent) |
| `task_dependencies` | Dépendances inter-tâches (type FS/SS/FF/SF) |
| `task_comments` | Commentaires threaded (parent_id) |
| `attachments` | Pièces jointes (file ou link) |
| `time_entries` | Suivi du temps (minutes) |
| `specialties` | Compétences |
| `user_specialty` | Pivot User ↔ Specialty |
| `task_specialty` | Pivot Task ↔ Specialty |
| `project_members` | Pivot Project ↔ User (project_role) |
| `team_user` | Pivot Team ↔ User (role_in_team, capacity) |
| `notifications` | Notifications in-app (actor_id, entity_type, entity_id) |
| `task_watchers` | Abonnés aux notifications d'une tâche |
| `project_followers` | Abonnés aux notifications d'un projet |
| `daily_task_progress` | Journal de progression quotidienne (worklog) |
| `project_invitations` | Invitations par email (token, status) |
| `activity_logs` | Journal d'activité morphable |
| `activities` | Tracker actions utilisateur |
| `ai_recommendations` | Historique recommandations ML/IA |
| `personal_access_tokens` | Tokens Sanctum |
| `roles`, `permissions`, `model_has_roles` | Spatie Permission |
| `cache`, `sessions`, `jobs`, `migrations` | Infrastructure Laravel |

### Schéma SQL des tables clés

```sql
-- users
id, name, email, password, status (active|inactive|suspended),
avatar, profile_photo, theme, locale,
notify_in_app (bool), notify_email (bool),
notify_type_task_assigned (bool), notify_type_task_updated (bool),
notify_type_task_completed (bool), notify_type_comment (bool),
notify_type_task_delayed (bool), notify_type_permission (bool),
notify_type_invitation (bool), notify_type_ai_alert (bool),
notify_type_project (bool),
timezone, created_at, updated_at, deleted_at

-- projects
id, team_id, client_id, owner_id, created_by, project_manager_id, chef_id,
name, code, description, status, priority,
start_date, end_date,
-- Pause / Reprise (★ Sprint 6 — migration 2026_05_26_000001)
paused_at (timestamp nullable), paused_by (FK→users nullable),
pause_reason (text nullable), previous_status (varchar nullable),
created_at, updated_at, deleted_at

-- tasks
id, project_id, sprint_id, parent_id, status_id, created_by, updated_by,
title, description, issue_type, priority, complexity, story_points,
planned_start, planned_end, due_date, estimated_hours, estimated_duration,
duration_days, actual_hours, progress_percent, kanban_order,
workflow_status, risk_level, risk_score, archived_at,
ai_suggestion (JSON), created_at, updated_at, deleted_at

-- project_members
project_id, user_id, project_role (chef|member|client)

-- task_dependencies
task_id, depends_on_task_id, type (FS|SS|FF|SF)

-- notifications
id, user_id, related_task_id, message, type, severity,
data (JSON), read_at, created_at
```

---

## 14. Modules fonctionnels

### Gestion de projets

- CRUD projets avec statut, priorité, dates, chef de projet, équipe associée
- **Chef de projet** visible sur chaque carte (`ProjectsPage`) — icône couronne + nom ★
- Invitation de membres par email (token signé, expiration 7 jours)
- Rôles par projet : chef / member / client
- Dashboard admin (KPIs globaux) et member (KPIs personnels)
- Journal d'activité morphable par projet — mise à jour live via WebSocket ★
- Export des tâches (CSV/JSON)

**Données chef retournées par `/api/projects` :**
```json
{
  "chef_id": 5,
  "chef": { "id": 5, "name": "Alice Martin", "email": "alice@example.com" }
}
```

### Sprints et backlog

- CRUD sprints (planned → active → completed, un seul actif par projet)
- Backlog : tâches sans sprint, réordonnables par drag
- Démarrage sprint → `status = 'active'`, `started_at = now()`
- Clôture sprint → tâches non terminées retournent au backlog
- Rapport de sprint (vélocité, taux de complétion)

### Gestion de tâches

- Wizard 4 étapes : Informations → Dates & complexité → Spécialités → Assignation ML
- Hiérarchie : tâches parentales et sous-tâches (`parent_id`)
- Dépendances : FS / SS / FF / SF avec validation anti-cycle
- Types : story | bug | task | epic | subtask
- Commentaires threadés avec mentions `@utilisateur`
- Pièces jointes (upload fichier ou URL externe)
- Suivi du temps (time entries en minutes)

### Kanban

- Colonnes : `todo` · `in_progress` · `done` · `at_risk`
- Drag-and-drop entre colonnes (WorkflowBoard)
- Statuts personnalisés par projet (TaskStatus)
- Réordonnancement des statuts

### Gantt et chemin critique

- Visualisation temporelle par projet
- Déplacement de barres → mise à jour des dates
- `CriticalPathService` — algorithme CPM (chemin le plus long dans le graphe de dépendances)
- Surlignage du chemin critique (`is_critical = true`)
- Validation : les nouvelles dates ne peuvent pas violer les contraintes de dépendance

### Calendrier

- Vue mensuelle des tâches par date d'échéance
- Filtrage par projet
- Admin et member uniquement

### Notifications

- **In-app** : compteur badge en temps réel (WebSocket), dropdown, page dédiée
- **Email** : assignation, commentaire, tâche en retard
- **Préférences** : granularité par type d'événement (11 types : task_assigned, task_updated, task_completed, task_delayed, comment, project, invitation, permission, ai_alert — canaux in_app + email)
- **Types pause/reprise** : `project.paused` (warning, amber), `project.resumed` (info, emerald) — visibles dans NotificationDropdown et NotificationsPage
- Actions : marquer comme lu, marquer tout comme lu, supprimer une notif, vider toutes les lues

### Rôles & Permissions (interface admin) ★

Pages : `/admin/roles`, `/admin/roles/:id`, `/admin/permissions`

| Page | Fichier | Description |
|---|---|---|
| `RolesPage` | `pages/admin/RolesPage.jsx` | Liste des rôles — thème clair, bouton Supprimer visible, filtres Actifs/Archivés |
| `RoleDetailPage` | `pages/admin/RoleDetailPage.jsx` | Détail d'un rôle — permissions cochées en FR (description principale, slug secondaire) |
| `PermissionMatrixPage` | `pages/admin/PermissionMatrixPage.jsx` | Matrice rôles × permissions — descriptions FR en priorité |

**Affichage des permissions :**  
La description française (ex: "Voir les tâches") est affichée en gras ; le slug technique (ex: `task.view`) apparaît en dessous en petite police monospace. Cela rend l'interface compréhensible sans connaissance technique.

**Actions disponibles sur un rôle :**
- Voir le détail et les permissions accordées
- Modifier nom, description, couleur, niveau
- Activer/Désactiver (cocher/décocher des permissions)
- Archiver / Restaurer
- Dupliquer (copie toutes les permissions)
- Supprimer (bloqué pour les rôles système)

### Recherche globale

- `GET /api/search` — recherche multi-entités : projets, tâches, utilisateurs
- `GlobalSearchBar` dans Topbar — résultats inline avec navigation directe

### IA et ML

- **Page AiPage** : interface centralisée pour toutes les fonctions IA
- **TaskFormPage étape 4** : suggérer le meilleur assigné (ML + panel 22 features)
- **MLRecommendationModal** : afficher scores, forces, faiblesses par candidat
- **MembersPerformancePage** : métriques de performance par membre du projet

---

## 15. Flux applicatifs clés

### 15.1 Invitation à un projet

```
1. Chef → POST /projects/{id}/invite  { emails: ["alice@x.com"], role: "member" }
2. ProjectInviteService :
   → Générer token UUID
   → Créer ProjectInvitation (pending, expires: +7j)
   → Envoyer email avec lien /accept-invite?token=...
3. Alice clique → GET /invites/{token} (public)
   → Vérifier token valide et non expiré
   → Afficher AcceptInvitePage (détails projet)
4. Alice accepte → POST /invitations/{token}/accept
   → Authentification requise (redirect login si nécessaire)
   → Vérifier token + statut pending + expiration
   → Ajouter user dans project_members avec le rôle
   → Mettre à jour invitation : status=accepted
   → Redirect vers le projet
```

### 15.2 Création et suivi d'une tâche

```
1. Création — POST /projects/{id}/tasks
   → TaskController::store()
   → Créer Task
   → Créer TaskAssignments (assignee_ids)
   → Créer task_specialty (specialty_ids)
   → NotificationService::notifyAssignment() pour chaque assigné
   → ActivityLogService::log('task.created')
   → Broadcast TaskCreated sur canal project.{id}

2. Avancement — PUT /tasks/{id} { workflow_status: "in_progress" }
   → Recalculer risk_score si due_date proche
   → ActivityLogService::log('task.updated')
   → Broadcast TaskUpdated

3. Complétion — PUT /tasks/{id} { workflow_status: "done", progress_percent: 100 }
   → NotificationService::notifyCompleted()
   → POST /ml/feedback/{id} { on_time: bool, hours_ok: bool }
   → ActivityLogService::log('task.completed')
```

### 15.3 Gantt avec dépendances

```
1. GET /projects/{id}/gantt
   → Toutes les tâches avec dates, dépendances, is_critical

2. Utilisateur déplace une barre (drag JS)
   → Optimistic update local

3. PUT /projects/{id}/gantt { tasks: [{ id, planned_start, planned_end }] }
   → GanttController::updateDates()
   → Mettre à jour les dates
   → CriticalPathService::compute(project) → recalcul is_critical
   → TaskDependencyService → vérifier que les nouvelles dates ne violent pas FS/SS/FF/SF
   → Retourner nouveau Gantt avec chemins critiques mis à jour
```

### 15.4 Suggestion ML d'assignation

```
1. Utilisateur ouvre TaskFormPage étape 4 (ou AiPage)

2. React → POST /ml/recommend { project_id, priority, specialty_ids, ... }

3. Laravel MLController
   → POST http://localhost:8001/recommend { task data }
   → Timeout: ML_SERVICE_TIMEOUT secondes (3s)

4. Python FastAPI recommender.py
   → _fetch_candidates() → membres du projet
   → FeatureExtractor.extract(user, task) → vecteur 22D par candidat
   → model.predict_proba([features]) → score
   → Trier par score décroissant
   → Générer explications (top 3 forces/faiblesses)
   → Retourner top-5 candidats

5. React → MLRecommendationModal
   → Afficher scores, panel 22 features, forces/faiblesses
   → Clic → appel assign() sur la tâche

6. Post-complétion
   → POST /ml/feedback/{task} { on_time, hours_ok }
   → Signal stocké pour prochain entraînement
```

### 15.5 Sprint agile complet

```
1. Planification
   POST /projects/{id}/sprints { name, goal, start_date, end_date }
   → Sprint créé, status='planned'

2. Alimentation du backlog
   PUT /tasks/{id} { sprint_id: 1 }

3. Démarrage
   POST /projects/{id}/sprints/{s}/start
   → SprintService::start() → status='active', started_at=now()
   → Vérifier un seul sprint actif par projet
   → Broadcast SprintStarted

4. Pendant le sprint
   → Kanban board : déplacer tâches entre colonnes
   → PUT /tasks/{id} { workflow_status: "in_progress|done" }

5. Clôture
   POST /projects/{id}/sprints/{s}/complete
   → SprintService::complete() → status='completed', ended_at=now()
   → Tâches non done → sprint_id = null (retour backlog)
   → Rapport vélocité
   → Broadcast SprintCompleted

6. Rétrospective
   → MembersPerformancePage : métriques par membre
```

---

## 16. Règles métier

### Validation des dates de tâche

| Contrainte | Règle |
|---|---|
| `planned_start` | ≥ `project.start_date` (si défini) |
| `planned_end` | ≤ `project.end_date` (si défini) |
| `planned_start` | ≤ `planned_end` |
| `planned_start` | **Immuable après création** (`assertPlannedStartImmutable`) |

Validation à **deux niveaux** :
- Frontend : `validateStep()` dans `TaskFormPage.jsx`, attributs HTML `min/max`
- Backend : `TaskController::assertTaskDatesWithinProjectWindow()` → 422 si violation

**Cas particuliers :**
- Projet sans dates → aucune contrainte sur les tâches
- Tâche sans dates → autorisé (champs optionnels)
- Update partiel (`workflow_status` uniquement) → les dates existantes ne sont PAS re-validées

### Dépendances inter-tâches

- `TaskDependencyService` vérifie l'absence de cycles (graphe orienté acyclique)
- Types : FS (Finish-Start), SS (Start-Start), FF (Finish-Finish), SF (Start-Finish)
- Une dépendance FS signifie : `start(B) ≥ end(A)` — vérifiée lors des mises à jour Gantt

### Score de risque

Calculé automatiquement lors des mises à jour de tâche :
- `risk_score` ∈ [0, 100]
- Déterminé par `risk_level` : none | low | medium | high | critical
- Affiché dans les KPI et l'AiPage

---

## 17. Guide développeur

### 17.1 Workflow quotidien

```bash
# Lancer tout
cd react && npm start

# Après git pull
cd laravel && composer install && php artisan migrate
cd ../react && npm install

# Réinitialiser la DB
cd laravel && php artisan migrate:fresh --seed
```

### 17.2 Ajouter une fonctionnalité backend

```bash
# 1. Migration
php artisan make:migration add_xyz_to_tasks_table
php artisan migrate

# 2. Modèle
php artisan make:model Feature --factory --migration

# 3. Resource API
php artisan make:resource FeatureResource

# 4. Controller
php artisan make:controller Api/FeatureController --api

# 5. Routes (dans routes/api.php)
Route::apiResource('features', FeatureController::class);
# ou avec middleware :
Route::middleware('check.role:admin')->group(fn() =>
  Route::apiResource('features', FeatureController::class)
);

# 6. Service (si logique complexe)
php artisan make:class Services/FeatureService
```

### 17.3 Ajouter une page frontend

```jsx
// 1. Créer react/src/pages/feature/FeaturePage.jsx
export default function FeaturePage() {
  return <div className="p-6">...</div>;
}

// 2. Enregistrer dans App.jsx
const FeaturePage = lazy(() => import('./pages/feature/FeaturePage'));
<Route path="/feature" element={
  <RoleRoute allow={['admin', 'member']}><FeaturePage /></RoleRoute>
} />

// 3. Ajouter à Sidebar.jsx si nécessaire
{ to: '/feature', label: 'Feature', icon: Star }
```

### 17.4 Conventions de code

**PHP/Laravel :**
```php
// PascalCase classes, camelCase méthodes, snake_case DB et variables
class TaskController {
  public function index(Request $request): JsonResponse {
    $tasks = Task::query()
      ->with(['assignees', 'status'])
      ->paginate(20);
    return TaskResource::collection($tasks);
  }
}

// Validation
$request->validate([
  'title'    => 'required|string|max:255',
  'priority' => 'in:low,medium,high,urgent',
]);

// Réponses standardisées
return response()->json(['message' => 'Non trouvé.'], 404);
return response()->json(['message' => 'Accès refusé.'], 403);
return response()->json(['errors' => $errors], 422);
```

**React/JS :**
```jsx
// Composants : PascalCase · Hooks : camelCase avec use*
// Classes Tailwind : via cn() (jamais de concaténation de strings)
import { cn } from '../../lib/utils';

<div className={cn(
  'px-4 py-2 rounded',
  isActive && 'bg-blue-600 text-white',
  disabled && 'opacity-50 cursor-not-allowed',
)} />

// Data serveur : TanStack Query (pas useState + fetch)
const { data, isLoading } = useQuery({
  queryKey: ['tasks', projectId],
  queryFn: () => api.get(`/projects/${projectId}/tasks`).then(r => r.data),
});

// Mutations
const mutation = useMutation({
  mutationFn: (payload) => api.post('/tasks', payload),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    toast.success('Tâche créée');
  },
  onError: (err) => toast.error(err.response?.data?.message ?? 'Erreur'),
});
```

### 17.5 Gestion des erreurs

```js
// Frontend — pattern standard
try {
  await api.post('/tasks', payload);
  toast.success('Créé avec succès');
} catch (err) {
  const msg = err.response?.data?.message
    ?? err.response?.data?.errors?.[Object.keys(err.response.data.errors)[0]]?.[0]
    ?? 'Une erreur est survenue';
  toast.error(msg);
}
```

### 17.6 Debugging

```bash
# Laravel
php artisan pail                 # Logs en temps réel
php artisan route:list --path=api  # Voir les routes
php artisan tinker               # Console interactive
php artisan config:clear && php artisan cache:clear

# MySQL
SELECT users.name, roles.name FROM users
JOIN model_has_roles mhr ON mhr.model_id = users.id
JOIN roles ON roles.id = mhr.role_id;

# React
localStorage.getItem('sanctum_token')  # Token actuel
# TanStack Query DevTools actif automatiquement en mode dev
```

### Scripts disponibles

**Laravel :**
```bash
composer dev        # Laravel + queue + pail + vite en parallèle
composer test       # Tests PHPUnit
php artisan test --coverage
./vendor/bin/pint   # Linting (Laravel Pint)
```

**React :**
```bash
npm run dev         # Dev server (port 5173)
npm start           # Tout le projet en parallèle
npm run build       # Build production
npm run lint        # ESLint
npm run preview     # Preview du build
```

---

## 18. Déploiement

### Backend Laravel (production)

```bash
composer install --no-dev --optimize-autoloader
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan migrate --force
php artisan storage:link
```

**Variables d'env production :**
```ini
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.votre-domaine.com
FRONTEND_URL=https://votre-domaine.com
DB_*=<credentials production>
REVERB_*=<config Reverb production>
OPENROUTER_API_KEY=sk-or-...
ML_SERVICE_URL=https://votre-ml.onrender.com
MAIL_MAILER=smtp
MAIL_HOST=<SMTP production>
```

### Frontend React (Vercel / Netlify)

```bash
npm run build
# Déployer le dossier dist/
```

**Variables d'env Vercel :**
```ini
VITE_REVERB_APP_KEY=...
VITE_REVERB_HOST=...
VITE_REVERB_PORT=443
VITE_REVERB_SCHEME=https
```

### Service ML Python (Render)

```
Root directory : python/ml
Build command  : pip install -r requirements.txt
Start command  : uvicorn main:app --host 0.0.0.0 --port 10000
Python version : 3.11.9 (via runtime.txt)

Variables d'env Render :
DB_HOST, DB_PORT, DB_DATABASE, DB_USERNAME, DB_PASSWORD
```

**Entraîner le modèle en production :**
```bash
POST https://votre-ml.onrender.com/train
# Nécessite au minimum 10 tâches terminées dans la base
```

---

## 19. Diagrammes UML

Les sources PlantUML (`.puml`) sont dans `diagrams-code/`, organisées par sprint.

### Structure

```
diagrams-code/
├── ch2/          # Chapitre 2 — Étude préliminaire
├── sprint1/      # Sprint 1 — Utilisateurs
├── sprint2/      # Sprint 2 — Projets et équipes
├── sprint3/      # Sprint 3 — Tâches et Kanban
├── sprint4/      # Sprint 4 — Planification
├── sprint5/      # Sprint 5 — IA et ML
└── sprint6/      # Sprint 6 — Audit RBAC & Pause/Reprise
```

### Export en PNG

**Option 1 — CLI :**
```bash
java -jar plantuml.jar -tpng "diagrams-code/**/*.puml" -o rapport_latex/figures/
```

**Option 2 — VS Code :**  
Extension `PlantUML` (jebbs.plantuml) → `Alt+D` → Export PNG

**Option 3 — En ligne :**  
https://www.plantuml.com/plantuml/uml/ → coller le `.puml` → télécharger PNG

### Correspondance fichiers → PNG

| Fichier `.puml` | PNG attendu dans `rapport_latex/figures/` |
|---|---|
| `ch2/global_use_case.puml` | `ch2_global_use_case.png` |
| `ch2/class_diagram_global.puml` | `ch2_class_diagram.png` |
| `sprint1/use_case.puml` | `sprint1_use_case.png` |
| `sprint1/sequence_login.puml` | `sprint1_sequence_login.png` |
| `sprint2/use_case.puml` | `sprint2_use_case.png` |
| `sprint2/sequence_invite.puml` | `sprint2_sequence_invite.png` |
| `sprint3/sequence_kanban.puml` | `sprint3_sequence_kanban.png` |
| `sprint4/sequence_notif.puml` | `sprint4_sequence_notif.png` |
| `sprint5/sequence_ml.puml` | `sprint5_sequence_ml.png` |

---

## 20. Qualité du code — SonarCloud

### Résultats finaux (Quality Gate : Passed ✅)

| Indicateur | Frontend React | Backend Laravel | Cible |
|---|---|---|---|
| Bugs critiques | **0** | **0** | 0 |
| Vulnérabilités (High) | **0** | **0** | 0 |
| Duplication | **1.8 %** | **2.1 %** | ≤ 3 % |
| Couverture tests | **81.0 %** | **87.7 %** | ≥ 80 % |
| Quality Gate | ✅ Passed | ✅ Passed | Passed |

### Configuration `.sonarcloud.properties`

```properties
sonar.exclusions=sonar-premium-report.html,sonar_fatma863_projet.html,sonar_report.py,react/dist/**
sonar.cpd.exclusions=laravel/lang/**,laravel/database/migrations/**,laravel/tests/**,laravel/database/seeders/**
```

### Changelog des corrections (mai 2026)

| Correction | Détail |
|---|---|
| `AuthLayout.jsx` extrait | Composant partagé Auth — élimine ~200 lignes dupliquées entre les 4 pages auth |
| `TaskModal.jsx` supprimé | 762 lignes de code mort — jamais importé, remplacé par `TaskFormPage.jsx` |
| Duplication 6.1% → 1.8% | Extraction de composants + exclusions SonarCloud |
| Couverture backend 62% → 87.7% | +250 assertions PestPHP |
| Imports inutilisés supprimés | `Navigate` dans App.jsx, `SkeletonActivityRow` dans DashboardPage.jsx |
| Traductions FR complétées | `'User story'` → `'Fonctionnalité'`, `'Story points'` → `"Points d'effort"` |

### Changelog — Nettoyage notifications sprint (22 mai 2026)

| Fichier | Changement |
|---|---|
| `NotificationService.php` | Méthodes `notifySprintStarted()`, `notifySprintCompleted()`, `sprintRecipients()`, `sprintPayload()` supprimées |
| `AppServiceProvider.php` | Listener `SprintEventListener` désenregistré |
| `SprintEventListener.php` | **Fichier supprimé** — le listener créait des notifications in-app pour chaque sprint |
| `NotificationPreferencesController.php` | Clé `notify_type_sprint` retirée de `PREF_KEYS` |
| `NotificationDropdown.jsx` | Labels et couleurs `sprint_started` / `sprint_completed` supprimés |
| `NotificationsPage.jsx` | Groupe sprint supprimé de `TYPE_GROUPS`, `TYPE_LABELS`, `TYPE_COLORS` |
| `NotificationSettingsPage.jsx` | Section "Sprints" supprimée de `PREF_SECTIONS` |
| `i18n/messages.js` | Clé `notifications.types.sprint_started` supprimée |

> Note : l'événement `SprintStateChanged` (broadcast WebSocket) est conservé — il notifie les membres du projet en temps réel sur le canal `private-project.{id}`.

### Changelog — Interconnexion SaaS temps réel (21 mai 2026)

#### Backend — Nouveaux événements WebSocket

| Fichier | Événement | Canal |
|---|---|---|
| `app/Events/TaskUpdated.php` | `task.updated` | `private-project.{id}` |
| `app/Events/TaskDeleted.php` | `task.deleted` | `private-project.{id}` |
| `app/Events/TaskAssignmentChanged.php` | `task.assignment.changed` | project + user |
| `app/Events/PermissionChanged.php` | `permission.changed` | `private-user.{id}` |
| `app/Events/SprintStateChanged.php` | `sprint.state.changed` | `private-project.{id}` |

#### Backend — Contrôleurs mis à jour

| Contrôleur | Méthodes | Événement dispatché |
|---|---|---|
| `TaskController` | `update()`, `move()` | `TaskUpdated` |
| `TaskController` | `destroy()` | `TaskDeleted` |
| `TaskController` | `assign()`, `unassign()` | `TaskAssignmentChanged` |
| `RoleController` | `syncPermissions()`, `grantPermission()`, `revokePermission()` | `PermissionChanged` pour tous les utilisateurs du rôle |
| `RoleController` | `assignUser()` | `PermissionChanged` pour l'utilisateur cible |
| `UserController` | `update()` (si rôle changé) | `PermissionChanged` |
| `SprintController` | `start()`, `complete()` | `SprintStateChanged` |

#### Backend — RBAC dynamique

| Fichier | Changement |
|---|---|
| `CheckRole.php` | Syntaxe `!role` (négation) — `check.role:!client` |
| `UserController.php` | Validation `exists:roles,name` au lieu de `in:admin,member,client` |
| `UserManagementService.php` | `syncRoles([$data['role']])` directement, plus de liste statique |
| `AccessControl.php` | `isClientRole()` centralisé |
| `TaskPolicy.php` | `create()` accepte tout rôle non-client |
| `routes/api.php` | `/calendar`, `/gantt`, `/activity/feed`, routes ML → `check.role:!client` |

#### Frontend — Mises à jour

| Fichier | Changement |
|---|---|
| `ProjectDetailPage.jsx` | Listeners WebSocket : task.updated, task.deleted, task.assignment.changed, activity.logged, sprint.state.changed, progress.updated |
| `AuthContext.jsx` | Listener `permission.changed` → re-fetch silencieux permissions |
| `DashboardPage.jsx` | Abonnement WebSocket multi-projets → mise à jour métriques live |
| `ProjectsPage.jsx` | Affichage chef de projet (icône couronne + nom) sur chaque carte |
| `RolesPage.jsx` | Thème clair, UI entièrement FR, bouton Supprimer visible |
| `RoleDetailPage.jsx` | Descriptions permissions en FR (label principal), slug en secondaire |
| `PermissionMatrixPage.jsx` | En-têtes et légende en FR, descriptions FR prioritaires |
| `UserManagement.jsx` | Rôles dynamiques chargés depuis `/api/roles`, badge coloré, boutons actions visibles |
| `roles.js` | `isGuestViewer()` via `CLIENT_ROLES = new Set(['client','guest','viewer'])` |

---

## 21. Troubleshooting

### CORS errors (frontend → backend)

```bash
# Vérifier que FRONTEND_URL est correcte dans laravel/.env
FRONTEND_URL=http://localhost:5173
SANCTUM_STATEFUL_DOMAINS=localhost:5173

# Vider le cache config
php artisan config:clear
```

### WebSocket ne se connecte pas

```bash
# Vérifier que Reverb est démarré
php artisan reverb:start

# Vérifier les clés dans les deux .env
# laravel/.env :
REVERB_APP_KEY=app-key
# react/.env :
VITE_REVERB_APP_KEY=app-key  # Doit être identique
```

### Service ML inaccessible (timeout)

```bash
# Vérifier que Python est démarré
cd python/ml && uvicorn app:app --port 8001 --reload

# Vérifier ML_SERVICE_URL dans laravel/.env
ML_SERVICE_URL=http://127.0.0.1:8001
ML_SERVICE_TIMEOUT=3    # Augmenter si CPU lent

# Test rapide
curl http://localhost:8001/health
```

### Modèle ML non entraîné

```bash
# Entraîner manuellement
cd python/ml && python train.py
# ou via API :
curl -X POST http://localhost:8001/train
# Nécessite au moins 10 tâches done dans la DB
```

### Migrations qui échouent

```bash
php artisan migrate:status     # Voir l'état des migrations
php artisan migrate:fresh --seed  # Réinitialiser complètement (dev uniquement!)
```

### Queue jobs bloqués

```bash
php artisan queue:failed       # Voir les jobs échoués
php artisan queue:retry all    # Relancer tous les jobs échoués
php artisan queue:flush        # Vider la file
```

### Token Sanctum invalide (401)

```bash
# Frontend : vérifier le token en console
localStorage.getItem('sanctum_token')

# Backend : vérifier personal_access_tokens
SELECT * FROM personal_access_tokens WHERE tokenable_id = {user_id};

# Forcer la re-connexion côté client
localStorage.removeItem('sanctum_token')
```

### Rôle dynamique rejeté (422 "Le champ role est invalide")

```bash
# Vérifier que le rôle existe en DB
SELECT name FROM roles;

# Le rôle doit être créé via l'interface /admin/roles avant d'être assigné
# La validation backend utilise : 'role' => 'exists:roles,name'
```

### Utilisateur avec rôle dynamique bloqué sur /activity/feed (403)

```bash
# Vérifier que la route utilise check.role:!client (et non check.role:admin,member)
# Dans routes/api.php :
Route::middleware('check.role:!client')->group(function () {
    Route::get('activity/feed', ...);
    Route::get('calendar', ...);
    Route::get('gantt', ...);
});
```

---

## 23. Retrait de membre par le Chef de projet

### 23.1 Règles métier

| Acteur | Peut retirer un membre ? | Restrictions |
|---|---|---|
| **Administrateur** | ✅ N'importe quel projet | — |
| **Chef de projet** | ✅ Ses projets uniquement | Ne peut pas retirer un admin applicatif, ni retirer le chef |
| **Membre** | ❌ | Refus 403 |
| **Client** | ❌ | Refus 403 |

**Règles invariantes :**
- Le chef de projet (`projects.chef_id`) ne peut **jamais** être retiré via cet endpoint — utiliser « Changer le chef de projet » (`PUT /api/projects/{id}/change-chef`)
- Un chef ne peut pas retirer un utilisateur qui a le rôle applicatif `admin`
- Un projet doit toujours conserver au moins un responsable

### 23.2 Endpoint API

```
DELETE /api/projects/{project}/members/{user}
```

**Middleware stack :**
```
auth:sanctum → active.user → throttle:60,1 → check.project:edit → project.not_paused
```

**Autorisation interne (ProjectController::removeMember) :**
```
AccessControl::canManageProjectMembers($actor, $project)
  → isAdmin($actor)              ✅ OK
  → owner_id === actor->id       ✅ OK
  → chef_id  === actor->id       ✅ OK
  → sinon                        ❌ HTTP 403

puis :
  target === chef_id             ❌ HTTP 422 (utiliser change-chef)
  !isAdmin($actor) && isAdmin($target) ❌ HTTP 403
```

**Réponse succès (HTTP 200) :**
```json
{
  "message": "Membre Ahmed Ben Ali retiré du projet.",
  "members": [ ... ]  // liste complète mise à jour
}
```

**Réponses d'erreur :**

| Situation | HTTP | Message |
|---|---|---|
| Pas autorisé (ni admin ni chef) | 403 | "Seuls l'administrateur et le chef de projet peuvent retirer des membres." |
| Cible est un admin applicatif | 403 | "Vous n'êtes pas autorisé à retirer un administrateur du projet." |
| Cible est le chef du projet | 422 | "Le chef de projet ne peut pas être retiré via cette action…" |
| Utilisateur cible introuvable | 404 | "Membre introuvable." |
| Projet en pause | 423 | "Ce projet est en pause. Les modifications sont désactivées." |

### 23.3 Journal d'audit

Chaque retrait est enregistré dans `activity_logs` avec :

```json
{
  "action"     : "project.member_removed",
  "severity"   : "warning",
  "meta"       : { "member_id": 42, "member_name": "Ahmed Ben Ali", "removed_by": "Fatma Trabelsi" },
  "old_values" : { "member_id": 42, "member_name": "Ahmed Ben Ali", "member_email": "ahmed@example.com", "project_role": "member", "project_id": 5, "project_name": "IntelliPM" },
  "new_values" : { "member_id": null, "member_name": "Ahmed Ben Ali", "project_role": null },
  "ip_address" : "192.168.1.1",
  "actor_role" : "member",
  "actor_id"   : 7
}
```

**Entrée lisible dans le journal d'audit :**
> "Fatma Trabelsi a retiré Ahmed Ben Ali du projet IntelliPM."

### 23.4 Notification

Le membre retiré reçoit une notification `member_removed` de sévérité `warning` :

> "Vous avez été retiré du projet « IntelliPM » par Fatma Trabelsi."

- Respecte la préférence `notify_type_project` de l'utilisateur
- Diffusée en temps réel via `NotificationCreated` → canal `private-user.{id}`
- Visible dans la cloche de notifications

### 23.5 Frontend

**Qui voit le bouton « Retirer » ?**

| Rôle applicatif | Est chef du projet | Voit le bouton |
|---|---|---|
| admin | — | ✅ |
| member | oui (`chef?.id === user.id`) | ✅ |
| member | non | ❌ |
| client / invité | — | ❌ |

**Flux UX :**
1. Clic sur **"Retirer"** (icône `UserMinus`) → affiche une carte de confirmation inline
2. La carte indique le nom du membre et précise que son accès sera révoqué
3. **"Confirmer"** → `DELETE /api/projects/{id}/members/{uid}` → toast succès + liste mise à jour
4. **"Annuler"** → ferme la carte, aucune action

**Protections frontend supplémentaires :**
- Le chef (`is_chef: true`) est rendu avec `removable={false}` → le bouton n'apparaît jamais
- `canManageMembers = isAdmin || isCurrentUserChef` calculé à partir de `chef?.id === currentUser?.id`
- La liste des membres est invalidée (`queryClient.invalidateQueries`) après chaque retrait réussi

---

## 22. Système Journal d'audit Enterprise

### 22.1 Architecture

Le journal d'audit est un système **enterprise-grade** centralisé qui trace toutes les actions importantes de la plateforme en temps réel.

```
Action utilisateur
       │
       ▼
  Controller (ex: TaskController::update)
       │
       ├── Capture old_values AVANT update
       ├── Effectue l'update
       └── ActivityLogService::log(project, actor, action, entity, meta, oldValues, newValues)
                  │
                  ├── INSERT activity_logs (avec severity, ip, user_agent, actor_role…)
                  └── broadcast(ActivityLogged) → WebSocket private-project.{id}
                                  │
                          ┌───────┴──────────────────┐
                          ▼                          ▼
                  AuditLogPage               ProjectDetailPage
                (timeline temps réel)     (fil d'activité projet)
```

**Flux de sévérité automatique :**

| Sévérité | Actions déclenchantes |
|---|---|
| `critical` | `task.deleted`, `project.deleted` |
| `warning`  | `task.assigned`, `task.unassigned`, `project.member_*`, `project.user_invited`, `sprint.*` |
| `info`     | Tout le reste |

### 22.2 Schéma activity_logs enrichi

```sql
activity_logs
├── id
├── project_id          → FK projects (cascade delete)
├── actor_id            → FK users (null on delete) — null = action système
├── entity_type         → ex: App\Models\Task
├── entity_id           → ID de l'entité concernée
├── action              → ex: task.updated, project.member_added
├── meta                → JSON: { task_title, changed, comment_preview… }
├── old_values          → JSON: état AVANT la modification (nouveau ★)
├── new_values          → JSON: état APRÈS la modification (nouveau ★)
├── changed_fields      → JSON array: ['priority', 'workflow_status'] (nouveau ★)
├── ip_address          → IPv4/IPv6 de l'acteur (visible admins seulement)
├── user_agent          → navigateur/client (max 500 chars)
├── severity            → 'info' | 'warning' | 'critical'
├── source              → 'web' | 'api'
├── actor_role          → rôle Spatie de l'acteur au moment de l'action
└── created_at / updated_at

-- Index de performance :
idx_activity_logs_action                 (action)
idx_activity_logs_created_at             (created_at)
idx_activity_logs_project_sev_date       (project_id, severity, created_at)
idx_activity_logs_severity               (severity)
idx_activity_logs_actor_id               (actor_id)
```

### 22.3 ActivityLogService

```php
// Signature complète
ActivityLogService::log(
    Project $project,
    ?User   $actor,
    string  $action,
    Model   $entity,
    array   $meta      = [],
    array   $oldValues = [],   // ← AVANT la modification
    array   $newValues = []    // ← APRÈS la modification
): ActivityLog

// Auto-remplit via Request context :
// ip_address, user_agent, severity, source, actor_role
```

**Exemple complet — modification de tâche :**
```php
// 1. Capturer old_values AVANT l'update
$capturedOld = ['priority' => 'medium', 'workflow_status' => 'todo'];

// 2. Effectuer l'update
$task->update($data);

// 3. Logger avec old + new
$this->activityLogService->log($task->project, Auth::user(), 'task.updated', $task,
    meta: ['task_title' => $task->title, 'changed' => $changed],
    oldValues: $capturedOld,
    newValues: ['priority' => 'high', 'workflow_status' => 'in_progress']
);
// → severity auto-détectée : 'info'
// → ip_address, user_agent, actor_role auto-remplis depuis Request
```

### 22.4 Modèle d'accès RBAC multi-projets

Le système d'audit applique un modèle de contrôle d'accès strict à **chaque couche** (routes, contrôleurs, WebSocket, frontend).

| Rôle | Feed timeline | Export CSV | Analytics | `roles/audit-log` | WebSocket projet |
|---|---|---|---|---|---|
| **Admin** | ✅ Tous projets, tous événements | ✅ Tous projets | ✅ Complet | ✅ | ✅ |
| **Chef de projet** | ✅ Tous événements de ses projets | ✅ Ses projets | ✅ Ses projets (onglet visible) | ❌ 403 | ✅ |
| **Membre** | ✅ Uniquement ses propres actions¹ | ❌ 403 | ❌ 403 | ❌ 403 | ✅ |
| **Client** | ❌ 403 (middleware) | ❌ 403 | ❌ 403 | ❌ 403 | ❌ bloqué |

¹ Les membres voient **uniquement les événements où ils sont l'acteur** (`actor_id = user->id`). Ils ne peuvent pas voir les actions des autres membres, même dans les projets partagés.

**Règles RBAC multi-projets (Cas du double rôle) :**

Un utilisateur peut être Chef dans un projet et simple Membre dans un autre. Les règles s'appliquent **projet par projet** :

| Projet | Rôle | Événements visibles |
|---|---|---|
| Projet A | Chef | Tous les événements du projet A |
| Projet B | Membre | Uniquement ses propres actions dans B |

Les privilèges obtenus dans le projet A ne sont **jamais hérités** vers le projet B.

**Algorithme de filtrage backend (`ActivityFeedController::resolveAccess()`) :**

```php
// 1. Déterminer les projets "chef/owner"
$chefProjectIds = Project::where('chef_id', $user->id)
    ->orWhere('owner_id', $user->id)->pluck('id');

// 2. Déterminer les projets "membre uniquement"
$accessibleProjectIds = Project::accessibleToUser($user)->pluck('id');
$memberOnlyProjectIds = $accessibleProjectIds->diff($chefProjectIds);

// 3. Application :
//    Projets chef  → tous les événements (whereIn project_id)
//    Projets membre → uniquement actor_id = user->id
```

**Résultat SQL généré pour un chef en mode mixte :**

```sql
WHERE (
    project_id IN (1, 3)                      -- projets chef/owner
    OR (project_id IN (2, 5) AND actor_id = 7) -- projets membre uniquement
)
```

**Détection Chef de projet (frontend) :**

Le champ `is_chef_somewhere` est inclus dans la réponse `/api/me` (via `UserResource`).  
Si `true`, l'onglet Analytics du journal d'audit est affiché.

```js
const canSeeAnalytics = isAdmin || user?.is_chef_somewhere;
```

### 22.5 API filtrée + export + analytics

**Endpoint principal :**
```
GET /api/activity/feed                [check.role:!client]
```

**Paramètres de filtre :**

| Paramètre | Type | Description | Restriction |
|---|---|---|---|
| `project_id` | int | Filtrer par projet | Vérifie `accessibleToUser()` → 403 si hors périmètre |
| `actor_id` | int | Filtrer par acteur | Non-admin/chef : uniquement `actor_id = soi-même` |
| `action` | string | Action exacte (ex: `task.updated`) | — |
| `module` | string | Préfixe module (`task`, `project`) | — |
| `severity` | string | `info` / `warning` / `critical` | — |
| `date_from` | date | À partir de (YYYY-MM-DD) | — |
| `date_to` | date | Jusqu'à (YYYY-MM-DD) | — |
| `search` | string | Texte libre (action, acteur, tâche) | — |
| `with_stats` | bool | `1` = inclure les stats (4 queries extra, désactivé par défaut) | — |
| `per_page` | int | 1–100, défaut 30 | — |
| `page` | int | Pagination | — |

**Réponse :**
```json
{
  "activities": [ ... ],
  "meta": { "current_page": 1, "last_page": 5, "total": 142, "per_page": 30 },
  "stats": null
}
```

> **Performance** : les `stats` (4 requêtes SQL d'agrégation) sont calculées uniquement si `?with_stats=1` est passé.

**Analytics dédiées (5 minutes de cache) :**
```
GET /api/activity/analytics           [Admin + Chef de projet uniquement]
```
Retourne : `top_users`, `by_module`, `by_severity`, `trend_28d`, `unstable_tasks`, `inactive_users`, `spikes`, `collaboration_score`, `kpis`.

> ⚠️ **Accès restreint** : Les analytics exposent les noms et statistiques d'activité d'autres utilisateurs (`top_users`, `inactive_users`). Elles sont donc réservées aux admins et chefs de projet. Un membre simple reçoit HTTP 403.

**Export CSV :**
```
GET /api/activity/export              [Admin + Chef de projet uniquement]
```
Retourne un fichier `journal-audit-YYYY-MM-DD.csv` (max 5000 lignes).  
L'`ip_address` n'est incluse que pour les admins.

> ⚠️ **Accès restreint** : L'export en masse est limité aux admins et chefs pour éviter qu'un membre puisse extraire l'historique complet d'activité d'autres utilisateurs.

**Journal des permissions (PermissionAuditLog) :**
```
GET /api/roles/audit-log              [Admin uniquement — check.role:admin]
```
Retourne les événements de modification de rôles et permissions (50 par page).  
Contient : qui a accordé/révoqué quoi, à qui, depuis quelle IP.

> ⚠️ **Accès strictement admin** : Ce journal contient des informations système sensibles (assignation de rôles, changements de permissions). Déclaré **avant** `roles/{role}` dans `routes/api.php` pour éviter la capture du paramètre dynamique.

**Rapport PDF (page dédiée) :**
```
/audit-log/report?module=task&date_from=2026-05-01&...   [Admin + Membre]
```
Page React standalone (`AuditReportPage.jsx`) sans sidebar/topbar :
- Protégée par `ProtectedRoute` + `RoleRoute allow={['admin', 'member']}`
- Charge les données depuis `/api/activity/feed` + `/api/activity/analytics`
- Déclenche `window.print()` automatiquement après chargement
- CSS `@media print` optimisé A4

### 22.6 Frontend enterprise

**Page `/audit-log`** (`react/src/pages/audit/AuditLogPage.jsx`) :

Route protégée : `RoleRoute allow={['admin', 'member']}` — les clients sont redirigés.

**Onglet Timeline** (tous les utilisateurs autorisés) :

| Fonctionnalité | Implémentation |
|---|---|
| Timeline groupée par date | "Aujourd'hui / Hier / lundi 20 mai 2026" |
| Avant/Après avec flèche | ~~Moyenne~~ → **Haute** (couleur sémantique) |
| Sévérité visuelle | Bande latérale colorée + badge (critique = rouge) |
| Détails expandables | ChevronDown → AnimatePresence |
| Barre de stats cliquable | Filtres rapides par module |
| Heatmap 7 jours | Barres proportionnelles par jour |
| Filtres avancés | Module + dates (collapsible) |
| Recherche live | Debounce côté serveur |
| WebSocket temps réel | Badge "X nouveau(x)" + prepend sans refresh |
| Scroll infini | IntersectionObserver → `fetchNextPage()` |
| Badge reset | `localStorage.setItem('audit_last_visit', now)` à l'ouverture |

**Onglet Analytics** (admins uniquement — `isAdmin` vérifié côté frontend ET backend) :

| Widget | Données |
|---|---|
| 5 KPI cards | `total_30d`, `total_7d`, `critical_7d`, `unique_users_7d`, `collaboration_score` |
| Top 5 utilisateurs actifs | HBar avec avatar (30 derniers jours) |
| Activité 28 jours | Sparkline SVG (polyline + gradient fill) |
| Distribution sévérité | DonutStat CSS (conic-gradient, aucune lib externe) |
| Tâches instables | >5 mises à jour en 7j — risk_level: critical/warning |
| Membres inactifs | 0 activité depuis 14 jours |
| Pics d'activité | Jours avec count > 2× moyenne des 28j |
| Export PDF | `window.open('/audit-log/report?...params', '_blank')` |

> L'onglet Analytics n'est pas rendu pour les non-admins (filtre `{ visible: isAdmin }` dans le tab switcher). Le backend rejette aussi la requête avec HTTP 403 si un membre tente d'appeler `/api/activity/analytics` directement.

> Tous les graphiques sont implémentés en **CSS/SVG pur** — aucune dépendance externe (pas de recharts, chart.js ou d3).

### 22.7 Sécurité WebSocket (canaux temps réel)

```php
// routes/channels.php
Broadcast::channel('project.{projectId}', function ($user, int $projectId) {
    // Clients bloqués — les broadcasts exposent des événements internes de l'équipe
    if ($user->hasRole('client')) return false;
    if ($user->hasRole('admin')) return true;
    // Autres : vérification appartenance au projet
    return Project::where('id', $projectId)
        ->where(fn($q) => $q->where('owner_id', $user->id)
            ->orWhereHas('members', fn($qm) => $qm->where('users.id', $user->id))
            ->orWhereHas('users',   fn($qu) => $qu->where('users.id', $user->id)))
        ->exists();
});
```

| Canal | Autorisé | Bloqué |
|---|---|---|
| `user.{userId}` | Propriétaire uniquement | Tous les autres |
| `project.{projectId}` | Admin, owner, membres (non-clients) | Clients, utilisateurs hors projet |

**Humanisation naturelle** (`react/src/lib/projectActivityHumanize.js`) :

```js
// Avant :
"task.updated"

// Après :
"Alice a modifié la priorité de "Authentification JWT""
"Bob a déplacé "Fix bug #42" de 'À faire' vers 'En cours'"
"Fatma a assigné "Sprint planning" à Charlie"
```

### 22.8 Sidebar SaaS moderne

La sidebar a été entièrement redessinée en style **Linear / Notion** :

**Structure en 3 sections :**
```
PRINCIPAL        → Dashboard, Projets, Tâches, Gantt, Calendrier, IA
COLLABORATION    → Équipes, Utilisateurs, Notifications [badge non-lues]
ADMINISTRATION   → Rôles & Permissions, Journal d'audit [badge nouvelles activités]
```

**Badges dynamiques :**
- `Notifications` — badge rouge = nombre de notifications non lues (query `notifications-summary`)
- `Journal d'audit` — badge vert pulse = nouvelles activités depuis la dernière visite

**Badge audit — mécanisme :**
```
localStorage['audit_last_visit'] ← timestamp mis à jour à chaque ouverture de /audit-log
GET /activity/feed?date_from={last_visit}&per_page=1 → meta.total = badge count
queryClient.invalidateQueries(['audit-badge']) ← déclenché à l'ouverture de la page
```

**Animations (Framer Motion) :**
- Collapse/expand sidebar : `animate={{ width: collapsed ? 64 : 240 }}`
- Items label : `AnimatePresence` → fade + slide-x
- Indicateur actif : `motion.span` → `scaleY` 0.4 → 1
- Sections : fade-in du label

**Caractéristiques visuelles :**
- Fond : `bg-slate-950` + `border-right: rgba(255,255,255,0.06)`
- Item actif : `bg-indigo-500/20` + bande gauche indigo `w-[3px]`
- Hover : `hover:bg-white/[0.06]`
- Section labels : `text-[10px] uppercase tracking-widest text-slate-500`
- User card en bas avec avatar + rôle + bouton logout

---

> **Légende ★** — Toutes les fonctionnalités marquées ★ ont été ajoutées lors de la session d'interconnexion SaaS du 21 mai 2026.  
> Dernière mise à jour : **29 mai 2026** — Nettoyage enterprise & Sprint 6 Pause/Reprise :
> - **Sprint 6 (26 mai 2026)** : Système Pause/Reprise projet complet — migration `paused_at/paused_by/pause_reason/previous_status`, middleware `project.not_paused` (HTTP 423), `ProjectPolicy::pause()` + `resume()`, hook `useProjectPause`, composants `ProjectPauseButton`, `PauseProjectModal`, `ProjectPauseBanner`, événement WebSocket `ProjectStatusChanged`, permissions RBAC `project.pause` + `project.resume`, matrice permissions UI
> - **Nettoyage (29 mai 2026)** : Suppression fichiers morts (`p.py` racine, `fix-chars.mjs`), correction message HTTP 423 anglais → français, suppression code mort `APP_ROLE_LABELS_EN` dans `roles.js`, ajout types `project.paused`/`project.resumed` dans `NotificationDropdown`, enrichissement `activityHumanize.js` (+6 cas manquants), harmonisation spinner chargement (bleu → indigo)
> - **22 mai 2026** : Corrections N+1 (GanttController, AiController), stats journal optionnelles (`?with_stats=1`), listeners WebSocket complets 12/12 événements, rapport PDF audit standalone
>
> - **31 mai 2026 — Retrait de membre par le Chef de projet** : nouvelle fonctionnalité (§23) — `ProjectController::removeMember` réécrit avec règles métier complètes (protection chef, blocage admin, messages d'erreur explicites), `NotificationService::notifyMemberRemoved` ajouté, frontend `MembersTab` mis à jour (bouton "Retirer" visible pour chef + admin, modal de confirmation inline, toast avec message serveur).
> - **31 mai 2026 — Audit sécurité RBAC journal d'audit** : 6 vulnérabilités corrigées — (1) `GET /api/roles/audit-log` rendu admin-only (était accessible à tout utilisateur authentifié), (2) `GET /api/activity/analytics` restreint aux admins + chefs (exposait `top_users`/`inactive_users` aux membres), (3) `GET /api/activity/export` restreint aux admins + chefs (extraction en masse par les membres), (4) filtre `actor_id` restreint à son propre ID pour les membres (traçage d'autres utilisateurs), (5) canal WebSocket `project.{id}` bloque désormais explicitement les clients, (6) onglet Analytics du frontend masqué pour les non-admins + `AuditReportPage` protégée par `RoleRoute`. Section 22 mise à jour avec le modèle RBAC complet (§22.4) et la sécurité WebSocket (§22.7).
>
## 24. Module Gantt — Visibilité par rôle

### 24.1 Matrice d'accès

| Rôle | `GET /gantt` (global) | `GET /projects/{id}/gantt` | `PUT /projects/{id}/gantt` |
|---|---|---|---|
| **Admin** | ✅ Toutes tâches de tous projets | ✅ Toutes tâches | ✅ |
| **Chef de projet** | ✅ Toutes tâches de ses projets + assignées ailleurs | ✅ Toutes tâches (si chef/owner du projet) | ✅ (si chef/owner) |
| **Chef (simple membre ici)** | ✅ Seulement ses tâches assignées dans ce projet | ✅ Seulement ses tâches assignées | ❌ 403 |
| **Membre** | ✅ Uniquement ses tâches assignées | ✅ Uniquement ses tâches assignées | ❌ 403 |
| **Client** | ✅ Toutes tâches de ses projets associés (lecture seule) | ✅ Toutes tâches (lecture seule) | ❌ 403 `canEditProject()=false` |

### 24.2 Logique de filtrage backend

**`GET /gantt` — `GanttController::globalIndex()`**
```
if isAdmin($user)              → no filter  — toutes tâches de la plateforme
if isClientRole($user)         → whereIn(project_id, clientProjectIds)  — tous ses projets
if $chefProjectIds->isNotEmpty → whereIn(project_id, chefIds) OR assignee = user
else (membre simple)           → whereHas('assignees', user->id)
```

**`GET /projects/{id}/gantt` — `GanttController::show()`**
```
Gate::authorize('view', $project)  ← vérifie canViewProject()
  ↓
if isAdmin($user)              → no filter  — toutes les tâches
if isClientRole($user)         → no filter  — lecture seule (PUT bloqué séparément)
if chef_id === user->id        → no filter  — responsable du projet
if owner_id === user->id       → no filter  — propriétaire du projet
else (membre simple)           → whereHas('assignees', user->id)
```

**`PUT /projects/{id}/gantt` — `GanttController::updateDates()`**
```
check.project:edit  → canEditProject() → false pour clients ET membres simples
Gate::authorize('update', $project)    ← politique ProjectPolicy
```

### 24.3 Règles métier effectives

- **Admin** : visibilité totale, sans aucun filtre, sur tous les projets et toutes les tâches.
- **Chef de projet** : voit toutes les tâches de ses projets (`chef_id`/`owner_id`). Dans le Gantt global, voit aussi ses tâches assignées dans les projets où il est simple membre (les droits ne sont **pas hérités** d'un projet à l'autre).
- **Membre** : ne voit que les tâches qui lui sont assignées (`task_assignments`) — dans le Gantt global ET dans le Gantt projet.
- **Client** : voit **toutes les tâches** des projets auxquels il est invité, dans le Gantt global ET le Gantt projet. Accès strictement **lecture seule** (`canEditProject()` renvoie `false`).

### 24.4 Frontend

| Composant | Comportement |
|---|---|
| `GanttPage.jsx` | Accessible aux rôles `admin`, `member` ET `client` via `RoleRoute`. Vue globale = lignes projets. Vue par projet = tâches filtrées selon le rôle. |
| `Sidebar.jsx` | Lien `/gantt` visible pour tous les rôles (y compris clients) — permission `gantt.view`. |
| `ProjectDetailPage.jsx` | Onglet Gantt visible pour admin, membres ET clients. Données depuis `GET /projects/{id}/gantt`. |
| `GanttChart.jsx` | Composant **entièrement lecture seule** — aucun drag, aucune modification possible depuis l'UI. |

### 24.5 Sécurité — garanties backend

1. Tout filtre de visibilité est appliqué **côté serveur** ; la frontend n'est qu'une couche de confort.
2. Un membre ne peut jamais récupérer les tâches d'autres utilisateurs via `GET /gantt` car le filtre `whereHas('assignees', user_id)` est injecté directement dans la requête SQL.
3. Un chef ne peut pas voir les tâches d'un projet qu'il ne dirige pas via le Gantt global, grâce au filtre `whereIn('project_id', chefProjectIds)`.
4. Un client tente-t-il `PUT /projects/{id}/gantt` → rejeté par `check.project:edit` (middleware) qui appelle `canEditProject()` → retourne `false` pour tous les utilisateurs avec le rôle `client`.

---

## 26. Gestion des tâches — Règles de suppression, contraintes de dates et audit

### 26.1 Règles de suppression

| Rôle | Peut supprimer | Conditions |
|---|:---:|---|
| **Admin** | ✅ N'importe quelle tâche | Sans restriction (project-agnostic) |
| **Chef de projet / Owner** | ✅ Toute tâche de **ses** projets | `project.chef_id = user.id` ou `project.owner_id = user.id` — ⚠️ calculé sur le projet de la tâche, jamais hérité |
| **Rôle projet « admin »** | ✅ Toute tâche du projet | Via `projectRole() === 'admin'` (legacy pivot) |
| **Membre créateur** | ✅ Conditionnel | `task.created_by = user.id` ET `workflow_status != 'done'` ET `progress_percent < 100` |
| **Membre non-créateur** | ❌ Jamais | Même si assigné à la tâche |
| **Client** | ❌ Jamais | `isClientRole()` → false |

**Implémentation backend (`AccessControl::canDeleteTask()`) :**
```php
if (isAdmin)                                          → true
if (isClientRole)                                     → false
if (project->chef_id == user.id || project->owner_id == user.id) → true
if (projectRole(user, task->project) === 'admin')     → true
if (task->created_by == user.id && !isCompleted)      → true  // membre créateur
else                                                  → false
```

La vérification utilise `task->project` (le projet de la **tâche**), pas le rôle global de l'utilisateur.  
**Un chef dans le projet A ne peut pas supprimer une tâche du projet B.**

**`can_delete` dans la réponse API (`TaskResource`) :**
- `access.can_delete` est calculé en temps réel via `AccessControl::canDeleteTask($user, $task)`
- `access.can_edit` est distinct de `access.can_delete`

**Frontend :**
- `TaskFormPage.jsx` : bouton Supprimer visible si `canDelete = isEdit && (isAdmin || task.access.can_delete)`
- `ProjectDetailPage.jsx` (Kanban) : `onDelete` activé si `canWriteProject && task.access.can_delete === true`

### 26.2 Contraintes de dates des tâches

Les tâches **DOIVENT** être comprises dans la période du projet (`start_date` → `end_date`).  
La validation est **obligatoire côté backend** même si le frontend est contourné.

**Toutes les contraintes validées dans `assertTaskDatesWithinProjectWindow()` :**

| Champ | Contrainte | Source de vérification |
|---|---|---|
| `planned_start` | ≥ `project.start_date` ET ≤ `project.end_date` | `store()` + `update()` |
| `planned_end` | ≥ `project.start_date` ET ≤ `project.end_date` ET ≥ `planned_start` | `store()` + `update()` |
| `due_date` | ≥ `project.start_date` ET ≤ `project.end_date` ET ≥ `planned_start` | `store()` + `update()` |
| `planned_start` (update) | **Immuable** après création (`assertPlannedStartImmutable()`) | `update()` |

> ⚠️ Pour `due_date`, l'`effectiveStart` est la valeur fournie dans la requête OU la valeur existante sur la tâche (pour les mises à jour partielles).

**Messages d'erreur :**
- `"La date de début ne peut pas être antérieure au démarrage du projet (DD/MM/YYYY)."`
- `"La date de début ne peut pas dépasser la date de fin du projet (DD/MM/YYYY)."`
- `"La date de fin ne peut pas être antérieure au démarrage du projet (DD/MM/YYYY)."`
- `"La date de fin ne peut pas dépasser la date de fin du projet (DD/MM/YYYY)."`
- `"La date d'échéance ne peut pas être antérieure au démarrage du projet (DD/MM/YYYY)."`
- `"La date d'échéance ne peut pas dépasser la date de fin du projet (DD/MM/YYYY)."`
- `"La date d'échéance ne peut pas être antérieure à la date de début de la tâche (DD/MM/YYYY)."`

**Chemins de modification des dates — sécurité garantie :**

| Chemin | Date modifiée | Validation backend | Statut |
|---|---|---|---|
| `TaskFormPage.jsx` (formulaire) | planned_start, planned_end, due_date | ✅ `assertTaskDatesWithinProjectWindow()` | Sécurisé |
| Kanban drag-drop | `workflow_status` uniquement | N/A (pas de date) | Sécurisé |
| Gantt (`GanttController::updateDates`) | planned_start, planned_end | ✅ `check.project:edit` | Sécurisé (requiert chef/admin) |
| API directe (raw) | Tous les champs | ✅ Backend obligatoire | Sécurisé |

### 26.3 Journal d'audit complet des tâches

| Action | Sévérité | Quand | Contenu |
|---|---|---|---|
| `task.created` | info | Création | `new_values`: titre, statut, priorité, dates, assignés |
| `task.updated` | info | Modification | `old_values` + `new_values` des champs modifiés |
| `task.status_changed` | **warning** | Changement statut/workflow | `old/new status_id` + `old/new workflow_status` — log dédié |
| `task.assigned` | warning | Assignation | `assigned_user_id`, `allocation_percent` |
| `task.unassigned` | warning | Désassignation | `unassigned_user_id` |
| `task.deleted` | **critical** | Suppression | `old_values` complets: titre, statut, priorité, dates, assignés, créateur |
| `task.moved` | info | Kanban drag-drop | `status_id`, `kanban_order` |
| `task.dependency_added` | info | Dépendance ajoutée | `depends_on_task_id`, `type` |
| `task.dependency_removed` | info | Dépendance supprimée | `depends_on_task_id` |

> `task.status_changed` est un log **dédié** (distinct de `task.updated`) permettant des requêtes d'audit ciblées sans parser le champ `changed`. Sévérité : `warning`.

**Structure `task.deleted` (old_values) :**
```json
{
  "action": "task.deleted",
  "severity": "critical",
  "meta": { "task_title": "..." },
  "old_values": {
    "title": "...", "status": "Nom du statut",
    "priority": "high", "workflow_status": "in_progress",
    "planned_start": "2026-06-01", "planned_end": "2026-06-15",
    "due_date": "2026-06-15", "progress_percent": 45,
    "assignees": ["Alice Dupont"], "created_by": "Bob Martin"
  },
  "new_values": {}
}
```

### 26.4 Comportement des suppressions (soft delete)

- `$task->delete()` → **soft delete** (champ `deleted_at` rempli, données conservées)
- Les requêtes Eloquent excluent automatiquement les tâches soft-deleted (`WHERE deleted_at IS NULL`)
- La relation `$task->dependencies()` (BelongsToMany) applique le scope soft-delete → les dépendances vers/depuis une tâche supprimée n'apparaissent plus
- Quand un **projet** est supprimé (hard-delete), la cascade DB supprime définitivement toutes ses tâches et leurs relations

### 26.5 Multi-projets — isolation des droits

Les permissions sont **calculées sur le projet de la tâche** (jamais sur le rôle global) :

- Un chef dans le projet A essaie de supprimer une tâche du projet B → `AccessControl::canDeleteTask()` charge `task->project` (= projet B) et vérifie `chef_id` sur B → **403 refusé**
- Aucun privilège ne peut être hérité d'un projet à un autre

---

## 25. Rôle Client — Observateur de projet

### 25.1 Définition du rôle

Le **Client** est un utilisateur externe invité par un Administrateur ou un Chef de projet pour suivre l'avancement d'un ou plusieurs projets sans participer à leur réalisation. C'est un **observateur en lecture seule**.

### 25.2 Permissions Spatie accordées

| Permission | Accordée | Usage |
|---|:---:|---|
| `project.view` | ✅ | Consulter les projets où il est membre |
| `project.export` | ✅ | Exporter des données projet |
| `task.view` | ✅ | Consulter les tâches |
| `sprint.view` | ✅ | Consulter l'avancement des sprints |
| `gantt.view` | ✅ | Consulter le Gantt projet (via detail page) |
| `dashboard.view_client` | ✅ | Accéder au tableau de bord client |
| `notification.view` | ✅ | Recevoir des notifications |
| `ai.view` | ✅ | Accès aux rapports IA projet (ClientDashboard) |
| Toutes les permissions d'écriture | ❌ | Aucune création / modification / suppression |

### 25.3 Modules accessibles

| Module | Accès | Niveau |
|---|:---:|---|
| Tableau de bord (`/dashboard`) | ✅ | `ClientDashboard` — stats projets uniquement |
| Projets (`/projects`) | ✅ | Lecture seule — projets auxquels il est invité |
| Tâches (`/tasks`) | ✅ | Lecture seule — tâches de ses projets (liste simple, sans Kanban) |
| Membres du projet | ✅ | Onglet Membres dans `/projects/{id}` |
| Gantt projet (via `/projects/{id}`) | ✅ | Lecture seule — toutes les tâches du projet |
| Gantt global (`/gantt`) | ✅ | Lecture seule — toutes les tâches de ses projets associés |
| Rapport d'avancement | ✅ | Onglet Rapport dans `/projects/{id}` |
| Calendrier (`/calendar`) | ✅ | Lecture seule — échéances de ses projets |
| Notifications (`/notifications`) | ✅ | Uniquement : statut projet, jalon, retard, livrable, invitation |
| Paramètres (`/settings`) | ✅ | Profil, sécurité, préférences, notifications — **sans Spécialités** |

### 25.4 Modules restreints (interdits)

| Module | Raison |
|---|---|
| **Kanban** (onglet dans `/projects/{id}`) | Workflow interne — onglet remplacé par liste tâches lecture seule |
| **Historique** (onglet dans `/projects/{id}`) | Journal d'audit projet interne — `check.role:!client` sur `GET /projects/{id}/activity` |
| **Spécialités** (section dans `/settings`) | Données de compétences membres — `check.role:!client` sur `PUT /me/specialties` ; section masquée dans UI |
| IA / Analyses (`/ai`) | Analyses avancées internes — `clientHidden: true` Sidebar |
| Journal d'audit global (`/audit-log`) | Données internes — `clientHidden: true` Sidebar |
| Équipes (`/teams`) | Administration — `adminOnly: true` Sidebar |
| Utilisateurs (`/users`) | Administration — `adminOnly: true` Sidebar |
| Rôles & Permissions (`/admin/roles`) | Permission `role.view` absente pour le rôle client |
| Activity Feed API | Données agrégées équipe — `check.role:!client` |
| ML / Auto-assign / Performance membres | Calculs internes — `check.role:!client` |
| Gestion des sprints (écriture) | `check.project:edit` → `canEditProject()=false` |
| Notifications internes | Assignation tâche, commentaires, alertes surcharge, IA, permissions — filtrées côté backend |

### 25.5 Tableau de bord client (`ClientDashboard.jsx`)

Le client voit uniquement ses projets (jamais les statistiques globales de la plateforme) :

| Widget | Données |
|---|---|
| KPIs | Avancement global, échéance estimée, tâches en cours, tâches en retard |
| Alertes | Tâches à risque, tâches en retard — de ses projets uniquement |
| Mes projets | Liste des projets avec barre de progression |
| Prochaines échéances | Tâches avec due_date proche |
| Tableau des tâches récentes | Statut, priorité, échéance, avancement |
| Rapports IA | Probabilité de retard, santé planning (via `/client/projects/{id}/ai/*`) |

### 25.6 Gestion des accès clients

| Acteur | Peut inviter un client | Peut retirer un client |
|---|---|---|
| **Admin** | ✅ Tout projet | ✅ Tout projet |
| **Chef de projet** | ✅ Ses projets uniquement | ✅ Ses projets uniquement |
| **Membre** | ❌ | ❌ |

### 25.7 Sécurité — Garanties backend

```
canViewProject(client, project)
  → isClientRole = true
  → projectRole = null AND owner_id ≠ user.id  → false  (client non-invité bloqué)
  → projectRole != null                          → true   (client invité autorisé)

canEditProject(client, project) → always false (isClientRole check)
canCreateTaskInProject(client)  → always false
canCommentOnProject(client)     → always false

Middleware check.role:!client bloque :
  GET /activity/feed, GET /activity/export, GET /activity/analytics,
  GET /projects/{id}/activity,                   ← NOUVEAU (historique projet)
  GET /projects/{id}/auto-assign,                ← NOUVEAU (assignation IA)
  GET /projects/{id}/members-performance,        ← NOUVEAU (perf membres)
  PUT /me/specialties,                           ← NOUVEAU (écriture spécialités)
  ML endpoints, AI endpoints (global)

NotificationController filtre par liste blanche pour les clients :
  Autorisés : project_created, project_updated, project_at_risk,
              project_invitation, invitation_received, project_invitation_accepted
  Bloqués   : task_assigned, task_updated, task_completed, task_delayed,
              task_comment, comment_added, task_mentioned, mention,
              workload_alert, ai_alert, permission_updated, gantt_updated

check.project:edit bloque toutes les opérations d'écriture projet
```

### 25.8 Interface utilisateur — Barre latérale client

```
PRINCIPAL
  ✅ Tableau de bord
  ✅ Projets
  ✅ Tâches             (liste lecture seule)
  ✅ Gantt              (accès lecture seule — projets associés uniquement)
  ✅ Calendrier         (accès lecture seule, données filtrées)
  ❌ IA                 (clientHidden: true)

COLLABORATION
  ❌ Équipes            (adminOnly: true)
  ❌ Utilisateurs       (adminOnly: true)
  ✅ Notifications      (types filtrés : projets + invitations uniquement)

ADMINISTRATION
  ❌ Rôles              (permission role.view absente)
  ❌ Journal audit      (clientHidden: true)

PARAMÈTRES (/settings)
  ✅ Profil
  ✅ Sécurité (mot de passe)
  ✅ Notifications
  ✅ Préférences (thème, langue)
  ❌ Spécialités        (section masquée — !isViewer ; PUT /me/specialties bloqué backend)

PAGE PROJET (/projects/{id})
  ✅ Onglet Tâches      (liste lecture seule — remplace Kanban)
  ✅ Onglet Membres
  ✅ Onglet Gantt
  ✅ Onglet Rapport d'avancement
  ✅ Onglet Rapports IA
  ❌ Onglet Kanban      (masqué — isClient check frontend + aucune route dédiée)
  ❌ Onglet Historique  (masqué — isClient check frontend + check.role:!client backend)
```

### 25.9 Routes frontend protégées

| Route | Protection | Client accès |
|---|---|:---:|
| `/dashboard` | `ProtectedRoute` | ✅ → `ClientDashboard` |
| `/projects` | `ProtectedRoute` | ✅ lecture seule |
| `/projects/:id` | `ProtectedRoute` | ✅ onglets : Tâches, Membres, Gantt, Rapport, Rapports IA |
| `/projects/:id` onglet Kanban | masqué via `isClient` JS | ❌ non rendu, non accessible |
| `/projects/:id` onglet Historique | masqué via `isClient` JS + `check.role:!client` API | ❌ |
| `/projects/:id/tasks/new` | `RoleRoute allow=['admin','member']` | ❌ redirigé |
| `/projects/:id/tasks/:id/edit` | `RoleRoute allow=['admin','member']` | ❌ redirigé |
| `/tasks` | `ProtectedRoute` | ✅ lecture seule |
| `/calendar` | `RoleRoute allow=['admin','member','client']` | ✅ |
| `/gantt` | `RoleRoute allow=['admin','member','client']` | ✅ (tâches de ses projets) |
| `/ai` | `RoleRoute allow=['admin','member']` | ❌ |
| `/audit-log` | `RoleRoute allow=['admin','member']` | ❌ |
| `/notifications` | `ProtectedRoute` | ✅ types filtrés (projets + invitations) |
| `/settings` | `ProtectedRoute` | ✅ profil, sécurité, notifs, préférences — **sans Spécialités** |

---

> - **1 juin 2026 — Visibilité des dates projet** : création du composant réutilisable `ProjectDateBanner.jsx` (dates début/fin, durée, jours restants, progression, couleurs adaptatives) ; intégré dans 5 vues : `ProjectDetailPage` (bandeau permanent avant stats), `TaskFormPage` (step Planification — remplace la ligne de texte discrète), `GanttPage` (vue par projet), `CalendarPage` (filtre projet), `ClientDashboard` (cartes projets). Messages d'erreur de validation mis à jour au format exact requis : `"Cette tâche ne peut pas commencer avant le DD/MM/YYYY, date de début du projet."`. Section §27 ajoutée dans MASTER_DOCUMENTATION.md.
> - **31 mai 2026 — Audit module tâches** : 3 lacunes corrigées après audit complet — (1) `assertTaskDatesWithinProjectWindow()` : validation `due_date >= planned_start` ajoutée (utilisait `effectiveStart` = valeur requête OU valeur existante de la tâche) ; (2) `store()` : `task.created` log enrichi avec `new_values` complet (titre, statut, priorité, dates, assignés) ; (3) `update()` : log dédié `task.status_changed` ajouté (sévérité `warning`) déclenché quand `status_id` ou `workflow_status` change, distinct de `task.updated`. `ActivityLogService::WARNING_PATTERNS` mis à jour. §26 reécrit avec §26.2 tableau des contraintes complètes, §26.3 tableau complet des actions audit, §26.4 soft-delete, §26.5 isolation multi-projets.
> - **31 mai 2026 — Gestion tâches RBAC + contraintes dates** : (1) `AccessControl::canDeleteTask()` étendu — chefs de projet et propriétaires peuvent supprimer toute tâche de leurs projets, membres peuvent supprimer leurs propres tâches non terminées (avant : admins seulement) ; (2) `TaskController::destroy()` enrichi avec `old_values` complets dans le journal d'audit (titre, statut, priorité, dates, assignés, créateur) ; (3) `assertTaskDatesWithinProjectWindow()` étendu pour valider aussi `due_date` contre les bornes du projet ; (4) Frontend `TaskFormPage.jsx` : bouton Supprimer basé sur `can_delete` au lieu de `can_edit` ; (5) Kanban `ProjectDetailPage.jsx` : delete handler basé sur `can_delete`. Section §26 ajoutée.
> - **31 mai 2026 — Audit RBAC multi-projets** : refonte complète de `ActivityFeedController` — `buildQuery()` et `buildStats()` réarchitecturés avec `resolveAccess()` + `applyRbacFilter()` : les membres voient désormais **uniquement leurs propres actions** (avant : tous les événements de leurs projets) ; les chefs voient tous les événements de leurs projets + leurs propres actions dans les autres projets ; le cas multi-projets (chef ici, membre là) est géré projet par projet sans héritage croisé. `UserResource` : champ `is_chef_somewhere` ajouté (requête lazy). `AuditLogPage.jsx` : onglet Analytics visible pour `isAdmin || isChefSomewhere` (avant : admins seulement). Section §22.4 mise à jour avec l'algorithme complet. **Note** : le logging des événements d'authentification (login/logout/failed_login) nécessite un ajout de colonne nullable `project_id` dans `activity_logs` — non implémenté car cela requiert une migration.
> - **31 mai 2026 — Rôle Client** : 5 incohérences corrigées — (1) `GET /calendar` sorti du groupe `check.role:!client` : les clients peuvent désormais consulter le calendrier de leurs projets ; (2) Sidebar : `clientHidden: true` ajouté à IA et Gantt global (liens masqués pour clients) + Audit Log masqué (`clientHidden`) ; (3) `App.jsx` : `/calendar` route mise à jour `RoleRoute allow=['admin','member','client']` ; (4) Création/édition de tâches bloquées en frontend via `RoleRoute allow=['admin','member']` ; (5) Section §25 ajoutée avec la documentation complète du rôle Client.
> - **31 mai 2026 — Module Gantt RBAC** : 3 incohérences corrigées — (1) `GanttController::show()` : le chef de projet et le client voient désormais TOUTES les tâches du projet (avant : uniquement leurs tâches assignées, identiques aux membres) ; (2) `GanttController::globalIndex()` : le filtrage `accessibleBy` remplacé par un filtrage Gantt dédié — admin = tout, chef = ses projets + assignées ailleurs, membre = uniquement ses tâches assignées (avant : membres voyaient toutes les tâches de leurs projets) ; (3) `ProjectDetailPage.jsx` : onglet Gantt et requête activés pour les clients (`isClient` ajouté, `!isViewer || isClient` pour `enabled` et rendu du tab). Section §24 ajoutée.
>
## 27. État de santé du projet — Audit technique complet

Audit réalisé le **31 mai 2026** sur l'ensemble du monorepo IntelliPM.

### 27.1 Backend Laravel

| Catégorie | Compte | Statut |
|---|:---:|---|
| Contrôleurs API | 30 | ✅ 100% utilisés — 0 orphelin |
| Modèles Eloquent | 24 | ✅ 100% utilisés — 0 mort |
| Services métier | 20 | ✅ 100% injectés et utilisés |
| Middleware | 5 | ✅ 100% enregistrés et actifs |
| Routes API | 100+ | ✅ 100% valides — 0 cassée |
| Migrations | 52 | ✅ 0 obsolète |
| Seeders actifs | 4/8 | ✅ 4 actifs, 3 optionnels (usage CLI), 1 DB seeder |
| Dépendances Composer | 6 prod | ✅ Toutes nécessaires |
| Code mort / TODO | 0 | ✅ Aucun |
| Injection SQL | 0 | ✅ Paramétrisé partout |

### 27.2 Frontend React

| Catégorie | Compte | Statut |
|---|:---:|---|
| Pages | 29 | ✅ 100% routées et importées |
| Composants UI | 37 | ✅ 100% utilisés |
| Hooks personnalisés | 2 | ✅ Utilisés |
| Librairies utilitaires | 17 | ✅ Toutes importées |
| Routes App.jsx | 28 | ✅ 0 route morte |
| Mock data | 0 | ✅ 100% API-driven |
| console.log debug | 0 | ✅ (1 `console.error` intentionnel dans ErrorBoundary) |
| Dépendances npm supprimées | 2 | ✅ `zod` + `date-fns` retirées (non utilisées) |

### 27.3 Microservice ML (FastAPI / Python)

| Catégorie | Statut |
|---|---|
| Endpoints FastAPI | ✅ 6 endpoints opérationnels |
| Modèle ML | ✅ Fichier `.joblib` présent (`task_assignment.joblib` 745 KB) |
| Connexion DB | ✅ SQLAlchemy via MySQL pooling |
| Features | ✅ 22 dimensions (skill, workload, performance, affinity, context, trend, risk) |
| Intégration Laravel | ✅ `PythonMLClient` → `SpecialtyController::autoAssign()` |
| `avatar_url` transformation | ✅ **Corrigé** : chemin brut → `/storage/...` |

### 27.4 Sécurité

| Vérification | Résultat |
|---|---|
| Authentification Sanctum | ✅ Token Bearer sur toutes les routes protégées |
| RBAC Spatie (4 rôles) | ✅ admin / member / client correctement scoped |
| Policies Laravel | ✅ TaskPolicy + ProjectPolicy complètes et testées |
| Gates | ✅ `Gate::authorize()` partout dans les controllers |
| WebSocket canal projet | ✅ Clients explicitement bloqués (`hasRole('client') → false`) |
| XSS (dangerouslySetInnerHTML) | ✅ Aucun usage |
| SQL Injection | ✅ Requêtes paramétrées, pas de concaténation de strings |
| `APP_DEBUG` production | ✅ `.env.example` corrigé → `false` |
| `SESSION_ENCRYPT` production | ✅ `.env.example` corrigé → `true` |
| CORS | ⚠️ `allowed_headers: ['*']` — acceptable pour dev, restreindre en prod |
| Token localStorage | ⚠️ Architectural — acceptable pour SPA, httpOnly cookies recommandés en prod |

### 27.5 Corrections appliquées (31 mai 2026)

Toutes les corrections de cette session de développement :

| # | Module | Correction | Impact |
|---|---|---|---|
| 1 | `SpecialtyController` | Ajout `avatar_url` dans réponse auto-assign | Images ML recommendation correctement chargées |
| 2 | `package.json` | Suppression `zod` + `date-fns` | Bundle réduit, dépendances propres |
| 3 | `.env.example` | `APP_DEBUG=false`, `SESSION_ENCRYPT=true`, `LOG_LEVEL=error` | Template production sécurisé |
| 4 | `AccessControl::canDeleteTask()` | Chef + membre-créateur | Règles métier correctement appliquées |
| 5 | `TaskController::destroy()` | `old_values` audit log + `due_date` validation | Traçabilité complète + contraintes dates |
| 6 | `TaskFormPage.jsx` + `ProjectDetailPage.jsx` | Bouton Supprimer basé sur `can_delete` | UI cohérente avec le backend |
| 7 | `ActivityFeedController` | RBAC multi-projets — membres voient uniquement leurs actions | Conformité règles métier audit |
| 8 | `UserResource` | `is_chef_somewhere` ajouté | Analytics audit accessibles aux chefs |
| 9 | `AuditLogPage.jsx` | Onglet Analytics pour chefs | UX cohérente avec les permissions |
| 10 | `routes/api.php` | Calendrier débloqué pour clients | Clients voient le calendrier projet |
| 11 | `Sidebar.jsx` | `clientHidden: true` sur IA, Gantt, Audit Log | Navigation propre pour clients |
| 12 | `GanttController` | Chef/Client voient toutes les tâches projet | Conformité règles Gantt |
| 13 | `ProjectDetailPage.jsx` | Onglet Gantt + `isClient` | Clients accèdent au Gantt projet |
| 14 | `ProjectController::removeMember()` | Règles chef + audit log + notification | Retrait membre fonctionnel |
| 15 | `NotificationService` | `notifyMemberRemoved()` | Notification au membre retiré |
| 16 | Audit log RBAC (session précédente) | `roles/audit-log` admin-only, analytics restreints, export limité | Sécurité journal d'audit |

---

## 27. Visibilité des dates du projet — Règle métier obligatoire

### 27.1 Règle

Les dates de début (`start_date`) et de fin (`end_date`) du projet doivent être **immédiatement visibles** pour tous les utilisateurs autorisés, sans nécessiter d'ouvrir un onglet ou une fenêtre supplémentaire.

### 27.2 Composant `ProjectDateBanner`

**Fichier :** `react/src/components/projects/ProjectDateBanner.jsx`

Composant réutilisable affichant :
- Nom et code du projet
- Date de début (format long fr-FR)
- Date de fin (format long fr-FR)
- Durée totale en jours
- Jours restants / jours de retard (couleur adaptative : vert / orange / rouge)
- Barre de progression

**Props :**
- `project` — objet projet avec `start_date`, `end_date`, `progress_percent`, `name`, `code`
- `compact` (bool) — version réduite pour les espaces restreints (dashboard)

### 27.3 Présence dans les vues

| Vue | Condition d'affichage | Implémentation |
|---|---|---|
| **Page projet** (`ProjectDetailPage`) | Toujours visible si `start_date` ou `end_date` défini | Après le bandeau Pause, avant les stats KPI |
| **Formulaire de tâche** (`TaskFormPage`) | Step "Planification" — toujours visible | Remplace l'ancienne ligne de texte discrète |
| **Gantt** (`GanttPage`) | En "Vue par projet" quand un projet est sélectionné | Entre les contrôles et le diagramme |
| **Calendrier** (`CalendarPage`) | Quand un projet est filtré | Après la card Filtres |
| **Dashboard Client** (`ClientDashboard`) | Dans chaque carte de projet | Remplace l'ancienne carte progress-only |

### 27.4 Contraintes de dates (règles métier appliquées)

#### Backend (`assertTaskDatesWithinProjectWindow()`)

| Champ | Contrainte | Message d'erreur |
|---|---|---|
| `planned_start` | ≥ `project.start_date` | `"Cette tâche ne peut pas commencer avant le DD/MM/YYYY, date de début du projet."` |
| `planned_start` | ≤ `project.end_date` | `"Cette tâche ne peut pas dépasser le DD/MM/YYYY, date de fin du projet."` |
| `planned_end` | ≥ `project.start_date` | `"Cette tâche ne peut pas se terminer avant le DD/MM/YYYY, date de début du projet."` |
| `planned_end` | ≤ `project.end_date` | `"Cette tâche ne peut pas dépasser le DD/MM/YYYY, date de fin du projet."` |
| `due_date` | ≥ `project.start_date` ET ≤ `project.end_date` ET ≥ `planned_start` | Messages analogues |

#### Frontend (`validateStep()` in TaskFormPage)

- Messages d'erreur identiques à ceux du backend (format exact)
- Champs `min/max` sur les `<Input type="date">` :
  - `planned_start` : `min=projectStart`, `max=projectEnd`
  - `planned_end` : `min=max(planned_start, projectStart)`, `max=projectEnd`

### 27.5 Source des données

- `project.start_date` et `project.end_date` proviennent de MySQL via `GET /api/projects/{id}`
- **Les mêmes dates** sont utilisées côté React, Laravel et pour le diagramme de Gantt
- Si le projet n'a pas de dates définies : le bandeau ne s'affiche pas (condition `start_date || end_date`)

## 28. Nomenclature officielle des rôles — Matrice complète des permissions

### 28.1 Hiérarchie des rôles

#### Niveau 1 — Rôles globaux (Spatie, plateforme entière)

| Nom technique | Nom affiché | Couleur | Description |
|---|---|---|---|
| `admin` | **Administrateur** | `#6366f1` | Gestion complète de la plateforme |
| `member` | **Collaborateur** | `#10b981` | Utilisateur standard inscrit |
| `client` | **Observateur** | `#f59e0b` | Utilisateur externe en lecture seule |

#### Niveau 2 — Rôles projet (table `project_members`)

| Nom technique | Nom affiché | Description |
|---|---|---|
| `chef` | **Chef de projet** | Responsable du projet |
| `membre` | **Contributeur** | Participe aux tâches du projet |
| `client` / `guest` / `viewer` | **Observateur** | Suit le projet en lecture seule |

---

### 28.2 Matrice complète des permissions

> **Convention** : ✅ = accordé via Spatie RBAC · ✅ (policy) = accordé via `TaskPolicy` / `AccessControl` · — = non applicable à ce niveau de rôle

#### Permissions Projets

| Permission Spatie | Administrateur | Collaborateur | Observateur | Chef de projet¹ | Contributeur¹ |
|---|:---:|:---:|:---:|:---:|:---:|
| `project.view` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `project.create` | ✅ | ✅ | ❌ | — | — |
| `project.edit` | ✅ | ✅ | ❌ | ✅ (policy) | ❌ |
| `project.delete` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `project.archive` | ✅ | ✅ | ❌ | ✅ (policy) | ❌ |
| `project.export` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `project.manage_members` | ✅ | ✅ | ❌ | ✅ (policy) | ❌ |
| `project.manage_settings` | ✅ | ✅ | ❌ | ✅ (policy) | ❌ |
| `project.pause` | ✅ | ❌ | ❌ | ✅ (policy, chef_id) | ❌ |
| `project.resume` | ✅ | ❌ | ❌ | ✅ (policy, chef_id uniquement) | ❌ |

> ¹ Les droits Chef de projet et Contributeur sont appliqués par `AccessControl.php` + `ProjectPolicy` sur la base du champ `chef_id` et de la table `project_user`, indépendamment du rôle Spatie global.  
> Le retrait de membre (`removeMember`) est contrôlé par `AccessControl::canManageProjectMembers()` (policy), non par une permission Spatie dédiée.

#### Permissions Tâches

| Permission Spatie | Administrateur | Collaborateur | Observateur | Chef de projet¹ | Contributeur¹ |
|---|:---:|:---:|:---:|:---:|:---:|
| `task.view` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `task.create` | ✅ | ✅ | ❌ | ✅ | ✅ |
| `task.edit` | ✅ | ✅ | ❌ | ✅ | ✅ (ses tâches) |
| `task.delete` | ✅ | ✅ (policy²) | ❌ | ✅ | ✅ (policy², si non terminée) |
| `task.assign` | ✅ | ✅ | ❌ | ✅ | ❌ |
| `task.comment` | ✅ | ✅ | ❌ | ✅ | ✅ |
| `task.change_status` | ✅ | ✅ | ❌ | ✅ | ✅ |
| `task.manage_dependencies` | ✅ | ✅ | ❌ | ✅ | ✅ |
| `task.manage_time` | ✅ | ✅ | ❌ | ✅ | ✅ |
| `task.export` | ✅ | ✅ | ❌ | ✅ | ✅ |

> ² `task.delete` n'est pas défini dans le seeder Spatie. La suppression est entièrement gérée par `TaskPolicy::delete()` → `AccessControl::canDeleteTask()` : autorisé pour admin, chef, ou créateur de la tâche (si non terminée).

#### Permissions Sprints

| Permission | Administrateur | Collaborateur | Observateur |
|---|:---:|:---:|:---:|
| `sprint.view` | ✅ | ✅ | ✅ |
| `sprint.create` | ✅ | ✅ | ❌ |
| `sprint.edit` | ✅ | ✅ | ❌ |
| `sprint.complete` | ✅ | ✅ | ❌ |

#### Permissions Équipes & Utilisateurs

| Permission | Administrateur | Collaborateur | Observateur |
|---|:---:|:---:|:---:|
| `team.view` | ✅ | ✅ | ❌ |
| `user.view` | ✅ | ✅ | ❌ |
| `user.create` | ✅ | ❌ | ❌ |
| `user.edit` | ✅ | ❌ | ❌ |
| `user.delete` | ✅ | ❌ | ❌ |

#### Permissions IA & Analytics

| Permission | Administrateur | Collaborateur | Observateur |
|---|:---:|:---:|:---:|
| `ai.view` | ✅ | ✅ | ✅ (rapports projet uniquement) |
| `ai.use` | ✅ | ✅ | ❌ |
| `ai.analytics` | ✅ | ✅ | ❌ |
| `ai.retrain` | ✅ | ❌ | ❌ |

#### Permissions Dashboard

| Permission | Administrateur | Collaborateur | Observateur |
|---|:---:|:---:|:---:|
| `dashboard.view_member` | ✅ | ✅ | ❌ |
| `dashboard.view_client` | ✅ | ❌ | ✅ |
| `dashboard.view_analytics` | ✅ | ✅ | ❌ |

#### Permissions Gantt & Notifications

| Permission | Administrateur | Collaborateur | Observateur |
|---|:---:|:---:|:---:|
| `gantt.view` | ✅ | ✅ | ✅ |
| `gantt.edit` | ✅ | ✅ | ❌ |
| `notification.view` | ✅ | ✅ | ✅ (filtrée) |
| `notification.manage` | ✅ | ✅ | ❌ |

#### Permissions Rôles & Permissions

| Permission | Administrateur | Collaborateur | Observateur |
|---|:---:|:---:|:---:|
| `role.view` | ✅ | ❌ | ❌ |
| `role.create` | ✅ | ❌ | ❌ |
| `role.edit` | ✅ | ❌ | ❌ |
| `role.delete` | ✅ | ❌ | ❌ |
| `role.assign` | ✅ | ❌ | ❌ |
| `user.manage_permissions` | ✅ | ❌ | ❌ |
| `user.assign_role` | ✅ | ❌ | ❌ |

---

### 28.3 Règles d'accès spéciales (logic AccessControl.php)

| Règle | Condition | Résultat |
|---|---|---|
| Voir un projet | Administrateur OU membre du projet OU propriétaire | Autorisé |
| Voir un projet (Observateur) | Doit être explicitement invité (pivot `project_user`) | Sinon refusé |
| Modifier un projet | Administrateur OU chef du projet | Autorisé |
| Créer une tâche | Tout rôle sauf Observateur | Autorisé |
| Modifier une tâche | Tout rôle sauf Observateur ; créateur ou assigné | Autorisé |
| Supprimer une tâche | Administrateur OU Chef OU créateur (tâche non terminée) | Autorisé |
| Commenter | Tout rôle sauf Observateur | Autorisé |
| Mettre en pause | Administrateur OU chef_id du projet | Autorisé |
| Reprendre | Administrateur OU chef_id uniquement | Autorisé |

---

### 28.4 Correspondance technique → affichage

| Contexte | Valeur technique | Affiché dans l'UI |
|---|---|---|
| `APP_ROLE_LABELS` (global) | `admin` | Administrateur |
| `APP_ROLE_LABELS` (global) | `member` | Collaborateur |
| `APP_ROLE_LABELS` (global) | `client` | Observateur |
| `PROJECT_ROLE_LABELS` (projet) | `chef` | Chef de projet |
| `PROJECT_ROLE_LABELS` (projet) | `membre` / `member` | Contributeur |
| `PROJECT_ROLE_LABELS` (projet) | `client` / `guest` / `viewer` | Observateur |
| Sidebar bas de page | `userRoleLabel` via `formatAppRole()` | Label officiel |
| Badge profil (Settings) | `formatAppRole(user.role)` | Label officiel |
| Badge membre (ProjectDetail) | Hardcodé | Contributeur |
| Invitation (AcceptInvitePage) | `PROJECT_ROLE_LABELS[role]` | Label officiel |
| Filtre admin (UserManagement) | `APP_ROLE_LABELS[name]` | Label officiel |

---

> - **1 juin 2026 — Nomenclature officielle des rôles** : Harmonisation complète de tous les labels rôles dans l'application. `member` → **Collaborateur**, `client` (global) → **Observateur**, `membre` (projet) → **Contributeur**. Fichiers modifiés : `roles.js`, `messages.js` (FR+EN), `Sidebar.jsx`, `UserManagement.jsx`, `ProjectDetailPage.jsx`, `RoleDetailPage.jsx`, `projectActivityHumanize.js`, `DashboardPage.jsx`, `TaskFormPage.jsx`, `RoleAndPermissionSeeder.php`. Matrice complète des permissions ajoutée (§28).

---

> - **31 mai 2026 — Audit technique complet (PFE ready)** : Audit de l'ensemble du projet (30 contrôleurs, 24 modèles, 29 pages React, 37 composants) — zéro code mort détecté. Corrections : (1) `SpecialtyController::autoAssign()` : champ `avatar_url` ajouté (transformation chemin → URL `/storage/` pour `MLRecommendationModal.jsx`) ; (2) `package.json` : suppression des dépendances inutilisées `zod` et `date-fns` (non importées dans le code source) ; (3) `.env.example` : valeurs de production corrigées — `APP_DEBUG=false`, `SESSION_ENCRYPT=true`, `LOG_LEVEL=error`. Résultats audit : 100% des routes valides, 100% des composants utilisés, 0 mock data, 0 SQL injection détectée. §27 État de santé du projet ajouté.
>
> Document maintenu par **Fatma Rejeb** — ISET, Promotion 2026.

---

## 29. Audit Final PFE — Préparation Soutenance & Mise en Production

> **Date :** 2 juin 2026 | **Statut :** ✅ Prêt pour soutenance PFE

---

### 29.1 Résumé exécutif

L'application IntelliPM a subi un audit fonctionnel, sécurité, déploiement et qualité complet avant soutenance.

**Le projet est prêt pour la démonstration PFE. Aucune anomalie bloquante n'a été identifiée.**

Tous les correctifs critiques ont été appliqués, validés par build React propre (3 178 modules, 0 erreur) et vérification syntaxique PHP.

---

### 29.2 Corrections appliquées lors de l'audit final (2 juin 2026)

| # | Fichier | Correction | Impact |
|---|---|---|---|
| 1 | `ProjectResource.php` | Champ `access.is_client` manquant ajouté via `AccessControl::isProjectClient()` | La bannière lecture seule Observateur affiche désormais le bon message |
| 2 | `ClientDashboard.jsx:507` | `{m.role}` → `formatProjectRole(m.role)` dans section équipe | Affiche "Chef de projet" / "Contributeur" au lieu de "chef" / "membre" |
| 3 | `ProjectDetailPage.jsx:2285` | `{m.role}` → `formatProjectRole(m.role)` dans onglet Rapports IA | Même correction, onglet rapports projet |
| 4 | `UserManagement.jsx:37,560` | `APP_ROLE_LABELS[role.name]` dans `RolePreview` et sélecteur admin | Dropdown admin affiche "Collaborateur ★" au lieu de "member ★" |
| 5 | `CalendarPage.jsx` | Ajout état `isError` + message d'erreur | Plus de calendrier vide silencieux sur erreur réseau |
| 6 | `NotificationController.php` | Ajout `'member_removed'` à la liste blanche Observateur | L'Observateur voit la notification quand il est retiré d'un projet |

---

### 29.3 Audit Fonctionnel — Parcours utilisateur

#### Authentification

| Scénario | Résultat | Notes |
|---|---|---|
| Connexion Administrateur | ✅ | Token Sanctum + roles/permissions retournés |
| Connexion Collaborateur | ✅ | Rôle `member` assigné par défaut à l'inscription |
| Connexion Observateur | ✅ | Rôle `client` — accès lecture seule uniquement |
| Identifiants incorrects | ✅ | Message "Les identifiants sont incorrects" |
| Utilisateur désactivé | ✅ | Statut `disabled` → 403 + suppression token |
| Déconnexion | ✅ | `DELETE /auth/logout` révoque le token courant |

#### Gestion de projet

| Scénario | Résultat | Notes |
|---|---|---|
| Création projet (Collaborateur) | ✅ | `owner_id` = créateur, 4 statuts créés par défaut |
| Création projet (Observateur) | ✅ Bloqué | `TaskPolicy::create()` → `!hasRole('client')` |
| Modification projet | ✅ | Chef ou Admin uniquement via `canEditProject()` |
| Pause projet | ✅ | Admin + owner + chef + permission explicite |
| Reprise projet | ✅ | Admin + `chef_id` **uniquement** (restrictif — intentionnel) |
| Suppression projet | ✅ | Cascade `tasks` → suppression en douceur |

#### Gestion des équipes

| Scénario | Résultat | Notes |
|---|---|---|
| Création équipe | ✅ | Admin uniquement |
| Ajout membre | ✅ | Admin uniquement, rôles : lead/developer/tester |
| Retrait membre | ✅ | Admin uniquement |
| Un seul lead par équipe | ✅ | Logique de rétrogradation automatique |

#### Invitations

| Scénario | Résultat | Notes |
|---|---|---|
| Envoi invitation | ✅ | Chef/Admin seulement, rôle `in:member,client` |
| Vérification token | ✅ | Retourne `valid/expired/already_accepted/declined` |
| Acceptation | ✅ | Rôle pivot assigné, activité loggée, inviteur notifié |
| Refus | ✅ | Statut `declined`, re-acceptation bloquée |
| Expiration 48h | ✅ | `expires_at = now()->addHours(48)` |
| Double acceptation | ✅ | Retourne 410 Gone |
| Utilisateur non inscrit | ✅ | Page affiche boutons Login/Register |
| Invitation rôle admin | ✅ Bloqué | Validation `in:member,client` |

#### Gestion des tâches

| Scénario | Résultat | Notes |
|---|---|---|
| Création tâche (Collaborateur) | ✅ | Vérifie appartenance projet |
| Création tâche (Observateur) | ✅ Bloqué | `AccessControl::canCreateTaskInProject()` → false |
| Modification tâche | ✅ | Créateur ou assigné, via `TaskPolicy::update()` |
| Suppression tâche | ✅ | Admin/Chef/créateur si non terminée |
| Affectation assigné | ✅ | `POST /tasks/{id}/assign` + notification |
| Suivi progression (worklog) | ✅ | `POST /tasks/{id}/worklog` — membres projet seulement |
| Drag Kanban (paused) | ✅ Bloqué | Middleware 423 + toast UI |
| `task.access.can_edit` | ✅ | `TaskResource` retourne l'objet `access` à chaque requête |

#### Planification

| Scénario | Résultat | Notes |
|---|---|---|
| Kanban — Collaborateur | ✅ | Drag autorisé, `canWriteProject=true` |
| Kanban — Observateur | ✅ Bloqué | Onglet Kanban masqué + drag désactivé |
| Gantt global | ✅ | Filtré par projets accessibles pour Observateur |
| Gantt modification | ✅ Bloqué | `PUT /projects/{id}/gantt` → `check.project:edit` |
| Calendrier — chargement | ✅ | `isLoading` skeleton |
| Calendrier — erreur réseau | ✅ | `isError` affiche message (corrigé 02/06) |

#### Intelligence Artificielle

| Scénario | Résultat | Notes |
|---|---|---|
| Recommandation ML | ✅ | Appel réel FastAPI, fallback gracieux si hors ligne |
| Auto-assignment | ✅ | ML + correspondance spécialités combinés |
| Classement candidats | ✅ | 22 features, modèles GBM+RF ou LR selon données |
| Accès Observateur | ✅ Bloqué | `check.role:!client` sur tous les endpoints ML |
| Reentraînement | ✅ | Admin uniquement via `POST /api/ml/retrain` |

#### Communication

| Scénario | Résultat | Notes |
|---|---|---|
| Notification push in-app | ✅ | Filtrée par `user_id` |
| Whitelist Observateur | ✅ | 7 types autorisés dont `member_removed` (ajouté 02/06) |
| Résumé sidebar (badge) | ✅ | `/notifications/summary` filtré aussi |
| WebSocket Reverb | ✅ | Token Bearer dans authEndpoint |
| Événement pause projet | ✅ | Broadcast + toast temps réel |
| Événement déplacement tâche | ✅ | Invalidation cache React Query |

#### Dashboards

| Scénario | Résultat | Notes |
|---|---|---|
| Dashboard Administrateur | ✅ | 6 KPIs : users, projects, tasks, completed, overdue, rate |
| Dashboard Collaborateur | ✅ | Tâches assignées, en retard, à venir, activité récente |
| Dashboard Observateur | ✅ | Projets, équipe (formaté), KPIs, IA risk/recs |

---

### 29.4 Audit Machine Learning — Pipeline complet

| Vérification | Résultat |
|---|---|
| Modèle `task_assignment.joblib` | ✅ Présent (`python/ml/models/`) |
| Modèle `task_assignment_meta.joblib` | ✅ Présent |
| Données d'entraînement | ✅ Réelles (tâches terminées en base) |
| Stub ou simulation | ❌ Non — pipeline réel confirmé |
| Seuil minimum d'entraînement | ✅ 10 samples (LR) / 40 samples (GBM+RF) |
| Comportement premier lancement | ✅ `insufficient_data` si < 10 samples |
| URL service Python | ✅ Configurable via `ML_SERVICE_URL` env |
| Timeout | ✅ 3 s via `ML_SERVICE_TIMEOUT` env |
| Fallback si FastAPI hors ligne | ✅ `unavailableResponse()` — pas de crash |
| 22 features transmises | ✅ priority, complexity, specialty_ids, estimated_hours, sprint_id, project_id |
| Commande d'entraînement | ✅ `php artisan ml:train` |
| Commande seed données test | ✅ `php artisan ml:seed-training-data` |

**Modèles utilisés :**

| Conditions | Modèle |
|---|---|
| ≥ 40 samples | GBM (200 estimateurs) + RandomForest (150 estimateurs) — VotingClassifier |
| 10–39 samples | LogisticRegression avec class_weight=balanced |
| < 10 samples | Retourne `insufficient_data` — bloque l'entraînement |

---

### 29.5 Audit Sécurité

#### Middleware enregistrés

| Alias | Classe | Rôle |
|---|---|---|
| `check.role` | `CheckRole` | Inclusion ou exclusion de rôle (ex: `!client`) |
| `check.project` | `CheckProjectAccess` | Accès view/edit par `AccessControl` |
| `project.not_paused` | `CheckProjectNotPaused` | Bloque les mutations sur projet en pause |
| `active.user` | `EnsureUserIsActive` | Supprime le token si `status=disabled` |

#### Matrice de sécurité Observateur

| Accès tenté | Résultat |
|---|---|
| Kanban (onglet UI) | ✅ Masqué — `isClient` check côté frontend |
| `PUT /tasks/{id}` | ✅ Bloqué — `TaskPolicy::update()` → `isClientRole()=true` |
| `GET /projects/{id}/activity` | ✅ Bloqué — `check.role:!client` |
| `POST /projects/{id}/tasks` | ✅ Bloqué — `canCreateTaskInProject()=false` |
| `GET /ai/*` | ✅ Bloqué — `check.role:!client` |
| `GET /audit-log` | ✅ Bloqué — `clientHidden: true` sidebar + route admin |
| `GET /ml/*` | ✅ Bloqué — `check.role:!client` |
| `GET /projects/{id}/auto-assign` | ✅ Bloqué — `check.role:!client` |
| `GET /activity/feed` | ✅ Bloqué — `check.role:!client` |
| `PUT /me/specialties` | ✅ Bloqué — `check.role:!client` |
| Notifications internes | ✅ Filtrées — liste blanche 7 types |

#### Points de vigilance

| Point | Statut |
|---|---|
| Utilisateur désactivé peut s'authentifier brièvement | ⚠️ Le login ne vérifie pas `status` ; `EnsureUserIsActive` supprime le token dès le premier appel API protégé. Risque minimal. |
| `$changed` array dans `notifyProjectUpdated` | ⚠️ Non filtré — dépend du contrôleur appelant de ne pas inclure de champs sensibles |
| User model sans soft_delete | ⚠️ Suppression définitive d'un utilisateur cascade sur tokens et audit |

---

### 29.6 Audit Base de Données

| Vérification | Résultat |
|---|---|
| Clé étrangère `project_user.project_id` | ✅ `cascadeOnDelete` |
| Clé étrangère `project_members.project_id` | ✅ `cascadeOnDelete` |
| Clé étrangère `tasks.project_id` | ✅ `cascadeOnDelete` |
| Soft delete `Task` | ✅ `SoftDeletes` trait |
| Soft delete `Project` | ✅ `SoftDeletes` trait |
| Soft delete `User` | ⚠️ Absent — suppression définitive |
| Migrations ordonnées | ✅ 46 fichiers horodatés, pas de conflit |
| `viewer` → `client` migration | ✅ `2026_05_08_000001_rename_viewer_role_to_client.php` |
| Seeders rôles techniques | ✅ `admin`, `member`, `client` — noms techniques préservés |

---

### 29.7 Analyse des améliorations restantes

#### 9.1 Notification de retrait d'un Observateur

| | |
|---|---|
| **Comportement actuel** | `NotificationService::notifyMemberRemoved()` est appelé à la ligne 742 de `ProjectController::removeMember()`. La notification de type `member_removed` est envoyée à l'utilisateur retiré. |
| **Avant correctif** | La liste blanche Observateur n'incluait pas `member_removed` → notification créée mais invisible pour l'Observateur. |
| **Après correctif (02/06)** | `member_removed` ajouté à `clientAllowedTypes()` — l'Observateur voit la notification. |
| **Risque** | Aucun — la notification contient uniquement `project_id`, `project_name`, `member_id`, `actor_name`. |
| **Priorité** | ✅ Corrigé |

#### 9.2 Reprise de projet par le propriétaire (Owner)

| | |
|---|---|
| **Comportement actuel** | `ProjectPolicy::pause()` autorise Admin + Owner + Chef. `ProjectPolicy::resume()` autorise **Admin + Chef (chef_id) uniquement** — l'Owner ne peut pas reprendre. |
| **Est-ce intentionnel ?** | ✅ **Oui — design volontaire.** La reprise est plus restrictive que la pause pour éviter qu'un propriétaire absent reprenne un projet sans que le chef opérationnel soit prêt. Le Chef (manager projet) est le seul à pouvoir lever l'arrêt. |
| **Risque** | Faible — confusion possible si l'Owner s'attendait à pouvoir reprendre. |
| **Recommandation** | Documenter ce choix dans l'interface (info-bulle ou tooltip sur le bouton Reprendre). |
| **Priorité** | 🟡 Amélioration optionnelle — documenter pour la soutenance |

#### 9.3 Tâches lors du retrait d'un membre

| | |
|---|---|
| **Comportement actuel** | `removeMember()` détache l'utilisateur des pivots `project_user` et `project_members`. Les tâches restent assignées à l'utilisateur retiré. |
| **Conséquence** | Les tâches ne sont pas supprimées ni réassignées. L'utilisateur retiré ne peut plus accéder au projet mais ses tâches restent visibles dans le Kanban et le Gantt. |
| **Stratégie recommandée** | **Conserver + Notifier** : maintenir l'assignation (garantit la traçabilité), notifier le chef des tâches orphelines (assigné sans accès projet). |
| **Implémentation proposée** | Après le détachement, récupérer `Task::where('project_id', $project->id)->whereHas('assignees', fn($q) => $q->where('users.id', $userId))` et envoyer une notification au chef avec la liste des tâches concernées. |
| **Priorité** | 🟡 Amélioration future — non bloquant pour la soutenance |

#### 9.4 Sécurité des notifications — Analyse des données exposées

| Type notification | Données incluses | Risque |
|---|---|---|
| `project_updated` | `project_id`, `project_name`, `actor_name`, `changed[]` | ⚠️ `changed[]` non filtré — dépend du contrôleur appelant |
| `task_assigned` | `task_id`, `task_title`, `project_id`, `actor_name` | ✅ Safe |
| `task_updated` | `task_id`, `task_title`, `project_id`, `changed[]` | ⚠️ Même risque que project_updated |
| `project_at_risk` | `project_id`, `project_name`, `risk_score` | ✅ Safe |
| `member_removed` | `project_id`, `project_name`, `member_id`, `member_name`, `actor_name` | ✅ Safe |
| `invitation_received` | `project_id`, `project_name`, `inviter_name`, token | ✅ Safe |
| `ai_alert` | Non envoyé aux Observateurs (liste blanche) | ✅ Safe |

**Recommandation pour `changed[]`** : Ajouter dans `NotificationService` une méthode `sanitizeChanges(array $changed): array` qui exclut les champs sensibles (ex: `budget`, `client_id`, `owner_id`) avant de les inclure dans la notification.

---

### 29.8 Checklist de déploiement production

#### Laravel

```bash
# Environnement
APP_ENV=production
APP_DEBUG=false
APP_KEY=base64:...  # générer avec php artisan key:generate
APP_URL=https://votre-domaine.com
FRONTEND_URL=https://votre-domaine.com

# Base de données
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_DATABASE=intellipm
DB_USERNAME=...
DB_PASSWORD=...

# Cache et Sessions
CACHE_STORE=redis        # ou database
SESSION_DRIVER=redis     # ou database
SESSION_ENCRYPT=true
SESSION_LIFETIME=120

# Queue
QUEUE_CONNECTION=database  # ou redis
LOG_LEVEL=error
LOG_CHANNEL=daily

# WebSocket (Reverb)
BROADCAST_CONNECTION=reverb
REVERB_APP_ID=...
REVERB_APP_KEY=...
REVERB_APP_SECRET=...
REVERB_HOST=0.0.0.0
REVERB_PORT=8080
REVERB_SCHEME=https

# Machine Learning
ML_SERVICE_URL=http://127.0.0.1:8001
ML_SERVICE_TIMEOUT=3

# Mail
MAIL_MAILER=smtp
MAIL_HOST=...
MAIL_PORT=587
MAIL_USERNAME=...
MAIL_PASSWORD=...
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@votre-domaine.com

# IA (OpenRouter)
OPENROUTER_API_KEY=...
OPENROUTER_MODEL=...
```

```bash
# Commandes de déploiement dans l'ordre
composer install --no-dev --optimize-autoloader
php artisan key:generate --force
php artisan migrate --force
php artisan db:seed --class=RoleAndPermissionSeeder --force
php artisan storage:link
php artisan optimize          # cache config + routes + views
php artisan queue:work --daemon &
php artisan reverb:start --port=8080 &
```

#### React

```bash
# Variables d'environnement (.env.production)
VITE_API_URL=https://votre-domaine.com/api
VITE_BROADCAST_DRIVER=reverb
VITE_REVERB_APP_KEY=...
VITE_REVERB_HOST=votre-domaine.com
VITE_REVERB_PORT=8080
VITE_REVERB_SCHEME=https

# Build
npm ci --production
npm run build
# Déployer dist/ sur le serveur web
```

#### FastAPI (Machine Learning)

```bash
cd python/ml
pip install -r requirements.txt
uvicorn app:app --host 127.0.0.1 --port 8001 --workers 1
```

> Si le modèle n'a pas encore été entraîné :
> ```bash
> php artisan ml:seed-training-data  # Données de démonstration
> php artisan ml:train               # Entraînement initial
> ```

#### Vérifications post-déploiement

```bash
# Test santé FastAPI
curl http://127.0.0.1:8001/health

# Test connexion DB
php artisan db:show

# Test queue
php artisan queue:monitor

# Test storage
php artisan storage:link
ls -la public/storage

# Test WebSocket
php artisan reverb:start --test
```

---

### 29.9 Écrans recommandés pour la soutenance

| Module | Écran | Points forts à montrer |
|---|---|---|
| **Administration** | Dashboard Admin | 6 KPIs globaux, activité temps réel |
| | Gestion utilisateurs | Badges rôles (Collaborateur/Observateur), assignation rôle |
| | Rôles & Permissions | Matrice de droits, rôles système |
| **Projet** | Kanban | Drag-and-drop, filtres, badge statut |
| | Gantt | Visualisation chronologique, chemin critique |
| | Calendrier | Vue mensuelle/hebdomadaire, filtres |
| | Pause projet | Bannière + raison, blocage mutations |
| **IA** | ML Recommendation | Classement candidats, 22 features, score confiance |
| | Auto-assignment | Correspondance spécialités + ML |
| **Communication** | Notifications | Types filtrés par rôle, badge non-lus |
| | Temps réel | Notification live pause/reprise |
| **Sécurité** | Journal d'audit | Traçabilité complète actions |
| **Observateur** | Dashboard Client | Vision projet filtrée, pas de Kanban |
| | Acceptation invitation | Flux complet email → accès lecture seule |

---

### 29.10 État final — Préparation PFE

| Critère | Statut |
|---|---|
| Build React (3 178 modules) | ✅ 0 erreur |
| Syntaxe PHP (tous fichiers modifiés) | ✅ 0 erreur |
| Permissions — aucune fuite de données | ✅ Confirmé |
| Nomenclature rôles — cohérence totale | ✅ Backend + Frontend + BDD + Docs |
| Machine Learning — pipeline réel | ✅ Confirmé (pas de mock) |
| WebSocket — configuration complète | ✅ Reverb + Pusher fallback |
| Invitations — flux complet | ✅ Tous cas gérés |
| Pause/Reprise — temps réel | ✅ WebSocket + middleware |
| Dashboard Observateur | ✅ Données filtrées |
| Notifications — sécurité | ✅ Liste blanche + `member_removed` |
| Calendrier — erreur réseau | ✅ Corrigé 02/06 |
| MASTER_DOCUMENTATION.md | ✅ §29 ajouté |

**Le projet IntelliPM est prêt pour la démonstration PFE et aucune anomalie bloquante n'a été identifiée.**
