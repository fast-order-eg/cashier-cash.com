<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Subscription;
use App\Models\SubscriptionPlan;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class TenantController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Tenant::with(['owner', 'currentSubscription.plan'])->latest();

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('slug', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status')) {
            $query->where('subscription_status', $request->status);
        }

        $tenants = $query->paginate(15)->withQueryString();

        return Inertia::render('SuperAdmin/Tenants/Index', [
            'tenants' => $tenants,
            'filters' => $request->only(['search', 'status']),
        ]);
    }

    public function show(Tenant $tenant): Response
    {
        $tenant->load([
            'owner',
            'users',
            'subscriptions.plan',
            'currentSubscription.plan',
            'warehouses.salesRep',
            'categories',
        ]);

        $plans = SubscriptionPlan::where('is_active', true)->get();

        return Inertia::render('SuperAdmin/Tenants/Show', [
            'tenant' => $tenant,
            'plans' => $plans,
            'stats' => [
                'products_count' => $tenant->products()->count(),
                'invoices_count' => $tenant->invoices()->count(),
                'total_sales' => $tenant->invoices()->where('status', 'completed')->sum('total_amount'),
            ],
        ]);
    }

    public function toggleStatus(Tenant $tenant): RedirectResponse
    {
        $tenant->update(['is_active' => !$tenant->is_active]);

        if (!$tenant->is_active) {
            try {
                DB::table('sessions')
                    ->where('tenant_id', $tenant->id)
                    ->delete();
            } catch (\Exception $e) {
                // Ignore if session table doesn't have tenant_id column
            }
        }

        $msg = $tenant->is_active ? 'تم تفعيل حساب المتجر بنجاح' : 'تم تعطيل حساب المتجر بنجاح وخروج موظفيه من الجلسات';
        return back()->with('success', $msg);
    }

    public function assignSubscription(Request $request, Tenant $tenant): RedirectResponse
    {
        $validated = $request->validate([
            'plan_id' => 'required|exists:subscription_plans,id',
            'ends_at' => 'nullable|date',
            'months' => 'nullable|integer|min:1|max:60',
            'extra_employees' => 'nullable|integer|min:0',
        ]);

        $plan = SubscriptionPlan::findOrFail($validated['plan_id']);
        $extraEmployees = $validated['extra_employees'] ?? 0;
        $extraCost = $extraEmployees * $plan->extra_employee_price;

        $startsAt = now();

        if (!empty($validated['ends_at'])) {
            $endsAt = \Carbon\Carbon::parse($validated['ends_at'])->endOfDay();
            $months = max(1, (int) round($startsAt->diffInMonths($endsAt, false)));
        } else {
            $months = $validated['months'] ?? 1;
            $endsAt = now()->addMonths($months)->endOfDay();
        }

        $totalPrice = ($plan->price_monthly + $extraCost) * $months;

        // تعطيل أي اشتراكات سابقة نشطة للمتجر لتجنب التكرار
        Subscription::where('tenant_id', $tenant->id)
            ->where('status', 'active')
            ->update(['status' => 'superseded']);

        Subscription::create([
            'tenant_id' => $tenant->id,
            'plan_id' => $plan->id,
            'billing_cycle' => $months >= 12 ? 'yearly' : 'monthly',
            'base_price' => $plan->price_monthly,
            'extra_employees_count' => $extraEmployees,
            'extra_employees_cost' => $extraCost,
            'total_price' => $totalPrice,
            'status' => 'active',
            'starts_at' => $startsAt,
            'ends_at' => $endsAt,
            'payment_method' => 'manual',
            'payment_reference' => 'ADMIN-ASSIGNED-' . time(),
        ]);

        $tenant->update([
            'subscription_status' => 'active',
            'subscription_ends_at' => $endsAt,
            'is_active' => true,
        ]);

        return back()->with('success', 'تم تعيين وتحديث باقة وتاريخ اشتراك المتجر بنجاح');
    }

    /**
     * تحديث عدد مقاعد الموظفين الإضافية للمتجر مباشرة
     */
    public function updateSeats(Request $request, Tenant $tenant): RedirectResponse
    {
        $validated = $request->validate([
            'extra_employees' => 'required|integer|min:0',
        ]);

        $sub = $tenant->currentSubscription;
        if ($sub) {
            $extraCost = $validated['extra_employees'] * ($sub->plan?->extra_employee_price ?? 0);
            $sub->update([
                'extra_employees_count' => $validated['extra_employees'],
                'extra_employees_cost' => $extraCost,
            ]);
        } else {
            $plan = SubscriptionPlan::first();
            Subscription::create([
                'tenant_id' => $tenant->id,
                'plan_id' => $plan ? $plan->id : 1,
                'billing_cycle' => 'monthly',
                'base_price' => $plan ? $plan->price_monthly : 0,
                'extra_employees_count' => $validated['extra_employees'],
                'extra_employees_cost' => 0,
                'total_price' => 0,
                'status' => 'active',
                'starts_at' => now(),
                'ends_at' => $tenant->subscription_ends_at ?? now()->addDays(14),
                'payment_method' => 'manual',
                'payment_reference' => 'SEATS-UPDATE-' . time(),
            ]);
        }

        return back()->with('success', "تم تحديث عدد المقاعد الإضافية إلى ({$validated['extra_employees']}) بنجاح");
    }

    /**
     * حذف المتجر نهائياً من قبل السوبر أدمن
     */
    public function destroy(Tenant $tenant): RedirectResponse
    {
        try {
            DB::table('sessions')->where('tenant_id', $tenant->id)->delete();
        } catch (\Exception $e) {}

        $name = $tenant->name;
        $tenant->delete();

        return redirect()->route('superadmin.tenants.index')->with('success', "تم حذف متجر ({$name}) بنجاح");
    }

    /**
     * الدخول كمتجر أو كموظف معين (أدمن، كاشير، مندوب) بواسطة توكن أمان مؤقت
     * دون التعديل على جلسة السوبر أدمن الحالية
     */
    public function impersonate(Request $request, Tenant $tenant)
    {
        $role = $request->query('role', 'admin');

        $targetUser = null;
        $targetPath = '/admin/dashboard';

        if ($role === 'cashier') {
            $targetUser = $tenant->users()->where('role', 'cashier')->where('is_active', true)->first() ?? $tenant->owner;
            $targetPath = '/pos';
        } elseif ($role === 'sales_rep') {
            $targetUser = $tenant->users()->where('role', 'sales_rep')->where('is_active', true)->first() ?? $tenant->owner;
            $targetPath = '/van-sales';
        } else {
            $targetUser = $tenant->owner;
            $targetPath = '/admin/dashboard';
        }

        if (!$targetUser) {
            return back()->with('error', 'لا يوجد مستخدم مسجل بهذا الدور لهذا المتجر');
        }

        // توليد توكن مؤقت صالح لمدة 60 ثانية للدخول
        $token = Str::random(64);
        Cache::put('impersonate_token_' . $token, [
            'user_id' => $targetUser->id,
            'tenant_id' => $tenant->id,
            'target_path' => $targetPath,
            'target_role' => $role,
            'user_name' => $targetUser->name,
            'user_role' => $targetUser->role,
            'super_admin_id' => auth()->id(),
        ], now()->addSeconds(60));

        $appUrl = config('app.url', 'http://casher.localhost:8000');
        $host = parse_url($appUrl, PHP_URL_HOST) ?: 'localhost';
        $port = parse_url($appUrl, PHP_URL_PORT) ? ':' . parse_url($appUrl, PHP_URL_PORT) : (request()->getPort() ? ':' . request()->getPort() : '');
        $scheme = parse_url($appUrl, PHP_URL_SCHEME) ?: request()->getScheme();

        $cleanHost = str_starts_with($host, 'app.') ? substr($host, 4) : $host;

        // في البيئة المحلية بدون Subdomain
        if (($cleanHost === 'localhost' || $cleanHost === '127.0.0.1') && (request()->getHost() === 'localhost' || request()->getHost() === '127.0.0.1')) {
            $entryUrl = "{$scheme}://{$cleanHost}{$port}/admin/impersonate-entry?token={$token}";
        } else {
            $entryUrl = "{$scheme}://{$tenant->slug}.{$cleanHost}{$port}/admin/impersonate-entry?token={$token}";
        }

        return redirect()->away($entryUrl);
    }

    /**
     * نقطة استقبال التوكن على نطاق المتجر وبدء جلسة الانتحال
     */
    public function impersonateEntry(Request $request)
    {
        $token = $request->query('token');
        $data = Cache::pull('impersonate_token_' . $token);

        if (!$data) {
            abort(403, 'رابط الدخول المؤقت غير صالح أو انتهت صلاحيته.');
        }

        $user = User::find($data['user_id']);
        $tenant = Tenant::find($data['tenant_id']);

        if (!$user || !$tenant) {
            abort(404, 'المستخدم أو المتجر غير موجود.');
        }

        // إنشاء توكن طويل في الكاش (8 ساعات) لربط جلسة الانتحال
        $longToken = Str::random(64);
        Cache::put('impersonate_token_' . $longToken, [
            'user_id' => $user->id,
            'tenant_id' => $tenant->id,
            'target_path' => $data['target_path'] ?? '/admin/dashboard',
            'target_role' => $data['target_role'] ?? 'admin',
            'user_name' => $user->name,
            'user_role' => $user->role,
            'super_admin_id' => $data['super_admin_id'] ?? null,
        ], now()->addHours(8));

        session([
            'impersonated_tenant_id' => $tenant->id,
            'impersonated_by_admin' => $data['super_admin_id'] ?? null,
            'impersonated_target' => $data['target_role'] ?? 'admin',
            'impersonated_user_name' => $user->name,
            'impersonated_user_role' => $user->role,
            'impersonate_token' => $longToken,
        ]);

        $cookie = cookie(
            name: 'impersonate_token',
            value: $longToken,
            minutes: 480,
            path: '/',
            domain: null,
            secure: $request->secure(),
            httpOnly: true,
            sameSite: 'lax'
        );

        $targetPath = $data['target_path'] ?? '/admin/dashboard';

        return redirect($targetPath)->withCookie($cookie);
    }

    /**
     * إنهاء الانتحال والعودة الفورية إلى لوحة السوبر أدمن
     */
    public function impersonateLeave(Request $request)
    {
        $token = $request->cookie('impersonate_token') ?? session('impersonate_token');

        if ($token) {
            Cache::forget('impersonate_token_' . $token);
        }

        session()->forget([
            'impersonated_tenant_id',
            'impersonated_by_admin',
            'impersonated_target',
            'impersonated_user_name',
            'impersonated_user_role',
            'impersonate_token',
        ]);

        $appUrl = config('app.url', 'http://casher.localhost:8000');
        $host = parse_url($appUrl, PHP_URL_HOST) ?: 'localhost';
        $port = parse_url($appUrl, PHP_URL_PORT) ? ':' . parse_url($appUrl, PHP_URL_PORT) : (request()->getPort() ? ':' . request()->getPort() : '');
        $scheme = parse_url($appUrl, PHP_URL_SCHEME) ?: request()->getScheme();

        $cleanHost = str_starts_with($host, 'app.') ? substr($host, 4) : $host;

        if (($cleanHost === 'localhost' || $cleanHost === '127.0.0.1') && (request()->getHost() === 'localhost' || request()->getHost() === '127.0.0.1')) {
            $superAdminUrl = "{$scheme}://{$cleanHost}{$port}/admin/tenants";
        } else {
            $superAdminUrl = "{$scheme}://app.{$cleanHost}{$port}/admin/tenants";
        }

        $cookie = cookie()->forget('impersonate_token');

        if ($request->header('X-Inertia')) {
            return Inertia::location($superAdminUrl);
        }

        return redirect()->away($superAdminUrl)->withCookie($cookie);
    }
}
