<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Tenant;
use App\Models\User;
use App\Models\VanTrip;
use App\Models\Warehouse;
use App\Http\Controllers\Merchant\ShiftReportController;
use App\Http\Controllers\Merchant\ReportController;
use Illuminate\Http\Request;

echo "=================================================================\n";
echo "   اختبار عزل رحلات QA والتشغيل الفعلي وفلاتر التسوية والمطابقة   \n";
echo "=================================================================\n\n";

$tenant = Tenant::first();
app()->instance(Tenant::class, $tenant);
$adminUser = User::where('tenant_id', $tenant->id)->where('role', 'admin')->first() 
    ?? User::where('role', 'super_admin')->first();

auth()->login($adminUser);
$salesRep = User::where('tenant_id', $tenant->id)->where('role', 'sales_rep')->first() ?? $adminUser;
$warehouse = Warehouse::where('tenant_id', $tenant->id)->first();

use Illuminate\Support\Facades\DB;

echo "المتجر: {$tenant->name} (ID: {$tenant->id}) | المستخدم: {$adminUser->name}\n\n";

DB::beginTransaction();
try {
// 1. إنشاء رحلتين QA معزولتين (is_test = true)
$qaTrip1 = VanTrip::create([
    'tenant_id' => $tenant->id,
    'sales_rep_id' => $salesRep->id,
    'warehouse_id' => $warehouse?->id ?? 1,
    'start_time' => now()->subHours(8),
    'end_time' => now()->subHours(4),
    'start_odometer' => 2000,
    'end_odometer' => 2050,
    'total_distance' => 50,
    'total_sales' => 1500.00,
    'cash_sales' => 1500.00,
    'total_cash_collected' => 500.00,
    'difference' => 1000.00, // عجز تجريبي
    'status' => 'closed',
    'settlement_status' => 'unsettled',
    'is_test' => true,
    'notes' => 'QA_ISOLATED_TRIP_1',
]);

$qaTrip2 = VanTrip::create([
    'tenant_id' => $tenant->id,
    'sales_rep_id' => $salesRep->id,
    'warehouse_id' => $warehouse?->id ?? 1,
    'start_time' => now()->subHours(7),
    'end_time' => now()->subHours(3),
    'start_odometer' => 2050,
    'end_odometer' => 2090,
    'total_distance' => 40,
    'total_sales' => 0.00,
    'cash_sales' => 0.00,
    'total_cash_collected' => 300.00,
    'difference' => -300.00, // فائض تجريبي
    'status' => 'closed',
    'settlement_status' => 'unsettled',
    'is_test' => true,
    'notes' => 'QA_ISOLATED_TRIP_2',
]);

echo "[+] تم إنشاء رحلتي QA معزولتين (ID: {$qaTrip1->id}, {$qaTrip2->id}) مع is_test=true\n\n";

// 2. إنشاء رحلات تشغيل فعلية غير معزولة (is_test = false)
// أ) رحلة عجز فعلية: مبيعات 2020، توريد 200 => عجز 1820
$opShortageTrip = VanTrip::create([
    'tenant_id' => $tenant->id,
    'sales_rep_id' => $salesRep->id,
    'warehouse_id' => $warehouse?->id ?? 1,
    'start_time' => now()->subHours(5),
    'end_time' => now()->subHours(2),
    'start_odometer' => 3000,
    'end_odometer' => 3070,
    'total_distance' => 70,
    'total_sales' => 2020.00,
    'cash_sales' => 2020.00,
    'total_cash_collected' => 200.00,
    'difference' => 1820.00,
    'status' => 'closed',
    'settlement_status' => 'unsettled',
    'is_test' => false,
    'notes' => 'OPERATIONAL_ACTUAL_SHORTAGE',
]);

// ب) رحلة فائض فعلية: مبيعات 0، توريد 200 => فائض 200
$opSurplusTrip = VanTrip::create([
    'tenant_id' => $tenant->id,
    'sales_rep_id' => $salesRep->id,
    'warehouse_id' => $warehouse?->id ?? 1,
    'start_time' => now()->subHours(4),
    'end_time' => now()->subHours(1),
    'start_odometer' => 3070,
    'end_odometer' => 3110,
    'total_distance' => 40,
    'total_sales' => 0.00,
    'cash_sales' => 0.00,
    'total_cash_collected' => 200.00,
    'difference' => -200.00,
    'status' => 'closed',
    'settlement_status' => 'unsettled',
    'is_test' => false,
    'notes' => 'OPERATIONAL_ACTUAL_SURPLUS',
]);

// ج) رحلة متوازنة فعلية: مبيعات 200، توريد 200 => فرق 0
$opBalancedTrip = VanTrip::create([
    'tenant_id' => $tenant->id,
    'sales_rep_id' => $salesRep->id,
    'warehouse_id' => $warehouse?->id ?? 1,
    'start_time' => now()->subHours(3),
    'end_time' => now()->subMinutes(30),
    'start_odometer' => 3110,
    'end_odometer' => 3140,
    'total_distance' => 30,
    'total_sales' => 200.00,
    'cash_sales' => 200.00,
    'total_cash_collected' => 200.00,
    'difference' => 0.00,
    'status' => 'closed',
    'settlement_status' => 'balanced',
    'is_test' => false,
    'notes' => 'OPERATIONAL_ACTUAL_BALANCED',
]);

echo "[+] تم إنشاء رحلات التشغيل الفعلي (غير معزولة is_test=false):\n";
echo "    - رحلة عجز فعلية ID: {$opShortageTrip->id} (مبيعات 2,020 - توريد 200 = عجز 1,820)\n";
echo "    - رحلة فائض فعلية ID: {$opSurplusTrip->id} (مبيعات 0 - توريد 200 = فائض 200)\n";
echo "    - رحلة متوازنة فعلية ID: {$opBalancedTrip->id} (مبيعات 200 - توريد 200 = متوازنة 0)\n\n";

$controller = app(ShiftReportController::class);

// ----------------------------------------------------------------------------------
// أ) اختبار شاشة التشغيل الافتراضية (view_mode = operational الافتراضي)
// ----------------------------------------------------------------------------------
echo "-----------------------------------------------------------------\n";
echo "1. التحقق من شاشة التشغيل الفعلي (الافتراضية: view_mode=operational)\n";
echo "-----------------------------------------------------------------\n";

$reqOp = Request::create('/admin/van-trips', 'GET');
$respOp = $controller->vanTripsIndex($reqOp);
$dataOp = $respOp->toResponse($reqOp)->getOriginalContent()['page']['props'];

$opTripIds = collect($dataOp['trips']['data'])->pluck('id')->toArray();
$opStats = $dataOp['stats'];

echo "إجمالي الرحلات في جدول التشغيل: " . count($opTripIds) . "\n";
echo "عداد رحلات QA المكتشفة في النظام: " . ($opStats['qa_trips_count'] ?? 0) . "\n";
echo "مؤشر رحلات بها فروق غير معتمدة: {$opStats['unsettled_count']}\n";
echo "مؤشر العجز التشغيلي: {$opStats['unsettled_shortage_amount']} ج.م (عدد: {$opStats['unsettled_shortage_count']})\n";
echo "مؤشر الفائض التشغيلي: {$opStats['unsettled_surplus_amount']} ج.م (عدد: {$opStats['unsettled_surplus_count']})\n\n";

// الفحوصات:
// 1. رحلتا QA المعزولتان لا تظهران في جدول التشغيل
$qaInOp1 = in_array($qaTrip1->id, $opTripIds);
$qaInOp2 = in_array($qaTrip2->id, $opTripIds);
echo "فحص: عدم ظهور رحلة QA الأولى في التشغيل: " . (!$qaInOp1 ? "✅ نجح (معزولة)" : "❌ فشل") . "\n";
echo "فحص: عدم ظهور رحلة QA الثانية في التشغيل: " . (!$qaInOp2 ? "✅ نجح (معزولة)" : "❌ فشل") . "\n";

// 2. رحلات التشغيل تظهر في الجدول
$hasShortage = in_array($opShortageTrip->id, $opTripIds);
$hasSurplus = in_array($opSurplusTrip->id, $opTripIds);
$hasBalanced = in_array($opBalancedTrip->id, $opTripIds);
echo "فحص: ظهور رحلة العجز الفعلية في التشغيل: " . ($hasShortage ? "✅ نجح" : "❌ فشل") . "\n";
echo "فحص: ظهور رحلة الفائض الفعلية في التشغيل: " . ($hasSurplus ? "✅ نجح" : "❌ فشل") . "\n";
echo "فحص: ظهور الرحلة المتوازنة في التشغيل: " . ($hasBalanced ? "✅ نجح" : "❌ فشل") . "\n";

// ----------------------------------------------------------------------------------
// ب) اختبار فلتر status=unsettled في وضع التشغيل الفعلي
// ----------------------------------------------------------------------------------
echo "\n-----------------------------------------------------------------\n";
echo "2. التحقق من فلتر الرحلات غير المسوّاة (status=unsettled)\n";
echo "-----------------------------------------------------------------\n";

$reqUnsettled = Request::create('/admin/van-trips', 'GET', ['status' => 'unsettled']);
$respUnsettled = $controller->vanTripsIndex($reqUnsettled);
$dataUnsettled = $respUnsettled->toResponse($reqUnsettled)->getOriginalContent()['page']['props'];

$unsettledTripIds = collect($dataUnsettled['trips']['data'])->pluck('id')->toArray();

echo "الرحلات الظاهرة في فلتر غير المسوّى: " . implode(', ', $unsettledTripIds) . "\n";

// الفحوصات:
// 1. رحلة العجز تظهر
$unsettledHasShortage = in_array($opShortageTrip->id, $unsettledTripIds);
echo "فحص: رحلة العجز الفعلية تظهر في قائمة غير المسوّى: " . ($unsettledHasShortage ? "✅ نجح" : "❌ فشل") . "\n";

// 2. رحلة الفائض تظهر
$unsettledHasSurplus = in_array($opSurplusTrip->id, $unsettledTripIds);
echo "فحص: رحلة الفائض الفعلية تظهر في قائمة غير المسوّى: " . ($unsettledHasSurplus ? "✅ نجح" : "❌ فشل") . "\n";

// 3. الرحلة المتوازنة لا تظهر
$unsettledHasBalanced = in_array($opBalancedTrip->id, $unsettledTripIds);
echo "فحص: الرحلة المتوازنة لا تظهر في قائمة غير المسوّى: " . (!$unsettledHasBalanced ? "✅ نجح (مستبعدة تماماً)" : "❌ فشل") . "\n";

// 4. رحلات QA لا تظهر في غير المسوّى التشغيلي
$unsettledHasQa1 = in_array($qaTrip1->id, $unsettledTripIds);
$unsettledHasQa2 = in_array($qaTrip2->id, $unsettledTripIds);
echo "فحص: رحلات QA المعزولة لا تظهر في غير المسوّى التشغيلي: " . ((!$unsettledHasQa1 && !$unsettledHasQa2) ? "✅ نجح (معزولة)" : "❌ فشل") . "\n";

// ----------------------------------------------------------------------------------
// ج) اختبار عرض رحلات QA المنفصلة (view_mode = qa)
// ----------------------------------------------------------------------------------
echo "\n-----------------------------------------------------------------\n";
echo "3. التحقق من شاشة مراجعة رحلات QA المعزولة للأدمن (view_mode=qa)\n";
echo "-----------------------------------------------------------------\n";

$reqQa = Request::create('/admin/van-trips', 'GET', ['view_mode' => 'qa']);
$respQa = $controller->vanTripsIndex($reqQa);
$dataQa = $respQa->toResponse($reqQa)->getOriginalContent()['page']['props'];

$qaViewTripIds = collect($dataQa['trips']['data'])->pluck('id')->toArray();
echo "الرحلات الظاهرة في وضع QA المنفصل: " . implode(', ', $qaViewTripIds) . "\n";

$qaViewHasQa1 = in_array($qaTrip1->id, $qaViewTripIds);
$qaViewHasQa2 = in_array($qaTrip2->id, $qaViewTripIds);
$qaViewHasOpShortage = in_array($opShortageTrip->id, $qaViewTripIds);

echo "فحص: ظهور رحلة QA الأولى في وضع QA: " . ($qaViewHasQa1 ? "✅ نجح" : "❌ فشل") . "\n";
echo "فحص: ظهور رحلة QA الثانية في وضع QA: " . ($qaViewHasQa2 ? "✅ نجح" : "❌ فشل") . "\n";
echo "فحص: عدم ظهور رحلات التشغيل الفعلي في وضع QA: " . (!$qaViewHasOpShortage ? "✅ نجح (معزولة تماماً)" : "❌ فشل") . "\n";

// ----------------------------------------------------------------------------------
// د) اختبار شاشة مراجعة QA واحتساب المبيعات المعزولة دون تكرار
// ----------------------------------------------------------------------------------
echo "\n-----------------------------------------------------------------\n";
echo "4. التحقق من بطاقة المبيعات المعزولة في شاشة مراجعة QA (/admin/reports/qa-review)\n";
echo "-----------------------------------------------------------------\n";

$reportController = app(ReportController::class);
$reqQaReview = Request::create('/admin/reports/qa-review', 'GET');
$respQaReview = $reportController->qaReviewIndex($reqQaReview);
$dataQaReview = $respQaReview->toResponse($reqQaReview)->getOriginalContent()['page']['props'];

$stats = $dataQaReview['stats'];
echo "إجمالي المبيعات التجريبية المعزولة: {$stats['excluded_sales']} ج.م\n";
echo "  - مبيعات رحلات QA المعزولة: {$stats['excluded_trips_sales']} ج.م\n";
echo "  - مبيعات فواتير QA المعزولة: {$stats['excluded_invoices_sales']} ج.م\n";

$totalTripsInDb = VanTrip::where('tenant_id', $tenant->id)->where('is_test', true)->sum('total_sales');
echo "فحص: تطابق مبيعات رحلات QA المحتسبة ({$stats['excluded_trips_sales']}) مع قاعدة البيانات ({$totalTripsInDb}): " 
    . ((float)$stats['excluded_trips_sales'] == (float)$totalTripsInDb ? "✅ نجح" : "❌ فشل") . "\n";

echo "\n=================================================================\n";
echo "                       اكتمل الاختبار بنجاح                      \n";
echo "=================================================================\n";

} finally {
    DB::rollBack();
    echo "\n[✓ تم التراجع التلقائي عن التغييرات عبر Database Rollback لضمان عدم تلويث قاعدة البيانات]\n";
}
