<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProjectResource;
use App\Http\Resources\TaskResource;
use App\Http\Resources\UserResource;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Support\AccessControl;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GlobalSearchController extends Controller
{
    /**
     * Recherche rapide : tâches, projets, utilisateurs (périmètre selon le rôle).
     */
    public function __invoke(Request $request): JsonResponse
    {
        $term = trim((string) $request->input('q', ''));
        if (mb_strlen($term) < 2) {
            return response()->json([
                'tasks' => [],
                'projects' => [],
                'users' => [],
            ]);
        }

        $user = $request->user();
        $like = '%'.str_replace(['%', '_'], ['\\%', '\\_'], $term).'%';

        $tasks = Task::query()
            ->accessibleBy($user)
            ->select(Task::API_INDEX_COLUMNS)
            ->where(function ($q) use ($like) {
                $q->where('title', 'like', $like)
                    ->orWhere('description', 'like', $like);
            })
            ->with([
                'status' => fn ($q) => $q->select('id', 'project_id', 'name', 'color', 'order', 'is_default'),
                'project' => fn ($q) => $q->select('id', 'name', 'code'),
            ])
            ->orderByDesc('updated_at')
            ->limit(8)
            ->get();

        $projectsQuery = Project::query()
            ->with(['owner', 'team', 'manager'])
            ->where(function ($q) use ($like) {
                $q->where('name', 'like', $like)
                    ->orWhere('code', 'like', $like);
            })
            ->orderByDesc('updated_at')
            ->limit(6);

        if (! AccessControl::isAdmin($user)) {
            $projectsQuery->accessibleToUser($user);
        }

        $projects = $projectsQuery->get();

        $users = $this->searchUsers($user, $like);

        return response()->json([
            'tasks' => TaskResource::collection($tasks),
            'projects' => ProjectResource::collection($projects),
            'users' => UserResource::collection($users),
        ]);
    }

    /**
     * @return \Illuminate\Support\Collection<int, User>
     */
    private function searchUsers(User $user, string $like)
    {
        $q = User::query()
            ->where(function ($q2) use ($like) {
                $q2->where('name', 'like', $like)
                    ->orWhere('email', 'like', $like);
            })
            ->limit(6);

        if (AccessControl::isAdmin($user)) {
            return $q->orderBy('name')->get();
        }

        $projectIds = Project::query()
            ->accessibleToUser($user)
            ->pluck('id');

        if ($projectIds->isEmpty()) {
            return collect();
        }

        return $q->where(function ($q2) use ($projectIds) {
            $q2->whereHas('projects', fn ($qp) => $qp->whereIn('projects.id', $projectIds))
                ->orWhereHas('accessibleProjects', fn ($qp) => $qp->whereIn('projects.id', $projectIds))
                ->orWhereHas('ownedProjects', fn ($qp) => $qp->whereIn('projects.id', $projectIds));
        })
            ->orderBy('name')
            ->get();
    }
}
