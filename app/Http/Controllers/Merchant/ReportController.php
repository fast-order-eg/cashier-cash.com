<?php

namespace App\Http\Controllers\Merchant;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Product;
use App\Models\Tenant;
use App\Models\User;
use App\Models\VanTrip;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    public function index(Request $request): Response
    {
        $tenant = app(Tenant::class);

        $fromDate = $request->input('from_date', now()->startOfMonth()->toDateString());
        $toDate = $request->input('to_date', now()->toDateString());

        // الفواتير في الفترة المحددة
        $invoicesQuery = Invoice::where('tenant_id', $tenant->id)
            ->whereDate('created_at', '>=', $fromDate)
            ->whereDate('created_at', '<=', $toDate)
            ->where('status', 'completed');

        $totalSales = (clone $invoicesQuery)->sum('total_amount');
        $totalCost = (clone $invoicesQuery)->sum('cost_total');
        $grossProfit = $totalSales - $totalCost;

        // المصروفات في الفترة المحددة
        $expensesQuery = Expense::where('tenant_id', $tenant->id)
            ->whereDate('expense_date', '>=', $fromDate)
            ->whereDate('expense_date', '<=', $toDate);

        $totalExpenses = $expensesQuery->sum('amount');
        $netProfit = $grossProfit - $totalExpenses;

        // مبيعات الكاش مقابل الفيزا
        $cashSales = (clone $invoicesQuery)->where('payment_method', 'cash')->sum('total_amount');
        $cardSales = (clone $invoicesQuery)->where('payment_method', 'card')->sum('total_amount');

        // مبيعات القطاعي (كاشير) مقابل الجملة (مناديب)
        $retailSales = (clone $invoicesQuery)->where('type', 'retail')->sum('total_amount');
        $wholesaleSales = (clone $invoicesQuery)->where('type', 'wholesale')->sum('total_amount');

        // الأصناف الأكثر مبيعاً
        $topProducts = InvoiceItem::whereHas('invoice', function ($q) use ($tenant, $fromDate, $toDate) {
            $q->where('tenant_id', $tenant->id)
              ->whereDate('created_at', '>=', $fromDate)
              ->whereDate('created_at', '<=', $toDate)
              ->where('status', 'completed');
        })
        ->select('product_name', DB::raw('SUM(quantity) as total_qty'), DB::raw('SUM(total_price) as total_revenue'))
        ->groupBy('product_name')
        ->orderByDesc('total_revenue')
        ->take(10)
        ->get();

        // إجمالي المسافات المقطوعة لسيارات التوزيع في الفترة
        $totalKmDriven = VanTrip::where('tenant_id', $tenant->id)
            ->whereDate('start_time', '>=', $fromDate)
            ->whereDate('start_time', '<=', $toDate)
            ->sum('total_distance');

        return Inertia::render('Merchant/Reports/Index', [
            'summary' => [
                'total_sales' => $totalSales,
                'total_cost' => $totalCost,
                'gross_profit' => $grossProfit,
                'total_expenses' => $totalExpenses,
                'net_profit' => $netProfit,
                'cash_sales' => $cashSales,
                'card_sales' => $cardSales,
                'retail_sales' => $retailSales,
                'wholesale_sales' => $wholesaleSales,
                'total_km_driven' => $totalKmDriven,
            ],
            'top_products' => $topProducts,
            'filters' => [
                'from_date' => $fromDate,
                'to_date' => $toDate,
            ],
        ]);
    }

    /**
     * تصدير التقرير كملف Excel (CSV متوافق مع الحروف العربية)
     */
    public function exportExcel(Request $request): StreamedResponse
    {
        $tenant = app(Tenant::class);
        $fromDate = $request->input('from_date', now()->startOfMonth()->toDateString());
        $toDate = $request->input('to_date', now()->toDateString());

        $invoices = Invoice::where('tenant_id', $tenant->id)
            ->whereDate('created_at', '>=', $fromDate)
            ->whereDate('created_at', '<=', $toDate)
            ->with(['cashier', 'salesRep'])
            ->get();

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"sales_report_{$fromDate}_{$toDate}.csv\"",
        ];

        return response()->stream(function () use ($invoices) {
            $handle = fopen('php://output', 'w');
            // Write UTF-8 BOM for Microsoft Excel Arabic support
            fputs($handle, "\xEF\xBB\xBF");

            fputcsv($handle, ['رقم الفاتورة', 'النوع', 'المسؤول', 'العميل', 'المبلغ', 'طريقة الدفع', 'التكلفة', 'الربح', 'التاريخ']);

            foreach ($invoices as $inv) {
                $profit = $inv->total_amount - $inv->cost_total;
                $handlerName = $inv->cashier?->name ?? $inv->salesRep?->name ?? 'المدير';
                fputcsv($handle, [
                    $inv->invoice_number,
                    $inv->type === 'retail' ? 'كاشير قطاعي' : 'مندوب جملة',
                    $handlerName,
                    $inv->customer_name ?? 'زبون المحل',
                    $inv->total_amount,
                    $inv->payment_method === 'cash' ? 'نقدي' : 'فيزا',
                    $inv->cost_total,
                    $profit,
                    $inv->created_at->format('Y-m-d H:i'),
                ]);
            }

            fclose($handle);
        }, 200, $headers);
    }

    /**
     * تصدير التقرير كملف للطباعة / PDF
     */
    public function exportPdf(Request $request)
    {
        $tenant = app(Tenant::class);
        $fromDate = $request->input('from_date', now()->startOfMonth()->toDateString());
        $toDate = $request->input('to_date', now()->toDateString());

        $invoices = Invoice::where('tenant_id', $tenant->id)
            ->whereDate('created_at', '>=', $fromDate)
            ->whereDate('created_at', '<=', $toDate)
            ->where('status', 'completed')
            ->with(['cashier', 'salesRep', 'items'])
            ->get();

        $totalSales = $invoices->sum('total_amount');
        $totalCost = $invoices->sum('cost_total');
        $grossProfit = $totalSales - $totalCost;

        $totalExpenses = Expense::where('tenant_id', $tenant->id)
            ->whereDate('expense_date', '>=', $fromDate)
            ->whereDate('expense_date', '<=', $toDate)
            ->sum('amount');

        $netProfit = $grossProfit - $totalExpenses;

        return response()->view('reports.pdf', [
            'tenant' => $tenant,
            'fromDate' => $fromDate,
            'toDate' => $toDate,
            'invoices' => $invoices,
            'totalSales' => $totalSales,
            'totalCost' => $totalCost,
            'grossProfit' => $grossProfit,
            'totalExpenses' => $totalExpenses,
            'netProfit' => $netProfit,
        ]);
    }
}
