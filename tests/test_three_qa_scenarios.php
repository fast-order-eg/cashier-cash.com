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
use Illuminate\Http\Request;

echo "=================================================================\n";
echo "   اختبار الحالات الثلاث لفروق تسوية رحلات المندوب (بيانات QA)   \n";
echo "=================================================================\n\n";

$tenant = Tenant::first();
app()->instance(Tenant::class, $tenant);
$adminUser = User::where('tenant_id', $tenant->id)->where('role', 'admin')->first() 
    ?? User::where('role', 'super_admin')->first();

auth()->login($adminUser);
$salesRep = User::where('tenant_id', $tenant->id)->where('role', 'sales_rep')->first() ?? $adminUser;
$warehouse = Warehouse::where('tenant_id', $tenant->id)->first();

use Illuminate\Support\Facades\DB;

echo "المتجر: {$tenant->name} | المدير: {$adminUser->name} | المندوب: {$salesRep->name}\n\n";

DB::beginTransaction();
try {
// ----------------------------------------------------------------------------------
// 1. الحالة الأولى: المبيعات النقدية 0 والتوريد 200 (يجب أن يظهر فائض 200 وألا يسمى عجزاً)
// ----------------------------------------------------------------------------------
echo "-----------------------------------------------------------------\n";
echo "الحالة 1: المبيعات النقدية 0.00 ج.م والتوريد 200.00 ج.م\n";
echo "-----------------------------------------------------------------\n";

$qaTripSurplus = VanTrip::create([
    'tenant_id' => $tenant->id,
    'sales_rep_id' => $salesRep->id,
    'warehouse_id' => $warehouse?->id ?? 1,
    'start_time' => now()->subHours(5),
    'end_time' => now()->subHours(1),
    'start_odometer' => 1000,
    'end_odometer' => 1050,
    'total_distance' => 50,
    'total_sales' => 0.00,
    'cash_sales' => 0.00,
    'total_cash_collected' => 200.00,
    'difference' => -200.00, // 0 - 200 = -200 (فائض)
    'status' => 'closed',
    'settlement_status' => 'unsettled',
    'is_test' => true,
    'notes' => 'QA_TEST_CASE_1_SURPLUS',
]);

// ----------------------------------------------------------------------------------
// 2. الحالة الثانية: المبيعات النقدية 2,020 والتوريد 200 (يجب أن يظهر عجز/رصيد مستحق 1,820)
// ----------------------------------------------------------------------------------
echo "-----------------------------------------------------------------\n";
echo "الحالة 2: المبيعات النقدية 2,020.00 ج.م والتوريد 200.00 ج.م\n";
echo "-----------------------------------------------------------------\n";

$qaTripShortage = VanTrip::create([
    'tenant_id' => $tenant->id,
    'sales_rep_id' => $salesRep->id,
    'warehouse_id' => $warehouse?->id ?? 1,
    'start_time' => now()->subHours(6),
    'end_time' => now()->subHours(2),
    'start_odometer' => 1050,
    'end_odometer' => 1120,
    'total_distance' => 70,
    'total_sales' => 2020.00,
    'cash_sales' => 2020.00,
    'total_cash_collected' => 200.00,
    'difference' => 1820.00, // 2020 - 200 = 1820 (عجز)
    'status' => 'closed',
    'settlement_status' => 'unsettled',
    'is_test' => true,
    'notes' => 'QA_TEST_CASE_2_SHORTAGE',
]);

// ----------------------------------------------------------------------------------
// 3. الحالة الثالثة: المبيعات النقدية 200 والتوريد 200 (يجب أن تظهر متوازنة 0.00)
// ----------------------------------------------------------------------------------
echo "-----------------------------------------------------------------\n";
echo "الحالة 3: المبيعات النقدية 200.00 ج.م والتوريد 200.00 ج.م\n";
echo "-----------------------------------------------------------------\n";

$qaTripBalanced = VanTrip::create([
    'tenant_id' => $tenant->id,
    'sales_rep_id' => $salesRep->id,
    'warehouse_id' => $warehouse?->id ?? 1,
    'start_time' => now()->subHours(4),
    'end_time' => now()->subHours(1),
    'start_odometer' => 1120,
    'end_odometer' => 1160,
    'total_distance' => 40,
    'total_sales' => 200.00,
    'cash_sales' => 200.00,
    'total_cash_collected' => 200.00,
    'difference' => 0.00,
    'status' => 'closed',
    'settlement_status' => 'balanced',
    'is_test' => true,
    'notes' => 'QA_TEST_CASE_3_BALANCED',
]);

// ----------------------------------------------------------------------------------
// فحص قراءة ShiftReportController للحالات الثلاث ولوحة الملخص
// ----------------------------------------------------------------------------------
function getInertiaProps($response) {
    $ref = new \ReflectionClass($response);
    $prop = $ref->getProperty('props');
    $prop->setAccessible(true);
    return $prop->getValue($response);
}

$controller = app(ShiftReportController::class);
$req = new Request(['view_mode' => 'qa']);
$res = $controller->vanTripsIndex($req);
$props = getInertiaProps($res);

$tripsData = collect($props['trips']->items());

$evaluatedSurplus = $tripsData->firstWhere('id', $qaTripSurplus->id);
$evaluatedShortage = $tripsData->firstWhere('id', $qaTripShortage->id);
$evaluatedBalanced = $tripsData->firstWhere('id', $qaTripBalanced->id);

echo "\n=================================================================\n";
echo "                   نتائج الفحص البرمجي والحسابي                  \n";
echo "=================================================================\n\n";

// التحقق من الحالة 1 (الفائض)
echo "1. التحقق من الحالة 1 (مبيعات: 0 | توريد: 200):\n";
echo " - المبيعات النقدية: {$evaluatedSurplus['display_cash_sales']} ج.م\n";
echo " - المبلغ المورد: {$evaluatedSurplus['display_cash_collected']} ج.م\n";
echo " - نوع الفارق المحسوب (variance_type): {$evaluatedSurplus['variance_type']}\n";
echo " - التسمية المعروضة (variance_label): {$evaluatedSurplus['variance_label']}\n";
echo " - مبلغ الفرق المعروض (display_diff_amount): {$evaluatedSurplus['display_diff_amount']} ج.م\n";
echo " - حالة التسوية الظاهرة (display_settlement_status): {$evaluatedSurplus['display_settlement_status']}\n";

$passCase1 = ($evaluatedSurplus['variance_type'] === 'surplus') 
    && ($evaluatedSurplus['variance_label'] === 'فائض توريد')
    && ($evaluatedSurplus['display_diff_amount'] == 200.00)
    && ($evaluatedSurplus['display_settlement_status'] === 'unsettled');

if ($passCase1) {
    echo " [✓ ممتاز] نجاح الحالة 1: ظهرت كـ 'فائض توريد' بمبلغ 200 ج.م وحالة 'غير مسوّاة'، ولم تسمى عجزاً!\n\n";
} else {
    echo " [X فشل] لم تتطابق الحالة 1.\n\n";
}

// التحقق من الحالة 2 (العجز)
echo "2. التحقق من الحالة 2 (مبيعات: 2020 | توريد: 200):\n";
echo " - المبيعات النقدية: {$evaluatedShortage['display_cash_sales']} ج.م\n";
echo " - المبلغ المورد: {$evaluatedShortage['display_cash_collected']} ج.م\n";
echo " - نوع الفارق المحسوب (variance_type): {$evaluatedShortage['variance_type']}\n";
echo " - التسمية المعروضة (variance_label): {$evaluatedShortage['variance_label']}\n";
echo " - مبلغ الفرق المعروض (display_diff_amount): {$evaluatedShortage['display_diff_amount']} ج.م\n";
echo " - حالة التسوية الظاهرة (display_settlement_status): {$evaluatedShortage['display_settlement_status']}\n";

$passCase2 = ($evaluatedShortage['variance_type'] === 'shortage')
    && ($evaluatedShortage['variance_label'] === 'عجز / رصيد مستحق')
    && ($evaluatedShortage['display_diff_amount'] == 1820.00)
    && ($evaluatedShortage['display_settlement_status'] === 'unsettled');

if ($passCase2) {
    echo " [✓ ممتاز] نجاح الحالة 2: ظهرت كـ 'عجز / رصيد مستحق' بمبلغ 1,820 ج.م وحالة 'غير مسوّاة'!\n\n";
} else {
    echo " [X فشل] لم تتطابق الحالة 2.\n\n";
}

// التحقق من الحالة 3 (المتوازنة)
echo "3. التحقق من الحالة 3 (مبيعات: 200 | توريد: 200):\n";
echo " - المبيعات النقدية: {$evaluatedBalanced['display_cash_sales']} ج.م\n";
echo " - المبلغ المورد: {$evaluatedBalanced['display_cash_collected']} ج.م\n";
echo " - نوع الفارق المحسوب (variance_type): {$evaluatedBalanced['variance_type']}\n";
echo " - التسمية المعروضة (variance_label): {$evaluatedBalanced['variance_label']}\n";
echo " - مبلغ الفرق المعروض (display_diff_amount): {$evaluatedBalanced['display_diff_amount']} ج.م\n";
echo " - حالة التسوية الظاهرة (display_settlement_status): {$evaluatedBalanced['display_settlement_status']}\n";

$passCase3 = ($evaluatedBalanced['variance_type'] === 'balanced')
    && ($evaluatedBalanced['variance_label'] === 'متوازنة')
    && ($evaluatedBalanced['display_diff_amount'] == 0.00)
    && ($evaluatedBalanced['display_settlement_status'] === 'balanced');

if ($passCase3) {
    echo " [✓ ممتاز] نجاح الحالة 3: ظهرت كـ 'متوازنة' بمبلغ 0.00 ج.م وحالة 'مسوّاة بالكامل'!\n\n";
} else {
    echo " [X فشل] لم تتطابق الحالة 3.\n\n";
}

// التحقق من لوحة الملخص (شاملة كل فرق غير معتمد: عجز أو فائض)
echo "4. التحقق من لوحة الملخص (Summary Stats):\n";
echo " - إجمالي الرحلات غير المسوّاة (unsettled_count): {$props['stats']['unsettled_count']}\n";
echo " - عدد رحلات العجز (unsettled_shortage_count): {$props['stats']['unsettled_shortage_count']}\n";
echo " - إجمالي مبالغ العجز (unsettled_shortage_amount): " . number_format($props['stats']['unsettled_shortage_amount'], 2) . " ج.م\n";
echo " - عدد رحلات الفائض (unsettled_surplus_count): {$props['stats']['unsettled_surplus_count']}\n";
echo " - إجمالي مبالغ الفائض (unsettled_surplus_amount): " . number_format($props['stats']['unsettled_surplus_amount'], 2) . " ج.م\n";

$passStats = ($props['stats']['unsettled_count'] >= 2) 
    && ($props['stats']['unsettled_shortage_count'] >= 1) 
    && ($props['stats']['unsettled_surplus_count'] >= 1);

if ($passStats) {
    echo " [✓ ممتاز] نجاح لوحة الملخص: المؤشر يشمل كل الفروق غير المعتمدة (العجز والفائض) مع تفصيل نوع كل فرق ومبلغه بدقة!\n\n";
}

// التحقق من فلتر 'status=unsettled'
$reqFilter = new Request(['status' => 'unsettled', 'view_mode' => 'qa']);
$resFilter = $controller->vanTripsIndex($reqFilter);
$filterProps = getInertiaProps($resFilter);
$unsettledList = collect($filterProps['trips']->items());

$hasSurplusInFilter = $unsettledList->contains('id', $qaTripSurplus->id);
$hasShortageInFilter = $unsettledList->contains('id', $qaTripShortage->id);
$hasBalancedInFilter = $unsettledList->contains('id', $qaTripBalanced->id);

echo "5. التحقق من فلتر التصفية (status=unsettled):\n";
echo " - هل يشمل رحلة الفائض غير المعتمدة؟ " . ($hasSurplusInFilter ? 'نعم [✓]' : 'لا [X]') . "\n";
echo " - هل يشمل رحلة العجز غير المعتمدة؟ " . ($hasShortageInFilter ? 'نعم [✓]' : 'لا [X]') . "\n";
echo " - هل يستبعد الرحلة المتوازنة؟ " . (!$hasBalancedInFilter ? 'نعم [✓]' : 'لا [X]') . "\n";

echo "\n=================================================================\n";
if ($passCase1 && $passCase2 && $passCase3 && $passStats && $hasSurplusInFilter && $hasShortageInFilter && !$hasBalancedInFilter) {
    echo "   نتيجة الفحص النهائي: جميع الحالات الثلاث متطابقة وناجحة 100%!  \n";
} else {
    echo "   نتيجة الفحص النهائي: يوجد حالة تحتاج مراجعة.  \n";
}
echo "=================================================================\n";

} finally {
    DB::rollBack();
    echo "\n[✓ تم التراجع التلقائي عن التغييرات عبر Database Rollback لضمان عدم تلويث قاعدة البيانات]\n";
}
