import InputError from '@/Components/InputError';
import { Transition } from '@headlessui/react';
import { Link, useForm, usePage } from '@inertiajs/react';
import { User, CheckCircle2 } from 'lucide-react';

export default function UpdateProfileInformation({
    mustVerifyEmail,
    status,
    className = '',
}) {
    const user = usePage().props.auth.user;

    const { data, setData, patch, errors, processing, recentlySuccessful } =
        useForm({
            name: user.name,
            email: user.email,
        });

    const submit = (e) => {
        e.preventDefault();

        patch(route('profile.update'));
    };

    return (
        <section className={className}>
            <header className="flex items-center gap-3 pb-4 border-b border-slate-700/60">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">
                    <User size={20} />
                </div>
                <div>
                    <h2 className="text-base font-bold text-white">
                        البيانات الأساسية للحساب
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                        قم بتحديث اسم الحساب وعنوان البريد الإلكتروني المسجل في النظام.
                    </p>
                </div>
            </header>

            <form onSubmit={submit} className="mt-6 space-y-5">
                <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="name">
                        الاسم الكامل
                    </label>

                    <input
                        id="name"
                        type="text"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        required
                        autoComplete="name"
                        placeholder="أدخل اسمك الكامل"
                    />

                    <InputError className="mt-1.5" message={errors.name} />
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="email">
                        البريد الإلكتروني
                    </label>

                    <input
                        id="email"
                        type="email"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        required
                        autoComplete="username"
                        placeholder="example@casher.com"
                    />

                    <InputError className="mt-1.5" message={errors.email} />
                </div>

                {mustVerifyEmail && user.email_verified_at === null && (
                    <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl">
                        <p className="text-xs text-amber-300">
                            بريدك الإلكتروني غير مؤكد بعد.
                            <Link
                                href={route('verification.send')}
                                method="post"
                                as="button"
                                className="mr-2 underline font-bold text-amber-400 hover:text-amber-200"
                            >
                                اضغط هنا لإعادة إرسال رابط التأكيد
                            </Link>
                        </p>

                        {status === 'verification-link-sent' && (
                            <div className="mt-2 text-xs font-semibold text-emerald-400">
                                تم إرسال رابط التحقق إلى بريدك الإلكتروني بنجاح.
                            </div>
                        )}
                    </div>
                )}

                <div className="flex items-center gap-4 pt-2">
                    <button
                        type="submit"
                        disabled={processing}
                        className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition shadow-lg shadow-indigo-600/30 disabled:opacity-50 flex items-center gap-2"
                    >
                        <span>حفظ التعديلات</span>
                    </button>

                    <Transition
                        show={recentlySuccessful}
                        enter="transition ease-in-out duration-300"
                        enterFrom="opacity-0 translate-y-1"
                        leave="transition ease-in-out duration-300"
                        leaveTo="opacity-0"
                    >
                        <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                            <CheckCircle2 size={15} />
                            <span>تم حفظ التعديلات بنجاح!</span>
                        </div>
                    </Transition>
                </div>
            </form>
        </section>
    );
}
