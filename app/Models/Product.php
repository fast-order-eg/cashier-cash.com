<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    protected $fillable = [
        'tenant_id',
        'category_id',
        'name',
        'barcode',
        'cost_price',
        'retail_price',
        'wholesale_price',
        'image_path',
        'stock_quantity',
        'min_stock_alert',
        'unit',
        'is_active',
    ];

    protected $casts = [
        'cost_price' => 'decimal:2',
        'retail_price' => 'decimal:2',
        'wholesale_price' => 'decimal:2',
        'stock_quantity' => 'decimal:2',
        'min_stock_alert' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function warehouseStocks(): HasMany
    {
        return $this->hasMany(ProductWarehouseStock::class);
    }

    public function getStockInWarehouse(int $warehouseId): float
    {
        $stock = $this->warehouseStocks()->where('warehouse_id', $warehouseId)->first();
        return $stock ? (float) $stock->quantity : 0.0;
    }

    public function isLowStock(): bool
    {
        return $this->stock_quantity <= $this->min_stock_alert;
    }

    public function isNegativeStock(): bool
    {
        return $this->stock_quantity < 0;
    }
}
