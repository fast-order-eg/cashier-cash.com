<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. الأقسام (Categories)
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('image_path')->nullable();
            $table->string('color', 20)->nullable()->default('#3B82F6');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // 2. المخازن (Warehouses - المخزن الرئيسي ومخازن سيارات المناديب)
        Schema::create('warehouses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('name'); // المخزن الرئيسي، سيارة مندوب فلان
            $table->string('type')->default('main'); // main, van
            $table->foreignId('sales_rep_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('vehicle_plate')->nullable(); // رقم لوحة السيارة
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // 3. الأصناف (Products)
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('category_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->string('barcode')->nullable()->index();
            $table->decimal('cost_price', 10, 2)->default(0)->comment('سعر التكلفة / الشراء');
            $table->decimal('retail_price', 10, 2)->default(0)->comment('سعر البيع قطاعي للكاشير');
            $table->decimal('wholesale_price', 10, 2)->default(0)->comment('سعر البيع جملة للمناديب');
            $table->string('image_path')->nullable();
            $table->decimal('stock_quantity', 12, 2)->default(0)->comment('إجمالي رصيد المخزون في جميع المخازن');
            $table->decimal('min_stock_alert', 12, 2)->default(5)->comment('حد التنبيه عند نقص الكمية');
            $table->string('unit')->default('قطعة');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['tenant_id', 'barcode']);
        });

        // 4. رصيد الصنف داخل كل مخزن أو سيارة (Product Warehouse Stock)
        Schema::create('product_warehouse_stock', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('warehouse_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->decimal('quantity', 12, 2)->default(0)->comment('يمكن أن يكون سالباً إذا بيع أوفلاين');
            $table->timestamps();

            $table->unique(['warehouse_id', 'product_id']);
        });

        // 5. حركات نقل البضاعة وإذن صرف لسيارات المناديب (Stock Movements / Van Dispatches)
        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('from_warehouse_id')->constrained('warehouses')->cascadeOnDelete();
            $table->foreignId('to_warehouse_id')->constrained('warehouses')->cascadeOnDelete();
            $table->foreignId('dispatched_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('received_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('reference_number')->nullable();
            $table->string('type')->default('transfer'); // transfer, van_dispatch, van_return
            $table->string('status')->default('completed'); // pending, completed, cancelled
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // 6. بنود حركة المخزون
        Schema::create('stock_movement_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stock_movement_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->decimal('quantity', 12, 2);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stock_movement_items');
        Schema::dropIfExists('stock_movements');
        Schema::dropIfExists('product_warehouse_stock');
        Schema::dropIfExists('products');
        Schema::dropIfExists('warehouses');
        Schema::dropIfExists('categories');
    }
};
