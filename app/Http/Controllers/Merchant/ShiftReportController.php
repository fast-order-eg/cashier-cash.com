<?php

namespace App\Http\Controllers\Merchant;

use App\Http\Controllers\Controller;
use App\Models\CashierShift;
use App\Models\Tenant;
use App\Models\VanTrip;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ShiftReportController extends Controller
{
    public function shiftsIndex(Request $request): Response
    {
        $tenant = app(Tenant::class);

        $query = CashierShift::where('tenant_id', $tenant->id)
            ->with('cashier')
            ->latest('opened_at');

        if ($request->filled('cashier_id')) {
            $query->where('user_id', $request->cashier_id);
        }

        $shifts = $query->paginate(20)->withQueryString();

        return Inertia::render('Merchant/Shifts/Index', [
            'shifts' => $shifts,
        ]);
    }

    public function vanTripsIndex(Request $request): Response
    {
        $tenant = app(Tenant::class);

        $query = VanTrip::where('tenant_id', $tenant->id)
            ->with(['salesRep', 'warehouse'])
            ->latest('start_time');

        if ($request->filled('rep_id')) {
            $query->where('sales_rep_id', $request->rep_id);
        }

        $trips = $query->paginate(20)->withQueryString();

        return Inertia::render('Merchant/VanTrips/Index', [
            'trips' => $trips,
        ]);
    }
}
