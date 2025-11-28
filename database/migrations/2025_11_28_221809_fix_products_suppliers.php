<?php

use Illuminate\Database\Migrations\Migration;
use App\Models\Product;
use App\Models\Supplier;

return new class extends Migration
{
    public function up()
    {
        // Get the first available supplier (Medicine Manufacturer)
        $defaultSupplier = Supplier::first();

        if (!$defaultSupplier) {
            // If no suppliers exist, create a default one
            $defaultSupplier = Supplier::create([
                'name' => 'Default Supplier',
                'contact_person' => 'Admin',
                'phone' => '00000000000',
                'email' => 'supplier@pharmacy.com',
                'address' => 'Default Address',
            ]);
        }

        // Update all products without supplier_id
        $productsWithoutSupplier = Product::where(function($query) {
            $query->whereNull('supplier_id')
                  ->orWhere('supplier_id', '')
                  ->orWhere('supplier_id', 'null');
        })->get();

        $count = 0;
        foreach ($productsWithoutSupplier as $product) {
            $product->update(['supplier_id' => (string) $defaultSupplier->_id]);
            $count++;
        }

        echo "Fixed {$count} products without suppliers\n";

        // Verify all suppliers referenced by products exist
        $allProducts = Product::all();
        $missingSuppliers = [];

        foreach ($allProducts as $product) {
            if ($product->supplier_id) {
                $supplierExists = Supplier::find($product->supplier_id);
                if (!$supplierExists) {
                    $missingSuppliers[] = $product->supplier_id;
                    // Assign to default supplier
                    $product->update(['supplier_id' => (string) $defaultSupplier->_id]);
                }
            }
        }

        if (!empty($missingSuppliers)) {
            echo "Fixed products with missing supplier references: " . count(array_unique($missingSuppliers)) . "\n";
        }

        echo "All products now have valid suppliers!\n";
    }

    public function down()
    {
        // No rollback needed
    }
};
