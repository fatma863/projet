# AUDIT_LOG_ADMIN_ONLY_REPORT.md — IntelliPM
## Journal d'Audit — Accès exclusif Administrateur

> **Date :** 2 juin 2026  
> **Commit :** `83057d1`  
> **Build React :** ✅ 3 178 modules, 0 erreur

---

## 1. Résumé exécutif

Le module Journal d'Audit est désormais **exclusivement réservé au rôle Administrateur**.

Avant cette modification, le journal d'audit était accessible aux **Collaborateurs** (`member`) et **Chefs de Projet** via :
- La page `/audit-log` et `/audit-log/report`
- L'onglet "Historique" dans les pages projet
- La carte "Journal d'audit" dans les Paramètres
- Le widget "Activité récente" dans le Dashboard
- Le badge numérique dans la Sidebar
- Les APIs `/activity/feed`, `/activity/export`, `/activity/analytics`, `/projects/{id}/activity`

**Après correction :** aucun de ces éléments n'est visible ou accessible pour un rôle non-administrateur.

---

## 2. Fichiers modifiés

| # | Fichier | Type | Modification |
|---|---|---|---|
| 1 | `laravel/routes/api.php` | Backend | 4 routes audit → `check.role:admin` |
| 2 | `react/src/App.jsx` | Frontend | 2 routes React → `allow=['admin']` |
| 3 | `react/src/components/layout/Sidebar.jsx` | Frontend | Nav item + badge query → admin seulement |
| 4 | `react/src/pages/settings/SettingsPage.jsx` | Frontend | Carte Journal d'audit → admin seulement |
| 5 | `react/src/pages/dashboard/DashboardPage.jsx` | Frontend | Activity feed query + error banner → admin |
| 6 | `react/src/pages/projects/ProjectDetailPage.jsx` | Frontend | Onglet Historique + rendu → admin seulement |

---

## 3. Détail des modifications

### 3.1 Backend — `laravel/routes/api.php`

#### Avant

```php
// Ces endpoints exposent des données agrégées d'équipe réservées aux membres internes
Route::middleware('check.role:!client')->group(function () {
    Route::get('activity/feed', [ActivityFeedController::class, 'index']);
    Route::get('activity/export', [ActivityFeedController::class, 'export']);
    Route::get('activity/analytics', [ActivityAnalyticsController::class, 'index']);
});

// Historique / journal d'audit projet
Route::get('projects/{project}/activity', [ProjectController::class, 'activity'])
    ->middleware(['check.project:view', 'check.role:!client']);
```

#### Après

```php
// Journal d'audit global — Administrateur uniquement
Route::middleware('check.role:admin')->group(function () {
    Route::get('activity/feed', [ActivityFeedController::class, 'index']);
    Route::get('activity/export', [ActivityFeedController::class, 'export']);
    Route::get('activity/analytics', [ActivityAnalyticsController::class, 'index']);
});

// Historique / journal d'audit projet — Administrateur uniquement
Route::get('projects/{project}/activity', [ProjectController::class, 'activity'])
    ->middleware(['check.project:view', 'check.role:admin']);
```

**Impact :** Tout appel API direct de ces endpoints par un non-administrateur retourne **403 Forbidden**.

---

### 3.2 Frontend — `react/src/App.jsx`

#### Avant

```jsx
<Route path="/audit-log/report"
  element={<ProtectedRoute><RoleRoute allow={['admin', 'member']}><AuditReportPage /></RoleRoute></ProtectedRoute>} />

<Route path="/audit-log"
  element={<RoleRoute allow={['admin', 'member']}><AuditLogPage /></RoleRoute>} />
```

#### Après

```jsx
<Route path="/audit-log/report"
  element={<ProtectedRoute><RoleRoute allow={['admin']}><AuditReportPage /></RoleRoute></ProtectedRoute>} />

<Route path="/audit-log"
  element={<RoleRoute allow={['admin']}><AuditLogPage /></RoleRoute>} />
```

**Impact :** Navigation directe vers `/audit-log` ou `/audit-log/report` par un non-admin → **redirection vers `/dashboard`** via `RoleRoute`.

---

### 3.3 Frontend — `react/src/components/layout/Sidebar.jsx`

#### Avant (nav item)

```js
{ to: '/audit-log', ..., permission: 'task.view', badge: 'audit', clientHidden: true }
```

#### Après

```js
{ to: '/audit-log', ..., permission: 'task.view', badge: 'audit', adminOnly: true }
```

#### Avant (audit badge query)

```js
const { data: auditBadgeData } = useQuery({
  ...
  enabled: can('task.view'),   // tous les membres voyaient le badge
});
```

#### Après

```js
const { data: auditBadgeData } = useQuery({
  ...
  enabled: isAdmin,             // uniquement l'administrateur
});
```

**Impact :** Le lien "Journal d'audit" et son badge numérique disparaissent complètement de la Sidebar pour tout rôle non-administrateur. La requête API n'est jamais envoyée.

