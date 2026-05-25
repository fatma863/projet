<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationPreferencesController extends Controller
{
    private const PREF_KEYS = [
        'notify_in_app',
        'notify_email',
        'notify_type_task_assigned',
        'notify_type_task_updated',
        'notify_type_task_completed',
        'notify_type_comment',
        'notify_type_task_delayed',
        'notify_type_permission',
        'notify_type_invitation',
        'notify_type_ai_alert',
        'notify_type_project',
    ];

    public function show(Request $request): JsonResponse
    {
        return response()->json($this->preferencesPayload($request->user()));
    }

    public function update(Request $request): JsonResponse
    {
        $rules = array_fill_keys(self::PREF_KEYS, 'sometimes|boolean');
        $data  = $request->validate($rules);

        $request->user()->update($data);

        return response()->json([
            'message'     => 'Préférences de notifications enregistrées.',
            'preferences' => $this->preferencesPayload($request->user()->fresh()),
        ]);
    }

    protected function preferencesPayload(User $user): array
    {
        return [
            'notify_in_app'              => (bool) ($user->notify_in_app              ?? true),
            'notify_email'               => (bool) ($user->notify_email               ?? false),
            'notify_type_task_assigned'  => (bool) ($user->notify_type_task_assigned  ?? true),
            'notify_type_task_updated'   => (bool) ($user->notify_type_task_updated   ?? true),
            'notify_type_task_completed' => (bool) ($user->notify_type_task_completed ?? true),
            'notify_type_comment'        => (bool) ($user->notify_type_comment        ?? true),
            'notify_type_task_delayed'   => (bool) ($user->notify_type_task_delayed   ?? true),
            'notify_type_permission'     => (bool) ($user->notify_type_permission     ?? true),
            'notify_type_invitation'     => (bool) ($user->notify_type_invitation     ?? true),
            'notify_type_ai_alert'       => (bool) ($user->notify_type_ai_alert       ?? true),
            'notify_type_project'        => (bool) ($user->notify_type_project        ?? true),
        ];
    }
}
