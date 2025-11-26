<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class TestMongo extends Command
{
    protected $signature = 'mongo:test';
    protected $description = 'Test MongoDB connection';

    public function handle()
    {
        try {
            // Test connection
            $connection = DB::connection('mongodb');
            $db = $connection->getMongoDB();

            // Ping MongoDB - get first result from cursor
            $cursor = $db->command(['ping' => 1]);
            $result = $cursor->toArray()[0];

            $this->info('✓ MongoDB connection successful!');
            $this->info('✓ Ping response: ' . ($result->ok ?? 'OK'));
            $this->info('✓ Database: ' . $connection->getDatabaseName());

            // List collections
            $this->newLine();
            $this->info('Collections in database:');

            $collections = iterator_to_array($db->listCollections());

            if (empty($collections)) {
                $this->line('  (no collections yet - database is empty)');
            } else {
                foreach ($collections as $collection) {
                    $this->line('  - ' . $collection->getName());
                }
            }

            $this->newLine();
            $this->info('✓ Ready to start development!');

            return Command::SUCCESS;

        } catch (\Exception $e) {
            $this->error('✗ MongoDB connection failed!');
            $this->error('Error: ' . $e->getMessage());

            $this->newLine();
            $this->warn('Troubleshooting:');
            $this->line('1. Check .env file has correct MongoDB settings');
            $this->line('2. Verify MongoDB service is running: sc query MongoDB');
            $this->line('3. Check config/database.php has mongodb connection');

            return Command::FAILURE;
        }
    }
}
