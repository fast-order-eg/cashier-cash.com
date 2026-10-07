<?php

namespace App\Http\Controllers\Merchant;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductWarehouseStock;
use App\Models\Tenant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Shuchkin\SimpleXLSX;
use Shuchkin\SimpleXLSXGen;

class ProductController extends Controller
{
    private function getTenant(): Tenant
    {
        $tenant = app()->bound(Tenant::class) ? app(Tenant::class) : (auth()->user()?->tenant ?? Tenant::first());
        if ($tenant && !app()->bound(Tenant::class)) {
            app()->instance(Tenant::class, $tenant);
        }
        return $tenant;
    }

    public function index(Request $request): Response
    {
        $tenant = $this->getTenant();

        $query = Product::where('tenant_id', $tenant->id)
            ->with(['category', 'warehouseStocks.warehouse'])
            ->latest();

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('barcode', 'like', "%{$search}%");
            });
        }

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        if ($request->boolean('low_stock')) {
            $query->whereColumn('stock_quantity', '<=', 'min_stock_alert');
        }

        if ($request->boolean('negative_stock')) {
            $query->where('stock_quantity', '<', 0);
        }

        $products = $query->paginate(20)->withQueryString();
        $categories = Category::where('tenant_id', $tenant->id)->where('is_active', true)->get();

        return Inertia::render('Merchant/Products/Index', [
            'products' => $products,
            'categories' => $categories,
            'filters' => $request->only(['search', 'category_id', 'low_stock', 'negative_stock']),
        ]);
    }

    public function create(): Response
    {
        $tenant = $this->getTenant();
        $categories = Category::where('tenant_id', $tenant->id)->where('is_active', true)->get();

        return Inertia::render('Merchant/Products/Create', [
            'categories' => $categories,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $tenant = $this->getTenant();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'category_id' => 'nullable|exists:categories,id',
            'barcode' => 'nullable|string|max:100',
            'cost_price' => 'required|numeric|min:0',
            'retail_price' => 'required|numeric|min:0',
            'wholesale_price' => 'required|numeric|min:0',
            'stock_quantity' => 'required|numeric',
            'min_stock_alert' => 'nullable|numeric|min:0',
            'unit' => 'nullable|string|max:50',
            'image' => 'nullable|image|max:2048',
        ]);

        // إذا لم يدخل باركود، نولّد باركود فريد
        $barcode = $validated['barcode'] ?: (string) rand(100000000000, 999999999999);

        // التأكد من عدم تكرار الباركود في نفس المتجر
        if (Product::where('tenant_id', $tenant->id)->where('barcode', $barcode)->exists()) {
            return back()->withErrors(['barcode' => 'هذا الباركود مستخدم بالفعل لصنف آخر']);
        }

        $imagePath = null;
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('products/' . $tenant->id, 'public');
        }

        $product = Product::create([
            'tenant_id' => $tenant->id,
            'category_id' => $validated['category_id'],
            'name' => $validated['name'],
            'barcode' => $barcode,
            'cost_price' => $validated['cost_price'],
            'retail_price' => $validated['retail_price'],
            'wholesale_price' => $validated['wholesale_price'],
            'stock_quantity' => $validated['stock_quantity'],
            'min_stock_alert' => $validated['min_stock_alert'] ?? 5,
            'unit' => $validated['unit'] ?? 'قطعة',
            'image_path' => $imagePath,
            'is_active' => true,
        ]);

        // إضافة الرصيد إلى المخزن الرئيسي للمتجر
        $mainWarehouse = $tenant->mainWarehouse;
        if ($mainWarehouse) {
            ProductWarehouseStock::updateOrCreate(
                [
                    'tenant_id' => $tenant->id,
                    'warehouse_id' => $mainWarehouse->id,
                    'product_id' => $product->id,
                ],
                [
                    'quantity' => $validated['stock_quantity'],
                ]
            );
        }

        return redirect('/admin/products')->with('success', 'تمت إضافة الصنف بنجاح');
    }

    protected function resolveProduct(Product|string|int $product): Product
    {
        if ($product instanceof Product) {
            return $product;
        }

        return Product::findOrFail((int) $product);
    }

    public function edit(Product|string|int $product): Response
    {
        $product = $this->resolveProduct($product);
        $tenant = $this->getTenant();
        if ($product->tenant_id !== $tenant->id) abort(403);

        $categories = Category::where('tenant_id', $tenant->id)->where('is_active', true)->get();
        $product->load('warehouseStocks.warehouse');

        return Inertia::render('Merchant/Products/Edit', [
            'product' => $product,
            'categories' => $categories,
        ]);
    }

    public function update(Request $request, Product|string|int $product): RedirectResponse
    {
        $product = $this->resolveProduct($product);
        $tenant = $this->getTenant();
        if ($product->tenant_id !== $tenant->id) abort(403);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'category_id' => 'nullable|exists:categories,id',
            'barcode' => 'required|string|max:100',
            'cost_price' => 'required|numeric|min:0',
            'retail_price' => 'required|numeric|min:0',
            'wholesale_price' => 'required|numeric|min:0',
            'stock_quantity' => 'nullable|numeric|min:0',
            'min_stock_alert' => 'nullable|numeric|min:0',
            'unit' => 'nullable|string|max:50',
            'is_active' => 'boolean',
            'image' => 'nullable|image|max:2048',
        ]);

        if (Product::where('tenant_id', $tenant->id)->where('barcode', $validated['barcode'])->where('id', '!=', $product->id)->exists()) {
            return back()->withErrors(['barcode' => 'هذا الباركود مستخدم بالفعل لصنف آخر']);
        }

        if ($request->hasFile('image')) {
            if ($product->image_path) {
                Storage::disk('public')->delete($product->image_path);
            }
            $validated['image_path'] = $request->file('image')->store('products/' . $tenant->id, 'public');
        }

        $product->update($validated);

        if (isset($validated['stock_quantity'])) {
            $mainWarehouse = $tenant->mainWarehouse;
            if ($mainWarehouse) {
                ProductWarehouseStock::updateOrCreate(
                    [
                        'tenant_id' => $tenant->id,
                        'warehouse_id' => $mainWarehouse->id,
                        'product_id' => $product->id,
                    ],
                    [
                        'quantity' => $validated['stock_quantity'],
                    ]
                );
            }
        }

        if (!$request->header('X-Inertia') && ($request->expectsJson() || $request->ajax() || $request->has('ajax'))) {
            return response()->json([
                'success' => true,
                'message' => 'تم تحديث بيانات الصنف بنجاح',
                'product' => $product->fresh(['category']),
            ]);
        }

        return redirect('/admin/products')->with('success', 'تم تحديث بيانات الصنف بنجاح');
    }

    public function destroy(Request $request, Product|string|int $product)
    {
        $product = $this->resolveProduct($product);
        $tenant = $this->getTenant();
        if ($product->tenant_id !== $tenant->id) abort(403);

        if ($product->image_path) {
            Storage::disk('public')->delete($product->image_path);
        }

        $product->delete();

        if (!$request->header('X-Inertia') && ($request->expectsJson() || $request->ajax() || $request->has('ajax'))) {
            return response()->json([
                'success' => true,
                'message' => 'تم حذف الصنف بنجاح',
            ]);
        }

        return back()->with('success', 'تم حذف الصنف بنجاح');
    }

    /**
     * تنزيل نموذج إكسيل فارغ مع بيانات استرشادية لرفع الأصناف
     */
    public function downloadTemplate()
    {
        $headers = [
            ['اسم الصنف (إجباري)', 'الباركود (اختياري)', 'القسم / التصنيف', 'سعر الشراء (التكلفة)', 'سعر البيع قطاعي', 'سعر البيع جملة', 'الرصيد الأولي بالمخزن', 'حد التنبيه للنواقص', 'الوحدة'],
            ['جبنة بيضاء فيتا 500 جم', '622900100101', 'ألبان وأجبان', 32, 40, 36, 60, 10, 'علبة'],
            ['تونة قطع في زيت نباتي 140 جم', '622900100102', 'مأكولات معلبة', 45, 55, 50, 80, 15, 'علبة'],
            ['مكرونة فرن فاخرة 400 جم', '622900100103', 'حبوب وبقوليات', 12, 15, 13.5, 120, 20, 'كيس'],
            ['بسكويت سادة كلاسيك 12 قطعة', '', 'حلويات وبسكويت', 20, 25, 22, 100, 15, 'علبة'],
        ];

        $xlsx = SimpleXLSXGen::fromArray($headers);

        return response((string) $xlsx, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="products_import_template.xlsx"',
        ]);
    }

    /**
     * استيراد الأصناف جماعياً من ملف Excel أو CSV مع تقرير تفصيلي شامل
     */
    public function import(Request $request)
    {
        $tenant = $this->getTenant();

        $request->validate([
            'file' => 'required|file|max:15360',
        ], [
            'file.required' => 'يرجى اختيار ملف الإكسيل أولاً',
            'file.max' => 'حجم الملف يجب ألا يتجاوز 15 ميجابايت',
        ]);

        $file = $request->file('file');
        $ext = strtolower($file->getClientOriginalExtension());
        $rows = [];

        if (in_array($ext, ['xlsx', 'xls'])) {
            $xlsx = SimpleXLSX::parse($file->getRealPath());
            if (!$xlsx) {
                $err = SimpleXLSX::parseError();
                $msg = $ext === 'xls' 
                    ? 'صيغة ملف Excel القديمة (.xls) غير مدعومة مباشرة. يرجى حفظ الملف بصيغة (.xlsx) أو (.csv) ثم إعادة رفعه.'
                    : 'تعذر قراءة ملف الإكسيل: ' . $err;
                
                if (!$request->header('X-Inertia') && ($request->expectsJson() || $request->ajax() || $request->has('ajax'))) {
                    return response()->json(['success' => false, 'message' => $msg], 422);
                }
                return back()->with('import_result', ['success' => false, 'message' => $msg])->with('error', $msg);
            }
            $rows = $xlsx->rows();
        } elseif (in_array($ext, ['csv', 'txt'])) {
            // Read CSV
            if (($handle = fopen($file->getRealPath(), 'r')) !== false) {
                // Check and skip UTF-8 BOM if present
                $bom = fread($handle, 3);
                if ($bom !== "\xEF\xBB\xBF") {
                    rewind($handle);
                }
                while (($data = fgetcsv($handle, 10000, ',')) !== false) {
                    if (count($data) === 1 && str_contains($data[0], ';')) {
                        $data = str_getcsv($data[0], ';');
                    }
                    // Clean encoding if necessary
                    foreach ($data as $k => $v) {
                        if (!mb_check_encoding($v, 'UTF-8')) {
                            $data[$k] = mb_convert_encoding($v, 'UTF-8', 'Windows-1256, ISO-8859-1');
                        }
                    }
                    $rows[] = $data;
                }
                fclose($handle);
            }
        } else {
            $msg = 'صيغة الملف غير مدعومة. الرجاء اختيار ملف إكسيل بصيغة .xlsx أو .csv';
            if (!$request->header('X-Inertia') && ($request->expectsJson() || $request->ajax() || $request->has('ajax'))) {
                return response()->json(['success' => false, 'message' => $msg], 422);
            }
            return back()->with('import_result', ['success' => false, 'message' => $msg])->with('error', $msg);
        }

        // إزالة الصفوف الفارغة في البداية
        while (!empty($rows) && empty(array_filter($rows[0], fn($c) => trim((string)$c) !== ''))) {
            array_shift($rows);
        }

        if (empty($rows) || count($rows) < 2) {
            $msg = 'الملف المرفوع فارغ أو لا يحتوي على صفوف بيانات أصناف بعد صف العناوين.';
            if (!$request->header('X-Inertia') && ($request->expectsJson() || $request->ajax() || $request->has('ajax'))) {
                return response()->json(['success' => false, 'message' => $msg], 422);
            }
            return back()->with('import_result', ['success' => false, 'message' => $msg])->with('error', $msg);
        }

        // استخراج صف العناوين الرئيسي (Header) للتعرف الذكي على الأعمدة
        $headerRow = array_shift($rows);
        $colMap = [
            'name' => -1,
            'barcode' => -1,
            'category' => -1,
            'cost_price' => -1,
            'retail_price' => -1,
            'wholesale_price' => -1,
            'stock_quantity' => -1,
            'min_stock_alert' => -1,
            'unit' => -1,
        ];

        foreach ($headerRow as $idx => $headerText) {
            $clean = mb_strtolower(trim((string)$headerText));
            if ($colMap['name'] === -1 && (str_contains($clean, 'اسم') || str_contains($clean, 'صنف') || str_contains($clean, 'منتج') || str_contains($clean, 'name'))) {
                $colMap['name'] = $idx;
            } elseif ($colMap['barcode'] === -1 && (str_contains($clean, 'باركود') || str_contains($clean, 'barcode') || str_contains($clean, 'كود'))) {
                $colMap['barcode'] = $idx;
            } elseif ($colMap['category'] === -1 && (str_contains($clean, 'قسم') || str_contains($clean, 'تصنيف') || str_contains($clean, 'مجموعة') || str_contains($clean, 'category'))) {
                $colMap['category'] = $idx;
            } elseif ($colMap['cost_price'] === -1 && (str_contains($clean, 'شراء') || str_contains($clean, 'تكلفة') || str_contains($clean, 'cost'))) {
                $colMap['cost_price'] = $idx;
            } elseif ($colMap['wholesale_price'] === -1 && (str_contains($clean, 'جملة') || str_contains($clean, 'wholesale'))) {
                $colMap['wholesale_price'] = $idx;
            } elseif ($colMap['retail_price'] === -1 && (str_contains($clean, 'قطاعي') || str_contains($clean, 'بيع') || str_contains($clean, 'retail') || str_contains($clean, 'price'))) {
                $colMap['retail_price'] = $idx;
            } elseif ($colMap['stock_quantity'] === -1 && (str_contains($clean, 'رصيد') || str_contains($clean, 'كمية') || str_contains($clean, 'مخزون') || str_contains($clean, 'stock') || str_contains($clean, 'qty'))) {
                $colMap['stock_quantity'] = $idx;
            } elseif ($colMap['min_stock_alert'] === -1 && (str_contains($clean, 'تنبيه') || str_contains($clean, 'نواقص') || str_contains($clean, 'حد') || str_contains($clean, 'min') || str_contains($clean, 'alert'))) {
                $colMap['min_stock_alert'] = $idx;
            } elseif ($colMap['unit'] === -1 && (str_contains($clean, 'وحدة') || str_contains($clean, 'unit'))) {
                $colMap['unit'] = $idx;
            }
        }

        // التعيين الافتراضي في حالة عدم العثور على مسميات واضحة
        if ($colMap['name'] === -1) $colMap['name'] = 0;
        if ($colMap['barcode'] === -1) $colMap['barcode'] = 1;
        if ($colMap['category'] === -1) $colMap['category'] = 2;
        if ($colMap['cost_price'] === -1) $colMap['cost_price'] = 3;
        if ($colMap['retail_price'] === -1) $colMap['retail_price'] = 4;
        if ($colMap['wholesale_price'] === -1) $colMap['wholesale_price'] = 5;
        if ($colMap['stock_quantity'] === -1) $colMap['stock_quantity'] = 6;
        if ($colMap['min_stock_alert'] === -1) $colMap['min_stock_alert'] = 7;
        if ($colMap['unit'] === -1) $colMap['unit'] = 8;

        $createdCount = 0;
        $existingCount = 0;
        $skippedCount = 0;
        $skippedReasons = [];
        $importedItems = [];
        $totalRows = count($rows);
        $mainWarehouse = $tenant->mainWarehouse;

        try {
            DB::transaction(function () use (
                $rows, 
                $colMap, 
                $tenant, 
                $mainWarehouse, 
                &$createdCount, 
                &$existingCount, 
                &$skippedCount, 
                &$skippedReasons, 
                &$importedItems
            ) {
                // تتبع الباركودات والأسماء في نفس ملف الرفع لمنع تكرار نفس الصف
                $processedBarcodes = [];
                $processedNames = [];

                foreach ($rows as $rowIndex => $row) {
                    $rowNum = $rowIndex + 2;

                    // تخطي الصفوف الفارغة تماماً
                    if (empty($row) || empty(array_filter($row, fn($c) => trim((string)$c) !== ''))) {
                        $skippedCount++;
                        continue;
                    }

                    $name = trim((string)($row[$colMap['name']] ?? ''));
                    if ($name === '') {
                        $skippedCount++;
                        if (count($skippedReasons) < 5) {
                            $skippedReasons[] = "الصف رقم {$rowNum}: تم تخطيه لأن اسم الصنف فارغ.";
                        }
                        continue;
                    }

                    $barcode = trim((string)($row[$colMap['barcode']] ?? ''));
                    $categoryName = trim((string)($row[$colMap['category']] ?? ''));
                    $costPrice = (float)($row[$colMap['cost_price']] ?? 0);
                    $retailPrice = (float)($row[$colMap['retail_price']] ?? 0);
                    $wholesalePrice = !empty($row[$colMap['wholesale_price']]) ? (float)$row[$colMap['wholesale_price']] : $retailPrice;
                    $stockQuantity = !empty($row[$colMap['stock_quantity']]) ? (int)round((float)$row[$colMap['stock_quantity']]) : 0;
                    $minAlert = !empty($row[$colMap['min_stock_alert']]) ? (int)round((float)$row[$colMap['min_stock_alert']]) : 10;
                    $unit = !empty($row[$colMap['unit']]) ? trim((string)$row[$colMap['unit']]) : 'قطعة';

                    // فحص هل الصنف مسجل مسبقاً في قاعدة البيانات أو مكرر في نفس الشيت
                    $existingProduct = null;
                    if ($barcode !== '') {
                        $existingProduct = Product::where('tenant_id', $tenant->id)
                            ->where('barcode', $barcode)
                            ->first();
                    }
                    if (!$existingProduct) {
                        $existingProduct = Product::where('tenant_id', $tenant->id)
                            ->where('name', $name)
                            ->first();
                    }

                    $isDuplicateInFile = false;
                    if ($barcode !== '' && in_array($barcode, $processedBarcodes, true)) {
                        $isDuplicateInFile = true;
                    }
                    if (in_array(mb_strtolower($name), $processedNames, true)) {
                        $isDuplicateInFile = true;
                    }

                    // إذا كان الصنف موجوداً مسبقاً، لا يتم تحديثه مطلقاً بناءً على طلب المستخدم
                    if ($existingProduct || $isDuplicateInFile) {
                        $existingCount++;
                        $importedItems[] = [
                            'id' => $existingProduct?->id ?? null,
                            'name' => $name,
                            'barcode' => $barcode ?: ($existingProduct?->barcode ?? '—'),
                            'cost_price' => $costPrice ?: (float)($existingProduct?->cost_price ?? 0),
                            'retail_price' => $retailPrice ?: (float)($existingProduct?->retail_price ?? 0),
                            'wholesale_price' => $wholesalePrice ?: (float)($existingProduct?->wholesale_price ?? 0),
                            'stock_quantity' => $stockQuantity ?: (int)($existingProduct?->stock_quantity ?? 0),
                            'status' => 'exists',
                            'status_text' => 'موجود مسبقاً (تم تخطيه)',
                        ];
                        continue;
                    }

                    // ربط أو إنشاء القسم تلقائياً إذا كان مكتوباً
                    $categoryId = null;
                    if ($categoryName !== '') {
                        $cat = Category::firstOrCreate(
                            ['tenant_id' => $tenant->id, 'name' => $categoryName],
                            ['color' => '#6366F1']
                        );
                        $categoryId = $cat->id;
                    }

                    // إذا كان الباركود فارغاً، توليد باركود تلقائي فريد
                    if ($barcode === '') {
                        $barcode = '622' . str_pad((string)mt_rand(100000000, 999999999), 9, '0', STR_PAD_LEFT);
                        while (Product::where('tenant_id', $tenant->id)->where('barcode', $barcode)->exists() || in_array($barcode, $processedBarcodes, true)) {
                            $barcode = '622' . str_pad((string)mt_rand(100000000, 999999999), 9, '0', STR_PAD_LEFT);
                        }
                    }

                    // إنشاء الصنف الجديد فقط
                    $product = Product::create([
                        'tenant_id' => $tenant->id,
                        'category_id' => $categoryId,
                        'name' => $name,
                        'barcode' => $barcode,
                        'cost_price' => $costPrice,
                        'retail_price' => $retailPrice,
                        'wholesale_price' => $wholesalePrice,
                        'stock_quantity' => $stockQuantity,
                        'min_stock_alert' => $minAlert,
                        'unit' => $unit,
                        'is_active' => true,
                    ]);
                    $createdCount++;

                    $processedBarcodes[] = $barcode;
                    $processedNames[] = mb_strtolower($name);

                    // إضافة الرصيد في المخزن الرئيسي
                    if ($mainWarehouse) {
                        ProductWarehouseStock::create([
                            'tenant_id' => $tenant->id,
                            'warehouse_id' => $mainWarehouse->id,
                            'product_id' => $product->id,
                            'quantity' => $stockQuantity,
                        ]);
                    }

                    $importedItems[] = [
                        'id' => $product->id,
                        'name' => $product->name,
                        'barcode' => $product->barcode,
                        'cost_price' => (float)$product->cost_price,
                        'retail_price' => (float)$product->retail_price,
                        'wholesale_price' => (float)$product->wholesale_price,
                        'stock_quantity' => $stockQuantity,
                        'status' => 'new',
                        'status_text' => 'تمت الإضافة بنجاح',
                    ];
                }
            });
        } catch (\Throwable $e) {
            $errMsg = 'حدث خطأ غير متوقع أثناء معالجة وحفظ البيانات: ' . $e->getMessage();
            if (!$request->header('X-Inertia') && ($request->expectsJson() || $request->ajax() || $request->has('ajax'))) {
                return response()->json(['success' => false, 'message' => $errMsg], 500);
            }
            return back()->with('import_result', ['success' => false, 'message' => $errMsg])->with('error', $errMsg);
        }

        $msg = $createdCount > 0 
            ? "تم إضافة {$createdCount} صنف جديد بنجاح." . ($existingCount > 0 ? " (وتم تخطي {$existingCount} صنف لأنهم مسجلين بالفعل)." : '')
            : "لم يتم إضافة أصناف جديدة؛ جميع الأصناف في الملف ({$existingCount} صنف) مسجلة بالفعل بالنظام.";

        $resultData = [
            'success' => true,
            'message' => $msg,
            'created_count' => $createdCount,
            'existing_count' => $existingCount,
            'total_rows' => $totalRows,
            'skipped_count' => $skippedCount,
            'skipped_reasons' => $skippedReasons,
            'items' => $importedItems,
        ];

        if (!$request->header('X-Inertia') && ($request->expectsJson() || $request->ajax() || $request->has('ajax'))) {
            return response()->json($resultData);
        }

        return back()->with('import_result', $resultData)->with('success', $msg);
    }
}
