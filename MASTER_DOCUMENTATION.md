# MASTER_DOCUMENTATION.md — IntelliPM
## Documentation Technique et Fonctionnelle Officielle

> **Projet :** IntelliPM — Système de Gestion de Projets Intelligent  
> **Auteur :** Fatma Rejeb — ISET, Promotion 2026  
> **Dernière mise à jour :** 2 juin 2026  
> **Version :** Finale — Soutenance PFE

---

## Table des matières

1. [Présentation du Projet](#1-présentation-du-projet)
2. [Architecture Générale](#2-architecture-générale)
3. [Stack Technique](#3-stack-technique)
4. [Structure Complète du Projet](#4-structure-complète-du-projet)
5. [Base de Données](#5-base-de-données)
6. [Authentification](#6-authentification)
7. [Gestion des Rôles et Nomenclature](#7-gestion-des-rôles-et-nomenclature)
8. [Gestion des Permissions](#8-gestion-des-permissions)
9. [Gestion des Projets](#9-gestion-des-projets)
10. [Gestion des Équipes](#10-gestion-des-équipes)
11. [Gestion des Invitations](#11-gestion-des-invitations)
12. [Gestion des Tâches](#12-gestion-des-tâches)
13. [Kanban](#13-kanban)
14. [Diagramme de Gantt](#14-diagramme-de-gantt)
15. [Calendrier](#15-calendrier)
16. [Analytics](#16-analytics)
17. [Dashboards](#17-dashboards)
18. [Notifications](#18-notifications)
19. [WebSocket Temps Réel](#19-websocket-temps-réel)
20. [Machine Learning](#20-machine-learning)
21. [API REST Complète](#21-api-rest-complète)
22. [Sécurité](#22-sécurité)
23. [Journal d'Audit](#23-journal-daudit)
24. [Flux Fonctionnels](#24-flux-fonctionnels)
25. [Performance et Optimisations](#25-performance-et-optimisations)
26. [Tests](#26-tests)
27. [Déploiement](#27-déploiement)
28. [Maintenance](#28-maintenance)
29. [État Actuel du Projet](#29-état-actuel-du-projet)
30. [Conclusion](#30-conclusion)
31. [Correctifs Finaux — Passe de Production](#31-correctifs-finaux--passe-de-production)

---

## 1. Présentation du Projet

### 1.1 Objectif

IntelliPM est une plateforme web de gestion de projets intelligente, développée dans le cadre d'un Projet de Fin d'Études (PFE) à l'ISET. Elle combine les fonctionnalités d'un outil de gestion de projet classique (Kanban, Gantt, calendrier, équipes, sprints) avec des capacités d'intelligence artificielle pour l'estimation des tâches, la recommandation d'affectation de membres, la détection des risques de retard et l'assistance conversationnelle.

### 1.2 Contexte PFE

Projet réalisé en 2025-2026 à l'ISET par **Fatma Rejeb**. L'objectif est de démontrer la maîtrise d'une architecture full-stack moderne intégrant :
- Un backend Laravel 12 avec API REST et WebSocket
- Un frontend React 19 avec gestion d'état avancée
- Un microservice Python/FastAPI pour le Machine Learning
- Un système de rôles et permissions d'entreprise (RBAC)

### 1.3 Fonctionnalités Principales

| Module | Description |
|---|---|
| **Authentification** | Login/Register/Logout Sanctum, reset password, profil utilisateur |
| **Projets** | CRUD complet, code unique, pause/reprise, chemin critique CPM |
| **Équipes** | Gestion multi-équipes, capacité hebdomadaire, spécialités |
| **Tâches** | Cycle de vie complet, dépendances (FS/SS/FF/SF), worklog, pièces jointes |
| **Kanban** | Drag-and-drop, 4 colonnes workflow, filtres avancés |
| **Gantt** | Visualisation chronologique, chemin critique, dépendances, filtrage par rôle |
| **Calendrier** | Vue mensuelle/hebdomadaire — Administrateur et Collaborateur uniquement |
| **IA — Recommandation** | Machine Learning GBM+RF, 22 features, classement candidats |
| **IA — Estimation** | Estimation durée via OpenRouter (LLM gratuit) |
| **IA — Risques** | Détection retards, projets à risque, rapport client |
| **Notifications** | 17 types, filtrées par rôle, temps réel WebSocket |
| **RBAC** | Rôles système + personnalisés, permissions granulaires, override projet |
| **Journal d'Audit** | Traçabilité complète, admin uniquement |
| **Invitations** | Email + lien tokenisé (48h), rôles invité |
| **Dashboard** | KPIs par rôle (Admin/Collaborateur/Observateur) |

### 1.4 Valeur Ajoutée

- **Intelligence artificielle intégrée** : recommandation d'affectation basée sur un modèle entraîné sur les données réelles de complétion des tâches.
- **Temps réel** : tous les changements critiques (pause projet, mouvement Kanban, nouvelles tâches) sont broadcastés via WebSocket.
- **Sécurité multicouche** : middleware → policy → AccessControl → scopes Eloquent.
- **Chemin critique CPM** : algorithme complet de planification avec propagation des retards.
- **Multi-rôles flexibles** : rôles système + personnalisés + overrides projet.

---

## 2. Architecture Générale

### 2.1 Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENT (Browser)                       │
│                    React 19 + Vite + TailwindCSS                │
│                  (Port 5173 — dev / dist/ — prod)               │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS / REST API
                           │ WebSocket (ws/wss)
┌──────────────────────────▼──────────────────────────────────────┐
│                     BACKEND Laravel 12                          │
│              API REST (Port 8000) + Broadcasting                │
│         Sanctum (auth) · Spatie (RBAC) · Reverb (WS)           │
└──────┬────────────────────────────────────┬──────────────────────┘
       │ MySQL                              │ HTTP (3s timeout)
┌──────▼─────────┐                ┌────────▼───────────────────────┐
│  MySQL 8.x     │                │  FastAPI Python (Port 8001)    │
│  52+ tables    │                │  ML Service                    │
│  Relations FK  │                │  scikit-learn GBM+RF           │
└────────────────┘                │  task_assignment.joblib        │
                                  └────────────────────────────────┘
```

### 2.2 Diagramme d'architecture

```mermaid
graph TB
    Browser["🌐 Browser\nReact 19"]
    Laravel["⚙️ Laravel 12\nAPI + WebSocket"]
    MySQL["🗄️ MySQL 8\n52+ tables"]
    Python["🤖 FastAPI\nML Service"]
    Reverb["📡 Reverb\nWebSocket"]

    Browser -->|REST API Bearer Token| Laravel
    Browser -->|WebSocket| Reverb
    Laravel -->|Eloquent ORM| MySQL
    Laravel -->|HTTP 3s timeout| Python
    Reverb -->|Laravel Broadcasting| Laravel
    Python -->|SQLAlchemy| MySQL
```

### 2.3 Flux de données

```mermaid
sequenceDiagram
    participant B as Browser
    participant L as Laravel API
    participant DB as MySQL
    participant ML as FastAPI ML
    participant WS as Reverb WS

    B->>L: POST /auth/login
    L->>DB: Query users
    L-->>B: Bearer Token + User data

    B->>L: GET /projects/{id}/tasks
    L->>DB: Task::accessibleBy(user)
    L-->>B: TaskResource[]

    B->>L: GET /projects/{id}/auto-assign
    L->>ML: POST /recommend {features}
    ML-->>L: {candidates, scores}
    L-->>B: Ranked candidates

    B->>L: PUT /tasks/{id} {workflow_status: done}
    L->>DB: Update task
    L->>WS: broadcast(TaskUpdated)
    WS-->>B: .task.updated event
    B->>B: Invalidate React Query cache
```

---

## 3. Stack Technique

### 3.1 Frontend

| Technologie | Version | Usage |
|---|---|---|
| **React** | 19.2.0 | Framework UI |
| **Vite** | 7.3.1 | Build tool, dev server |
| **React Router DOM** | 7.13.1 | Routing SPA |
| **TanStack React Query** | 5.90.21 | Server state, caching, mutations |
| **Axios** | 1.13.6 | Client HTTP |
| **Framer Motion** | 12.38.0 | Animations |
| **Lucide React** | 0.577.0 | Icônes |
| **TailwindCSS** | 4.2.1 | CSS utilitaire |
| **tailwind-merge** | 3.3.0 | Fusion classes conditionnelles |
| **Sonner** | 2.0.7 | Toast notifications |
| **Laravel Echo** | 2.3.1 | Client WebSocket |
| **Pusher JS** | 8.4.0 | Transport WebSocket |
| **Prop Types** | 15.8.1 | Typage props |
| **date-fns** | 4.4.0 | Manipulation dates |

### 3.2 Backend

| Technologie | Version | Usage |
|---|---|---|
| **Laravel** | 12.x | Framework PHP |
| **PHP** | ≥ 8.2 | Langage backend |
| **Laravel Sanctum** | 4.3 | Authentification API (Bearer Token) |
| **Laravel Reverb** | 1.9 | Serveur WebSocket natif Laravel |
| **Spatie Laravel Permission** | 6.24 | RBAC avancé |
| **Pusher PHP Server** | 7.2 | Driver WebSocket alternatif |
| **Laravel Tinker** | 2.10.1 | REPL Artisan |

### 3.3 Base de données

| Technologie | Usage |
|---|---|
| **MySQL 8.x** | SGBD principal |
| **52 tables** | Projets, tâches, équipes, rôles, audit, ML |

### 3.4 Machine Learning

| Technologie | Usage |
|---|---|
| **FastAPI** | Framework API Python |
| **Uvicorn** | Serveur ASGI |
| **scikit-learn** | GradientBoostingClassifier + RandomForestClassifier |
| **pandas + numpy** | Manipulation des données |
| **SQLAlchemy + PyMySQL** | Accès base de données |
| **joblib** | Sérialisation modèles ML |
| **Pydantic** | Validation des requêtes |

### 3.5 Temps réel

| Technologie | Usage |
|---|---|
| **Laravel Reverb** | Serveur WebSocket (port 8080) |
| **Laravel Echo** | Client JavaScript |
| **Pusher JS** | Transport ws/wss |
| **Canaux privés** | `user.{id}`, `project.{id}` |

---

## 4. Structure Complète du Projet

### 4.1 Structure des dossiers

```
projet/
├── laravel/                    # Backend Laravel 12
│   ├── app/
│   │   ├── Console/Commands/   # Artisan commands (ML training)
│   │   ├── Events/             # 12 événements broadcastés
│   │   ├── Exceptions/         # Handler d'exceptions
│   │   ├── Http/
│   │   │   ├── Controllers/Api/ # 30 contrôleurs REST
│   │   │   ├── Middleware/      # 4 middlewares personnalisés
│   │   │   └── Resources/       # 18 API Resources JSON
│   │   ├── Listeners/          # 3 listeners async (queue)
│   │   ├── Mail/               # 1 Mailable (invitation)
│   │   ├── Models/             # 24 Modèles Eloquent
│   │   ├── Notifications/      # Notifications Laravel
│   │   ├── Policies/           # 2 Policies (Project, Task)
│   │   ├── Providers/          # AppServiceProvider
│   │   └── Support/            # AccessControl, ApiPagination
│   │       └── AccessControl.php # Logique d'autorisation centrale
│   ├── bootstrap/app.php       # Middleware registration
│   ├── config/                 # broadcasting, services, sanctum
│   ├── database/
│   │   ├── migrations/         # 46 migrations
│   │   └── seeders/            # RoleAndPermissionSeeder, FreshDemoSeeder
│   └── routes/
│       ├── api.php             # ~130 routes API REST
│       ├── channels.php        # Canaux WebSocket
│       └── web.php             # SPA catch-all
│
├── react/                      # Frontend React 19
│   └── src/
│       ├── App.jsx             # Router principal, 28 routes
│       ├── components/
│       │   ├── admin/          # UserManagement
│       │   ├── auth/           # PermissionGate, guards
│       │   ├── calendar/       # CalendarView
│       │   ├── gantt/          # GanttChart
│       │   ├── layout/         # Sidebar, Topbar, AppLayout
│       │   ├── notifications/  # NotificationDropdown
│       │   ├── projects/       # ProjectPauseButton, ProjectDateBanner
│       │   ├── specialties/    # SpecialtyCardGrid
│       │   ├── tasks/          # WorkflowBoard, MLRecommendationModal, etc.
│       │   └── ui/             # 14 composants UI réutilisables
│       ├── contexts/
│       │   └── AuthContext.jsx # État auth global
│       ├── hooks/
│       │   ├── usePermissions.js # Vérification permissions
│       │   └── useProjectPause.js # Pause/reprise projet
│       ├── i18n/
│       │   ├── I18nContext.jsx  # Fournisseur traductions
│       │   └── messages.js     # Chaînes FR + EN
│       ├── lib/
│       │   ├── api.js          # Axios + Bearer Token
│       │   ├── echo.js         # WebSocket client
│       │   ├── roles.js        # APP/PROJECT_ROLE_LABELS
│       │   ├── notificationNav.js # Liens notification→route
│       │   ├── taskConstants.js # WORKFLOW_COLUMNS, ISSUE_TYPES
│       │   └── services/       # dashboardApi, invitationsApi, notificationsApi
│       ├── pages/
│       │   ├── admin/          # RolesPage, RoleDetailPage, PermissionMatrixPage
│       │   ├── ai/             # AiPage
│       │   ├── audit/          # AuditLogPage, AuditReportPage
│       │   ├── auth/           # LoginPage, RegisterPage, ForgotPasswordPage, ResetPasswordPage
│       │   ├── calendar/       # CalendarPage
│       │   ├── dashboard/      # DashboardPage, ClientDashboard
│       │   ├── gantt/          # GanttPage
│       │   ├── invites/        # AcceptInvitePage
│       │   ├── landing/        # LandingPage
│       │   ├── notifications/  # NotificationsPage, NotificationSettingsPage
│       │   ├── projects/       # ProjectsPage, ProjectDetailPage, TaskFormPage, MembersPerformancePage
│       │   ├── settings/       # SettingsPage
│       │   ├── tasks/          # TasksHubPage
│       │   ├── teams/          # TeamsPage, TeamDetailPage
│       │   └── users/          # UsersAdminPage
│       └── routes/
│           └── guards.jsx      # ProtectedRoute, RoleRoute, PermissionRoute
│
└── python/ml/                  # Microservice ML FastAPI
    ├── app.py                  # 6 endpoints FastAPI
    ├── recommender.py          # Logique ML (22 features, GBM+RF)
    ├── train.py                # Script d'entraînement CLI
    ├── main.py                 # Point d'entrée uvicorn
    ├── models/
    │   ├── task_assignment.joblib      # Modèle entraîné
    │   └── task_assignment_meta.joblib # Métadonnées modèle
    └── requirements.txt        # Dependencies Python
```

### 4.2 Pages React — Routes et protections

| Chemin | Composant | Protection | Rôles autorisés |
|---|---|---|---|
| `/` | LandingPage | GuestRoute | Non authentifiés |
| `/login` | LoginPage | GuestRoute | Non authentifiés |
| `/register` | RegisterPage | GuestRoute | Non authentifiés |
| `/forgot-password` | ForgotPasswordPage | GuestRoute | Non authentifiés |
| `/reset-password` | ResetPasswordPage | ProtectedRoute | Tous |
| `/accept-invite` | AcceptInvitePage | Aucune | Tous |
| `/audit-log/report` | AuditReportPage | ProtectedRoute + RoleRoute | **admin** |
| `/dashboard` | DashboardPage | ProtectedRoute | Tous authentifiés |
| `/projects` | ProjectsPage | ProtectedRoute | Tous authentifiés |
| `/projects/:id` | ProjectDetailPage | ProtectedRoute | Tous authentifiés |
| `/projects/:id/tasks/new` | TaskFormPage | RoleRoute | admin, member |
| `/projects/:id/tasks/:id/edit` | TaskFormPage | RoleRoute | admin, member |
| `/projects/:id/members-performance` | MembersPerformancePage | ProtectedRoute | Tous authentifiés |
| `/tasks` | TasksHubPage | ProtectedRoute | Tous authentifiés |
| `/calendar` | CalendarPage | RoleRoute | admin, member, client |
| `/teams` | TeamsPage | RoleRoute | **admin** |
| `/teams/:id` | TeamDetailPage | RoleRoute | **admin** |
| `/users` | UsersAdminPage | RoleRoute | **admin** |
| `/gantt` | GanttPage | RoleRoute | admin, member, client |
| `/ai` | AiPage | RoleRoute | admin, member |
| `/notifications` | NotificationsPage | ProtectedRoute | Tous authentifiés |
| `/notifications/settings` | NotificationSettingsPage | ProtectedRoute | Tous authentifiés |
| `/settings` | SettingsPage | ProtectedRoute | Tous authentifiés |
| `/audit-log` | AuditLogPage | RoleRoute | **admin** |
| `/admin/roles` | RolesPage | PermissionRoute | permission: role.view |
| `/admin/roles/:id` | RoleDetailPage | PermissionRoute | permission: role.view |
| `/admin/permissions` | PermissionMatrixPage | PermissionRoute | permission: role.view |

---

## 5. Base de Données

### 5.1 Tables principales

#### Table `users`
| Colonne | Type | Contrainte |
|---|---|---|
| id | bigint | PK |
| name | varchar(255) | NOT NULL |
| email | varchar(255) | UNIQUE |
| email_verified_at | timestamp | nullable |
| password | varchar(255) | — |
| avatar | varchar(255) | nullable |
| profile_photo | varchar(255) | nullable |
| timezone | varchar | default: Africa/Tunis |
| locale | varchar | default: fr |
| theme | varchar | default: system |
| status | enum(active, disabled) | default: active |
| notify_in_app | boolean | default: true |
| notify_email | boolean | default: false |
| notify_type_* | boolean | default: true |
| remember_token | varchar(100) | nullable |
| created_at / updated_at | timestamp | — |

#### Table `projects`
| Colonne | Type | Contrainte |
|---|---|---|
| id | bigint | PK |
| team_id | bigint FK → teams | nullable, nullOnDelete |
| client_id | bigint FK → clients | nullable |
| owner_id | bigint FK → users | nullable, nullOnDelete |
| chef_id | bigint FK → users | nullable |
| project_manager_id | bigint FK → users | nullable |
| name | varchar | NOT NULL |
| code | varchar(10) | UNIQUE |
| description | text | nullable |
| status | enum(planning, active, on_hold, completed, cancelled) | default: planning |
| priority | varchar | nullable |
| start_date | date | nullable |
| end_date | date | nullable |
| progress_percent | integer | nullable |
| paused_at | timestamp | nullable |
| paused_by | bigint FK → users | nullable |
| pause_reason | text | nullable |
| previous_status | varchar | nullable |
| created_by | bigint FK → users | nullable, nullOnDelete |
| deleted_at | timestamp | nullable (SoftDelete) |

#### Table `tasks`
| Colonne | Type | Contrainte |
|---|---|---|
| id | bigint | PK |
| project_id | bigint FK → projects | cascadeOnDelete |
| sprint_id | bigint FK → sprints | nullable, nullOnDelete |
| parent_id | bigint FK → tasks | nullable, nullOnDelete |
| title | varchar | NOT NULL |
| description | text | nullable |
| issue_type | varchar | default: task |
| status_id | bigint FK → task_statuses | nullable |
| priority | enum(low, medium, high, urgent) | default: medium |
| complexity | tinyint(0-10) | default: 3 |
| story_points | integer unsigned | nullable |
| planned_start | date | nullable |
| planned_end | date | nullable |
| due_date | date | nullable |
| estimated_hours | decimal(8,2) | nullable |
| actual_hours | decimal(8,2) | default: 0 |
| progress_percent | tinyint(0-100) | default: 0 |
| workflow_status | varchar | nullable |
| kanban_order | integer unsigned | default: 0 |
| risk_level / risk_score | varchar / integer | nullable |
| created_by / updated_by | bigint FK → users | nullable |
| deleted_at | timestamp | nullable (SoftDelete) |

#### Tables pivot et relations

| Table | Relation | Clé étrangère |
|---|---|---|
| `project_user` | projects ↔ users | cascadeOnDelete des deux côtés |
| `project_members` | projects ↔ users (legacy) | cascadeOnDelete |
| `task_assignments` | tasks ↔ users | cascadeOnDelete |
| `task_dependencies` | tasks ↔ tasks | cascadeOnDelete |
| `task_watchers` | tasks ↔ users | cascadeOnDelete |
| `task_specialty` | tasks ↔ specialties | cascadeOnDelete |
| `user_specialty` | users ↔ specialties | cascadeOnDelete |
| `team_user` | teams ↔ users | cascadeOnDelete |
| `project_followers` | projects ↔ users | cascadeOnDelete |
| `project_user_roles` | users ↔ projects ↔ roles | Override RBAC par projet |

### 5.2 Diagramme Entité-Relations

```mermaid
erDiagram
    users ||--o{ project_user : "membres"
    users ||--o{ project_members : "membres-legacy"
    users ||--o{ team_user : "membres-equipe"
    users ||--o{ task_assignments : "assignes"
    users ||--o{ task_watchers : "observateurs"
    users ||--o{ user_specialty : "specialites"
    projects ||--o{ project_user : "membres"
    projects ||--o{ tasks : "taches"
    projects ||--o{ sprints : "sprints"
    projects ||--o{ project_invitations : "invitations"
    projects ||--o{ activity_logs : "audit"
    tasks ||--o{ task_assignments : "assignees"
    tasks ||--o{ task_dependencies : "dependances"
    tasks ||--o{ task_comments : "commentaires"
    tasks ||--o{ attachments : "fichiers"
    tasks ||--o{ time_entries : "temps"
    tasks ||--o{ daily_task_progress : "worklog"
    teams ||--o{ team_user : "membres"
    teams ||--o{ projects : "projets"
    specialties ||--o{ user_specialty : "utilisateurs"
    specialties ||--o{ task_specialty : "taches"
```

### 5.3 Tables Spatie RBAC

| Table | Usage |
|---|---|
| `roles` | Rôles système et personnalisés |
| `permissions` | 50 permissions granulaires |
| `permission_groups` | 10 groupes de permissions |
| `model_has_roles` | Assignation user → role |
| `model_has_permissions` | Permissions directes sur utilisateur |
| `role_has_permissions` | Permissions d'un rôle |
| `project_user_roles` | Override RBAC par projet (granted/denied) |
| `permission_audit_logs` | Journal changements de permissions |

---

## 6. Authentification

### 6.1 Mécanisme

IntelliPM utilise **Laravel Sanctum** avec des tokens Bearer. Pas de session cookie — l'API est stateless.

```
POST /api/auth/login
→ { token: "xxx", user: { id, name, email, roles, permissions, ... } }
→ Token stocké dans localStorage
→ Envoyé sur chaque requête : Authorization: Bearer {token}
```

### 6.2 Endpoints d'authentification

| Endpoint | Méthode | Protection | Description |
|---|---|---|---|
| `/auth/register` | POST | Public (5 req/min) | Création compte, rôle `member` par défaut |
| `/auth/login` | POST | Public (5 req/min) | Login, garde 5 tokens max par user |
| `/auth/logout` | POST | Sanctum | Révoque le token courant |
| `/logout-all-devices` | POST | Sanctum | Révoque tous les tokens |
| `/me` | GET | Sanctum | Profil complet + rôles + permissions |
| `/me` | PUT | Sanctum | Mise à jour nom, email, timezone, locale |
| `/me/avatar` | POST | Sanctum | Upload photo de profil |
| `/me/preferences` | PATCH | Sanctum | Thème, notifications, locale |
| `/change-password` | POST | Sanctum | Modification mot de passe |
| `/auth/forgot-password` | POST | Public | Envoi email reset |
| `/auth/reset-password` | POST | Public | Nouveau mot de passe avec token |

### 6.3 Gestion des tokens

- **5 tokens maximum** par utilisateur (les plus anciens sont supprimés)
- **Vérification statut** : `EnsureUserIsActive` middleware supprime le token si `user.status = disabled`
- **Rate limiting** : routes auth : 5 req/min ; routes API : 60 req/min

### 6.4 Flux d'authentification

```mermaid
flowchart TD
    A[Login Form] --> B[POST /auth/login]
    B --> C{Credentials OK?}
    C -- Non --> D[401 - Les identifiants sont incorrects]
    C -- Oui --> E{User status?}
    E -- disabled --> F[403 - Compte désactivé]
    E -- active --> G[Token Sanctum créé]
    G --> H[Stockage localStorage]
    H --> I[GET /me + GET /me/permissions]
    I --> J[User state dans AuthContext]
    J --> K[Redirect /dashboard]
```

### 6.5 Frontend — AuthContext

`react/src/contexts/AuthContext.jsx` :
- Appelle `GET /me` au chargement + enrichit avec `GET /me/permissions`
- Applique le thème via `applyAppTheme()`
- Détecte la déconnexion cross-tab via `storage events`
- Expose : `user`, `loading`, `logout()`, `fetchUser()`

---

## 7. Gestion des Rôles et Nomenclature

### 7.1 Hiérarchie officielle

#### Niveau 1 — Rôles globaux (Spatie, plateforme entière)

| Nom technique | Nom affiché | Couleur | Description |
|---|---|---|---|
| `admin` | **Administrateur** | `#6366f1` | Accès complet à la plateforme |
| `member` | **Collaborateur** | `#10b981` | Utilisateur standard inscrit |
| `client` | **Observateur** | `#f59e0b` | Utilisateur externe en lecture seule |

#### Niveau 2 — Rôles projet (table `project_members`)

| Nom technique | Nom affiché | Description |
|---|---|---|
| `chef` | **Chef de projet** | Responsable du projet |
| `membre` | **Contributeur** | Participe aux tâches du projet |
| `client` / `guest` / `viewer` | **Observateur** | Suit le projet en lecture seule |

### 7.2 Fonctions d'affichage (frontend)

Fichier : `react/src/lib/roles.js`

```javascript
APP_ROLE_LABELS = {
  admin:  'Administrateur',
  member: 'Collaborateur',
  client: 'Observateur',
}

PROJECT_ROLE_LABELS = {
  chef:   'Chef de projet',
  membre: 'Contributeur',
  member: 'Contributeur',   // legacy
  client: 'Observateur',
  guest:  'Observateur',    // legacy
  viewer: 'Observateur',    // legacy
  owner:  'Chef de projet', // legacy
}

formatAppRole(role)      → label global officiel
formatProjectRole(role)  → label projet officiel
isGuestViewer(user)      → true si rôle client/guest/viewer
```

### 7.3 Permissions par rôle — Matrice complète

#### Rôles globaux

| Permission | Administrateur | Collaborateur | Observateur |
|---|:---:|:---:|:---:|
| **Projets** | | | |
| project.view | ✅ | ✅ | ✅ |
| project.create | ✅ | ✅ | ❌ |
| project.edit | ✅ | ✅ | ❌ |
| project.delete | ✅ | ❌ | ❌ |
| project.archive | ✅ | ✅ | ❌ |
| project.export | ✅ | ✅ | ✅ |
| project.manage_members | ✅ | ✅ | ❌ |
| project.manage_settings | ✅ | ✅ | ❌ |
| project.pause | ✅ | ❌ | ❌ |
| project.resume | ✅ | ❌ | ❌ |
| **Tâches** | | | |
| task.view | ✅ | ✅ | ✅ |
| task.create | ✅ | ✅ | ❌ |
| task.edit | ✅ | ✅ | ❌ |
| task.delete | ✅ | ✅ (policy) | ❌ |
| task.assign | ✅ | ✅ | ❌ |
| task.comment | ✅ | ✅ | ❌ |
| task.change_status | ✅ | ✅ | ❌ |
| task.manage_time | ✅ | ✅ | ❌ |
| **IA & Dashboard** | | | |
| ai.view | ✅ | ✅ | ✅ (rapports projet) |
| ai.use | ✅ | ✅ | ❌ |
| ai.analytics | ✅ | ✅ | ❌ |
| ai.retrain | ✅ | ❌ | ❌ |
| dashboard.view_member | ✅ | ✅ | ❌ |
| dashboard.view_client | ✅ | ❌ | ✅ |
| dashboard.view_analytics | ✅ | ✅ | ❌ |
| **Gantt & Notifications** | | | |
| gantt.view | ✅ | ✅ | ✅ |
| gantt.edit | ✅ | ✅ | ❌ |
| notification.view | ✅ | ✅ | ✅ (filtrée) |
| notification.manage | ✅ | ✅ | ❌ |
| **RBAC** | | | |
| role.view | ✅ | ❌ | ❌ |
| role.create/edit/delete | ✅ | ❌ | ❌ |

### 7.4 Pages accessibles par rôle

| Page | Administrateur | Collaborateur | Observateur |
|---|:---:|:---:|:---:|
| Dashboard (vue dédiée) | ✅ Admin | ✅ Membre | ✅ Client |
| Projets (liste) | ✅ | ✅ | ✅ |
| Projet (détail + Kanban) | ✅ | ✅ | ❌ (Kanban masqué) |
| Projet (onglet Historique) | ✅ | ❌ | ❌ |
| Tâches (hub) | ✅ | ✅ | ✅ (lecture) |
| Création/Édition tâche | ✅ | ✅ | ❌ |
| Gantt | ✅ | ✅ | ✅ |
| Calendrier | ✅ | ✅ | ✅ |
| IA | ✅ | ✅ | ❌ |
| Équipes | ✅ | ❌ | ❌ |
| Utilisateurs | ✅ | ❌ | ❌ |
| Journal d'audit | ✅ | ❌ | ❌ |
| Rôles & Permissions | ✅ | ❌ | ❌ |
| Paramètres | ✅ complet | ✅ complet | ✅ limité |
| Spécialités (Settings) | ✅ | ✅ | ❌ |

---

## 8. Gestion des Permissions

### 8.1 Spatie Laravel Permission

**50 permissions** réparties en **10 groupes** :

| Groupe | Permissions |
|---|---|
| Projets | view, create, edit, delete, archive, export, manage_members, manage_settings, pause, resume |
| Tâches | view, create, edit, delete, assign, comment, change_status, manage_dependencies, manage_time, export |
| Sprints | view, create, edit, delete, complete |
| Équipes | view, create, edit, delete, manage_members |
| Utilisateurs | view, create, edit, delete, assign_role, suspend, manage_permissions |
| Intelligence Artificielle | view, use, retrain, analytics |
| Dashboard | view_admin, view_member, view_client, view_analytics |
| Gantt | view, edit |
| Notifications | view, manage |
| Rôles & Permissions | view, create, edit, delete, assign |

### 8.2 Middleware Laravel

#### `CheckRole` — `check.role`

```php
// Utilisation dans routes/api.php :
check.role:admin           → doit avoir le rôle 'admin'
check.role:!client         → ne doit PAS avoir le rôle 'client'
check.role:admin,member    → doit avoir AU MOINS un de ces rôles
```

**Fonctionnement** : vérifie `$user->hasAnyRole()` via Spatie. Retourne 403 si bloqué.

#### `CheckProjectAccess` — `check.project`

```php
check.project:view    → vérifie AccessControl::canViewProject()
check.project:edit    → vérifie canViewProject() ET canEditProject()
```

Extrait le projet depuis le paramètre de route `{project}`.

#### `CheckProjectNotPaused` — `project.not_paused`

Bloque toutes les méthodes d'écriture (POST/PUT/PATCH/DELETE) si `$project->isPaused()`. Retourne **HTTP 423 Locked**. Bypass autorisé pour `/pause` et `/resume`.

#### `EnsureUserIsActive` — `active.user`

Si `$user->status === 'disabled'` : supprime le token courant, retourne 403.

### 8.3 Policies Laravel

#### `ProjectPolicy`

| Méthode | Autorisé pour | Bloqué pour |
|---|---|---|
| `view` | Membres, owners, admins | Non-membres, clients non-invités |
| `create` | Admins, non-clients | Clients |
| `update` | Admin + owner + chef + project.manage_all | Autres |
| `delete` | Admin + project.manage_all | Autres |
| `pause` | Admin + owner + chef_id + project.pause permission | Clients |
| `resume` | **Admin + chef_id UNIQUEMENT** | Owner, clients, autres |

#### `TaskPolicy`

| Méthode | Autorisé pour | Bloqué pour |
|---|---|---|
| `view` | Admin + membres projet + assignés | Non-membres |
| `create` | Tous rôles non-client | Clients |
| `update` | `AccessControl::canEditTask()` | Clients, non-membres |
| `delete` | `AccessControl::canDeleteTask()` | Clients, non-chefs, tâches terminées |

### 8.4 AccessControl.php — Méthodes centrales

Fichier : `laravel/app/Support/AccessControl.php`

| Méthode | Retourne vrai si... |
|---|---|
| `isAdmin(User)` | `hasRole('admin')` |
| `isClientRole(User)` | `hasRole('client')` |
| `isProjectClient(User, Project)` | projectRole === 'client' |
| `canViewProject(User, Project)` | Admin OU membre OU owner OU assigné à une tâche |
| `canEditProject(User, Project)` | Admin OU owner OU chef_id (JAMAIS client) |
| `canCreateTaskInProject(User, Project)` | Admin OU owner OU chef OU membre (JAMAIS client) |
| `canCommentOnProject(User, Project)` | Admin OU membre interne (JAMAIS client ni project-client) |
| `canEditTask(User, Task)` | Admin OU owner OU chef OU créateur OU assigné (JAMAIS client) |
| `canDeleteTask(User, Task)` | Admin OU chef OU créateur (si tâche non terminée) |
| `canManageProjectMembers(User, Project)` | Admin OU owner OU chef_id |
| `canInviteToProject(User, Project)` | Admin OU owner OU chef |

### 8.5 Override de permissions par projet

La table `project_user_roles` permet de surcharger les permissions Spatie pour un utilisateur dans un projet spécifique :
- `granted_permissions` (json) : permissions supplémentaires
- `denied_permissions` (json) : permissions révoquées

**Ordre de résolution** (PermissionResolver.php) :
1. Permissions `denied` (priorité absolue)
2. Permissions `granted`
3. Rôle projet (chef/membre/client)
4. Rôle global Spatie
5. Permissions directes utilisateur

---

## 9. Gestion des Projets

### 9.1 Création d'un projet

```
POST /api/projects
Body: { name, code, description, team_id, start_date, end_date,
        chef_id, members, priority }
```

À la création :
- `owner_id` = utilisateur connecté
- 4 statuts par défaut créés automatiquement : À faire, En cours, En revue, Terminé
- `code` : identifiant unique alphanumérique (ex: PRJ-001)

### 9.2 Statuts de projet

| Statut | Description |
|---|---|
| `planning` | Planification initiale |
| `active` | En cours d'exécution |
| `on_hold` | **Mis en pause** (lecture seule) |
| `completed` | Terminé |
| `cancelled` | Annulé |

### 9.3 Pause / Reprise

**Mise en pause** (`POST /projects/{id}/pause`) :
- Requiert `pause_reason` (5-1000 caractères)
- Enregistre : `paused_at`, `paused_by`, `pause_reason`, `previous_status`
- Toutes les mutations sont bloquées par `CheckProjectNotPaused` (HTTP 423)
- Broadcast `ProjectStatusChanged` event

**Reprise** (`POST /projects/{id}/resume`) :
- **Autorisé pour Admin + chef_id uniquement** (plus restrictif que la pause)
- Restaure le `previous_status`
- Nettoie les champs pause

### 9.4 Chemin Critique (CPM)

Endpoint : `GET /projects/{id}/critical-path`

Algorithme (CriticalPathService) :
1. Construire le DAG des dépendances FS
2. Tri topologique (algorithme de Kahn)
3. Passe avant : ES + EF
4. Passe arrière : LF + LS
5. Chemin critique : tâches avec slack = 0

Retourne : `{ critical_tasks[], total_duration, graph_valid, message }`

### 9.5 Calcul de progression

`ProjectProgressAggregator` :
- Pondération par story_points (ou complexity si absent)
- Multiplicateur 1.5× pour priorité high/urgent
- Formule : `Σ(progress_percent × weight) / Σ(weight)`

---

## 10. Gestion des Équipes

### 10.1 Structure

Une équipe contient :
- **Un chef** (`team_leader_id`)
- **N membres** (pivot `team_user` avec rôle, capacité hebdomadaire, compétences)

### 10.2 Rôles dans une équipe

| Valeur technique | Description |
|---|---|
| `lead` | Chef d'équipe (un seul par équipe, démotion auto si changement) |
| `developer` | Développeur |
| `tester` | Testeur |
| `member` / `designer` | Autres rôles normalisés |

### 10.3 Capacité et spécialités

Chaque membre d'équipe a :
- `capacity_hours_per_week` : decimal(5,1), défaut 40h
- `skills` : json (liste de compétences libres)
- `is_active` : boolean
- Spécialités Spatie : liaison via `user_specialty`

### 10.4 Permissions

| Action | Rôle requis |
|---|---|
| Créer une équipe | **Admin** |
| Modifier une équipe | **Admin** |
| Supprimer une équipe | **Admin** |
| Ajouter/Retirer un membre | **Admin** |
| Voir les équipes | Tous (filtrées par appartenance) |

---

## 11. Gestion des Invitations

### 11.1 Workflow complet

```mermaid
sequenceDiagram
    participant Chef as Chef / Admin
    participant Laravel
    participant Email
    participant Invitee as Invité

    Chef->>Laravel: POST /projects/{id}/invite {email, role}
    Laravel->>Laravel: Génère token UUID (48h)
    Laravel->>Email: ProjectInvitationMail
    Email-->>Invitee: Lien /accept-invite?token=xxx
    Invitee->>Laravel: GET /invitations/verify?token=xxx
    Laravel-->>Invitee: {valid, invitation details, roleLabel}
    alt Accepter
        Invitee->>Laravel: POST /invitations/{token}/accept
        Laravel->>Laravel: Ajoute user aux pivots projet
        Laravel-->>Invitee: Redirect /projects/{id}
    else Refuser
        Invitee->>Laravel: POST /invitations/{token}/decline
        Laravel->>Laravel: status = 'declined'
    end
```

### 11.2 Statuts d'invitation

| Statut | Description |
|---|---|
| `pending` | En attente (lien valide) |
| `accepted` | Acceptée |
| `declined` | Refusée (re-acceptation impossible) |
| `expired` | Expirée (> 48h) |

### 11.3 Sécurité

- Token : UUID (64 chars), unique, usage unique après acceptation
- Expiration : 48 heures (`expires_at`)
- Admins ne peuvent pas être invités (bloqué à l'acceptation)
- Rôles d'invitation autorisés : `member` ou `client` uniquement (validation `in:member,client`)
- Double acceptation bloquée (retourne HTTP 410 Gone)

### 11.4 Email d'invitation

`ProjectInvitationMail` envoie :
- Nom de l'inviteur
- Nom du projet
- **Label du rôle** : "Contributeur" ou "Observateur" (nomenclature officielle)
- Lien d'acceptation

---

## 12. Gestion des Tâches

### 12.1 Cycle de vie d'une tâche

```mermaid
stateDiagram-v2
    [*] --> todo : Création
    todo --> in_progress : Début de travail
    in_progress --> done : Complétion (progress 100%)
    in_progress --> at_risk : Retard détecté
    at_risk --> in_progress : Correction
    at_risk --> done : Complétion malgré retard
    done --> [*]
```

### 12.2 Workflow Status

| Valeur | Signification | Déclencheur |
|---|---|---|
| `todo` | À faire | Par défaut à la création |
| `in_progress` | En cours | Mouvement Kanban ou progress > 0 |
| `at_risk` | À risque | Retard détecté (due_date dépassée) |
| `done` | Terminé | progress = 100% ou déplacement vers colonne Done |

### 12.3 Types de tâches (issue_type)

| Valeur | Label FR |
|---|---|
| `task` | Tâche |
| `bug` | Bug |
| `story` | Story |

### 12.4 Dépendances

Types de dépendances supportés :

| Type | Signification |
|---|---|
| `FS` | Finish-to-Start (par défaut) |
| `SS` | Start-to-Start |
| `FF` | Finish-to-Finish |
| `SF` | Start-to-Finish |

### 12.5 Calcul de progression (ProgressCalculationService)

| Composante | Poids |
|---|---|
| Sous-tâches terminées | 35% |
| Heures loggées / estimées | 25% |
| Checklist cochée | 15% |
| Workflow status | 10% |
| Score d'activité | 10% |
| Validation manager | 5% |

### 12.6 Formulaire de création (4 étapes)

1. **Basics** : titre, description, issue_type, priorité
2. **Planning** : dates planifiées, heures estimées, complexité (0-10), progression
3. **Spécialités & Liens** : spécialité requise, dépendances
4. **Assignation** : assigné, recommandation ML

### 12.7 Permissions sur les tâches

| Action | Administrateur | Collaborateur | Observateur |
|---|:---:|:---:|:---:|
| Voir | ✅ | ✅ (ses projets) | ✅ (lecture seule) |
| Créer | ✅ | ✅ | ❌ |
| Modifier | ✅ | ✅ (créateur/assigné) | ❌ |
| Supprimer | ✅ | ✅ (créateur, si non terminée) | ❌ |
| Commenter | ✅ | ✅ | ❌ |
| Worklog | ✅ | ✅ | ❌ |
| Pièces jointes | ✅ | ✅ (uploader/lire) | ✅ (lire seulement) |

---

## 13. Kanban

### 13.1 Colonnes

| ID | Label | Couleur |
|---|---|---|
| `todo` | À faire | Ardoise |
| `in_progress` | En cours | Ambre |
| `done` | Terminé | Émeraude |
| `at_risk` | À risque | Rouge |

### 13.2 Drag-and-Drop

**Frontend** (ProjectDetailPage.jsx) :
- `draggable={canWriteTask}` : drag désactivé si lecture seule
- `onDragStart` : stocke `taskId` dans `dataTransfer`
- `onDrop` : vérifie `isReadOnly` (projet en pause), puis mutation
- `handleDrop` → `PUT /api/tasks/{id}` `{ workflow_status: targetColumn }`

**Backend** (TaskController.move()) :
- `Gate::authorize('update', $task)` → bloque les clients
- Recalcule `kanban_order` dans la nouvelle colonne
- Log activité via `ActivityLogService`
- Broadcast `TaskUpdated` event (action: 'moved')

### 13.3 Restrictions

| Condition | Comportement |
|---|---|
| Projet en pause | Toast warning, mouvement annulé (frontend + HTTP 423 backend) |
| Rôle Observateur | Onglet Kanban invisible, pas de drag |
| `task.access.can_edit = false` | Drag handle masqué, édition désactivée |

### 13.4 Carte Kanban — Informations affichées

- Titre, description (2 lignes max)
- Badge type (task/bug/story)
- Badge priorité (coloré : bleu/ambre/orange/rouge)
- Story points + durée estimée
- Niveau de risque
- Indicateur retard (badge "En retard")
- Avatars assignés (3 max, empilés)
- Barre de progression

---

## 14. Diagramme de Gantt

### 14.1 Données

**Endpoint global** : `GET /api/gantt`
- Administrateur : toutes les tâches de la plateforme
- Client (Observateur) : tâches de ses projets invités
- Chef de projet / Owner : toutes les tâches de ses projets + assignées ailleurs
- Collaborateur simple : uniquement ses tâches assignées

**Endpoint projet** : `GET /api/projects/{id}/gantt`
- Administrateur / Chef / Owner / Admin-projet : toutes les tâches du projet
- Collaborateur simple : uniquement ses tâches assignées dans ce projet
- Données retournées : dépendances, `is_critical`, `is_delayed`, `progress`

> **Vue "par projet (tâches)"** dans GanttPage : utilise `/projects/{id}/gantt` pour garantir le filtrage correct par rôle.

### 14.2 Calculs de visualisation

- **Plage temporelle** : min(start) → max(end) + 2 jours de marge
- **Marqueur "Aujourd'hui"** : ligne verte verticale à position relative
- **Progression attendue** : `((today - start) / duration) * 100%`
- **Indicateur retard** : if actual_progress < expected_progress - 10%

### 14.3 Style des barres

| Condition | Style |
|---|---|
| Tâche critique | Gradient rouge + anneau + glow |
| Tâche en retard | Superposition ambre 50% |
| Priorité low | Gradient bleu |
| Priorité medium | Gradient ambre |
| Priorité high | Gradient orange |
| Priorité urgent | Gradient rouge |

### 14.4 Dépendances graphiques

Flèches SVG avec courbes bézier :
- Flèche normale : ardoise (#94a3b8)
- Flèche critique : rouge (#dc2626)

### 14.5 Propagation des retards

`GanttController::propagateDelayToDependents()` : algorithme BFS qui met à jour les dates des tâches dépendantes quand un prédécesseur change.

---

## 15. Calendrier

### 15.1 Fonctionnement

**Endpoint** : `GET /api/calendar?from={date}&to={date}&project_id={id}&user_id={id}`

Affiche les tâches ayant `due_date`, `planned_start` ou `planned_end` dans la plage.

### 15.2 Vues disponibles

| Vue | Description |
|---|---|
| Mensuelle | Grille 7×5, toutes les tâches du mois |
| Hebdomadaire | 7 colonnes, tâches de la semaine |

### 15.3 Filtres

- **Projet** : dropdown sélection
- **Utilisateur** : dropdown (alimenté par les assignés des tâches visibles)
- **Navigation** : boutons ← → pour changer de période

### 15.4 Permissions

| Rôle | Accès |
|---|---|
| Administrateur | Toutes les tâches accessibles |
| Collaborateur | Tâches de ses projets |
| Observateur (Client) | ❌ Accès bloqué — route et sidebar masqués |

> **Note :** L'accès au Calendrier est restreint aux rôles internes (Admin/Collaborateur). Les clients (Observateurs) n'ont pas accès à cette vue — `clientHidden: true` dans la navigation + `RoleRoute allow={['admin','member']}` dans App.jsx.

---

## 16. Analytics

### 16.1 Dashboard Administrateur (AdminDashboardService)

**Cache** : 45 secondes (clé : `admin_dashboard_global`)

| Métrique | Calcul |
|---|---|
| `users_total` | COUNT(users) |
| `projects_total` | COUNT(projects) |
| `tasks_total` | COUNT(tasks non-archivées) |
| `tasks_completed` | COUNT(tasks avec progress >= 100 OU workflow=done) |
| `tasks_overdue` | COUNT(tasks non-terminées avec date dépassée) |
| `global_completion_rate_percent` | 100 * completed / total |

### 16.2 Dashboard Collaborateur (MemberDashboardService)

**Métriques personnelles** :
- `total_assigned` : tâches assignées à moi
- `completed` / `in_progress` / `todo` : répartition par statut
- `overdue_count` : mes tâches en retard
- `workload_percent` : (tâches_ouvertes / 12) × 100
- `at_risk_count` : ≤ 2 jours + progress < 50%
- `critical_count` : chemin critique avec retards

**Listes** :
- `overdue_tasks` (25 max)
- `upcoming_deadlines` (5 max)
- `recent_tasks` (15 max)
- `blocked_tasks`, `at_risk_tasks`, `critical_tasks` (50 max)

### 16.3 Analytics d'activité (ActivityAnalyticsController)

**Accès** : Admin et Chefs de projet uniquement

**Données** :
- Top 5 utilisateurs actifs (30 jours)
- Répartition activité par module
- Distribution par sévérité
- Tendance 28 jours
- Tâches instables (> 5 updates en 7 jours)
- Membres inactifs (0 activité en 14 jours)
- Score de collaboration

---

## 17. Dashboards

### 17.1 Dashboard Administrateur

**Route** : `GET /admin/dashboard` (protégé `check.role:admin`, cache 45s)

**Widgets** :
- 6 KPI cards : Users, Projets, Tâches, Terminées, En retard, Taux de complétion
- Panel IA Alerts : tâches à risque, projets à risque
- Flux d'activité global (10 dernières actions)

### 17.2 Dashboard Collaborateur (Member)

**Route** : `GET /member/dashboard`

**Widgets** :
- Tâches assignées (résumé : todo/in_progress/done/overdue)
- Prochaines échéances (5 tâches)
- Tâches bloquées par dépendances
- Tâches critiques
- Activité récente du projet

### 17.3 Dashboard Observateur (Client)

**Fichier** : `react/src/pages/dashboard/ClientDashboard.jsx`

**Widgets** :
- Liste des projets invités avec barre de progression
- KPIs projet : avancement, tâches actives, retards
- Section équipe (noms + rôles, sans emails)
- Alertes (danger/warning/success colorées)
- Analyse risque IA (via `/client/projects/{id}/ai/risk`)
- Recommandations IA (via `/client/projects/{id}/ai/recommendations`)

### 17.4 Onglets ProjectDetailPage par rôle

| Onglet | Admin | Collaborateur | Observateur |
|---|:---:|:---:|:---:|
| Kanban | ✅ | ✅ | ❌ |
| Tâches (liste RO) | ❌ | ❌ | ✅ |
| Membres | ✅ | ✅ | ✅ |
| Historique d'audit | ✅ | ❌ | ❌ |
| Gantt | ✅ | ✅ | ✅ |
| Rapport d'avancement | ✅ | ✅ | ✅ |
| Rapports IA | ❌ | ❌ | ✅ |

---

## 18. Notifications

### 18.1 Types de notifications

| Type | Label | Déclencheur | Sévérité |
|---|---|---|---|
| `task_assigned` | Assignation | Assignation d'une tâche | info |
| `task_updated` | Modification | Modification d'une tâche suivie | info |
| `task_completed` | Terminée | Tâche complétée | info |
| `task_delayed` | Retard | Tâche non terminée + date dépassée | warning |
| `task_comment` | Commentaire | Nouveau commentaire | info |
| `task_mentioned` | Mention | Mentionné dans un commentaire | info |
| `project_created` | Projet créé | Nouveau projet | info |
| `project_updated` | Projet modifié | Modification projet | info |
| `project_at_risk` | Projet à risque | ≥ 4 tâches en retard | alert |
| `permission_updated` | Permission | Changement de rôle/permission | warning |
| `invitation_received` | Invitation | Invitation à un projet | info |
| `project_invitation_accepted` | Acceptée | Invitation acceptée | info |
| `member_removed` | Retiré | Membre retiré d'un projet | warning |
| `workload_alert` | Surcharge | ≥ 12 tâches actives | warning |
| `ai_alert` | Alerte IA | Alert IA personnalisé | warning |
| `gantt_updated` | Gantt | Modification dates Gantt | info |
| `project_invitation` | Invitation projet | Alias invitation_received | info |

### 18.2 Matrice de visibilité par rôle

| Notification | Admin | Collaborateur | Chef de Projet | Observateur |
|---|:---:|:---:|:---:|:---:|
| task_assigned | ✅ | ✅ | ✅ | ❌ |
| task_updated | ✅ | ✅ | ✅ | ❌ |
| task_completed | ✅ | ✅ | ✅ | ❌ |
| task_delayed | ✅ | ✅ | ✅ | ❌ |
| task_comment | ✅ | ✅ | ✅ | ❌ |
| task_mentioned | ✅ | ✅ | ✅ | ❌ |
| project_created | ✅ | ✅ | ✅ | ✅ |
| project_updated | ✅ | ✅ | ✅ | ✅ |
| project_at_risk | ✅ | ✅ | ✅ | ✅ ⚠️ |
| permission_updated | ✅ | ✅ | ✅ | ❌ |
| invitation_received | ✅ | ✅ | ✅ | ✅ |
| project_invitation_accepted | ✅ | ✅ | ✅ | ✅ |
| member_removed | ✅ | ✅ | ✅ | ✅ |
| workload_alert | ✅ | ✅ | ✅ | ❌ |
| ai_alert | ✅ | ✅ | ✅ | ❌ |
| gantt_updated | ✅ | ✅ | ✅ | ❌ |

> ⚠️ `project_at_risk` pour l'Observateur inclut le nombre de tâches en retard (information de pilotage de haut niveau, non sensible).

### 18.3 Filtrage côté serveur (Observateur)

`NotificationController::clientAllowedTypes()` — liste blanche appliquée dans `index()`, `summary()` et `stats()` :

```php
['project_created', 'project_updated', 'project_at_risk',
 'project_invitation', 'invitation_received',
 'project_invitation_accepted', 'member_removed']
```

**Non contournable par manipulation API** — filtre appliqué sur la requête Eloquent.

### 18.4 Canaux de livraison

- **In-app** : stocké en base + diffusion WebSocket
- **Email** : `ProjectInvitationMail` (invitation), `TaskNotificationMail` (tâches)

### 18.5 Préférences utilisateur

Configurable par utilisateur :
- `notify_in_app` : affichage dans le centre de notifications
- `notify_email` : notifications par email
- `notify_type_task_assigned` : assignation de tâche
- `notify_type_comment` : commentaires
- `notify_type_task_delayed` : retards automatiques

---

## 19. WebSocket Temps Réel

### 19.1 Architecture

```mermaid
graph LR
    L[Laravel Backend] -->|broadcast()| R[Reverb Server :8080]
    R -->|ws://| E[Laravel Echo Client]
    E --> B[React Browser]
    B -->|React Query invalidate| Q[Refetch API]
```

### 19.2 Canaux

| Canal | Type | Authentification | Usage |
|---|---|---|---|
| `user.{userId}` | Private | Bearer token | Notifications personnelles |
| `project.{projectId}` | Private | Membre du projet | Événements projet |

### 19.3 Événements broadcastés

| Événement | Canal | broadcastAs() | Payload clé |
|---|---|---|---|
| `ProjectStatusChanged` | project.{id} | project.status.changed | action (paused/resumed), pause_reason, actor |
| `TaskUpdated` | project.{id} | task.updated | task_id, action (updated/moved), changed[] |
| `TaskDeleted` | project.{id} | task.deleted | task_id, task_title, actor |
| `TaskAssignmentChanged` | project.{id} + user.{id} | task.assignment.changed | task_id, user_id, action |
| `TaskCommentCreated` | project.{id} | task.comment.created | task_id, comment_id |
| `TaskCommentDeleted` | project.{id} | task.comment.deleted | task_id, comment_id |
| `ProgressUpdated` | project.{id} | progress.updated | task_progress, project_progress, source |
| `SprintStateChanged` | project.{id} | sprint.state.changed | sprint_id, status |
| `NotificationCreated` | user.{id} | notification.created | notification, unread_count |
| `NotificationUpdated` | user.{id} | notification.updated | notification_id, read_at |
| `ActivityLogged` | project.{id} | activity.logged | action, entity_type |
| `PermissionChanged` | user.{id} | permission.changed | user_id, action |

### 19.4 Configuration

**Laravel** (`laravel/config/broadcasting.php`) :
- Driver par défaut : Reverb (env `BROADCAST_CONNECTION=reverb`)
- Port : 8080 (env `REVERB_PORT`)
- Fallback : log (développement) ou pusher

**React** (`react/src/lib/echo.js`) :
- Auth endpoint : `/broadcasting/auth`
- Token : extrait du localStorage, envoyé en Bearer
- Transports : ws/wss
- Driver : configurable via `VITE_BROADCAST_DRIVER`

---

## 20. Machine Learning

### 20.1 Vue d'ensemble

```mermaid
graph TD
    DB[(MySQL)] -->|Task history| T[Train Script]
    T -->|joblib| M[task_assignment.joblib]
    API[FastAPI :8001] -->|load| M
    L[Laravel] -->|HTTP POST| API
    API -->|candidates + scores| L
    L -->|JSON| React
```

### 20.2 Pipeline d'entraînement

**Déclenchement** : `php artisan ml:train` (Laravel) ou `POST /train` (FastAPI admin-only)

**Données** : tâches complétées (`workflow_status = done`) avec assignées

**Label** : `1` si `on_time = true AND hours_ok = true` (actual_hours ≤ estimated × 1.3)

**Modèles** :

| Condition | Modèle | Paramètres |
|---|---|---|
| ≥ 40 samples | GBM + RandomForest Voting | GBM: 200 estimateurs; RF: 150 estimateurs |
| 10-39 samples | LogisticRegression | class_weight=balanced |
| < 10 samples | Aucun | Retourne `insufficient_data` |

**Persistance** : `models/task_assignment.joblib` + `task_assignment_meta.joblib`

### 20.3 22 features d'entrée

Source : `python/ml/features.py` — `FEATURE_NAMES` (vecteur normalisé [0,1])

| # | Feature | Groupe | Description |
|---|---|---|---|
| 1 | `specialty_exact_match` | Correspondance compétences | Correspondance exacte spécialités utilisateur / tâche |
| 2 | `specialty_partial_match` | Correspondance compétences | Correspondance partielle des spécialités |
| 3 | `specialty_breadth` | Correspondance compétences | Étendue des spécialités de l'utilisateur |
| 4 | `current_task_load` | Charge de travail | Nombre de tâches actives actuelles |
| 5 | `capacity_utilization` | Charge de travail | Utilisation de la capacité hebdomadaire |
| 6 | `overdue_ratio_inv` | Charge de travail | Ratio de tâches non-en-retard (inverse des retards) |
| 7 | `overall_completion_rate` | Performance historique | Taux de complétion global des tâches |
| 8 | `on_time_rate` | Performance historique | Taux de livraison dans les délais |
| 9 | `hours_accuracy` | Performance historique | Précision des estimations horaires (actual ≤ estimated × 1.3) |
| 10 | `same_priority_success` | Affinité tâche | Taux de succès sur tâches de même priorité |
| 11 | `same_type_success` | Affinité tâche | Taux de succès sur même type (task/bug/story) |
| 12 | `complexity_affinity` | Affinité tâche | Alignement entre complexité tâche et profil utilisateur |
| 13 | `project_familiarity` | Contexte projet | Niveau de familiarité avec le projet |
| 14 | `team_familiarity` | Contexte projet | Collaboration historique avec l'équipe |
| 15 | `project_role_weight` | Contexte projet | Poids du rôle projet (admin/chef=1.0, member=0.7, client=0.3) |
| 16 | `recent_velocity` | Tendance | Vitesse de complétion récente (30 derniers jours) |
| 17 | `performance_trend` | Tendance | Tendance d'amélioration ou dégradation récente |
| 18 | `recent_on_time_rate` | Tendance | Taux de livraison dans les délais récents |
| 19 | `at_risk_tasks_inv` | Risque | Proportion de tâches non-à-risque (indicateur de fiabilité) |
| 20 | `experience_depth` | Risque | Profondeur d'expérience sur ce type de tâche |
| 21 | `collaboration_score` | Risque | Score de collaboration inter-membres |
| 22 | `sprint_alignment` | Risque | Alignement avec le sprint actif |

### 20.4 Endpoints FastAPI

| Méthode | Endpoint | Description |
|---|---|---|
| POST | `/recommend` | Recommandations pour nouvelle tâche |
| GET | `/recommend/{task_id}` | Recommandations pour tâche existante |
| GET | `/model-info` | Statut modèle + importances features |
| POST | `/train` | Déclenche l'entraînement |
| POST | `/feedback/{task_id}` | Enregistre résultat pour feedback loop |
| GET | `/health` | Vérification santé service |

### 20.5 Intégration Laravel

`PythonMLClient` (`laravel/app/Services/ML/PythonMLClient.php`) :
- URL configurable : `config('services.ml_python.url')` (env: `ML_SERVICE_URL`)
- Timeout : 3 secondes (env: `ML_SERVICE_TIMEOUT`)
- Fallback gracieux si service indisponible : `unavailableResponse()`
- Aucun crash en production si le service ML est hors ligne

### 20.6 Fonctionnalités IA supplémentaires (OpenRouter LLM)

Via `AiService` + `OpenRouterService` :
- **Estimation** : durée estimée en heures via LLM
- **Risque de retard** : probabilité de dépassement
- **Suggestion d'affectation** : recommandation narrative
- **Optimisation** : rééquilibrage de charge équipe
- **Recommandations projet** : amélioration planning
- **Chat IA** : assistant conversationnel avec contexte projet

---

## 21. API REST Complète

### 21.1 Conventions

- Base URL : `{APP_URL}/api`
- Authentification : `Authorization: Bearer {token}`
- Format réponse : JSON
- Pagination : `?page=1&per_page=20`
- Rate limiting : 60 req/min (routes protégées), 5 req/min (auth)

### 21.2 Auth & Profil

| Méthode | Route | Protection | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Inscription (rôle member par défaut) |
| POST | `/auth/login` | Public | Connexion → Bearer token |
| POST | `/auth/logout` | Sanctum | Révocation token courant |
| POST | `/logout-all-devices` | Sanctum | Révocation tous tokens |
| GET | `/me` | Sanctum | Profil + rôles + permissions |
| PUT | `/me` | Sanctum | Mise à jour profil |
| POST | `/me/avatar` | Sanctum | Upload avatar |
| PATCH | `/me/preferences` | Sanctum | Thème, locale, notifications |
| POST | `/change-password` | Sanctum | Changement mot de passe |
| POST | `/auth/forgot-password` | Public | Email de réinitialisation |
| POST | `/auth/reset-password` | Public | Nouveau mot de passe |

### 21.3 Projets

| Méthode | Route | Middleware | Description |
|---|---|---|---|
| GET | `/projects` | Sanctum | Liste projets (filtrée par accès) |
| POST | `/projects` | !client | Créer projet |
| GET | `/projects/{id}` | Sanctum | Détails projet |
| PUT | `/projects/{id}` | !client | Modifier projet |
| DELETE | `/projects/{id}` | !client | Supprimer projet |
| POST | `/projects/{id}/pause` | Sanctum | Mettre en pause |
| POST | `/projects/{id}/resume` | Sanctum | Reprendre |
| GET | `/projects/{id}/dashboard` | check.project:view | KPIs projet |
| GET | `/projects/{id}/activity` | check.project:view + admin | Journal d'audit projet |
| GET | `/projects/{id}/members` | check.project:view | Liste membres |
| POST | `/projects/{id}/invite` | check.project:view | Envoyer invitation |
| POST | `/projects/{id}/members` | check.project:edit | Ajouter membre |
| DELETE | `/projects/{id}/members/{user}` | check.project:edit | Retirer membre |
| GET | `/projects/{id}/gantt` | check.project:view | Données Gantt |
| PUT | `/projects/{id}/gantt` | check.project:edit | Modifier dates Gantt |
| GET | `/projects/{id}/critical-path` | check.project:view | Chemin critique |
| GET | `/projects/{id}/auto-assign` | check.project:view + !client | Auto-assignation ML |
| GET | `/projects/{id}/members-performance` | check.project:view + !client | Performance membres |

### 21.4 Tâches

| Méthode | Route | Middleware | Description |
|---|---|---|---|
| GET | `/tasks` | Sanctum | Tâches accessibles (scopeAccessibleBy) |
| GET | `/projects/{id}/tasks` | check.project:view | Tâches du projet |
| POST | `/projects/{id}/tasks` | check.project:edit + not_paused | Créer tâche |
| GET | `/tasks/{id}` | Sanctum | Détails tâche |
| PUT | `/tasks/{id}` | can:update,task + not_paused | Modifier tâche |
| DELETE | `/tasks/{id}` | can:delete,task + not_paused | Supprimer tâche |
| PATCH | `/tasks/{id}/move` | can:update,task + not_paused | Déplacement Kanban |
| POST | `/tasks/{id}/assign` | can:update,task | Assigner utilisateur |
| GET/POST | `/tasks/{id}/comments` | Sanctum / not_paused | Commentaires |
| GET/POST | `/tasks/{id}/attachments` | Sanctum / not_paused | Pièces jointes |
| GET | `/tasks/{id}/attachments/{id}/download` | Sanctum | Télécharger fichier |
| GET/POST | `/tasks/{id}/time-entries` | Sanctum | Entrées de temps |
| GET/POST | `/tasks/{id}/worklog` | Sanctum / can:update,task | Worklog progressions |
| GET/POST | `/tasks/{id}/dependencies` | Sanctum / can:update,task | Dépendances |
| GET/POST/DELETE | `/tasks/{id}/watchers` | Sanctum | Observateurs tâche |

### 21.5 IA et ML

| Méthode | Route | Middleware | Description |
|---|---|---|---|
| POST | `/ml/recommend` | !client | Recommandation pour nouvelle tâche |
| GET | `/ml/recommend/{task}` | !client | Recommandation tâche existante |
| GET | `/ml/model-info` | !client | Infos modèle ML |
| POST | `/ml/retrain` | admin | Reentraîner le modèle |
| POST | `/ml/feedback/{task}` | !client | Feedback résultat tâche |
| GET | `/ai/estimate/{task}` | !client | Estimation durée |
| GET | `/ai/delay-risk/task/{task}` | !client | Risque retard tâche |
| GET | `/ai/delay-risk/project/{project}` | !client | Risque retard projet |
| GET | `/ai/recommendations/project/{project}` | !client | Recommandations projet |
| GET | `/ai/workload-balance/{project}` | !client | Équilibrage charge |
| POST | `/ai/chat` | !client | Chat IA |
| GET | `/client/projects/{id}/report` | check.project:view | Rapport Observateur |
| GET | `/client/projects/{id}/ai/risk` | check.project:view | Risque IA (Observateur) |
| GET | `/client/projects/{id}/ai/recommendations` | check.project:view | Recs IA (Observateur) |

### 21.6 Administration

| Méthode | Route | Middleware | Description |
|---|---|---|---|
| GET | `/admin/dashboard` | admin | KPIs globaux |
| GET/POST/PUT/DELETE | `/users` | admin | Gestion utilisateurs |
| GET/POST | `/teams` | Sanctum / !client | Équipes |
| GET | `/activity/feed` | admin | Journal d'audit global |
| GET | `/activity/analytics` | admin | Analytics d'activité |
| GET/POST/PUT/DELETE | `/roles` | Sanctum / permission | Gestion rôles RBAC |
| GET | `/roles/audit-log` | admin | Audit permissions |
| GET | `/permissions` | Sanctum | Liste permissions |
| GET/PUT | `/me/permissions` | Sanctum | Permissions courantes |

---

## 22. Sécurité

### 22.1 Stratégie de défense en profondeur

```
Route Middleware
  → [check.role:admin] ou [check.role:!client]
  → [check.project:view/edit]
  → [project.not_paused]

Laravel Gate / Policy
  → Gate::authorize('update', $task)
  → TaskPolicy::update() → AccessControl::canEditTask()

AccessControl.php
  → isClientRole(), canEditProject(), canCreateTaskInProject()

Eloquent Scopes
  → Task::scopeAccessibleBy($user)
  → Project::scopeAccessibleToUser($user)
```

### 22.2 Rate Limiting

| Zone | Limite |
|---|---|
| Authentification (`/auth/*`) | 5 requêtes/minute |
| API protégée | 60 requêtes/minute |

### 22.3 Validation des entrées

Toutes les mutations passent par `$request->validate([...])`. Aucune donnée brute n'est insérée en base sans validation Eloquent.

### 22.4 Protections CSRF et CORS

- CORS configuré via `config/cors.php` avec `SANCTUM_STATEFUL_DOMAINS`
- Sanctum utilise les cookies uniquement pour les applis web stateful (pas le cas ici)
- Toutes les routes API utilisent Bearer Token (pas de CSRF requis)

### 22.5 Sécurité des fichiers

- Stockage des pièces jointes sur le disque `local` (non public par défaut)
- Téléchargement sécurisé via `downloadAttachment()` avec vérification d'appartenance
- Avatars sur le disque `public`

### 22.6 Contrôle accès Observateur

Pour garantir qu'un Observateur ne peut JAMAIS écrire :

| Vecteur d'attaque | Protection |
|---|---|
| URL directe `/audit-log` | `RoleRoute allow=['admin']` → redirect |
| `POST /tasks/{id}/worklog` | `can:update,task` → TaskPolicy::update() = false |
| `GET /activity/feed` | `check.role:admin` → 403 |
| `PUT /tasks/{id}` | `can:update,task` → canEditTask() = false |
| `POST /teams` | `check.role:!client` → 403 |
| `GET /notifications` type non autorisé | Liste blanche clientAllowedTypes() |

---

## 23. Journal d'Audit

### 23.1 Accès — Administrateur uniquement

> **⚠️ Accès réservé exclusivement au rôle Administrateur**

| Rôle | Accès Journal d'Audit |
|---|---|
| **Administrateur** | ✅ Accès complet |
| Collaborateur | ❌ 403 / Redirect |
| Chef de Projet | ❌ 403 / Redirect |
| Observateur | ❌ 403 / Redirect |

### 23.2 Protections Frontend

- Route `/audit-log` → `RoleRoute allow={['admin']}` (commit `83057d1`)
- Route `/audit-log/report` → `RoleRoute allow={['admin']}`
- Sidebar : `adminOnly: true` sur le nav item
- Badge audit query : `enabled: isAdmin`
- SettingsPage carte : `{isAdmin && ...}`
- Dashboard activity feed : `enabled: isAdmin`
- Onglet "Historique" dans ProjectDetailPage : `isAdmin ? [...] : []`

### 23.3 Protections Backend

- `GET /activity/feed` → `check.role:admin`
- `GET /activity/export` → `check.role:admin`
- `GET /activity/analytics` → `check.role:admin`
- `GET /projects/{id}/activity` → `check.role:admin`
- `GET /roles/audit-log` → `check.role:admin`

### 23.4 Données enregistrées

Table `activity_logs` :
- `project_id`, `actor_id`, `entity_type`, `entity_id`
- `action` (task.created, task.updated, task.deleted, task.moved, task.comment_added, etc.)
- `meta` : données contextuelles JSON
- `old_values`, `new_values`, `changed_fields`
- `severity` (info/warning/critical)
- `ip_address` (visible admin seulement)
- `actor_role`

### 23.5 Actions suivies

- Création/modification/suppression de tâches
- Mouvements Kanban
- Commentaires ajoutés/supprimés
- Gestion des membres (ajout/retrait)
- Pause/reprise projet
- Changements de permissions
- Invitations envoyées

---

## 24. Flux Fonctionnels

### 24.1 Création d'un projet

```mermaid
flowchart TD
    A[Collaborateur/Admin\nclique 'Nouveau Projet'] --> B[POST /projects]
    B --> C[Validation: name, code unique, dates]
    C --> D[Création Project\nowner_id = user.id]
    D --> E[Création 4 statuts par défaut]
    E --> F[Ajout membres si fournis]
    F --> G[ActivityLog 'project.created']
    G --> H[Redirect /projects/id]
```

### 24.2 Invitation utilisateur

```mermaid
flowchart TD
    A[Chef/Admin\nclique 'Inviter'] --> B[POST /projects/id/invite\n{email, role: member|client}]
    B --> C{User existant?}
    C -- Non --> D[Créer invitation pending]
    C -- Oui --> E{Déjà membre?}
    E -- Oui --> F[422: Déjà membre]
    E -- Non --> D
    D --> G[Token UUID + expires_at +48h]
    G --> H[Envoi email avec lien]
    H --> I{User reçoit email}
    I --> J[GET /invitations/verify?token=x]
    J --> K{Token valide?}
    K -- Non/Expiré --> L[Page erreur 410]
    K -- Oui --> M[Affiche détails invitation]
    M --> N[POST /invitations/token/accept]
    N --> O[Ajout user aux pivots projet]
    O --> P[Notification inviteur]
    P --> Q[Redirect /projects/id]
```

### 24.3 Cycle de vie d'une tâche

```mermaid
flowchart LR
    N[Nouvelle tâche\nworkflow: todo] --> C{Assignation?}
    C -- Oui --> A[Notification\ntask_assigned]
    A --> W[work]
    C -- Non --> W
    W --> I[Mouvement Kanban\nin_progress]
    I --> R{Retard?}
    R -- Oui --> RR[at_risk\nNotification delayed]
    R -- Non --> D[done\nworkflow: done\nprogress: 100%]
    RR --> D
    D --> FB[POST /ml/feedback\non_time, hours_ok]
    FB --> ML[Amélioration modèle ML]
```

### 24.4 Prédiction ML — Pipeline complet

```mermaid
flowchart TD
    U[Utilisateur\nÉtape 4 TaskForm] --> R[GET /projects/id/auto-assign\n{priority, complexity, specialties}]
    R --> L[PythonMLClient\nPOST http://127.0.0.1:8001/recommend]
    L --> P{Service\ndisponible?}
    P -- Non --> FB[Fallback: unavailableResponse]
    P -- Oui --> FE[Feature extraction\n22 features par membre]
    FE --> M[GBM+RF ensemble\nScore par candidat]
    M --> S[Tri desc par score]
    S --> RES[Top N candidats\navec scores colorés]
    RES --> UI[MLRecommendationModal\nvert/ambre/rouge]
    UI --> SEL[Sélection assigné]
    SEL --> DONE[Tâche créée avec assigné]
    DONE --> OUT[POST /ml/feedback\naprès complétion]
```

### 24.5 Pause de projet

```mermaid
flowchart TD
    A[Admin/Chef\nclique 'Pause'] --> B[Modal: saisir raison]
    B --> C[POST /projects/id/pause\n{pause_reason}]
    C --> D[ProjectPolicy::pause\nVérifie admin/owner/chef]
    D --> E[status = on_hold\npaused_at, paused_by, pause_reason]
    E --> F[broadcast ProjectStatusChanged\n'paused']
    F --> G[Tous les clients\nWebSocket reçoivent l'événement]
    G --> H[Toast warning affiché\nprojet mis en pause]
    H --> I[Toutes les mutations\nbloquées HTTP 423]
    I --> J[Bannière pause\ndans l'interface]
```

---

## 25. Performance et Optimisations

### 25.1 Caching

| Resource | Cache | Durée |
|---|---|---|
| Dashboard admin | `admin_dashboard_global` | 45 secondes |
| Dashboard membre | `member_dashboard_{userId}` | Par requête |
| Gantt projet | React Query staleTime | 60 secondes |
| Notifications | React Query staleTime | 30 secondes |
| Rôle projet | Per-request (Array cache) | Durée requête |

### 25.2 Eager Loading

Toutes les relations nécessaires sont chargées avec `with()` pour éviter le N+1 :
- `TaskResource` : status, sprint, assignees, creator, specialties
- `ProjectResource` : team, chef, owner, statuses
- `TeamMemberResource` : specialties

### 25.3 Scopes Eloquent

`Task::scopeAccessibleBy($user)` évite de charger toutes les tâches puis de filtrer en PHP.
`Project::scopeAccessibleToUser($user)` idem pour les projets.

### 25.4 Pagination

Toutes les listes paginées côté API. Côté React, utilisation de `useInfiniteQuery` pour les notifications (scroll infini).

### 25.5 React Query

Configuration globale dans `App.jsx` :
- `staleTime` : 2 minutes (évite les refetch inutiles)
- `gcTime` : 10 minutes (conservation cache mémoire)
- `refetchInterval` : 60 000 ms pour les données temps réel

### 25.6 Code Splitting Vite

Chunks manuels configurés dans `vite.config.js` :
- `vendor-react` : React core
- `vendor-query` : TanStack Query
- `vendor-motion` : Framer Motion
- `vendor-ui` : Composants UI
- Pages chargées en lazy (React.lazy + Suspense)

---

## 26. Tests

### 26.1 Couverture actuelle

IntelliPM n'a pas de suite de tests automatisés formels. La validation est effectuée par :
- Tests manuels sur chaque parcours utilisateur
- Build Vite (détecte les erreurs de compilation)
- Vérification syntaxe PHP (`php -l`)
- Validation API via Postman/curl

### 26.2 Scénarios critiques validés manuellement

| Scénario | Validation |
|---|---|
| Login/Register avec les 3 rôles | ✅ |
| Création projet + Kanban + Gantt | ✅ |
| Invitation + Acceptation + Refus | ✅ |
| Pause/Reprise projet temps réel | ✅ |
| Recommandation ML (si service actif) | ✅ |
| Notifications par rôle | ✅ |
| Accès Observateur (lecture seule) | ✅ |
| Audit log (admin uniquement) | ✅ |
| Worklog + Progression automatique | ✅ |

### 26.3 Infrastructure test Laravel

- PHPUnit 11.5.3 installé (dev dependency)
- Faker 1.23 pour données de test
- `FreshDemoSeeder` + `TestDataSeeder` + `AdditionalProjectsSeeder` pour démo

---

## 27. Déploiement

### 27.1 Variables d'environnement Laravel

```env
# Application
APP_NAME="IntelliPM"
APP_ENV=production
APP_DEBUG=false
APP_KEY=base64:...              # php artisan key:generate
APP_URL=https://votre-domaine.com
FRONTEND_URL=https://votre-domaine.com

# Base de données
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=intellipm
DB_USERNAME=root
DB_PASSWORD=...

# Sessions et cache
SESSION_DRIVER=redis
SESSION_ENCRYPT=true
SESSION_LIFETIME=120
CACHE_STORE=redis

# Queue
QUEUE_CONNECTION=database

# Logs
LOG_CHANNEL=daily
LOG_LEVEL=error

# WebSocket (Reverb)
BROADCAST_CONNECTION=reverb
REVERB_APP_ID=intellipm-app
REVERB_APP_KEY=...
REVERB_APP_SECRET=...
REVERB_HOST=0.0.0.0
REVERB_PORT=8080
REVERB_SCHEME=https

# Machine Learning
ML_SERVICE_URL=http://127.0.0.1:8001
ML_SERVICE_TIMEOUT=3

# IA (OpenRouter)
OPENROUTER_API_KEY=...
OPENROUTER_MODEL=meta-llama/llama-3.3-70b-instruct:free

# Mail
MAIL_MAILER=smtp
MAIL_HOST=...
MAIL_PORT=587
MAIL_USERNAME=...
MAIL_PASSWORD=...
MAIL_FROM_ADDRESS=noreply@votre-domaine.com

# Sanctum
SANCTUM_STATEFUL_DOMAINS=votre-domaine.com
```

### 27.2 Variables d'environnement React

```env
VITE_API_BASE_URL=https://votre-domaine.com/api
VITE_BROADCAST_DRIVER=reverb
VITE_REVERB_APP_KEY=...
VITE_REVERB_HOST=votre-domaine.com
VITE_REVERB_PORT=8080
VITE_REVERB_SCHEME=https
```

### 27.3 Commandes de déploiement

```bash
# Backend Laravel
composer install --no-dev --optimize-autoloader
php artisan key:generate --force
php artisan migrate --force
php artisan db:seed --class=RoleAndPermissionSeeder --force
php artisan storage:link
php artisan optimize           # cache config + routes + views

# Processus background
php artisan queue:work --daemon &
php artisan reverb:start --port=8080 &

# Frontend React
cd react/
npm ci --production
npm run build                  # génère dist/

# Machine Learning
cd python/ml/
pip install -r requirements.txt
uvicorn app:app --host 127.0.0.1 --port 8001 &

# Entraînement modèle (si premier déploiement)
php artisan ml:seed-training-data
php artisan ml:train
```

### 27.4 Vérifications post-déploiement

```bash
# Santé FastAPI
curl http://127.0.0.1:8001/health

# Test API Laravel
curl https://votre-domaine.com/api/me -H "Authorization: Bearer {token}"

# Vérification storage
php artisan storage:link
ls -la public/storage

# Vérification modèle ML
ls python/ml/models/task_assignment.joblib
```

---

## 28. Maintenance

### 28.1 Logs Laravel

```bash
# Voir les logs
tail -f laravel/storage/logs/laravel-$(date +%Y-%m-%d).log

# Purger les vieux logs
php artisan log:clear
```

### 28.2 Queue et cache

```bash
# Redémarrer les workers queue
php artisan queue:restart

# Vider tous les caches
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear

# Recréer le cache optimisé
php artisan optimize
```

### 28.3 Machine Learning — Maintenance modèle

```bash
# Voir les métriques du modèle
GET /api/ml/model-info

# Reentraîner avec les nouvelles données (admin)
POST /api/ml/retrain

# En ligne de commande
php artisan ml:train
```

### 28.4 Base de données

```bash
# Sauvegarde
mysqldump intellipm > backup_$(date +%Y%m%d).sql

# Migrations nouvelles
php artisan migrate --force
```

### 28.5 Monitoring recommandé

| Service | Outil recommandé |
|---|---|
| Laravel | Laravel Telescope (dev) / Sentry (prod) |
| MySQL | Requêtes lentes (slow query log) |
| WebSocket | `php artisan reverb:start --verbose` |
| FastAPI | Logs uvicorn |
| Frontend | Sentry / LogRocket |

---

## 29. État Actuel du Projet

### 29.1 Fonctionnalités terminées ✅

| Module | Statut |
|---|---|
| Authentification (Login/Register/Logout/Reset) | ✅ Complet |
| Gestion des projets (CRUD + Pause/Reprise) | ✅ Complet |
| Gestion des équipes (CRUD + membres) | ✅ Complet |
| Gestion des tâches (CRUD + workflow) | ✅ Complet |
| Kanban (drag-drop + restrictions) | ✅ Complet |
| Gantt (visualisation + chemin critique + filtrage rôle) | ✅ Complet |
| Calendrier (mensuel/hebdomadaire — Admin/Collaborateur) | ✅ Complet |
| Invitations (email + token 48h) | ✅ Complet |
| Notifications (17 types + filtres rôle) | ✅ Complet |
| WebSocket temps réel (Reverb) | ✅ Complet |
| RBAC (Spatie + override projet) | ✅ Complet |
| Machine Learning (GBM+RF, 22 features) | ✅ Complet |
| IA (estimation, risque, rapport client) | ✅ Complet |
| Journal d'Audit (admin uniquement) | ✅ Complet |
| Dashboard par rôle (Admin/Collaborateur/Observateur) | ✅ Complet |
| Spécialités et auto-assignment | ✅ Complet |
| Chemin Critique CPM | ✅ Complet |
| Worklog et progression dynamique | ✅ Complet |
| Dépendances tâches (FS/SS/FF/SF) | ✅ Complet |
| Pièces jointes | ✅ Complet |
| Commentaires (threads) | ✅ Complet |
| Entrées de temps | ✅ Complet |
| Recherche globale | ✅ Complet |
| Export tâches CSV | ✅ Complet |
| Internationalisation (FR + EN) | ✅ Complet |

### 29.2 Limitations connues

| Limitation | Impact |
|---|---|
| Modèle ML nécessite ≥ 10 tâches terminées pour s'entraîner | Faible — données de démo disponibles via seeder |
| User model sans soft_delete | Suppression définitive d'un utilisateur |
| $changed[] non filtré dans notifyProjectUpdated | Risque faible de fuite champs internes |
| Pas de suite de tests automatisés | Maintenance à risque si refactoring majeur |
| Service FastAPI doit être démarré séparément | Dépendance externe supplémentaire |

### 29.3 Améliorations futures recommandées

| Amélioration | Priorité | Effort |
|---|---|---|
| Suite de tests PHPUnit + Vitest | Haute | 3-5 jours |
| Soft delete sur User | Moyenne | 2h |
| Sanitisation `$changed[]` dans notifications | Faible | 1h |
| Notification chef sur tâches orphelines (retrait membre) | Faible | 2h |
| Tooltip "L'owner ne peut pas reprendre" | Info | 30min |
| CI/CD pipeline (GitHub Actions) | Haute | 1 jour |

---

## 30. Conclusion

### 30.1 Niveau de maturité

IntelliPM est une application **complète et fonctionnelle**, couvrant l'ensemble du périmètre d'un outil de gestion de projets professionnel enrichi par l'intelligence artificielle.

**Points forts techniques** :
- Architecture full-stack moderne (Laravel 12 + React 19 + FastAPI)
- Sécurité multicouche (middleware → policy → scope)
- Machine Learning réel (pas de mock) avec feedback loop
- Temps réel via WebSocket (Reverb)
- RBAC flexible (système + personnalisé + override projet)
- Chemin critique CPM avec propagation des retards

### 30.2 Préparation soutenance PFE

**Statut : ✅ PRÊT**

| Critère | Statut |
|---|---|
| Build React (0 erreur) | ✅ 3 178 modules |
| Syntaxe PHP (0 erreur) | ✅ Validé |
| Permissions cohérentes | ✅ Backend + Frontend + BDD |
| Nomenclature rôles unifiée | ✅ Collaborateur/Observateur/Administrateur |
| ML pipeline réel | ✅ Confirmé |
| Journal d'Audit admin uniquement | ✅ Commit 83057d1 |
| Calendrier masqué pour Observateur | ✅ clientHidden + RoleRoute |
| Gantt filtrage rôle corrigé | ✅ GanttController.show() + GanttPage |
| Références IA externes supprimées | ✅ messages.js nettoyé |
| Aucune vulnérabilité critique | ✅ SECURITY_FINAL_AUDIT.md |

### 30.3 Préparation mise en production

**Statut : ✅ PRÊT sous conditions**

Conditions avant production :
1. Configurer `APP_DEBUG=false`, `APP_ENV=production`
2. Démarrer le service FastAPI ML
3. Configurer Reverb avec les bonnes credentials
4. Exécuter `php artisan migrate --force` + seeder
5. Entraîner le modèle ML avec `php artisan ml:train`
6. Vérifier `php artisan storage:link`
7. Configurer les variables d'environnement mail

---

---

## 31. Correctifs Finaux — Passe de Production

> Correctifs appliqués lors de la passe finale avant soutenance (2 juin 2026).

### 31.1 Suppression "Prochaine Échéance" de l'Interface

Le widget "Prochaines échéances" a été retiré de l'ensemble de l'interface :

| Fichier | Modification |
|---|---|
| `TaskCard.jsx` | Suppression affichage date + icône Calendar |
| `DashboardPage.jsx` | Suppression panel "Prochaines échéances" (grille 3→2 colonnes) |
| `ClientDashboard.jsx` | Suppression colonne "Échéance" du tableau + date retard |
| `ProjectDetailPage.jsx` | Suppression date dans cartes Kanban et vue liste |
| `messages.js` | Suppression clés `panelUpcomingDeadlines`, `noUpcomingDeadlines`, `viewCalendar`, `echéanceLabel` |

### 31.2 Calendrier — Accès Restreint aux Rôles Internes

| Fichier | Modification |
|---|---|
| `Sidebar.jsx` | `clientHidden: true` ajouté à l'item Calendrier |
| `App.jsx` | Route `/calendar` → `allow={['admin', 'member']}` uniquement |

### 31.3 Gantt — Filtrage par Rôle Corrigé

| Fichier | Modification |
|---|---|
| `GanttController.php` `show()` | Ajout vérification `projectRole !== 'admin'` (admin projet voit tout) |
| `GanttPage.jsx` | Vue "par projet" utilise `/projects/{id}/gantt` au lieu de `/gantt?project_id=X` |
| `ProjectDetailPage.jsx` | Données normalisées via `normalizeGanttTasks()` + invalidation cache WebSocket |

### 31.4 Nettoyage Références Externes

| Fichier | Modification |
|---|---|
| `messages.js` | Clés `chat`, `chatWelcome`, `chatPlaceholder`, `chatSend`, `chatSuggestions`, `chatSlowWarning` supprimées (orphelines) |
| `messages.js` | Clé `openAi` renommée `openAnalytics` |
| `DashboardPage.jsx` | Usage mis à jour `t('dashboard.openAnalytics')` |
| `messages.js` | Section `agile` (sprint) supprimée — non utilisée dans l'UI |

### 31.5 Sécurité — Confirmations Finales

- **Journal d'Audit** : exclusivement Administrateur (routes `check.role:admin`, sidebar `adminOnly`, onglet `isAdmin`) ✅
- **Kanban** : masqué pour Observateur, drag-drop bloqué côté backend ✅
- **Notifications** : liste blanche `clientAllowedTypes()` filtre 17 types → 7 autorisés ✅
- **APIs** : Sanctum + policy + AccessControl sur chaque endpoint critique ✅

---

> **Document maintenu par :** Fatma Rejeb — ISET, Promotion 2026  
> **Dernière mise à jour :** 2 juin 2026  
> **Passe finale :** Consolidation documentaire + standardisation dépôt  
> **Source de vérité :** Ce document est généré à partir du code source réel du projet IntelliPM.
