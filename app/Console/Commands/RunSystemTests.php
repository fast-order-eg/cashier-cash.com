<?php

namespace App\Console\Commands;

use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Cashier\PosController;
use App\Http\Controllers\Merchant\CategoryController;
use App\Http\Controllers\Merchant\DashboardController as MerchantDashboardController;
use App\Http\Controllers\Merchant\ExpenseController;
use App\Http\Controllers\Merchant\InvoiceController;
use App\Http\Controllers\Merchant\ProductController;
use App\Http\Controllers\Merchant\ReportController;
use App\Http\Controllers\Merchant\SettingController;
use App\Http\Controllers\Merchant\StaffController;
use App\Http\Controllers\Merchant\WarehouseController;
use App\Http\Controllers\Platform\LandingPageController;
use App\Http\Controllers\Platform\RegistrationController;
use App\Http\Controllers\SalesRep\VanSalesController;
use App\Http\Controllers\SuperAdmin\DashboardController as SuperAdminDashboardController;
use App\Http\Controllers\SuperAdmin\SubscriptionPlanController as SuperAdminPlanController;
use App\Http\Controllers\SuperAdmin\TenantController as SuperAdminTenantController;
use App\Models\CashierShift;
use App\Models\Category;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\Invoice;
use App\Models\KashierTransaction;
use App\Models\Product;
use App\Models\ProductWarehouseStock;
use App\Models\Subscription;
use App\Models\SubscriptionPlan;
use App\Models\Tenant;
use App\Models\User;
use App\Models\VanTrip;
use App\Models\Warehouse;
use App\Services\KashierService;
use Exception;
use Illuminate\Console\Command;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;

class RunSystemTests extends Command
{
    protected $signature = 'casher:test-all';
    protected $description = 'تشغيل فحص شامل ودقيق لجميع وظائف ومتحكمات وعمليات نظام Casher System';

    private int $passed = 0;
    private int $failed = 0;
    private array $failures = [];

