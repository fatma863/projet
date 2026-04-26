# Claude / Project Handbook — Gestion Projets PFE

## Project Requirements

- **Laravel 12 API backend (PHP 8.2+)**
- **React 19 SPA frontend (Vite 7)**
- **MySQL database**
- **User authentication**: register, login, logout, password reset, profile, avatar
- **Role management**: admin, member, viewer (Spatie)
- **Teams and team membership management**
- **Clients and client-project linking**
- **Projects**: CRUD, statuses, members, invitations, dashboards, export, critical path
- **Tasks**: Kanban workflow, assignees, dependencies, comments, attachments, time entries, status changes
- **Agile features**: sprints, backlog, task assignment to sprints, sprint management
- **Dashboards**: admin, member, and viewer roles
- **Project invitations**: email flow
- **In-app notifications**: scheduled smart notifications
- **Global search endpoint**
- **Gantt chart**: global and per-project, with dependency propagation
- **Calendar aggregation**: for members/admins
- **Activity feed**: admin/member only
- **AI/analytics endpoints**: heuristics (not external LLM), admin/member only
- **Real-time features**: optional, via Laravel Reverb/Pusher
- **Environment variable configuration**: backend/frontend, mail, queues, broadcasting
- **Tests for backend**: php artisan test
- **Monorepo structure**: laravel/ (API), react/ (SPA)

This document summarizes the **Laravel 12 API + React (Vite) SPA** codebase: goals, architecture, data model, routes, auth, UI, and operations.

---

## 1. Project overview and objectives

- **Name:** Gestion Projets PFE (API identifies as `Gestion Projets PFE` in `routes/api.php` root).
- **Purpose:** End-to-end **project management** for teams: projects, tasks (Kanban/workflow), sprints & backlog, assignments, dependencies, Gantt-style planning, notifications, optional real-time (Reverb), and **rule-based “AI”** analytics (not external LLM by default).
- **Goals:** Multi-tenant-style access via **teams** and **projects**, fine-grained **project roles** plus **application roles**, auditable activity, and a modern **React** UI with role-aware navigation (including a focused **guest/invited** experience).

---

## 2. Features and functionalities

| Area | Description |
|------|-------------|
| **Auth** | Register, login, logout, password reset, profile & preferences, avatar, Sanctum tokens. |
| **Users & roles** | Spatie **application roles**: `admin`, `member`, `viewer` (invited/guest account). |
| **Teams** | CRUD (admin-oriented in UI), members on `team_user` pivot. |
| **Clients** | CRUD `clients`, linked to projects. |
| **Projects** | CRUD, statuses, members, invitations, per-project dashboard & activity, export, critical path. |
| **Tasks** | CRUD, workflow (`todo` / `in_progress` / `done` / `at_risk`), Kanban order, assignees, dependencies, comments (threads), attachments, time entries, move between statuses. |
| **Agile** | Sprints, backlog, reorder, assign task to sprint, start/end/complete sprint. |
| **Dashboards** | Admin platform metrics, member/viewer **personal** dashboard (assigned tasks, overdue, etc.), project-level metrics where implemented. |
| **Invitations** | Project invitations (email flow), accept/decline, token verification. |
| **Notifications** | In-app + preferences; scheduled `notifications:smart` (hourly). |
| **Search** | Global search endpoint. |
| **Gantt** | Global `/gantt` and per-project `projects/{id}/gantt`; date updates with dependency propagation (server-side). |
| **Calendar** | Aggregated calendar data for members/admins (`/calendar`). |
| **Activity feed** | `activity/feed` (restricted to **admin + member** on API). |
| **AI & analytics** | `/ai/*` endpoints backed by `AIService` (heuristics: estimates, risk, suggestions, workload). **Not** available to app role `viewer`. |

---

## 3. Architecture and technologies

### 3.1 Backend (`laravel/`)

- **PHP** ^8.2, **Laravel** ^12.
- **Laravel Sanctum** — API token auth (Bearer `Authorization` header from SPA).
- **Spatie laravel-permission** — roles/permissions.
- **Laravel Reverb** + **Pusher protocol** — optional realtime (Echo on frontend).
- **MySQL** (default in `.env.example`).
- **Queues** — `database` driver; workers recommended for mail/notifications.
- **Broadcasting** — Reverb / Pusher config in `.env`.

