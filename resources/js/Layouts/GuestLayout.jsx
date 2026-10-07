import ApplicationLogo from '@/Components/ApplicationLogo';

export default function GuestLayout({ children }) {
    return (
        <div dir="rtl" className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 py-8 font-sans selection:bg-indigo-500 selection:text-white">
            <div className="mb-6">
                <a href="/" className="transition hover:opacity-90">
                    <ApplicationLogo withText={true} className="w-14 h-14" textClassName="text-white text-2xl" />
                </a>
            </div>

            <div className="w-full overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur sm:max-w-md">
                {children}
            </div>

            <div className="mt-8 text-center text-xs text-slate-500">
                <span>نظام كاشير وسيارات جملة • يعمل أونلاين وأوفلاين</span>
            </div>
        </div>
    );
}
