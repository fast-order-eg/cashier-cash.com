import React from 'react';

export default function ApplicationLogo({ className = "w-10 h-10", withText = false, textClassName = "text-white", ...props }) {
    return (
        <div className={`inline-flex items-center gap-3 ${props.containerClassName || ''}`}>
            <svg
                viewBox="0 0 64 64"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className={className}
                {...props}
            >
                <defs>
                    <linearGradient id="casherGradientPrimary" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#4F46E5" />
                        <stop offset="50%" stopColor="#7C3AED" />
                        <stop offset="100%" stopColor="#9333EA" />
                    </linearGradient>
                    <linearGradient id="casherAccentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#10B981" />
                        <stop offset="100%" stopColor="#06B6D4" />
                    </linearGradient>
                    <linearGradient id="screenGloss" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.02" />
                    </linearGradient>
                    <filter id="logoGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#6366F1" floodOpacity="0.35" />
                    </filter>
                </defs>

                {/* Base Card / Squircle */}
                <rect 
                    x="2" 
                    y="2" 
                    width="60" 
                    height="60" 
                    rx="16" 
                    fill="url(#casherGradientPrimary)" 
                    filter="url(#logoGlow)"
                />

                {/* Inner Screen Bezel */}
                <rect 
                    x="10" 
                    y="10" 
                    width="44" 
                    height="32" 
                    rx="7" 
                    fill="#0F172A" 
                    stroke="#334155" 
                    strokeWidth="1.5" 
                />

                {/* Screen Gloss Overlay */}
                <path 
                    d="M10 17C10 13.134 13.134 10 17 10H47C50.866 10 54 13.134 54 17L10 32V17Z" 
                    fill="url(#screenGloss)" 
                />

                {/* Screen Content: POS Scanner Line / Wifi Waves (Online & Offline Indicator) */}
                <circle cx="16" cy="16" r="2" fill="#10B981" />
                <path d="M21 16H29" stroke="#38BDF8" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M33 16H48" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" />

                {/* POS Receipt Wave / Sales Flow */}
                <path 
                    d="M16 28L24 22L32 26L42 18L48 22" 
                    stroke="url(#casherAccentGrad)" 
                    strokeWidth="2.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                />

                {/* Stand Neck */}
                <path 
                    d="M26 42H38L40 48H24L26 42Z" 
                    fill="#1E293B" 
                    stroke="#475569" 
                    strokeWidth="1" 
                />

                {/* Stand Base / Cash Drawer / Card Reader */}
                <rect 
                    x="14" 
                    y="48" 
                    width="36" 
                    height="8" 
                    rx="3" 
                    fill="#0F172A" 
                    stroke="#334155" 
                    strokeWidth="1.5" 
                />

                {/* Card Insertion Slot / Receipt Cutter */}
                <line x1="20" y1="52" x2="44" y2="52" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" />
            </svg>

            {withText && (
                <div className="flex flex-col text-right">
                    <div className="flex items-center gap-1.5">
                        <span className={`font-black text-xl tracking-tight ${textClassName}`}>Casher</span>
                        <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            POS
                        </span>
                    </div>
                    <span className="text-[11px] text-indigo-400 font-semibold -mt-0.5 tracking-wide">
                        كاشير وسيارات جملة
                    </span>
                </div>
            )}
        </div>
    );
}
