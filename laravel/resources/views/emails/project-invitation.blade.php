@extends('emails.layout')

@section('content')
    <h1 style="margin:0 0 14px 0;font-size:24px;line-height:1.3;color:#0f172a;font-weight:700;">
        Vous êtes invité(e) à rejoindre un projet
    </h1>

    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#374151;">
        Bonjour {{ $inviteeName ?: 'à vous' }},<br>
        <strong>{{ $inviterName }}</strong> vous a invité à rejoindre le projet
        <strong>{{ $projectName }}</strong> en tant que <strong>{{ $roleLabel }}</strong>.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px 0;">
        <tr>
            <td style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px;">
                <p style="margin:0;font-size:14px;color:#0f172a;line-height:1.7;">
                    <strong>Projet :</strong> {{ $projectName }}<br>
                    <strong>Rôle proposé :</strong> {{ $roleLabel }}
                </p>
            </td>
        </tr>
    </table>

    <a href="{{ $acceptUrl }}"
       style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:10px;font-size:14px;font-weight:700;">
        Accepter l’invitation
    </a>

    <p style="margin:18px 0 0 0;font-size:12px;color:#6b7280;line-height:1.6;">
        Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
        <a href="{{ $acceptUrl }}" style="color:#2563eb;word-break:break-all;">{{ $acceptUrl }}</a>
    </p>
@endsection

