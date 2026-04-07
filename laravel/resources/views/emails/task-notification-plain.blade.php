{{ $title }}

{{ $message }}

@if(!empty($payload['project_name']) || !empty($payload['project_id']))
Projet : {{ $payload['project_name'] ?? ('#'.$payload['project_id']) }}
@endif
@if(!empty($payload['task_name']) || !empty($payload['task_id']))
Tâche : {{ $payload['task_name'] ?? ('#'.$payload['task_id']) }}
@endif

{{ $ctaLabel }} : {{ $ctaUrl }}

