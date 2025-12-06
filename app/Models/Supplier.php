<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;
use Carbon\Carbon;

class Supplier extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'suppliers';

    // Enable timestamps
    public $timestamps = true;

    protected $fillable = [
        'name',
        'contact_person',
        'phone',
        'email',
        'address',
        'total_orders',
        'on_time_delivery_rate',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'total_orders' => 'integer',
        'on_time_delivery_rate' => 'decimal:2',
    ];

    protected $attributes = [
        'total_orders' => 0,
        'on_time_delivery_rate' => 0,
    ];

    // Override boot method to ensure timestamps
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (!$model->created_at) {
                $model->created_at = Carbon::now();
            }
            if (!$model->updated_at) {
                $model->updated_at = Carbon::now();
            }
        });

        static::updating(function ($model) {
            $model->updated_at = Carbon::now();
        });
    }

    // Relationship with products
    public function products()
    {
        return $this->hasMany(Product::class, 'supplier_id');
    }
}
