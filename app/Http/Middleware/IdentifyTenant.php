<?php

namespace App\Http\Middleware;

use Closure;
use App\Models\Tenant;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class IdentifyTenant
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // إذا كان الطلب موجهاً لصفحة تسجيل الدخول وليس على النطاق المركزي app.
        // يتم تحويله فوراً إلى صفحة تسجيل الدخول المركزية الموحدة
        if ($request->is('login')) {
            if (!\App\Http\Controllers\Auth\AuthenticatedSessionController::isCentralHost($request)) {
                $centralLoginUrl = \App\Http\Controllers\Auth\AuthenticatedSessionController::getCentralLoginUrl($request);
                if ($request->header('X-Inertia')) {
                    return \Inertia\Inertia::location($centralLoginUrl);
                }
                return redirect()->away($centralLoginUrl);
            }
        }

        $host = $request->getHost();
        $appUrl = config('app.url');
        $baseHost = parse_url($appUrl, PHP_URL_HOST);

        $subdomain = null;
        if (!filter_var($host, FILTER_VALIDATE_IP) && $host !== 'localhost') {
            $parts = explode('.', $host);
            if (str_ends_with($host, '.localhost')) {
                $subdomain = $parts[0];
            } elseif ($baseHost && str_ends_with($host, '.' . $baseHost)) {
                $subdomain = substr($host, 0, -strlen('.' . $baseHost));
            } elseif (count($parts) > 2) {
                $subdomain = $parts[0];
            }
        }

        $isSubdomainRequest = $subdomain && !in_array(strtolower($subdomain), ['www', 'app', 'admin']);
        $isCustomDomainRequest = !$isSubdomainRequest && $baseHost && $host !== $baseHost && !str_ends_with($host, '.localhost') && !in_array(strtolower($host), ['localhost', '127.0.0.1']);

        // 1. Try to match by custom domain first
        $tenant = Tenant::where('custom_domain', $host)->first();

        if (!$tenant && $isSubdomainRequest) {
            // 2. Try to match by subdomain
            $tenant = Tenant::where('slug', $subdomain)->first();
        }

        // 3. If this is a store subdomain or custom domain request but the tenant is deleted or not found
        if (!$tenant && ($isSubdomainRequest || $isCustomDomainRequest)) {
            abort(404, 'المتجر غير موجود أو تم إغلاقه');
        }

        // 4. Fallbacks (Impersonation, logged in merchant user, session)
        if (!$tenant) {
            // A. If super admin impersonating via attribute or session
            $impersonatedId = $request->attributes->get('impersonated_tenant_id') ?? session('impersonated_tenant_id');
            if ($impersonatedId) {
                $tenant = Tenant::find($impersonatedId);
            }

            // B. If logged in merchant user, resolve directly from user's tenant
            if (!$tenant && auth()->check() && !auth()->user()->isSuperAdmin()) {
                $user = auth()->user();
                $tenant = $user->tenant;
            }

            // C. Session fallback
            if (!$tenant && session()->has('tenant_id')) {
                $tenant = Tenant::find(session('tenant_id'));
            }

            // D. Fallback for logged in merchant user
            if (!$tenant && auth()->check() && !auth()->user()->isSuperAdmin()) {
                $user = auth()->user();
                $tenant = $user->tenant;
            }
        }

        // 5. Check if tenant is suspended/inactive (allow super admin impersonation)
        $isImpersonating = $request->attributes->get('is_impersonating') || session()->has('impersonated_by_admin');
        if ($tenant && !$tenant->is_active && !auth()->check() && !$isImpersonating) {
            abort(403, 'حساب المتجر معطل حالياً، يرجى مراجعة إدارة المنصة');
        }

        if ($tenant) {
            // Bind tenant to service container
            app()->instance(Tenant::class, $tenant);
            config(['app.tenant' => $tenant]);
            config(['tenant.id' => $tenant->id]);
            config(['tenant.current' => $tenant]);
            session(['tenant_id' => $tenant->id]);
            $request->attributes->set('tenant', $tenant);
            \Illuminate\Support\Facades\URL::defaults(['tenant' => $tenant->slug]);
        }

        // إزالة بارامتر tenant من مسار الطلب لمنع تمريره كمعامل نصي في دوال الكنترولر المعتمدة على Route Model Binding
        if ($request->route() && $request->route()->hasParameter('tenant')) {
            $request->route()->forgetParameter('tenant');
        }

        // إذا كان المستخدم مسجل دخوله وهو تابع لمتجر، ولكنه يتصفح من رابط عام أو ساب دومين مختلف (مثل app.localhost)
        if ($tenant && auth()->check() && !auth()->user()->isSuperAdmin() && !$isImpersonating && !$request->is('logout')) {
            // 1. إذا كان المستخدم بالفعل على النطاق الخاص بمتجره، لا داعي لأي تحويل نهائياً
            if (str_starts_with($host, "{$tenant->slug}.")) {
                return $next($request);
            }

            // 2. إذا كان يتصفح من localhost أو 127.0.0.1 وكان المسار خاصاً بالمتجر (مثل admin أو pos أو van-sales)
            if ($host === 'localhost' || $host === '127.0.0.1') {
                if ($request->is('admin*') || $request->is('pos*') || $request->is('van-sales*')) {
                    $scheme = $request->getScheme();
                    $port = $request->getPort();
                    $portStr = ($port && $port != 80 && $port != 443) ? ':' . $port : '';
                    $targetUrl = "{$scheme}://{$tenant->slug}.localhost{$portStr}" . $request->getRequestUri();
                    if ($request->header('X-Inertia')) {
                        return \Inertia\Inertia::location($targetUrl);
                    }
                    return redirect()->away($targetUrl);
                }
                return $next($request);
            }

            // 3. استخراج النطاق الأساسي بدقة
            if (str_ends_with($host, '.localhost')) {
                $parts = explode('.', $host);
                if (count($parts) === 2) {
                    $baseDomain = 'localhost';
                } elseif (count($parts) >= 3) {
                    array_shift($parts);
                    $baseDomain = implode('.', $parts);
                } else {
                    $baseDomain = 'localhost';
                }
            } else {
                $cleanHost = str_starts_with($host, 'app.') ? substr($host, 4) : $host;
                $parts = explode('.', $cleanHost);
                if (count($parts) >= 3) {
                    array_shift($parts);
                    $baseDomain = implode('.', $parts);
                } else {
                    $baseDomain = $cleanHost;
                }
            }

            $expectedHost = "{$tenant->slug}.{$baseDomain}";
            if ($host !== $expectedHost) {
                $scheme = $request->getScheme();
                $port = $request->getPort();
                $portStr = ($port && $port != 80 && $port != 443) ? ':' . $port : '';
                $targetUrl = "{$scheme}://{$expectedHost}{$portStr}" . $request->getRequestUri();

                if ($request->header('X-Inertia')) {
                    return \Inertia\Inertia::location($targetUrl);
                }
                return redirect()->to($targetUrl);
            }
        }

        return $next($request);
    }
}
