<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class AuthenticatedSessionController extends Controller
{
    /**
     * استخراج النطاق الأساسي المركزي (Base Domain) بمرونة للبيئة المحلية والسحابية
     */
    public static function getCentralBaseDomain(?Request $request = null): string
    {
        $request = $request ?? (app()->bound('request') ? app('request') : null);
        $host = $request ? $request->getHost() : null;

        $appUrl = config('app.url', 'http://localhost:8000');
        $configHost = parse_url($appUrl, PHP_URL_HOST) ?: 'localhost';
        if (str_starts_with($configHost, 'app.')) {
            $configHost = substr($configHost, 4);
        }

        if (!$host || $host === '127.0.0.1' || filter_var($host, FILTER_VALIDATE_IP)) {
            return $configHost;
        }

        if (str_ends_with($host, '.localhost')) {
            $parts = explode('.', $host);
            if (count($parts) === 2) {
                return 'localhost';
            } elseif (count($parts) >= 3) {
                array_shift($parts);
                return implode('.', $parts);
            }
            return 'localhost';
        }

        if ($host === 'localhost') {
            return 'localhost';
        }

        $cleanHost = str_starts_with($host, 'app.') ? substr($host, 4) : $host;
        $parts = explode('.', $cleanHost);
        if (count($parts) >= 3) {
            array_shift($parts);
            return implode('.', $parts);
        }

        return $cleanHost ?: $configHost;
    }

    /**
     * استخراج اسم مضيف النطاق المركزي (app.domain أو app.localhost)
     */
    public static function getCentralHost(?Request $request = null): string
    {
        $baseDomain = self::getCentralBaseDomain($request);
        return 'app.' . $baseDomain;
    }

    /**
     * التحقق مما إذا كان الطلب الحالي على النطاق المركزي
     */
    public static function isCentralHost(?Request $request = null): bool
    {
        $request = $request ?? (app()->bound('request') ? app('request') : null);
        if (!$request) {
            return true;
        }

        $currentHost = strtolower($request->getHost());
        $centralHost = strtolower(self::getCentralHost($request));

        return $currentHost === $centralHost;
    }

    /**
     * توليد رابط صفحة تسجيل الدخول المركزية الموحدة (app.localhost:8000/login)
     */
    public static function getCentralLoginUrl(?Request $request = null): string
    {
        $request = $request ?? (app()->bound('request') ? app('request') : null);
        $scheme = $request ? $request->getScheme() : (parse_url(config('app.url'), PHP_URL_SCHEME) ?: 'http');
        $port = $request ? $request->getPort() : parse_url(config('app.url'), PHP_URL_PORT);
        $portStr = ($port && $port != 80 && $port != 443) ? ':' . $port : '';

        $centralHost = self::getCentralHost($request);

        return "{$scheme}://{$centralHost}{$portStr}/login";
    }

    /**
     * توليد رابط صفحة تسجيل متجر جديد الموحدة على النطاق الأساسي (localhost:8000/register)
     */
    public static function getCentralRegisterUrl(?Request $request = null): string
    {
        $request = $request ?? (app()->bound('request') ? app('request') : null);
        $scheme = $request ? $request->getScheme() : (parse_url(config('app.url'), PHP_URL_SCHEME) ?: 'http');
        $port = $request ? $request->getPort() : parse_url(config('app.url'), PHP_URL_PORT);
        $portStr = ($port && $port != 80 && $port != 443) ? ':' . $port : '';

        $baseDomain = self::getCentralBaseDomain($request);

        return "{$scheme}://{$baseDomain}{$portStr}/register";
    }

    /**
     * Display the login view.
     */
    public function create(Request $request): Response|SymfonyResponse
    {
        // 1. إذا كان الطلب على نطاق مختلف عن النطاق المركزي (مثل alamana.localhost:8000/login أو localhost:8000/login)
        // يتم تحويل المستخدم فوراً وحصرياً إلى صفحة تسجيل الدخول المركزية app.localhost:8000/login
        if (!self::isCentralHost($request)) {
            $centralLoginUrl = self::getCentralLoginUrl($request);
            if ($request->header('X-Inertia')) {
                return Inertia::location($centralLoginUrl);
            }
            return redirect()->away($centralLoginUrl);
        }

        $registerUrl = self::getCentralRegisterUrl($request);

        $statusMessage = session('status');
        if ($request->has('shift_closed')) {
            $amount = $request->query('amount', '0.00');
            $cashier = $request->query('cashier');
            $statusMessage = $cashier 
                ? "تم تقفيل وردية الكاشير ({$cashier}) بنجاح، وتم تسجيل مبلغ الإغلاق ({$amount} ج.م) ومطابقة الخزينة."
                : "تم تقفيل الوردية بنجاح، وتم تسجيل مبلغ الإغلاق ({$amount} ج.م) ومطابقة الخزينة.";

            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return Inertia::render('Auth/Login', [
                'canResetPassword' => Route::has('password.request'),
                'status' => $statusMessage,
                'currentUser' => null,
                'registerUrl' => $registerUrl,
            ]);
        }

        // لو المستخدم طلب تسجيل الخروج أو التبديل بحساب آخر أو تم تحويله بعد الخروج
        if ($request->has('switch') || $request->has('logout') || $request->has('logged_out')) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            Cookie::queue(Cookie::forget('impersonate_token'));
            Cookie::queue(Cookie::forget('impersonated_tenant_id'));
            if (Auth::guard('web')->getRecallerName()) {
                Cookie::queue(Cookie::forget(Auth::guard('web')->getRecallerName()));
            }

            return Inertia::render('Auth/Login', [
                'canResetPassword' => Route::has('password.request'),
                'status' => $statusMessage,
                'currentUser' => null,
                'registerUrl' => $registerUrl,
            ]);
        }

        // إذا كان المستخدم مسجل دخوله بالفعل
        if (Auth::check()) {
            $user = Auth::user();

            // مستخدمو المتاجر (تاجر، كاشير، مندوب) لا يملكون لوحة تحكم على النطاق المركزي app.
            // إذا فتحوا صفحة تسجيل الدخول، نقوم بإنهاء أي جلسة مركزية معلقة فوراً لعرض نموذج الدخول
            if (!$user->isSuperAdmin()) {
                Auth::guard('web')->logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();

                return Inertia::render('Auth/Login', [
                    'canResetPassword' => Route::has('password.request'),
                    'status' => $statusMessage,
                    'currentUser' => null,
                    'registerUrl' => $registerUrl,
                ]);
            }

            // فقط السوبر أدمن يتم توجيهه للوحة تحكم السوبر أدمن
            return redirect()->to('/admin/dashboard');
        }

        return Inertia::render('Auth/Login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => $statusMessage,
            'currentUser' => null,
            'registerUrl' => $registerUrl,
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): SymfonyResponse
    {
        $request->authenticate();

        $request->session()->regenerate();

        $user = Auth::user();
        $targetUrl = $this->getDashboardUrl($user);

        // إذا كان المستخدم تاجر أو كاشير أو مندوب وتم توجيهه إلى نطاق فرعي لمتجره عبر SSO
        // نقوم بإنهاء الجلسة على النطاق المركزي app. حتى تكون نظيفة تماماً ولا تسبب أي تعارض عند تسجيل الخروج لاحقاً
        if (!$user->isSuperAdmin() && $user->tenant && str_contains($targetUrl, '/auth/sso-entry')) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
        }

        if ($request->header('X-Inertia') && str_starts_with($targetUrl, 'http')) {
            return Inertia::location($targetUrl);
        }

        return redirect()->to($targetUrl);
    }

    /**
     * تحديد رابط لوحة التحكم بدقة بحسب الدور والنطاق (مثل ordersaif.com)
     */
    public static function getDashboardUrl($user): string
    {
        $host     = request()->getHost();
        $scheme   = request()->getScheme();
        $port     = request()->getPort();
        $portStr  = ($port && $port != 80 && $port != 443) ? ':' . $port : '';

        // استخراج النطاق الأساسي بذكاء
        $baseDomain = self::getCentralBaseDomain();

        // 1. سوبر أدمن
        if ($user->isSuperAdmin()) {
            if ($host === "app.{$baseDomain}" || str_starts_with($host, 'app.')) {
                return '/admin/dashboard';
            }

            $ssoToken = \Illuminate\Support\Str::random(64);
            Cache::put('sso_token_' . $ssoToken, [
                'user_id' => $user->id,
                'target' => '/admin/dashboard',
            ], now()->addMinutes(2));

            return "{$scheme}://app.{$baseDomain}{$portStr}/auth/sso-entry?token={$ssoToken}";
        }

        // 2. مستخدم متجر (تاجر، كاشير، مندوب)
        if ($user->tenant) {
            $tenant = $user->tenant;
            $targetPath = '/admin/dashboard';
            if ($user->isCashier()) {
                $targetPath = '/pos';
            } elseif ($user->isSalesRep()) {
                $targetPath = '/van-sales';
            }

            // لو المستخدم بالفعل داخل النطاق الفرعي الصحيح لمتجره
            if ($host === "{$tenant->slug}.{$baseDomain}" || str_starts_with($host, "{$tenant->slug}.")) {
                return $targetPath;
            }

            // إذا كان المستخدم يسجل دخوله من نطاق مركزي مختلف عن نطاق متجره (مثلاً من app.localhost)
            // نولد توكن دخول آمن سريع (SSO Token) لنقل الجلسة إلى نطاق المتجر بسلاسة تامة
            $ssoToken = \Illuminate\Support\Str::random(64);
            Cache::put('sso_token_' . $ssoToken, [
                'user_id' => $user->id,
                'target' => $targetPath,
            ], now()->addMinutes(2));

            return "{$scheme}://{$tenant->slug}.{$baseDomain}{$portStr}/auth/sso-entry?token={$ssoToken}";
        }

        // 3. مستخدم بدون متجر
        return '/';
    }

    /**
     * نقطة استقبال توكن الدخول الموحد (SSO) بين النطاقات المختلفة
     */
    public function ssoEntry(Request $request): SymfonyResponse
    {
        $token = $request->query('token');
        $data = $token ? Cache::get('sso_token_' . $token) : null;

        if (!$data) {
            return redirect()->away(self::getCentralLoginUrl($request));
        }

        $user = \App\Models\User::find($data['user_id']);
        if (!$user) {
            Cache::forget('sso_token_' . $token);
            return redirect()->away(self::getCentralLoginUrl($request));
        }

        Auth::login($user, true);
        $request->session()->regenerate();

        // تنظيف التوكن بعد نجاح تسجيل الدخول
        Cache::forget('sso_token_' . $token);

        $targetPath = $data['target'] ?? '/admin/dashboard';
        return redirect()->to($targetPath);
    }

    /**
     * تسجيل الخروج وتنظيف الجلسة والتوجيه دائماً وحصرياً لصفحة تسجيل الدخول المركزية
     */
    public function destroy(Request $request): SymfonyResponse
    {
        // تنظيف كاش انتحال الهوية إن وُجد
        $token = $request->cookie('impersonate_token') ?? session('impersonate_token');
        if ($token) {
            Cache::forget('impersonate_token_' . $token);
        }

        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        // مسح الكوكيز المتعلقة بالانتحال والتذكر
        Cookie::queue(Cookie::forget('impersonate_token'));
        Cookie::queue(Cookie::forget('impersonated_tenant_id'));
        if (Auth::guard('web')->getRecallerName()) {
            Cookie::queue(Cookie::forget(Auth::guard('web')->getRecallerName()));
        }

        $centralLoginUrl = self::getCentralLoginUrl($request);

        if ($request->header('X-Inertia')) {
            return Inertia::location($centralLoginUrl);
        }

        return redirect()->away($centralLoginUrl);
    }
}
