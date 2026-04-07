<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\UserManagementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function __construct(
        private readonly UserManagementService $userManagementService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $users = $this->userManagementService->paginateUsers(
            (string) $request->input('search', ''),
            $request->filled('status') ? (string) $request->input('status') : null,
            $request->integer('per_page', 25),
        );

        return response()->json(UserResource::collection($users)->response()->getData(true));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            'password' => 'required|string|min:6|confirmed',
            'password_confirmation' => 'required|string|min:6',
            'status' => 'sometimes|string|in:active,disabled',
            'role' => 'sometimes|string|in:admin,member,viewer',
        ]);

        $user = $this->userManagementService->createUser($data);

        return response()->json([
            'message' => 'Utilisateur créé avec succès.',
            'user' => new UserResource($user->fresh()),
        ], 201);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|email|max:255|unique:users,email,'.$user->id,
            'password' => 'sometimes|nullable|string|min:6|confirmed',
            'password_confirmation' => 'sometimes|nullable|string|min:6',
            'status' => 'sometimes|string|in:active,disabled',
            'role' => 'sometimes|string|in:admin,member,viewer',
        ]);

        $user = $this->userManagementService->updateUser($request->user(), $user, $data);

        return response()->json([
            'message' => 'Utilisateur mis à jour.',
            'user' => new UserResource($user->fresh()),
        ]);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        $this->userManagementService->disableUser($request->user(), $user);

        return response()->json(['message' => 'Utilisateur désactivé.']);
    }
}