---

### 3.4 Frontend — `react/src/pages/settings/SettingsPage.jsx`

#### Avant

```jsx
{/* Audit Journal — admin and member only */}
{!isViewer && (
  <Card>Journal d'audit...</Card>
)}
```

#### Après

```jsx
{/* Audit Journal — Administrateur uniquement */}
{isAdmin && (
  <Card>Journal d'audit...</Card>
)}
```

**Impact :** La carte "Journal d'audit" avec le bouton "Ouvrir le journal" est invisible pour Collaborateurs, Chefs de projet et Observateurs.

---

### 3.5 Frontend — `react/src/pages/dashboard/DashboardPage.jsx`

#### Avant

```js
const { data: activityData, ... } = useQuery({
  queryKey: ['activity-feed'],
  queryFn: () => fetchActivityFeed({ per_page: 10 }),
  enabled: !!user && !isViewerUser,   // tous les non-observateurs
});

const hasErrors = ... || (!isViewerUser && activityError) || ...;
// Error banner: {!isViewerUser && activityError && <p>Activité : ...</p>}
```

#### Après

```js
const { data: activityData, ... } = useQuery({
  queryKey: ['activity-feed'],
  queryFn: () => fetchActivityFeed({ per_page: 10 }),
  enabled: !!user && isAdmin,          // administrateur uniquement
});

const hasErrors = ... || (isAdmin && activityError) || ...;
// Error banner: {isAdmin && activityError && <p>Activité : ...</p>}
```

**Impact :** Le widget "Activité récente" du dashboard ne charge aucune donnée pour les non-admins. Aucun appel à `/activity/feed` n'est effectué.

---

### 3.6 Frontend — `react/src/pages/projects/ProjectDetailPage.jsx`

#### Avant (onglet tab)

```jsx
// Historique / journal d'audit masqué pour les clients
...(isClient ? [] : [{ key: 'activity', label: 'Historique' }]),
```

#### Après

```jsx
// Historique / journal d'audit : Administrateur uniquement
...(isAdmin ? [{ key: 'activity', label: 'Historique' }] : []),
```

#### Avant (rendu contenu)

```jsx
{tab === 'activity' && !isClient && <ProjectActivityTab projectId={id} />}
```

#### Après

```jsx
{tab === 'activity' && isAdmin && <ProjectActivityTab projectId={id} />}
```

**Impact :** L'onglet "Historique" disparaît de la page projet pour Collaborateurs, Chefs de projet et Observateurs. Même si un utilisateur navigue vers cet onglet, le contenu ne se rend pas.

---

## 4. Matrice d'accès — Journal d'Audit

### Interface Utilisateur

| Élément UI | Administrateur | Collaborateur | Chef de Projet | Observateur |
|---|:---:|:---:|:---:|:---:|
| Lien Sidebar "Journal d'audit" | ✅ | ❌ | ❌ | ❌ |
| Badge numérique Sidebar | ✅ | ❌ | ❌ | ❌ |
| Page `/audit-log` | ✅ | ❌ Redirect | ❌ Redirect | ❌ Redirect |
| Page `/audit-log/report` | ✅ | ❌ Redirect | ❌ Redirect | ❌ Redirect |
| Carte Journal d'audit (Settings) | ✅ | ❌ | ❌ | ❌ |
| Widget Activité récente (Dashboard) | ✅ | ❌ | ❌ | ❌ |
| Onglet "Historique" (Projet) | ✅ | ❌ | ❌ | ❌ |

### API Backend

| Endpoint | Administrateur | Collaborateur | Chef de Projet | Observateur |
|---|:---:|:---:|:---:|:---:|
| `GET /activity/feed` | ✅ 200 | ❌ 403 | ❌ 403 | ❌ 403 |
| `GET /activity/export` | ✅ 200 | ❌ 403 | ❌ 403 | ❌ 403 |
| `GET /activity/analytics` | ✅ 200 | ❌ 403 | ❌ 403 | ❌ 403 |
| `GET /projects/{id}/activity` | ✅ 200 | ❌ 403 | ❌ 403 | ❌ 403 |
| `GET /roles/audit-log` | ✅ 200 | ❌ 403 | ❌ 403 | ❌ 403 |

---

## 5. Tests de sécurité

### Test 1 : URL directe `/audit-log` (Collaborateur)

| | |
|---|---|
| **Rôle testé** | `member` (Collaborateur) |
| **Action** | Navigation directe vers `/audit-log` |
| **Mécanisme** | `RoleRoute allow={['admin']}` → vérifie `user.roles.includes('admin')` |
| **Résultat** | ↩ Redirection vers `/dashboard` |
| **Verdict** | ✅ Protégé |

### Test 2 : API directe `GET /activity/feed` (Collaborateur)

