<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\KashierTransaction;
use App\Models\PaymentTransaction;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TransactionController extends Controller
{
    public function index(Request $request): Response
    {
        $statusFilter = $request->query('status'); // paid, pending, failed

        $paymentTransactions = PaymentTransaction::with('tenant')
            ->when($statusFilter, fn($q) => $q->where('status', $statusFilter))
            ->latest()
            ->get()
            ->map(function ($pt) {
                return [
                    'id' => 'pt_' . $pt->id,
                    'tenant_name' => $pt->tenant?->name ?? 'متجر تجريبي',
                    'tenant_slug' => $pt->tenant?->slug ?? '',
                    'tenant_id' => $pt->tenant_id,
                    'order_reference' => $pt->order_reference,
                    'type' => $pt->type,
                    'type_label' => match($pt->type) {
                        'add_staff' => 'شراء مقاعد موظفين إضافية (' . ($pt->payload['extra_count'] ?? 1) . ')',
                        'renew' => 'تجديد اشتراك المتجر (' . ($pt->payload['months'] ?? 1) . ' شهر)',
                        'upgrade' => 'ترقية باقة الاشتراك (' . ($pt->payload['plan_name'] ?? '') . ')',
                        'registration' => 'اشتراك وتسجيل متجر جديد',
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
            ->when($statusFilter, function ($q) use ($statusFilter) {
                if ($statusFilter === 'paid') return $q->where('status', 'SUCCESS');
                if ($statusFilter === 'pending') return $q->where('status', 'pending');
                if ($statusFilter === 'failed') return $q->where('status', 'FAILED');
                return $q;
            })
            ->latest()
            ->get()
            ->map(function ($kt) {
                return [
                    'id' => 'kt_' . $kt->id,
                    'tenant_name' => $kt->tenant?->name ?? 'متجر تجريبي',
                    'tenant_slug' => $kt->tenant?->slug ?? '',
                    'tenant_id' => $kt->tenant_id,
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

        $transactions = $paymentTransactions->concat($kashierTransactions)
            ->sortByDesc('created_at')
            ->values();

        $stats = [
            'total_revenue' => (float) PaymentTransaction::where('status', 'paid')->sum('amount') 
                             + (float) KashierTransaction::where('status', 'SUCCESS')->sum('amount'),
            'paid_count' => PaymentTransaction::where('status', 'paid')->count() 
                          + KashierTransaction::where('status', 'SUCCESS')->count(),
            'pending_count' => PaymentTransaction::where('status', 'pending')->count() 
                            + KashierTransaction::where('status', 'pending')->count(),
        ];

        return Inertia::render('SuperAdmin/Transactions/Index', [
            'transactions' => $transactions,
            'stats' => $stats,
            'filters' => [
                'status' => $statusFilter,
            ],
        ]);
    }
}
