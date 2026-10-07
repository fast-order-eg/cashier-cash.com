import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import MerchantLayout from '@/Layouts/MerchantLayout';
import { 
    Users, 
    Plus, 
    Edit, 
    Trash2, 
    X, 
    UserCheck, 
    Shield, 
    AlertCircle,
    CheckCircle,
    ChevronDown,
    Eye,
    EyeOff
} from 'lucide-react';

export default function Index({ staff, maxAllowed, currentCount, canAdd, ownerId }) {
    const [modalOpen, setModalOpen] = useState(false);
    const [editingStaff, setEditingStaff] = useState(null);
    const [showPassword, setShowPassword] = useState(false);

    const { 
        data, 
        setData, 
        post, 
        patch, 
        processing, 
        reset, 
        errors 
    } = useForm({
        name: '',
        email: '',
        phone: '',
        role: 'cashier',
        password: '',
        is_active: true,
    });

    const openCreateModal = () => {
        setEditingStaff(null);
        reset();
        setShowPassword(false);
        setModalOpen(true);
    };

    const openEditModal = (user) => {
        setEditingStaff(user);
        setData({
            name: user.name,
            email: user.email,
            phone: user.phone || '',
            role: user.role,
            password: '',
            is_active: user.is_active,
        });
        setShowPassword(false);
        setModalOpen(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editingStaff) {
            patch(`/admin/staff/${editingStaff.id}`, {
                onSuccess: () => setModalOpen(false),
            });
        } else {
            post('/admin/staff', {
                onSuccess: () => setModalOpen(false),
            });
        }
    };

    const handleDelete = (id) => {
        if (confirm('هل أنت متأكد من حذف هذا الموظف؟')) {
            router.delete(`/admin/staff/${id}`);
        }
    };

    const roleName = (role) => {
        switch (role) {
            case 'cashier': return 'كاشير';
            case 'sales_rep': return 'مندوب مبيعات';
            case 'accountant': return 'محاسب';
            case 'admin': return 'مدير';
            default: return role;
        }
    };

    return (
        <MerchantLayout title="فريق العمل والموظفين">
            <Head title="إدارة الموظفين" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-white">فريق العمل والموظفين</h1>
                        <p className="text-slate-400 text-xs mt-1">
                            إدارة حسابات الكاشير ومناديب التوزيع وتحديد أدوارهم وصلاحياتهم
                        </p>
                    </div>

                    <button
                        onClick={openCreateModal}
                        disabled={!canAdd}
                        className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
                    >
                        <Plus size={16} />
                        <span>إضافة موظف جديد</span>
                    </button>
                </div>

                {/* Seats Capacity Banner */}
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-semibold flex items-center gap-2">
                            <Users size={16} className="text-indigo-400" />
                            <span>استهلاك مقاعد الموظفين المسموح بها في باقتك:</span>
                        </span>
                        <span className="font-bold text-white">
                            {currentCount} من إجمالي {maxAllowed} مقعد مستخدم
                        </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                            className={`h-full transition-all duration-300 ${
                                currentCount >= maxAllowed ? 'bg-amber-500' : 'bg-indigo-500'
                            }`}
                            style={{ width: `${Math.min(100, (currentCount / maxAllowed) * 100)}%` }}
                        />
                    </div>

                    {!canAdd && (
                        <div className="flex items-center gap-2 text-xs text-amber-400 font-medium pt-1">
                            <AlertCircle size={14} />
                            <span>وصلت للحد الأقصى لعدد الموظفين. لزيادة المقاعد يرجى ترقية باقتك أو شراء مقاعد إضافية.</span>
                        </div>
                    )}
                </div>

                {/* Staff Table */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-right text-xs">
                            <thead>
                                <tr className="border-b border-slate-800 bg-slate-850/60 text-slate-400">
                                    <th className="p-4 font-semibold">الموظف</th>
                                    <th className="p-4 font-semibold">رقم الهاتف</th>
                                    <th className="p-4 font-semibold">الدور والصلاحية</th>
                                    <th className="p-4 font-semibold">الحالة</th>
                                    <th className="p-4 font-semibold text-center">الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-850">
                                {staff.map((u) => {
                                    const isOwner = u.id === ownerId;
                                    return (
                                        <tr key={u.id} className="hover:bg-slate-850/40 transition">
                                            <td className="p-4">
                                                <div className="font-bold text-white text-sm flex items-center gap-2">
                                                    <span>{u.name}</span>
                                                    {isOwner && (
                                                        <span className="text-[10px] bg-purple-500/20 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded-full font-bold">
                                                            المالك
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[11px] text-slate-400">{u.email}</div>
                                            </td>
                                            <td className="p-4 text-slate-300 font-mono">{u.phone || 'غير مسجل'}</td>
                                            <td className="p-4">
                                                {isOwner ? (
                                                    <span className="px-2.5 py-1 rounded-lg font-semibold text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                                        مدير المتجر (المالك)
                                                    </span>
                                                ) : (
                                                    <span className={`px-2.5 py-1 rounded-lg font-semibold text-xs ${
                                                        u.role === 'cashier' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                                        u.role === 'sales_rep' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                                                        'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                                    }`}>
                                                        {roleName(u.role)}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                {u.is_active ? (
                                                    <span className="text-emerald-400 font-medium">نشط</span>
                                                ) : (
                                                    <span className="text-rose-400 font-medium">معطل</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <button
                                                        onClick={() => openEditModal(u)}
                                                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-400 hover:text-white transition cursor-pointer"
                                                        title="تعديل البيانات"
                                                    >
                                                        <Edit size={14} />
                                                    </button>
                                                    {!isOwner && (
                                                        <button
                                                            onClick={() => handleDelete(u.id)}
                                                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white transition cursor-pointer"
                                                            title="حذف الموظف"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal: Add/Edit Staff */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="font-bold text-white text-sm">
                                {editingStaff ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد'}
                            </h3>
                            <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                            <div>
                                <label className="block font-semibold text-slate-300 mb-1">اسم الموظف</label>
                                <input
                                    type="text"
                                    required
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder="مثال: أحمد محمود"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                                />
                                {errors.name && <p className="text-rose-400 text-[10px] mt-1">{errors.name}</p>}
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-300 mb-1">البريد الإلكتروني (لتسجيل الدخول)</label>
                                <input
                                    type="email"
                                    required
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    placeholder="cashier@alamana.com"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                                />
                                {errors.email && <p className="text-rose-400 text-[10px] mt-1">{errors.email}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold text-slate-300 mb-1">رقم الهاتف</label>
                                    <input
                                        type="text"
                                        required
                                        value={data.phone}
                                        onChange={(e) => setData('phone', e.target.value)}
                                        placeholder="01xxxxxxxxx"
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block font-semibold text-slate-300 mb-1">الدور والصلاحية</label>
                                    <div className="relative">
                                        <select
                                            value={data.role}
                                            onChange={(e) => setData('role', e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2 text-white appearance-none focus:outline-none focus:border-indigo-500 cursor-pointer"
                                            style={{ backgroundImage: 'none' }}
                                        >
                                            <option value="cashier">كاشير</option>
                                            <option value="sales_rep">مندوب مبيعات</option>
                                            <option value="admin">مدير</option>
                                        </select>
                                        <ChevronDown size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-300 mb-1">
                                    {editingStaff ? 'كلمة المرور (اتركها فارغة إذا لم ترغب بالتغيير)' : 'كلمة المرور'}
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required={!editingStaff}
                                        value={data.password}
                                        onChange={(e) => setData('password', e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition p-1"
                                        title={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                {errors.password && <p className="text-rose-400 text-[10px] mt-1">{errors.password}</p>}
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                                >
                                    {processing ? 'جاري الحفظ...' : 'حفظ الموظف'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </MerchantLayout>
    );
}
