<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ActivityResource;
use App\Models\Activity;
use App\Models\Project;
use App\Support\ApiPagination;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ActivityFeedController extends Controller
{
    /**
     * Fil d’activité pour les projets accessibles à l’utilisateur.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $accessibleProjectSub = Project::query()->accessibleToUser($user)->select('projects.id');

        $query = Activity::query()
            ->select(['id', 'user_id', 'action', 'target_type', 'target_id', 'project_id', 'metadata', 'created_at'])
            ->with(['user:id,name,avatar,profile_photo'])
            ->whereIn('project_id', $accessibleProjectSub)
            ->orderByDesc('created_at');

        if ($request->filled('action')) {
            $query->where('action', $request->string('action'));
        }

        if ($request->filled('project_id')) {
            $pid = (int) $request->input('project_id');
            $allowed = Project::query()->accessibleToUser($user)->where('projects.id', $pid)->exists();
            if (! $allowed) {
                abort(403);
            }
            $query->where('project_id', $pid);
        }

        $paginator = $query->paginate(ApiPagination::perPage($request, 30, 100));

        return response()->json([
            'activities' => ActivityResource::collection($paginator),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }
}
