<?php

namespace App\Http\Controllers\Merchant;

use App\Http\Controllers\Controller;
use App\Models\CashierShift;
use App\Models\Expense;
use App\Models\Invoice;
use App\Models\Product;
use App\Models\Tenant;
use App\Models\VanTrip;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        $tenant = app(Tenant::class);
        $today = now()->toDateString();

        // مبيعات اليوم
        $todayInvoices = Invoice::where('tenant_id', $tenant->id)
            ->whereDate('created_at', $today)
            ->where('status', 'completed')
            ->get();

        $todaySalesTotal = $todayInvoices->sum('total_amount');
        $todayCostTotal = $todayInvoices->sum('cost_total');
        $todayGrossProfit = $todaySalesTotal - $todayCostTotal;

        // مصروفات اليوم
        $todayExpenses = Expense::where('tenant_id', $tenant->id)
            ->whereDate('expense_date', $today)
            ->sum('amount');

        // صافي ربح اليوم = مجمل الربح - المصروفات
        $todayNetProfit = $todayGrossProfit - $todayExpenses;

        // مبيعات الشهر الحالي
        $monthInvoices = Invoice::where('tenant_id', $tenant->id)
            ->whereMonth('created_at', now()->month)
            ->whereYear('created_at', now()->year)
            ->where('status', 'completed')
            ->get();

        $monthSalesTotal = $monthInvoices->sum('total_amount');
        $monthExpenses = Expense::where('tenant_id', $tenant->id)
            ->whereMonth('expense_date', now()->month)
            ->whereYear('expense_date', now()->year)
            ->sum('amount');
        $monthNetProfit = ($monthInvoices->sum('total_amount') - $monthInvoices->sum('cost_total')) - $monthExpenses;

        // تنبيهات النواقص والرصيد السالب (نتيجة البيع أوفلاين)
        $lowStockProducts = Product::where('tenant_id', $tenant->id)
            ->where('stock_quantity', '<=', 5)
            ->take(6)
            ->get();

        $negativeStockCount = Product::where('tenant_id', $tenant->id)
            ->where('stock_quantity', '<', 0)
            ->count();

        // الورديات والرحلات النشطة حالياً
        $activeShifts = CashierShift::where('tenant_id', $tenant->id)
            ->where('status', 'open')
            ->with('cashier')
            ->get();

        $activeVanTrips = VanTrip::where('tenant_id', $tenant->id)
            ->where('status', 'open')
            ->with(['salesRep', 'warehouse'])
            ->get();

        // أحدث الفواتير
        $recentInvoices = Invoice::where('tenant_id', $tenant->id)
            ->with(['cashier', 'salesRep'])
            ->latest()
            ->take(6)
            ->get();

        return Inertia::render('Merchant/Dashboard', [
            'stats' => [
                'today_sales' => $todaySalesTotal,
                'today_net_profit' => $todayNetProfit,
                'today_expenses' => $todayExpenses,
                'today_invoices_count' => $todayInvoices->count(),
                'month_sales' => $monthSalesTotal,
                'month_net_profit' => $monthNetProfit,
                'negative_stock_count' => $negativeStockCount,
            ],
            'low_stock_products' => $lowStockProducts,
            'active_shifts' => $activeShifts,
            'active_van_trips' => $activeVanTrips,
            'recent_invoices' => $recentInvoices,
        ]);
    }
}
