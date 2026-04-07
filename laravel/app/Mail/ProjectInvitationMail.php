<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ProjectInvitationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $inviteeName,
        public string $inviterName,
        public string $projectName,
        public string $roleLabel,
        public string $acceptUrl,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Vous êtes invité(e) à rejoindre un projet',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.project-invitation',
            text: 'emails.project-invitation-plain',
        );
    }
}

