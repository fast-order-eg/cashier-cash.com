<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\Platform\LandingPageController;
use App\Http\Controllers\Platform\RegistrationController;
use App\Http\Controllers\SuperAdmin\DashboardController as SuperAdminDashboardController;
use App\Http\Controllers\SuperAdmin\TenantController as SuperAdminTenantController;
use App\Http\Controllers\SuperAdmin\SubscriptionPlanController as SuperAdminPlanController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

$host = app()->bound('request') ? request()?->getHost() : null;

$appUrl = config('app.url', 'http://localhost:8000');
$configHost = parse_url($appUrl, PHP_URL_HOST) ?: 'localhost';
if (str_starts_with($configHost, 'app.')) {
    $configHost = substr($configHost, 4);
}

if ($host && $host !== '127.0.0.1' && !filter_var($host, FILTER_VALIDATE_IP)) {
    if (str_ends_with($host, '.localhost')) {
        $parts = explode('.', $host);
        if (count($parts) === 2) {
            $baseDomain = 'localhost';
        } elseif (count($parts) >= 3) {
            array_shift($parts);
            $baseDomain = implode('.', $parts);
        } else {
            $baseDomain = 'localhost';
        }
    } else {
        $cleanHost = str_starts_with($host, 'app.') ? substr($host, 4) : $host;
        $parts = explode('.', $cleanHost);
        if (count($parts) >= 3) {
            array_shift($parts);
            $baseDomain = implode('.', $parts);
        } else {
            $baseDomain = $cleanHost;
        }
    }
} else {
    $baseDomain = $configHost;
}

// مسار Google OAuth العام (يدعم localhost والدومينات المختلفة)
Route::middleware(['web'])->group(function () {
    Route::get('/auth/google', [\App\Http\Controllers\Auth\GoogleAuthController::class, 'redirectToGoogle'])->name('auth.google');
    Route::get('/auth/google/callback', [\App\Http\Controllers\Auth\GoogleAuthController::class, 'handleGoogleCallback'])->name('auth.google.callback');
});

// مسار الدخول الموحد ونقل الجلسة بين النطاقات (SSO Entry)
Route::middleware(['web'])->get('/auth/sso-entry', [\App\Http\Controllers\Auth\AuthenticatedSessionController::class, 'ssoEntry'])->name('auth.sso.entry');

// مسارات انتحال الهوية (Impersonation Entry & Leave)
Route::middleware(['web'])->get('/admin/impersonate-entry', [\App\Http\Controllers\SuperAdmin\TenantController::class, 'impersonateEntry'])->name('merchant.impersonate.entry');
Route::middleware(['web'])->get('/admin/impersonate-leave', [\App\Http\Controllers\SuperAdmin\TenantController::class, 'impersonateLeave'])->name('merchant.impersonate.leave');

/*
|--------------------------------------------------------------------------
| 1. الموقع الرئيسي واللاندينج والتسجيل (casher.com)
|--------------------------------------------------------------------------
*/
Route::domain($baseDomain)->group(function () {
    Route::get('/', [LandingPageController::class, 'index'])->name('platform.home');
    Route::get('/pricing', [LandingPageController::class, 'index'])->name('platform.pricing');

    // تسجيل متجر جديد
    Route::get('/register', [RegistrationController::class, 'showForm'])->name('platform.register');
    Route::post('/register', [RegistrationController::class, 'register'])->name('platform.register.submit');
    Route::get('/register/check-slug', [RegistrationController::class, 'checkSlug'])->name('platform.register.check-slug');

    // كاشير Callback & Webhook
    Route::get('/payment/callback', [RegistrationController::class, 'kashierCallback'])->name('platform.payment.callback');
    Route::post('/webhook/kashier', [RegistrationController::class, 'kashierWebhook'])->name('platform.webhook.kashier');

    // باي موب Callback & Webhook
    Route::get('/payment/paymob/callback', [\App\Http\Controllers\Merchant\SubscriptionController::class, 'paymentCallback'])->name('platform.payment.paymob.callback');
    Route::post('/webhook/paymob', [\App\Http\Controllers\Merchant\SubscriptionController::class, 'paymobWebhook'])->name('platform.webhook.paymob');

    // Auth Routes للموقع الرئيسي
    require __DIR__.'/auth.php';

    // إعادة توجيه آمنة لمنع خطأ 404 إذا تم طلب لوحة التحكم أو الكاشير على الدومين الرئيسي
    Route::get('/admin/{any?}', function () {
        if (auth()->check()) {
            $user = auth()->user();
            if ($user->isSuperAdmin()) {
                return redirect()->route('superadmin.dashboard');
            }
            if ($user->tenant) {
                return redirect()->away(\App\Http\Controllers\Auth\AuthenticatedSessionController::getDashboardUrl($user));
            }
        }
        return redirect()->away(\App\Http\Controllers\Auth\AuthenticatedSessionController::getCentralLoginUrl());
    })->where('any', '.*');
});

