<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class Category extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'categories';

    protected $fillable = [
        'name',
        'description',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Relationships
    public function products()
    {
        return $this->hasMany(Product::class, 'category_id');
    }

    // Helper methods
    public function getProductCount()
    {
        return $this->products()->count();
    }

    public function hasProducts()
    {
        return $this->products()->exists();
    }
}
