<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;
use App\Models\Tenant;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Expense;
use App\Models\ExpenseAuditLog;
use App\Models\VanTrip;
use App\Models\CashierShift;
use App\Models\StockMovement;
use App\Models\StockMovementItem;
use App\Models\Product;
use App\Models\ProductWarehouseStock;

echo "=================================================================\n";
echo "        فحص السجلات المرشحة للتنظيف وتحليل الأثر المالي والمخزني   \n";
echo "=================================================================\n\n";

$tenant = Tenant::first();
echo "المتجر: {$tenant->name} (ID: {$tenant->id})\n\n";

// 1. فحص رحلات سيارات التوزيع
echo "==================================================\n";
echo "1. رحلات سيارات التوزيع (van_trips)\n";
echo "==================================================\n";
$allTrips = VanTrip::where('tenant_id', $tenant->id)->get();
echo "إجمالي الرحلات: " . $allTrips->count() . "\n";

$qaTrips = VanTrip::where('tenant_id', $tenant->id)
    ->where(function ($q) {
        $q->where('is_test', true)
          ->orWhere('notes', 'LIKE', '%QA%')
          ->orWhere('notes', 'LIKE', '%OPERATIONAL_ACTUAL%')
          ->orWhere('notes', 'LIKE', '%TEST%')
          ->orWhere('notes', 'LIKE', '%اختبار%');
    })->get();

echo "الرحلات المصنفة كبيانات اختبار: " . $qaTrips->count() . "\n";
$qaTripsSales = $qaTrips->sum('total_sales');
$qaTripsCash = $qaTrips->sum('total_cash_collected');
echo "  - إجمالي مبيعاتها المسجلة: {$qaTripsSales} ج.م\n";
echo "  - إجمالي النقدية المورّدة: {$qaTripsCash} ج.م\n";
foreach ($qaTrips as $t) {
    echo "    * رحلة #{$t->id}: مبيعات={$t->total_sales}, كاش={$t->cash_sales}, توريد={$t->total_cash_collected}, فرق={$t->difference}, is_test=" . ($t->is_test ? '1' : '0') . ", ملاحظات=[{$t->notes}]\n";
}

$nonQaTrips = VanTrip::where('tenant_id', $tenant->id)
    ->whereNotIn('id', $qaTrips->pluck('id'))->get();
echo "\nالرحلات الأخرى (غير اختبار): " . $nonQaTrips->count() . "\n";
foreach ($nonQaTrips as $t) {
    echo "    * رحلة #{$t->id}: مندوب={$t->sales_rep_id}, مبيعات={$t->total_sales}, كاش={$t->cash_sales}, توريد={$t->total_cash_collected}, فرق={$t->difference}, حالة={$t->status}/{$t->settlement_status}, ملاحظات=[{$t->notes}]\n";
}

// 2. فحص الفواتير
echo "\n==================================================\n";
echo "2. فواتير المبيعات (invoices)\n";
echo "==================================================\n";
$allInvoices = Invoice::where('tenant_id', $tenant->id)->get();
echo "إجمالي الفواتير: " . $allInvoices->count() . "\n";

$qaInvoices = Invoice::where('tenant_id', $tenant->id)
    ->where(function ($q) {
        $q->where('is_test', true)
          ->orWhere('invoice_number', 'LIKE', '%QA%')
          ->orWhere('invoice_number', 'LIKE', '%TEST%')
          ->orWhere('customer_name', 'LIKE', '%QA%')
          ->orWhere('customer_name', 'LIKE', '%اختبار%')
          ->orWhere('customer_name', 'LIKE', '%تجريبي%')
          ->orWhere('notes', 'LIKE', '%QA%')
          ->orWhere('notes', 'LIKE', '%TEST%')
          ->orWhere('notes', 'LIKE', '%اختبار%');
    })->get();

echo "الفواتير المرشحة للاختبار: " . $qaInvoices->count() . "\n";
foreach ($qaInvoices as $inv) {
    echo "    * فاتورة #{$inv->id} ({$inv->invoice_number}): إجمالي={$inv->total_amount}, عميل={$inv->customer_name}, رحلة=" . ($inv->van_trip_id ?: 'بدون') . ", is_test=" . ($inv->is_test ? '1' : '0') . ", ملاحظات=[{$inv->notes}]\n";
}

$nonQaInvoices = Invoice::where('tenant_id', $tenant->id)
    ->whereNotIn('id', $qaInvoices->pluck('id'))->get();
echo "\nالفواتير الأخرى: " . $nonQaInvoices->count() . "\n";
foreach ($nonQaInvoices as $inv) {
    echo "    * فاتورة #{$inv->id} ({$inv->invoice_number}): إجمالي={$inv->total_amount}, عميل={$inv->customer_name}, رحلة=" . ($inv->van_trip_id ?: 'بدون') . ", تاريخ={$inv->created_at}\n";
}