### 3.2 Frontend (`react/`)

- **React** 19, **Vite** 7, **React Router** 7.
- **TanStack Query** — server state.
- **Axios** — `baseURL: '/api'` with Bearer token from `localStorage`.
- **Tailwind CSS** v4 (Vite plugin), **Framer Motion**, **react-hook-form** + **zod**.
- **i18n** — `I18nProvider` (FR-oriented strings in places).
- **Dev proxy** — Vite proxies `/api` and `/storage` to `http://localhost:8000`.

### 3.3 High-level diagram

```text
Browser (localhost:5173)  →  Vite proxy /api  →  Laravel (localhost:8000)
                              Bearer token        Sanctum + middleware
                              JSON                Eloquent + Policies / AccessControl
```

### 3.4 Important backend layers

- **`App\Support\AccessControl`** — project visibility and edit rights (used with `check.project` middleware).
- **Policies** — e.g. `TaskPolicy` for `can:update,task` / `can:delete,task`.
- **Middleware aliases** (`bootstrap/app.php`): `check.role`, `check.project`, `active.user`.

---

## 4. Database structure (models and relationships)

Core **Eloquent** models live under `laravel/app/Models/`. Not exhaustive but covers the main graph:

| Model | Notes |
|-------|--------|
| **User** | Sanctum `HasApiTokens`, Spatie `HasRoles`. Relations: `teams`, `projects` / `accessibleProjects`, `assignedTasks`, `timeEntries`, `comments`. |
| **Team** | Has many projects; many-to-many users via `team_user`. |
| **Client** | Optional link for projects. |
| **Project** | Belongs to `team`, `client`, `owner`, etc. Many-to-many `users` (`project_user` + `project_members` pivots — **project_role** / **role**). Has many `tasks`, `statuses`, `sprints`. Soft deletes. |
| **Task** | Belongs to `project`, optional `sprint`, `parent` task, `status`. Assignees, dependencies (pivot), comments, attachments, time entries. Fields include `planned_start` / `planned_end`, `workflow_status`, `progress_percent`, agile fields (`story_points`, `duration_days`, …). Soft deletes. |
| **TaskStatus** | Per-project Kanban columns. |
| **Sprint** | Per project; tasks may reference `sprint_id`. |
| **TaskDependency** | Predecessor/successor graph for Gantt and risk. |
| **TaskComment**, **Attachment**, **TimeEntry** | Standard associations to `Task` / `User`. |
| **Notification** | User notifications (with optional related task, severity, etc.). |
| **Activity** / **ActivityLog** | Feed / audit (implementation split across migrations). |
| **ProjectInvitation** | Pending/accepted/declined invites. |
| **AiRecommendation** | Stored AI-style recommendations if used. |

**Migrations:** `laravel/database/migrations/` — includes users, teams, projects, tasks, task relations, permissions, notifications, sprints, activities, invitations, and incremental field additions (workflow, AI fields, user settings, indexes, etc.).

---

## 5. API routes and endpoints

- **Definition file:** `laravel/routes/api.php`.
- **Prefix:** Consumed as `/api/...` from the SPA (Vite proxy).

