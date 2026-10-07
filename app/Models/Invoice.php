<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Invoice extends Model
{
    protected $fillable = [
        'tenant_id',
        'invoice_number',
        'offline_uuid',
        'is_offline_sync',
        'type', // retail, wholesale
        'cashier_id',
        'sales_rep_id',
        'warehouse_id',
        'shift_id',
        'van_trip_id',
        'customer_name',
        'customer_phone',
        'subtotal',
        'discount_amount',
        'tax_amount',
        'total_amount',
        'cost_total',
        'paid_amount',
        'remaining_amount',
        'payment_method', // cash, card, credit, split
        'status', // completed, refunded, cancelled
        'is_test',
        'notes',
        'created_at',
    ];

    protected $casts = [
        'is_offline_sync' => 'boolean',
        'subtotal' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'cost_total' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'remaining_amount' => 'decimal:2',
        'is_test' => 'boolean',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function cashier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cashier_id');
    }

    public function salesRep(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sales_rep_id');
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function shift(): BelongsTo
    {
        return $this->belongsTo(CashierShift::class, 'shift_id');
    }

    public function vanTrip(): BelongsTo
    {
        return $this->belongsTo(VanTrip::class, 'van_trip_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(InvoiceItem::class);
    }

    public function getNetProfitAttribute(): float
    {
        return (float) ($this->total_amount - $this->cost_total);
    }
}