// 3. بنود الفواتير وتأثيرها على المخزون
echo "\n==================================================\n";
echo "3. بنود فواتير الاختبار وتأثيرها على كميات المخزون\n";
echo "==================================================\n";
$qaInvIds = $qaInvoices->pluck('id')->toArray();
$items = InvoiceItem::whereIn('invoice_id', $qaInvIds)->get();
echo "إجمالي البنود في فواتير الاختبار المرشحة: " . $items->count() . "\n";
$stockImpactByProduct = [];
foreach ($items as $item) {
    if (!isset($stockImpactByProduct[$item->product_id])) {
        $stockImpactByProduct[$item->product_id] = [
            'name' => $item->product_name,
            'qty' => 0,
        ];
    }
    $stockImpactByProduct[$item->product_id]['qty'] += (float) $item->quantity;
    echo "    * بند: فاتورة #{$item->invoice_id} | صنف #{$item->product_id} ({$item->product_name}) | كمية={$item->quantity} | إجمالي={$item->total_price}\n";
}
echo "ملخص الأثر المخزني لفواتير الاختبار (الكميات المباعة المطلوب استردادها للمخزون إذا حُذفت):\n";
foreach ($stockImpactByProduct as $pId => $data) {
    echo "    - صنف #{$pId} ({$data['name']}): نقص من المخزون بمقدار {$data['qty']} وحدة\n";
}

// 4. حركات نقل المخزون
echo "\n==================================================\n";
echo "4. حركات نقل المخزون (stock_movements)\n";
echo "==================================================\n";
$allMovements = StockMovement::where('tenant_id', $tenant->id)->get();
echo "إجمالي حركات المخزون: " . $allMovements->count() . "\n";
$qaMovements = StockMovement::where('tenant_id', $tenant->id)
    ->where(function ($q) {
        $q->where('reference_number', 'LIKE', '%QA%')
          ->orWhere('reference_number', 'LIKE', '%TEST%')
          ->orWhere('notes', 'LIKE', '%QA%')
          ->orWhere('notes', 'LIKE', '%TEST%')
          ->orWhere('notes', 'LIKE', '%اختبار%');
    })->get();
echo "حركات المخزون المرتبطة باختبار: " . $qaMovements->count() . "\n";
foreach ($qaMovements as $sm) {
    echo "    * حركة #{$sm->id} ({$sm->reference_number}): نوع={$sm->type}, حالة={$sm->status}, ملاحظات=[{$sm->notes}]\n";
}

// 5. المصروفات وسجلات التدقيق
echo "\n==================================================\n";
echo "5. المصروفات (expenses) وسجلات التدقيق (expense_audit_logs)\n";
echo "==================================================\n";
$allExpenses = Expense::where('tenant_id', $tenant->id)->get();
echo "إجمالي المصروفات: " . $allExpenses->count() . "\n";
$qaExpenses = Expense::where('tenant_id', $tenant->id)
    ->where(function ($q) {
        $q->where('is_test', true)
          ->orWhere('title', 'LIKE', '%QA%')
          ->orWhere('title', 'LIKE', '%TEST%')
          ->orWhere('notes', 'LIKE', '%QA%')
          ->orWhere('notes', 'LIKE', '%TEST%')
          ->orWhere('notes', 'LIKE', '%اختبار%');
    })->get();
echo "المصروفات المصنفة كاختبار: " . $qaExpenses->count() . "\n";
foreach ($qaExpenses as $e) {
    echo "    * مصروف #{$e->id}: عنوان=[{$e->title}], مبلغ={$e->amount}, is_test=" . ($e->is_test ? '1' : '0') . "\n";
    $auditLogs = ExpenseAuditLog::where('expense_id', $e->id)->get();
    echo "      سجلات التدقيق المرتبطة: " . $auditLogs->count() . "\n";
}
$nonQaExpenses = Expense::where('tenant_id', $tenant->id)
    ->whereNotIn('id', $qaExpenses->pluck('id'))->get();
echo "\nالمصروفات الأخرى: " . $nonQaExpenses->count() . "\n";
foreach ($nonQaExpenses as $e) {
    echo "    * مصروف #{$e->id}: عنوان=[{$e->title}], مبلغ={$e->amount}, قسم={$e->category_id}\n";
}

// 6. ورديات الكاشير
echo "\n==================================================\n";
echo "6. ورديات الكاشير (cashier_shifts)\n";
echo "==================================================\n";
$allShifts = CashierShift::where('tenant_id', $tenant->id)->get();
echo "إجمالي الورديات: " . $allShifts->count() . "\n";
$qaShifts = CashierShift::where('tenant_id', $tenant->id)
    ->where(function ($q) {
        $q->where('notes', 'LIKE', '%QA%')
          ->orWhere('notes', 'LIKE', '%TEST%')
          ->orWhere('notes', 'LIKE', '%اختبار%');
    })->get();
echo "ورديات كاشير مرتبطة بالاختبار: " . $qaShifts->count() . "\n";
foreach ($qaShifts as $sh) {
    echo "    * وردية #{$sh->id}: كاشير={$sh->user_id}, فتح={$sh->opening_cash}, إغلاق={$sh->closing_cash}, ملاحظات=[{$sh->notes}]\n";
}

// 7. الأصناف والمخزون الحالي
echo "\n==================================================\n";
echo "7. الأصناف الأساسية ومخزونها الحالي في النظام\n";
echo "==================================================\n";
$products = Product::where('tenant_id', $tenant->id)->get();
foreach ($products as $p) {
    $whStocks = ProductWarehouseStock::where('product_id', $p->id)->get();
    $stockBreakdown = [];
    foreach ($whStocks as $ws) {
        $stockBreakdown[] = "مخزن #{$ws->warehouse_id}: {$ws->quantity}";
    }
    echo "    - صنف #{$p->id} [{$p->name}]: باركود={$p->barcode}, سعر={$p->retail_price}, إجمالي_المخزون={$p->stock_quantity} (" . implode(', ', $stockBreakdown) . ")\n";
}

echo "\n=================================================================\n";
