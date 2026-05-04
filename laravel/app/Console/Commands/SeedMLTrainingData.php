<?php

namespace App\Console\Commands;

use Database\Seeders\MLTrainingDataSeeder;
use Illuminate\Console\Command;

class SeedMLTrainingData extends Command
{
    protected $signature   = 'ml:seed-training-data';
    protected $description = 'Seed the database with realistic training data for the ML recommendation model';

    public function handle(): int
    {
        $this->info('');
        $this->info('Seeding ML training data (specialties, users, projects, tasks)...');
        $this->info('');

        $seeder = new MLTrainingDataSeeder();
        $seeder->setCommand($this);
        $seeder->run();

        $this->info('');
        $this->info('Done. Now run: php artisan ml:train');
        $this->info('');

        return self::SUCCESS;
    }
}
