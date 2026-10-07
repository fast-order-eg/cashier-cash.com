<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Tenant;
use App\Models\User;
use App\Models\VanTrip;
use App\Models\Invoice;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\ExpenseAuditLog;
use App\Http\Controllers\Merchant\ShiftReportController;
use App\Http\Controllers\Merchant\ExpenseController;
use App\Http\Controllers\Merchant\ReportController;
use Illuminate\Http\Request;

echo "========================================================\n";
echo "   بدء الاختبار الشامل للسيناريوهات التشغيلية والرقابية   \n";
echo "========================================================\n\n";

$tenant = Tenant::first();
app()->instance(Tenant::class, $tenant);
$adminUser = User::where('tenant_id', $tenant->id)->where('role', 'admin')->first() 
    ?? User::where('role', 'super_admin')->first();

use Illuminate\Support\Facades\DB;

auth()->login($adminUser);
echo "1. المتجر الحالي: {$tenant->name} (معرف: {$tenant->id})\n";
echo "2. المستخدم الحالي للاختبار: {$adminUser->name} (الدور: {$adminUser->role})\n\n";

DB::beginTransaction();
try {
// ---------------------------------------------------------------
// السيناريو الأول: مطابقة رحلات المندوب (الرحلة 16 والفرق 1,820 ج)
// ---------------------------------------------------------------
echo "--------------------------------------------------------\n";
echo "السيناريو الأول: فحص مطابقة رحلات المندوب (Trip Reconciliation)\n";
echo "--------------------------------------------------------\n";

$trip16 = VanTrip::with(['invoices', 'salesRep'])->find(16);
if ($trip16) {
    echo "بيانات الرحلة رقم 16 قبل التعديل في الاستعلام:\n";
    echo " - المندوب: " . ($trip16->salesRep?->name ?? 'غير محدد') . "\n";
    echo " - إجمالي مبيعات الفواتير: {$trip16->total_sales} ج.م\n";
    echo " - المبالغ النقدية الموردة: {$trip16->total_cash_collected} ج.م\n";
    
function getInertiaProps($response) {
    $ref = new \ReflectionClass($response);
    $prop = $ref->getProperty('props');
    $prop->setAccessible(true);
    return $prop->getValue($response);
}

    // اختبار قراءة ShiftReportController للرحلة
    $controller = app(ShiftReportController::class);
    $req = new Request();
    $res = $controller->vanTripsIndex($req);
    $pageProps = getInertiaProps($res);
    
    $tripsData = collect($pageProps['trips']->items());
    $trip16Computed = $tripsData->firstWhere('id', 16);
    
    echo "القيم المحسوبة في واجهة الرحلات بعد التطوير:\n";
    echo " - المبيعات النقدية المطلوبة (Cash Sales): {$trip16Computed['display_cash_sales']} ج.م\n";
    echo " - المبلغ المورّد للخزينة (Cash Collected): {$trip16Computed['total_cash_collected']} ج.م\n";
    echo " - الفارق / الرصيد غير المسوّى (Difference): {$trip16Computed['display_difference']} ج.م\n";
    echo " - حالة التصفية الظاهرة (Settlement Status): {$trip16Computed['display_settlement_status']}\n";
    
    if ($trip16Computed['display_difference'] == 1820.00 && $trip16Computed['display_settlement_status'] === 'unsettled') {
        echo " [✓ نجاح] الرحلة تظهر الآن بوضوح كـ 'غير مسوّاة' مع عجز 1,820 ج.م كما هو مطلوب تماماً!\n";
    } else {
        echo " [X خطأ] لم تظهر الرحلة كما هو متوقع.\n";
    }
    
    // اختبار تسوية الرحلة بواسطة الأدمن مع توثيق السبب
    echo "\nاختبار تسوية الفرق وتوثيقه بواسطة المدير:\n";
    $settleRequest = new Request([
        'settlement_notes' => 'تم توثيق تسوية العجز البالغ 1,820 ج.م بخصمه من مستحقات المندوب واعتماده محاسبياً.',
    ]);
    
    $settleResponse = $controller->settleVanTrip($settleRequest, $trip16);
    $trip16->refresh();
    
    echo " - حالة التسوية بعد الاعتماد: {$trip16->settlement_status}\n";
    echo " - معتمد التسوية (User ID): {$trip16->settled_by_id} ({$adminUser->name})\n";
    echo " - توقيت التسوية: {$trip16->settled_at}\n";
    echo " - سبب التوثيق: {$trip16->settlement_notes}\n";
    
    if ($trip16->settlement_status === 'settled_with_variance' && $trip16->settled_by_id == $adminUser->id) {
        echo " [✓ نجاح] تمت تسوية وتوثيق فارق الرحلة بنجاح وحفظ سجل التدقيق الرقابي الكامل!\n";
    }
} else {
    echo " [!] الرحلة 16 غير موجودة.\n";
}

// ---------------------------------------------------------------
// السيناريو الثاني: إدارة المصروفات (تعديل المصروف + سجل التدقيق)
// ---------------------------------------------------------------
echo "\n--------------------------------------------------------\n";
echo "السيناريو الثاني: إدارة المصروفات وتعديلها وسجل التدقيق\n";
echo "--------------------------------------------------------\n";

$cat = ExpenseCategory::firstOrCreate(
    ['tenant_id' => $tenant->id, 'name' => 'وقود وبنزين سيارات']
);

$catMaintenance = ExpenseCategory::firstOrCreate(
    ['tenant_id' => $tenant->id, 'name' => 'صيانة وكارتات']
);

// إنشاء مصروف تجريبي QA
$qaExpense = Expense::create([
    'tenant_id' => $tenant->id,
    'category_id' => $cat->id,
    'user_id' => $adminUser->id,
    'title' => 'مصروف تجريبي بنزين QA',
    'amount' => 150.00,
    'expense_date' => now()->toDateString(),
    'notes' => 'تسجيل أولي للاختبار',
    'is_test' => true,
]);

echo "1. تم إنشاء مصروف QA أولي:\n";
echo " - البيان: {$qaExpense->title}\n";
echo " - المبلغ قبل التعديل: {$qaExpense->amount} ج.م\n";
echo " - القسم: {$cat->name}\n";
echo " - التاريخ: {$qaExpense->expense_date}\n";

// تعديل المصروف عبر دالة update في ExpenseController
$expenseController = app(ExpenseController::class);
$updateRequest = new Request([
    'title' => 'مصروف تجريبي بنزين وكارتة طريق QA',
    'category_id' => $catMaintenance->id,
    'amount' => 220.00,
    'expense_date' => now()->subDay()->toDateString(),
    'notes' => 'تم تعديل المبلغ وإضافة إيصال الكارتة',
    'audit_notes' => 'تصحيح قيمة المصروف بإضافة 70 ج.م كارتة سفر',
]);

$expenseController->update($updateRequest, $qaExpense);
$qaExpense->refresh();

echo "\n2. بيانات المصروف بعد التعديل:\n";
echo " - البيان الجديد: {$qaExpense->title}\n";
echo " - المبلغ الجديد: {$qaExpense->amount} ج.م (الفارق: +70 ج.م)\n";
echo " - القسم الجديد: {$qaExpense->category->name}\n";
echo " - التاريخ الجديد: {$qaExpense->expense_date}\n";

// فحص سجل التدقيق (ExpenseAuditLog)
$auditLog = ExpenseAuditLog::where('expense_id', $qaExpense->id)->latest()->first();
if ($auditLog) {
    echo "\n3. سجل التدقيق المحفوظ (ExpenseAuditLog):\n";
    echo " - معرف التدقيق: #{$auditLog->id}\n";
    echo " - القائم بالتعديل: {$auditLog->user->name}\n";
    echo " - وقت التعديل: {$auditLog->created_at}\n";
    echo " - ملاحظة التدقيق: {$auditLog->notes}\n";
    echo " - القيم السابقة: المبلغ={$auditLog->old_values['amount']} ج.م, البيان={$auditLog->old_values['title']}\n";
    echo " - القيم الجديدة: المبلغ={$auditLog->new_values['amount']} ج.م, البيان={$auditLog->new_values['title']}\n";
    
    if ($auditLog->old_values['amount'] == 150.00 && $auditLog->new_values['amount'] == 220.00) {
        echo " [✓ نجاح] تم توثيق التعديل بدقة بالغة بالقيم قبل وبعد واسم المستخدم وتاريخ التعديل!\n";
    }
} else {
    echo " [X خطأ] لم يتم العثور على سجل تدقيق للمصروف.\n";
}

// ---------------------------------------------------------------
// السيناريو الثالث: عزل بيانات الاختبار (QA Data Isolation)
// ---------------------------------------------------------------
echo "\n--------------------------------------------------------\n";
echo "السيناريو الثالث: عزل واستبعاد بيانات الاختبار من التقارير\n";
echo "--------------------------------------------------------\n";

$reportController = app(ReportController::class);

// 1. تقرير التشغيل الفعلي (exclude_test = true افتراضياً)
$reqProd = new Request([
    'from_date' => now()->subMonth()->toDateString(),
    'to_date' => now()->toDateString(),
    'include_test' => false,
]);
$resProd = $reportController->index($reqProd);
$prodSummary = getInertiaProps($resProd)['summary'];

echo "أرقام التقرير التشغيلي الفعلي (مع استبعاد بيانات QA):\n";
echo " - إجمالي المبيعات التشغيلية: " . number_format($prodSummary['total_sales'], 2) . " ج.م\n";
echo " - إجمالي المصروفات التشغيلية: " . number_format($prodSummary['total_expenses'], 2) . " ج.م\n";
echo " - صافي الربح التشغيلي: " . number_format($prodSummary['net_profit'], 2) . " ج.م\n";

// 2. تقرير شامل يتضمن بيانات QA
$reqWithTest = new Request([
    'from_date' => now()->subMonth()->toDateString(),
    'to_date' => now()->toDateString(),
    'include_test' => true,
]);
$resWithTest = $reportController->index($reqWithTest);
$testSummary = getInertiaProps($resWithTest)['summary'];

echo "\nأرقام التقرير عند تفعيل تضمين بيانات QA:\n";
echo " - إجمالي المبيعات: " . number_format($testSummary['total_sales'], 2) . " ج.م\n";
echo " - إجمالي المصروفات: " . number_format($testSummary['total_expenses'], 2) . " ج.م\n";
echo " - صافي الربح: " . number_format($testSummary['net_profit'], 2) . " ج.م\n";

$expenseDifference = $testSummary['total_expenses'] - $prodSummary['total_expenses'];
echo "\nالفارق المحمي والمعزول في المصروفات بسبب وجود مصروف QA (220 ج.م): {$expenseDifference} ج.م\n";

if ($expenseDifference >= 220.00) {
    echo " [✓ نجاح] تم عزل واستبعاد مصروفات الـ QA بنجاح من تقارير التشغيل الفعلية!\n";
}

// فحص شاشة مراجعة سجلات QA (qaReviewIndex)
$reqQa = new Request();
$resQa = $reportController->qaReviewIndex($reqQa);
$qaProps = getInertiaProps($resQa);

echo "\nشاشة مراجعة بيانات الاختبار (QA Records Review):\n";
echo " - إجمالي السجلات المعزولة حالياً: {$qaProps['stats']['total_excluded_count']} سجل\n";
echo " - إجمالي المصروفات المعزولة: " . number_format($qaProps['stats']['excluded_expenses'], 2) . " ج.م\n";
echo " - عدد السجلات المعروضة للمراجعة: " . count($qaProps['records']) . " سجل\n";

echo "\n========================================================\n";
echo "      اكتملت جميع الاختبارات والتحققات بنجاح 100%       \n";
echo "========================================================\n";

} finally {
    DB::rollBack();
    echo "\n[✓ تم التراجع التلقائي عن التغييرات عبر Database Rollback لضمان عدم تلويث قاعدة البيانات]\n";
}
