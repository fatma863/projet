<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class FollowerController extends Controller
{
    /**
     * GET /projects/{project}/followers
     */
    public function index(Project $project): JsonResponse
    {
        $followers = $project->followers()->select('users.id', 'users.name', 'users.email')->get();

        return response()->json([
            'data'          => $followers,
            'is_following'  => $followers->contains('id', Auth::id()),
        ]);
    }

    /**
     * POST /projects/{project}/follow
     */
    public function follow(Project $project): JsonResponse
    {
        $project->followers()->syncWithoutDetaching([Auth::id()]);

        return response()->json(['message' => 'Vous suivez ce projet.', 'is_following' => true]);
    }

    /**
     * DELETE /projects/{project}/follow
     */
    public function unfollow(Project $project): JsonResponse
    {
        $project->followers()->detach(Auth::id());

        return response()->json(['message' => 'Vous ne suivez plus ce projet.', 'is_following' => false]);
    }
}
