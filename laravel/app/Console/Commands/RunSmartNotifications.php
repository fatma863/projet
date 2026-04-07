<?php

namespace App\Console\Commands;

use App\Services\NotificationService;
use Illuminate\Console\Command;

class RunSmartNotifications extends Command
{
    protected $signature = 'notifications:smart';

    protected $description = 'Analyse les retards, la surcharge et les projets à risque ; émet des notifications.';

    public function handle(NotificationService $notificationService): int
    {
        $notificationService->runScheduledSmartChecks();
        $this->info('Smart notification scan completed.');

        return self::SUCCESS;
    }
}
