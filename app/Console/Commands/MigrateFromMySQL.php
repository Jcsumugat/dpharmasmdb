<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;

class MigrateFromMySQL extends Command
{
    protected $signature = 'migrate:mysql-to-mongo {--fresh : Drop existing MongoDB collections first}';
    protected $description = 'Migrate data from MySQL to MongoDB';

    private $mysql;
    private $mongo;
    private $idMappings = [];

    public function handle()
    {
        $this->info('🚀 Starting MySQL to MongoDB migration...');
        $this->newLine();

        // Setup connections
        $this->setupConnections();

        // Drop collections if --fresh flag is used
        if ($this->option('fresh')) {
            $this->freshMigration();
        }

        // Migration order (respects foreign key dependencies)
        $this->info('📊 Migration Progress:');
        $this->newLine();

        try {
            $this->migrateCategories();
            $this->migrateSuppliers();
            $this->migrateUsers();
            $this->migrateCustomers();
            $this->migrateProducts();
            $this->migratePrescriptions();
            $this->migrateOrders();
            $this->migratePOSTransactions();
            $this->migrateConversations();
            $this->migrateNotifications();
            $this->migrateStockMovements();

            $this->newLine();
            $this->info('✅ Migration completed successfully!');
            $this->displaySummary();

        } catch (\Exception $e) {
            $this->error('❌ Migration failed: ' . $e->getMessage());
            $this->error('Stack trace: ' . $e->getTraceAsString());
            return Command::FAILURE;
        }

        return Command::SUCCESS;
    }

    private function setupConnections()
    {
        $this->mysql = DB::connection('mysql');
        $this->mongo = DB::connection('mongodb');

        $this->info('✓ Database connections established');
    }

    private function freshMigration()
    {
        $this->warn('⚠️  Dropping existing MongoDB collections...');

        $collections = [
            'categories', 'suppliers', 'users', 'products',
            'prescriptions', 'orders', 'pos_transactions',
            'conversations', 'notifications', 'stock_movements'
        ];

        foreach ($collections as $collection) {
            DB::connection('mongodb')->table($collection)->truncate();
        }

        $this->info('✓ Collections dropped');
        $this->newLine();
    }

