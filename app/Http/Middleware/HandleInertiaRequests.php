<?php

namespace App\Http\Middleware;

use App\Models\Tenant;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $tenant = app()->bound(Tenant::class) ? app(Tenant::class) : null;

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user() ? [
                    'id' => $request->user()->id,
                    'name' => $request->user()->name,
                    'email' => $request->user()->email,
                    'role' => $request->user()->role,
                    'phone' => $request->user()->phone,
                    'is_super_admin' => $request->user()->isSuperAdmin(),
                    'is_admin' => $request->user()->isAdmin(),
                    'is_cashier' => $request->user()->isCashier(),
                    'is_sales_rep' => $request->user()->isSalesRep(),
                ] : null,
            ],
            'tenant' => $tenant ? [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'slug' => $tenant->slug,
                'logo' => $tenant->logo,
                'phone' => $tenant->phone,
                'settings' => $tenant->settings,
                'subscription_status' => $tenant->subscription_status,
                'subscription_ends_at' => $tenant->subscription_ends_at?->format('Y-m-d'),
                'is_subscription_expired' => $tenant->isSubscriptionExpired(),
            ] : null,
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'warning' => fn () => $request->session()->get('warning'),
            ],
            'appName' => config('app.name', 'Casher System'),
        ];
    }
}
