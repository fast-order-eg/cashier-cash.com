<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>التقرير المالي - {{ $tenant->name }}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #fff;
            color: #1e293b;
            margin: 0;
            padding: 24px;
            direction: rtl;
        }
        @media print {
            body { padding: 0; }
            .no-print { display: none; }
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 16px;
            margin-bottom: 24px;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            color: #0f172a;
        }
        .header p {
            margin: 4px 0 0;
            color: #64748b;
            font-size: 13px;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 24px;
        }
        .summary-card {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 12px;
            text-align: center;
        }
        .summary-card .title {
            font-size: 11px;
            color: #64748b;
            margin-bottom: 4px;
        }
        .summary-card .value {
            font-size: 16px;
            font-weight: bold;
            color: #0f172a;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            margin-top: 16px;
        }
        th, td {
            border: 1px solid #cbd5e1;
            padding: 8px 10px;
            text-align: right;
        }
        th {
            background-color: #f8fafc;
            color: #334155;
            font-weight: 600;
        }
        tr:nth-child(even) {
            background-color: #f1f5f9;
        }
        .btn-print {
            background-color: #4f46e5;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            font-weight: bold;
            cursor: pointer;
            font-size: 14px;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <div class="no-print" style="text-align: left;">
        <button class="btn-print" onclick="window.print()">طباعة التقرير (Print / Save as PDF)</button>
    </div>

    <div class="header">
        <h1>{{ $tenant->name }}</h1>
        <p>التقرير المالي والمبيعات للفترة من: {{ $fromDate }} إلى: {{ $toDate }}</p>
        <p>تاريخ استخراج التقرير: {{ now()->format('Y-m-d H:i') }}</p>
    </div>

    <div class="summary-grid">
        <div class="summary-card">
            <div class="title">إجمالي المبيعات</div>
            <div class="value">{{ number_format($totalSales, 2) }} ج.م</div>
        </div>
        <div class="summary-card">
            <div class="title">إجمالي تكلفة البضاعة</div>
            <div class="value">{{ number_format($totalCost, 2) }} ج.م</div>
        </div>
        <div class="summary-card">
            <div class="title">المصروفات العامة</div>
            <div class="value">{{ number_format($totalExpenses, 2) }} ج.م</div>
        </div>
        <div class="summary-card" style="background-color: #f0fdf4; border-color: #86efac;">
            <div class="title" style="color: #166534;">صافي الأرباح</div>
            <div class="value" style="color: #15803d;">{{ number_format($netProfit, 2) }} ج.م</div>
        </div>
    </div>

    <h3 style="font-size: 15px; margin-bottom: 8px;">سجل الفواتير خلال الفترة:</h3>
    <table>
        <thead>
            <tr>
                <th>رقم الفاتورة</th>
                <th>نوع البيع</th>
                <th>المسؤول</th>
                <th>طريقة الدفع</th>
                <th>المبلغ الإجمالي</th>
                <th>التكلفة</th>
                <th>الربح</th>
                <th>التاريخ</th>
            </tr>
        </thead>
        <tbody>
            @forelse($invoices as $inv)
                <tr>
                    <td>{{ $inv->invoice_number }}</td>
                    <td>{{ $inv->type === 'retail' ? 'كاشير قطاعي' : 'مندوب جملة' }}</td>
                    <td>{{ $inv->cashier?->name ?? $inv->salesRep?->name ?? 'المدير' }}</td>
                    <td>{{ $inv->payment_method === 'cash' ? 'نقدي (كاش)' : 'بطاقة (فيزا)' }}</td>
                    <td style="font-weight: bold;">{{ number_format($inv->total_amount, 2) }} ج.م</td>
                    <td>{{ number_format($inv->cost_total, 2) }} ج.م</td>
                    <td style="color: #16a34a; font-weight: bold;">{{ number_format($inv->total_amount - $inv->cost_total, 2) }} ج.م</td>
                    <td>{{ $inv->created_at->format('Y-m-d H:i') }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="8" style="text-align: center; color: #94a3b8;">لا توجد مبيعات في هذه الفترة</td>
                </tr>
            @endforelse
        </tbody>
    </table>
</body>
</html>
