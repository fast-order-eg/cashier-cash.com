import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import MerchantLayout from '@/Layouts/MerchantLayout';
import { FolderTree, Plus, Edit, Trash2, X, Check } from 'lucide-react';

export default function Index({ categories }) {
    const [modalOpen, setModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);

    const { data, setData, post, patch, processing, reset, errors } = useForm({
        name: '',
        color: '#3B82F6',
    });

    const openCreateModal = () => {
        setEditingCategory(null);
        reset();
        setModalOpen(true);
    };

    const openEditModal = (cat) => {
        setEditingCategory(cat);
        setData({
            name: cat.name,
            color: cat.color || '#3B82F6',
        });
        setModalOpen(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editingCategory) {
            patch(`/admin/categories/${editingCategory.id}`, {
                onSuccess: () => setModalOpen(false),
            });
        } else {
            post('/admin/categories', {
                onSuccess: () => setModalOpen(false),
            });
        }
    };

    const handleDelete = (id) => {
        if (confirm('هل أنت متأكد من حذف هذا القسم؟')) {
            router.delete(`/admin/categories/${id}`);
        }
    };

    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

    return (
        <MerchantLayout title="أقسام المنتجات">
            <Head title="أقسام المنتجات" />

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-white">أقسام المنتجات</h1>
                        <p className="text-slate-400 text-xs mt-1">تنظيم الأصناف في تصنيفات لتسهيل العرض والبيع في شاشة الكاشير</p>
                    </div>

                    <button
                        onClick={openCreateModal}
                        className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition"
                    >
                        <Plus size={16} />
                        <span>إضافة قسم جديد</span>
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categories.map((cat) => (
                        <div key={cat.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div 
                                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-sm"
                                    style={{ backgroundColor: cat.color || '#3B82F6' }}
                                >
                                    {cat.name.charAt(0)}
                                </div>
                                <div>
                                    <div className="font-bold text-white text-sm">{cat.name}</div>
                                    <div className="text-[11px] text-slate-400 mt-0.5">{cat.products_count} صنف</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => openEditModal(cat)}
                                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-400 hover:text-white transition"
                                >
                                    <Edit size={14} />
                                </button>
                                <button
                                    onClick={() => handleDelete(cat.id)}
                                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white transition"
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
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="font-bold text-white text-sm">
                                {editingCategory ? 'تعديل القسم' : 'إضافة قسم جديد'}
                            </h3>
                            <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">اسم القسم</label>
                                <input
                                    type="text"
                                    required
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder="مثال: مشروبات ساخنة"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                />
                                {errors.name && <p className="text-rose-400 text-xs mt-1">{errors.name}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">لون القسم في الكاشير</label>
                                <div className="flex items-center gap-2">
                                    {colors.map((c) => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => setData('color', c)}
                                            className="w-7 h-7 rounded-full flex items-center justify-center transition border-2"
                                            style={{ backgroundColor: c, borderColor: data.color === c ? '#fff' : 'transparent' }}
                                        >
                                            {data.color === c && <Check size={14} className="text-white" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30"
                                >
                                    {processing ? 'جاري الحفظ...' : 'حفظ'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </MerchantLayout>
    );
}
