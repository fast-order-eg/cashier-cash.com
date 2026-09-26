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
        // 1. أقسام المصروفات (Expense Categories)
        Schema::create('expense_categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->timestamps();
        });

        // 2. المصروفات (Expenses)
        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('category_id')->constrained('expense_categories')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('van_trip_id')->nullable()->constrained('van_trips')->nullOnDelete()->comment('إن كان المصروف يخص رحلة سيارة معينة كالبنزين والكارتات');
            $table->string('title');
            $table->decimal('amount', 10, 2);
            $table->date('expense_date');
            $table->string('attachment_path')->nullable()->comment('صورة الفاتورة / الإيصال');
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // 3. معاملات Kashier للمنصة واشتراكات المتاجر (Kashier Transactions)
        Schema::create('kashier_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('subscription_id')->nullable()->constrained()->nullOnDelete();
            $table->string('kashier_order_id')->index();
            $table->string('transaction_id')->nullable()->index();
            $table->decimal('amount', 10, 2);
            $table->string('currency', 10)->default('EGP');
            $table->string('status')->default('pending'); // pending, SUCCESS, FAILED
            $table->string('payment_method')->nullable(); // card, wallet, etc.
            $table->json('payload')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('kashier_transactions');
        Schema::dropIfExists('expenses');
        Schema::dropIfExists('expense_categories');
    }
};
