<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class Supplier extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'suppliers';

    protected $fillable = [
        'name',
        'contact_person',
        'phone',
        'email',
        'address',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Relationships
    public function products()
    {
        return $this->hasMany(Product::class, 'supplier_id');
    }

    // Helper methods
    public function getActiveProductsCount()
    {
        return $this->products()->where('stock_quantity', '>', 0)->count();
    }

    public function getTotalProductsValue()
    {
        return $this->products()->sum('stock_quantity');
    }
}
