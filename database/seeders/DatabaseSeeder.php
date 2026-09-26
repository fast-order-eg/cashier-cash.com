<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductWarehouseStock;
use App\Models\Subscription;
use App\Models\SubscriptionPlan;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. باقات الاشتراك
        $starterPlan = SubscriptionPlan::create([
            'name' => 'الباقة الأساسية',
            'slug' => 'starter',
            'description' => 'مثالية للمحلات الصغيرة ونقاط البيع الفردية',
            'price_monthly' => 299.00,
            'price_yearly' => 2990.00,
            'max_employees' => 2,
            'extra_employee_price' => 50.00,
            'features' => [
                'نظام كاشير POS كامل مع وضع الأوفلاين',
                'إدارة المخزون والمنتجات والباركود',
                'تقارير المبيعات والأرباح والمصروفات',
                'دعم طابعات الإيصالات الحرارية',
                'عدد 2 موظفين (كاشير/أدمن)',
            ],
            'is_active' => true,
        ]);

        $proPlan = SubscriptionPlan::create([
            'name' => 'الباقة المتقدمة',
            'slug' => 'pro',
            'description' => 'للمحلات التجارية وشركات التوزيع مع سيارات الجملة',
            'price_monthly' => 599.00,
            'price_yearly' => 5990.00,
            'max_employees' => 5,
            'extra_employee_price' => 40.00,
            'features' => [
                'كل ميزات الباقة الأساسية',
                'نظام مناديب المبيعات وسيارات التوزيع (Van Sales)',
                'متابعة عداد الكيلومترات للسيارات وحساب الفروق',
                'إذن صرف وجرد بضاعة السيارات',
                'تصدير التقارير Excel و PDF',
                'عدد 5 موظفين مشمولين',
            ],
            'is_active' => true,
        ]);

        $enterprisePlan = SubscriptionPlan::create([
            'name' => 'الباقة الاحترافية غير المحدودة',
            'slug' => 'enterprise',
            'description' => 'للشركات والمتاجر الكبيرة وسلاسل الفروع والتوزيع',
            'price_monthly' => 1199.00,
            'price_yearly' => 11990.00,
            'max_employees' => 15,
            'extra_employee_price' => 30.00,
            'features' => [
                'كل ميزات الباقة المتقدمة',
                'دعم الفروع المتعددة والمستودعات المركزية',
                'إمكانية إضافة عدد غير محدود من الموظفين والمناديب',
                'دعم فني وأولوية ربط مخصص',
                'عدد 15 موظف مشمولين',
            ],
            'is_active' => true,
        ]);

        // 2. مستخدم السوبر أدمن
        $superAdmin = User::create([
            'name' => 'سوبر أدمن المنصة',
            'email' => 'admin@casher.com',
            'password' => Hash::make('password'),
            'role' => 'super_admin',
            'phone' => '01000000000',
            'is_active' => true,
        ]);

        // 3. متجر تجريبي (Tenant)
        $tenant = Tenant::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'سوبرماركت الأمانة',
            'slug' => 'alamana',
            'phone' => '01123456789',
            'email' => 'contact@alamana.com',
            'address' => 'شارع التحرير، الدقي، الجيزة',
            'subscription_status' => 'active',
            'subscription_ends_at' => now()->addMonths(6),
            'is_active' => true,
            'settings' => [
                'currency' => 'ج.م',
                'tax_rate' => 14,
                'tax_enabled' => false,
                'tax_number' => '123-456-789',
                'receipt_header' => 'سوبرماركت الأمانة - أهلاً بكم',
                'receipt_footer' => 'شكراً لزيارتكم - البضاعة المباعة ترد وتستبدل خلال 14 يوم',
                'allow_negative_stock' => true,
            ],
        ]);

        // 4. صاحب المتجر (Admin)
        $merchantOwner = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'أحمد رضوان (المدير)',
            'email' => 'owner@alamana.com',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'phone' => '01123456789',
            'is_active' => true,
        ]);

        $tenant->update(['owner_id' => $merchantOwner->id]);

        // اشتراك المتجر التجريبي في الباقة المتقدمة مع موظف إضافي
        Subscription::create([
            'tenant_id' => $tenant->id,
            'plan_id' => $proPlan->id,
            'billing_cycle' => 'monthly',
            'base_price' => 599.00,
            'extra_employees_count' => 1,
            'extra_employees_cost' => 40.00,
            'total_price' => 639.00,
            'status' => 'active',
            'starts_at' => now(),
            'ends_at' => now()->addMonths(1),
            'payment_method' => 'kashier',
            'payment_reference' => 'KASH-DEMO-001',
        ]);

        // 5. موظف كاشير
        $cashier = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'محمد سعيد (كاشير)',
            'email' => 'cashier@alamana.com',
            'password' => Hash::make('password'),
            'role' => 'cashier',
            'phone' => '01234567890',
            'is_active' => true,
        ]);

        // 6. مندوب مبيعات وسيارات
        $salesRep = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'محمود علي (مندوب جملة)',
            'email' => 'rep@alamana.com',
            'password' => Hash::make('password'),
            'role' => 'sales_rep',
            'phone' => '01512345678',
            'is_active' => true,
        ]);

        // مخزن سيارة المندوب
        $vanWarehouse = Warehouse::create([
            'tenant_id' => $tenant->id,
            'name' => 'سيارة توزيع رقم 1 (محمود علي)',
            'type' => 'van',
            'sales_rep_id' => $salesRep->id,
            'vehicle_plate' => 'ط س أ 1234',
            'is_active' => true,
        ]);

        $mainWarehouse = $tenant->mainWarehouse;

        // 7. إضافة أصناف تجريبية
        $catBeverages = Category::where('tenant_id', $tenant->id)->where('name', 'like', '%مشروبات%')->first()
            ?? Category::create(['tenant_id' => $tenant->id, 'name' => 'مشروبات ومأكولات', 'color' => '#10B981']);

        $catCleaning = Category::where('tenant_id', $tenant->id)->where('name', 'like', '%منظفات%')->first()
            ?? Category::create(['tenant_id' => $tenant->id, 'name' => 'منظفات وعناية', 'color' => '#F59E0B']);

        $productsData = [
            [
                'name' => 'أرز مصري المطبخ 1 كجم',
                'category_id' => $catBeverages->id,
                'barcode' => '622100100101',
                'cost_price' => 28.00,
                'retail_price' => 35.00,
                'wholesale_price' => 31.00,
                'stock_quantity' => 150,
                'min_stock_alert' => 20,
                'unit' => 'كيس',
            ],
            [
                'name' => 'زيت عباد الشمس كريستال 800 مل',
                'category_id' => $catBeverages->id,
                'barcode' => '622100100102',
                'cost_price' => 65.00,
                'retail_price' => 78.00,
                'wholesale_price' => 70.00,
                'stock_quantity' => 80,
                'min_stock_alert' => 15,
                'unit' => 'زجاجة',
            ],
            [
                'name' => 'شاي العروسة ناعم 250 جم',
                'category_id' => $catBeverages->id,
                'barcode' => '622100100103',
                'cost_price' => 45.00,
                'retail_price' => 55.00,
                'wholesale_price' => 49.00,
                'stock_quantity' => 120,
                'min_stock_alert' => 25,
                'unit' => 'باكو',
            ],
            [
                'name' => 'مسحوق أريال أوتوماتيك 2.5 كجم',
                'category_id' => $catCleaning->id,
                'barcode' => '622100100104',
                'cost_price' => 135.00,
                'retail_price' => 165.00,
                'wholesale_price' => 148.00,
                'stock_quantity' => 40,
                'min_stock_alert' => 10,
                'unit' => 'كيس',
            ],
            [
                'name' => 'صابون سائل فيري بلس 650 مل',
                'category_id' => $catCleaning->id,
                'barcode' => '622100100105',
                'cost_price' => 32.00,
                'retail_price' => 42.00,
                'wholesale_price' => 36.00,
                'stock_quantity' => 65,
                'min_stock_alert' => 15,
                'unit' => 'زجاجة',
            ],
            [
                'name' => 'بيبسي كانز 330 مل',
                'category_id' => $catBeverages->id,
                'barcode' => '622100100106',
                'cost_price' => 11.50,
                'retail_price' => 15.00,
                'wholesale_price' => 13.00,
                'stock_quantity' => 240,
                'min_stock_alert' => 48,
                'unit' => 'كانز',
            ],
        ];

        foreach ($productsData as $pData) {
            $pData['tenant_id'] = $tenant->id;
            $qty = $pData['stock_quantity'];
            $product = Product::create($pData);

            // إضافة الرصيد للمخزن الرئيسي
            ProductWarehouseStock::create([
                'tenant_id' => $tenant->id,
                'warehouse_id' => $mainWarehouse->id,
                'product_id' => $product->id,
                'quantity' => $qty * 0.7, // 70% في المخزن الرئيسي
            ]);

            // إضافة رصيد عهدة لسيارة التوزيع
            ProductWarehouseStock::create([
                'tenant_id' => $tenant->id,
                'warehouse_id' => $vanWarehouse->id,
                'product_id' => $product->id,
                'quantity' => $qty * 0.3, // 30% في سيارة المندوب
            ]);
        }
    }
}
