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
use Illuminate\Http\RedirectResponse;
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
        $includeTest = $request->boolean('include_test', false);

        // الفواتير في الفترة المحددة (استبعاد بيانات QA افتراضياً)
        $invoicesQuery = Invoice::where('tenant_id', $tenant->id)
            ->whereDate('created_at', '>=', $fromDate)
            ->whereDate('created_at', '<=', $toDate)
            ->where('status', 'completed');

        if (!$includeTest) {
            $invoicesQuery->where('is_test', false);
        }

        $totalSales = (clone $invoicesQuery)->sum('total_amount');
        $totalCost = (clone $invoicesQuery)->sum('cost_total');
        $grossProfit = $totalSales - $totalCost;

        // المصروفات في الفترة المحددة (استبعاد بيانات QA افتراضياً)
        $expensesQuery = Expense::where('tenant_id', $tenant->id)
            ->whereDate('expense_date', '>=', $fromDate)
            ->whereDate('expense_date', '<=', $toDate);

        if (!$includeTest) {
            $expensesQuery->where('is_test', false);
        }

        $totalExpenses = $expensesQuery->sum('amount');
        $netProfit = $grossProfit - $totalExpenses;

        // مبيعات الكاش مقابل الفيزا
        $cashSales = (clone $invoicesQuery)->where('payment_method', 'cash')->sum('total_amount');
        $cardSales = (clone $invoicesQuery)->where('payment_method', 'card')->sum('total_amount');

        // مبيعات القطاعي (كاشير) مقابل الجملة (مناديب)
        $retailSales = (clone $invoicesQuery)->where('type', 'retail')->sum('total_amount');
        $wholesaleSales = (clone $invoicesQuery)->where('type', 'wholesale')->sum('total_amount');

        // الأصناف الأكثر مبيعاً
        $topProducts = InvoiceItem::whereHas('invoice', function ($q) use ($tenant, $fromDate, $toDate, $includeTest) {
            $q->where('tenant_id', $tenant->id)
              ->whereDate('created_at', '>=', $fromDate)
              ->whereDate('created_at', '<=', $toDate)
              ->where('status', 'completed');
            if (!$includeTest) {
                $q->where('is_test', false);
            }
        })
        ->select('product_name', DB::raw('SUM(quantity) as total_qty'), DB::raw('SUM(total_price) as total_revenue'))
        ->groupBy('product_name')
        ->orderByDesc('total_revenue')
        ->take(10)
        ->get();

        // إجمالي المسافات المقطوعة لسيارات التوزيع في الفترة
        $vanTripsQuery = VanTrip::where('tenant_id', $tenant->id)
            ->whereDate('start_time', '>=', $fromDate)
            ->whereDate('start_time', '<=', $toDate);

        if (!$includeTest) {
            $vanTripsQuery->where('is_test', false);
        }

        $totalKmDriven = $vanTripsQuery->sum('total_distance');

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
                'include_test' => $includeTest,
            ],
        ]);
    }

    /**
     * شاشة مراجعة بيانات الاختبار المقترحة وعزلها عن التقارير التشغيلية
     */
    public function qaReviewIndex(Request $request): Response
    {
        $tenant = app(Tenant::class);

        $type = $request->input('type', 'all'); // all, invoices, expenses, van_trips
        $statusFilter = $request->input('status', 'all'); // all, excluded (is_test=1), active (is_test=0)
        $search = $request->input('search');

        $records = collect();

        // 1. فواتير مقترحة للمراجعة (سواء موسومة أو بها كلمات تدل على تجربة)
        if (in_array($type, ['all', 'invoices'])) {
            $invQuery = Invoice::where('tenant_id', $tenant->id)
                ->with(['cashier', 'salesRep'])
                ->latest();

            if ($search) {
                $invQuery->where(function ($q) use ($search) {
                    $q->where('invoice_number', 'like', "%{$search}%")
                      ->orWhere('customer_name', 'like', "%{$search}%")
                      ->orWhere('notes', 'like', "%{$search}%");
                });
            } else {
                $invQuery->where(function ($q) {
                    $q->where('is_test', true)
                      ->orWhere('customer_name', 'like', '%test%')
                      ->orWhere('customer_name', 'like', '%تجرب%')
                      ->orWhere('customer_name', 'like', '%qa%')
                      ->orWhere('notes', 'like', '%test%')
                      ->orWhere('notes', 'like', '%تجرب%')
                      ->orWhere('notes', 'like', '%qa%');
                });
            }

            if ($statusFilter === 'excluded') {
                $invQuery->where('is_test', true);
            } elseif ($statusFilter === 'active') {
                $invQuery->where('is_test', false);
            }

            foreach ($invQuery->take(50)->get() as $inv) {
                $records->push([
                    'id' => $inv->id,
                    'type' => 'invoice',
                    'type_label' => 'فاتورة مبيعات',
                    'reference' => $inv->invoice_number,
                    'title' => ($inv->customer_name ?: 'عميل نقدي') . ' (' . ($inv->type === 'wholesale' ? 'جملة' : 'قطاعي') . ')',
                    'date' => $inv->created_at->format('Y-m-d H:i'),
                    'amount' => (float) $inv->total_amount,
                    'financial_impact' => '+' . number_format($inv->total_amount, 2) . ' ج.م (إيراد مبيعات)',
                    'is_test' => (bool) $inv->is_test,
                    'notes' => $inv->notes,
                ]);
            }
        }

        // 2. مصروفات مقترحة للمراجعة
        if (in_array($type, ['all', 'expenses'])) {
            $expQuery = Expense::where('tenant_id', $tenant->id)
                ->with(['category', 'user'])
                ->latest('expense_date');

            if ($search) {
                $expQuery->where(function ($q) use ($search) {
                    $q->where('title', 'like', "%{$search}%")
                      ->orWhere('notes', 'like', "%{$search}%");
                });
            } else {
                $expQuery->where(function ($q) {
                    $q->where('is_test', true)
                      ->orWhere('title', 'like', '%test%')
                      ->orWhere('title', 'like', '%تجرب%')
                      ->orWhere('title', 'like', '%qa%')
                      ->orWhere('notes', 'like', '%test%')
                      ->orWhere('notes', 'like', '%تجرب%');
                });
            }

            if ($statusFilter === 'excluded') {
                $expQuery->where('is_test', true);
            } elseif ($statusFilter === 'active') {
                $expQuery->where('is_test', false);
            }

            foreach ($expQuery->take(50)->get() as $exp) {
                $records->push([
                    'id' => $exp->id,
                    'type' => 'expense',
                    'type_label' => 'مصروف',
                    'reference' => '#' . $exp->id,
                    'title' => $exp->title . ' (' . ($exp->category?->name ?: 'عام') . ')',
                    'date' => $exp->expense_date->format('Y-m-d'),
                    'amount' => (float) $exp->amount,
                    'financial_impact' => '-' . number_format($exp->amount, 2) . ' ج.م (مصروفات)',
                    'is_test' => (bool) $exp->is_test,
                    'notes' => $exp->notes,
                ]);
            }
        }

        // 3. رحلات سيارات مقترحة للمراجعة
        if (in_array($type, ['all', 'van_trips'])) {
            $tripQuery = VanTrip::where('tenant_id', $tenant->id)
                ->with(['salesRep', 'warehouse'])
                ->latest('start_time');

            if ($search) {
                $tripQuery->where('notes', 'like', "%{$search}%");
            } else {
                $tripQuery->where(function ($q) {
                    $q->where('is_test', true)
                      ->orWhere('notes', 'like', '%test%')
                      ->orWhere('notes', 'like', '%تجرب%')
                      ->orWhere('notes', 'like', '%qa%');
                });
            }

            if ($statusFilter === 'excluded') {
                $tripQuery->where('is_test', true);
            } elseif ($statusFilter === 'active') {
                $tripQuery->where('is_test', false);
            }

            foreach ($tripQuery->take(50)->get() as $trip) {
                $records->push([
                    'id' => $trip->id,
                    'type' => 'van_trip',
                    'type_label' => 'رحلة مندوب',
                    'reference' => 'رحلة #' . $trip->id,
                    'title' => 'رحلة ' . ($trip->salesRep?->name ?: 'مندوب') . ' (' . ($trip->warehouse?->name ?: 'سيارة') . ')',
                    'date' => $trip->start_time->format('Y-m-d H:i'),
                    'amount' => (float) $trip->total_sales,
                    'financial_impact' => 'مبيعات رحلة: ' . number_format($trip->total_sales, 2) . ' ج.م',
                    'is_test' => (bool) $trip->is_test,
                    'notes' => $trip->notes,
                ]);
            }
        }

        // إجمالي الأثر المالي المعزول حالياً (احتساب الفواتير والرحلات دون تكرار الإيراد)
        $excludedTripsSales = (float) VanTrip::where('tenant_id', $tenant->id)
            ->where('is_test', true)
            ->sum('total_sales');

        // فواتير مبيعات معزولة مستقلة (لا ترتبط برحلات توزيع معزولة تجنباً للازدواجية)
        $excludedInvoicesSales = (float) Invoice::where('tenant_id', $tenant->id)
            ->where('is_test', true)
            ->where(function ($q) use ($tenant) {
                $q->whereNull('van_trip_id')
                  ->orWhereNotIn('van_trip_id', VanTrip::where('tenant_id', $tenant->id)->where('is_test', true)->select('id'));
            })
            ->sum('total_amount');

        $totalExcludedSales = $excludedTripsSales + $excludedInvoicesSales;
        $excludedExpenses = (float) Expense::where('tenant_id', $tenant->id)->where('is_test', true)->sum('amount');
        
        $totalExcludedCount = Invoice::where('tenant_id', $tenant->id)->where('is_test', true)->count()
            + Expense::where('tenant_id', $tenant->id)->where('is_test', true)->count()
            + VanTrip::where('tenant_id', $tenant->id)->where('is_test', true)->count();

        return Inertia::render('Merchant/Reports/QaReview', [
            'records' => $records->values(),
            'stats' => [
                'total_excluded_count' => $totalExcludedCount,
                'excluded_sales' => $totalExcludedSales,
                'excluded_invoices_sales' => $excludedInvoicesSales,
                'excluded_trips_sales' => $excludedTripsSales,
                'excluded_expenses' => $excludedExpenses,
            ],
            'filters' => [
                'type' => $type,
                'status' => $statusFilter,
                'search' => $search,
            ],
        ]);
    }

    /**
     * تبديل حالة وسم السجل كبيانات اختبار (عزل من التقارير التشغيلية أو إرجاعها) دون حذف
     */
    public function toggleQaStatus(Request $request): RedirectResponse
    {
        $tenant = app(Tenant::class);

        $validated = $request->validate([
            'type' => 'required|in:invoice,expense,van_trip',
            'id' => 'required|integer',
            'is_test' => 'required|boolean',
        ]);

        $model = match ($validated['type']) {
            'invoice' => Invoice::where('tenant_id', $tenant->id)->findOrFail($validated['id']),
            'expense' => Expense::where('tenant_id', $tenant->id)->findOrFail($validated['id']),
            'van_trip' => VanTrip::where('tenant_id', $tenant->id)->findOrFail($validated['id']),
        };

        $model->update([
            'is_test' => $validated['is_test'],
        ]);

        $statusMsg = $validated['is_test']
            ? 'تم عزل السجل بنجاح واستبعاده من التقارير التشغيلية الحقيقية.'
            : 'تم إلغاء عزل السجل وإعادته للتقارير التشغيلية الحقيقية.';

        return back()->with('success', $statusMsg);
    }

    /**
     * تصدير التقرير كملف Excel (CSV متوافق مع الحروف العربية)
     */
    public function exportExcel(Request $request): StreamedResponse
    {
        $tenant = app(Tenant::class);
        $fromDate = $request->input('from_date', now()->startOfMonth()->toDateString());
        $toDate = $request->input('to_date', now()->toDateString());
        $includeTest = $request->boolean('include_test', false);

        $invoicesQuery = Invoice::where('tenant_id', $tenant->id)
            ->whereDate('created_at', '>=', $fromDate)
            ->whereDate('created_at', '<=', $toDate)
            ->with(['cashier', 'salesRep']);

        if (!$includeTest) {
            $invoicesQuery->where('is_test', false);
        }

        $invoices = $invoicesQuery->get();

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"sales_report_{$fromDate}_{$toDate}.csv\"",
        ];

        return response()->stream(function () use ($invoices) {
            $handle = fopen('php://output', 'w');
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
        $includeTest = $request->boolean('include_test', false);

        $invoicesQuery = Invoice::where('tenant_id', $tenant->id)
            ->whereDate('created_at', '>=', $fromDate)
            ->whereDate('created_at', '<=', $toDate)
            ->where('status', 'completed')
            ->with(['cashier', 'salesRep', 'items']);

        if (!$includeTest) {
            $invoicesQuery->where('is_test', false);
        }

        $invoices = $invoicesQuery->get();

        $totalSales = $invoices->sum('total_amount');
        $totalCost = $invoices->sum('cost_total');
        $grossProfit = $totalSales - $totalCost;

        $expensesQuery = Expense::where('tenant_id', $tenant->id)
            ->whereDate('expense_date', '>=', $fromDate)
            ->whereDate('expense_date', '<=', $toDate);

        if (!$includeTest) {
            $expensesQuery->where('is_test', false);
        }

        $totalExpenses = $expensesQuery->sum('amount');
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
