import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import MerchantLayout from '@/Layouts/MerchantLayout';
import { 
    Receipt, 
    Plus, 
    Trash2, 
    Filter, 
    X, 
    Calendar, 
    DollarSign, 
    FolderPlus,
    FileText
} from 'lucide-react';

export default function Index({ expenses, categories, total_amount, filters }) {
    const [expenseModalOpen, setExpenseModalOpen] = useState(false);
    const [catModalOpen, setCatModalOpen] = useState(false);

    const [filterCategory, setFilterCategory] = useState(filters.category_id || '');
    const [fromDate, setFromDate] = useState(filters.from_date || '');
    const [toDate, setToDate] = useState(filters.to_date || '');

    // Expense Form
    const { 
        data: expData, 
        setData: setExpData, 
        post: postExp, 
        processing: processingExp, 
        reset: resetExp,
        errors: expErrors 
    } = useForm({
        title: '',
        category_id: categories[0]?.id || '',
        amount: '',
        expense_date: new Date().toISOString().split('T')[0],
        notes: '',
        attachment: null,
    });

    // Category Form
    const { 
        data: catData, 
        setData: setCatData, 
        post: postCat, 
        processing: processingCat, 
        reset: resetCat 
    } = useForm({
        name: '',
    });

    const handleFilter = (e) => {
        e.preventDefault();
        router.get(route('admin.expenses.index'), {
            category_id: filterCategory,
            from_date: fromDate,
            to_date: toDate,
        }, { preserveState: true });
    };

    const handleCreateExpense = (e) => {
        e.preventDefault();
        postExp(route('admin.expenses.store'), {
            onSuccess: () => {
                setExpenseModalOpen(false);
                resetExp();
            }
        });
    };

    const handleCreateCategory = (e) => {
        e.preventDefault();
        postCat(route('admin.expense-categories.store'), {
            onSuccess: () => {
                setCatModalOpen(false);
                resetCat();
            }
        });
    };

    const handleDelete = (id) => {
        if (confirm('هل أنت متأكد من حذف هذا المصروف؟')) {
            router.delete(route('admin.expenses.destroy', id));
        }
    };

    return (
        <MerchantLayout title="المصروفات اليومية">
            <Head title="إدارة المصروفات" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-white">المصروفات اليومية</h1>
                        <p className="text-slate-400 text-xs mt-1">
                            تسجيل مصروفات المتجر وسيارات المناديب لحساب صافي الأرباح بدقة
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setCatModalOpen(true)}
                            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition"
                        >
                            <FolderPlus size={15} />
                            <span>إضافة قسم مصروف</span>
                        </button>
                        <button
                            onClick={() => setExpenseModalOpen(true)}
                            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition"
                        >
                            <Plus size={16} />
                            <span>تسجيل مصروف جديد</span>
                        </button>
                    </div>
                </div>

                {/* Filter and Total Summary */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    <div className="lg:col-span-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                        <form onSubmit={handleFilter} className="flex flex-col sm:flex-row gap-3">
                            <select
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value)}
                                className="bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                            >
                                <option value="">جميع أقسام المصروفات</option>
                                {categories.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>

                            <input
                                type="date"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                                className="bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                            />

                            <input
                                type="date"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                                className="bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                            />

                            <button
                                type="submit"
                                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition"
                            >
                                تصفية
                            </button>
                        </form>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
                        <div>
                            <span className="text-slate-400 text-xs font-semibold">إجمالي المصروفات:</span>
                            <div className="text-2xl font-black text-rose-400 mt-1">
                                {Number(total_amount).toLocaleString('en-US')} ج.م
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
                            <DollarSign size={20} />
                        </div>
                    </div>
                </div>

                {/* Expenses Table */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-right text-xs">
                            <thead>
                                <tr className="border-b border-slate-800 bg-slate-850/60 text-slate-400">
                                    <th className="p-4 font-semibold">بيان المصروف</th>
                                    <th className="p-4 font-semibold">القسم</th>
                                    <th className="p-4 font-semibold">المبلغ</th>
                                    <th className="p-4 font-semibold">التاريخ</th>
                                    <th className="p-4 font-semibold">المسجل / السيارة</th>
                                    <th className="p-4 font-semibold text-center">الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-850">
                                {expenses.data.map((exp) => (
                                    <tr key={exp.id} className="hover:bg-slate-850/40 transition">
                                        <td className="p-4 font-bold text-white text-sm">
                                            {exp.title}
                                            {exp.notes && <div className="text-[11px] text-slate-400 font-normal">{exp.notes}</div>}
                                        </td>
                                        <td className="p-4">
                                            <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-medium">
                                                {exp.category?.name}
                                            </span>
                                        </td>
                                        <td className="p-4 font-bold text-rose-400 font-mono text-sm">
                                            {Number(exp.amount).toFixed(2)} ج.م
                                        </td>
                                        <td className="p-4 text-slate-300">
                                            {new Date(exp.expense_date).toLocaleDateString('ar-EG')}
                                        </td>
                                        <td className="p-4 text-slate-400">
                                            <div>{exp.user?.name}</div>
                                            {exp.van_trip && (
                                                <div className="text-[10px] text-indigo-400">رحلة سيارة: {exp.van_trip.sales_rep?.name}</div>
                                            )}
                                        </td>
                                        <td className="p-4 text-center">
                                            <button
                                                onClick={() => handleDelete(exp.id)}
                                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white transition"
                                                title="حذف المصروف"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {expenses.links && expenses.links.length > 3 && (
                        <div className="p-4 border-t border-slate-800 flex items-center justify-center gap-1">
                            {expenses.links.map((link, idx) => (
                                <Link
                                    key={idx}
                                    href={link.url || '#'}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                                        link.active 
                                            ? 'bg-indigo-600 text-white' 
                                            : link.url 
                                                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' 
                                                : 'text-slate-600 cursor-not-allowed'
                                    }`}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal: Add Expense */}
            {expenseModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="font-bold text-white text-sm flex items-center gap-2">
                                <Receipt size={16} className="text-indigo-400" />
                                <span>تسجيل مصروف جديد</span>
                            </h3>
                            <button onClick={() => setExpenseModalOpen(false)} className="text-slate-400 hover:text-white">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateExpense} className="space-y-4 text-xs">
                            <div>
                                <label className="block font-semibold text-slate-300 mb-1">بيان المصروف</label>
                                <input
                                    type="text"
                                    required
                                    value={expData.title}
                                    onChange={(e) => setExpData('title', e.target.value)}
                                    placeholder="مثال: فاتورة كهرباء شهر مايو"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold text-slate-300 mb-1">المبلغ (ج.م)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={expData.amount}
                                        onChange={(e) => setExpData('amount', e.target.value)}
                                        placeholder="0.00"
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                                    />
                                </div>

                                <div>
                                    <label className="block font-semibold text-slate-300 mb-1">القسم</label>
                                    <select
                                        value={expData.category_id}
                                        onChange={(e) => setExpData('category_id', e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                                    >
                                        {categories.map((c) => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-300 mb-1">تاريخ المصروف</label>
                                <input
                                    type="date"
                                    required
                                    value={expData.expense_date}
                                    onChange={(e) => setExpData('expense_date', e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-300 mb-1">ملاحظات إضافية</label>
                                <input
                                    type="text"
                                    value={expData.notes}
                                    onChange={(e) => setExpData('notes', e.target.value)}
                                    placeholder="اختياري"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setExpenseModalOpen(false)}
                                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    disabled={processingExp}
                                    className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/30"
                                >
                                    {processingExp ? 'جاري الحفظ...' : 'تسجيل المصروف'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Add Category */}
            {catModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="font-bold text-white text-sm">إضافة قسم مصروف جديد</h3>
                            <button onClick={() => setCatModalOpen(false)} className="text-slate-400 hover:text-white">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateCategory} className="space-y-4 text-xs">
                            <div>
                                <label className="block font-semibold text-slate-300 mb-1">اسم القسم</label>
                                <input
                                    type="text"
                                    required
                                    value={catData.name}
                                    onChange={(e) => setCatData('name', e.target.value)}
                                    placeholder="مثال: صيانة سيارات، بنزين، بوفيه"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setCatModalOpen(false)}
                                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    disabled={processingCat}
                                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                                >
                                    {processingCat ? 'جاري الحفظ...' : 'حفظ'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </MerchantLayout>
    );
}