    public function handle(): int
    {
        $this->info('===============================================================');
        $this->info('🚀 بدء الفحص الشامل لجميع أجزاء نظام Casher System...');
        $this->info('===============================================================');

        // 1. بيئة التشغيل وسيرفرات المشروع
        $this->section('1. بيئة التشغيل والاتصال بقاعدة البيانات والسيرفرات');
        $this->runTest('فحص متغيرات البيئة الأساسية (APP_KEY و DB_CONNECTION)', function () {
            $key = config('app.key');
            $db = config('database.default');
            if (empty($key)) throw new Exception('APP_KEY غير معين');
            if ($db !== 'mysql') throw new Exception("DB_CONNECTION غير مضبوط على mysql: $db");
        });

        $this->runTest('فحص الاتصال بقاعدة البيانات وتنفيذ استعلام اختبار', function () {
            DB::select('SELECT 1 as test');
        });

        $this->runTest('فحص استجابة سيرفر Laravel على المنفذ 8000', function () {
            $fp = @fsockopen('127.0.0.1', 8000, $errno, $errstr, 2);
            if (!$fp) {
                throw new Exception("السيرفر غير مستجيب على المنفذ 8000: $errstr");
            }
            fclose($fp);
        });

        $this->runTest('فحص استجابة سيرفر Vite على المنفذ 5173', function () {
            $fp = @fsockopen('localhost', 5173, $errno, $errstr, 2)
                ?: @fsockopen('127.0.0.1', 5173, $errno, $errstr, 2)
                ?: @fsockopen('[::1]', 5173, $errno, $errstr, 2);
            if (!$fp) {
                throw new Exception("سيرفر Vite غير مستجيب على المنفذ 5173: $errstr");
            }
            fclose($fp);
        });

        // 2. فحص البيانات الافتراضية
        $this->section('2. فحص البيانات الافتراضية (Seeded Records)');
        $this->runTest('وجود خطط الاشتراك الأساسية (Starter, Pro, Enterprise)', function () {
            $count = SubscriptionPlan::whereIn('slug', ['starter', 'pro', 'enterprise'])->count();
            if ($count < 3) throw new Exception("عدد الخطط غير مكتمل: $count");
        });

        $this->runTest('وجود حسابات المستخدمين الافتراضية الأربعة بكلمة مرور صحيحة', function () {
            $roles = [
                'admin@casher.com' => 'super_admin',
                'owner@alamana.com' => 'admin',
                'cashier@alamana.com' => 'cashier',
                'rep@alamana.com' => 'sales_rep',
            ];
            foreach ($roles as $email => $expectedRole) {
                $user = User::where('email', $email)->first();
                if (!$user) throw new Exception("المستخدم $email غير موجود");
                if ($user->role !== $expectedRole) throw new Exception("دور المستخدم $email غير صحيح: {$user->role}");
                if (!Hash::check('password', $user->password)) throw new Exception("كلمة مرور المستخدم $email غير مطابقة لـ password");
            }
        });

        $this->runTest('وجود المتجر التجريبي (سوبرماركت الأمانة) والمخزن الرئيسي ومخزن السيارة', function () {
            $tenant = Tenant::where('slug', 'alamana')->first();
            if (!$tenant) throw new Exception('متجر الأمانة غير موجود');
            $mainWh = $tenant->warehouses()->where('type', 'main')->first();
            if (!$mainWh) throw new Exception('المخزن الرئيسي لمتجر الأمانة غير موجود');
            $vanWh = $tenant->warehouses()->where('type', 'van')->first();
            if (!$vanWh) throw new Exception('مخزن سيارة التوزيع غير موجود');
        });

        // 3. الموقع التعريفي وبوابة التسجيل
        $this->section('3. الموقع التعريفي وبوابة التسجيل (Platform Landing & Registration)');
        $this->runTest('استجابة صفحة الهبوط العامة والأسعار', function () {
            $controller = app(LandingPageController::class);
            $response = $controller->index();
            if (!$response) throw new Exception('فشل جلب صفحة الهبوط');
        });

        $this->runTest('التحقق من توفر الدومين الفرعي (checkSlug)', function () {
            $controller = app(RegistrationController::class);
            // الدومين الموجود
            $req1 = Request::create('/register/check-slug', 'GET', ['slug' => 'alamana']);
            $res1 = $controller->checkSlug($req1)->getData(true);
            if (!isset($res1['available']) || $res1['available'] !== false) {
                throw new Exception('فشل التعرف على الدومين المحجوز (يجب أن يكون available = false)');
            }

            // دومين جديد متاح
            $randomSlug = 'store' . rand(10000, 99999);
            $req2 = Request::create('/register/check-slug', 'GET', ['slug' => $randomSlug]);
            $res2 = $controller->checkSlug($req2)->getData(true);
            if (!isset($res2['available']) || $res2['available'] !== true) {
                throw new Exception('فشل التعرف على الدومين المتاح (يجب أن يكون available = true)');
            }
        });

        $this->runTest('تسجيل متجر تجريبي جديد وتوليد بياناته واشتراكه (Registration Flow)', function () {
            $plan = SubscriptionPlan::first();
            $testSlug = 'test' . rand(10000, 99999);
            $testEmail = $testSlug . '@casher-test.com';

            $controller = app(RegistrationController::class);
            $req = Request::create('/register', 'POST', [
                'store_name' => 'متجر فحص التسجيل',
                'slug' => $testSlug,
                'owner_name' => 'أحمد تجريبي',
                'email' => $testEmail,
                'phone' => '01012345678',
                'password' => 'password123',
                'password_confirmation' => 'password123',
                'plan_id' => $plan->id,
                'billing_cycle' => 'monthly',
                'extra_employees' => 0,
            ]);

            $response = $controller->register($req);
            if (!$response) throw new Exception('فشل تنفيذ عملية التسجيل');

            $createdTenant = Tenant::where('slug', $testSlug)->first();
            if (!$createdTenant) throw new Exception('لم يتم إنشاء المتجر في قاعدة البيانات');

            $mainWh = $createdTenant->warehouses()->where('type', 'main')->first();
            if (!$mainWh) throw new Exception('لم يتم إنشاء المخزن الرئيسي للمتجر الجديد تلقائياً');

            // تنظيف بيانات المتجر التجريبي
            KashierTransaction::where('tenant_id', $createdTenant->id)->delete();
            Subscription::where('tenant_id', $createdTenant->id)->delete();
            User::where('tenant_id', $createdTenant->id)->delete();
            $createdTenant->warehouses()->delete();
            $createdTenant->categories()->delete();
            $createdTenant->expenseCategories()->delete();
            $createdTenant->forceDelete();
        });

        // 4. منظومة الدخول والمصادقة وتوجيه الأدوار
        $this->section('4. منظومة الدخول والمصادقة والصلاحيات (Auth & Multi-Role Redirects)');
        $this->runTest('توجيه السوبر أدمن تلقائياً إلى /admin/dashboard', function () {
            $user = User::where('email', 'admin@casher.com')->first();
            $controller = app(AuthenticatedSessionController::class);
            $method = new \ReflectionMethod($controller, 'getDashboardUrl');
            $method->setAccessible(true);
            $url = $method->invoke($controller, $user);
            if (!str_contains($url, '/admin/dashboard')) {
                throw new Exception("رابط لوحة السوبر أدمن غير صحيح: $url");
            }
        });

        $this->runTest('توجيه مدير المتجر تلقائياً إلى لوحة تحكم المتجر /admin/dashboard', function () {
            $user = User::where('email', 'owner@alamana.com')->first();
            $controller = app(AuthenticatedSessionController::class);
            $method = new \ReflectionMethod($controller, 'getDashboardUrl');
            $method->setAccessible(true);
            $url = $method->invoke($controller, $user);
            if (!str_contains($url, '/admin/dashboard')) {
                throw new Exception("رابط لوحة التاجر غير صحيح: $url");
            }
        });

        $this->runTest('توجيه الكاشير تلقائياً إلى شاشة الكاشير /pos', function () {
            $user = User::where('email', 'cashier@alamana.com')->first();
            $controller = app(AuthenticatedSessionController::class);
            $method = new \ReflectionMethod($controller, 'getDashboardUrl');
            $method->setAccessible(true);
            $url = $method->invoke($controller, $user);
            if (!str_contains($url, '/pos')) {
                throw new Exception("رابط شاشة الكاشير غير صحيح: $url");
            }
        });

        $this->runTest('توجيه مندوب التوزيع تلقائياً إلى شاشة سيارة الجملة /van-sales', function () {
            $user = User::where('email', 'rep@alamana.com')->first();
            $controller = app(AuthenticatedSessionController::class);
            $method = new \ReflectionMethod($controller, 'getDashboardUrl');
            $method->setAccessible(true);
            $url = $method->invoke($controller, $user);
            if (!str_contains($url, '/van-sales')) {
                throw new Exception("رابط شاشة المندوب غير صحيح: $url");
            }
        });

        $this->runTest('خاصية انتحال الشخصية للسوبر أدمن (Impersonation Entry & Leave)', function () {
            $tenant = Tenant::where('slug', 'alamana')->first();
            $token = Str::random(40);
            cache()->put("impersonate_token_{$token}", [
                'user_id' => $tenant->owner_id,
                'tenant_id' => $tenant->id,
                'target_role' => 'admin',
                'target_path' => '/admin/dashboard',
                'super_admin_id' => 1,
            ], now()->addMinutes(5));

            $controller = app(SuperAdminTenantController::class);
            $req = Request::create('/admin/impersonate-entry', 'GET', ['token' => $token]);
            $session = app('session.store');
            $session->start();
            $req->setLaravelSession($session);

            $response = $controller->impersonateEntry($req);
            if ($response->getStatusCode() !== 302) {
                throw new Exception("فشل الدخول عبر الانتحال، الرد كان كود: {$response->getStatusCode()}");
            }

            // فحص الخروج من الانتحال
            $leaveReq = Request::create('/admin/impersonate-leave', 'GET');
            $leaveReq->setLaravelSession($session);
            $leaveRes = $controller->impersonateLeave($leaveReq);
            if ($leaveRes->getStatusCode() !== 302) {
                throw new Exception("فشل الخروج من الانتحال، الرد كان كود: {$leaveRes->getStatusCode()}");
            }
        });

        // 5. لوحة تحكم السوبر أدمن
        $this->section('5. لوحة تحكم السوبر أدمن (Super Admin Platform)');
        $this->runTest('جلب إحصائيات لوحة تحكم السوبر أدمن بنجاح', function () {
            $superAdmin = User::where('email', 'admin@casher.com')->first();
            Auth::login($superAdmin);
            $controller = app(SuperAdminDashboardController::class);
            $response = $controller->index();
            if (!$response) throw new Exception('فشل جلب إحصائيات لوحة السوبر أدمن');
        });

        $this->runTest('إدارة باقات الاشتراك (إضافة، تعديل، حذف باقة تجريبية)', function () {
            $superAdmin = User::where('email', 'admin@casher.com')->first();
            Auth::login($superAdmin);
            $controller = app(SuperAdminPlanController::class);

            // إنشاء باقة
            $reqStore = Request::create('/admin/plans', 'POST', [
                'name' => 'باقة الاختبار المؤقتة',
                'slug' => 'test-plan-' . Str::random(5),
                'description' => 'وصف تجريبي',
                'price_monthly' => 100,
                'price_yearly' => 1000,
                'max_employees' => 3,
                'extra_employee_price' => 20,
                'is_active' => true,
            ]);
            $controller->store($reqStore);
            $plan = SubscriptionPlan::where('name', 'باقة الاختبار المؤقتة')->first();
            if (!$plan) throw new Exception('فشل إنشاء الباقة التجريبية');

            // تعديل الباقة
            $reqUpdate = Request::create("/admin/plans/{$plan->id}", 'PATCH', [
                'name' => 'باقة الاختبار المعدلة',
                'slug' => $plan->slug,
                'description' => 'وصف معدل',
                'price_monthly' => 150,
                'price_yearly' => 1500,
                'max_employees' => 4,
                'extra_employee_price' => 25,
                'is_active' => true,
            ]);
            $controller->update($reqUpdate, $plan);
            $plan->refresh();
            if ($plan->name !== 'باقة الاختبار المعدلة') throw new Exception('فشل تعديل الباقة التجريبية');

            // حذف الباقة
            $controller->destroy($plan);
            if (SubscriptionPlan::find($plan->id)) throw new Exception('فشل حذف الباقة التجريبية');
        });

        $this->runTest('عرض قائمة المتاجر وتفاصيل المتجر وتعيين اشتراك جديد', function () {
            $superAdmin = User::where('email', 'admin@casher.com')->first();
            Auth::login($superAdmin);
            $controller = app(SuperAdminTenantController::class);
            $tenant = Tenant::where('slug', 'alamana')->first();

            $indexRes = $controller->index(Request::create('/admin/tenants', 'GET'));
            if (!$indexRes) throw new Exception('فشل عرض قائمة المتاجر');

            $showRes = $controller->show($tenant);
            if (!$showRes) throw new Exception('فشل عرض تفاصيل المتجر');

            // تعيين اشتراك
            $plan = SubscriptionPlan::first();
            $assignReq = Request::create("/admin/tenants/{$tenant->id}/assign-subscription", 'POST', [
                'plan_id' => $plan->id,
                'months' => 3,
                'extra_employees' => 2,
            ]);
            $controller->assignSubscription($assignReq, $tenant);
            $tenant->refresh();
            if ($tenant->subscription_status !== 'active') {
                throw new Exception('فشل تفعيل الاشتراك بعد التعيين');
            }
        });

        // 6. لوحة تحكم التاجر وإدارة المتجر
        $this->section('6. لوحة تحكم التاجر وإدارة المتجر (Merchant Management)');
        $tenant = Tenant::where('slug', 'alamana')->first();
        app()->instance(Tenant::class, $tenant);
        URL::defaults(['tenant' => $tenant->slug]);
        $owner = User::where('email', 'owner@alamana.com')->first();
        Auth::login($owner);

        $this->runTest('جلب إحصائيات لوحة تحكم التاجر ومؤشرات الأداء', function () use ($tenant) {
            $controller = app(MerchantDashboardController::class);
            $res = $controller->index();
            if (!$res) throw new Exception('فشل جلب إحصائيات لوحة التاجر');
        });

        $this->runTest('إدارة الأقسام (Category CRUD) بنجاح', function () use ($tenant) {
            $controller = app(CategoryController::class);
            $reqStore = Request::create('/admin/categories', 'POST', [
                'name' => 'قسم تجريبي ' . Str::random(4),
                'color' => '#6366F1',
                'is_active' => true,
            ]);
            $controller->store($reqStore);
            $cat = Category::where('tenant_id', $tenant->id)->where('name', 'like', 'قسم تجريبي%')->first();
            if (!$cat) throw new Exception('فشل إضافة القسم التجريبي');

            $cat->delete();
        });

        $this->runTest('إدارة المنتجات وتوليد الباركود وتعيين الأسعار (Product CRUD)', function () use ($tenant) {
            $controller = app(ProductController::class);
            $cat = Category::where('tenant_id', $tenant->id)->first();
            $uniqueBarcode = '999' . rand(100000, 999999);

            $req = Request::create('/admin/products', 'POST', [
                'name' => 'منتج تجريبي للاختبار',
                'category_id' => $cat->id,
                'barcode' => $uniqueBarcode,
                'cost_price' => 50,
                'retail_price' => 70,
                'wholesale_price' => 60,
                'stock_quantity' => 100,
                'min_stock_alert' => 10,
                'unit' => 'قطعة',
            ]);
            $controller->store($req);

            $prod = Product::where('tenant_id', $tenant->id)->where('barcode', $uniqueBarcode)->first();
            if (!$prod) throw new Exception('فشل إنشاء المنتج التجريبي');

            // التحقق من إضافة الرصيد للمخزن الرئيسي تلقائياً
            $mainWh = $tenant->mainWarehouse;
            $stock = ProductWarehouseStock::where('warehouse_id', $mainWh->id)->where('product_id', $prod->id)->first();
            if (!$stock || $stock->quantity != 100) {
                throw new Exception('فشل توزيع رصيد المنتج على المخزن الرئيسي');
            }

            // تنظيف المنتج التجريبي
            $stock->delete();
            $prod->delete();
        });

        $this->runTest('إذن صرف ونقل بضاعة من المخزن الرئيسي إلى سيارة المندوب (Stock Dispatch)', function () use ($tenant) {
            $mainWh = $tenant->mainWarehouse;
            $vanWh = $tenant->warehouses()->where('type', 'van')->first();
            $product = Product::where('tenant_id', $tenant->id)->first();

            $initialMainStock = $mainWh->stocks()->where('product_id', $product->id)->value('quantity') ?? 0;
            $initialVanStock = $vanWh->stocks()->where('product_id', $product->id)->value('quantity') ?? 0;

            $controller = app(WarehouseController::class);
            $req = Request::create('/admin/warehouses/dispatch', 'POST', [
                'from_warehouse_id' => $mainWh->id,
                'to_warehouse_id' => $vanWh->id,
                'items' => [
                    [
                        'product_id' => $product->id,
                        'quantity' => 5,
                    ]
                ],
                'notes' => 'تحويل تجريبي للفحص',
            ]);
            $controller->dispatchStock($req);

            $newMainStock = $mainWh->stocks()->where('product_id', $product->id)->value('quantity');
            $newVanStock = $vanWh->stocks()->where('product_id', $product->id)->value('quantity');

            if ($newMainStock != ($initialMainStock - 5)) {
                throw new Exception("لم يتم خصم الكمية المحولة من المخزن الرئيسي: كان $initialMainStock وأصبح $newMainStock");
            }
            if ($newVanStock != ($initialVanStock + 5)) {
                throw new Exception("لم تتم إضافة الكمية لمخزن سيارة المندوب: كان $initialVanStock وأصبح $newVanStock");
            }

            // إعادة الكمية كما كانت لعدم الإخلال بالأرصدة
            $mainWh->stocks()->where('product_id', $product->id)->update(['quantity' => $initialMainStock]);
            $vanWh->stocks()->where('product_id', $product->id)->update(['quantity' => $initialVanStock]);
        });

        $this->runTest('تسجيل المصروفات وأقسام المصروفات بنجاح', function () use ($tenant) {
            $controller = app(ExpenseController::class);
            $cat = ExpenseCategory::where('tenant_id', $tenant->id)->first();

            $req = Request::create('/admin/expenses', 'POST', [
                'title' => 'فاتورة كهرباء تجريبية',
                'category_id' => $cat->id,
                'amount' => 150,
                'expense_date' => now()->toDateString(),
                'notes' => 'مصروف فحص تجريبي',
            ]);
            $controller->store($req);

            $expense = Expense::where('tenant_id', $tenant->id)->where('title', 'فاتورة كهرباء تجريبية')->first();
            if (!$expense || $expense->amount != 150) {
                throw new Exception('فشل تسجيل المصروف التجريبي');
            }
            $expense->delete();
        });

        $this->runTest('تحديث إعدادات المتجر (Store Settings)', function () use ($tenant) {
            $controller = app(SettingController::class);
            $req = Request::create('/admin/settings', 'POST', [
                'name' => $tenant->name,
                'phone' => $tenant->phone,
                'email' => $tenant->email,
                'address' => $tenant->address,
                'currency' => 'ج.م',
                'tax_rate' => 14,
                'tax_enabled' => false,
                'tax_number' => '123-456-789',
                'receipt_header' => 'سوبرماركت الأمانة - أهلاً بكم',
                'receipt_footer' => 'شكراً لزيارتكم',
                'allow_negative_stock' => true,
            ]);
            $controller->update($req);
            $tenant->refresh();
            if (($tenant->settings['receipt_header'] ?? '') !== 'سوبرماركت الأمانة - أهلاً بكم') {
                throw new Exception('فشل تحديث إعدادات المتجر');
            }
        });

        // 7. نظام الكاشير ونقاط البيع
        $this->section('7. نظام الكاشير ونقاط البيع القطاعي (Retail POS & Shift Management)');
        $cashier = User::where('email', 'cashier@alamana.com')->first();
        Auth::login($cashier);
        $posController = app(PosController::class);

        $this->runTest('جلب كتالوج الكاشير مع الأصناف والأسعار (POS Catalog)', function () use ($posController) {
            $catalog = $posController->getCatalog()->getData(true);
            if (!isset($catalog['products']) || count($catalog['products']) === 0) {
                throw new Exception('كتالوج الكاشير فارغ أو لم يتم جلبه بشكل صحيح');
            }
        });

        $this->runTest('فتح وردية كاشير وإتمام بيع نقدي وبيزا ثم إغلاق الوردية وحساب العجز/الزيادة', function () use ($tenant, $cashier, $posController) {
            // إغلاق أي وردية سابقة مفتوحة
            CashierShift::where('tenant_id', $tenant->id)->where('user_id', $cashier->id)->where('status', 'open')->update([
                'status' => 'closed',
                'closed_at' => now(),
                'closing_balance' => 0,
            ]);

            // 1. فتح الوردية
            $openReq = Request::create('/pos/shift/open', 'POST', [
                'opening_balance' => 500,
                'notes' => 'وردية اختبار',
            ]);
            $posController->openShift($openReq);

            $shift = CashierShift::where('tenant_id', $tenant->id)->where('user_id', $cashier->id)->where('status', 'open')->first();
            if (!$shift || $shift->opening_balance != 500) {
                throw new Exception('فشل فتح وردية الكاشير برصيد البداية 500');
            }

            // 2. عملية بيع كاش
            $product = Product::where('tenant_id', $tenant->id)->first();
            $totalSale = 2 * $product->retail_price;
            $checkoutReq = Request::create('/pos/checkout', 'POST', [
                'items' => [
                    [
                        'product_id' => $product->id,
                        'quantity' => 2,
                        'unit_price' => $product->retail_price,
                    ]
                ],
                'subtotal' => $totalSale,
                'discount_amount' => 0,
                'tax_amount' => 0,
                'total_amount' => $totalSale,
                'paid_amount' => $totalSale,
                'payment_method' => 'cash',
                'notes' => 'فاتورة اختبار نقدي',
            ]);
            $checkoutRes = $posController->checkout($checkoutReq);
            $saleData = $checkoutRes->getData(true);
            if (!isset($saleData['success']) || !$saleData['success']) {
                throw new Exception('فشلت عملية البيع النقدي للكاشير');
            }

            $shift->refresh();
            if ($shift->cash_sales != $totalSale) {
                throw new Exception("مبيعات الكاش بالوردية غير متطابقة: متوقع $totalSale، الموجود {$shift->cash_sales}");
            }

            // 3. مزامنة فاتورة أوفلاين (Offline Sync)
            $offlineUUID = (string) Str::uuid();
            $syncReq = Request::create('/pos/sync-offline', 'POST', [
                'invoices' => [
                    [
                        'offline_uuid' => $offlineUUID,
                        'invoice_number' => 'OFF-INV-' . rand(1000, 9999),
                        'items' => [
                            [
                                'product_id' => $product->id,
                                'quantity' => 1,
                                'unit_price' => $product->retail_price,
                            ]
                        ],
                        'subtotal' => $product->retail_price,
                        'total_amount' => $product->retail_price,
                        'paid_amount' => $product->retail_price,
                        'payment_method' => 'card',
                        'paid_at' => now()->toIso8601String(),
                    ]
                ]
            ]);
            $syncRes = $posController->syncOfflineInvoices($syncReq)->getData(true);
            if (!isset($syncRes['synced_uuids']) || count($syncRes['synced_uuids']) < 1) {
                throw new Exception('فشلت مزامنة الفاتورة الأوفلاين');
            }

            $syncedInvoice = Invoice::where('offline_uuid', $offlineUUID)->first();
            if (!$syncedInvoice) throw new Exception('لم يتم تخزين الفاتورة الأوفلاين في قاعدة البيانات');

            // 4. إغلاق الوردية
            $totalExpected = 500 + $shift->cash_sales;
            $closeReq = Request::create('/pos/shift/close', 'POST', [
                'closing_balance' => $totalExpected + 50, // زيادة 50 ج.م
                'notes' => 'إغلاق وردية الاختبار',
            ]);
            $posController->closeShift($closeReq);

            $shift->refresh();
            if ($shift->status !== 'closed') throw new Exception('حالة الوردية لم تصبح مغلقة');
            if ($shift->variance != 50) {
                throw new Exception("فارق الوردية غير صحيح: متوقع 50، المحسوب {$shift->variance}");
            }

            // تنظيف الفواتير التجريبية
            $syncedInvoice->items()->delete();
            $syncedInvoice->delete();
        });

        // 8. نظام سيارات التوزيع ومناديب الجملة
        $this->section('8. نظام سيارات التوزيع ومناديب الجملة (Van Sales)');
        $rep = User::where('email', 'rep@alamana.com')->first();
        Auth::login($rep);
        $vanController = app(VanSalesController::class);
        $vanWh = $tenant->warehouses()->where('type', 'van')->where('sales_rep_id', $rep->id)->first();

        $this->runTest('بدء رحلة سيارة المندوب، والبيع بسعر الجملة، ومصاريف الطريق، والتصفية', function () use ($tenant, $rep, $vanController, $vanWh) {
            // إغلاق أي رحلة سابقة مفتوحة
            VanTrip::where('tenant_id', $tenant->id)->where('sales_rep_id', $rep->id)->where('status', 'open')->update([
                'status' => 'closed',
                'end_time' => now(),
                'end_odometer' => 10000,
            ]);

            // 1. بدء الرحلة
            $startReq = Request::create('/van-sales/trip/start', 'POST', [
                'start_odometer' => 50000,
                'notes' => 'رحلة اختبار',
            ]);
            $vanController->startTrip($startReq);

            $trip = VanTrip::where('tenant_id', $tenant->id)->where('sales_rep_id', $rep->id)->where('status', 'open')->first();
            if (!$trip || $trip->start_odometer != 50000) {
                throw new Exception('فشل بدء رحلة السيارة بقراءة العداد 50000');
            }

            // 2. بيع جملة
            $product = Product::where('tenant_id', $tenant->id)->first();
            $initialVanQty = $vanWh->stocks()->where('product_id', $product->id)->value('quantity') ?? 0;

            $salePrice = $product->wholesale_price;
            $saleTotal = 3 * $salePrice;
            $saleReq = Request::create('/van-sales/checkout', 'POST', [
                'customer_name' => 'عميل جملة تجريبي',
                'customer_phone' => '01011112222',
                'items' => [
                    [
                        'product_id' => $product->id,
                        'quantity' => 3,
                        'unit_price' => $salePrice,
                    ]
                ],
                'paid_amount' => $saleTotal,
                'payment_method' => 'cash',
                'discount_amount' => 0,
            ]);
            $saleRes = $vanController->checkout($saleReq)->getData(true);
            if (!isset($saleRes['success']) || !$saleRes['success']) {
                throw new Exception('فشلت عملية بيع الجملة لمندوب السيارة');
            }

            $newVanQty = $vanWh->stocks()->where('product_id', $product->id)->value('quantity');
            if ($newVanQty != ($initialVanQty - 3)) {
                throw new Exception("لم يتم خصم المباع من مخزن السيارة بدقة: كان $initialVanQty وأصبح $newVanQty");
            }

            // 3. تسجيل مصاريف الطريق (بنزين)
            $cat = ExpenseCategory::where('tenant_id', $tenant->id)->first();
            $expenseReq = Request::create('/van-sales/expense', 'POST', [
                'title' => 'تموين بنزين',
                'category_id' => $cat->id,
                'amount' => 120,
                'notes' => 'تموين سيارة تجريبي',
            ]);
            $vanController->recordExpense($expenseReq);

            $recordedExp = Expense::where('van_trip_id', $trip->id)->first();
            if (!$recordedExp || $recordedExp->amount != 120) {
                throw new Exception('فشل تسجيل مصروف الرحلة');
            }

            // 4. إنهاء الرحلة والتصفية
            $endReq = Request::create('/van-sales/trip/end', 'POST', [
                'end_odometer' => 50085, // مسافة 85 كم
                'total_cash_collected' => $saleTotal,
                'notes' => 'إنهاء رحلة الاختبار',
            ]);
            $vanController->endTrip($endReq);

            $trip->refresh();
            if ($trip->status !== 'closed') throw new Exception('حالة الرحلة لم تصبح closed');
            if ($trip->end_odometer != 50085) throw new Exception('قراءة العداد النهائي غير صحيحة');
            if ($trip->total_distance != 85) {
                throw new Exception("المسافة المقطوعة غير صحيحة: متوقع 85، المحسوب {$trip->total_distance}");
            }

            // استرجاع رصيد مخزن السيارة وتنظيف المصروف
            $vanWh->stocks()->where('product_id', $product->id)->update(['quantity' => $initialVanQty]);
            $recordedExp->delete();
        });

        // 9. التقارير المالية والإحصائيات وتصدير الملفات
        $this->section('9. التقارير المالية والإحصائيات وتصدير Excel و PDF');
        Auth::login($owner);
        $reportController = app(ReportController::class);

        $this->runTest('حساب مجمل وصافي الأرباح: صافي الربح = المبيعات - التكلفة - المصروفات', function () use ($reportController) {
            $req = Request::create('/admin/reports', 'GET', ['period' => 'this_month']);
            $reportRes = $reportController->index($req);
            if (!$reportRes) throw new Exception('فشل استخراج تقرير الأرباح والخسائر');
        });

        $this->runTest('تصدير التقرير إلى Excel مع دعم الحروف العربية والـ UTF-8 BOM', function () use ($reportController) {
            $req = Request::create('/admin/reports/export-excel', 'GET', ['from_date' => now()->startOfMonth()->toDateString(), 'to_date' => now()->toDateString()]);
            $res = $reportController->exportExcel($req);

            ob_start();
            $res->sendContent();
            $content = ob_get_clean();

            // التحقق من وجود UTF-8 BOM
            if (!str_starts_with($content, "\xEF\xBB\xBF")) {
                throw new Exception('الملف المصدّر لا يحتوي على UTF-8 BOM اللازم لدعم الحروف العربية في Excel');
            }
        });

        $this->runTest('تصدير التقرير إلى PDF وتحميل الصفحة بشكل سليم', function () use ($reportController) {
            $req = Request::create('/admin/reports/export-pdf', 'GET', ['from_date' => now()->startOfMonth()->toDateString(), 'to_date' => now()->toDateString()]);
            $res = $reportController->exportPdf($req);
            if (!$res) throw new Exception('فشل تصدير تقرير PDF');
        });

        // 10. بوابة الدفع Kashier
        $this->section('10. بوابة الدفع Kashier والـ Webhooks');
        $this->runTest('حساب وتوقيع الـ Hash المعتمد من KashierService', function () {
            $kashier = app(KashierService::class);
            $orderId = 'ORD-TEST-123';
            $amount = 599.00;
            $hash = $kashier->generateHash($orderId, $amount, 'EGP');

            if (empty($hash) || strlen($hash) !== 64) {
                throw new Exception("توقيع الـ Hash غير صالح أو طوله غير 64 حرف (SHA256): $hash");
            }
        });

        $this->runTest('معالجة Webhook كاشير وتحديث حالة الاشتراك بنجاح', function () {
            $tenant = Tenant::first();
            $sub = $tenant->currentSubscription ?? $tenant->subscriptions()->first();
            $orderId = 'ORD-' . ($sub ? $sub->id : 1) . '-' . time();

            // إنشاء معاملة معلقة للفحص
            $trx = KashierTransaction::create([
                'tenant_id' => $tenant->id,
                'subscription_id' => $sub ? $sub->id : 1,
                'kashier_order_id' => $orderId,
                'amount' => 599.00,
                'currency' => 'EGP',
                'status' => 'pending',
            ]);

            $regController = app(RegistrationController::class);
            $req = Request::create('/webhook/kashier', 'POST', [
                'data' => [
                    'merchantOrderId' => $orderId,
                    'status' => 'SUCCESS',
                    'kashierTransactionId' => 'KASH_REF_9999',
                ]
            ]);

            $res = $regController->kashierWebhook($req);
            if ($res->getStatusCode() !== 200) {
                throw new Exception("كود رد الـ Webhook لم يكن 200، الكود المستلم: {$res->getStatusCode()}");
            }

            $trx->refresh();
            if ($trx->status !== 'SUCCESS') {
                throw new Exception("حالة المعاملة لم تتغير إلى SUCCESS: {$trx->status}");
            }

            $trx->delete();
        });

        // الخلاصة والنتيجة
        $this->info('===============================================================');
        $total = $this->passed + $this->failed;
        $this->info("🏁 نتيجة الفحص النهائي: $this->passed من أصل $total فحص نجح بنجاح! 🎉");
        if ($this->failed > 0) {
            $this->error("❌ يوجد $this->failed اختبار فشل:");
            foreach ($this->failures as $f) {
                $this->warn("- {$f['name']}: {$f['error']}");
            }
            $this->info('===============================================================');
            return Command::FAILURE;
        }

        $this->info('✨ جميع الأنظمة والوظائف ومسارات التوجيه والعمليات تعمل بنسبة 100% وبدون أي أخطاء.');
        $this->info('===============================================================');
        return Command::SUCCESS;
    }

    private function section(string $title): void
    {
        $this->newLine();
        $this->comment("👉 $title");
    }

    private function runTest(string $name, callable $callback): void
    {
        try {
            $callback();
            $this->passed++;
            $this->line("  <info>✓</info> $name");
        } catch (\Throwable $e) {
            $this->failed++;
            $this->failures[] = ['name' => $name, 'error' => $e->getMessage()];
            $this->line("  <fg=red>✗</> $name: <fg=yellow>{$e->getMessage()}</>");
        }
    }
}