/*
|--------------------------------------------------------------------------
| 2. لوحة تحكم السوبر أدمن (app.casher.com)
|--------------------------------------------------------------------------
*/
Route::domain('app.' . $baseDomain)->group(function () {
    Route::middleware(['web', 'auth', 'super_admin'])->prefix('admin')->group(function () {
        Route::get('/dashboard', [SuperAdminDashboardController::class, 'index'])->name('superadmin.dashboard');

        // إدارة المتاجر
        Route::get('/tenants', [SuperAdminTenantController::class, 'index'])->name('superadmin.tenants.index');
        Route::get('/tenants/{tenant}', [SuperAdminTenantController::class, 'show'])->name('superadmin.tenants.show');
        Route::patch('/tenants/{tenant}/toggle-status', [SuperAdminTenantController::class, 'toggleStatus'])->name('superadmin.tenants.toggle-status');
        Route::post('/tenants/{tenant}/assign-subscription', [SuperAdminTenantController::class, 'assignSubscription'])->name('superadmin.tenants.assign-subscription');
        Route::post('/tenants/{tenant}/update-seats', [SuperAdminTenantController::class, 'updateSeats'])->name('superadmin.tenants.update-seats');
        Route::delete('/tenants/{tenant}', [SuperAdminTenantController::class, 'destroy'])->name('superadmin.tenants.destroy');
        Route::get('/tenants/{tenant}/impersonate', [SuperAdminTenantController::class, 'impersonate'])->name('superadmin.tenants.impersonate');

        // إدارة باقات الاشتراك
        Route::get('/plans', [SuperAdminPlanController::class, 'index'])->name('superadmin.plans.index');
        Route::post('/plans', [SuperAdminPlanController::class, 'store'])->name('superadmin.plans.store');
        Route::patch('/plans/{plan}', [SuperAdminPlanController::class, 'update'])->name('superadmin.plans.update');
        Route::delete('/plans/{plan}', [SuperAdminPlanController::class, 'destroy'])->name('superadmin.plans.destroy');

        // إعدادات بوابات الدفع الإلكتروني (Paymob & Kashier)
        Route::get('/payment-settings', [\App\Http\Controllers\SuperAdmin\PaymentSettingController::class, 'index'])->name('superadmin.payment-settings.index');
        Route::post('/payment-settings', [\App\Http\Controllers\SuperAdmin\PaymentSettingController::class, 'update'])->name('superadmin.payment-settings.update');
    });

    // إعادة توجيه الصفحة الرئيسية لـ app إلى لوحة السوبر أدمن أو تسجيل الدخول
    Route::get('/', function () {
        return redirect()->route('superadmin.dashboard');
    });

    // إعادة توجيه مسار التسجيل إلى صفحة التسجيل الرسمية
    Route::get('/register', function (\Illuminate\Http\Request $request) {
        return redirect()->away(\App\Http\Controllers\Auth\AuthenticatedSessionController::getCentralRegisterUrl($request));
    })->name('app.register');
});

