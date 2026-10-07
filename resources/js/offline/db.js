import Dexie from 'dexie';

// إنشاء قاعدة بيانات Dexie المحلية داخل متصفح الكاشير
export const db = new Dexie('CasherPOSDB');

db.version(1).stores({
    products: 'id, barcode, name, retail_price, cost_price, category_id, stock_quantity',
    categories: 'id, name, color',
    offline_invoices: 'offline_uuid, invoice_number, synced, created_at',
});

/**
 * حفظ أو تحديث المنتجات والأقسام في كاش المتصفح المحلي
 */
export async function syncCatalogToIndexedDB(products = [], categories = []) {
    try {
        await db.transaction('rw', db.products, db.categories, async () => {
            if (products.length > 0) {
                await db.products.clear();
                await db.products.bulkPut(products);
            }
            if (categories.length > 0) {
                await db.categories.clear();
                await db.categories.bulkPut(categories);
            }
        });
        return true;
    } catch (error) {
        console.error('Failed to sync catalog to IndexedDB:', error);
        return false;
    }
}

/**
 * البحث عن صنف بواسطة الباركود محلياً
 */
export async function getProductByBarcodeOffline(barcode) {
    if (!barcode) return null;
    return await db.products.where('barcode').equals(barcode.trim()).first();
}

/**
 * البحث عن أصناف بالاسم أو القسم محلياً
 */
export async function searchProductsOffline(query = '', categoryId = null) {
    try {
        let collection = db.products.toCollection();
        let items = await collection.toArray();

        if (categoryId) {
            items = items.filter(p => Number(p.category_id) === Number(categoryId));
        }

        if (query && query.trim() !== '') {
            const q = query.toLowerCase().trim();
            items = items.filter(p => 
                (p.name && p.name.toLowerCase().includes(q)) || 
                (p.barcode && String(p.barcode).includes(q))
            );
        }

        return items;
    } catch (error) {
        console.error('searchProductsOffline failed:', error);
        return [];
    }
}

/**
 * حفظ فاتورة جديدة أوفلاين في المتصفح
 */
export async function saveOfflineInvoiceToIndexedDB(invoiceData) {
    try {
        const record = {
            ...invoiceData,
            synced: 0, // 0 = معلقة، 1 = تمت المزامنة
            created_at: new Date().toISOString(),
        };

        await db.offline_invoices.put(record);

        // خصم الكمية محلياً في الـ IndexedDB عشان الكاشير يشوف الرصيد المتبقي
        for (const item of invoiceData.items) {
            const localProduct = await db.products.get(item.product_id);
            if (localProduct) {
                await db.products.update(item.product_id, {
                    stock_quantity: (localProduct.stock_quantity || 0) - item.quantity
                });
            }
        }

        return record;
    } catch (error) {
        console.error('Failed to save offline invoice:', error);
        throw error;
    }
}

/**
 * جلب جميع الفواتير المعلقة غير المتزامنة
 */
export async function getPendingOfflineInvoices() {
    return await db.offline_invoices.where('synced').equals(0).toArray();
}

/**
 * تحديث حالة الفواتير إلى متزامنة بعد استلام رد السيرفر
 */
export async function markInvoicesAsSyncedInIndexedDB(uuids = []) {
    if (!uuids || uuids.length === 0) return;

    await db.transaction('rw', db.offline_invoices, async () => {
        for (const uuid of uuids) {
            await db.offline_invoices.update(uuid, { synced: 1 });
        }
    });
}
