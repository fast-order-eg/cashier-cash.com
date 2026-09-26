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
        // 1. ورديات الكاشير (Cashier Shifts)
        Schema::create('cashier_shifts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('opened_at')->useCurrent();
            $table->timestamp('closed_at')->nullable();
            $table->decimal('opening_balance', 10, 2)->default(0)->comment('عهدة البداية');
            $table->decimal('cash_sales', 10, 2)->default(0)->comment('إجمالي المبيعات كاش');
            $table->decimal('card_sales', 10, 2)->default(0)->comment('إجمالي مبيعات الفيزا');
            $table->decimal('closing_balance', 10, 2)->nullable()->comment('المبلغ الفعلي في الدرج عند التقفيل');
            $table->decimal('variance', 10, 2)->default(0)->comment('العجز أو الزيادة في الدرج');
            $table->string('status')->default('open'); // open, closed
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // 2. رحلات وورديات مناديب سيارات الجملة (Van Trips)
        Schema::create('van_trips', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sales_rep_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('warehouse_id')->constrained('warehouses')->cascadeOnDelete();
            $table->timestamp('start_time')->useCurrent();
            $table->timestamp('end_time')->nullable();
            $table->decimal('start_odometer', 10, 2)->default(0)->comment('قراءة عداد السيارة بداية اليوم');
            $table->decimal('end_odometer', 10, 2)->nullable()->comment('قراءة عداد السيارة نهاية اليوم');
            $table->decimal('total_distance', 10, 2)->default(0)->comment('الفرق بين العدادين (كم مقطوع)');
            $table->decimal('total_sales', 10, 2)->default(0)->comment('إجمالي مبيعات اليومية');
            $table->decimal('total_cash_collected', 10, 2)->default(0)->comment('الكاش المحصل والمورد للمحل');
            $table->string('status')->default('open'); // open, closed
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // 3. الفواتير (Invoices)
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('invoice_number')->index();
            $table->uuid('offline_uuid')->nullable()->index()->comment('معرف فريد للفاتورة المنشأة أوفلاين');
            $table->boolean('is_offline_sync')->default(false)->comment('هل الفاتورة تمت مزامنتها بعد انقطاع النت');
            $table->string('type')->default('retail'); // retail (كاشير قطاعي), wholesale (مندوب جملة)
            $table->foreignId('cashier_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('sales_rep_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('warehouse_id')->constrained('warehouses')->cascadeOnDelete();
            $table->foreignId('shift_id')->nullable()->constrained('cashier_shifts')->nullOnDelete();
            $table->foreignId('van_trip_id')->nullable()->constrained('van_trips')->nullOnDelete();
            
            $table->string('customer_name')->nullable();
            $table->string('customer_phone')->nullable();
            
            $table->decimal('subtotal', 10, 2)->default(0);
            $table->decimal('discount_amount', 10, 2)->default(0);
            $table->decimal('tax_amount', 10, 2)->default(0);
            $table->decimal('total_amount', 10, 2)->default(0);
            $table->decimal('cost_total', 10, 2)->default(0)->comment('إجمالي التكلفة لحساب صافي الأرباح');
            $table->decimal('paid_amount', 10, 2)->default(0);
            $table->decimal('remaining_amount', 10, 2)->default(0);
            
            $table->string('payment_method')->default('cash'); // cash, card, credit, split
            $table->string('status')->default('completed'); // completed, refunded, cancelled
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['tenant_id', 'invoice_number']);
        });

        // 4. بنود الفواتير (Invoice Items)
        Schema::create('invoice_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->string('product_name');
            $table->decimal('quantity', 12, 2)->default(1);
            $table->decimal('cost_price', 10, 2)->default(0);
            $table->decimal('unit_price', 10, 2)->default(0);
            $table->decimal('total_price', 10, 2)->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('invoice_items');
        Schema::dropIfExists('invoices');
        Schema::dropIfExists('van_trips');
        Schema::dropIfExists('cashier_shifts');
    }
};
