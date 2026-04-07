<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationPreferencesController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        return response()->json($this->preferencesPayload($request->user()));
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'notify_in_app' => 'sometimes|boolean',
            'notify_email' => 'sometimes|boolean',
            'notify_type_task_assigned' => 'sometimes|boolean',
            'notify_type_comment' => 'sometimes|boolean',
            'notify_type_task_delayed' => 'sometimes|boolean',
        ]);

        $request->user()->update($data);

        return response()->json([
            'message' => 'Préférences de notifications enregistrées.',
            'preferences' => $this->preferencesPayload($request->user()->fresh()),
        ]);
    }

    /**
     * @return array<string, bool>
     */
    protected function preferencesPayload(User $user): array
    {
        return [
            'notify_in_app' => (bool) ($user->notify_in_app ?? true),
            'notify_email' => (bool) ($user->notify_email ?? false),
            'notify_type_task_assigned' => (bool) ($user->notify_type_task_assigned ?? true),
            'notify_type_comment' => (bool) ($user->notify_type_comment ?? true),
            'notify_type_task_delayed' => (bool) ($user->notify_type_task_delayed ?? true),
        ];
    }
}
