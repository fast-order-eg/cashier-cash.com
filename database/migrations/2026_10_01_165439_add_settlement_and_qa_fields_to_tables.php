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
        // 1. إضافة حقول التسوية والمطابقة وبيانات الـ QA لجدول رحلات المناديب van_trips
        Schema::table('van_trips', function (Blueprint $table) {
            $table->decimal('cash_sales', 10, 2)->default(0)->after('total_sales')->comment('المبيعات النقدية الفعلية للفواتير');
            $table->decimal('difference', 10, 2)->default(0)->after('total_cash_collected')->comment('الفارق بين النقدية المحصلة والموردة');
            $table->string('settlement_status')->default('open')->after('status')->comment('open, balanced, unsettled, settled_with_variance');
            $table->text('settlement_notes')->nullable()->after('settlement_status');
            $table->foreignId('settled_by_id')->nullable()->after('settlement_notes')->constrained('users')->nullOnDelete();
            $table->timestamp('settled_at')->nullable()->after('settled_by_id');
            $table->boolean('is_test')->default(false)->index()->after('notes');
        });

        // 2. إضافة حقل وسم بيانات الاختبار is_test لجدول الفواتير invoices
        Schema::table('invoices', function (Blueprint $table) {
            $table->boolean('is_test')->default(false)->index()->after('notes');
        });

        // 3. إضافة حقل وسم بيانات الاختبار is_test لجدول المصروفات expenses
        Schema::table('expenses', function (Blueprint $table) {
            $table->boolean('is_test')->default(false)->index()->after('notes');
        });

        // 4. إنشاء جدول سجل تدقيق تعديل المصروفات expense_audit_logs
        Schema::create('expense_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('expense_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action')->default('update');
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->string('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('expense_audit_logs');

        Schema::table('expenses', function (Blueprint $table) {
            $table->dropColumn('is_test');
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->dropColumn('is_test');
        });

        Schema::table('van_trips', function (Blueprint $table) {
            $table->dropForeign(['settled_by_id']);
            $table->dropColumn([
                'cash_sales',
                'difference',
                'settlement_status',
                'settlement_notes',
                'settled_by_id',
                'settled_at',
                'is_test',
            ]);
        });
    }
};
