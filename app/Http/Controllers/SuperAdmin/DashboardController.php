<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\KashierTransaction;
use App\Models\PaymentTransaction;
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
        
        $totalRevenue = (float) PaymentTransaction::where('status', 'paid')->sum('amount') 
                      + (float) KashierTransaction::where('status', 'SUCCESS')->sum('amount');
        $totalInvoicesCount = Invoice::count();

        $recentTenants = Tenant::with(['owner', 'currentSubscription.plan'])
            ->latest()
            ->take(5)
            ->get();

        $paymentTransactions = PaymentTransaction::with('tenant')
            ->latest()
            ->take(15)
            ->get()
            ->map(function ($pt) {
                return [
                    'id' => 'pt_' . $pt->id,
                    'tenant_name' => $pt->tenant?->name ?? 'متجر تجريبي',
                    'tenant_slug' => $pt->tenant?->slug ?? '',
                    'order_reference' => $pt->order_reference,
                    'type' => $pt->type,
                    'type_label' => match($pt->type) {
                        'add_staff' => 'شراء موظفين إضافيين (' . ($pt->payload['extra_count'] ?? 1) . ')',
                        'renew' => 'تجديد باقة (' . ($pt->payload['months'] ?? 1) . ' شهر)',
                        'upgrade' => 'ترقية الباقة (' . ($pt->payload['plan_name'] ?? '') . ')',
                        'registration' => 'اشتراك تسجيل متجر',
                        default => 'سداد اشتراك',
                    },
                    'amount' => (float) $pt->amount,
                    'currency' => $pt->currency ?: 'EGP',
                    'gateway' => $pt->gateway ?: 'kashier',
                    'status' => $pt->status,
                    'transaction_id' => $pt->gateway_transaction_id ?: $pt->order_reference,
                    'created_at' => $pt->created_at?->format('Y-m-d H:i') ?? '',
                ];
            });

        $kashierTransactions = KashierTransaction::with('tenant')
            ->latest()
            ->take(15)
            ->get()
            ->map(function ($kt) {
                return [
                    'id' => 'kt_' . $kt->id,
                    'tenant_name' => $kt->tenant?->name ?? 'متجر تجريبي',
                    'tenant_slug' => $kt->tenant?->slug ?? '',
                    'order_reference' => $kt->kashier_order_id,
                    'type' => 'registration',
                    'type_label' => 'اشتراك وتسجيل متجر جديد',
                    'amount' => (float) $kt->amount,
                    'currency' => $kt->currency ?: 'EGP',
                    'gateway' => 'kashier',
                    'status' => $kt->status === 'SUCCESS' ? 'paid' : strtolower($kt->status),
                    'transaction_id' => $kt->transaction_id ?: $kt->kashier_order_id,
                    'created_at' => $kt->created_at?->format('Y-m-d H:i') ?? '',
                ];
            });

        $recentTransactions = $paymentTransactions->concat($kashierTransactions)
            ->sortByDesc('created_at')
            ->values()
            ->take(8);

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

