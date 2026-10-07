import React from 'react';
import { Head, usePage } from '@inertiajs/react';
import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import MerchantLayout from '@/Layouts/MerchantLayout';
import DeleteUserForm from './Partials/DeleteUserForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';
import { UserCheck } from 'lucide-react';

export default function Edit({ mustVerifyEmail, status }) {
    const { auth } = usePage().props;
    const isSuperAdmin = auth?.user?.role === 'super_admin';
    const isMerchant = auth?.user?.tenant_id || auth?.tenant;

    const content = (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Header info */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-700/60">
                <div>
                    <h1 className="text-xl font-extrabold text-white">
                        الملف الشخصي وإعدادات الأمان
                    </h1>
                    <p className="text-xs text-slate-400 mt-1">
                        إدارة بيانات الحساب الشخصي وتعديل كلمة المرور بأمان
                    </p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
                    <UserCheck size={16} />
                    <span>{isSuperAdmin ? 'حساب سوبر أدمن' : (auth?.user?.role === 'admin' ? 'مدير المتجر' : 'مستخدم')}</span>
                </div>
            </div>

            <div className="bg-slate-800/90 border border-slate-700/70 rounded-2xl p-6 sm:p-8 shadow-xl">
                <UpdateProfileInformationForm
                    mustVerifyEmail={mustVerifyEmail}
                    status={status}
                    className="max-w-2xl"
                />
            </div>

            <div className="bg-slate-800/90 border border-slate-700/70 rounded-2xl p-6 sm:p-8 shadow-xl">
                <UpdatePasswordForm className="max-w-2xl" />
            </div>

            <div className="bg-slate-800/90 border border-slate-700/70 rounded-2xl p-6 sm:p-8 shadow-xl">
                <DeleteUserForm className="max-w-2xl" />
            </div>
        </div>
    );

    if (isSuperAdmin) {
        return (
            <SuperAdminLayout title="الملف الشخصي">
                <Head title="الملف الشخصي" />
                {content}
            </SuperAdminLayout>
        );
    }

    if (isMerchant) {
        return (
            <MerchantLayout title="الملف الشخصي">
                <Head title="الملف الشخصي" />
                {content}
            </MerchantLayout>
        );
    }

    return (
        <div dir="rtl" className="min-h-screen bg-slate-900 text-slate-100 p-6">
            <Head title="الملف الشخصي" />
            {content}
        </div>
    );
}