    private function migrateCategories()
    {
        $this->info('⏳ Migrating Categories...');

        $categories = $this->mysql->table('categories')->get();
        $bar = $this->output->createProgressBar($categories->count());
        $bar->start();

        foreach ($categories as $cat) {
            $mongoId = new ObjectId();
            $this->idMappings['categories'][$cat->id] = $mongoId;

            DB::connection('mongodb')->table('categories')->insert([
                '_id' => $mongoId,
                'name' => $cat->name,
                'description' => $cat->description,
                'created_at' => $this->convertDate($cat->created_at),
                'updated_at' => $this->convertDate($cat->updated_at),
            ]);

            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info("✓ Migrated {$categories->count()} categories");
    }

    private function migrateSuppliers()
    {
        $this->info('⏳ Migrating Suppliers...');

        $suppliers = $this->mysql->table('suppliers')->get();
        $bar = $this->output->createProgressBar($suppliers->count());
        $bar->start();

        foreach ($suppliers as $supplier) {
            $mongoId = new ObjectId();
            $this->idMappings['suppliers'][$supplier->id] = $mongoId;

            DB::connection('mongodb')->table('suppliers')->insert([
                '_id' => $mongoId,
                'name' => $supplier->name,
                'contact_person' => $supplier->contact_person,
                'phone' => $supplier->phone,
                'email' => $supplier->email,
                'address' => $supplier->address,
                'created_at' => $this->convertDate($supplier->created_at),
                'updated_at' => $this->convertDate($supplier->updated_at),
            ]);

            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info("✓ Migrated {$suppliers->count()} suppliers");
    }

    private function migrateUsers()
    {
        $this->info('⏳ Migrating Users (Admin/Staff)...');

        $users = $this->mysql->table('users')->get();
        $bar = $this->output->createProgressBar($users->count());
        $bar->start();

        foreach ($users as $user) {
            $mongoId = new ObjectId();
            $this->idMappings['users'][$user->id] = $mongoId;

            DB::connection('mongodb')->table('users')->insert([
                '_id' => $mongoId,
                'email' => $user->email,
                'password' => $user->password,
                'role' => $user->role,
                'name' => $user->name,
                'email_verified_at' => $this->convertDate($user->email_verified_at),
                'last_login' => null,
                'created_at' => $this->convertDate($user->created_at),
                'updated_at' => $this->convertDate($user->updated_at),
            ]);

            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info("✓ Migrated {$users->count()} admin/staff users");
    }

    private function migrateCustomers()
    {
        $this->info('⏳ Migrating Customers...');

        $customers = $this->mysql->table('customers')->get();
        $bar = $this->output->createProgressBar($customers->count());
        $bar->start();

        foreach ($customers as $customer) {
            $mongoId = new ObjectId();
            $this->idMappings['customers'][$customer->id] = $mongoId;

            // Parse address (assuming format: "Street, City, Province")
            $addressParts = explode(',', $customer->address);
            $address = [
                'street' => trim($addressParts[0] ?? ''),
                'city' => trim($addressParts[1] ?? ''),
                'province' => trim($addressParts[2] ?? ''),
                'postal_code' => '',
            ];

            DB::connection('mongodb')->table('users')->insert([
                '_id' => $mongoId,
                'email' => $customer->email_address,
                'password' => $customer->password,
                'role' => 'customer',
                'name' => $customer->full_name,
                'phone' => $customer->contact_number,
                'address' => $address,
                'birthdate' => $this->convertDate($customer->birthdate),
                'sex' => $customer->sex,
                'status' => $customer->status ?? 'active',
                'status_changed_at' => $this->convertDate($customer->status_changed_at),
                'auto_restore_at' => $this->convertDate($customer->auto_restore_at),
                'email_verified_at' => null,
                'last_login' => null,
                'created_at' => $this->convertDate($customer->created_at),
                'updated_at' => $this->convertDate($customer->updated_at),
            ]);

            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info("✓ Migrated {$customers->count()} customers");
    }

    private function migrateProducts()
    {
        $this->info('⏳ Migrating Products with Batches...');

        $products = $this->mysql->table('products')->get();
        $bar = $this->output->createProgressBar($products->count());
        $bar->start();

        foreach ($products as $product) {
            $mongoId = new ObjectId();
            $this->idMappings['products'][$product->id] = $mongoId;

            // Get all batches for this product
            $batches = $this->mysql->table('product_batches')
                ->where('product_id', $product->id)
                ->get();

            $mongoBatches = [];
            foreach ($batches as $batch) {
                $batchMongoId = new ObjectId();
                $this->idMappings['product_batches'][$batch->id] = [
                    'product_id' => $mongoId,
                    'batch_id' => $batchMongoId
                ];

                $mongoBatches[] = [
                    '_id' => $batchMongoId,
                    'batch_number' => $batch->batch_number,
                    'expiration_date' => $this->convertDate($batch->expiration_date),
                    'quantity_received' => (int)$batch->quantity_received,
                    'quantity_remaining' => (int)$batch->quantity_remaining,
                    'unit_cost' => (float)$batch->unit_cost,
                    'sale_price' => (float)$batch->sale_price,
                    'received_date' => $this->convertDate($batch->received_date),
                    'supplier_id' => $this->idMappings['suppliers'][$batch->supplier_id] ?? null,
                    'notes' => $batch->notes,
                    'expiration_notification_sent_at' => $this->convertDate($batch->expiration_notification_sent_at),
                    'created_at' => $this->convertDate($batch->created_at),
                    'updated_at' => $this->convertDate($batch->updated_at),
                ];
            }

            DB::connection('mongodb')->table('products')->insert([
                '_id' => $mongoId,
                'product_code' => $product->product_code,
                'product_name' => $product->product_name,
                'generic_name' => $product->generic_name,
                'brand_name' => $product->brand_name,
                'manufacturer' => $product->manufacturer,
                'product_type' => $product->product_type,
                'form_type' => $product->form_type,
                'dosage_unit' => $product->dosage_unit,
                'classification' => $product->classification,
                'category_id' => $this->idMappings['categories'][$product->category_id] ?? null,
                'supplier_id' => $this->idMappings['suppliers'][$product->supplier_id] ?? null,
                'stock_quantity' => (int)$product->stock_quantity,
                'reorder_level' => (int)$product->reorder_level,
                'unit' => $product->unit,
                'unit_quantity' => (float)$product->unit_quantity,
                'batches' => $mongoBatches,
                'notification_sent_at' => $this->convertDate($product->notification_sent_at),
                'storage_requirements' => $product->storage_requirements,
                'created_at' => $this->convertDate($product->created_at),
                'updated_at' => $this->convertDate($product->updated_at),
            ]);

            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info("✓ Migrated {$products->count()} products");
    }

    private function migratePrescriptions()
    {
        $this->info('⏳ Migrating Prescriptions...');

        $prescriptions = $this->mysql->table('prescriptions')->get();
        $bar = $this->output->createProgressBar($prescriptions->count());
        $bar->start();

        foreach ($prescriptions as $prescription) {
            $mongoId = new ObjectId();
            $this->idMappings['prescriptions'][$prescription->id] = $mongoId;

            // Get prescription items
            $items = $this->mysql->table('prescription_items')
                ->where('prescription_id', $prescription->id)
                ->get();

            $mongoItems = [];
            foreach ($items as $item) {
                $batchMapping = $this->idMappings['product_batches'][$item->batch_id] ?? null;

                $mongoItems[] = [
                    'product_id' => $this->idMappings['products'][$item->product_id] ?? null,
                    'product_name' => $this->mysql->table('products')->where('id', $item->product_id)->value('product_name'),
                    'batch_id' => $batchMapping['batch_id'] ?? null,
                    'quantity' => (int)$item->quantity,
                    'unit_price' => (float)($this->mysql->table('product_batches')->where('id', $item->batch_id)->value('sale_price') ?? 0),
                    'status' => $item->status,
                ];
            }

            DB::connection('mongodb')->table('prescriptions')->insert([
                '_id' => $mongoId,
                'prescription_number' => $prescription->prescription_number ?? 'RX' . str_pad($prescription->id, 5, '0', STR_PAD_LEFT),
                'customer_id' => $this->idMappings['customers'][$prescription->user_id] ?? null,
                'file_path' => $prescription->file_path,
                'original_filename' => $prescription->original_filename,
                'file_mime_type' => $prescription->file_mime_type,
                'file_size' => (int)$prescription->file_size,
                'is_encrypted' => (bool)$prescription->is_encrypted,
                'file_hash' => $prescription->file_hash,
                'perceptual_hash' => $prescription->perceptual_hash,
                'duplicate_check_status' => $prescription->duplicate_check_status,
                'duplicate_of_id' => $this->idMappings['prescriptions'][$prescription->duplicate_of_id] ?? null,
                'similarity_score' => (float)($prescription->similarity_score ?? 0),
                'duplicate_checked_at' => $this->convertDate($prescription->duplicate_checked_at),
                'extracted_text' => $prescription->extracted_text,
                'doctor_name' => $prescription->doctor_name,
                'prescription_issue_date' => $this->convertDate($prescription->prescription_issue_date),
                'prescription_expiry_date' => $this->convertDate($prescription->prescription_expiry_date),
                'order_type' => $prescription->order_type,
                'status' => $prescription->status,
                'mobile_number' => $prescription->mobile_number,
                'notes' => $prescription->notes,
                'admin_message' => $prescription->admin_message,
                'items' => $mongoItems,
                'qr_code_path' => $prescription->qr_code_path,
                'token' => $prescription->token,
                'created_at' => $this->convertDate($prescription->created_at),
                'updated_at' => $this->convertDate($prescription->updated_at),
                'completed_at' => $this->convertDate($prescription->completed_at),
            ]);

            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info("✓ Migrated {$prescriptions->count()} prescriptions");
    }

    private function migrateOrders()
    {
        $this->info('⏳ Migrating Orders...');

        $orders = $this->mysql->table('orders')->get();
        $bar = $this->output->createProgressBar($orders->count());
        $bar->start();

        foreach ($orders as $order) {
            $mongoId = new ObjectId();
            $this->idMappings['orders'][$order->id] = $mongoId;

            // Get order items
            $items = $this->mysql->table('order_items')
                ->where('order_id', $order->id)
                ->get();

            $mongoItems = [];
            foreach ($items as $item) {
                $product = $this->mysql->table('products')->where('id', $item->product_id)->first();

                $mongoItems[] = [
                    'product_id' => $this->idMappings['products'][$item->product_id] ?? null,
                    'product_name' => $product->product_name ?? '',
                    'brand_name' => $product->brand_name ?? '',
                    'quantity' => (int)$item->quantity,
                    'available' => (bool)$item->available,
                ];
            }

            DB::connection('mongodb')->table('orders')->insert([
                '_id' => $mongoId,
                'order_id' => $order->order_id,
                'prescription_id' => $this->idMappings['prescriptions'][$order->prescription_id] ?? null,
                'customer_id' => $this->idMappings['customers'][$order->customer_id] ?? null,
                'items' => $mongoItems,
                'status' => $order->status,
                'payment_method' => 'cash',
                'payment_status' => $order->status === 'completed' ? 'paid' : 'pending',
                'created_at' => $this->convertDate($order->created_at),
                'updated_at' => $this->convertDate($order->updated_at),
                'completed_at' => $this->convertDate($order->completed_at),
            ]);

            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info("✓ Migrated {$orders->count()} orders");
    }

    private function migratePOSTransactions()
    {
        $this->info('⏳ Migrating POS Transactions...');

        $transactions = $this->mysql->table('pos_transactions')->get();
        $bar = $this->output->createProgressBar($transactions->count());
        $bar->start();

        foreach ($transactions as $transaction) {
            $mongoId = new ObjectId();

            // Get transaction items
            $items = $this->mysql->table('pos_transaction_items')
                ->where('transaction_id', $transaction->id)
                ->get();

            $mongoItems = [];
            foreach ($items as $item) {
                $mongoItems[] = [
                    'product_id' => $this->idMappings['products'][$item->product_id] ?? null,
                    'product_name' => $item->product_name,
                    'brand_name' => $item->brand_name,
                    'quantity' => (int)$item->quantity,
                    'unit_price' => (float)$item->unit_price,
                    'total_price' => (float)$item->total_price,
                ];
            }

            DB::connection('mongodb')->table('pos_transactions')->insert([
                '_id' => $mongoId,
                'transaction_id' => $transaction->transaction_id,
                'customer_type' => $transaction->customer_type,
                'customer_name' => $transaction->customer_name,
                'items' => $mongoItems,
                'subtotal' => (float)$transaction->subtotal,
                'tax_amount' => (float)$transaction->tax_amount,
                'discount_amount' => (float)$transaction->discount_amount,
                'total_amount' => (float)$transaction->total_amount,
                'amount_paid' => (float)$transaction->amount_paid,
                'change_amount' => (float)$transaction->change_amount,
                'payment_method' => $transaction->payment_method,
                'status' => $transaction->status,
                'notes' => $transaction->notes,
                'processed_by' => $this->idMappings['users'][$transaction->processed_by] ?? null,
                'created_at' => $this->convertDate($transaction->created_at),
                'updated_at' => $this->convertDate($transaction->updated_at),
            ]);

            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info("✓ Migrated {$transactions->count()} POS transactions");
    }

    private function migrateConversations()
    {
        $this->info('⏳ Migrating Conversations & Messages...');

        $conversations = $this->mysql->table('conversations')->get();
        $bar = $this->output->createProgressBar($conversations->count());
        $bar->start();

        foreach ($conversations as $conversation) {
            $mongoId = new ObjectId();

            // Get messages for this conversation
            $messages = $this->mysql->table('chat_messages')
                ->where('conversation_id', $conversation->id)
                ->orderBy('created_at', 'asc')
                ->get();

            $mongoMessages = [];
            foreach ($messages as $message) {
                $messageId = new ObjectId();

                // Get attachments
                $attachments = $this->mysql->table('message_attachments')
                    ->where('message_id', $message->id)
                    ->get();

                $mongoAttachments = [];
                foreach ($attachments as $attachment) {
                    $mongoAttachments[] = [
                        'file_name' => $attachment->file_name,
                        'file_path' => $attachment->file_path,
                        'file_size' => (int)$attachment->file_size,
                        'file_type' => $attachment->file_type,
                        'mime_type' => $attachment->mime_type,
                    ];
                }

                $mongoMessages[] = [
                    '_id' => $messageId,
                    'sender_type' => $message->is_from_customer ? 'customer' : 'admin',
                    'sender_id' => $message->is_from_customer
                        ? ($this->idMappings['customers'][$message->customer_id] ?? null)
                        : ($this->idMappings['users'][$message->admin_id] ?? null),
                    'message' => $message->message,
                    'message_type' => $message->message_type,
                    'attachments' => $mongoAttachments,
                    'is_read' => (bool)($message->read_at !== null),
                    'is_internal_note' => (bool)$message->is_internal_note,
                    'timestamp' => $this->convertDate($message->created_at),
                ];
            }

            DB::connection('mongodb')->table('conversations')->insert([
                '_id' => $mongoId,
                'customer_id' => $this->idMappings['customers'][$conversation->customer_id] ?? null,
                'admin_id' => $this->idMappings['users'][$conversation->admin_id] ?? null,
                'title' => $conversation->title,
                'type' => $conversation->type,
                'status' => $conversation->status,
                'priority' => $conversation->priority,
                'messages' => $mongoMessages,
                'last_message_at' => $this->convertDate($conversation->last_message_at),
                'created_at' => $this->convertDate($conversation->created_at),
                'updated_at' => $this->convertDate($conversation->updated_at),
            ]);

            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info("✓ Migrated {$conversations->count()} conversations");
    }

    private function migrateNotifications()
    {
        $this->info('⏳ Migrating Notifications...');

        // Admin notifications
        $adminNotifs = $this->mysql->table('notifications')->get();
        $customerNotifs = $this->mysql->table('customer_notifications')->get();

        $total = $adminNotifs->count() + $customerNotifs->count();
        $bar = $this->output->createProgressBar($total);
        $bar->start();

        foreach ($adminNotifs as $notif) {
            DB::connection('mongodb')->table('notifications')->insert([
                '_id' => new ObjectId(),
                'recipient_id' => $this->idMappings['users'][$notif->user_id] ?? null,
                'recipient_type' => 'admin',
                'title' => $notif->title,
                'message' => $notif->message,
                'type' => 'general',
                'is_read' => (bool)$notif->is_read,
                'read_at' => null,
                'created_at' => $this->convertDate($notif->created_at),
                'updated_at' => $this->convertDate($notif->updated_at),
            ]);
            $bar->advance();
        }

        foreach ($customerNotifs as $notif) {
            DB::connection('mongodb')->table('notifications')->insert([
                '_id' => new ObjectId(),
                'recipient_id' => $this->idMappings['customers'][$notif->customer_id] ?? null,
                'recipient_type' => 'customer',
                'title' => $notif->title,
                'message' => $notif->message,
                'type' => $notif->type,
                'reference_type' => 'prescription',
                'reference_id' => $this->idMappings['prescriptions'][$notif->prescription_id] ?? null,
                'is_read' => (bool)$notif->is_read,
                'read_at' => null,
                'created_at' => $this->convertDate($notif->created_at),
                'updated_at' => $this->convertDate($notif->updated_at),
            ]);
            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info("✓ Migrated {$total} notifications");
    }

    private function migrateStockMovements()
    {
        $this->info('⏳ Migrating Stock Movements...');

        $movements = $this->mysql->table('stock_movements')->get();
        $bar = $this->output->createProgressBar($movements->count());
        $bar->start();

        foreach ($movements as $movement) {
            $batchMapping = $this->idMappings['product_batches'][$movement->batch_id] ?? null;

            DB::connection('mongodb')->table('stock_movements')->insert([
                '_id' => new ObjectId(),
                'product_id' => $this->idMappings['products'][$movement->product_id] ?? null,
                'batch_id' => $batchMapping['batch_id'] ?? null,
                'type' => $movement->type,
                'quantity' => (int)$movement->quantity,
                'reference_type' => $movement->reference_type,
                'reference_id' => $this->getReferenceMappingId($movement->reference_type, $movement->reference_id),
                'notes' => $movement->notes,
                'performed_by' => null,
                'timestamp' => $this->convertDate($movement->created_at),
                'created_at' => $this->convertDate($movement->created_at),
            ]);

            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info("✓ Migrated {$movements->count()} stock movements");
    }

    private function getReferenceMappingId($type, $id)
    {
        if (!$id) return null;

        $typeMap = [
            'sale' => 'orders',
            'pos_transaction' => 'pos_transactions',
            'purchase' => 'products',
        ];

        $mappingKey = $typeMap[$type] ?? null;
        return $mappingKey ? ($this->idMappings[$mappingKey][$id] ?? null) : null;
    }

    private function convertDate($date)
    {
        if (!$date) return null;

        try {
            $timestamp = is_numeric($date) ? $date : strtotime($date);
            return new UTCDateTime($timestamp * 1000);
        } catch (\Exception $e) {
            return null;
        }
    }

    private function displaySummary()
    {
        $this->newLine();
        $this->info('📈 Migration Summary:');
        $this->table(
            ['Collection', 'Count'],
            [
                ['Categories', DB::connection('mongodb')->table('categories')->count()],
                ['Suppliers', DB::connection('mongodb')->table('suppliers')->count()],
                ['Users (Admin/Staff)', DB::connection('mongodb')->table('users')->where('role', '!=', 'customer')->count()],
                ['Customers', DB::connection('mongodb')->table('users')->where('role', 'customer')->count()],
                ['Products', DB::connection('mongodb')->table('products')->count()],
                ['Prescriptions', DB::connection('mongodb')->table('prescriptions')->count()],
                ['Orders', DB::connection('mongodb')->table('orders')->count()],
                ['POS Transactions', DB::connection('mongodb')->table('pos_transactions')->count()],
                ['Conversations', DB::connection('mongodb')->table('conversations')->count()],
                ['Notifications', DB::connection('mongodb')->table('notifications')->count()],
                ['Stock Movements', DB::connection('mongodb')->table('stock_movements')->count()],
            ]
        );
    }
}
