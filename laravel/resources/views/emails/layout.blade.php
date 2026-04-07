<!doctype html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $subject ?? config('app.name') }}</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;color:#0f172a;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:24px 12px;">
    <tr>
        <td align="center">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;">
                <tr>
                    <td style="background:#1e40af;color:#ffffff;padding:16px 20px;border-radius:12px 12px 0 0;">
                        <div style="font-size:20px;font-weight:700;letter-spacing:.2px;">{{ config('app.name', 'Gestion Projets') }}</div>
                    </td>
                </tr>
                <tr>
                    <td style="background:#ffffff;padding:24px 20px;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px;">
                        @yield('content')
                    </td>
                </tr>
                <tr>
                    <td style="padding:16px 6px 0 6px;">
                        <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.6;">
                            {{ config('app.name', 'Gestion Projets') }} — Cet e-mail a été envoyé automatiquement.<br>
                            Besoin d'aide ? Contactez le support : <a href="mailto:support@example.com" style="color:#2563eb;text-decoration:none;">support@example.com</a>
                        </p>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>
</body>
</html>

