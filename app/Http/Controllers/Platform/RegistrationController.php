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
