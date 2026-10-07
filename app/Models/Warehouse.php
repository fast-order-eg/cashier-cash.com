<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Warehouse extends Model
{
    protected $fillable = [
        'tenant_id',
        'name',
        'type', // main, van
        'sales_rep_id',
        'vehicle_plate',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function salesRep(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sales_rep_id');
    }

    public function productStocks(): HasMany
    {
        return $this->hasMany(ProductWarehouseStock::class);
    }

    public function stocks(): HasMany
    {
        return $this->productStocks();
    }

    public function isVan(): bool
    {
        return $this->type === 'van';
    }

    public function isMain(): bool
    {
        return $this->type === 'main';
    }
}
