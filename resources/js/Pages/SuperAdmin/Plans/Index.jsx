import React, { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import { 
    CreditCard, 
    Plus, 
    Check, 
    Edit, 
    Trash2, 
    Users, 
    Sparkles, 
    X 
} from 'lucide-react';

export default function Index({ plans }) {
    const [modalOpen, setModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState(null);

    const { data, setData, post, patch, delete: destroy, processing, reset, errors } = useForm({
        name: '',
        slug: '',
        description: '',
        price_monthly: 299,
        price_yearly: 2990,
        max_employees: 2,
        extra_employee_price: 50,
        features: '',
    });

    const openCreateModal = () => {
        setEditingPlan(null);
        reset();
        setModalOpen(true);
    };

    const openEditModal = (plan) => {
        setEditingPlan(plan);
        setData({
            name: plan.name,
            slug: plan.slug,
            description: plan.description || '',
            price_monthly: plan.price_monthly,
            price_yearly: plan.price_yearly,
            max_employees: plan.max_employees,
            extra_employee_price: plan.extra_employee_price,
            features: Array.isArray(plan.features) ? plan.features.join('\n') : '',
        });
        setModalOpen(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const featuresArray = data.features ? data.features.split('\n').filter(f => f.trim().length > 0) : [];
        const payload = { ...data, features: featuresArray };

        if (editingPlan) {
            patch(route('superadmin.plans.update', editingPlan.id), {
                data: payload,
                onSuccess: () => setModalOpen(false),
            });
        } else {
            post(route('superadmin.plans.store'), {
                data: payload,
                onSuccess: () => setModalOpen(false),
            });
        }
    };

    const handleDelete = (id) => {
        if (confirm('هل أنت متأكد من حذف هذه الباقة؟')) {
            destroy(route('superadmin.plans.destroy', id));
        }
    };

    return (
        <SuperAdminLayout title="باقات الاشتراك والأسعار">
            <Head title="باقات الاشتراك - السوبر أدمن" />

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white">باقات الاشتراك والتسعير</h1>
                        <p className="text-slate-400 text-sm mt-1">
                            تحديد رسوم الباقات الشهرية والسنوية، والحد الأساسي للموظفين وسعر المقعد الإضافي
                        </p>
                    </div>

                    <button
                        onClick={openCreateModal}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition"
                    >
                        <Plus size={16} />
                        <span>إضافة باقة جديدة</span>
                    </button>
                </div>

                {/* Plans Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {plans.map((plan) => (
                        <div key={plan.id} className="bg-slate-800 border border-slate-700/80 rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                                    <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 text-xs font-semibold">
                                        {plan.subscriptions_count} مشترك
                                    </span>
                                </div>

                                <p className="text-xs text-slate-400 min-h-[32px]">{plan.description}</p>

                                <div className="pt-2 border-t border-slate-700/60">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-3xl font-black text-white">{Number(plan.price_monthly)}</span>
                                        <span className="text-xs text-slate-400">ج.م / شهرياً</span>
                                    </div>
                                    <div className="text-xs text-slate-400 mt-1">
                                        {Number(plan.price_yearly)} ج.م سنوياً (خصم شهرين)
                                    </div>
                                </div>

                                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/40 space-y-1.5 text-xs">
                                    <div className="flex items-center justify-between text-slate-300">
                                        <span className="flex items-center gap-1.5">
                                            <Users size={14} className="text-indigo-400" />
                                            <span>الموظفين الأساسيين:</span>
                                        </span>
                                        <span className="font-bold text-white">{plan.max_employees} موظفين</span>
                                    </div>
                                    <div className="flex items-center justify-between text-slate-300">
                                        <span>سعر الموظف الإضافي:</span>
                                        <span className="font-bold text-emerald-400">+{Number(plan.extra_employee_price)} ج.م / شهر</span>
                                    </div>
                                </div>

                                {/* Features List */}
                                <div className="space-y-2 pt-2">
                                    <div className="text-xs font-semibold text-slate-400">الميزات المشمولة:</div>
                                    {Array.isArray(plan.features) && plan.features.map((feat, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                                            <Check size={14} className="text-emerald-400 flex-shrink-0" />
                                            <span>{feat}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-6 pt-4 border-t border-slate-700/60 flex items-center justify-end gap-2">
                                <button
                                    onClick={() => openEditModal(plan)}
                                    className="p-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition text-xs flex items-center gap-1.5 font-medium"
                                >
                                    <Edit size={14} />
                                    <span>تعديل</span>
                                </button>
                                <button
                                    onClick={() => handleDelete(plan.id)}
                                    className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white transition"
                                    title="حذف الباقة"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-white">
                                {editingPlan ? 'تعديل باقة الاشتراك' : 'إضافة باقة جديدة'}
                            </h3>
                            <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1">اسم الباقة</label>
                                    <input
                                        type="text"
                                        required
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        placeholder="مثال: الباقة الفضية"
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1">المعرف (Slug)</label>
                                    <input
                                        type="text"
                                        required
                                        value={data.slug}
                                        onChange={(e) => setData('slug', e.target.value)}
                                        placeholder="silver"
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 font-mono"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">الوصف</label>
                                <textarea
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    rows={2}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1">السعر الشهري (ج.م)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={data.price_monthly}
                                        onChange={(e) => setData('price_monthly', e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1">السعر السنوي (ج.م)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={data.price_yearly}
                                        onChange={(e) => setData('price_yearly', e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1">عدد الموظفين الأساسي</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={data.max_employees}
                                        onChange={(e) => setData('max_employees', e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1">سعر الموظف الإضافي شهرياً</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={data.extra_employee_price}
                                        onChange={(e) => setData('extra_employee_price', e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">
                                    الميزات (اكتب كل ميزة في سطر منفصل)
                                </label>
                                <textarea
                                    value={data.features}
                                    onChange={(e) => setData('features', e.target.value)}
                                    rows={4}
                                    placeholder="نظام كاشير POS كامل&#10;شاشات مناديب وسيارات التوزيع&#10;تقارير أرباح وخسائر"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-700">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="px-4 py-2 rounded-xl bg-slate-700 text-slate-300 hover:bg-slate-600 text-xs font-semibold"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30"
                                >
                                    {processing ? 'جاري الحفظ...' : 'حفظ الباقة'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </SuperAdminLayout>
    );
}
