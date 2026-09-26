<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class VanTrip extends Model
{
    protected $fillable = [
        'tenant_id',
        'sales_rep_id',
        'warehouse_id',
        'start_time',
        'end_time',
        'start_odometer',
        'end_odometer',
        'total_distance',
        'total_sales',
        'total_cash_collected',
        'status', // open, closed
        'notes',
    ];

    protected $casts = [
        'start_time' => 'datetime',
        'end_time' => 'datetime',
        'start_odometer' => 'decimal:2',
        'end_odometer' => 'decimal:2',
        'total_distance' => 'decimal:2',
        'total_sales' => 'decimal:2',
        'total_cash_collected' => 'decimal:2',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function salesRep(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sales_rep_id');
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class, 'van_trip_id');
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class, 'van_trip_id');
    }

    public function isOpen(): bool
    {
        return $this->status === 'open';
    }
}
