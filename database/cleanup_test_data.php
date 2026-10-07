<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;
use App\Models\Tenant;
use App\Models\VanTrip;
use App\Models\Expense;
use App\Models\ExpenseAuditLog;

echo "=================================================================\n";
echo "   تنفيذ التنظيف الآمن لبيانات الاختبار المؤكدة (QA Cleanup)     \n";
echo "=================================================================\n\n";

$tenant = Tenant::first();
echo "المتجر: {$tenant->name} (ID: {$tenant->id})\n\n";

DB::beginTransaction();
try {
    // 1. تحديد وحذف رحلات الاختبار المؤكدة
    $targetTrips = VanTrip::where('tenant_id', $tenant->id)
        ->where(function ($q) {
            $q->where('is_test', true)
              ->orWhere('notes', 'LIKE', 'QA_%')
              ->orWhere('notes', 'LIKE', 'OPERATIONAL_ACTUAL_%');
        })
        ->get();

    echo "1. رحلات الاختبار المؤكدة المستهدفة بالحذف: " . $targetTrips->count() . " رحلة\n";
    $deletedTripsCount = 0;
    foreach ($targetTrips as $trip) {
        echo "   - حذف رحلة #{$trip->id} | مبيعات: {$trip->total_sales} | كاش: {$trip->total_cash_collected} | ملاحظات: [{$trip->notes}]\n";
        $trip->delete();
        $deletedTripsCount++;
    }

    // 2. تحديد وحذف سجلات تدقيق المصروفات المرتبطة بمصروفات الاختبار
    $targetExpenses = Expense::where('tenant_id', $tenant->id)
        ->where(function ($q) {
            $q->where('is_test', true)
              ->orWhere('title', 'LIKE', '%QA%')
              ->orWhere('title', 'LIKE', '%اختبار آلي%');
        })
        ->get();

    $expenseIds = $targetExpenses->pluck('id')->toArray();
    $targetAuditLogs = ExpenseAuditLog::whereIn('expense_id', $expenseIds)->get();

    echo "\n2. سجلات تدقيق المصروفات المرتبطة المستهدفة بالحذف: " . $targetAuditLogs->count() . " سجل\n";
    $deletedLogsCount = 0;
    foreach ($targetAuditLogs as $log) {
        echo "   - حذف سجل تدقيق #{$log->id} للمصروف #{$log->expense_id} | ملاحظة: [{$log->notes}]\n";
        $log->delete();
        $deletedLogsCount++;
    }

    // 3. حذف مصروفات الاختبار
    echo "\n3. مصروفات الاختبار المستهدفة بالحذف: " . $targetExpenses->count() . " مصروف\n";
    $deletedExpensesCount = 0;
    foreach ($targetExpenses as $expense) {
        echo "   - حذف مصروف #{$expense->id} | عنوان: [{$expense->title}] | مبلغ: {$expense->amount} ج.م | is_test: " . ($expense->is_test ? '1' : '0') . "\n";
        $expense->delete();
        $deletedExpensesCount++;
    }

    DB::commit();

    echo "\n=================================================================\n";
    echo "تم تأكيد وتنفيذ التنظيف بنجاح في قاعدة البيانات!\n";
    echo "  - إجمالي الرحلات المحذوفة: {$deletedTripsCount}\n";
    echo "  - إجمالي المصروفات المحذوفة: {$deletedExpensesCount}\n";
    echo "  - إجمالي سجلات تدقيق المصروفات المحذوفة: {$deletedLogsCount}\n";
    echo "  - المستخدمين، الأصناف، المخزون، الإعدادات: لم يُمس أي منها نهائياً.\n";
    echo "=================================================================\n";
} catch (\Throwable $e) {
    DB::rollBack();
    echo "حدث خطأ أثناء التنظيف وتم التراجع بالكامل (Rollback): " . $e->getMessage() . "\n";
    exit(1);
}
