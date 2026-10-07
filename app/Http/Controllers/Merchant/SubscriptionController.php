<?php

namespace App\Http\Controllers\Merchant;

use App\Http\Controllers\Controller;
use App\Models\PaymentTransaction;
use App\Models\PlatformSetting;
use App\Models\Subscription;
use App\Models\SubscriptionPlan;
use App\Models\Tenant;
use App\Services\KashierService;
use App\Services\PaymobService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class SubscriptionController extends Controller
{
    /**
     * صفحة تفاصيل الاشتراكات والباقات للمتجر
     */
    public function index(): Response
    {
        $tenant = app(Tenant::class);

        $currentSub = $tenant->currentSubscription()->with('plan')->first();
        
        // جلب الباقات مع تحويل كافة الأسعار إلى أرقام صحيحة بدون قروش
        $plans = SubscriptionPlan::where('is_active', true)->get()->map(function ($p) {
            $p->price_monthly = (int) round($p->price_monthly);
            $p->price_yearly = (int) round($p->price_yearly);
            $p->extra_employee_price = (int) round($p->extra_employee_price);
            return $p;
        });

        $currentPlan = $currentSub?->plan;
        if ($currentPlan) {
            $currentPlan->price_monthly = (int) round($currentPlan->price_monthly);
            $currentPlan->price_yearly = (int) round($currentPlan->price_yearly);
            $currentPlan->extra_employee_price = (int) round($currentPlan->extra_employee_price);
        }

        $isTrial = $tenant->subscription_status === 'trial';
        $currentEmployeesCount = $tenant->users()->count();
        $maxAllowedEmployees = $tenant->maxAllowedEmployees();
        $baseEmployees = $isTrial ? 2 : ($currentPlan?->max_employees ?? 2);
        $extraEmployees = $isTrial ? 0 : ($currentSub?->extra_employees_count ?? 0);
        $extraPrice = (int) round($currentPlan?->extra_employee_price ?? 50);

        $endsAt = $isTrial 
            ? ($tenant->trial_ends_at ?: $tenant->subscription_ends_at)
            : ($tenant->subscription_ends_at ?: $currentSub?->ends_at);
        $daysRemaining = $endsAt ? max(0, (int) now()->diffInDays($endsAt, false)) : 0;
        $isExpired = $tenant->isSubscriptionExpired();

        $history = $tenant->subscriptions()
            ->with('plan')
            ->latest('created_at')
            ->take(10)
            ->get()
            ->map(function ($sub) {
                $sub->total_price = (int) round($sub->total_price);
                return $sub;
            });

        return Inertia::render('Merchant/Subscriptions/Index', [
            'currentSubscription' => $currentSub,
            'currentPlan' => $currentPlan,
            'plans' => $plans,
            'stats' => [
                'status' => $tenant->subscription_status,
                'starts_at' => $currentSub?->starts_at?->format('Y-m-d') ?: $tenant->created_at->format('Y-m-d'),
                'ends_at' => $endsAt?->format('Y-m-d'),
                'days_remaining' => $daysRemaining,
                'is_expired' => $isExpired,
                'current_employees_count' => $currentEmployeesCount,
                'max_allowed_employees' => $maxAllowedEmployees,
                'base_employees' => $baseEmployees,
                'extra_employees' => $extraEmployees,
                'extra_employee_price' => $extraPrice,
            ],
            'history' => $history,
        ]);
    }

    /**
     * طلب تجديد الاشتراك الحالي وتمديد المدة -> التحويل لصفحة الدفع
     */
    public function renew(Request $request): RedirectResponse
    {
        $tenant = app(Tenant::class);

        $validated = $request->validate([
            'months' => 'required|integer|in:1,3,6,12',
        ]);

        $sub = $tenant->currentSubscription()->with('plan')->first();
        $plan = $sub?->plan ?: SubscriptionPlan::first();

        if (!$plan) {
            return back()->with('error', 'لا توجد باقة اشتراك متاحة للتجديد');
        }

        $months = (int) $validated['months'];
        $extraEmployees = $sub?->extra_employees_count ?? 0;
        $extraCostPerMonth = (int) round($extraEmployees * ($plan->extra_employee_price ?? 50));

        $monthlyBasePrice = (int) round($plan->price_monthly);
        if ($months === 12 && $plan->price_yearly > 0) {
            $totalPrice = (int) round($plan->price_yearly + ($extraCostPerMonth * 12));
        } else {
            $totalPrice = (int) round(($monthlyBasePrice + $extraCostPerMonth) * $months);
        }

        $orderReference = 'ORD-RENEW-' . $tenant->id . '-' . time() . '-' . rand(100, 999);
        $activeGateway = PlatformSetting::get('active_gateway', 'paymob');

        $transaction = PaymentTransaction::create([
            'tenant_id' => $tenant->id,
            'subscription_id' => $sub?->id,
            'order_reference' => $orderReference,
            'gateway' => $activeGateway,
            'type' => 'renew',
            'amount' => $totalPrice,
            'currency' => 'EGP',
            'status' => 'pending',
            'payload' => [
                'months' => $months,
                'plan_id' => $plan->id,
                'plan_name' => $plan->name,
                'extra_employees' => $extraEmployees,
            ],
        ]);

        return redirect()->route('admin.subscriptions.checkout', ['order' => $orderReference]);
    }

    /**
     * طلب إضافة مقاعد موظفين إضافيين -> التحويل لصفحة الدفع
     */
    public function addStaff(Request $request): RedirectResponse
    {
        $tenant = app(Tenant::class);

        $validated = $request->validate([
            'extra_count' => 'required|integer|min:1|max:100',
        ]);

        $sub = $tenant->currentSubscription()->with('plan')->first();
        if (!$sub || $tenant->subscription_status === 'trial') {
            return back()->with('error', 'لا يمكن شراء مقاعد موظفين إضافية أثناء الفترة التجريبية (الحد الأقصى للتجربة هو 2 موظف). يرجى الاشتراك في إحدى الباقات أولاً لتفعيل كافة الإمكانيات والمقاعد الإضافية.');
        }

        $extraCount = (int) $validated['extra_count'];
        $extraPrice = (int) round($sub->plan?->extra_employee_price ?? 50.0);
        $totalPrice = $extraCount * $extraPrice;

        $orderReference = 'ORD-STAFF-' . $tenant->id . '-' . time() . '-' . rand(100, 999);
        $activeGateway = PlatformSetting::get('active_gateway', 'paymob');

        $transaction = PaymentTransaction::create([
            'tenant_id' => $tenant->id,
            'subscription_id' => $sub->id,
            'order_reference' => $orderReference,
            'gateway' => $activeGateway,
            'type' => 'add_staff',
            'amount' => $totalPrice,
            'currency' => 'EGP',
            'status' => 'pending',
            'payload' => [
                'extra_count' => $extraCount,
                'price_per_seat' => $extraPrice,
            ],
        ]);

        return redirect()->route('admin.subscriptions.checkout', ['order' => $orderReference]);
    }

    /**
     * طلب ترقية باقة الاشتراك -> التحويل لصفحة الدفع
     */
    public function changePlan(Request $request): RedirectResponse
    {
        $tenant = app(Tenant::class);

        $validated = $request->validate([
            'plan_id' => 'required|exists:subscription_plans,id',
            'billing_cycle' => 'required|in:monthly,yearly',
        ]);

        $plan = SubscriptionPlan::findOrFail($validated['plan_id']);
        $sub = $tenant->currentSubscription;
        $extraEmployees = $sub?->extra_employees_count ?? 0;

        $isYearly = $validated['billing_cycle'] === 'yearly';
        $months = $isYearly ? 12 : 1;
        $basePrice = (int) round($isYearly ? $plan->price_yearly : $plan->price_monthly);
        $extraCost = (int) round($extraEmployees * ($plan->extra_employee_price ?? 50) * $months);
        $totalPrice = $basePrice + $extraCost;

        $orderReference = 'ORD-UPGRADE-' . $tenant->id . '-' . time() . '-' . rand(100, 999);
        $activeGateway = PlatformSetting::get('active_gateway', 'paymob');

        $transaction = PaymentTransaction::create([
            'tenant_id' => $tenant->id,
            'subscription_id' => $sub?->id,
            'order_reference' => $orderReference,
            'gateway' => $activeGateway,
            'type' => 'upgrade',
            'amount' => $totalPrice,
            'currency' => 'EGP',
            'status' => 'pending',
            'payload' => [
                'plan_id' => $plan->id,
                'plan_name' => $plan->name,
                'billing_cycle' => $validated['billing_cycle'],
            ],
        ]);

        return redirect()->route('admin.subscriptions.checkout', ['order' => $orderReference]);
    }

    /**
     * صفحة إتمام الدفع للمتجر (Paymob: فودافون كاش & إنستاباي)
     */
    public function checkout(string $orderReference, PaymobService $paymobService, KashierService $kashierService): Response|RedirectResponse
    {
        $tenant = app(Tenant::class);

        $transaction = PaymentTransaction::where('tenant_id', $tenant->id)
            ->where('order_reference', $orderReference)
            ->firstOrFail();

        if ($transaction->status === 'paid') {
            return redirect()->route('admin.subscriptions.index')->with('success', 'تم سداد هذه المعاملة وتفعيلها بالفعل!');
        }

        $activeGateway = PlatformSetting::get('active_gateway', 'paymob');
        $isPaymobConfigured = $paymobService->isConfigured();

        return Inertia::render('Merchant/Subscriptions/Checkout', [
            'transaction' => [
                'order_reference' => $transaction->order_reference,
                'type' => $transaction->type,
                'amount' => (int) round($transaction->amount),
                'currency' => $transaction->currency,
                'payload' => $transaction->payload,
                'created_at' => $transaction->created_at->format('Y-m-d H:i'),
            ],
            'tenant' => [
                'name' => $tenant->name,
                'phone' => $tenant->phone,
                'email' => $tenant->email,
            ],
            'gateway' => $activeGateway,
            'isPaymobConfigured' => $isPaymobConfigured,
            'paymobMode' => $paymobService->getMode(),
        ]);
    }

    /**
     * معالجة الدفع المباشر (فودافون كاش أو إنستاباي أو محاكاة الاختبار)
     */
    public function processPayment(Request $request, string $orderReference, PaymobService $paymobService): JsonResponse|RedirectResponse
    {
        $tenant = app(Tenant::class);

        $transaction = PaymentTransaction::where('tenant_id', $tenant->id)
            ->where('order_reference', $orderReference)
            ->firstOrFail();

        if ($transaction->status === 'paid') {
            return redirect()->route('admin.subscriptions.index')->with('success', 'المعاملة مدفوعة بالفعل ومفعلة!');
        }

        $method = $request->input('method', 'vodafone_cash'); // vodafone_cash, instapay, simulate
        $walletNumber = $request->input('wallet_number');

        // 1. زر المحاكاة التجريبية الصريح (Localhost Sandbox) المخصص للمطور فقط أثناء بيئة التطوير
        if ($method === 'simulate') {
            if (!app()->environment('local')) {
                return back()->with('error', 'محاكاة الاختبار التجريبية متاحة فقط للمطور في بيئة التطوير المحلية.');
            }

            $this->activateTransaction($transaction, 'sandbox_simulation', 'TRX-SIMULATE-' . strtoupper(Str::random(8)));

            $msg = $transaction->type === 'add_staff' 
                ? "تمت محاكاة السداد بنجاح واشتراك عدد {$transaction->payload['extra_count']} مقاعد موظفين إضافية بحسابك!"
                : ($transaction->type === 'renew' ? "تمت محاكاة تجديد اشتراك المتجر بنجاح!" : "تمت محاكاة ترقية باقة المتجر بنجاح!");

            return redirect()->route('admin.subscriptions.index')->with('success', $msg);
        }

        // 2. التحقق الصارم من تهيئة بوابة Paymob (وجود المفاتيح في لوحة السوبر أدمن)
        if (!$paymobService->isConfigured()) {
            return back()->with('error', 'بوابة الدفع الإلكتروني (Paymob) قيد التهيئة حالياً من قبل إدارة المنصة. لم يتم خصم أو تفعيل أي مبالغ. يرجى إدخال بيانات الربط في لوحة السوبر أدمن أولاً.');
        }

        // 3. مسار فودافون كاش والمحافظ الإلكترونية الحقيقي عبر Paymob
        if ($method === 'vodafone_cash') {
            $request->validate([
                'wallet_number' => 'required|string|regex:/^01[0125][0-9]{8}$/',
            ], [
                'wallet_number.required' => 'يرجى إدخال رقم محفظة فودافون كاش أو المحفظة الذكية',
                'wallet_number.regex' => 'رقم المحفظة غير صالح، يجب أن يبدأ بـ 010 أو 011 أو 012 أو 015 ومكون من 11 رقماً',
            ]);

            $authToken = $paymobService->authenticate();
            if (!$authToken) {
                return back()->with('error', 'تعذر الاتصال ببوابة Paymob: يرجى التحقق من صحة API Key في إعدادات السوبر أدمن.');
            }

            $order = $paymobService->createOrder($authToken, $transaction->amount, $transaction->order_reference);
            if (!$order) {
                return back()->with('error', 'فشل إنشاء أمر الدفع لدى Paymob. يرجى مراجعة إعدادات البوابة.');
            }

            $walletIntegrationId = $paymobService->getWalletIntegrationId();
            if (empty($walletIntegrationId)) {
                return back()->with('error', 'لم يتم ضبط معرف محفظة الجوال (Wallet Integration ID) في إعدادات الدفع بالسوبر أدمن.');
            }

            $paymentToken = $paymobService->generatePaymentKey(
                $authToken,
                $order['id'],
                $transaction->amount,
                $walletIntegrationId,
                [
                    'first_name' => $tenant->name,
                    'last_name' => 'Owner',
                    'email' => $tenant->email ?: 'owner@casher.com',
                    'phone_number' => $walletNumber,
                ]
            );

            if (!$paymentToken) {
                return back()->with('error', 'تعذر إصدار مفتاح السداد لمحفظة فودافون كاش من Paymob.');
            }

            $payResult = $paymobService->payWithWallet($paymentToken, $walletNumber);

            // لو البوابة أرجعت رابط توجيه
            if ($payResult && !empty($payResult['redirect_url'])) {
                return Inertia::location($payResult['redirect_url']);
            }

            // لو العملية معلقة بانتظار إدخال العميل لرقم المحفظة السري (PIN / OTP) على هاتفه
            if ($payResult && ($payResult['pending'] ?? false)) {
                $transaction->update([
                    'status' => 'pending',
                    'payment_method' => 'vodafone_cash',
                    'gateway_order_id' => $order['id'] ?? null,
                ]);

                return back()->with('info', 'تم إرسال طلب السداد إلى محفظة فودافون كاش برقم ' . $walletNumber . '. يرجى فتح هاتفك وتأكيد السحب بالرقم السري لإتمام التفعيل.');
            }

            return back()->with('error', 'لم يتم تأكيد السداد أو تم رفض المعاملة من مزود خدمة المحفظة.');
        }

        // 4. مسار إنستاباي والبطاقات البنكية الحقيقي عبر Paymob
        if ($method === 'instapay') {
            $authToken = $paymobService->authenticate();
            if (!$authToken) {
                return back()->with('error', 'تعذر الاتصال ببوابة Paymob: يرجى التحقق من صحة API Key في إعدادات السوبر أدمن.');
            }

            $cardIntegrationId = $paymobService->getCardIntegrationId();
            $iframeId = $paymobService->getIframeId();

            if (empty($cardIntegrationId) || empty($iframeId)) {
                return back()->with('error', 'يرجى التأكد من ضبط Card Integration ID و Iframe ID في إعدادات الدفع بالسوبر أدمن.');
            }

            $order = $paymobService->createOrder($authToken, $transaction->amount, $transaction->order_reference);
            if (!$order) {
                return back()->with('error', 'فشل إنشاء أمر الدفع لدى Paymob.');
            }

            $paymentToken = $paymobService->generatePaymentKey(
                $authToken,
                $order['id'],
                $transaction->amount,
                $cardIntegrationId,
                [
                    'first_name' => $tenant->name,
                    'last_name' => 'Owner',
                    'email' => $tenant->email ?: 'owner@casher.com',
                    'phone_number' => $tenant->phone ?: '+201000000000',
                ]
            );

            if (!$paymentToken) {
                return back()->with('error', 'تعذر إصدار مفتاح السداد لإنستاباي والبطاقات البنكية من Paymob.');
            }

            $iframeUrl = "https://accept.paymob.com/api/acceptance/iframes/{$iframeId}?payment_token={$paymentToken}";
            return Inertia::location($iframeUrl);
        }

        return back()->with('error', 'طريقة الدفع المختارة غير صالحة.');
    }

    /**
     * صفحة العودة والـ Callback من Paymob بعد الدفع
     */
    public function paymentCallback(Request $request): RedirectResponse
    {
        $success = $request->query('success');
        $orderReference = $request->query('merchant_order_id');

        if ($orderReference) {
            $transaction = PaymentTransaction::where('order_reference', $orderReference)->first();
            if ($transaction && ($success === 'true' || $success === true || $success == 1)) {
                $this->activateTransaction($transaction, 'paymob', $request->query('id'));
                return redirect()->route('admin.subscriptions.index')->with('success', 'تم السداد بنجاح وتفعيل الاشتراك ومقاعد الموظفين!');
            }
        }

        return redirect()->route('admin.subscriptions.index')->with('info', 'تم استلام تفاصيل العملية وجاري التحديث.');
    }

    /**
     * Webhook رسمي من خوادم Paymob
     */
    public function paymobWebhook(Request $request, PaymobService $paymobService): JsonResponse
    {
        $data = $request->all();
        $hmac = $request->query('hmac', '');

        // التحقق من توقيع HMAC إن كان مفعلاً
        if (!empty($hmac) && !$paymobService->validateHmac($data['obj'] ?? [], $hmac)) {
            return response()->json(['message' => 'Invalid HMAC signature'], 400);
        }

        $orderId = data_get($data, 'obj.order.merchant_order_id');
        $success = data_get($data, 'obj.success', false);

        if ($orderId && $success) {
            $transaction = PaymentTransaction::where('order_reference', $orderId)->first();
            if ($transaction && $transaction->status !== 'paid') {
                $this->activateTransaction($transaction, 'paymob', data_get($data, 'obj.id'));
            }
        }

        return response()->json(['status' => 'received']);
    }

    /**
     * تفعيل المعاملة وتحديث بيانات المتجر والاشتراك
     */
    protected function activateTransaction(PaymentTransaction $transaction, string $method, ?string $reference = null): void
    {
        $tenant = $transaction->tenant;
        $sub = $transaction->subscription ?: $tenant->currentSubscription;

        if ($transaction->type === 'add_staff') {
            $extraCount = (int) ($transaction->payload['extra_count'] ?? 1);
            if ($sub) {
                $newExtraCount = $sub->extra_employees_count + $extraCount;
                $extraPrice = (int) round($sub->plan?->extra_employee_price ?? 50);
                $sub->update([
                    'extra_employees_count' => $newExtraCount,
                    'extra_employees_cost' => $newExtraCount * $extraPrice,
                ]);
            }
        } elseif ($transaction->type === 'renew') {
            $months = (int) ($transaction->payload['months'] ?? 1);
            $planId = $transaction->payload['plan_id'] ?? ($sub?->plan_id ?: 1);
            $plan = SubscriptionPlan::find($planId);

            $currentEndsAt = $tenant->subscription_ends_at ?: $sub?->ends_at;
            if ($currentEndsAt && $currentEndsAt->isFuture()) {
                $startsAt = $sub?->starts_at ?: now();
                $endsAt = Carbon::parse($currentEndsAt)->addMonths($months)->endOfDay();
            } else {
                $startsAt = now();
                $endsAt = now()->addMonths($months)->endOfDay();
            }

            Subscription::where('tenant_id', $tenant->id)
                ->where('status', 'active')
                ->update(['status' => 'superseded']);

            $extraEmployees = $sub?->extra_employees_count ?? 0;
            $extraCostPerMonth = (int) round($extraEmployees * ($plan?->extra_employee_price ?? 50));
            $monthlyBasePrice = (int) round($plan?->price_monthly ?? 299);

            Subscription::create([
                'tenant_id' => $tenant->id,
                'plan_id' => $plan ? $plan->id : $sub->plan_id,
                'billing_cycle' => $months >= 12 ? 'yearly' : 'monthly',
                'base_price' => $monthlyBasePrice,
                'extra_employees_count' => $extraEmployees,
                'extra_employees_cost' => $extraCostPerMonth,
                'total_price' => (int) round($transaction->amount),
                'status' => 'active',
                'starts_at' => $startsAt,
                'ends_at' => $endsAt,
                'payment_method' => $method,
                'payment_reference' => $transaction->order_reference,
            ]);

            $tenant->update([
                'subscription_status' => 'active',
                'subscription_ends_at' => $endsAt,
                'is_active' => true,
            ]);
        } elseif ($transaction->type === 'upgrade') {
            $planId = $transaction->payload['plan_id'];
            $cycle = $transaction->payload['billing_cycle'] ?? 'monthly';
            $plan = SubscriptionPlan::findOrFail($planId);
            $months = $cycle === 'yearly' ? 12 : 1;
            $endsAt = now()->addMonths($months)->endOfDay();

            Subscription::where('tenant_id', $tenant->id)
                ->where('status', 'active')
                ->update(['status' => 'superseded']);

            $extraEmployees = $sub?->extra_employees_count ?? 0;
            $extraCost = (int) round($extraEmployees * ($plan->extra_employee_price ?? 50) * $months);

            Subscription::create([
                'tenant_id' => $tenant->id,
                'plan_id' => $plan->id,
                'billing_cycle' => $cycle,
                'base_price' => (int) round($cycle === 'yearly' ? $plan->price_yearly : $plan->price_monthly),
                'extra_employees_count' => $extraEmployees,
                'extra_employees_cost' => $extraCost,
                'total_price' => (int) round($transaction->amount),
                'status' => 'active',
                'starts_at' => now(),
                'ends_at' => $endsAt,
                'payment_method' => $method,
                'payment_reference' => $transaction->order_reference,
            ]);

            $tenant->update([
                'subscription_status' => 'active',
                'subscription_ends_at' => $endsAt,
                'is_active' => true,
            ]);
        }

        $transaction->update([
            'status' => 'paid',
            'payment_method' => $method,
            'gateway_transaction_id' => $reference ?: ('TRX-' . strtoupper(Str::random(10))),
        ]);
    }
}
