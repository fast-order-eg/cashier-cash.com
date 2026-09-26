<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KashierTransaction extends Model
{
    protected $fillable = [
        'tenant_id',
        'subscription_id',
        'kashier_order_id',
        'transaction_id',
        'amount',
        'currency',
        'status', // pending, SUCCESS, FAILED
        'payment_method',
        'payload',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'payload' => 'array',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(Subscription::class);
    }
}