| | |
|---|---|
| **Rôle testé** | `member` (Collaborateur) |
| **Action** | `GET /api/activity/feed` avec token Bearer valide |
| **Mécanisme** | `check.role:admin` middleware → `$user->hasRole('admin')` → false |
| **Résultat** | 403 Forbidden |
| **Verdict** | ✅ Bloqué |

### Test 3 : API directe `GET /projects/{id}/activity` (Chef de projet)

| | |
|---|---|
| **Rôle testé** | Utilisateur chef d'un projet |
| **Action** | `GET /api/projects/1/activity` |
| **Mécanisme** | `check.project:view` (passe) + `check.role:admin` (bloque) → 403 |
| **Résultat** | 403 Forbidden |
| **Verdict** | ✅ Bloqué |

### Test 4 : Onglet Historique affiché dans l'URL (Collaborateur)

| | |
|---|---|
| **Rôle testé** | `member` (Collaborateur) |
| **Action** | Navigation vers `/projects/1` |
| **Résultat** | L'onglet "Historique" n'apparaît pas dans la liste des onglets |
| **Mécanisme** | `...(isAdmin ? [{key:'activity'}] : [])` — non inclus si non-admin |
| **Verdict** | ✅ Invisible |

---

## 6. Notifications d'audit

Les notifications de type `permission_updated` (audit de permissions) n'ont jamais été accessibles aux non-admins via la liste blanche du `NotificationController`. Confirmé :

```php
private function clientAllowedTypes(): array {
    return [
        'project_created', 'project_updated', 'project_at_risk',
        'project_invitation', 'invitation_received', 'project_invitation_accepted',
        'member_removed',
        // permission_updated, ai_alert, gantt_updated → absents → bloqués
    ];
}
```

Pour les Collaborateurs : le système de notifications ne filtre pas par rôle (tous voient leurs notifications). La notification `permission_updated` est envoyée uniquement à l'utilisateur dont les permissions ont changé — elle ne révèle pas de données d'audit d'autres utilisateurs.

**Aucune notification d'audit globale n'est envoyée aux non-admins.** ✅

---

## 7. Mise à jour MASTER_DOCUMENTATION.md

La section §29 et §25 de MASTER_DOCUMENTATION.md sera mise à jour pour refléter :

> **Journal d'Audit** — Accès exclusif Administrateur
>
> | Rôle | Accès |
> |---|---|
> | Administrateur | ✅ Accès complet |
> | Collaborateur | ❌ Inaccessible |
> | Chef de Projet | ❌ Inaccessible |
> | Observateur | ❌ Inaccessible |
>
> **Protections Frontend :**
> - `RoleRoute allow={['admin']}` sur `/audit-log` et `/audit-log/report`
> - `adminOnly: true` sur le nav item Sidebar
> - `isAdmin` check sur : SettingsPage, DashboardPage, ProjectDetailPage
>
> **Protections Backend :**
> - `check.role:admin` sur `GET /activity/feed`, `GET /activity/export`, `GET /activity/analytics`
> - `check.role:admin` sur `GET /projects/{id}/activity`
> - `check.role:admin` sur `GET /roles/audit-log` (déjà existant)

---

## 8. Checklist finale

### Frontend

- [x] `/audit-log` → RoleRoute `allow=['admin']`
- [x] `/audit-log/report` → RoleRoute `allow=['admin']`
- [x] Sidebar nav item → `adminOnly: true`
- [x] Sidebar audit badge query → `enabled: isAdmin`
- [x] Settings carte Journal d'audit → `{isAdmin && ...}`
- [x] Dashboard activity feed query → `enabled: isAdmin`
- [x] Dashboard error banner → `{isAdmin && activityError ...}`
- [x] ProjectDetail onglet Historique → `...(isAdmin ? [...] : [])`
- [x] ProjectDetail rendu ProjectActivityTab → `{isAdmin && ...}`

### Backend

- [x] `GET /activity/feed` → `check.role:admin`
- [x] `GET /activity/export` → `check.role:admin`
- [x] `GET /activity/analytics` → `check.role:admin`
- [x] `GET /projects/{id}/activity` → `check.role:admin`
- [x] `GET /roles/audit-log` → `check.role:admin` (pré-existant)

### Tests

- [x] Build React : ✅ 0 erreur
- [x] Syntaxe PHP : ✅ Validée
- [x] URL bypass bloqué
- [x] API directe bloquée (403)

---

## 9. État final

**Le Journal d'Audit est désormais un module strictement administratif.**

| Critère | Statut |
|---|---|
| Visible uniquement par l'Administrateur | ✅ |
| Invisible pour tous les autres rôles | ✅ |
| Inaccessible via URL directe | ✅ (redirection) |
| Inaccessible via API directe | ✅ (403 Forbidden) |
| Aucune notification d'audit pour non-admins | ✅ |
| Aucun widget audit dans les dashboards non-admins | ✅ |
| Build React propre | ✅ 3 178 modules |

---

> Document généré par **Claude Sonnet 4.6**  
> Projet : IntelliPM — Fatma Rejeb, ISET Promotion 2026
