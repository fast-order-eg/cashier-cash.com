<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Subscription;
use App\Models\SubscriptionPlan;
use App\Models\Tenant;
use App\Models\User;
use Exception;
use GuzzleHttp\Client as GuzzleClient;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

class GoogleAuthController extends Controller
{
    /**
     * الحصول على معالج Google Socialite مع عميل HTTP مهيأ لتفادي مشاكل SSL في البيئة المحلية
     */
    protected function getGoogleDriver()
    {
        $driver = Socialite::driver('google')->stateless();

        // تجنب خطأ cURL error 60 (SSL certificate problem) الشائع في بيئة التطوير والويندوز
        $verifySsl = config('services.google.guzzle.verify', false);

        $client = new GuzzleClient([
            'verify' => $verifySsl,
            'timeout' => 30,
        ]);

        $driver->setHttpClient($client);

        return $driver;
    }

    /**
     * تحويل المستخدم إلى صفحة تسجيل الدخول بجوجل
     */
    public function redirectToGoogle(): RedirectResponse
    {
        return $this->getGoogleDriver()
            ->with([
                'prompt' => 'select_account consent',
            ])
            ->redirect();
    }

    /**
     * استقبال رد جوجل بعد موافقة المستخدم وتسجيل الدخول / إنشاء المتجر
     */
    public function handleGoogleCallback(): RedirectResponse
    {
        try {
            // استخدام الدرايفر مع stateless وتجاوز فحص SSL المحلي
            $googleUser = $this->getGoogleDriver()->user();

            if (!$googleUser || !$googleUser->getEmail()) {
                throw new Exception('لم نتمكن من استلام بيانات الحساب أو البريد الإلكتروني من Google.');
            }

            // 1. البحث عن المستخدم بالـ google_id أولاً أو بالبريد الإلكتروني
            $user = User::where('google_id', $googleUser->getId())
                ->orWhere('email', $googleUser->getEmail())
                ->first();

            if ($user) {
                // تحديث الـ google_id والصورة إن لم يكونا مسجلين
                $user->update([
                    'google_id' => $googleUser->getId(),
                    'avatar' => $googleUser->getAvatar() ?: $user->avatar,
                ]);
            } else {
                // 2. إنشاء مستخدم جديد بحساب Google
                $user = User::create([
                    'name' => $googleUser->getName() ?: 'تاجر كاشير',
                    'email' => $googleUser->getEmail(),
                    'google_id' => $googleUser->getId(),
                    'avatar' => $googleUser->getAvatar(),
                    'role' => 'admin', // صاحب متجر
                    'is_active' => true,
                    'password' => bcrypt(Str::random(32)),
                ]);
            }

            // 3. إذا لم يكن للمستخدم متجر مسجل بعد (تسجيل حساب متجر جديد بالـ Gmail)
            if (!$user->tenant_id && !$user->isSuperAdmin()) {
                // توليد رابط فريد (slug) للمتجر الجديد
                $emailPrefix = explode('@', $googleUser->getEmail())[0];
                $cleanPrefix = preg_replace('/[^a-zA-Z0-9]/', '', $emailPrefix);
                $baseSlug = strtolower($cleanPrefix);
                if (empty($baseSlug) || strlen($baseSlug) < 3) {
                    $baseSlug = 'store' . rand(100, 999);
                }

                $slug = $baseSlug;
                $counter = 1;
                while (Tenant::where('slug', $slug)->exists()) {
                    $slug = $baseSlug . $counter++;
                }

                $storeName = $googleUser->getName() ? ('متجر ' . $googleUser->getName()) : 'متجري الجديد';
                $trialEndsAt = now()->addDays(7)->endOfDay();

                DB::transaction(function () use ($user, $storeName, $slug, $trialEndsAt) {
                    $tenant = Tenant::create([
                        'name' => $storeName,
                        'slug' => $slug,
                        'email' => $user->email,
                        'owner_id' => $user->id,
                        'is_active' => true,
                        'subscription_status' => 'trial',
                        'trial_ends_at' => $trialEndsAt,
                        'subscription_ends_at' => $trialEndsAt,
                    ]);

                    $user->tenant_id = $tenant->id;
                    $user->save();

                    $plan = SubscriptionPlan::where('is_active', true)->first();

                    Subscription::create([
                        'tenant_id' => $tenant->id,
                        'plan_id' => $plan?->id,
                        'billing_cycle' => 'monthly',
                        'base_price' => 0,
                        'extra_employees_count' => 0,
                        'extra_employees_cost' => 0,
                        'total_price' => 0,
                        'status' => 'trial',
                        'starts_at' => now(),
                        'ends_at' => $trialEndsAt,
                        'trial_ends_at' => $trialEndsAt,
                        'payment_method' => 'trial',
                        'payment_reference' => 'GOOGLE-TRIAL-' . strtoupper(Str::random(8)),
                    ]);
                });

                // إعادة تحميل بيانات المتجر في الموديل
                $user->load('tenant');
            }

            // 4. تحديد وجهة المستخدم بدقة وتوليد توكن الـ SSO
            $targetUrl = AuthenticatedSessionController::getDashboardUrl($user);

            // لو الوجهة نقل إلى نطاق آخر عبر SSO
            if (str_contains($targetUrl, '/auth/sso-entry')) {
                return redirect()->away($targetUrl);
            }

            // تسجيل الدخول على النطاق الحالي
            Auth::login($user, true);

            return redirect()->to($targetUrl);

        } catch (Exception $e) {
            Log::error('Google Login Error: ' . $e->getMessage(), [
                'exception' => $e,
            ]);

            $centralLoginUrl = AuthenticatedSessionController::getCentralLoginUrl();
            return redirect()->away($centralLoginUrl)->withErrors([
                'email' => 'حدث خطأ أثناء تسجيل الدخول عبر Google: ' . ($e->getMessage() ?: 'يرجى المحاولة مرة أخرى.')
            ]);
        }
    }
}
