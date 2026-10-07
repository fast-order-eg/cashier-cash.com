import InputError from '@/Components/InputError';
import Modal from '@/Components/Modal';
import { useForm, usePage } from '@inertiajs/react';
import { useRef, useState } from 'react';
import { ShieldAlert, Trash2, AlertTriangle } from 'lucide-react';

export default function DeleteUserForm({ className = '' }) {
    const user = usePage().props.auth.user;
    const [confirmingUserDeletion, setConfirmingUserDeletion] = useState(false);
    const passwordInput = useRef();

    const {
        data,
        setData,
        delete: destroy,
        processing,
        reset,
        errors,
        clearErrors,
    } = useForm({
        password: '',
    });

    if (user?.role === 'super_admin') {
        return (
            <section className={className}>
                <header className="flex items-center gap-3 pb-4 border-b border-slate-700/60">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
                        <ShieldAlert size={20} />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-white">
                            حماية حساب السوبر أدمن
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                            حساب السوبر أدمن الرئيسي محمي ومحصن ضد الحذف لضمان سلامة واستمرارية عمل النظام والمتاجر.
                        </p>
                    </div>
                </header>
            </section>
        );
    }

    const confirmUserDeletion = () => {
        setConfirmingUserDeletion(true);
    };

    const deleteUser = (e) => {
        e.preventDefault();

        destroy(route('profile.destroy'), {
            preserveScroll: true,
            onSuccess: () => closeModal(),
            onError: () => passwordInput.current?.focus(),
            onFinish: () => reset(),
        });
    };

    const closeModal = () => {
        setConfirmingUserDeletion(false);
        clearErrors();
        reset();
    };

    return (
        <section className={`space-y-6 ${className}`}>
            <header className="flex items-center gap-3 pb-4 border-b border-slate-700/60">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold">
                    <Trash2 size={20} />
                </div>
                <div>
                    <h2 className="text-base font-bold text-white">
                        حذف الحساب نهائياً
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                        بمجرد حذف حسابك، سيتم حذف جميع بياناتك نهائياً من النظام ولن تتمكن من استعادتها.
                    </p>
                </div>
            </header>

            <button
                type="button"
                onClick={confirmUserDeletion}
                className="px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 text-xs font-semibold transition flex items-center gap-2"
            >
                <Trash2 size={16} />
                <span>حذف حسابي من النظام</span>
            </button>

            <Modal show={confirmingUserDeletion} onClose={closeModal}>
                <form onSubmit={deleteUser} className="p-6 bg-slate-900 text-white rounded-2xl border border-slate-700" dir="rtl">
                    <div className="flex items-center gap-3 text-rose-400 mb-4">
                        <AlertTriangle size={24} />
                        <h2 className="text-base font-bold text-white">
                            هل أنت متأكد تماماً من رغبتك في حذف الحساب؟
                        </h2>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                        هذا الإجراء نهائي ولا يمكن التراجع عنه. يرجى إدخال كلمة المرور لتأكيد الحذف.
                    </p>

                    <div className="mt-4">
                        <input
                            id="delete_password"
                            type="password"
                            name="password"
                            ref={passwordInput}
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition"
                            placeholder="أدخل كلمة المرور للتأكيد"
                        />

                        <InputError message={errors.password} className="mt-2" />
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={closeModal}
                            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                        >
                            إلغاء
                        </button>

                        <button
                            type="submit"
                            disabled={processing}
                            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition disabled:opacity-50"
                        >
                            تأكيد الحذف النهائي
                        </button>
                    </div>
                </form>
            </Modal>
        </section>
    );
}
