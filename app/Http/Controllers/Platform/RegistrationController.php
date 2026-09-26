<?php

namespace App\Http\Controllers\Platform;

use App\Http\Controllers\Controller;
use App\Models\KashierTransaction;
use App\Models\Subscription;
use App\Models\SubscriptionPlan;
use App\Models\Tenant;
use App\Models\User;
use App\Services\KashierService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class RegistrationController extends Controller
{
    protected KashierService $kashierService;

    public function __construct(KashierService $kashierService)
    {
        $this->kashierService = $kashierService;
    }

    public function showForm(Request $request): Response
    {
        $plans = SubscriptionPlan::where('is_active', true)->get();
        $selectedPlan = $request->plan ? SubscriptionPlan::where('slug', $request->plan)->first() : $plans->first();

        return Inertia::render('Platform/Register', [
            'plans' => $plans,
            'selectedPlan' => $selectedPlan,
        ]);
    }

    public function checkSlug(Request $request): JsonResponse
    {
        $slug = Str::slug($request->query('slug', ''));

        if (empty($slug)) {
            return response()->json(['available' => false, 'message' => 'الرابط مطلوب']);
        }

        $reserved = ['app', 'admin', 'www', 'api', 'root', 'superadmin', 'mail'];
        if (in_array(strtolower($slug), $reserved)) {
            return response()->json(['available' => false, 'message' => 'هذا الاسم محجوز للنظام']);
        }

        $exists = Tenant::where('slug', $slug)->exists();

        return response()->json([
            'available' => !$exists,
            'slug' => $slug,
            'message' => $exists ? 'هذا الرابط مستخدم بالفعل' : 'الرابط متاح للاستخدام',
        ]);
    }

    public function register(Request $request)
    {
        $validated = $request->validate([
            'store_name' => 'required|string|max:255',
            'slug' => 'required|string|max:50|alpha_dash|unique:tenants,slug',
            'owner_name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email',
            'phone' => 'required|string|max:20',
            'password' => 'required|string|min:8|confirmed',
            'plan_id' => 'required|exists:subscription_plans,id',
            'billing_cycle' => 'required|in:monthly,yearly',
            'extra_employees' => 'nullable|integer|min:0',
        ]);

        $plan = SubscriptionPlan::findOrFail($validated['plan_id']);
        $extraEmployees = (int) ($validated['extra_employees'] ?? 0);
        $isYearly = $validated['billing_cycle'] === 'yearly';

        $basePrice = $isYearly ? $plan->price_yearly : $plan->price_monthly;
        $extraCostPerMonth = $extraEmployees * $plan->extra_employee_price;
        $extraCostTotal = $isYearly ? ($extraCostPerMonth * 12) : $extraCostPerMonth;
        $totalPrice = $basePrice + $extraCostTotal;

        $tenant = null;
        $user = null;
        $subscription = null;

        DB::transaction(function () use ($validated, $plan, $basePrice, $extraEmployees, $extraCostTotal, $totalPrice, &$tenant, &$user, &$subscription) {
            $tenant = Tenant::create([
                'name' => $validated['store_name'],
                'slug' => strtolower($validated['slug']),
                'phone' => $validated['phone'],
                'email' => $validated['email'],
                'subscription_status' => 'pending',
                'is_active' => true,
            ]);

            $user = User::create([
                'tenant_id' => $tenant->id,
                'name' => $validated['owner_name'],
                'email' => $validated['email'],
                'phone' => $validated['phone'],
                'password' => Hash::make($validated['password']),
                'role' => 'admin',
                'is_active' => true,
            ]);

            $tenant->update(['owner_id' => $user->id]);

            $subscription = Subscription::create([
                'tenant_id' => $tenant->id,
                'plan_id' => $plan->id,
                'billing_cycle' => $validated['billing_cycle'],
                'base_price' => $basePrice,
                'extra_employees_count' => $extraEmployees,
                'extra_employees_cost' => $extraCostTotal,
                'total_price' => $totalPrice,
                'status' => 'pending',
                'payment_method' => 'kashier',
                'payment_reference' => 'KASH-' . strtoupper(Str::random(10)),
            ]);
        });

        // إنشاء معاملة Kashier وتوليد رابط الدفع
        $orderId = 'ORD-' . $subscription->id . '-' . time();
        $hash = $this->kashierService->generateHash($orderId, $totalPrice, 'EGP');

        KashierTransaction::create([
            'tenant_id' => $tenant->id,
            'subscription_id' => $subscription->id,
            'kashier_order_id' => $orderId,
            'amount' => $totalPrice,
            'currency' => 'EGP',
            'status' => 'pending',
            'payload' => [
                'plan_name' => $plan->name,
                'billing_cycle' => $validated['billing_cycle'],
                'extra_employees' => $extraEmployees,
            ],
        ]);

        return Inertia::render('Platform/Checkout', [
            'tenant' => $tenant,
            'subscription' => $subscription,
            'plan' => $plan,
            'paymentData' => [
                'merchantId' => $this->kashierService->getMerchantId(),
                'orderId' => $orderId,
                'amount' => $totalPrice,
                'currency' => 'EGP',
                'hash' => $hash,
                'mode' => $this->kashierService->getMode(),
                'baseUrl' => $this->kashierService->getBaseUrl(),
                'callbackUrl' => route('platform.payment.callback'),
            ],
        ]);
    }

    public function kashierCallback(Request $request)
    {
        $orderId = $request->query('orderId');
        $paymentStatus = $request->query('paymentStatus'); // SUCCESS or FAILED
        $signature = $request->query('signature');

        $transaction = KashierTransaction::where('kashier_order_id', $orderId)->firstOrFail();
        $subscription = $transaction->subscription;
        $tenant = $transaction->tenant;

        if (strtoupper($paymentStatus) === 'SUCCESS') {
            $isYearly = $subscription->billing_cycle === 'yearly';
            $durationMonths = $isYearly ? 12 : 1;

            $subscription->update([
                'status' => 'active',
                'starts_at' => now(),
                'ends_at' => now()->addMonths($durationMonths),
            ]);

            $tenant->update([
                'subscription_status' => 'active',
                'subscription_ends_at' => now()->addMonths($durationMonths),
                'is_active' => true,
            ]);

            $transaction->update([
                'status' => 'SUCCESS',
                'transaction_id' => $request->query('transactionId'),
                'payment_method' => $request->query('cardBrand') ?? 'card',
                'payload' => array_merge($transaction->payload ?? [], $request->all()),
            ]);

            // تسجيل الدخول لمالك المتجر وتوجيهه لمحلّه
            Auth::login($tenant->owner);

            $host = request()->getHost();
            $baseDomain = parse_url(config('app.url'), PHP_URL_HOST);
            $storeUrl = request()->getScheme() . '://' . $tenant->slug . '.' . $baseDomain . '/admin/dashboard';

            return Inertia::render('Platform/PaymentSuccess', [
                'tenant' => $tenant,
                'storeUrl' => $storeUrl,
                'subscription' => $subscription,
            ]);
        }

        $transaction->update([
            'status' => 'FAILED',
            'payload' => array_merge($transaction->payload ?? [], $request->all()),
        ]);

        return redirect()->route('platform.pricing')->with('error', 'فشلت عملية الدفع، يرجى المحاولة مرة أخرى.');
    }

    public function kashierWebhook(Request $request): JsonResponse
    {
        $payload = $request->all();
        $data = $payload['data'] ?? [];
        $signature = $payload['signature'] ?? '';

        if (!empty($signature) && !$this->kashierService->validateWebhookSignature($data, $signature)) {
            return response()->json(['error' => 'Invalid signature'], 400);
        }

        $orderId = $data['merchantOrderId'] ?? null;
        $status = $data['status'] ?? null;

        if ($orderId && strtoupper($status) === 'SUCCESS') {
            $transaction = KashierTransaction::where('kashier_order_id', $orderId)->first();
            if ($transaction && $transaction->status !== 'SUCCESS') {
                $subscription = $transaction->subscription;
                $tenant = $transaction->tenant;

                $isYearly = $subscription->billing_cycle === 'yearly';
                $durationMonths = $isYearly ? 12 : 1;

                $subscription->update([
                    'status' => 'active',
                    'starts_at' => now(),
                    'ends_at' => now()->addMonths($durationMonths),
                ]);

                $tenant->update([
                    'subscription_status' => 'active',
                    'subscription_ends_at' => now()->addMonths($durationMonths),
                    'is_active' => true,
                ]);

                $transaction->update([
                    'status' => 'SUCCESS',
                    'transaction_id' => $data['kashierTransactionId'] ?? null,
                    'payload' => $payload,
                ]);
            }
        }

        return response()->json(['status' => 'processed']);
    }
}
