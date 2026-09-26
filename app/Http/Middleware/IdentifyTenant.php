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
        $host = $request->getHost();
        $appUrl = config('app.url');
        $baseHost = parse_url($appUrl, PHP_URL_HOST);

        $subdomain = null;
        if (!filter_var($host, FILTER_VALIDATE_IP) && $host !== 'localhost') {
            $parts = explode('.', $host);
            if (str_ends_with($host, '.localhost')) {
                if (count($parts) >= 3) {
                    $subdomain = $parts[0];
                } elseif (count($parts) === 2 && in_array(strtolower($parts[0]), ['app', 'admin', 'www'])) {
                    $subdomain = $parts[0];
                }
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

        // 4. Main domain fallbacks (for app.domain.com dashboard access)
        if (!$tenant) {
            // A. If logged in merchant user, resolve directly from user's tenant
            if (auth()->check() && !auth()->user()->isSuperAdmin()) {
                $user = auth()->user();
                $tenant = $user->tenant;
            }

            // B. If super admin impersonating
            if (!$tenant && session()->has('impersonated_tenant_id')) {
                $tenant = Tenant::find(session('impersonated_tenant_id'));
            }

            // C. Session fallback
            if (!$tenant && session()->has('tenant_id')) {
                $tenant = Tenant::find(session('tenant_id'));
            }
        }

        // 5. Check if tenant is suspended/inactive
        if ($tenant && !$tenant->is_active && !auth()->check() && !session()->has('impersonated_tenant_id')) {
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
        }

        return $next($request);
    }
}
