/**
 * Format number as integer (no decimals/piasters) with English digits and thousand separators.
 * e.g., 1250.75 -> "1,251"
 */
export function formatNumber(value) {
    if (value === null || value === undefined || isNaN(Number(value))) {
        return '0';
    }
    const intVal = Math.round(Number(value));
    return new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 0,
        useGrouping: true,
    }).format(intVal);
}

/**
 * Format currency without piasters with English digits.
 * e.g., 1250.75 -> "1,251 ج.م"
 */
export function formatCurrency(value, currency = 'ج.م') {
    return `${formatNumber(value)} ${currency}`;
}

/**
 * Format date in English (YYYY-MM-DD)
 * e.g., "2026-09-29"
 */
export function formatDate(dateValue) {
    if (!dateValue) return '-';
    try {
        const d = new Date(dateValue);
        if (isNaN(d.getTime())) return '-';
        return d.toLocaleDateString('en-CA'); // en-CA outputs YYYY-MM-DD
    } catch (e) {
        return String(dateValue);
    }
}

/**
 * Format date and time in English digits (YYYY-MM-DD hh:mm A)
 * e.g., "2026-09-29 05:30 PM"
 */
export function formatDateTime(dateValue) {
    if (!dateValue) return '-';
    try {
        const d = new Date(dateValue);
        if (isNaN(d.getTime())) return '-';
        
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        }).format(d);
    } catch (e) {
        return String(dateValue);
    }
}

export default {
    formatNumber,
    formatCurrency,
    formatDate,
    formatDateTime,
};
