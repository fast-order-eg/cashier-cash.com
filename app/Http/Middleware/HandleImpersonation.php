<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

class HandleImpersonation
{
    /**
     * Authenticate via a subdomain-specific or cookie-based impersonation token
     * WITHOUT touching the shared session — so the super admin
     * tab stays fully logged in as Super Admin.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // تخطي الانتحال تماماً عند تسجيل الخروج أو شاشة تسجيل الدخول
        if ($request->is('logout') || $request->is('login') || $request->has('logout') || $request->has('logged_out')) {
            return $next($request);
        }

        $token = $request->cookie('impersonate_token') ?? session('impersonate_token');

        if ($token) {
            $data = Cache::get('impersonate_token_' . $token);

            if ($data && !empty($data['user_id'])) {
                // onceUsingId authenticates for this request ONLY without overriding the original session
                Auth::onceUsingId($data['user_id']);

                // Store impersonation metadata in request attributes
                $request->attributes->set('is_impersonating', true);
                $request->attributes->set('impersonated_tenant_id', $data['tenant_id'] ?? null);
                $request->attributes->set('impersonated_target', $data['target_role'] ?? 'admin');
                $request->attributes->set('impersonated_user_name', $data['user_name'] ?? '');
                $request->attributes->set('impersonated_user_role', $data['user_role'] ?? '');
                $request->attributes->set('impersonated_super_admin_id', $data['super_admin_id'] ?? null);

                // Also make sure session has fallback for blade/inertia helpers
                if (!session()->has('impersonated_tenant_id')) {
                    session([
                        'impersonated_tenant_id' => $data['tenant_id'] ?? null,
                        'impersonated_by_admin' => $data['super_admin_id'] ?? null,
                        'impersonated_target' => $data['target_role'] ?? 'admin',
                        'impersonated_user_name' => $data['user_name'] ?? '',
                        'impersonated_user_role' => $data['user_role'] ?? '',
                    ]);
                }
            }
        }

        return $next($request);
    }
}
