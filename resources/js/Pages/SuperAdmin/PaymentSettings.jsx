import React from 'react';
import { Head, useForm } from '@inertiajs/react';
import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import { 
    CreditCard, 
    Save, 
    ShieldCheck, 
    Smartphone, 
    Zap, 
    CheckCircle2, 
    HelpCircle, 
    Lock,
    Wallet
} from 'lucide-react';

export default function PaymentSettings({ settings }) {
    const { data, setData, post, processing, recentlySuccessful, errors } = useForm({
        active_gateway: settings.active_gateway || 'paymob',
        // Paymob
        paymob_api_key: settings.paymob_api_key || '',
        paymob_secret_key: settings.paymob_secret_key || '',
        paymob_public_key: settings.paymob_public_key || '',
        paymob_card_integration_id: settings.paymob_card_integration_id || '',
        paymob_wallet_integration_id: settings.paymob_wallet_integration_id || '',
        paymob_iframe_id: settings.paymob_iframe_id || '',
        paymob_mode: settings.paymob_mode || 'test',
        // Kashier
        kashier_merchant_id: settings.kashier_merchant_id || '',
        kashier_api_key: settings.kashier_api_key || '',
        kashier_secret_key: settings.kashier_secret_key || '',
        kashier_mode: settings.kashier_mode || 'test',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        post('/admin/payment-settings');
    };

    return (
        <SuperAdminLayout title="إعدادات بوابات الدفع">
            <Head title="إعدادات بوابات الدفع الإلكتروني (Paymob & Kashier)" />

            <div className="space-y-6 max-w-5xl mx-auto pb-12">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
                            <CreditCard className="w-7 h-7 text-indigo-400" />
                            <span>إعدادات بوابات الدفع الإلكتروني</span>
                        </h1>
                        <p className="text-slate-400 text-xs mt-1">
                            تهيئة بيانات الربط مع Paymob (فودافون كاش وإنستاباي) وشركة Kashier لتحصيل اشتراكات المتاجر ومقاعد الموظفين
                        </p>
                    </div>

                    {recentlySuccessful && (
                        <div className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                            <CheckCircle2 size={16} />
                            <span>تم حفظ الإعدادات بنجاح!</span>
                        </div>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Active Gateway Choice */}
                    <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6 shadow-xl space-y-4">
                        <div className="flex items-center gap-2 border-b border-slate-700 pb-3">
                            <Zap className="w-5 h-5 text-amber-400" />
                            <h2 className="text-base font-black text-white">بوابة الدفع الافتراضية المفعلة للمنصة</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <label className={`p-4 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                                data.active_gateway === 'paymob'
                                    ? 'bg-indigo-600/15 border-indigo-500 shadow-md shadow-indigo-600/10'
                                    : 'bg-slate-900 border-slate-750 hover:border-slate-600'
                            }`}>
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            name="active_gateway"
                                            value="paymob"
                                            checked={data.active_gateway === 'paymob'}
                                            onChange={(e) => setData('active_gateway', e.target.value)}
                                            className="text-indigo-600 focus:ring-indigo-500 bg-slate-800 border-slate-600"
                                        />
                                        <span className="font-extrabold text-white text-sm">Paymob (باي موب)</span>
                                    </div>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">موصى به</span>
                                </div>
                                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                                    تدعم السداد المباشر عبر <b>فودافون كاش، محافظ الهاتف، وبطاقات إنستاباي وميزة</b> وفيزا وماستركارد.
                                </p>
                            </label>

                            <label className={`p-4 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                                data.active_gateway === 'kashier'
                                    ? 'bg-indigo-600/15 border-indigo-500 shadow-md shadow-indigo-600/10'
                                    : 'bg-slate-900 border-slate-750 hover:border-slate-600'
                            }`}>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        name="active_gateway"
                                        value="kashier"
                                        checked={data.active_gateway === 'kashier'}
                                        onChange={(e) => setData('active_gateway', e.target.value)}
                                        className="text-indigo-600 focus:ring-indigo-500 bg-slate-800 border-slate-600"
                                    />
                                    <span className="font-extrabold text-white text-sm">Kashier (كاشير)</span>
                                </div>
                                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                                    بوابة الدفع السريعة كاشير عبر البطاقات البنكية وحسابات كاشير.
                                </p>
                            </label>

                            <label className={`p-4 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                                data.active_gateway === 'test'
                                    ? 'bg-indigo-600/15 border-indigo-500 shadow-md shadow-indigo-600/10'
                                    : 'bg-slate-900 border-slate-750 hover:border-slate-600'
                            }`}>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        name="active_gateway"
                                        value="test"
                                        checked={data.active_gateway === 'test'}
                                        onChange={(e) => setData('active_gateway', e.target.value)}
                                        className="text-indigo-600 focus:ring-indigo-500 bg-slate-800 border-slate-600"
                                    />
                                    <span className="font-extrabold text-white text-sm">وضع الاختبار السريع (Simulator)</span>
                                </div>
                                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                                    محاكاة الدفع للاختبار على بيئة التطوير (Localhost) بدون الحاجة لمفاتيح API حقيقية.
                                </p>
                            </label>
                        </div>
                    </div>

                    {/* Paymob Section */}
                    <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6 shadow-xl space-y-5">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-700 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">
                                    <Smartphone size={22} />
                                </div>
                                <div>
                                    <h2 className="text-base font-extrabold text-white">إعدادات بوابة Paymob (فودافون كاش & إنستاباي)</h2>
                                    <p className="text-slate-400 text-xs">احصل على هذه البيانات من لوحة تحكم حسابك في Paymob Accept</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-400 font-semibold">بيئة التشغيل:</span>
                                <select
                                    value={data.paymob_mode}
                                    onChange={(e) => setData('paymob_mode', e.target.value)}
                                    className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:border-indigo-500"
                                >
                                    <option value="test">بيئة الاختبار التجريبية (Test)</option>
                                    <option value="live">البيئة الحية الفعلية (Live)</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* API Key */}
                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                    مفتاح API العام (Paymob API Key):
                                </label>
                                <input
                                    type="text"
                                    value={data.paymob_api_key}
                                    onChange={(e) => setData('paymob_api_key', e.target.value)}
                                    placeholder="مثال: ZXlKaGJHY2lPaUpJVXpVeE1p..."
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:border-indigo-500 font-mono"
                                />
                            </div>

                            {/* Secret Key / HMAC */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                    المفتاح السري (HMAC Secret Key):
                                </label>
                                <input
                                    type="password"
                                    value={data.paymob_secret_key}
                                    onChange={(e) => setData('paymob_secret_key', e.target.value)}
                                    placeholder="HMAC Secret Key المستخدم للتحقق من التوقيع"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:border-indigo-500 font-mono"
                                />
                            </div>

                            {/* Public Key */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                    المفتاح العام (Public Key - اختياري):
                                </label>
                                <input
                                    type="text"
                                    value={data.paymob_public_key}
                                    onChange={(e) => setData('paymob_public_key', e.target.value)}
                                    placeholder="مثال: PK_test_..."
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:border-indigo-500 font-mono"
                                />
                            </div>

                            {/* Wallet Integration ID */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                                    <span>معرف تكامل المحافظ الإلكترونية (Vodafone Cash Integration ID):</span>
                                    <span className="text-emerald-400 font-bold text-[10px]">فودافون كاش ومحافظ المحمول</span>
                                </label>
                                <input
                                    type="text"
                                    value={data.paymob_wallet_integration_id}
                                    onChange={(e) => setData('paymob_wallet_integration_id', e.target.value)}
                                    placeholder="مثال: 456789"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:border-indigo-500 font-mono"
                                />
                            </div>

                            {/* Card / InstaPay Integration ID */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                                    <span>معرف تكامل البطاقات وإنستاباي (Card & InstaPay Integration ID):</span>
                                    <span className="text-indigo-400 font-bold text-[10px]">إنستاباي / فيزا / ميزة</span>
                                </label>
                                <input
                                    type="text"
                                    value={data.paymob_card_integration_id}
                                    onChange={(e) => setData('paymob_card_integration_id', e.target.value)}
                                    placeholder="مثال: 123456"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:border-indigo-500 font-mono"
                                />
                            </div>

                            {/* Iframe ID */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                    معرف الـ Iframe (Iframe ID):
                                </label>
                                <input
                                    type="text"
                                    value={data.paymob_iframe_id}
                                    onChange={(e) => setData('paymob_iframe_id', e.target.value)}
                                    placeholder="مثال: 78910"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:border-indigo-500 font-mono"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Kashier Section */}
                    <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6 shadow-xl space-y-5">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-700 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">
                                    <CreditCard size={22} />
                                </div>
                                <div>
                                    <h2 className="text-base font-extrabold text-white">إعدادات بوابة شركة Kashier (كاشير)</h2>
                                    <p className="text-slate-400 text-xs">بيانات الربط مع حساب التاجر لدى شركة Kashier</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-400 font-semibold">بيئة التشغيل:</span>
                                <select
                                    value={data.kashier_mode}
                                    onChange={(e) => setData('kashier_mode', e.target.value)}
                                    className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:border-indigo-500"
                                >
                                    <option value="test">بيئة الاختبار التجريبية (Test)</option>
                                    <option value="live">البيئة الحية الفعلية (Live)</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Merchant ID */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                    معرف التاجر (Merchant ID):
                                </label>
                                <input
                                    type="text"
                                    value={data.kashier_merchant_id}
                                    onChange={(e) => setData('kashier_merchant_id', e.target.value)}
                                    placeholder="مثال: MID-DEMO-001"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:border-indigo-500 font-mono"
                                />
                            </div>

                            {/* API Key */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                    مفتاح الـ API (API Key):
                                </label>
                                <input
                                    type="password"
                                    value={data.kashier_api_key}
                                    onChange={(e) => setData('kashier_api_key', e.target.value)}
                                    placeholder="Kashier API Key"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:border-indigo-500 font-mono"
                                />
                            </div>

                            {/* Secret Key */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                    المفتاح السري (Secret Key):
                                </label>
                                <input
                                    type="password"
                                    value={data.kashier_secret_key}
                                    onChange={(e) => setData('kashier_secret_key', e.target.value)}
                                    placeholder="Kashier Secret Key"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:border-indigo-500 font-mono"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Action Submit */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                        >
                            <Save size={18} />
                            <span>{processing ? 'جاري الحفظ...' : 'حفظ إعدادات بوابات الدفع'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </SuperAdminLayout>
    );
}
