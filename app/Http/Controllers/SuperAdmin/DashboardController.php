<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\KashierTransaction;
use App\Models\Subscription;
use App\Models\SubscriptionPlan;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        $totalTenants = Tenant::count();
        $activeTenants = Tenant::where('is_active', true)->where('subscription_status', 'active')->count();
        $trialTenants = Tenant::where('subscription_status', 'trial')->count();
        
        $totalRevenue = KashierTransaction::where('status', 'SUCCESS')->sum('amount');
        $totalInvoicesCount = Invoice::count();

        $recentTenants = Tenant::with(['owner', 'currentSubscription.plan'])
            ->latest()
            ->take(5)
            ->get();

        $recentTransactions = KashierTransaction::with('tenant')
            ->latest()
            ->take(5)
            ->get();

        $plansSummary = SubscriptionPlan::withCount('subscriptions')->get();

        return Inertia::render('SuperAdmin/Dashboard', [
            'stats' => [
                'total_tenants' => $totalTenants,
                'active_tenants' => $activeTenants,
                'trial_tenants' => $trialTenants,
                'total_revenue' => $totalRevenue,
                'total_invoices_count' => $totalInvoicesCount,
            ],
            'recent_tenants' => $recentTenants,
            'recent_transactions' => $recentTransactions,
            'plans_summary' => $plansSummary,
        ]);
    }
}
