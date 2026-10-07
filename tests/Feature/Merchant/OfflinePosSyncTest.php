<?php

namespace Tests\Feature\Merchant;

use App\Models\CashierShift;
use App\Models\Category;
use App\Models\Invoice;
use App\Models\Product;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OfflinePosSyncTest extends TestCase
{
    use RefreshDatabase;

    public function test_offline_invoices_can_be_synced_successfully(): void
    {
        $tenant = Tenant::create([
            'name' => 'متجر التجربة',
            'slug' => 'offline-test',
            'subscription_status' => 'active',
            'is_active' => true,
        ]);

        $cashier = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'كاشير أحمد',
            'email' => 'cashier@offline-test.com',
            'role' => 'cashier',
            'is_active' => true,
            'password' => bcrypt('password123'),
        ]);

        $category = Category::create([
            'tenant_id' => $tenant->id,
            'name' => 'مشروبات',
        ]);

        $product = Product::create([
            'tenant_id' => $tenant->id,
            'category_id' => $category->id,
            'name' => 'عصير برتقال',
            'barcode' => '1234567890123',
            'cost_price' => 10,
            'retail_price' => 25,
            'wholesale_price' => 20,
            'is_active' => true,
        ]);

        $warehouse = $tenant->mainWarehouse;
        \App\Models\ProductWarehouseStock::create([
            'tenant_id' => $tenant->id,
            'warehouse_id' => $warehouse->id,
            'product_id' => $product->id,
            'quantity' => 50,
        ]);

        $shift = CashierShift::create([
            'tenant_id' => $tenant->id,
            'user_id' => $cashier->id,
            'warehouse_id' => $warehouse->id,
            'shift_number' => 1,
            'status' => 'open',
            'opened_at' => now(),
            'start_cash' => 100,
        ]);

        $offlineUuid = 'off-' . time() . '-abc1234';

        $payload = [
            'invoices' => [
                [
                    'offline_uuid' => $offlineUuid,
                    'invoice_number' => 'OFF-987654',
                    'subtotal' => 50,
                    'discount_amount' => 0,
                    'tax_amount' => 0,
                    'total_amount' => 50,
                    'paid_amount' => 50,
                    'payment_method' => 'cash',
                    'customer_name' => 'عميل تجريبي',
                    'customer_phone' => '01000000000',
                    'created_at' => now()->toIso8601String(),
                    'items' => [
                        [
                            'product_id' => $product->id,
                            'product_name' => $product->name,
                            'quantity' => 2,
                            'unit_price' => 25,
                            'total_price' => 50,
                        ],
                    ],
                ],
            ],
        ];

        $response = $this->actingAs($cashier)
            ->post("http://offline-test.localhost:8000/pos/sync-offline", $payload);

        $response->assertOk();
        $response->assertJson([
            'success' => true,
            'synced_uuids' => [$offlineUuid],
        ]);

        // التأكد من حفظ الفاتورة في قاعدة البيانات مع وسم أوفلاين
        $this->assertDatabaseHas('invoices', [
            'tenant_id' => $tenant->id,
            'offline_uuid' => $offlineUuid,
            'is_offline_sync' => true,
            'total_amount' => 50,
            'payment_method' => 'cash',
        ]);

        // التأكد من خصم المخزون في السيرفر (50 - 2 = 48)
        $stock = $warehouse->productStocks()->where('product_id', $product->id)->first()->quantity;
        $this->assertEquals(48, $stock);

        // التأكد من زيادة مبيعات الوردية
        $shift->refresh();
        $this->assertEquals(50, $shift->cash_sales);
    }
}
