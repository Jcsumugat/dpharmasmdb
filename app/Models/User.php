<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;
use MongoDB\Laravel\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use Notifiable;

    protected $connection = 'mongodb';
    protected $collection = 'users';

    // Role constants
    public const ROLE_ADMIN = 'admin';
    public const ROLE_STAFF = 'staff';
    public const ROLE_CUSTOMER = 'customer';

    protected $fillable = [
        'email',
        'password',
        'role',
        'name',
        'phone',
        'address',
        'birthdate',
        'sex',
        'status',
        'status_changed_at',
        'auto_restore_at',
        'email_verified_at',
        'last_login',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'address' => 'array',
        'birthdate' => 'datetime',
        'status_changed_at' => 'datetime',
        'auto_restore_at' => 'datetime',
        'email_verified_at' => 'datetime',
        'last_login' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function hasRole(string $role): bool
    {
        return $this->role === $role;
    }

    // Relationships
    public function prescriptions()
    {
        return $this->hasMany(Prescription::class, 'customer_id');
    }

    public function orders()
    {
        return $this->hasMany(Order::class, 'customer_id');
    }

    public function notifications()
    {
        return $this->hasMany(Notification::class, 'recipient_id')
            ->where('recipient_type', $this->isCustomer() ? 'customer' : 'admin');
    }

    public function conversations()
    {
        if ($this->isCustomer()) {
            return $this->hasMany(Conversation::class, 'customer_id');
        }
        return $this->hasMany(Conversation::class, 'admin_id');
    }

    // Helper methods
    public function getFullAddressAttribute()
    {
        if (!$this->address) return '';

        return implode(', ', array_filter([
            $this->address['street'] ?? '',
            $this->address['city'] ?? '',
            $this->address['province'] ?? '',
            $this->address['postal_code'] ?? '',
        ]));
    }

    public function getUnreadNotificationsCount()
    {
        return $this->notifications()->where('is_read', false)->count();
    }

    public static function getAvailableRoles(): array
    {
        return [
            self::ROLE_ADMIN => 'Administrator',
            self::ROLE_STAFF => 'Staff',
            self::ROLE_CUSTOMER => 'Customer',
        ];
    }

    // Scopes
    public function scopeAdmins($query)
    {
        return $query->where('role', self::ROLE_ADMIN);
    }

    public function scopeStaff($query)
    {
        return $query->where('role', self::ROLE_STAFF);
    }

    public function scopeCustomers($query)
    {
        return $query->where('role', self::ROLE_CUSTOMER);
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeRestricted($query)
    {
        return $query->where('status', 'restricted');
    }
    /**
     * Check if user is a customer
     */
    public function isCustomer(): bool
    {
        return $this->role === self::ROLE_CUSTOMER;
    }

    /**
     * Check if user is admin
     */
    public function isAdmin(): bool
    {
        return $this->role === self::ROLE_ADMIN;
    }

    /**
     * Check if user is staff
     */
    public function isStaff(): bool
    {
        return $this->role === self::ROLE_STAFF;
    }

    /**
     * Check if user account is active
     */
    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    /**
     * Check if user account is deactivated
     */
    public function isDeactivated(): bool
    {
        return $this->status === 'deactivated';
    }

    /**
     * Check if user account is restricted
     */
    public function isRestricted(): bool
    {
        return $this->status === 'restricted';
    }

    /**
     * Check if user account is deleted
     */
    public function isDeleted(): bool
    {
        return $this->status === 'deleted';
    }
}
