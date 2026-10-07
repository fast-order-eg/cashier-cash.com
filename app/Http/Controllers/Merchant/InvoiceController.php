<?php

namespace App\Http\Controllers\Merchant;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Tenant;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class InvoiceController extends Controller
{
    public function index(Request $request): Response
    {
        $tenant = app(Tenant::class);

        $query = Invoice::where('tenant_id', $tenant->id)
            ->with(['cashier', 'salesRep', 'items'])
            ->orderByDesc('created_at')
            ->orderByDesc('id');

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('invoice_number', 'like', "%{$s}%")
                  ->orWhere('customer_name', 'like', "%{$s}%")
                  ->orWhere('customer_phone', 'like', "%{$s}%");
            });
        }

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->filled('from_date')) {
            $query->whereDate('created_at', '>=', $request->from_date);
        }

        if ($request->filled('to_date')) {
            $query->whereDate('created_at', '<=', $request->to_date);
        }

        $selectedShift = null;
        if ($request->filled('shift_id')) {
            $selectedShift = \App\Models\CashierShift::with('cashier')
                ->where('tenant_id', $tenant->id)
                ->find($request->shift_id);

            if ($selectedShift) {
                $query->where(function ($q) use ($selectedShift) {
                    $q->where('shift_id', $selectedShift->id);
                    if ($selectedShift->closed_at) {
                        $q->orWhere(function ($sub) use ($selectedShift) {
                            $sub->whereNull('shift_id')
                                ->where('cashier_id', $selectedShift->user_id)
                                ->whereBetween('created_at', [$selectedShift->opened_at, $selectedShift->closed_at]);
                        });
                    } else {
                        $q->orWhere(function ($sub) use ($selectedShift) {
                            $sub->whereNull('shift_id')
                                ->where('cashier_id', $selectedShift->user_id)
                                ->where('created_at', '>=', $selectedShift->opened_at);
                        });
                    }
                });
            } else {
                $query->where('shift_id', $request->shift_id);
            }
        }

        if ($request->filled('cashier_id')) {
            $query->where('cashier_id', $request->cashier_id);
        }

        $totalSales = (clone $query)->sum('total_amount');
        $invoices = $query->paginate(20)->withQueryString();

        return Inertia::render('Merchant/Invoices/Index', [
            'invoices' => $invoices,
            'total_sales' => $totalSales,
            'selectedShift' => $selectedShift,
            'filters' => $request->only(['search', 'type', 'from_date', 'to_date', 'shift_id', 'cashier_id']),
        ]);
    }

    public function show(Invoice $invoice): Response
    {
        $tenant = app(Tenant::class);
        if ($invoice->tenant_id !== $tenant->id) abort(403);

        $invoice->load(['cashier', 'salesRep', 'items.product', 'warehouse']);

        return Inertia::render('Merchant/Invoices/Show', [
            'invoice' => $invoice,
            'storeSettings' => $tenant->settings,
        ]);
    }
}
