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

            // Check if subscription or trial has expired
            if ($tenant->isSubscriptionExpired()) {
                // If super admin is impersonating, allow access
                if (session()->has('impersonated_tenant_id') || session()->has('impersonated_by_admin')) {
                    return $next($request);
                }

                // Always allow subscription renewal/payment pages and logout
                if ($request->is('admin/subscriptions*') || $request->is('*/subscriptions*') || $request->is('logout')) {
                    return $next($request);
                }

                // Block all mutations (POST, PUT, PATCH, DELETE) when expired
                if ($request->isMethod('POST') || $request->isMethod('PUT') || $request->isMethod('PATCH') || $request->isMethod('DELETE')) {
                    if ($request->expectsJson() || $request->isXmlHttpRequest() || $request->is('pos/*') || $request->is('van-sales/*')) {
                        return response()->json([
                            'success' => false,
                            'error' => 'subscription_expired',
                            'message' => 'انتهت فترة اشتراك المتجر (أو التجربة المجانية). يرجى تجديد الاشتراك للاستمرار وتفعيل كافة العمليات.',
                            'redirect_url' => '/admin/subscriptions',
                        ], 403);
                    }

                    return redirect()->to('/admin/subscriptions')->with('warning', 'انتهت فترة اشتراك المتجر (أو التجربة المجانية). يرجى تجديد الاشتراك للاستمرار وتفعيل كافة العمليات.');
                }

                // Block direct navigation to creation or edition form pages
                if ($request->is('*/create*') || $request->is('*/*/edit*') || $request->is('admin/*/create*')) {
                    return redirect()->to('/admin/subscriptions')->with('warning', 'انتهت فترة اشتراك المتجر. يرجى تجديد الاشتراك للاستمرار وتفعيل إضافة وتعديل البيانات.');
                }

                // Allow GET viewing requests for pages (Dashboard, Products list, Invoices, POS, Van-sales, Reports)
                // These pages will display the sticky red expiration banner at the top and intercept client actions.
            }
        }

        return $next($request);
    }
}
