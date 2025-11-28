<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Supplier;

class ImportSuppliersSeeder extends Seeder
{
    public function run()
    {
        $suppliers = [
            [
                'name' => 'Medicine Manufacturer',
                'contact_person' => 'John Carlo Sumugat',
                'phone' => '09567460163',
                'email' => 'jcsumugatxd@gmail.com',
                'address' => 'Poblacion, Culasi Antique',
            ],
            [
                'name' => 'Mercury Drug Store',
                'contact_person' => 'Mrs. Jane Yap',
                'phone' => '09567456772',
                'email' => 'mrsjane@gmail.com',
                'address' => 'Poblacion, Culasi Antique',
            ],
            [
                'name' => 'Ailyn',
                'contact_person' => 'Mrs. Jane Yap',
                'phone' => '09567456772',
                'email' => 'jcsumugatxd@gmail.com',
                'address' => 'MAlabor',
            ],
        ];

        // Clear existing suppliers (optional)
        Supplier::truncate();

        // Insert suppliers
        foreach ($suppliers as $supplier) {
            Supplier::create($supplier);
        }

        $this->command->info('Imported ' . count($suppliers) . ' suppliers!');
    }
}
