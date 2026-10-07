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
        // 1. إعدادات المنصة وبوابات الدفع بالسوبر أدمن (Platform Settings)
        if (!Schema::hasTable('platform_settings')) {
            Schema::create('platform_settings', function (Blueprint $table) {
                $table->id();
                $table->string('key')->unique();
                $table->text('value')->nullable();
                $table->timestamps();
            });
        }

        // 2. سجل المعاملات المالية الموحد (Paymob / Kashier / الاشتراكات / إضافة الموظفين)
        if (!Schema::hasTable('payment_transactions')) {
            Schema::create('payment_transactions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
                $table->foreignId('subscription_id')->nullable()->constrained()->nullOnDelete();
                $table->string('order_reference')->unique()->index();
                $table->string('gateway')->default('paymob'); // paymob, kashier, test
                $table->string('type')->default('add_staff'); // add_staff, renew, upgrade, registration
                $table->decimal('amount', 10, 2);
                $table->string('currency', 10)->default('EGP');
                $table->string('status')->default('pending'); // pending, paid, failed, cancelled
                $table->string('payment_method')->nullable(); // vodafone_cash, instapay, card, wallet
                $table->string('gateway_order_id')->nullable()->index();
                $table->string('gateway_transaction_id')->nullable()->index();
                $table->json('payload')->nullable();
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payment_transactions');
        Schema::dropIfExists('platform_settings');
    }
};