### 5.1 Public

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/` | API info JSON |
| POST | `/api/auth/register`, `/api/auth/login` | Auth |
| POST | `/api/auth/forgot-password`, `/api/auth/reset-password` | Password reset |
| GET | `/api/invitations/verify` | Invite verification |
| GET | `/api/invites/{token}` | Invite payload |

### 5.2 Authenticated (`auth:sanctum`, `active.user`)

**Auth & profile:** `/auth/logout`, `/me`, `/me/preferences`, `PUT /me`, `POST /me/avatar`, preferences, change password, logout-all-devices.

**Invitations (pending):** `GET invitations/pending`, `POST invitations/{token}/accept|decline`, legacy `my-invites`.

**Dashboards:** `GET member/dashboard`, `member/dashboard/summary`; **`GET admin/dashboard`** — middleware **`check.role:admin`**.

**Invites (create):** `POST invites`, `invites/accept`, `invites/decline`.

**Teams:** `apiResource teams`, plus add/remove members.

**Users (admin):** `apiResource users` except `show` — **`check.role:admin`**.

**Clients & projects:** `apiResource clients`, `apiResource projects`.

**Project-scoped** (middleware **`check.project:view`** or **`edit`**):

- View: `projects/{project}/dashboard`, `activity`, `members`, `critical-path`, `invite`, `export/tasks`, `sprints`, `backlog`, `statuses`, `tasks` (GET), Gantt **GET**, etc.
- Edit: `user-search`, `members` POST/DELETE, sprint CRUD, backlog reorder, task assign to sprint, statuses create/reorder, **Gantt PUT** (dates).

**Tasks:** `GET /tasks` (global index), project tasks, `GET/PUT/PATCH/DELETE` task by id with policies where applied; assignees, dependencies, comments, attachments, time entries, `PATCH move`.

**Role-restricted (`check.role:admin,member`):**

- `GET /calendar`
- `GET /gantt` (global; optional `?project_id=`)
- `GET /activity/feed`

**AI (`check.role:admin,member`):** prefix **`/ai`**: estimate, delay-risk (task/project), suggest-assignment, optimize-assignments, recommendations, workload-balance.

**Notifications:** index, summary, mark read, read-all.

> **Note:** Application **`viewer`** users are excluded from calendar, global gantt, activity feed, and all `/ai/*` routes by design.

---

## 6. Authentication and authorization

### 6.1 Application roles (Spatie)

- **`admin`** — Platform administration, user management, teams in UI, admin dashboard.
- **`member`** — Standard collaborator; full feature set except admin-only areas.
- **`viewer`** — Invited/read-oriented account (UI often labels “invité”); restricted sidebar and dashboards; several API areas return **403** (see §5).

Legacy name **`guest`** may be normalized to **`viewer`** in frontend helpers (`react/src/lib/roles.js`).

### 6.2 Project roles (pivot)

On `project_user` / `project_members`, roles such as **guest**, **member**, **admin** (project admin) control what a user can do **inside** a project (`AccessControl` + policies).

### 6.3 Token flow

- Login returns a token; SPA stores it in **`localStorage`** as `token` and sends `Authorization: Bearer <token>`.
- **`EnsureUserIsActive`** — inactive users may be blocked from API access.

### 6.4 Sanctum / SPA

- `.env`: `SANCTUM_STATEFUL_DOMAINS` includes `localhost:5173` for cookie-based flows if used alongside tokens.
- `FRONTEND_URL` used for mail links and web previews.

---

## 7. UI/UX structure (React)

### 7.1 Entry and shell

- **`react/src/main.jsx`** → **`App.jsx`** with `QueryClientProvider`, `BrowserRouter`, `AuthProvider`, `I18nProvider`, `Toaster`.
- **`AppLayout`** wraps authenticated routes (sidebar, topbar).

### 7.2 Routes (`App.jsx`)

| Path | Guard | Page |
|------|--------|------|
| `/` | Guest | Landing |
| `/login`, `/register` | Guest | Auth |
| `/reset-password` | Public | Reset |
| `/accept-invite` | Public | Accept invite |
| `/dashboard` | Auth | Dashboard |
| `/projects`, `/projects/:id` | Auth | Projects |
| `/tasks` | Auth | Tasks hub |
| `/calendar` | **admin, member** | Calendar |
| `/teams`, `/teams/:id` | **admin** | Teams |
| `/users` | **admin** | User admin |
| `/gantt` | **admin, member** | Gantt |
| `/ai` | **admin, member** | AI & analytics |
| `/notifications` | Auth | Notifications |
| `/settings` | Auth | Settings |

`RoleRoute` redirects unauthorized users to `/dashboard`.

### 7.3 Sidebar behavior (`components/layout/Sidebar.jsx`)

- **Admin:** sees Teams, Users, and all nav items allowed for members.
- **Viewer (`isGuestViewer`):** restricted to **Dashboard, Projects, Tasks, Notifications** (and Settings footer) — **no** Calendar, Gantt, AI, Teams, Users in the filtered list.

### 7.4 Dashboards (conceptual)

- **Admin:** global metrics, user tooling, full analytics blocks where enabled.
- **Member:** personal + project metrics, activity, workload-oriented widgets.
- **Viewer / guest:** **personal** focus — assigned / today / overdue tasks, assigned projects; reduced analytics; aligned with `member/dashboard` API usage where applicable.

---

## 8. AI, analytics, Gantt, calendar

### 8.1 AI (`AIService` + `AiController`)

- **Heuristic engine** (not necessarily external ML): duration estimation from story points and text, risk scoring, delay signals, assignment suggestions, project-level recommendations, workload balance.
- **API:** under `/api/ai/...`, **admin + member only**.

### 8.2 Gantt

- **Backend:** `GanttController` — tasks with `planned_start` (and end), critical path hints, dependencies; JSON shape includes `gantt` and `data` arrays (same payload).
- **Frontend:** `pages/gantt/GanttPage.jsx`, `components/gantt/GanttChart.jsx`, normalization helpers; error boundary and empty states to avoid blank screens.

### 8.3 Calendar

- **`CalendarController@index`** — aggregated events for timeline views (members/admins).

### 8.4 Activity feed

- **`ActivityFeedController`** — recent activity stream; **admin + member** only on API.

---

## 9. Configuration (environment variables and mail)

Key variables from **`laravel/.env.example`** (copy to `.env` and adjust):

| Variable | Role |
|----------|------|
| `APP_NAME`, `APP_URL`, `FRONTEND_URL` | Branding and link generation |
| `APP_KEY` | `php artisan key:generate` |
| `DB_*` | MySQL connection |
| `SANCTUM_STATEFUL_DOMAINS` | SPA origins (e.g. `localhost:5173`) |
| `SESSION_*` | Session driver (e.g. database) |
| `QUEUE_CONNECTION` | Often `database` for async jobs |
| `MAIL_*` | SMTP or `log` driver for dev |
| `BROADCAST_CONNECTION`, `REVERB_*` / `PUSHER_*`, `VITE_*` | Realtime |

**SMTP:** set `MAIL_MAILER=smtp` and host/port/credentials for production; use `MAIL_MAILER=log` locally.

**Scheduled tasks:** `notifications:smart` runs **hourly** (`bootstrap/app.php`).

---

## 10. Installation and setup

### 10.1 Prerequisites

- PHP **8.2+**, Composer, Node **18+**, MySQL (or compatible DB), optional Redis.

### 10.2 Backend

```bash
cd laravel
cp .env.example .env
composer install
php artisan key:generate
# Create database matching DB_DATABASE, then:
php artisan migrate
php artisan db:seed   # optional — use project seeders if present
php artisan serve     # http://localhost:8000
```

Optional: `php artisan queue:work`, Reverb for websockets.

### 10.3 Frontend

```bash
cd react
npm install
npm run dev             # http://localhost:5173 — proxies /api to :8000
```

Ensure Laravel `.env` has `FRONTEND_URL=http://localhost:5173` for CORS/mail links as needed.

### 10.4 First user / roles

- Register via API or seeder; assign Spatie roles (`admin`, `member`, `viewer`) via database or tinker according to your seeders.

### 10.5 Tests

```bash
cd laravel
php artisan test
```

---

## 11. Important notes and constraints

1. **API vs UI parity:** Some routes are forbidden to **`viewer`** on the API; the React app hides pages via `RoleRoute` and **Sidebar** — always keep them aligned when adding features.
2. **Project access:** Never bypass `check.project` / `AccessControl` for project-scoped data.
3. **Tokens:** SPA relies on **localStorage**; XSS hygiene matters.
4. **AI labeling:** “AI” in-product refers to **internal heuristics** unless you integrate an external LLM separately.
5. **Gantt data:** Tasks need **`planned_start`** (and sensible end) to appear in Gantt payloads.
6. **Mail:** Invitation and notification emails depend on queue + mail configuration in production.
7. **Monorepo layout:** Root contains **`laravel/`** and **`react/`** — deploy API and SPA accordingly (SPA build can be served by Laravel or a static host; adjust `APP_URL` / `FRONTEND_URL`).

---

## 12. Repository layout (quick reference)

```text
projet/
├── laravel/          # Laravel API
│   ├── app/
│   ├── routes/api.php
│   ├── database/migrations/
│   └── .env.example
├── react/            # Vite + React SPA
│   ├── src/
│   └── vite.config.js
└── claude.md         # This file
```

---

*Last aligned with the codebase structure and routes as documented above; after large refactors, re-scan `routes/api.php` and `App.jsx` for drift.*
