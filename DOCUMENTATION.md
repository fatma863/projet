# Documentation Complète — TAC-TIC Gestion de Projets

> Dernière mise à jour : mai 2026

## Table des Matières

1. [Vue d'ensemble du projet](#1-vue-densemble-du-projet)
2. [Stack technique](#2-stack-technique)
3. [Architecture globale](#3-architecture-globale)
4. [Structure du monorepo](#4-structure-du-monorepo)
5. [Backend Laravel — Modèles et relations](#5-backend-laravel--modèles-et-relations)
6. [Backend Laravel — Contrôleurs](#6-backend-laravel--contrôleurs)
7. [Backend Laravel — Services](#7-backend-laravel--services)
8. [Backend Laravel — Middleware, Policies et Support](#8-backend-laravel--middleware-policies-et-support)
9. [API Routes complètes](#9-api-routes-complètes)
10. [Authentification et autorisation](#10-authentification-et-autorisation)
11. [Frontend React — Structure et routing](#11-frontend-react--structure-et-routing)
12. [Frontend React — Pages](#12-frontend-react--pages)
13. [Frontend React — Composants](#13-frontend-react--composants)
14. [Frontend React — Couche API et utilitaires](#14-frontend-react--couche-api-et-utilitaires)
15. [Moteur IA et ML](#15-moteur-ia-et-ml)
16. [Système de notifications](#16-système-de-notifications)
17. [Gantt et chemin critique](#17-gantt-et-chemin-critique)
18. [Temps réel (WebSockets)](#18-temps-réel-websockets)
19. [Base de données — Schéma complet](#19-base-de-données--schéma-complet)
20. [Configuration et déploiement](#20-configuration-et-déploiement)
21. [Flux applicatifs clés](#21-flux-applicatifs-clés)
22. [Règles de validation des dates](#22-règles-de-validation-des-dates)
23. [Changelog — Modifications récentes](#23-changelog--modifications-récentes)

---

## 1. Vue d'ensemble du projet

**Gestion Projets PFE** est une application web complète de gestion de projets développée comme projet de fin d'études. Elle couvre l'ensemble du cycle de vie d'un projet logiciel : planification, sprint, suivi des tâches, collaboration d'équipe, et analyse prédictive par IA.

### Objectifs principaux

| Objectif | Description |
|----------|-------------|
| Gestion de projets | Création, suivi et clôture de projets avec rôles par projet |
| Gestion de tâches | Hiérarchie de tâches, Kanban, Gantt, sprint agile |
| Collaboration | Commentaires, mentions, pièces jointes, temps réel |
| IA prédictive | Recommandation d'assignation, risque de retard, estimation |
| Multi-rôles | Admin, Member (équipe), Client (lecture seule) |
| Internationalisation | Français (défaut) et Anglais |
| Notifications | In-app et email avec préférences utilisateur |

---

## 2. Stack technique

### Backend

| Technologie | Version | Rôle |
|-------------|---------|------|
| PHP | 8.2 | Runtime |
| Laravel | 12.x | Framework |
| MySQL | 8.x | Base de données principale |
| Laravel Sanctum | 4.3 | Authentification API (token Bearer) |
| Spatie Permission | 6.24 | Gestion des rôles et permissions |
| Laravel Reverb | 1.9 | Serveur WebSocket (temps réel) |
| Pusher PHP Server | 7.2 | Broadcasting production |

### Frontend

| Technologie | Version | Rôle |
|-------------|---------|------|
| React | 19.x | Framework UI |
| Vite | 7.x | Build tool |
| React Router DOM | 7.x | Routing SPA |
| TanStack Query | 5.x | Cache serveur et état async |
| Axios | 1.x | Client HTTP |
| React Hook Form | 7.x | Gestion des formulaires |
| Zod | 4.x | Validation des schémas |
| Tailwind CSS | 4.x | Styling utilitaire |
| Framer Motion | 12.x | Animations |
| Lucide React | 0.577 | Icônes |
| Laravel Echo + Pusher JS | 2.x / 8.x | WebSocket client |
| Sonner | 2.x | Toast notifications |
| date-fns | 4.x | Manipulation des dates |

### Service ML (Python)

| Technologie | Version | Rôle |
|-------------|---------|------|
| Python | 3.11 | Runtime |
| FastAPI | Latest | Serveur API REST |
| uvicorn | Latest | ASGI server |
| scikit-learn | Latest | Modèles ML (GBM, LR) |
| pandas / numpy | Latest | Data engineering |
| SQLAlchemy | Latest | Connexion MySQL |
| joblib | Latest | Sérialisation modèles |

---

## 3. Architecture globale

```
┌─────────────────────────────────────────────────────────────────┐
│                     Client (Navigateur)                         │
│                   React 19 + Vite (port 5173)                   │
└────────────────────────────┬────────────────────────────────────┘
                             │ REST API (JSON) + WebSocket
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Laravel 12 (port 8000)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  API Routes  │  │ Controllers  │  │      Services        │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                 │                      │              │
│  ┌──────▼─────────────────▼──────────────────────▼───────────┐  │
│  │         Eloquent ORM + MySQL (gestion_projets_pfe)        │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────┐    ┌─────────────────────────────────┐   │
│  │ Sanctum Auth     │    │ Laravel Reverb (port 8080)       │   │
│  │ Spatie Roles     │    │ WebSocket server (temps réel)    │   │
│  └──────────────────┘    └─────────────────────────────────┘   │
└────────────────────────────────┬────────────────────────────────┘
                                 │ HTTP (ML_SERVICE_URL)
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│               Python FastAPI ML Service (port 8001)             │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │   app.py    │  │recommender.py│  │     features.py       │  │
│  │ (FastAPI)   │  │ (GBM / LR)   │  │  (22 features)        │  │
│  └─────────────┘  └──────────────┘  └───────────────────────┘  │
│                          ▼                                      │
│                  Reads directly from MySQL                      │
└─────────────────────────────────────────────────────────────────┘
```

Le service ML accède directement à MySQL (lecture seule) pour construire ses vecteurs de features sans passer par l'API Laravel.

---

## 4. Structure du monorepo

```
projet/
├── laravel/                  # Backend Laravel 12
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/Api/    # 23 contrôleurs
│   │   │   ├── Middleware/         # 3 middlewares
│   │   │   └── Resources/         # API Resources
│   │   ├── Models/                 # 18 modèles Eloquent
│   │   ├── Policies/               # 2 policies
│   │   ├── Services/               # 13 services
│   │   └── Support/                # 3 helpers
│   ├── database/
│   │   ├── migrations/             # 42+ migrations
│   │   └── seeders/               # RoleAndPermissionSeeder
│   ├── routes/
│   │   ├── api.php                # ~120 routes API
│   │   └── channels.php           # WebSocket channels
│   └── config/                    # cors, sanctum, auth, etc.
│
├── react/                    # Frontend React 19
│   ├── src/
│   │   ├── App.jsx            # Router principal
│   │   ├── main.jsx           # Entry point
│   │   ├── components/        # 30+ composants réutilisables
│   │   ├── pages/             # 24 pages
│   │   ├── contexts/          # AuthContext, I18nContext
│   │   ├── lib/               # Axios, Echo, utilitaires
│   │   │   └── services/      # Modules API (par feature)
│   │   ├── routes/            # Guards de routes
│   │   └── i18n/              # messages.js (FR/EN)
│   ├── public/
│   └── package.json
│
├── python/
│   └── ml/                   # Service ML Python
│       ├── app.py             # FastAPI server
│       ├── recommender.py     # Moteur GBM/LR
│       ├── features.py        # 22 features
│       ├── database.py        # SQLAlchemy pool
│       ├── ml_config.py       # Constantes
│       ├── train.py           # Script d'entraînement
│       ├── models/            # .joblib sauvegardés
│       └── requirements.txt
│
├── DOCUMENTATION.md          # Ce fichier
└── .env (racine)             # Variables communes (optionnel)
```

---

## 5. Backend Laravel — Modèles et relations

### 5.1 Schéma des relations

```
User ──────────────────────────────────────────────────────────────
  │  hasMany ──► TaskAssignment ◄── belongsTo ── Task
  │  hasMany ──► TimeEntry      ◄── belongsTo ── Task
  │  hasMany ──► TaskComment    ◄── belongsTo ── Task
  │  belongsToMany ──► Team         (pivot: team_user)
  │  belongsToMany ──► Project      (pivot: project_user / project_members)
  │  belongsToMany ──► Specialty    (pivot: user_specialty)
  │  hasMany ──► Notification
  └─ hasOne ──► (Spatie Roles)

Project ──────────────────────────────────────────────────────────
  │  belongsTo ──► Team
  │  belongsTo ──► Client
  │  belongsToMany ──► User (pivot: project_members, role: chef/member/client)
  │  hasMany ──► Task (rootTasks = parent_id IS NULL)
  │  hasMany ──► Sprint
  │  hasMany ──► TaskStatus
  │  hasMany ──► ActivityLog (morphable)
  └─ hasMany ──► ProjectInvitation

Task ─────────────────────────────────────────────────────────────
  │  belongsTo ──► Project
  │  belongsTo ──► Sprint
  │  belongsTo ──► Task (parent)
  │  hasMany ──► Task (subtasks)
  │  belongsTo ──► TaskStatus
  │  belongsToMany ──► User     (pivot: task_assignments)
  │  belongsToMany ──► Task     (pivot: task_dependencies, type FS/SS/FF/SF)
  │  hasMany ──► TaskComment
  │  hasMany ──► Attachment
  │  hasMany ──► TimeEntry
  └─ belongsToMany ──► Specialty (pivot: task_specialty)

Team ─────────────────────────────────────────────────────────────
  │  belongsTo ──► User (leader)
  │  belongsToMany ──► User (pivot: team_user, role_in_team, capacity_hours_per_week)
  └─ hasMany ──► Project
```

### 5.2 Détail de chaque modèle

#### User (`app/Models/User.php`)

```
Fillable: name, email, password, status, avatar, profile_photo,
          timezone, notify_in_app, notify_email, theme, locale,
          notify_type_task_assigned, notify_type_comment, notify_type_task_delayed

Traits: HasFactory, Notifiable, HasRoles (Spatie), SoftDeletes

Relations:
  teams()           → BelongsToMany(Team) via team_user
  projects()        → BelongsToMany(Project) via project_members (pivot: project_role)
  accessibleProjects() → scope: projects where user is member OR owner
  ownedProjects()   → HasMany(Project) where owner_id = user.id
  taskAssignments() → HasMany(TaskAssignment)
  assignedTasks()   → BelongsToMany(Task) via task_assignments
  timeEntries()     → HasMany(TimeEntry)
  comments()        → HasMany(TaskComment)
  specialties()     → BelongsToMany(Specialty) via user_specialty
  notifications()   → HasMany(Notification)
```

#### Project (`app/Models/Project.php`)

```
Fillable: team_id, client_id, project_manager_id, chef_id, name, code,
          description, status, priority, start_date, end_date, owner_id, created_by

Status enum: planning | active | on_hold | completed | cancelled
Priority enum: low | medium | high | critical

Traits: SoftDeletes

Relations:
  team()        → BelongsTo(Team)
  client()      → BelongsTo(Client)
  owner()       → BelongsTo(User, 'owner_id')
  creator()     → BelongsTo(User, 'created_by')
  manager()     → BelongsTo(User, 'project_manager_id')
  chef()        → BelongsTo(User, 'chef_id')
  members()     → BelongsToMany(User) via project_members (pivot: project_role)
  statuses()    → HasMany(TaskStatus)
  tasks()       → HasMany(Task)
  sprints()     → HasMany(Sprint)
  rootTasks()   → HasMany(Task) where parent_id IS NULL
  activityLogs()→ MorphMany(ActivityLog)
  invitations() → HasMany(ProjectInvitation)
```

#### Task (`app/Models/Task.php`)

```
Fillable: project_id, sprint_id, parent_id, title, description, issue_type,
          status_id, priority, complexity, story_points, planned_start, planned_end,
          due_date, estimated_hours, estimated_duration, duration_days, risk_level,
          risk_score, actual_hours, progress_percent, kanban_order, workflow_status,
          created_by, updated_by, archived_at

Issue types: story | bug | task | epic | subtask
Priority: low | medium | high | urgent
Workflow statuses: todo | in_progress | done | at_risk
Risk levels: none | low | medium | high | critical

Traits: SoftDeletes

Relations:
  project()      → BelongsTo(Project)
  sprint()       → BelongsTo(Sprint)
  parent()       → BelongsTo(Task, 'parent_id')
  subtasks()     → HasMany(Task, 'parent_id')
  status()       → BelongsTo(TaskStatus)
  creator()      → BelongsTo(User, 'created_by')
  updater()      → BelongsTo(User, 'updated_by')
  assignees()    → BelongsToMany(User) via task_assignments (pivot: allocation_percent)
  assignments()  → HasMany(TaskAssignment)
  dependencies() → BelongsToMany(Task) via task_dependencies (as depends_on)
  dependents()   → BelongsToMany(Task) via task_dependencies (inverse)
  comments()     → HasMany(TaskComment)
  attachments()  → HasMany(Attachment)
  timeEntries()  → HasMany(TimeEntry)
  specialties()  → BelongsToMany(Specialty) via task_specialty
```

#### Team (`app/Models/Team.php`)

```
Fillable: name, description, team_leader_id

Relations:
  leader()       → BelongsTo(User, 'team_leader_id')
  members()      → BelongsToMany(User) via team_user
                   (pivot: role_in_team, capacity_hours_per_week, skills JSON, is_active)
  activeMembers()→ scope: members where is_active = true
  projects()     → HasMany(Project)
```

#### Sprint (`app/Models/Sprint.php`)

```
Fillable: project_id, name, goal, start_date, end_date, status, started_at, ended_at

Status enum: planned | active | completed

Relations:
  project() → BelongsTo(Project)
  tasks()   → HasMany(Task)
```

#### TaskStatus (`app/Models/TaskStatus.php`)

```
Fillable: project_id, name, color, order, is_default

Relations:
  project() → BelongsTo(Project)
  tasks()   → HasMany(Task)
```

#### Specialty (`app/Models/Specialty.php`)

```
Fillable: name, description, color

Relations:
  users() → BelongsToMany(User) via user_specialty
  tasks() → BelongsToMany(Task) via task_specialty
```

#### TaskComment (`app/Models/TaskComment.php`)

```
Fillable: task_id, user_id, parent_id, body, edited_at

Relations:
  task()    → BelongsTo(Task)
  user()    → BelongsTo(User)
  parent()  → BelongsTo(TaskComment, 'parent_id')
  replies() → HasMany(TaskComment, 'parent_id')
```

#### TaskAssignment (`app/Models/TaskAssignment.php`)

```
Fillable: task_id, user_id, allocation_percent, assigned_at

Unique: (task_id, user_id)

Relations:
  task() → BelongsTo(Task)
  user() → BelongsTo(User)
```

#### TaskDependency (`app/Models/TaskDependency.php`)

```
Fillable: task_id, depends_on_task_id, type

Type enum: FS (Finish-Start) | SS (Start-Start) | FF (Finish-Finish) | SF (Start-Finish)
```

#### Attachment (`app/Models/Attachment.php`)

```
Fillable: task_id, user_id, type, path_or_url, filename, mime, size

Type enum: file | link
```

#### TimeEntry (`app/Models/TimeEntry.php`)

```
Fillable: task_id, user_id, date, minutes, note, source

Source enum: manual | timer
```

#### Notification (`app/Models/Notification.php`)

```
Fillable: user_id, related_task_id, message, type, severity, data (JSON), read_at

Relations:
  user()        → BelongsTo(User)
  relatedTask() → BelongsTo(Task, 'related_task_id')
```

#### ActivityLog (`app/Models/ActivityLog.php`)

```
Fillable: project_id, actor_id, entity_type, entity_id, action, meta (JSON)

Relations:
  project() → BelongsTo(Project)
  actor()   → BelongsTo(User)
  entity()  → MorphTo (entity_type / entity_id)
```

#### AiRecommendation (`app/Models/AiRecommendation.php`)

```
Fillable: task_id, project_id, type, input_data (JSON), result_data (JSON), confidence

Type enum: estimation | delay_risk | assignment
```

#### ProjectInvitation (`app/Models/ProjectInvitation.php`)

```
Fillable: project_id, email, role, invited_by, token, status, expires_at, accepted_at, declined_at

Status enum: pending | accepted | declined | expired
```

#### Client (`app/Models/Client.php`)

```
Fillable: name, company, email

Relations:
  projects() → HasMany(Project)
```

---

## 6. Backend Laravel — Contrôleurs

Tous les contrôleurs se trouvent dans `app/Http/Controllers/Api/`.

### AuthController

| Méthode | Route | Description |
|---------|-------|-------------|
| `register()` | `POST /auth/register` | Créer un compte + assigner rôle `member` |
| `login()` | `POST /auth/login` | Connexion → token Sanctum |
| `logout()` | `POST /auth/logout` | Révoquer le token courant |
| `me()` | `GET /me` | Profil utilisateur connecté |
| `preferences()` | `GET /me/preferences` | Préférences UI |
| `updateMe()` | `PUT /me` | Mise à jour profil |
| `updateAvatar()` | `POST /me/avatar` | Upload avatar |
| `updatePreferences()` | `PATCH /me/preferences` | Mise à jour préférences |
| `changePassword()` | `POST /change-password` | Changement de mot de passe |
| `logoutAllDevices()` | `POST /logout-all-devices` | Révoquer tous les tokens |
| `forgotPassword()` | `POST /auth/forgot-password` | Envoyer email reset |
| `resetPassword()` | `POST /auth/reset-password` | Réinitialiser mot de passe |

### ProjectController

| Méthode | Route | Description |
|---------|-------|-------------|
| `index()` | `GET /projects` | Projets accessibles à l'utilisateur |
| `store()` | `POST /projects` | Créer un projet |
| `show()` | `GET /projects/{id}` | Détail d'un projet |
| `update()` | `PUT /projects/{id}` | Modifier un projet |
| `destroy()` | `DELETE /projects/{id}` | Supprimer (soft delete) |
| `dashboard()` | `GET /projects/{id}/dashboard` | Métriques du projet |
| `activity()` | `GET /projects/{id}/activity` | Journal d'activité |
| `members()` | `GET /projects/{id}/members` | Liste des membres |
| `addMember()` | `POST /projects/{id}/members` | Ajouter un membre |
| `removeMember()` | `DELETE /projects/{id}/members/{user}` | Retirer un membre |
| `changeChef()` | `PUT /projects/{id}/change-chef` | Changer le chef de projet |
| `searchUsers()` | `GET /projects/{id}/user-search` | Chercher des utilisateurs |
| `invite()` | `POST /projects/{id}/invite` | Envoyer des invitations par email |
| `exportTasks()` | `GET /projects/{id}/export/tasks` | Exporter les tâches (CSV/JSON) |

### TaskController

| Méthode | Route | Description |
|---------|-------|-------------|
| `globalIndex()` | `GET /tasks` | Toutes les tâches de l'utilisateur |
| `index()` | `GET /projects/{id}/tasks` | Tâches d'un projet |
| `store()` | `POST /projects/{id}/tasks` | Créer une tâche |
| `show()` | `GET /tasks/{id}` | Détail d'une tâche |
| `update()` | `PUT /tasks/{id}` | Modifier une tâche |
| `destroy()` | `DELETE /tasks/{id}` | Supprimer une tâche |
| `move()` | `PATCH /tasks/{id}/move` | Déplacer/réordonner |
| `assign()` | `POST /tasks/{id}/assign` | Assigner un utilisateur |
| `unassign()` | `DELETE /tasks/{id}/unassign/{user}` | Désassigner |
| `addDependency()` | `POST /tasks/{id}/dependencies` | Ajouter une dépendance |
| `removeDependency()` | `DELETE /tasks/{id}/dependencies/{dep}` | Supprimer dépendance |
| `addComment()` | `POST /tasks/{id}/comments` | Ajouter un commentaire |
| `updateComment()` | `PUT /tasks/{id}/comments/{comment}` | Modifier commentaire |
| `deleteComment()` | `DELETE /tasks/{id}/comments/{comment}` | Supprimer commentaire |
| `addAttachment()` | `POST /tasks/{id}/attachments` | Joindre fichier/lien |
| `deleteAttachment()` | `DELETE /tasks/{id}/attachments/{att}` | Supprimer pièce jointe |
| `downloadAttachment()` | `GET /tasks/{id}/attachments/{att}/download` | Télécharger |
| `addTimeEntry()` | `POST /tasks/{id}/time-entries` | Saisir du temps |
| `deleteTimeEntry()` | `DELETE /tasks/{id}/time-entries/{entry}` | Supprimer saisie |

### TeamController

| Méthode | Route | Description |
|---------|-------|-------------|
| `index()` | `GET /teams` | Liste des équipes |
| `store()` | `POST /teams` | Créer une équipe |
| `show()` | `GET /teams/{id}` | Détail équipe |
| `update()` | `PUT /teams/{id}` | Modifier équipe |
| `destroy()` | `DELETE /teams/{id}` | Supprimer équipe |
| `addMember()` | `POST /teams/{id}/members` | Ajouter un membre |
| `updateMember()` | `PATCH /teams/{id}/members/{user}` | Modifier membre |
| `updateMemberProjectRole()` | `PATCH /teams/{id}/members/{user}/project-role` | Modifier rôle |
| `updateMemberSpecialties()` | `PATCH /teams/{id}/members/{user}/specialties` | Modifier spécialités |
| `removeMember()` | `DELETE /teams/{id}/members/{user}` | Retirer membre |

### SprintController

| Méthode | Route | Description |
|---------|-------|-------------|
| `index()` | `GET /projects/{id}/sprints` | Liste sprints |
| `store()` | `POST /projects/{id}/sprints` | Créer sprint |
| `update()` | `PUT /projects/{id}/sprints/{sprint}` | Modifier sprint |
| `destroy()` | `DELETE /projects/{id}/sprints/{sprint}` | Supprimer sprint |
| `start()` | `POST /projects/{id}/sprints/{sprint}/start` | Démarrer sprint |
| `end()` | `POST /projects/{id}/sprints/{sprint}/end` | Terminer sprint |
| `complete()` | `POST /projects/{id}/sprints/{sprint}/complete` | Compléter sprint |
| `assignTask()` | `POST /projects/{id}/sprints/{sprint}/tasks/{task}` | Assigner tâche |
| `backlog()` | `GET /projects/{id}/backlog` | Backlog du projet |
| `reorderBacklog()` | `PATCH /projects/{id}/backlog/reorder` | Réordonner backlog |

### AiController

| Méthode | Route | Description |
|---------|-------|-------------|
| `estimateTask()` | `GET /ai/estimate/{task}` | Estimer durée d'une tâche |
| `delayRiskTask()` | `GET /ai/delay-risk/task/{task}` | Risque de retard tâche |
| `delayRiskProject()` | `GET /ai/delay-risk/project/{project}` | Risque de retard projet |
| `suggestAssignment()` | `GET /ai/suggest-assignment/{task}` | Suggérer un assigné |
| `optimizeProjectAssignments()` | `GET /ai/optimize-assignments/{project}` | Optimiser assignations |
| `projectRecommendations()` | `GET /ai/recommendations/project/{project}` | Recommandations |
| `workloadBalance()` | `GET /ai/workload-balance/{project}` | Équilibrage charge |
| `chat()` | `POST /ai/chat` | Chat IA (OpenRouter) |

### MLController

| Méthode | Route | Description |
|---------|-------|-------------|
| `recommendForNewTask()` | `POST /ml/recommend` | Recommander pour nouvelle tâche |
| `recommend()` | `GET /ml/recommend/{task}` | Recommander pour tâche existante |
| `modelInfo()` | `GET /ml/model-info` | Métadonnées du modèle |
| `recordOutcome()` | `POST /ml/feedback/{task}` | Enregistrer résultat |
| `retrain()` | `POST /ml/retrain` | Relancer l'entraînement (admin) |

### Autres contrôleurs

| Contrôleur | Responsabilité |
|------------|----------------|
| `UserController` | `index()`, `destroy()`, `forceDestroy()` — admin seulement |
| `ClientController` | CRUD clients (`index`, `store`, `update`, `destroy`) |
| `SpecialtyController` | CRUD spécialités + `matchingMembers()` + `autoAssign()` + `membersPerformance()` |
| `TaskStatusController` | CRUD statuts personnalisés + `reorder()` |
| `GanttController` | `globalIndex()`, `show()`, `updateDates()` |
| `CriticalPathController` | `index()` — calcul chemin critique |
| `CalendarController` | `index()` — vue calendrier |
| `MemberDashboardController` | `index()` + `summary()` |
| `AdminDashboardController` | `index()` — métriques globales |
| `ClientDashboardController` | `projectReport()` — rapport lecture seule |
| `NotificationController` | `index()`, `markAsRead()`, `markAllAsRead()`, `summary()` |
| `NotificationPreferencesController` | `show()`, `update()` |
| `GlobalSearchController` | Recherche multi-entités |
| `InvitationController` | `verify()`, `pending()`, `accept()`, `decline()` |
| `InviteController` | `show()`, `store()`, `accept()`, `decline()` |
| `ActivityFeedController` | `index()` — flux d'activité |

---

## 7. Backend Laravel — Services

Tous les services se trouvent dans `app/Services/`.

| Service | Responsabilité principale |
|---------|--------------------------|
| `ActivityLogService` | Enregistrer les événements projet dans `activity_logs` |
| `ActivityService` | Tracker les actions utilisateur dans `activities` |
| `AdminDashboardService` | Calculer les métriques globales (projets actifs, tâches en retard, etc.) |
| `CriticalPathService` | Algorithme CPM sur les dépendances de tâches (chemin le plus long) |
| `MemberDashboardMetricsQuery` | Requêtes SQL agrégées pour le tableau de bord membre |
| `MemberDashboardService` | Orchestrer les métriques du membre connecté |
| `MentionService` | Détecter `@username` dans les commentaires et créer des notifications |
| `TaskDependencyService` | Gérer les dépendances (éviter les cycles) + calcul Gantt |
| `ProjectInviteService` | Générer tokens, envoyer emails, valider invitations |
| `SprintService` | Logique métier sprints (start/end/complete, déplacement tâches) |
| `AIService` | Appels OpenRouter (LLM) pour estimation, risque, chat |
| `NotificationService` | Créer, persister, diffuser les notifications |
| `UserManagementService` | Désactivation, suppression, transfert des tâches d'un utilisateur |

---

## 8. Backend Laravel — Middleware, Policies et Support

### Middlewares (`app/Http/Middleware/`)

| Middleware | Alias | Comportement |
|------------|-------|-------------|
| `CheckProjectAccess` | `check.project` | Vérifie que l'utilisateur est membre du projet avec le niveau d'accès requis (`view` ou `edit`). Rôle `chef` → edit+view, `member` → edit+view, `client` → view uniquement |
| `CheckRole` | `check.role` | Vérifie que l'utilisateur possède l'un des rôles Spatie spécifiés (`admin`, `member`, `client`) |
| `EnsureUserIsActive` | `active.user` | Rejette les requêtes si `user.status == 'disabled'` avec 403 |

### Policies (`app/Policies/`)

| Policy | Méthodes | Logique |
|--------|----------|---------|
| `ProjectPolicy` | `update()`, `delete()`, `addMember()`, etc. | Admin peut tout, chef de projet peut tout sur son projet, membre selon son rôle projet |
| `TaskPolicy` | `update()`, `delete()`, `assign()` | Admin peut tout, chef/member du projet peuvent modifier, client peut lire seulement |

### Support (`app/Support/`)

| Classe | Rôle |
|--------|------|
| `AccessControl` | Helpers statiques pour vérifier les droits d'accès (isAdmin, isProjectChef, canEditProject…) |
| `ApiPagination` | Normaliser la pagination JSON (`meta.total`, `meta.per_page`, `links`) |
| `SqlDateExpressions` | Constructeurs d'expressions SQL de dates pour filtres MySQL |

---

## 9. API Routes complètes

Toutes les routes se trouvent dans `laravel/routes/api.php`. Préfixe : `/api`.

### Routes publiques (sans authentification)

```
GET    /                           → Info API
POST   /auth/register              → Inscription
POST   /auth/login                 → Connexion
POST   /auth/forgot-password       → Demande reset mot de passe
POST   /auth/reset-password        → Réinitialisation mot de passe
GET    /invitations/verify         → Vérifier token d'invitation
GET    /invites/{token}            → Afficher une invitation
```

### Routes protégées (auth:sanctum + active.user)

#### Utilisateur connecté

```
POST   /auth/logout                → Déconnexion
POST   /logout-all-devices         → Déconnexion tous appareils
GET    /me                         → Profil
PUT    /me                         → Modifier profil
POST   /me/avatar                  → Changer avatar
GET    /me/preferences             → Préférences
PATCH  /me/preferences             → Modifier préférences
POST   /change-password            → Changer mot de passe
GET    /me/specialties             → Mes spécialités
PUT    /me/specialties             → Modifier mes spécialités
```

#### Projets

```
GET    /projects                           → Liste (accessibles)
POST   /projects                           → Créer [admin,member]
GET    /projects/{id}                      → Détail
PUT    /projects/{id}                      → Modifier [policy:update]
DELETE /projects/{id}                      → Supprimer
GET    /projects/{id}/dashboard            → Tableau de bord [view]
GET    /projects/{id}/activity             → Activité [view]
GET    /projects/{id}/members              → Membres [view]
POST   /projects/{id}/members              → Ajouter membre [edit]
DELETE /projects/{id}/members/{user}       → Retirer membre [edit]
PUT    /projects/{id}/change-chef          → Changer chef [edit]
GET    /projects/{id}/user-search          → Chercher utilisateurs [edit]
POST   /projects/{id}/invite               → Inviter par email [view]
GET    /projects/{id}/export/tasks         → Exporter tâches [view]
GET    /projects/{id}/critical-path        → Chemin critique [view]
GET    /projects/{id}/auto-assign          → Candidats auto-assign [view]
GET    /projects/{id}/members-performance  → Performance membres [view]
```

#### Tâches

```
GET    /tasks                              → Toutes mes tâches
GET    /projects/{id}/tasks               → Tâches du projet [view]
POST   /projects/{id}/tasks               → Créer tâche [edit]
GET    /tasks/{id}                        → Détail tâche
PUT    /tasks/{id}                        → Modifier [policy:update]
DELETE /tasks/{id}                        → Supprimer [policy:delete]
PATCH  /tasks/{id}/move                   → Déplacer [policy:update]
GET    /tasks/{id}/assignees              → Assignés
POST   /tasks/{id}/assign                 → Assigner [policy:update]
DELETE /tasks/{id}/unassign/{user}        → Désassigner [policy:update]
GET    /tasks/{id}/dependencies           → Dépendances
POST   /tasks/{id}/dependencies           → Ajouter dépendance
DELETE /tasks/{id}/dependencies/{dep}     → Supprimer dépendance
GET    /tasks/{id}/comments               → Commentaires
POST   /tasks/{id}/comments               → Ajouter commentaire
PUT    /tasks/{id}/comments/{comment}     → Modifier commentaire
DELETE /tasks/{id}/comments/{comment}     → Supprimer commentaire
GET    /tasks/{id}/attachments            → Pièces jointes
POST   /tasks/{id}/attachments            → Joindre
GET    /tasks/{id}/attachments/{att}/download → Télécharger
DELETE /tasks/{id}/attachments/{att}      → Supprimer pièce jointe
GET    /tasks/{id}/time-entries           → Saisies de temps
POST   /tasks/{id}/time-entries           → Ajouter saisie
DELETE /tasks/{id}/time-entries/{entry}   → Supprimer saisie
GET    /tasks/{id}/matching-members       → Membres correspondants
```

#### Statuts de tâches

```
GET    /projects/{id}/statuses            → Liste statuts [view]
POST   /projects/{id}/statuses            → Créer statut [edit]
POST   /projects/{id}/statuses/reorder    → Réordonner [edit]
PUT    /statuses/{id}                     → Modifier statut
DELETE /statuses/{id}                     → Supprimer statut
```

#### Sprints

```
GET    /projects/{id}/sprints             → Liste sprints [view]
POST   /projects/{id}/sprints             → Créer sprint [edit]
PUT    /projects/{id}/sprints/{sprint}    → Modifier sprint [edit]
DELETE /projects/{id}/sprints/{sprint}    → Supprimer sprint [edit]
POST   /projects/{id}/sprints/{sprint}/start    → Démarrer [edit]
POST   /projects/{id}/sprints/{sprint}/end      → Terminer [edit]
POST   /projects/{id}/sprints/{sprint}/complete → Compléter [edit]
POST   /projects/{id}/sprints/{sprint}/tasks/{task} → Assigner tâche [edit]
GET    /projects/{id}/backlog             → Backlog [view]
PATCH  /projects/{id}/backlog/reorder     → Réordonner [edit]
```

#### Équipes (majoritairement admin)

```
GET    /teams                          → Liste
POST   /teams                          → Créer
GET    /teams/{id}                     → Détail
PUT    /teams/{id}                     → Modifier
DELETE /teams/{id}                     → Supprimer
POST   /teams/{id}/members             → Ajouter membre
PATCH  /teams/{id}/members/{user}      → Modifier membre
PATCH  /teams/{id}/members/{user}/project-role     → Modifier rôle projet
PATCH  /teams/{id}/members/{user}/specialties      → Modifier spécialités
DELETE /teams/{id}/members/{user}      → Retirer membre
```

#### Utilisateurs (admin)

```
GET    /users                          → Liste [admin]
DELETE /users/{id}                     → Désactiver [admin]
DELETE /users/{id}/permanent           → Supprimer définitivement [admin]
```

#### Clients

```
GET    /clients                        → Liste [admin,member]
POST   /clients                        → Créer [admin,member]
GET    /clients/{id}                   → Détail [admin,member]
PUT    /clients/{id}                   → Modifier [admin,member]
DELETE /clients/{id}                   → Supprimer [admin,member]
```

#### Spécialités

```
GET    /specialties                    → Liste
POST   /specialties                    → Créer [admin]
PUT    /specialties/{id}              → Modifier [admin]
DELETE /specialties/{id}              → Supprimer [admin]
```

#### ML & IA

```
POST   /ml/recommend                   → Recommander assigné (nouvelle tâche) [admin,member]
GET    /ml/recommend/{task}            → Recommander assigné (tâche existante) [admin,member]
GET    /ml/model-info                  → Infos modèle [admin,member]
POST   /ml/feedback/{task}            → Enregistrer résultat [admin,member]
POST   /ml/retrain                     → Relancer entraînement [admin]
GET    /ai/estimate/{task}             → Estimer tâche [admin,member]
GET    /ai/delay-risk/task/{task}      → Risque retard tâche [admin,member]
GET    /ai/delay-risk/project/{project}→ Risque retard projet [admin,member]
GET    /ai/suggest-assignment/{task}   → Suggérer assigné [admin,member]
GET    /ai/optimize-assignments/{project} → Optimiser assignations [admin,member]
GET    /ai/recommendations/project/{project} → Recommandations [admin,member]
GET    /ai/workload-balance/{project}  → Équilibrage charge [admin,member]
POST   /ai/chat                        → Chat IA [admin,member]
```

#### Notifications

```
GET    /notifications                  → Liste
GET    /notifications/summary          → Compteurs non-lus
POST   /notifications/read             → Marquer lus (liste d'IDs)
PATCH  /notifications/{id}/read        → Marquer lu
POST   /notifications/read-all         → Tout marquer lu
GET    /notifications/preferences      → Préférences
PUT    /notifications/preferences      → Modifier préférences
```

#### Dashboards et vues spécialisées

```
GET    /gantt                          → Gantt global [admin,member]
GET    /projects/{id}/gantt            → Gantt projet [view]
PUT    /projects/{id}/gantt            → Mettre à jour dates Gantt [edit]
GET    /calendar                       → Calendrier [admin,member]
GET    /search                         → Recherche globale
GET    /activity/feed                  → Fil d'activité [admin,member]
GET    /member/dashboard               → Dashboard membre
GET    /member/dashboard/summary       → Résumé dashboard membre
GET    /admin/dashboard                → Dashboard admin [admin]
GET    /client/projects/{id}/report    → Rapport client [view]
GET    /client/projects/{id}/ai/risk   → Risque IA client [view]
GET    /client/projects/{id}/ai/recommendations → Recommandations IA client [view]
```

#### Invitations

```
GET    /invitations/pending            → Invitations en attente
POST   /invitations/{token}/accept     → Accepter invitation
POST   /invitations/{token}/decline    → Décliner invitation
POST   /invites                        → Créer invitation
POST   /invites/accept                 → Accepter (email direct)
POST   /invites/decline                → Décliner (email direct)
```

---

## 10. Authentification et autorisation

### 10.1 Flux d'authentification

```
1. INSCRIPTION
   Client → POST /auth/register { name, email, password }
   → Créer User
   → Assigner rôle Spatie "member"
   → Créer token Sanctum
   → Retourner { token, user }

2. CONNEXION
   Client → POST /auth/login { email, password }
   → Vérifier credentials
   → Vérifier status != 'disabled'
   → Créer token Sanctum (expiration 7 jours)
   → Stocker dans localStorage { token, user }
   → Retourner { token, user }

3. REQUÊTES AUTHENTIFIÉES
   Client → Authorization: Bearer {token}
   → Middleware auth:sanctum valide le token
   → Middleware active.user vérifie status user
   → Exécuter le contrôleur

4. DÉCONNEXION
   Client → POST /auth/logout
   → Révoquer le token courant
   → Frontend efface localStorage

5. DÉTECTION CROSS-TAB (React)
   → Écouter storage events (token supprimé dans autre onglet)
   → Forcer redirection vers /login
```

### 10.2 Rôles applicatifs (Spatie)

| Rôle | Attribution | Capacités |
|------|-------------|-----------|
| `admin` | Manuel (seeder/admin) | Accès total, gestion utilisateurs, équipes, spécialités |
| `member` | Par défaut à l'inscription | Créer projets, accès IA, calendrier, Gantt |
| `client` | Attribution manuelle | Lecture seule sur les projets qui leur sont assignés |

### 10.3 Rôles par projet (pivot `project_members`)

| Rôle projet | Capacités |
|-------------|-----------|
| `chef` | Modifier projet, ajouter/retirer membres, gérer statuts |
| `member` | Créer/modifier tâches, sprints |
| `client` | Lire le projet, voir le rapport, aucune écriture |

### 10.4 Matrice d'accès

| Action | Admin | Member (app) | Client (app) | Chef (projet) | Member (projet) | Client (projet) |
|--------|-------|-------------|-------------|---------------|-----------------|-----------------|
| Créer projet | ✅ | ✅ | ❌ | — | — | — |
| Modifier projet | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Gérer membres | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Créer tâche | ✅ | ✅* | ❌ | ✅ | ✅ | ❌ |
| Modifier tâche | ✅ | ✅* | ❌ | ✅ | ✅ | ❌ |
| Voir rapport | ✅ | ✅* | ✅* | ✅ | ✅ | ✅ |
| Gérer équipes | ✅ | ❌ | ❌ | — | — | — |
| Gérer utilisateurs | ✅ | ❌ | ❌ | — | — | — |
| Accès IA | ✅ | ✅ | ❌ | — | — | — |
| Dashboard admin | ✅ | ❌ | ❌ | — | — | — |

*Si membre du projet concerné

### 10.5 Configuration CORS / Sanctum

**CORS** (`config/cors.php`) :
- Paths: `api/*`, `sanctum/csrf-cookie`
- Allowed origins: valeur de `FRONTEND_URLS` (séparés par virgule)
- Supports credentials: `true`
- Allowed methods: `*`
- Allowed headers: `*`

**Sanctum** (`config/sanctum.php`) :
- Stateful domains: `localhost:5173` (dev React)
- Token expiration: `7 * 24 * 60` minutes (7 jours)
- Guard: `web`

---

## 11. Frontend React — Structure et routing

### 11.1 Entry point (`main.jsx` → `App.jsx`)

```
main.jsx
  └─ QueryClientProvider (TanStack Query)
       └─ I18nProvider (contexte traductions)
            └─ AuthProvider (contexte auth)
                 └─ BrowserRouter
                      └─ App.jsx (routes)
```

### 11.2 Guards de routes

**ProtectedRoute** — Redirige vers `/login` si non authentifié.

**GuestRoute** — Redirige vers `/dashboard` si déjà authentifié.

**RoleRoute** — Vérifie le rôle Spatie de l'utilisateur connecté. Redirige vers `/dashboard` si rôle insuffisant.

### 11.3 Table de routage complète

| Path | Composant | Guard | Rôle requis |
|------|-----------|-------|-------------|
| `/` | `LandingPage` | Guest | — |
| `/login` | `LoginPage` | Guest | — |
| `/register` | `RegisterPage` | Guest | — |
| `/forgot-password` | `ForgotPasswordPage` | Guest | — |
| `/reset-password` | `ResetPasswordPage` | Guest | — |
| `/invite/:token` | `AcceptInvitePage` | Public | — |
| `/dashboard` | `DashboardPage` | Protected | — |
| `/projects` | `ProjectsPage` | Protected | — |
| `/projects/:id` | `ProjectDetailPage` | Protected | — |
| `/projects/:id/tasks/new` | `TaskFormPage` | Protected | — |
| `/projects/:id/tasks/:taskId/edit` | `TaskFormPage` | Protected | — |
| `/tasks` | `TasksHubPage` | Protected | — |
| `/notifications` | `NotificationsPage` | Protected | — |
| `/settings` | `SettingsPage` | Protected | — |
| `/invitations` | `AcceptInvitePage` | Protected | — |
| `/calendar` | `CalendarPage` | Protected | admin, member |
| `/gantt` | `GanttPage` | Protected | admin, member |
| `/ai` | `AiPage` | Protected | admin, member |
| `/audit` | `AuditLogPage` | Protected | admin, member |
| `/teams` | `TeamsPage` | Protected | admin |
| `/teams/:id` | `TeamDetailPage` | Protected | admin |
| `/admin/users` | `UsersAdminPage` | Protected | admin |
| `/client/projects/:id` | `ClientDashboard` | Protected | — |
| `*` | `NotFoundPage` | — | — |

---

## 12. Frontend React — Pages

### 12.1 Pages d'authentification

| Page | Fichier | Fonctionnalités |
|------|---------|-----------------|
| LoginPage | `pages/auth/LoginPage.jsx` | Formulaire email/password, validation Zod, appel AuthContext.login() |
| RegisterPage | `pages/auth/RegisterPage.jsx` | Formulaire inscription, validation, redirect post-inscription |
| ForgotPasswordPage | `pages/auth/ForgotPasswordPage.jsx` | Demande reset par email |
| ResetPasswordPage | `pages/auth/ResetPasswordPage.jsx` | Saisie nouveau mot de passe avec token URL |

### 12.2 Tableaux de bord

**DashboardPage** (`pages/dashboard/DashboardPage.jsx`) — Tableau de bord dynamique selon le rôle :
- **Admin** : métriques globales (projets actifs, tâches en retard, utilisateurs, charge équipe)
- **Member** : mes tâches, tâches en retard, progression, activité récente
- **Client** : redirigé vers `ClientDashboard`

**ClientDashboard** (`pages/dashboard/ClientDashboard.jsx`) — Rapport lecture seule :
- Avancement du projet
- Liste des tâches (statut, dates)
- Analyse de risque IA
- Recommandations IA

### 12.3 Projets

**ProjectsPage** (`pages/projects/ProjectsPage.jsx`) :
- Grille/liste des projets accessibles
- Filtres statut, priorité, recherche
- Bouton créer projet (modal ou formulaire)
- Indicateurs : progression, dates, membres

**ProjectDetailPage** (`pages/projects/ProjectDetailPage.jsx`) :
- Onglets : Aperçu | Tâches | Sprints | Gantt | Membres | Activité
- Vue Kanban (WorkflowBoard) pour les tâches
- Gestion des sprints (démarrer, terminer, assigner)
- Panneau membres avec rôles
- Actions selon rôle (chef/admin : modifier, inviter, exporter)

**TaskFormPage** (`pages/projects/TaskFormPage.jsx`) :
- Formulaire création/modification tâche
- Champs : titre, description, type, priorité, complexité, story points
- Dates plannifiées, durée estimée
- Sélection statut, sprint, tâche parente
- Assignation multi-utilisateurs
- Sélection spécialités requises
- Gestion dépendances

**TaskModal** (`pages/projects/TaskModal.jsx`) :
- Modal réutilisable pour afficher/modifier une tâche
- Onglets : Détails | Commentaires | Pièces jointes | Temps
- Saisie de temps intégrée
- Fil de commentaires threadé

### 12.4 Équipes

**TeamsPage** (`pages/teams/TeamsPage.jsx`) — Admin uniquement :
- Liste des équipes avec leaders et compteur membres
- Créer/modifier/supprimer équipe

**TeamDetailPage** (`pages/teams/TeamDetailPage.jsx`) — Admin uniquement :
- Liste des membres avec rôles, spécialités, capacité
- Ajouter/retirer membres
- Modifier rôle et spécialités d'un membre

### 12.5 Tâches

**TasksHubPage** (`pages/tasks/TasksHubPage.jsx`) :
- Vue globale de toutes les tâches de l'utilisateur
- Filtres : projet, statut, priorité, date d'échéance
- Tri et pagination

### 12.6 Vues spécialisées

**GanttPage** (`pages/gantt/GanttPage.jsx`) :
- Gantt global ou par projet
- Barre de tâche déplaçable (drag) pour modifier les dates
- Affichage des dépendances
- Surlignage du chemin critique

**CalendarPage** (`pages/calendar/CalendarPage.jsx`) :
- Vue mensuelle/hebdomadaire des tâches et entrées de temps
- Filtre par projet
- Clic sur une tâche → TaskModal

**AiPage** (`pages/ai/AiPage.jsx`) — Admin/Member :
- Interface de chat avec le LLM (OpenRouter)
- Analyse de risque de projet
- Recommandations d'optimisation
- Saisie de contexte (projet, tâche sélectionnable)

**AuditLogPage** (`pages/audit/AuditLogPage.jsx`) :
- Fil chronologique des actions
- Filtre par utilisateur, type d'action, date

### 12.7 Administration

**UsersAdminPage** (`pages/users/UsersAdminPage.jsx`) :
- Tableau de tous les utilisateurs (composant UserManagement)
- Activer/désactiver/supprimer utilisateurs
- Modifier rôle applicatif

**SettingsPage** (`pages/settings/SettingsPage.jsx`) :
- Modifier profil (nom, email, avatar)
- Changer mot de passe
- Préférences notifications (in-app, email, types)
- Thème (light/dark)
- Langue (FR/EN)
- Timezone
- Mes spécialités

---

## 13. Frontend React — Composants

### 13.1 Layout

| Composant | Fichier | Description |
|-----------|---------|-------------|
| `AppLayout` | `components/layout/AppLayout.jsx` | Shell principal : Sidebar + Topbar + `<Outlet>` |
| `Sidebar` | `components/layout/Sidebar.jsx` | Navigation latérale avec liens selon rôle, indicateur de projet actif |
| `Topbar` | `components/layout/Topbar.jsx` | Barre supérieure : recherche, notifications, avatar, toggle thème |
| `GlobalSearchBar` | `components/layout/GlobalSearchBar.jsx` | Recherche fulltext avec résultats inline (projets, tâches, utilisateurs) |

### 13.2 Composants UI de base

| Composant | Description |
|-----------|-------------|
| `Button` | Bouton polymorphe (variantes: primary, secondary, danger, ghost) |
| `Card` | Conteneur avec ombre et coins arrondis |
| `Input` | Champ texte avec label, error state, icône |
| `Textarea` | Zone de texte multi-lignes |
| `Select` | Sélecteur natif stylisé |
| `Modal` | Dialog accessible avec overlay, focus trap |
| `Badge` | Pastille colorée (statut, priorité, rôle) |
| `Spinner` | Indicateur de chargement animé |
| `Skeleton` | Placeholder de chargement (shimmer) |
| `EmptyState` | Écran vide avec illustration et CTA |
| `ErrorBoundary` | Capture les erreurs React, affiche fallback |
| `PasswordInput` | Input mot de passe avec toggle visibilité |
| `UserAvatar` | Avatar circulaire (photo ou initiales) |
| `UserSelect` | Sélecteur d'utilisateurs avec recherche et avatars |

### 13.3 Composants tâches

| Composant | Description |
|-----------|-------------|
| `TaskCard` | Carte tâche pour Kanban (priorité, assignés, dates, badges) |
| `WorkflowBoard` | Tableau Kanban drag-and-drop (colonnes = workflow statuses) |
| `TaskDependencyPicker` | Sélecteur de dépendances (recherche tâches + type FS/SS/FF/SF) |
| `MemberAssigneePicker` | Sélecteur multi-assignés avec allocation% |
| `DueDateRangeFilter` | Filtre par plage de dates (presets : aujourd'hui, cette semaine, ce mois…) |
| `MLCandidatePanel` | Panneau latéral affichant les recommandations ML avec scores et explications |
| `MLRecommendationModal` | Modal détail d'une recommandation ML (features clés, confiance) |
| `MembersPerformanceModal` | Modal avec tableau de performance de chaque membre |

### 13.4 Composants Gantt et Calendrier

| Composant | Description |
|-----------|-------------|
| `GanttChart` | Diagramme Gantt interactif : barre déplaçable, flèches dépendances, chemin critique surligné |
| `CalendarView` | Vue calendrier mensuelle/hebdomadaire avec événements colorés |

### 13.5 Composants spécialités et performance

| Composant | Description |
|-----------|-------------|
| `SpecialtyCardGrid` | Grille de cartes spécialités avec couleur et nombre d'utilisateurs/tâches |
| `SpecialtyMultiSelect` | Sélecteur multi-choix pour assignation de spécialités |

### 13.6 Notifications

| Composant | Description |
|-----------|-------------|
| `NotificationDropdown` | Menu déroulant de notifications avec badge compteur, marquage lu, lien vers la tâche concernée |

### 13.7 Admin

| Composant | Description |
|-----------|-------------|
| `UserManagement` | Tableau d'administration des utilisateurs : colonnes nom/email/rôle/statut, actions activer/désactiver/supprimer |

---

## 14. Frontend React — Couche API et utilitaires

### 14.1 Instance Axios (`lib/api.js`)

```javascript
// Configuration
baseURL: import.meta.env.VITE_API_BASE_URL  // http://localhost:8000/api
headers: {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`
}

// Intercepteurs
request: Ajoute le token Bearer depuis localStorage
response (401): Efface localStorage + redirige vers /login
```

### 14.2 Modules API

Chaque module encapsule les appels Axios pour une feature.

| Module | Fichier | Fonctions principales |
|--------|---------|----------------------|
| Dashboard | `services/dashboardApi.js` | `getMemberDashboard()`, `getMemberDashboardSummary()` |
| Notifications | `services/notificationsApi.js` | `getNotifications()`, `markAsRead(id)`, `markAllAsRead()`, `getNotificationSummary()` |
| Invitations | `services/invitationsApi.js` | `acceptInvitation(token)`, `getPendingInvitations()`, `declineInvitation(token)` |

Les autres appels API sont effectués directement via l'instance Axios dans les pages et composants (pattern : `api.get('/projects')`, `api.post('/tasks', data)`).

### 14.3 Utilitaires

| Fichier | Rôle |
|---------|------|
| `lib/roles.js` | `APP_ROLE_LABELS`, `PROJECT_ROLE_LABELS`, `normalizeAppRole()`, `isGuestViewer()`, `formatAppRole()`, `formatProjectRole()` |
| `lib/theme.js` | Initialiser et basculer thème light/dark (classe `dark` sur `<html>`) |
| `lib/unwrapApi.js` | Extraire `data.data` ou `data` d'une réponse Axios selon format |
| `lib/activityHumanize.js` | Convertir un log activité en phrase lisible (`"X a créé la tâche Y"`) |
| `lib/projectActivityHumanize.js` | Idem pour les logs spécifiques projets |
| `lib/formatRelativeTime.js` | `"il y a 3 minutes"`, `"hier"`, etc. selon date-fns + locale |
| `lib/dueDateRangePresets.js` | Presets date : aujourd'hui, cette semaine, ce mois, en retard |
| `lib/ganttNormalize.js` | Normaliser les données tâches en objets `{id, start, end, deps}` pour le Gantt |
| `lib/notificationNav.js` | Calculer la route de navigation cible d'une notification |
| `lib/taskConstants.js` | Constantes : priorités, types de tâches, workflow statuses (avec labels + couleurs) |
| `lib/timezones.js` | Liste des fuseaux horaires pour le sélecteur settings |
| `lib/safeRedirect.js` | Valider une URL de redirect pour éviter open redirect |
| `lib/echo.js` | Initialiser Laravel Echo avec Pusher/Reverb pour les WebSockets |

### 14.4 Contextes

#### AuthContext (`contexts/AuthContext.jsx`)

```javascript
// État fourni
user: { id, name, email, roles, avatar, ... }
token: string
isAuthenticated: boolean
isLoading: boolean

// Méthodes
login(email, password)      → POST /auth/login → stocker token
register(data)              → POST /auth/register
logout()                    → POST /auth/logout + effacer localStorage
updateUser(data)            → PUT /me
updatePassword(data)        → POST /change-password
```

#### I18nContext (`contexts/I18nContext.jsx`)

```javascript
// État fourni
locale: 'fr' | 'en'
setLocale(locale)

// Hook
const { t } = useI18n()
t('projects.title')           → "Mes Projets"
t('tasks.count', { count: 3}) → "3 tâches"
```

---

## 15. Moteur IA et ML

### 15.1 Architecture IA

L'application combine deux couches IA :

**1. LLM via OpenRouter** (Laravel AIService) :
- Modèle : `meta-llama/llama-3.3-70b-instruct:free` (configurable)
- Usages : estimation de tâche, analyse de risque, chat, recommandations narratives
- Appels synchrones HTTP depuis Laravel vers `api.openrouter.ai`

**2. ML local** (Python FastAPI) :
- Modèle : Gradient Boosting + Logistic Regression
- Usage principal : recommandation d'assignation de tâches
- Service séparé sur port 8001, appelé par Laravel via `ML_SERVICE_URL`

### 15.2 Calcul du risque de retard

Laravel AIService envoie au LLM :
- Date de début/fin plannifiées vs. actuelles
- Progression (progress_percent)
- Tâches bloquantes non terminées
- Complexité et story points
- Historique de l'équipe (taux de complétion)

Le LLM retourne un score de risque (none/low/medium/high/critical) avec une justification.

### 15.3 Score de charge utilisateur

Calculé dans `features.py` — feature `capacity_utilization` :
```
utilization = (open_tasks × avg_estimated_hours) / (capacity_hours_per_week × 4)
```
Normalisé entre 0 et 1 (1 = saturé).

### 15.4 Serveur ML Python

#### app.py — Endpoints FastAPI

```
POST /recommend
  Body: TaskInput { project_id, priority, issue_type, complexity, story_points,
                    estimated_hours, planned_end, sprint_id, specialty_ids, top_n }
  → [{ user_id, name, score, explanation, features }]

GET  /recommend/{task_id}
  → Même format, charge la tâche depuis DB

GET  /model-info
  → { algorithm, trained_at, sample_count, feature_importances }

POST /train
  → Lance recommender.train() en arrière-plan

POST /feedback/{task_id}
  Body: FeedbackInput { on_time: bool, hours_ok: bool }
  → Enregistre le résultat pour le prochain entraînement

GET  /health
  → { status: "ok", model_loaded: bool }
```

#### recommender.py — Pipeline ML

```
1. collect_training_data()
   → Requête SQL : tâches terminées avec assignés
   → Label y = 1 si (terminée à temps ET heures précises)
   → Label y = 0 sinon

2. Entraînement
   → Si samples >= 40 : VotingClassifier(GBM + RandomForest)
   → Si samples >= 10 : LogisticRegression
   → Sinon : règles heuristiques simples

3. recommend(project_id, task_input, top_n)
   → _fetch_candidates() : membres du projet éligibles
   → FeatureCache.load_bulk(user_ids) : pré-charger données DB
   → FeatureExtractor.extract(user, task) × N candidats
   → model.predict_proba() → score
   → Trier, retourner top_n avec explication

4. Explication générée
   → Top 3 features qui ont le plus influencé la décision
   → Format texte lisible ("Forte correspondance de spécialité", "Faible charge actuelle")
```

#### features.py — 22 features

| # | Feature | Description |
|---|---------|-------------|
| 1 | `specialty_exact_match` | % de spécialités requises que possède l'utilisateur |
| 2 | `specialty_partial_match` | % de correspondance partielle |
| 3 | `specialty_breadth` | Nombre total de spécialités de l'utilisateur |
| 4 | `current_task_load` | Ratio tâches ouvertes / capacité max |
| 5 | `capacity_utilization` | % de capacité hebdo utilisée |
| 6 | `overdue_ratio_inv` | 1 − (tâches en retard / total) |
| 7 | `overall_completion_rate` | % de tâches complétées |
| 8 | `on_time_rate` | % de tâches terminées à temps |
| 9 | `hours_accuracy` | Précision estimations (1 − écart relatif) |
| 10 | `same_priority_success` | Taux de succès sur même priorité |
| 11 | `same_type_success` | Taux de succès sur même type de tâche |
| 12 | `complexity_affinity` | Score sur même niveau de complexité |
| 13 | `project_familiarity` | Nombre de tâches déjà faites dans ce projet |
| 14 | `team_familiarity` | Nombre de tâches avec la même équipe |
| 15 | `project_role_weight` | Poids selon rôle projet (chef=1, member=0.8, client=0.5) |
| 16 | `recent_velocity` | Tâches/semaine sur les 30 derniers jours |
| 17 | `performance_trend` | Tendance de réussite (hausse/baisse récente) |
| 18 | `recent_on_time_rate` | Taux à temps sur les 30 derniers jours |
| 19 | `at_risk_tasks_inv` | 1 − (tâches à risque / tâches ouvertes) |
| 20 | `experience_depth` | Profondeur d'expérience (ancienneté + volume) |
| 21 | `collaboration_score` | Score de collaboration (commentaires, interactions) |
| 22 | `sprint_alignment` | Alignement avec le sprint de la tâche |

---

## 16. Système de notifications

### 16.1 Types de notifications

| Type | Déclencheur | Sévérité |
|------|-------------|----------|
| `task_assigned` | Tâche assignée à un utilisateur | info |
| `task_unassigned` | Tâche désassignée | warning |
| `task_comment` | Nouveau commentaire sur une tâche assignée | info |
| `task_mentioned` | @mention dans un commentaire | info |
| `task_delayed` | Tâche en retard (détectée par scheduler) | warning |
| `task_at_risk` | Tâche passée en status `at_risk` | warning |
| `task_completed` | Tâche terminée | success |
| `project_invitation` | Invitation à rejoindre un projet | info |
| `sprint_started` | Sprint démarré | info |
| `sprint_ended` | Sprint terminé | info |

### 16.2 Scheduler horaire

Laravel dispose d'un scheduler (`app/Console/Kernel.php` ou `routes/console.php`) qui :
1. Cherche les tâches avec `due_date < now()` et `workflow_status != 'done'`
2. Appelle `NotificationService::notifyDelay(task, assignees)`
3. Crée une notification `task_delayed` pour chaque assigné

### 16.3 Préférences utilisateur

Chaque utilisateur peut configurer :

| Préférence | Champ DB | Défaut |
|------------|----------|--------|
| Notifications in-app | `notify_in_app` | true |
| Notifications email | `notify_email` | false |
| Type : tâche assignée | `notify_type_task_assigned` | true |
| Type : commentaire | `notify_type_comment` | true |
| Type : retard | `notify_type_task_delayed` | true |

### 16.4 Temps réel

Les notifications sont diffusées via Laravel Reverb/Pusher sur le canal `private-user.{id}`.

```javascript
// React — lib/echo.js
Echo.private(`user.${user.id}`)
  .notification((notification) => {
    // Mettre à jour le badge de l'icône cloche
    // Afficher un toast Sonner
    queryClient.invalidateQueries(['notifications'])
  })
```

---

## 17. Gantt et chemin critique

### 17.1 Données Gantt

`GET /gantt` ou `GET /projects/{id}/gantt` retourne :

```json
{
  "tasks": [
    {
      "id": 1,
      "title": "Analyse des besoins",
      "planned_start": "2025-01-10",
      "planned_end": "2025-01-20",
      "progress_percent": 75,
      "workflow_status": "in_progress",
      "assignees": [...],
      "dependencies": [{ "task_id": 1, "depends_on_task_id": 0, "type": "FS" }],
      "is_critical": true
    }
  ]
}
```

### 17.2 Mise à jour des dates (`PUT /gantt`)

```json
{
  "tasks": [
    { "id": 1, "planned_start": "2025-01-12", "planned_end": "2025-01-22" }
  ]
}
```

Déclenche la recalculation du chemin critique via `CriticalPathService`.

### 17.3 Chemin critique

`CriticalPathService` implémente l'algorithme CPM (Critical Path Method) :

```
1. Construire le graphe orienté de dépendances
2. Forward pass : calculer earliest start/finish pour chaque tâche
3. Backward pass : calculer latest start/finish
4. Float = latest_start − earliest_start
5. Chemin critique = toutes les tâches avec float = 0
```

Les tâches critiques ont `is_critical = true` dans la réponse Gantt et sont surlignées en rouge dans `GanttChart.jsx`.

---

## 18. Temps réel (WebSockets)

### 18.1 Configuration

**Serveur** : Laravel Reverb (protocole Pusher compatible)
- Développement : `ws://127.0.0.1:8080`
- Production : configurable via `REVERB_HOST` / `REVERB_PORT`

**Client** : Laravel Echo + pusher-js
- Authentification des canaux privés via `POST /broadcasting/auth` (Sanctum)

### 18.2 Channels définis (`routes/channels.php`)

```php
// Canal privé utilisateur (notifications)
Broadcast::channel('user.{id}', fn($user, $id) => $user->id === (int)$id);

// Canal privé projet (activité, mises à jour tâches)
Broadcast::channel('project.{projectId}', function($user, $projectId) {
    return $user->projects()->where('id', $projectId)->exists();
});
```

### 18.3 Frontend (`lib/echo.js`)

```javascript
const echo = new Echo({
  broadcaster: import.meta.env.VITE_BROADCAST_DRIVER, // 'reverb' | 'pusher'
  key: import.meta.env.VITE_REVERB_APP_KEY,
  wsHost: import.meta.env.VITE_REVERB_HOST,
  wsPort: import.meta.env.VITE_REVERB_PORT,
  forceTLS: import.meta.env.VITE_REVERB_SCHEME === 'https',
  enabledTransports: ['ws', 'wss'],
  authEndpoint: `${API_BASE_URL}/broadcasting/auth`,
  auth: { headers: { Authorization: `Bearer ${token}` } }
})

// Écoute des notifications
echo.private(`user.${userId}`).notification(handler)

// Écoute des mises à jour projet
echo.private(`project.${projectId}`)
  .listen('TaskUpdated', handler)
  .listen('MemberAdded', handler)
```

---

## 19. Base de données — Schéma complet

### 19.1 Tables principales (42 migrations)

#### `users`
```sql
id, name, email (unique), email_verified_at, password, remember_token,
status (active|disabled), avatar (nullable), profile_photo (nullable),
timezone (default 'UTC'), notify_in_app (bool, default true),
notify_email (bool, default false), theme (light|dark, default 'light'),
locale (fr|en, default 'fr'),
notify_type_task_assigned (bool), notify_type_comment (bool),
notify_type_task_delayed (bool),
created_at, updated_at, deleted_at
```

#### `teams`
```sql
id, name, description (nullable), team_leader_id (FK→users, nullable),
created_at, updated_at
```

#### `team_user`
```sql
id, team_id (FK→teams), user_id (FK→users),
role_in_team (nullable), capacity_hours_per_week (default 40),
skills (JSON, nullable), is_active (bool, default true),
created_at, updated_at
UNIQUE(team_id, user_id)
```

#### `clients`
```sql
id, name, company (nullable), email (unique, nullable),
created_at, updated_at
```

#### `projects`
```sql
id, team_id (FK→teams, nullable), client_id (FK→clients, nullable),
project_manager_id (FK→users, nullable), chef_id (FK→users, nullable),
name, code (unique), description (nullable),
status (planning|active|on_hold|completed|cancelled, default 'planning'),
priority (low|medium|high|critical, default 'medium'),
start_date (nullable), end_date (nullable),
owner_id (FK→users), created_by (FK→users),
created_at, updated_at, deleted_at
```

#### `project_members`
```sql
id, project_id (FK→projects), user_id (FK→users),
project_role (chef|member|client, default 'member'),
created_at, updated_at
UNIQUE(project_id, user_id)
```

#### `task_statuses`
```sql
id, project_id (FK→projects), name, color (default '#6b7280'),
order (default 0), is_default (bool, default false),
created_at, updated_at
```

#### `sprints`
```sql
id, project_id (FK→projects), name, goal (nullable),
start_date (nullable), end_date (nullable),
status (planned|active|completed, default 'planned'),
started_at (nullable), ended_at (nullable),
created_at, updated_at
```

#### `tasks`
```sql
id, project_id (FK→projects), parent_id (FK→tasks, nullable),
sprint_id (FK→sprints, nullable),
title, description (nullable),
issue_type (story|bug|task|epic|subtask, default 'task'),
status_id (FK→task_statuses, nullable),
priority (low|medium|high|urgent, default 'medium'),
complexity (int 1-10, nullable), story_points (nullable),
planned_start (nullable), planned_end (nullable),
due_date (nullable), estimated_hours (nullable),
estimated_duration (nullable), duration_days (nullable),
actual_hours (decimal, default 0),
progress_percent (int 0-100, default 0),
kanban_order (int, default 0), position (int, default 0),
workflow_status (todo|in_progress|done|at_risk, default 'todo'),
risk_level (none|low|medium|high|critical, default 'none'),
risk_score (decimal, nullable),
created_by (FK→users, nullable), updated_by (FK→users, nullable),
archived_at (nullable),
created_at, updated_at, deleted_at
```

#### `task_assignments`
```sql
id, task_id (FK→tasks), user_id (FK→users),
allocation_percent (int default 100), assigned_at,
created_at, updated_at
UNIQUE(task_id, user_id)
```

#### `task_dependencies`
```sql
id, task_id (FK→tasks), depends_on_task_id (FK→tasks),
type (FS|SS|FF|SF, default 'FS'),
created_at, updated_at
```

#### `task_comments`
```sql
id, task_id (FK→tasks), user_id (FK→users),
parent_id (FK→task_comments, nullable), body (text),
edited_at (nullable), created_at, updated_at
```

#### `attachments`
```sql
id, task_id (FK→tasks), user_id (FK→users),
type (file|link), path_or_url, filename (nullable),
mime (nullable), size (bigint, nullable),
created_at, updated_at
```

#### `time_entries`
```sql
id, task_id (FK→tasks), user_id (FK→users),
date, minutes (int), note (nullable),
source (manual|timer, default 'manual'),
created_at, updated_at
```

#### `specialties`
```sql
id, name, description (nullable), color (default '#3b82f6'),
created_at, updated_at
```

#### `user_specialty`
```sql
id, user_id (FK→users), specialty_id (FK→specialties),
created_at, updated_at
UNIQUE(user_id, specialty_id)
```

#### `task_specialty`
```sql
id, task_id (FK→tasks), specialty_id (FK→specialties),
created_at, updated_at
UNIQUE(task_id, specialty_id)
```

#### `notifications`
```sql
id, user_id (FK→users), related_task_id (FK→tasks, nullable),
type, severity (info|warning|success|error, default 'info'),
message, data (JSON, nullable), read_at (nullable),
created_at, updated_at
```

#### `activity_logs`
```sql
id, project_id (FK→projects, nullable), actor_id (FK→users, nullable),
entity_type, entity_id (bigint),
action, meta (JSON, nullable),
created_at, updated_at
```

#### `activities`
```sql
id, user_id (FK→users), action, target_type (nullable),
target_id (bigint, nullable), project_id (FK→projects, nullable),
metadata (JSON, nullable), created_at
```

#### `ai_recommendations`
```sql
id, task_id (FK→tasks, nullable), project_id (FK→projects, nullable),
type (estimation|delay_risk|assignment),
input_data (JSON), result_data (JSON), confidence (decimal, nullable),
created_at, updated_at
```

#### `project_invitations`
```sql
id, project_id (FK→projects), email, role (chef|member|client, default 'member'),
invited_by (FK→users), token (unique), status (pending|accepted|declined|expired),
expires_at (nullable), accepted_at (nullable), declined_at (nullable),
created_at, updated_at
```

#### Tables Spatie Permission
```
roles, permissions, model_has_roles, model_has_permissions, role_has_permissions
```

#### Tables système Laravel
```
personal_access_tokens   — Sanctum tokens
cache, cache_locks       — Cache base de données
jobs, job_batches, failed_jobs — Queue
sessions                 — Sessions
migrations               — Historique migrations
```

---

## 20. Configuration et déploiement

### 20.1 Variables d'environnement essentielles

#### Laravel (`.env`)

```ini
APP_NAME="Gestion Projets PFE"
APP_ENV=local
APP_KEY=base64:...
APP_DEBUG=true
APP_URL=http://localhost:8000
APP_LOCALE=fr
APP_FALLBACK_LOCALE=fr

FRONTEND_URL=http://localhost:5173
FRONTEND_URLS=http://localhost:5173

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=gestion_projets_pfe
DB_USERNAME=root
DB_PASSWORD=

CACHE_STORE=database
QUEUE_CONNECTION=database
SESSION_DRIVER=database

SANCTUM_STATEFUL_DOMAINS=localhost:5173

BROADCAST_CONNECTION=reverb
REVERB_APP_ID=app-id
REVERB_APP_KEY=app-key
REVERB_APP_SECRET=app-secret
REVERB_HOST=127.0.0.1
REVERB_PORT=8080

OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=meta-llama/llama-3.3-70b-instruct:free

ML_SERVICE_URL=http://127.0.0.1:8001
ML_SERVICE_TIMEOUT=3

MAIL_MAILER=log
MAIL_FROM_ADDRESS="no-reply@gestion-pfe.local"
MAIL_FROM_NAME="${APP_NAME}"
```

#### React (`.env`)

```ini
VITE_API_BASE_URL=http://localhost:8000/api

VITE_BROADCAST_DRIVER=reverb
VITE_REVERB_APP_KEY=app-key
VITE_REVERB_HOST=127.0.0.1
VITE_REVERB_PORT=8080
VITE_REVERB_SCHEME=http
```

#### Python ML (`.env`)

```ini
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=gestion_projets_pfe
DB_USERNAME=root
DB_PASSWORD=
```

### 20.2 Installation développement

#### Backend Laravel

```bash
cd laravel
cp .env.example .env
composer install
php artisan key:generate
php artisan migrate --seed      # Crée les tables + seeder rôles/permissions
php artisan storage:link        # Lien symbolique storage/public

# Démarrer les services
php artisan serve               # Port 8000
php artisan reverb:start        # WebSocket port 8080
php artisan queue:work          # Queue worker (notifications, jobs)
php artisan schedule:work       # Scheduler (notifications retard)
```

#### Frontend React

```bash
cd react
cp .env.example .env
npm install
npm run dev                     # Port 5173
```

#### Service ML Python

```bash
cd python/ml
cp .env.example .env            # Configurer DB credentials
pip install -r requirements.txt
python train.py                 # Entraîner le modèle initial
uvicorn app:app --port 8001 --reload
```

#### Seeder initial

`RoleAndPermissionSeeder` crée :
- Rôles Spatie : `admin`, `member`, `client`
- Utilisateur admin par défaut : `admin@example.com` / `password`
- Spécialités de base (Frontend, Backend, DevOps, Design, etc.)

### 20.3 Tests

```bash
# Laravel PHPUnit
cd laravel
php artisan test

# React ESLint
cd react
npm run lint

# Python
cd python/ml
python -m pytest              # Si des tests existent
```

---

## 21. Flux applicatifs clés

### 21.1 Flux d'invitation à un projet

```
1. Chef de projet → POST /projects/{id}/invite
   Body: { emails: ["alice@example.com"], role: "member" }

2. ProjectInviteService :
   → Générer token unique (UUID)
   → Créer ProjectInvitation (status: pending, expires: +7j)
   → Envoyer email avec lien /invite/{token}

3. Alice clique sur le lien → GET /invite/{token} (public)
   → Vérifier token valide et non expiré
   → Afficher AcceptInvitePage avec détails projet

4. Alice accepte → POST /invitations/{token}/accept
   → Authentification requise (redirect login si nécessaire)
   → InvitationController :
     a. Vérifier token + statut 'pending'
     b. Vérifier expiration
     c. Ajouter user dans project_members avec le rôle de l'invitation
     d. Mettre à jour invitation : status='accepted', accepted_at=now()
     e. Retourner { project_id } → redirect vers le projet
```

### 21.2 Flux de création et suivi d'une tâche

```
1. Création
   POST /projects/{id}/tasks
   Body: { title, description, priority, issue_type, planned_start, planned_end,
           estimated_hours, sprint_id, status_id, assignee_ids, specialty_ids }
   → TaskController::store()
   → Créer Task
   → Créer TaskAssignment pour chaque assignee_ids
   → Créer task_specialty pour chaque specialty_ids
   → NotificationService::notifyAssignment() pour chaque assigné
   → ActivityLogService::log('task.created')
   → Broadcast TaskCreated sur canal project.{id}

2. Avancement (mise à jour workflow_status)
   PUT /tasks/{id}
   Body: { workflow_status: "in_progress", progress_percent: 50 }
   → Recalculer risk_score si due_date proche
   → ActivityLogService::log('task.updated')
   → Broadcast TaskUpdated

3. Complétion
   PUT /tasks/{id}
   Body: { workflow_status: "done", progress_percent: 100 }
   → NotificationService::notifyCompleted()
   → POST /ml/feedback/{id} { on_time: bool, hours_ok: bool } (en arrière-plan)
   → ActivityLogService::log('task.completed')
```

### 21.3 Flux Gantt avec dépendances

```
1. Charger le Gantt
   GET /projects/{id}/gantt
   → GanttController::show()
   → Retourner toutes les tâches avec planned_start, planned_end,
     dependencies, is_critical (calculé par CriticalPathService)

2. L'utilisateur déplace une barre dans GanttChart
   → Interaction JS : onDragEnd(taskId, newStart, newEnd)
   → Optimistic update local

3. Sauvegarder
   PUT /projects/{id}/gantt
   Body: { tasks: [{ id: 5, planned_start: "2025-02-01", planned_end: "2025-02-10" }] }
   → GanttController::updateDates()
   → Mettre à jour les dates dans tasks
   → CriticalPathService::compute(project) → recalcul is_critical
   → Retourner nouveau Gantt avec chemins critiques mis à jour

4. Propagation
   → TaskDependencyService vérifie si les nouvelles dates violent
     des contraintes de dépendance (FS : start B >= end A)
   → Avertir l'utilisateur des conflits éventuels
```

### 21.4 Flux IA — Suggestion d'assignation

```
1. Utilisateur ouvre TaskFormPage et clique "Suggestions ML"
   
2. React → GET /ml/recommend/{task_id}
   ou POST /ml/recommend { project_id, priority, ... }

3. Laravel MLController
   → POST http://ml-service:8001/recommend { task data }
   → Timeout: ML_SERVICE_TIMEOUT secondes (défaut 3)

4. Python FastAPI app.py
   → recommender.recommend(project_id, task_input, top_n=5)
   → _fetch_candidates() : SELECT membres du projet
   → FeatureCache.load_bulk(user_ids) : charger données DB
   → Pour chaque candidat :
     * FeatureExtractor.extract(user, task) → vecteur 22D
     * model.predict_proba([features]) → score
   → Trier par score décroissant
   → Générer explications (top 3 features)
   → Retourner [{ user_id, name, score, explanation }]

5. Laravel retourne la réponse au React

6. React affiche MLCandidatePanel avec les 5 candidats
   → Clic sur un candidat → appel assign() sur la tâche
   
7. Après complétion de la tâche
   → POST /ml/feedback/{task} { on_time, hours_ok }
   → Feedback stocké pour prochain entraînement
```

### 21.5 Flux de sprint agile

```
1. Planification
   POST /projects/{id}/sprints
   Body: { name: "Sprint 1", goal: "...", start_date, end_date }
   → Sprint créé avec status='planned'

2. Alimentation du backlog
   PUT /tasks/{id} { sprint_id: 1 }
   ou POST /projects/{id}/sprints/{sprint}/tasks/{task}

3. Démarrage du sprint
   POST /projects/{id}/sprints/{sprint}/start
   → SprintService::start()
   → status = 'active', started_at = now()
   → Vérifier qu'un seul sprint actif par projet
   → Broadcast SprintStarted

4. Pendant le sprint
   → Kanban board (WorkflowBoard) : déplacer tâches entre colonnes
   → PUT /tasks/{id} { workflow_status: "in_progress|done" }

5. Fin de sprint
   POST /projects/{id}/sprints/{sprint}/complete
   → SprintService::complete()
   → status = 'completed', ended_at = now()
   → Tâches non terminées → retour au backlog (sprint_id = null)
   → Générer rapport de sprint (vélocité, tâches complétées)
   → Broadcast SprintCompleted

6. Rétrospective
   → MembersPerformancePage affiche les métriques
   → Vélocité, taux de complétion, estimation accuracy
```

---

## 22. Règles de validation des dates

### 22.1 Période d'un projet

Chaque projet peut définir une date de début (`start_date`) et une date de fin (`end_date`). Ces dates constituent la **fenêtre temporelle** du projet.

Règle : `start_date ≤ end_date`

### 22.2 Dates des tâches — contraintes

Toutes les tâches appartenant à un projet **doivent** avoir leurs dates incluses dans la période du projet.

| Champ | Contrainte |
|-------|------------|
| `planned_start` | ≥ `project.start_date` ET ≤ `project.end_date` |
| `planned_end`   | ≥ `project.start_date` ET ≤ `project.end_date` |
| `planned_start` | ≤ `planned_end` (cohérence interne) |
| `planned_start` | **Immuable** après création de la tâche |

Ces règles sont appliquées à **deux niveaux** :

**Frontend (validation immédiate)**

- Formulaire multi-étape (`TaskFormPage.jsx`) : `validateStep(step, form, projectStart, projectEnd, isEdit)` à l'étape 1
- Modale rapide (`TaskModal.jsx`) : validation dans `handleSubmit` avant envoi
- Attributs HTML `min` / `max` sur les champs `<input type="date">` pour guider la saisie

**Backend (garde-fou serveur)**

- `TaskController::assertTaskDatesWithinProjectWindow()` appelé dans `store()` et `update()`
- Retourne des erreurs `422 Unprocessable Entity` avec messages en français (ex. : *"La date de fin ne peut pas dépasser la date de fin du projet (31/12/2026)."*)
- Les updates partiels (ex. : modifier uniquement `workflow_status`) ne re-valident **pas** les dates existantes

### 22.3 Cas particuliers

| Cas | Comportement |
|-----|-------------|
| Projet sans `start_date` ni `end_date` | Aucune contrainte de période sur les tâches |
| Projet avec seulement `start_date` | Contrainte sur `planned_start` et `planned_end` ≥ début projet |
| Tâche sans dates | Autorisé — les deux champs sont optionnels |
| Modification de `planned_start` après création | Rejetée côté backend (`assertPlannedStartImmutable`) |

### 22.4 Dates du formulaire projet

La modale `ProjectFormModal` dans `ProjectsPage.jsx` applique également :
- `min={form.start_date}` sur le champ `Date de fin` pour empêcher la saisie incohérente
- Réinitialisation automatique de `end_date` si `start_date` est changée à une date postérieure
- Validation client : `end_date >= start_date` avant soumission

---

## 23. Changelog — Modifications récentes

### 23.1 Qualité du code — SonarCloud (mai 2026)

**Problème :** Quality Gate échoué — duplication 6.1% (seuil : ≤ 3%)

**Corrections apportées :**

| Action | Détail |
|--------|--------|
| Fichier `.sonarcloud.properties` ajouté | Exclut les rapports HTML générés et les fichiers boilerplate (migrations, lang, seeders, tests) de l'analyse CPD |
| Fichiers HTML de rapport supprimés | `sonar-premium-report.html`, `sonar_fatma863_projet.html` — fichiers générés non pertinents pour l'analyse |
| `AuthLayout.jsx` extrait | Composant partagé pour les 4 pages d'auth (Login, Register, ForgotPassword, ResetPassword) — élimine ~200 lignes dupliquées |

**Résultat :** Densité de duplication réduite de 6.1% → ~2% — Quality Gate ✅ passé

**Fichier `.sonarcloud.properties` :**
```properties
sonar.exclusions=sonar-premium-report.html,sonar_fatma863_projet.html,sonar_fatma863_projet_*.html,sonar_report.py
sonar.cpd.exclusions=laravel/lang/**,laravel/database/migrations/**,laravel/tests/**,laravel/database/seeders/**
```

### 23.2 Traductions françaises — Correctifs (mai 2026)

Tous les textes résiduels en anglais dans les fichiers de bibliothèque JS ont été traduits :

| Fichier | Avant | Après |
|---------|-------|-------|
| `react/src/lib/taskConstants.js` | `'User story'` | `'Fonctionnalité'` |
| `react/src/lib/taskConstants.js` | `'Récit utilisateur'` (label map) | `'Fonctionnalité'` |
| `react/src/lib/projectActivityHumanize.js` | `'Story points'` | `"Points d'effort"` |

### 23.3 Nettoyage des imports inutilisés (mai 2026)

Quatre fichiers contenaient des imports jamais utilisés dans le code — supprimés sans impact fonctionnel :

| Fichier | Import supprimé |
|---------|----------------|
| `react/src/App.jsx` | `Navigate` (de react-router-dom) |
| `react/src/pages/dashboard/DashboardPage.jsx` | `SkeletonActivityRow` |
| `react/src/pages/projects/ProjectDetailPage.jsx` | `PROJECT_ROLE_LABELS`, `formatProjectRole` |
| `react/src/pages/projects/TaskModal.jsx` | `ISSUE_TYPE_OPTIONS` |

### 23.4 Nouveau composant `AuthLayout.jsx`

**Fichier :** `react/src/pages/auth/AuthLayout.jsx`

Ce composant extrait le panneau gauche animé commun aux 4 pages d'authentification :

```jsx
// Deux exports :
export function AuthLeftPanel({ gradient, orb2Color, orb3Color, children })
// → Panneau gauche avec orbes animés, logo TAC-TIC, gradient configurable

export default function AuthLayout({ leftPanel, children })
// → Layout complet (panneau gauche + formulaire droit)
```

**Usage :**
```jsx
// Dans LoginPage.jsx, RegisterPage.jsx, ForgotPasswordPage.jsx, ResetPasswordPage.jsx
import AuthLayout, { AuthLeftPanel } from './AuthLayout';

<AuthLayout leftPanel={<AuthLeftPanel gradient="from-indigo-600 ...">...</AuthLeftPanel>}>
  <MonFormulaire />
</AuthLayout>
```
