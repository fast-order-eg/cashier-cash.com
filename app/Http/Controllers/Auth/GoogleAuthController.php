<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\User;
use Exception;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Laravel\Socialite\Facades\Socialite;

class GoogleAuthController extends Controller
{
    /**
     * تحويل المستخدم إلى صفحة تسجيل الدخول بجوجل
     */
    public function redirectToGoogle(): RedirectResponse
    {
        return Socialite::driver('google')->redirect();
    }

    /**
     * استقبال رد جوجل بعد موافقة المستخدم
     */
    public function handleGoogleCallback(): RedirectResponse
    {
        try {
            $googleUser = Socialite::driver('google')->user();

            // 1. البحث عن المستخدم بالـ google_id أولاً أو بالبريد الإلكتروني
            $user = User::where('google_id', $googleUser->getId())
                ->orWhere('email', $googleUser->getEmail())
                ->first();

            if ($user) {
                // تحديث الـ google_id والصورة إذا لم يكونوا موجودين
                $user->update([
                    'google_id' => $googleUser->getId(),
                    'avatar' => $googleUser->getAvatar(),
                ]);
            } else {
                // 2. مستخدم جديد تماماً
                $user = User::create([
                    'name' => $googleUser->getName() ?? 'تاجر كاشير',
                    'email' => $googleUser->getEmail(),
                    'google_id' => $googleUser->getId(),
                    'avatar' => $googleUser->getAvatar(),
                    'role' => 'admin', // صاحب متجر
                    'is_active' => true,
                ]);
            }

            // تسجيل الدخول
            Auth::login($user, true);

            // 3. التوجيه بحسب دور المستخدم ووجود متجر له
            if ($user->isSuperAdmin()) {
                return redirect()->route('superadmin.dashboard');
            }

            // إذا كان المستخدم مرتبطاً بمتجر مسبقاً
            if ($user->tenant) {
                $subdomain = $user->tenant->subdomain;
                $appUrl = config('app.url', 'http://casher.localhost:8000');
                $host = parse_url($appUrl, PHP_URL_HOST) ?: 'localhost';
                $port = parse_url($appUrl, PHP_URL_PORT) ? ':' . parse_url($appUrl, PHP_URL_PORT) : '';
                $scheme = parse_url($appUrl, PHP_URL_SCHEME) ?: 'http';

                // تنظيف الـ host
                if (str_starts_with($host, 'casher.')) {
                    $cleanHost = substr($host, 7);
                } else {
                    $cleanHost = $host;
                }

                $tenantUrl = "{$scheme}://{$subdomain}.casher.{$cleanHost}{$port}/admin/dashboard";
                return redirect()->away($tenantUrl);
            }

            // إذا كان مستخدماً جديداً ولم ينشئ متجره بعد، نوجهه لصفحة تسجيل المتجر
            return redirect()->route('platform.register')->with('success', 'تم تسجيل الدخول بنجاح بحساب Google، يرجى إكمال بيانات متجرك.');

        } catch (Exception $e) {
            Log::error('Google Login Error: ' . $e->getMessage());
            return redirect()->route('login')->withErrors(['email' => 'حدث خطأ أثناء تسجيل الدخول عبر Google، يرجى المحاولة مرة أخرى.']);
        }
    }
}
