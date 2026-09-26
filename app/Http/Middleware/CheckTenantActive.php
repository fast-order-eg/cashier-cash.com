<?php

namespace App\Http\Middleware;

use Closure;
use App\Models\Tenant;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckTenantActive
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $tenant = app()->bound(Tenant::class) ? app(Tenant::class) : null;

        if ($tenant) {
            if (!$tenant->is_active) {
                abort(403, 'تم إيقاف حساب المتجر مؤقتاً.');
            }

            // If subscription is expired and trial is expired
            if ($tenant->isSubscriptionExpired()) {
                // Allow access to subscription renewal page, block others if needed
                if (!$request->is('admin/subscription*') && !$request->is('logout') && !session()->has('impersonated_tenant_id')) {
                    return redirect()->route('merchant.subscription.renew')->with('warning', 'انتهت فترة اشتراكك، يرجى التجديد للاستمرار');
                }
            }
        }

        return $next($request);
    }
}
