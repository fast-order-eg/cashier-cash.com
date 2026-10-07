<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Tenant;
use App\Models\User;
use App\Models\VanTrip;
use App\Models\Expense;
use App\Models\Invoice;
use App\Models\CashierShift;
use App\Models\Product;
use App\Http\Controllers\Merchant\DashboardController;
use App\Http\Controllers\Merchant\ReportController;
use App\Http\Controllers\Merchant\ShiftReportController;
use Illuminate\Http\Request;

echo "=================================================================\n";
echo "   فحص لوحة الأدمن والتقارير والورديات والمخزون بعد التنظيف      \n";
echo "=================================================================\n\n";

$tenant = Tenant::first();
app()->instance(Tenant::class, $tenant);
$adminUser = User::where('tenant_id', $tenant->id)->where('role', 'admin')->first() 
    ?? User::where('role', 'super_admin')->first();
auth()->login($adminUser);

function getInertiaProps($response) {
    $ref = new \ReflectionClass($response);
    $prop = $ref->getProperty('props');
    $prop->setAccessible(true);
    return $prop->getValue($response);
}

// 1. لوحة الأدمن الرئيسية (Admin Dashboard)
echo "1. لوحة الأدمن الرئيسية (/admin/dashboard):\n";
$dashboardController = app(DashboardController::class);
$dashReq = Request::create('/admin/dashboard', 'GET');
$dashRes = $dashboardController->index($dashReq);
$dashProps = getInertiaProps($dashRes);
$metrics = $dashProps['metrics'] ?? [];

echo " - إجمالي مبيعات اليوم: " . ($metrics['today_sales'] ?? '0') . " ج.م\n";
echo " - عدد فواتير اليوم: " . ($metrics['today_invoices_count'] ?? '0') . "\n";
echo " - إجمالي مبيعات الشهر: " . ($metrics['monthly_sales'] ?? '0') . " ج.م\n";
echo " - إجمالي المصروفات: " . ($metrics['monthly_expenses'] ?? '0') . " ج.م\n";
echo " - عدد الأصناف منخفضة المخزون: " . ($metrics['low_stock_count'] ?? '0') . "\n";

// 2. تقارير الأرباح والمبيعات التشغيلية (/admin/reports)
echo "\n2. تقرير المبيعات والأرباح التشغيلي (/admin/reports):\n";
$reportController = app(ReportController::class);
$repReq = Request::create('/admin/reports', 'GET', [
    'from_date' => now()->subMonth()->toDateString(),
    'to_date' => now()->toDateString(),
    'include_test' => false,
]);
$repRes = $reportController->index($repReq);
$repProps = getInertiaProps($repRes);
$repSummary = $repProps['summary'] ?? [];

echo " - إجمالي المبيعات التشغيلية: " . number_format($repSummary['total_sales'] ?? 0, 2) . " ج.م\n";
echo " - إجمالي المصروفات التشغيلية: " . number_format($repSummary['total_expenses'] ?? 0, 2) . " ج.م\n";
echo " - صافي الربح التشغيلي: " . number_format($repSummary['net_profit'] ?? 0, 2) . " ج.م\n";
echo " - عدد الفواتير التشغيلية: " . ($repSummary['invoices_count'] ?? 0) . "\n";

// 3. شاشة مراجعة QA المعزولة (/admin/reports/qa-review)
echo "\n3. شاشة مراجعة سجلات الاختبار المعزولة (/admin/reports/qa-review):\n";
$qaRevReq = Request::create('/admin/reports/qa-review', 'GET');
$qaRevRes = $reportController->qaReviewIndex($qaRevReq);
$qaRevProps = getInertiaProps($qaRevRes);
$qaStats = $qaRevProps['stats'] ?? [];

echo " - إجمالي السجلات المعزولة المتبقية: " . ($qaStats['total_excluded_count'] ?? 0) . "\n";
echo " - إجمالي مبيعات QA المعزولة: " . ($qaStats['excluded_sales'] ?? 0) . " ج.م\n";
echo " - إجمالي مصروفات QA المعزولة: " . ($qaStats['excluded_expenses'] ?? 0) . " ج.م\n";

// 4. جدول وإحصائيات رحلات سيارات التوزيع (/admin/van-trips)
echo "\n4. شاشة رحلات سيارات التوزيع (/admin/van-trips):\n";
$shiftController = app(ShiftReportController::class);
$tripsReq = Request::create('/admin/van-trips', 'GET');
$tripsRes = $shiftController->vanTripsIndex($tripsReq);
$tripsProps = getInertiaProps($tripsRes);
$tripsStats = $tripsProps['stats'] ?? [];
$tripsList = collect($tripsProps['trips']->items());

echo " - إجمالي الرحلات المعروضة في التشغيل: " . $tripsList->count() . "\n";
echo " - عداد رحلات QA المكتشفة في النظام: " . ($tripsStats['qa_trips_count'] ?? 0) . "\n";
echo " - عدد الرحلات ذات الفروق غير المعتمدة: " . ($tripsStats['unsettled_count'] ?? 0) . "\n";
echo " - مبلغ العجز التشغيلي غير المعتمد: " . ($tripsStats['unsettled_shortage_amount'] ?? 0) . " ج.م\n";
echo " - مبلغ الفائض التشغيلي غير المعتمد: " . ($tripsStats['unsettled_surplus_amount'] ?? 0) . " ج.م\n";

// 5. ورديات الكاشير (/admin/shifts)
echo "\n5. ورديات الكاشير (/admin/shifts):\n";
$shiftsReq = Request::create('/admin/shifts', 'GET');
$shiftsRes = $shiftController->shiftsIndex($shiftsReq);
$shiftsProps = getInertiaProps($shiftsRes);
$shiftsList = collect($shiftsProps['shifts']->items());

echo " - إجمالي الورديات في النظام: " . $shiftsList->count() . "\n";
$openShifts = $shiftsList->where('status', 'open');
echo " - الورديات المفتوحة حالياً: " . $openShifts->count() . "\n";
foreach ($openShifts as $os) {
    echo "    * وردية مفتوحة #{$os->id}: كاشير=" . ($os->cashier?->name ?? $os->user_id) . ", فتح=" . $os->opening_balance . ", مبيعات=" . $os->cash_sales . "\n";
}

// 6. مخزون المتجر
echo "\n6. أرصدة المخزون الأساسية بالمتجر:\n";
$products = Product::where('tenant_id', $tenant->id)->take(6)->get();
foreach ($products as $p) {
    echo " - صنف [{$p->name}]: السعر={$p->retail_price} ج.م | المخزون الكلي={$p->stock_quantity}\n";
}

echo "\n=================================================================\n";
echo "           اكتمل الفحص الشامل للأنظمة بعد التنظيف                \n";
echo "=================================================================\n";
