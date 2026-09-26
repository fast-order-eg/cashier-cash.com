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

        $msg = $tenant->is_active ? 'تم تفعيل حساب المتجر بنجاح' : 'تم تعطيل حساب المتجر بنجاح';
        return back()->with('success', $msg);
    }

    public function assignSubscription(Request $request, Tenant $tenant): RedirectResponse
    {
        $validated = $request->validate([
            'plan_id' => 'required|exists:subscription_plans,id',
            'months' => 'required|integer|min:1|max:36',
            'extra_employees' => 'nullable|integer|min:0',
        ]);

        $plan = SubscriptionPlan::findOrFail($validated['plan_id']);
        $extraEmployees = $validated['extra_employees'] ?? 0;
        $extraCost = $extraEmployees * $plan->extra_employee_price;
        $totalPrice = ($plan->price_monthly + $extraCost) * $validated['months'];

        $startsAt = now();
        $endsAt = now()->addMonths($validated['months']);

        Subscription::create([
            'tenant_id' => $tenant->id,
            'plan_id' => $plan->id,
            'billing_cycle' => $validated['months'] >= 12 ? 'yearly' : 'monthly',
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

        return back()->with('success', 'تم تعيين وتحديث اشتراك المتجر بنجاح');
    }

    public function impersonate(Tenant $tenant): RedirectResponse
    {
        $owner = $tenant->owner;

        if (!$owner) {
            return back()->with('error', 'هذا المتجر ليس لديه حساب مالك مسجل');
        }

        session(['impersonated_by_admin' => auth()->id()]);
        session(['impersonated_tenant_id' => $tenant->id]);
        Auth::login($owner);

        return redirect()->route('admin.dashboard')->with('info', "أنت الآن مسجل كمدير لمتجر: {$tenant->name}");
    }
}
