import '../css/app.css';
import './bootstrap';

import { createInertiaApp, router } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';

const appName = import.meta.env.VITE_APP_NAME || 'Casher';

// تأمين معاملات Ziggy الافتراضية في المتصفح لمنع أي خطأ لمعامل tenant
if (typeof window !== 'undefined' && window.Ziggy) {
    window.Ziggy.defaults = window.Ziggy.defaults || {};
    if (!window.Ziggy.defaults.tenant) {
        window.Ziggy.defaults.tenant = 'default';
    }
}

if (typeof window !== 'undefined') {
    router.on('navigate', (event) => {
        if (window.Ziggy) {
            window.Ziggy.defaults = window.Ziggy.defaults || {};
            const slug = event.detail?.page?.props?.tenant?.slug;
            if (slug) {
                window.Ziggy.defaults.tenant = slug;
            }
        }
    });
}

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.jsx`,
            import.meta.glob('./Pages/**/*.jsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        if (typeof window !== 'undefined' && window.Ziggy && props?.initialPage?.props?.tenant?.slug) {
            window.Ziggy.defaults = window.Ziggy.defaults || {};
            window.Ziggy.defaults.tenant = props.initialPage.props.tenant.slug;
        }

        root.render(<App {...props} />);
    },
    progress: {
        color: '#6366f1',
    },
});
