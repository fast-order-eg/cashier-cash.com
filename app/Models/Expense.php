<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Expense extends Model
{
    protected $fillable = [
        'tenant_id',
        'category_id',
        'user_id',
        'van_trip_id',
        'title',
        'amount',
        'expense_date',
        'attachment_path',
        'notes',
        'is_test',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'expense_date' => 'date',
        'is_test' => 'boolean',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(ExpenseCategory::class, 'category_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function vanTrip(): BelongsTo
    {
        return $this->belongsTo(VanTrip::class, 'van_trip_id');
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(ExpenseAuditLog::class, 'expense_id')->latest();
    }
}
