<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\NotificationService;
use DateTimeZone;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(RegisterRequest $request, NotificationService $notificationService): JsonResponse
    {
        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'status' => 'active',
        ]);

        // Tout nouveau compte doit avoir un rôle applicatif explicite
        // pour éviter les 403 sur les routes protégées par check.role.
        if (! $user->hasAnyRole(['admin', 'member', 'viewer'])) {
            $user->assignRole('member');
        }

        $notificationService->notifyPendingInvitationsAfterRegistration($user);

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'message' => 'Inscription réussie.',
            'user' => new UserResource($user),
            'token' => $token,
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $candidate = User::query()->where('email', $request->email)->first();
        if ($candidate && $candidate->status === 'disabled') {
            throw ValidationException::withMessages([
                'email' => ['Ce compte est désactivé. Contactez un administrateur.'],
            ]);
        }

        if (! Auth::attempt($request->only('email', 'password'))) {
            throw ValidationException::withMessages([
                'email' => ['Les identifiants sont incorrects.'],
            ]);
        }

        $user = Auth::user();
        $user->tokens()->delete();
        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'message' => 'Connexion réussie.',
            'user' => new UserResource($user),
            'token' => $token,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Déconnexion réussie.',
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => new UserResource($request->user()),
        ]);
    }

    public function updateMe(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|email|max:255|unique:users,email,'.$user->id,
            'timezone' => ['sometimes', 'nullable', 'string', Rule::in(DateTimeZone::listIdentifiers())],
            'locale' => 'sometimes|string|in:fr,en',
        ]);

        $user->update($data);

        return response()->json([
            'message' => 'Profil mis à jour.',
            'user' => new UserResource($user->fresh()),
        ]);
    }

    public function updateAvatar(Request $request): JsonResponse
    {
        $request->validate([
            'avatar' => 'required|image|max:4096',
        ]);

        $user = $request->user();
        $old = $user->avatar ?: $user->profile_photo;
        if ($old && Storage::disk('public')->exists($old)) {
            Storage::disk('public')->delete($old);
        }

        $path = $request->file('avatar')->store('avatars', 'public');
        $user->update(['avatar' => $path]);

        return response()->json([
            'message' => 'Photo de profil mise à jour.',
            'user' => new UserResource($user->fresh()),
        ]);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'confirmed', PasswordRule::defaults()],
        ]);

        if (! Hash::check($request->current_password, $request->user()->getAuthPassword())) {
            throw ValidationException::withMessages([
                'current_password' => ['Le mot de passe actuel est incorrect.'],
            ]);
        }

        $request->user()->update(['password' => $request->password]);

        return response()->json([
            'message' => 'Mot de passe modifié.',
        ]);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        Password::sendResetLink($request->only('email'));

        return response()->json([
            'message' => 'Si un compte existe pour cet e-mail, un lien de réinitialisation a été envoyé.',
        ]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'token' => 'required|string',
            'email' => 'required|email',
            'password' => ['required', 'confirmed', PasswordRule::defaults()],
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password) {
                $user->password = $password;
                $user->save();
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages([
                'email' => [__($status)],
            ]);
        }

        return response()->json([
            'message' => 'Mot de passe réinitialisé. Vous pouvez vous connecter.',
        ]);
    }

    public function logoutAllDevices(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->tokens()->delete();
        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'message' => 'Toutes les autres sessions ont été fermées. Vous restez connecté sur cet appareil.',
            'token' => $token,
            'user' => new UserResource($user->fresh()),
        ]);
    }

    public function updatePreferences(Request $request): JsonResponse
    {
        $data = $request->validate([
            'notify_in_app' => 'sometimes|boolean',
            'notify_email' => 'sometimes|boolean',
            'theme' => 'sometimes|nullable|string|in:light,dark,system',
            'timezone' => ['sometimes', 'nullable', 'string', Rule::in(DateTimeZone::listIdentifiers())],
            'locale' => 'sometimes|string|in:fr,en',
            'language' => 'sometimes|string|in:fr,en',
            'notify_type_task_assigned' => 'sometimes|boolean',
            'notify_type_comment' => 'sometimes|boolean',
            'notify_type_task_delayed' => 'sometimes|boolean',
        ]);

        if (array_key_exists('language', $data) && ! array_key_exists('locale', $data)) {
            $data['locale'] = $data['language'];
        }
        unset($data['language']);

        $request->user()->update($data);

        return response()->json([
            'message' => 'Préférences enregistrées.',
            'user' => new UserResource($request->user()->fresh()),
        ]);
    }

    public function preferences(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'theme' => $user->theme ?: 'light',
            'language' => $user->locale ?: 'fr',
            'locale' => $user->locale ?: 'fr',
        ]);
    }
}
