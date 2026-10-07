<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SuperAdminMiddleware
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (!auth()->check()) {
            return redirect()->guest(\App\Http\Controllers\Auth\AuthenticatedSessionController::getCentralLoginUrl($request));
        }

        if (!auth()->user()->isSuperAdmin()) {
            $user = auth()->user();
            if ($user->tenant) {
                $tenant = $user->tenant;
                $baseDomain = \App\Http\Controllers\Auth\AuthenticatedSessionController::getCentralBaseDomain($request);
                $scheme = $request->getScheme();
                $port = $request->getPort();
                $portStr = ($port && $port != 80 && $port != 443) ? ':' . $port : '';
                $targetPath = $user->isCashier() ? '/pos' : ($user->isSalesRep() ? '/van-sales' : '/admin/dashboard');

                $targetUrl = "{$scheme}://{$tenant->slug}.{$baseDomain}{$portStr}{$targetPath}";
                if ($request->header('X-Inertia')) {
                    return \Inertia\Inertia::location($targetUrl);
                }
                return redirect()->away($targetUrl);
            }

            abort(403, 'غير مصرح لك بالدخول إلى لوحة السوبر أدمن');
        }

        return $next($request);
    }
}
