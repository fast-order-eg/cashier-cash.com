<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Subscription extends Model
{
    protected $fillable = [
        'tenant_id',
        'plan_id',
        'billing_cycle',
        'base_price',
        'extra_employees_count',
        'extra_employees_cost',
        'total_price',
        'status',
        'starts_at',
        'ends_at',
        'trial_ends_at',
        'payment_method',
        'payment_reference',
    ];

    protected $casts = [
        'base_price' => 'decimal:2',
        'extra_employees_cost' => 'decimal:2',
        'total_price' => 'decimal:2',
        'extra_employees_count' => 'integer',
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
        'trial_ends_at' => 'datetime',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(SubscriptionPlan::class, 'plan_id');
    }

    public function isActive(): bool
    {
        return $this->status === 'active' && ($this->ends_at === null || $this->ends_at->isFuture());
    }
}
