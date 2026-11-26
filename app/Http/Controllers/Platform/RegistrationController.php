<?php

namespace App\Http\Controllers\Platform;

use App\Http\Controllers\Auth\AuthenticatedSessionController;
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
use Illuminate\Support\Facades\Cache;
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
            'plan_id' => 'nullable|exists:subscription_plans,id',
            'billing_cycle' => 'nullable|in:monthly,yearly',
        ]);

        $plan = !empty($validated['plan_id']) 
            ? SubscriptionPlan::find($validated['plan_id']) 
            : SubscriptionPlan::where('is_active', true)->first();

        // تجربة مجانية لمدة أسبوع (7 أيام) بحد أقصى 2 موظف
        $trialDays = 7;
        $trialEndsAt = now()->addDays($trialDays)->endOfDay();
        $tenant = null;
        $user = null;

        DB::transaction(function () use ($validated, $plan, $trialEndsAt, &$tenant, &$user) {
            $tenant = Tenant::create([
                'name' => $validated['store_name'],
                'slug' => strtolower($validated['slug']),
                'phone' => $validated['phone'],
                'email' => $validated['email'],
                'subscription_status' => 'trial',
                'trial_ends_at' => $trialEndsAt,
                'subscription_ends_at' => $trialEndsAt,
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

            // إنشاء اشتراك الفترة التجريبية (مجاني 7 أيام - 2 موظف)
            Subscription::create([
                'tenant_id' => $tenant->id,
                'plan_id' => $plan?->id,
                'billing_cycle' => $validated['billing_cycle'] ?? 'monthly',
                'base_price' => 0,
                'extra_employees_count' => 0,
                'extra_employees_cost' => 0,
                'total_price' => 0,
                'status' => 'trial',
                'starts_at' => now(),
                'ends_at' => $trialEndsAt,
                'payment_method' => 'trial',
                'payment_reference' => 'TRIAL-7DAYS-' . strtoupper(Str::random(8)),
            ]);
        });

        // تسجيل الدخول المباشر لمالك المتجر
        Auth::login($user, true);

        // إنشاء SSO Token لنقل الجلسة بسلاسة إلى النطاق الفرعي للمتجر
        $ssoToken = Str::random(64);
        Cache::put('sso_token_' . $ssoToken, [
            'user_id' => $user->id,
            'target' => '/admin/dashboard',
        ], now()->addMinutes(5));

        $baseDomain = AuthenticatedSessionController::getCentralBaseDomain($request);
        $scheme = $request->getScheme();
        $port = $request->getPort();
        $portStr = ($port && $port != 80 && $port != 443) ? ':' . $port : '';

        // توجيه المستخدم دائماً إلى النطاق الفرعي لمتجره الجديد
        $redirectUrl = AuthenticatedSessionController::getDashboardUrl($user);

        if ($request->header('X-Inertia')) {
            return Inertia::location($redirectUrl);
        }

        return redirect()->away($redirectUrl);
    }

    public function kashierCallback(Request $request)
    {
        $merchantOrderId = $request->input('merchantOrderId') ?? $request->query('merchantOrderId');
        $kashierOrderId = $request->input('orderId') ?? $request->query('orderId');
        $orderCandidates = array_values(array_unique(array_filter([$merchantOrderId, $kashierOrderId])));
        $paymentStatus = strtoupper((string) ($request->input('paymentStatus') ?? $request->query('paymentStatus') ?? $request->input('status') ?? $request->query('status') ?? ''));
        $transactionId = $request->input('transactionId') ?? $request->query('transactionId');

        $isSuccess = in_array($paymentStatus, ['SUCCESS', 'CAPTURED', 'PAID']);

        // 1. فحص معاملات المتاجر المشتركة (تجديد، إضافة موظفين، ترقية)
        $payTx = !empty($orderCandidates)
            ? \App\Models\PaymentTransaction::whereIn('order_reference', $orderCandidates)->first()
            : null;
        if ($payTx) {
            if ($isSuccess) {
                if ($payTx->status !== 'paid') {
                    app(\App\Http\Controllers\Merchant\SubscriptionController::class)->activateTransaction(
                        $payTx,
                        'kashier',
                        $transactionId
                    );
                }

                if (!Auth::check() && $payTx->tenant && $payTx->tenant->owner) {
                    Auth::login($payTx->tenant->owner);
                }

                $baseDomain = AuthenticatedSessionController::getCentralBaseDomain($request);
                $storeUrl = $request->getScheme() . '://' . $payTx->tenant->slug . '.' . $baseDomain . '/admin/subscriptions';
                return redirect()->away($storeUrl)->with('success', 'تم السداد وتفعيل باقتك بنجاح!');
            }
        }

        // 2. فحص معاملات تسجيل المتجر الجديد
        $transaction = !empty($orderCandidates)
            ? KashierTransaction::whereIn('kashier_order_id', $orderCandidates)->first()
            : null;
        if ($transaction) {
            $subscription = $transaction->subscription;
            $tenant = $transaction->tenant;

            if ($isSuccess) {
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
                    'transaction_id' => $transactionId,
                    'payment_method' => $request->input('cardBrand', $request->query('cardBrand', 'card')),
                    'payload' => array_merge($transaction->payload ?? [], $request->all()),
                ]);

                // تسجيل الدخول لمالك المتجر وتوجيهه لمحلّه
                if ($tenant->owner) {
                    Auth::login($tenant->owner);
                }

                $baseDomain = AuthenticatedSessionController::getCentralBaseDomain($request);
                $storeUrl = $request->getScheme() . '://' . $tenant->slug . '.' . $baseDomain . '/admin/dashboard';

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
        }

        return redirect()->route('platform.pricing')->with('error', 'فشلت عملية الدفع، يرجى المحاولة مرة أخرى.');
    }

    public function kashierWebhook(Request $request): JsonResponse
    {
        $payload = $request->all();
        \Illuminate\Support\Facades\Log::info('Kashier Webhook received:', $payload);

        $data = isset($payload['data']) && is_array($payload['data']) ? $payload['data'] : $payload;
        $signature = $request->header('x-kashier-signature') ?? $data['signature'] ?? $payload['signature'] ?? null;

        if (!empty($signature) && !$this->kashierService->validateWebhookSignature($data, (string) $signature, $request->getContent())) {
            \Illuminate\Support\Facades\Log::warning('Kashier Webhook: Invalid signature', ['signature' => $signature]);
            return response()->json(['error' => 'Invalid signature'], 400);
        }

        $orderCandidates = array_values(array_unique(array_filter([
            $data['merchantOrderId'] ?? null,
            $payload['merchantOrderId'] ?? null,
            $data['orderId'] ?? null,
            $payload['orderId'] ?? null,
        ])));

        $status = strtoupper((string) ($data['paymentStatus'] ?? $data['status'] ?? $payload['paymentStatus'] ?? $payload['status'] ?? ''));
        $isSuccess = in_array($status, ['SUCCESS', 'CAPTURED', 'PAID']);
        $txId = $data['kashierTransactionId'] ?? $data['transactionId'] ?? $payload['transactionId'] ?? null;

        if (!empty($orderCandidates) && $isSuccess) {
            // أولاً: تفعيل معاملات المتاجر المشتركة (تجديد، إضافة موظفين، ترقية)
            $payTx = \App\Models\PaymentTransaction::whereIn('order_reference', $orderCandidates)->first();
            if ($payTx && $payTx->status !== 'paid') {
                app(\App\Http\Controllers\Merchant\SubscriptionController::class)->activateTransaction(
                    $payTx,
                    'kashier',
                    $txId
                );
            }

            // ثانياً: تفعيل اشتراك متجر مسجل جديد
            $transaction = KashierTransaction::whereIn('kashier_order_id', $orderCandidates)->first();
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
                    'transaction_id' => $txId,
                    'payload' => $payload,
                ]);
            }
        }

        return response()->json(['status' => 'processed']);
    }
}
