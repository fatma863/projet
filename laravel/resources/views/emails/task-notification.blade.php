@extends('emails.layout')

@section('content')
    <h1 style="margin:0 0 14px 0;font-size:22px;line-height:1.3;color:#0f172a;font-weight:700;">
        {{ $title }}
    </h1>

    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#374151;">
        {{ $message }}
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px 0;">
        <tr>
            <td style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px;">
                <p style="margin:0;font-size:14px;color:#0f172a;line-height:1.7;">
                    @if(!empty($payload['project_name']) || !empty($payload['project_id']))
                        <strong>Projet :</strong> {{ $payload['project_name'] ?? ('#'.$payload['project_id']) }}<br>
                    @endif
                    @if(!empty($payload['task_name']) || !empty($payload['task_id']))
                        <strong>Tâche :</strong> {{ $payload['task_name'] ?? ('#'.$payload['task_id']) }}
                    @endif
                </p>
            </td>
        </tr>
    </table>

    <a href="{{ $ctaUrl }}"
       style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:10px;font-size:14px;font-weight:700;">
        {{ $ctaLabel }}
    </a>

    <p style="margin:18px 0 0 0;font-size:12px;color:#6b7280;line-height:1.6;">
        Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
        <a href="{{ $ctaUrl }}" style="color:#2563eb;word-break:break-all;">{{ $ctaUrl }}</a>
    </p>
@endsection

