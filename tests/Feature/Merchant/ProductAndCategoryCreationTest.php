<?php

namespace Tests\Feature\Merchant;

use App\Models\Category;
use App\Models\Product;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductAndCategoryCreationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Ensure database has tenant, owner and super admin
        $this->artisan('db:seed', ['--class' => 'DatabaseSeeder']);
    }

    public function test_merchant_can_create_category_via_json_modal(): void
    {
        $owner = User::where('email', 'owner@alamana.com')->first();
        $this->assertNotNull($owner);

        $response = $this->actingAs($owner)->postJson('/admin/categories', [
            'name' => 'قسم الحلويات الفاخرة',
            'color' => '#10B981',
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
        ]);

        $this->assertDatabaseHas('categories', [
            'name' => 'قسم الحلويات الفاخرة',
            'color' => '#10B981',
        ]);
    }

    public function test_super_admin_can_create_category_without_tenant_null_error(): void
    {
        $superAdmin = User::where('email', 'admin@casher.com')->first();
        $this->assertNotNull($superAdmin);

        $response = $this->actingAs($superAdmin)->postJson('/admin/categories', [
            'name' => 'قسم تجريبي للسوبر أدمن',
            'color' => '#6366F1',
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
        ]);

        $this->assertDatabaseHas('categories', [
            'name' => 'قسم تجريبي للسوبر أدمن',
        ]);
    }

    public function test_merchant_can_create_product_with_default_stock(): void
    {
        $owner = User::where('email', 'owner@alamana.com')->first();
        $tenant = $owner->tenant;
        $category = Category::where('tenant_id', $tenant->id)->first();

        $barcode = '622' . rand(100000000, 999999999);

        $response = $this->actingAs($owner)->post('/admin/products', [
            'name' => 'شاي العروسة ناعم 250 جم',
            'category_id' => $category?->id,
            'barcode' => $barcode,
            'cost_price' => 20,
            'retail_price' => 30,
            'wholesale_price' => 25,
            'stock_quantity' => 100,
            'min_stock_alert' => 5,
            'unit' => 'قطعة',
        ]);

        $response->assertRedirect('/admin/products');

        $this->assertDatabaseHas('products', [
            'name' => 'شاي العروسة ناعم 250 جم',
            'barcode' => $barcode,
            'stock_quantity' => 100,
            'tenant_id' => $tenant->id,
        ]);
    }

    public function test_super_admin_can_create_product_without_tenant_null_crash(): void
    {
        $superAdmin = User::where('email', 'admin@casher.com')->first();
        $category = Category::first();
        $barcode = '622' . rand(100000000, 999999999);

        $response = $this->actingAs($superAdmin)->post('/admin/products', [
            'name' => 'صنف تجريبي بواسطة السوبر أدمن',
            'category_id' => $category?->id,
            'barcode' => $barcode,
            'cost_price' => 50,
            'retail_price' => 75,
            'wholesale_price' => 60,
            'stock_quantity' => 100,
            'min_stock_alert' => 10,
            'unit' => 'علبة',
        ]);

        $response->assertRedirect('/admin/products');

        $this->assertDatabaseHas('products', [
            'name' => 'صنف تجريبي بواسطة السوبر أدمن',
            'barcode' => $barcode,
            'stock_quantity' => 100,
        ]);
    }

    public function test_can_open_product_edit_page(): void
    {
        $superAdmin = User::where('email', 'admin@casher.com')->first();
        $product = Product::first();

        $response = $this->actingAs($superAdmin)->get("http://app.localhost:8000/admin/products/{$product->id}/edit");
        $response->assertStatus(200);
    }
}
