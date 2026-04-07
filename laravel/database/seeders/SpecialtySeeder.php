<?php

namespace Database\Seeders;

use App\Models\Specialty;
use Illuminate\Database\Seeder;

class SpecialtySeeder extends Seeder
{
    public function run(): void
    {
        $specialties = [
            ['name' => 'Frontend',        'description' => 'Développement UI/UX, HTML, CSS, JavaScript, React, Vue…',  'color' => '#3b82f6'],
            ['name' => 'Backend',         'description' => 'APIs, bases de données, logique serveur, Laravel, Node…',  'color' => '#8b5cf6'],
            ['name' => 'DevOps',          'description' => 'CI/CD, Docker, Kubernetes, cloud, infrastructure…',         'color' => '#f59e0b'],
            ['name' => 'Mobile',          'description' => 'iOS, Android, React Native, Flutter…',                      'color' => '#10b981'],
            ['name' => 'QA / Tests',      'description' => 'Assurance qualité, tests unitaires, e2e, performance…',    'color' => '#ef4444'],
            ['name' => 'Design / UX',     'description' => 'Figma, prototypage, design system, accessibilité…',        'color' => '#ec4899'],
            ['name' => 'Sécurité',        'description' => 'Audit, pentesting, conformité, cryptographie…',            'color' => '#dc2626'],
            ['name' => 'Data / BI',       'description' => 'Analyse de données, SQL avancé, ETL, dashboards…',         'color' => '#0ea5e9'],
            ['name' => 'Machine Learning','description' => 'ML, deep learning, NLP, modèles, Python…',                 'color' => '#14b8a6'],
            ['name' => 'Gestion projet',  'description' => 'Planification, Agile/Scrum, suivi, coordination…',         'color' => '#a855f7'],
        ];

        foreach ($specialties as $data) {
            Specialty::firstOrCreate(['name' => $data['name']], $data);
        }
    }
}
