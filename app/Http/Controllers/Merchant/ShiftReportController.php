<?php

namespace App\Http\Controllers\Merchant;

use App\Http\Controllers\Controller;
use App\Models\CashierShift;
use App\Models\Tenant;
use App\Models\User;
use App\Models\VanTrip;
use Illuminate\Http\RedirectResponse;
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

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $shifts = $query->paginate(20)->withQueryString();

        $stats = [
            'total_shifts' => CashierShift::where('tenant_id', $tenant->id)->count(),
            'open_shifts' => CashierShift::where('tenant_id', $tenant->id)->where('status', 'open')->count(),
            'closed_shifts' => CashierShift::where('tenant_id', $tenant->id)->where('status', 'closed')->count(),
            'total_cash_sales' => CashierShift::where('tenant_id', $tenant->id)->sum('cash_sales'),
            'total_card_sales' => CashierShift::where('tenant_id', $tenant->id)->sum('card_sales'),
            'total_closing_cash' => CashierShift::where('tenant_id', $tenant->id)->where('status', 'closed')->sum('closing_balance'),
            'total_variance' => CashierShift::where('tenant_id', $tenant->id)->where('status', 'closed')->sum('variance'),
        ];

        $cashiers = User::where('tenant_id', $tenant->id)
            ->select(['id', 'name', 'role'])
            ->orderBy('name')
            ->get();

        return Inertia::render('Merchant/Shifts/Index', [
            'shifts' => $shifts,
            'stats' => $stats,
            'cashiers' => $cashiers,
            'filters' => [
                'cashier_id' => $request->cashier_id,
                'status' => $request->status,
            ],
        ]);
    }

    public function vanTripsIndex(Request $request): Response
    {
        $tenant = app(Tenant::class);

        // وضع العرض: operational (التشغيل الفعلي فقط - الافتراضي)، qa (بيانات الاختبار فقط)، all (الكل)
        $viewMode = $request->input('view_mode', 'operational');

        $query = VanTrip::where('tenant_id', $tenant->id)
            ->with(['salesRep', 'warehouse', 'settledBy'])
            ->withSum([
                'invoices as computed_cash_sales' => function ($q) {
                    $q->where('status', 'completed')->where('payment_method', 'cash');
                }
            ], 'paid_amount')
            ->latest('start_time');

        // عزل رحلات QA عن شاشة التشغيل الافتراضية
        if ($viewMode === 'operational') {
            $query->where('is_test', false);
        } elseif ($viewMode === 'qa') {
            $query->where('is_test', true);
        }

        if ($request->filled('rep_id')) {
            $query->where('sales_rep_id', $request->rep_id);
        }

        // فلترة بحسب حالة التسوية والمطابقة
        if ($request->filled('status')) {
            if ($request->status === 'unsettled') {
                // يشمل أي فرق غير معتمد: سواء كان عجزاً أو فائضاً ويستبعد المتوازنة تماماً
                $query->where('status', 'closed')
                    ->where('settlement_status', '!=', 'settled_with_variance')
                    ->where('settlement_status', '!=', 'balanced')
                    ->where(function ($q) {
                        $q->where(function ($sub) {
                            $sub->whereNotNull('difference')
                                ->where('difference', '!=', 0);
                        })->orWhere(function ($sub) {
                            $sub->whereNull('difference')
                                ->whereRaw('total_sales != total_cash_collected');
                        });
                    });
            } elseif ($request->status === 'balanced') {
                $query->where('status', 'closed')
                    ->where(function ($q) {
                        $q->where('settlement_status', 'balanced')
                          ->orWhere(function ($sub) {
                              $sub->where('settlement_status', '!=', 'settled_with_variance')
                                  ->where(function ($s2) {
                                      $s2->where('difference', 0)
                                         ->orWhere(function ($s3) {
                                             $s3->whereNull('difference')
                                                ->whereRaw('total_sales = total_cash_collected');
                                         });
                                  });
                          });
                    });
            } elseif ($request->status === 'open') {
                $query->where('status', 'open');
            } elseif ($request->status === 'settled_with_variance') {
                $query->where('settlement_status', 'settled_with_variance');
            }
        }

        $trips = $query->paginate(20)->withQueryString();

        // توحيد قاعدة الحساب والإشارة وتصنيف الفرق لكل رحلة
        $trips->getCollection()->transform(function ($trip) {
            $computedCash = (float) ($trip->computed_cash_sales ?? 0);
            $cashSales = (float) ($trip->cash_sales > 0 ? $trip->cash_sales : $computedCash);
            $collected = (float) $trip->total_cash_collected;
            $diff = round($cashSales - $collected, 2);

            // تحديد نوع الفارق بدقة:
            // diff > 0 => مبيعات أكبر من التوريد => عجز / رصيد مستحق على المندوب
            // diff < 0 => توريد أكبر من المبيعات => فائض توريد من المندوب
            // diff == 0 => متوازنة
            if ($diff > 0) {
                $varianceType = 'shortage';
                $varianceLabel = 'عجز / رصيد مستحق';
                $diffAmount = $diff;
            } elseif ($diff < 0) {
                $varianceType = 'surplus';
                $varianceLabel = 'فائض توريد';
                $diffAmount = abs($diff);
            } else {
                $varianceType = 'balanced';
                $varianceLabel = 'متوازنة';
                $diffAmount = 0.00;
            }

            // تحديد حالة التسوية والمطابقة الظاهرة
            $displayStatus = $trip->settlement_status;
            if ($trip->status === 'open') {
                $displayStatus = 'open';
            } elseif ($trip->settlement_status === 'settled_with_variance') {
                $displayStatus = 'settled_with_variance';
            } elseif ($varianceType === 'balanced') {
                $displayStatus = 'balanced';
            } else {
                // أي فرق غير معتمد سواء عجز أو فائض هو غير مسوّى
                $displayStatus = 'unsettled';
            }

            $trip->display_cash_sales = $cashSales;
            $trip->display_cash_collected = $collected;
            $trip->display_difference = $diff; // إشارة موحدة (+ عجز، - فائض)
            $trip->display_diff_amount = $diffAmount; // قيمة مطلقة للعرض
            $trip->variance_type = $varianceType; // shortage, surplus, balanced
            $trip->variance_label = $varianceLabel;
            $trip->display_settlement_status = $displayStatus;

            return $trip;
        });

        // إحصائيات التصفية والمطابقة:
        // في وضع التشغيل الفعلي (operational) تحسب فقط الرحلات غير المعزولة (is_test=false)
        $statsBaseQuery = VanTrip::where('tenant_id', $tenant->id)
            ->where('status', 'closed');

        if ($viewMode === 'operational') {
            $statsBaseQuery->where('is_test', false);
        } elseif ($viewMode === 'qa') {
            $statsBaseQuery->where('is_test', true);
        }

        $allClosedTrips = $statsBaseQuery->withSum([
            'invoices as computed_cash_sales' => function ($q) {
                $q->where('status', 'completed')->where('payment_method', 'cash');
            }
        ], 'paid_amount')->get();

        $unsettledCount = 0;
        $unsettledShortageCount = 0;
        $unsettledShortageAmount = 0;
        $unsettledSurplusCount = 0;
        $unsettledSurplusAmount = 0;

        foreach ($allClosedTrips as $closedTrip) {
            if ($closedTrip->settlement_status === 'settled_with_variance') {
                continue;
            }
            $cCash = (float) ($closedTrip->computed_cash_sales ?? 0);
            $sales = (float) ($closedTrip->cash_sales > 0 ? $closedTrip->cash_sales : $cCash);
            $coll = (float) $closedTrip->total_cash_collected;
            $d = round($sales - $coll, 2);

            if ($d > 0) {
                // عجز غير معتمد
                $unsettledCount++;
                $unsettledShortageCount++;
                $unsettledShortageAmount += $d;
            } elseif ($d < 0) {
                // فائض غير معتمد
                $unsettledCount++;
                $unsettledSurplusCount++;
                $unsettledSurplusAmount += abs($d);
            }
        }

        $qaTripsCount = VanTrip::where('tenant_id', $tenant->id)->where('is_test', true)->count();

        return Inertia::render('Merchant/VanTrips/Index', [
            'trips' => $trips,
            'stats' => [
                'unsettled_count' => $unsettledCount,
                'unsettled_shortage_count' => $unsettledShortageCount,
                'unsettled_shortage_amount' => $unsettledShortageAmount,
                'unsettled_surplus_count' => $unsettledSurplusCount,
                'unsettled_surplus_amount' => $unsettledSurplusAmount,
                'qa_trips_count' => $qaTripsCount,
            ],
            'filters' => [
                'rep_id' => $request->rep_id,
                'status' => $request->status,
                'view_mode' => $viewMode,
            ],
        ]);
    }

    /**
     * اعتماد وتسوية رحلة بها فارق (عجز أو فائض) بصلاحية الأدمن مع توثيق السبب
     */
    public function settleVanTrip(Request $request, VanTrip $trip): RedirectResponse
    {
        $tenant = app(Tenant::class);
        $user = auth()->user();

        // التحقق من الصلاحيات الإدارية
        if (!$user->isAdmin() && !$user->isSuperAdmin()) {
            abort(403, 'غير مصرح لك باعتماد تسوية فروقات رحلات المناديب');
        }

        if ($trip->tenant_id !== $tenant->id) {
            abort(403);
        }

        $validated = $request->validate([
            'settlement_notes' => 'required|string|min:5|max:1000',
        ], [
            'settlement_notes.required' => 'يجب إدخال سبب معتمد لتسوية الفارق وتوثيق الرحلة.',
            'settlement_notes.min' => 'سبب التسوية يجب ألا يقل عن 5 أحرف لضمان التوثيق الرقابي.',
        ]);

        // حساب المبيعات النقدية بدقة وتثبيتها إن لم تكن مسجلة
        $computedCash = (float) $trip->invoices()
            ->where('status', 'completed')
            ->where('payment_method', 'cash')
            ->sum('paid_amount');

        $cashSales = (float) ($trip->cash_sales > 0 ? $trip->cash_sales : $computedCash);
        $diff = round($cashSales - (float) $trip->total_cash_collected, 2);

        $trip->update([
            'cash_sales' => $cashSales,
            'difference' => $diff,
            'settlement_status' => 'settled_with_variance',
            'settlement_notes' => $validated['settlement_notes'],
            'settled_by_id' => $user->id,
            'settled_at' => now(),
        ]);

        $typeText = ($diff > 0) ? 'العجز المستحق' : (($diff < 0) ? 'فائض التوريد' : 'الفارق');
        return back()->with('success', "تم اعتماد وتسوية {$typeText} للرحلة بنجاح وتوثيق سبب التسوية بسجل التدقيق.");
    }
}
