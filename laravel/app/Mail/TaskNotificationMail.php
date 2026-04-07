<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class TaskNotificationMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @param  array<string,mixed>  $payload
     */
    public function __construct(
        public string $subjectLine,
        public string $title,
        public string $message,
        public string $ctaLabel,
        public string $ctaUrl,
        public array $payload = [],
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->subjectLine,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.task-notification',
            text: 'emails.task-notification-plain',
        );
    }
}