/*
|--------------------------------------------------------------------------
| 3. نطاق المتاجر ({tenant}.casher.com)
|--------------------------------------------------------------------------
*/
Route::domain('{tenant}.' . $baseDomain)->group(function () {
    // إعادة توجيه مسار التسجيل إلى صفحة التسجيل الرسمية
    Route::get('/register', function (\Illuminate\Http\Request $request) {
        return redirect()->away(\App\Http\Controllers\Auth\AuthenticatedSessionController::getCentralRegisterUrl($request));
    });

    // Auth routes for store subdomain
    require __DIR__.'/auth.php';

    // مسارات المتجر المحمية (أدمن، كاشير، مندوب)
    Route::middleware(['web', 'auth', 'tenant', 'tenant.active'])->group(function () {
        // لوحة تحكم الأدمن والتقارير
        Route::prefix('admin')->group(function () {
            Route::get('/dashboard', [\App\Http\Controllers\Merchant\DashboardController::class, 'index'])->name('admin.dashboard');
            
            // الأصناف والأقسام
            Route::resource('products', \App\Http\Controllers\Merchant\ProductController::class)->names('admin.products');
            Route::resource('categories', \App\Http\Controllers\Merchant\CategoryController::class)->names('admin.categories');
            
            // المخازن وإذن صرف البضاعة لسيارات المناديب
            Route::resource('warehouses', \App\Http\Controllers\Merchant\WarehouseController::class)->names('admin.warehouses');
            Route::post('warehouses/dispatch', [\App\Http\Controllers\Merchant\WarehouseController::class, 'dispatchStock'])->name('admin.warehouses.dispatch');
            
            // المصروفات وأقسام المصروفات
            Route::resource('expenses', \App\Http\Controllers\Merchant\ExpenseController::class)->names('admin.expenses');
            Route::post('expense-categories', [\App\Http\Controllers\Merchant\ExpenseController::class, 'storeCategory'])->name('admin.expense-categories.store');
            
            // الفواتير والمبيعات
            Route::get('invoices', [\App\Http\Controllers\Merchant\InvoiceController::class, 'index'])->name('admin.invoices.index');
            Route::get('invoices/{invoice}', [\App\Http\Controllers\Merchant\InvoiceController::class, 'show'])->name('admin.invoices.show');
            
            // ورديات الكاشير ورحلات المناديب
            Route::get('shifts', [\App\Http\Controllers\Merchant\ShiftReportController::class, 'shiftsIndex'])->name('admin.shifts.index');
            Route::get('van-trips', [\App\Http\Controllers\Merchant\ShiftReportController::class, 'vanTripsIndex'])->name('admin.van-trips.index');
            
            // التقارير الشاملة وتصدير PDF و Excel
            Route::get('reports', [\App\Http\Controllers\Merchant\ReportController::class, 'index'])->name('admin.reports.index');
            Route::get('reports/export-excel', [\App\Http\Controllers\Merchant\ReportController::class, 'exportExcel'])->name('admin.reports.export-excel');
            Route::get('reports/export-pdf', [\App\Http\Controllers\Merchant\ReportController::class, 'exportPdf'])->name('admin.reports.export-pdf');
            
            // إدارة الموظفين (كاشير / مناديب)
            Route::resource('staff', \App\Http\Controllers\Merchant\StaffController::class)->names('admin.staff');

            // باقات واشتراكات المتجر وعمليات الدفع
            Route::get('subscriptions', [\App\Http\Controllers\Merchant\SubscriptionController::class, 'index'])->name('admin.subscriptions.index');
            Route::post('subscriptions/renew', [\App\Http\Controllers\Merchant\SubscriptionController::class, 'renew'])->name('admin.subscriptions.renew');
            Route::post('subscriptions/add-staff', [\App\Http\Controllers\Merchant\SubscriptionController::class, 'addStaff'])->name('admin.subscriptions.add-staff');
            Route::post('subscriptions/change-plan', [\App\Http\Controllers\Merchant\SubscriptionController::class, 'changePlan'])->name('admin.subscriptions.change-plan');
            Route::get('subscriptions/checkout/{order}', [\App\Http\Controllers\Merchant\SubscriptionController::class, 'checkout'])->name('admin.subscriptions.checkout');
            Route::post('subscriptions/pay/{order}', [\App\Http\Controllers\Merchant\SubscriptionController::class, 'processPayment'])->name('admin.subscriptions.pay');
            Route::get('subscriptions/payment/callback', [\App\Http\Controllers\Merchant\SubscriptionController::class, 'paymentCallback'])->name('admin.subscriptions.payment.callback');

            // إعدادات المتجر
            Route::get('settings', [\App\Http\Controllers\Merchant\SettingController::class, 'index'])->name('admin.settings.index');
            Route::post('settings', [\App\Http\Controllers\Merchant\SettingController::class, 'update'])->name('admin.settings.update');
        });

        // واجهة الكاشير POS (أونلاين وأوفلاين)
        Route::prefix('pos')->group(function () {
            Route::get('/', [\App\Http\Controllers\Cashier\PosController::class, 'index'])->name('cashier.pos');
            Route::post('/shift/open', [\App\Http\Controllers\Cashier\PosController::class, 'openShift'])->name('cashier.shift.open');
            Route::post('/shift/close', [\App\Http\Controllers\Cashier\PosController::class, 'closeShift'])->name('cashier.shift.close');
            Route::post('/checkout', [\App\Http\Controllers\Cashier\PosController::class, 'checkout'])->name('cashier.pos.checkout');
            Route::post('/sync-offline', [\App\Http\Controllers\Cashier\PosController::class, 'syncOfflineInvoices'])->name('cashier.pos.sync');
            Route::get('/catalog', [\App\Http\Controllers\Cashier\PosController::class, 'getCatalog'])->name('cashier.pos.catalog');
        });

        // واجهة مناديب التوزيع وسيارات الجملة (Van Sales)
        Route::prefix('van-sales')->group(function () {
            Route::get('/', [\App\Http\Controllers\SalesRep\VanSalesController::class, 'index'])->name('vansales.dashboard');
            Route::post('/trip/start', [\App\Http\Controllers\SalesRep\VanSalesController::class, 'startTrip'])->name('vansales.trip.start');
            Route::post('/trip/end', [\App\Http\Controllers\SalesRep\VanSalesController::class, 'endTrip'])->name('vansales.trip.end');
            Route::post('/checkout', [\App\Http\Controllers\SalesRep\VanSalesController::class, 'checkout'])->name('vansales.checkout');
            Route::post('/expense', [\App\Http\Controllers\SalesRep\VanSalesController::class, 'recordExpense'])->name('vansales.expense');
        });

        // إعادة التوجيه الافتراضية بحسب الدور
        Route::get('/', function () {
            $user = auth()->user();
            if ($user->isCashier()) return redirect()->route('cashier.pos');
            if ($user->isSalesRep()) return redirect()->route('vansales.dashboard');
            return redirect()->route('admin.dashboard');
        })->name('store.home');
    });
});
