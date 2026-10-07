import React, { useState } from 'react';
import { Head, useForm, router, Link } from '@inertiajs/react';
import MerchantLayout from '@/Layouts/MerchantLayout';
import { 
    Receipt, 
    Plus, 
    Trash2, 
    Edit2,
    History,
    Filter, 
    X, 
    Calendar, 
    DollarSign, 
    FolderPlus,
    FileText,
    ChevronDown,
    ShieldCheck,
    ArrowRightLeft
} from 'lucide-react';
import { formatNumber, formatCurrency, formatDate, formatDateTime } from '@/utils/formatters';

export default function Index({ expenses, categories, total_amount, filters }) {
    const [expenseModalOpen, setExpenseModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState(null);
    const [catModalOpen, setCatModalOpen] = useState(false);
    const [auditModalOpen, setAuditModalOpen] = useState(false);
    const [selectedAuditLogs, setSelectedAuditLogs] = useState([]);
    const [selectedAuditTitle, setSelectedAuditTitle] = useState('');

    const [filterCategory, setFilterCategory] = useState(filters.category_id || '');
    const [fromDate, setFromDate] = useState(filters.from_date || '');
    const [toDate, setToDate] = useState(filters.to_date || '');

    // Expense Form (Create)
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

    // Expense Form (Edit)
    const { 
        data: editData, 
        setData: setEditData, 
        put: putExp, 
        processing: processingEdit, 
        reset: resetEdit,
        errors: editErrors 
    } = useForm({
        title: '',
        category_id: '',
        amount: '',
        expense_date: '',
        notes: '',
        audit_notes: '',
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
        router.get('/admin/expenses', {
            category_id: filterCategory,
            from_date: fromDate,
            to_date: toDate,
        }, { preserveState: true });
    };

    const handleCreateExpense = (e) => {
        e.preventDefault();
        postExp('/admin/expenses', {
            onSuccess: () => {
                setExpenseModalOpen(false);
                resetExp();
            }
        });
    };

    const openEditModal = (exp) => {
        setEditingExpense(exp);
        setEditData({
            title: exp.title || '',
            category_id: exp.category_id || '',
            amount: exp.amount || '',
            expense_date: exp.expense_date ? exp.expense_date.split('T')[0] : '',
            notes: exp.notes || '',
            audit_notes: '',
        });
        setEditModalOpen(true);
    };

    const handleUpdateExpense = (e) => {
        e.preventDefault();
        if (!editingExpense) return;

        putExp(`/admin/expenses/${editingExpense.id}`, {
            onSuccess: () => {
                setEditModalOpen(false);
                setEditingExpense(null);
                resetEdit();
            }
        });
    };

    const handleCreateCategory = (e) => {
        e.preventDefault();
        postCat('/admin/expense-categories', {
            onSuccess: () => {
                setCatModalOpen(false);
                resetCat();
            }
        });
    };

    const handleDelete = (id) => {
        if (confirm('هل أنت متأكد من حذف هذا المصروف؟')) {
            router.delete(`/admin/expenses/${id}`);
        }
    };

    const openAuditHistory = (exp) => {
        setSelectedAuditLogs(exp.audit_logs || []);
        setSelectedAuditTitle(exp.title);
        setAuditModalOpen(true);
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
                            تسجيل مصروفات المتجر وسيارات المناديب مع إمكانية التعديل وسجل تدقيق الرقابة المالية
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
                            <div className="relative">
                                <select
                                    value={filterCategory}
                                    onChange={(e) => setFilterCategory(e.target.value)}
                                    className="bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-3 py-2 text-xs text-white appearance-none focus:outline-none focus:border-indigo-500"
                                    style={{ backgroundImage: 'none' }}
                                >
                                    <option value="">جميع أقسام المصروفات</option>
                                    {categories.map((c) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                                <ChevronDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>

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
                                {formatCurrency(total_amount)}
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
                            <DollarSign size={20} />
                        </div>
                    </div>
                </div>

                {/* Expenses Table */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-right text-xs">
                            <thead>
                                <tr className="border-b border-slate-800 bg-slate-850/60 text-slate-400">
                                    <th className="p-4 font-semibold">بيان المصروف</th>
                                    <th className="p-4 font-semibold">القسم</th>
                                    <th className="p-4 font-semibold">المبلغ</th>
                                    <th className="p-4 font-semibold">التاريخ</th>
                                    <th className="p-4 font-semibold">المسجل / السيارة</th>
                                    <th className="p-4 font-semibold text-center">التدقيق</th>
                                    <th className="p-4 font-semibold text-center">الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-850">
                                {expenses.data.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="p-8 text-center text-slate-500 text-sm">
                                            لا توجد مصروفات مسجلة حتى الآن.
                                        </td>
                                    </tr>
                                ) : (
                                    expenses.data.map((exp) => (
                                        <tr key={exp.id} className="hover:bg-slate-850/40 transition">
                                            <td className="p-4">
                                                <div className="font-bold text-white text-sm">{exp.title}</div>
                                                {exp.notes && (
                                                    <div className="text-[11px] text-slate-400 font-normal mt-0.5">{exp.notes}</div>
                                                )}
                                            </td>

                                            <td className="p-4">
                                                <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-medium">
                                                    {exp.category?.name || 'عام'}
                                                </span>
                                            </td>

                                            <td className="p-4 font-bold text-rose-400 font-mono text-sm">
                                                {formatCurrency(exp.amount)}
                                            </td>

                                            <td className="p-4 text-slate-300">
                                                {formatDate(exp.expense_date)}
                                            </td>

                                            <td className="p-4 text-slate-400">
                                                <div>{exp.user?.name || 'المدير'}</div>
                                                {exp.van_trip && (
                                                    <div className="text-[10px] text-indigo-400">رحلة سيارة: {exp.van_trip.sales_rep?.name}</div>
                                                )}
                                            </td>

                                            <td className="p-4 text-center">
                                                {exp.audit_logs && exp.audit_logs.length > 0 ? (
                                                    <button
                                                        onClick={() => openAuditHistory(exp)}
                                                        className="px-2 py-0.5 rounded-full text-[11px] bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 font-medium inline-flex items-center gap-1 transition"
                                                        title="عرض تاريخ وسجل التعديلات"
                                                    >
                                                        <History size={12} />
                                                        <span>معدّل ({exp.audit_logs.length})</span>
                                                    </button>
                                                ) : (
                                                    <span className="text-slate-600 text-[11px]">أصلي</span>
                                                )}
                                            </td>

                                            <td className="p-4 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <button
                                                        onClick={() => openEditModal(exp)}
                                                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-400 hover:text-white transition"
                                                        title="تعديل المصروف"
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(exp.id)}
                                                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white transition"
                                                        title="حذف المصروف"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
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

            {/* Modal: Create Expense */}
            {expenseModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="font-bold text-white text-sm flex items-center gap-2">
                                <Receipt size={16} className="text-indigo-400" />
                                <span>تسجيل مصروف جديد</span>
                            </h3>
                            <button onClick={() => setExpenseModalOpen(false)} className="text-slate-400 hover:text-white transition">
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
                                    placeholder="مثال: فاتورة كهرباء، كارتة طريق"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                                />
                                {expErrors.title && <p className="text-rose-400 text-[11px] mt-1">{expErrors.title}</p>}
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
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                                    />
                                    {expErrors.amount && <p className="text-rose-400 text-[11px] mt-1">{expErrors.amount}</p>}
                                </div>

                                <div>
                                    <label className="block font-semibold text-slate-300 mb-1">القسم</label>
                                    <div className="relative">
                                        <select
                                            value={expData.category_id}
                                            onChange={(e) => setExpData('category_id', e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2 text-white appearance-none focus:outline-none focus:border-indigo-500"
                                            style={{ backgroundImage: 'none' }}
                                        >
                                            {categories.map((c) => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-300 mb-1">تاريخ المصروف</label>
                                <input
                                    type="date"
                                    required
                                    value={expData.expense_date}
                                    onChange={(e) => setExpData('expense_date', e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                                />
                                {expErrors.expense_date && <p className="text-rose-400 text-[11px] mt-1">{expErrors.expense_date}</p>}
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-300 mb-1">ملاحظات إضافية</label>
                                <input
                                    type="text"
                                    value={expData.notes}
                                    onChange={(e) => setExpData('notes', e.target.value)}
                                    placeholder="اختياري"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setExpenseModalOpen(false)}
                                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 transition"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    disabled={processingExp}
                                    className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
                                >
                                    {processingExp ? 'جاري الحفظ...' : 'تسجيل المصروف'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Edit Expense */}
            {editModalOpen && editingExpense && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="font-bold text-white text-sm flex items-center gap-2">
                                <Edit2 size={16} className="text-amber-400" />
                                <span>تعديل المصروف</span>
                            </h3>
                            <button onClick={() => setEditModalOpen(false)} className="text-slate-400 hover:text-white transition">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateExpense} className="space-y-4 text-xs">
                            <div>
                                <label className="block font-semibold text-slate-300 mb-1">بيان المصروف</label>
                                <input
                                    type="text"
                                    required
                                    value={editData.title}
                                    onChange={(e) => setEditData('title', e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                                />
                                {editErrors.title && <p className="text-rose-400 text-[11px] mt-1">{editErrors.title}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold text-slate-300 mb-1">المبلغ (ج.م)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={editData.amount}
                                        onChange={(e) => setEditData('amount', e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                                    />
                                    {editErrors.amount && <p className="text-rose-400 text-[11px] mt-1">{editErrors.amount}</p>}
                                </div>

                                <div>
                                    <label className="block font-semibold text-slate-300 mb-1">القسم</label>
                                    <div className="relative">
                                        <select
                                            value={editData.category_id}
                                            onChange={(e) => setEditData('category_id', e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2 text-white appearance-none focus:outline-none focus:border-indigo-500"
                                            style={{ backgroundImage: 'none' }}
                                        >
                                            {categories.map((c) => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                    {editErrors.category_id && <p className="text-rose-400 text-[11px] mt-1">{editErrors.category_id}</p>}
                                </div>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-300 mb-1">تاريخ المصروف</label>
                                <input
                                    type="date"
                                    required
                                    value={editData.expense_date}
                                    onChange={(e) => setEditData('expense_date', e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                                />
                                {editErrors.expense_date && <p className="text-rose-400 text-[11px] mt-1">{editErrors.expense_date}</p>}
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-300 mb-1">ملاحظات</label>
                                <input
                                    type="text"
                                    value={editData.notes}
                                    onChange={(e) => setEditData('notes', e.target.value)}
                                    placeholder="اختياري"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-300 mb-1">سبب التعديل (لتوثيق التدقيق)</label>
                                <input
                                    type="text"
                                    value={editData.audit_notes}
                                    onChange={(e) => setEditData('audit_notes', e.target.value)}
                                    placeholder="مثال: تصحيح خطأ إدخال في المبلغ أو القسم"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setEditModalOpen(false)}
                                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 transition"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    disabled={processingEdit}
                                    className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
                                >
                                    {processingEdit ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Audit Log History */}
            {auditModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="font-bold text-white text-sm flex items-center gap-2">
                                <ShieldCheck size={18} className="text-purple-400" />
                                <span>سجل تدقيق تعديلات المصروف: {selectedAuditTitle}</span>
                            </h3>
                            <button onClick={() => setAuditModalOpen(false)} className="text-slate-400 hover:text-white transition">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                            {selectedAuditLogs.length === 0 ? (
                                <p className="text-center text-slate-500 py-6 text-xs">لا توجد تعديلات مسجلة لهذا المصروف.</p>
                            ) : (
                                selectedAuditLogs.map((log) => (
                                    <div key={log.id} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                                        <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                                            <span className="font-bold text-white flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full bg-purple-400" />
                                                قام بالتعديل: {log.user?.name || 'مستخدم النظام'}
                                            </span>
                                            <span className="text-[11px] text-slate-400 font-mono">
                                                {formatDateTime(log.created_at)}
                                            </span>
                                        </div>

                                        {log.notes && (
                                            <div className="text-[11px] text-slate-400">
                                                <span className="text-slate-500">ملاحظة التعديل: </span>
                                                {log.notes}
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                                            <div className="p-2 rounded-xl bg-rose-950/20 border border-rose-900/30">
                                                <div className="text-rose-400 font-semibold mb-1">القيم قبل التعديل:</div>
                                                <div className="text-slate-300">البيان: {log.old_values?.title}</div>
                                                <div className="text-slate-300 font-mono">المبلغ: {formatCurrency(log.old_values?.amount)}</div>
                                                <div className="text-slate-300">القسم: {log.old_values?.category_name}</div>
                                                <div className="text-slate-300">التاريخ: {log.old_values?.expense_date}</div>
                                            </div>

                                            <div className="p-2 rounded-xl bg-emerald-950/20 border border-emerald-900/30">
                                                <div className="text-emerald-400 font-semibold mb-1">القيم بعد التعديل:</div>
                                                <div className="text-slate-300">البيان: {log.new_values?.title}</div>
                                                <div className="text-slate-300 font-mono">المبلغ: {formatCurrency(log.new_values?.amount)}</div>
                                                <div className="text-slate-300">القسم: {log.new_values?.category_name}</div>
                                                <div className="text-slate-300">التاريخ: {log.new_values?.expense_date}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="flex justify-end pt-3 border-t border-slate-800">
                            <button
                                type="button"
                                onClick={() => setAuditModalOpen(false)}
                                className="px-5 py-2 rounded-xl bg-slate-800 text-slate-200 font-semibold hover:bg-slate-700 transition text-xs"
                            >
                                إغلاق
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Add Category */}
            {catModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="font-bold text-white text-sm">إضافة قسم مصروف جديد</h3>
                            <button onClick={() => setCatModalOpen(false)} className="text-slate-400 hover:text-white transition">
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
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setCatModalOpen(false)}
                                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 transition"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    disabled={processingCat}
                                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition disabled:opacity-50"
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
