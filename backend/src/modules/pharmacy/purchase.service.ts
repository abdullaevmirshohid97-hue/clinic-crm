import { supabase } from '../../config/supabase';
import { UserPayload } from '../../types/express';
import { assertRole } from '../../middleware/rbac.middleware';
import { logAudit } from '../../middleware/audit.middleware';

export class PurchaseService {
  /**
   * Process an inbound shipment (Factura/Excel or Manual)
   * Items constraint: { name, category, quantity, price, expiry_date, batch_number }
   */
  static async processPurchaseFlow(user: UserPayload, purchaseData: { supplier_id: string, invoice_number?: string, items: any[] }) {
    assertRole(user.role, 'admin', 'super_admin', 'warehouse_manager');
    
    const { supplier_id, invoice_number, items } = purchaseData;
    const clinic_id = user.clinic_id;

    if (!items || items.length === 0) throw new Error("Facturada dorilar kiritilmagan");

    const processedItems = [];

    // Loop through items and update/insert inventory
    for (const item of items) {
      // 1. Check if same medicine exists (fuzzy match by name & batch)
      // For strict pharmaceutical tracking, different batch = different inventory line or same line merged.
      // We will insert as new lines if strict batching is required, but standard is find existing name.

      const { data: existingData } = await supabase
        .from('pharmacy_inventory')
        .select('*')
        .ilike('name', `%${item.name}%`)
        .eq('clinic_id', clinic_id)
        .eq('is_deleted', false)
        .order('id')
        .limit(1)
        .single();

      let medId;

      if (existingData) {
        // Update existing stock
        const newQty = existingData.quantity + item.quantity;
        const { error: updateError } = await supabase
          .from('pharmacy_inventory')
          .update({
             quantity: newQty, 
             supplier_id: supplier_id,
             batch_number: item.batch_number || existingData.batch_number,
             price: item.price || existingData.price // auto price suggest can modify this later
          })
          .eq('id', existingData.id);
        
        if (updateError) throw updateError;
        medId = existingData.id;
        processedItems.push({ id: medId, action: 'updated', details: item });
      } else {
        // Create new item
        const { data: newData, error: insertError } = await supabase
          .from('pharmacy_inventory')
          .insert({
            clinic_id,
            name: item.name,
            category: item.category || 'boshqa',
            quantity: item.quantity,
            price: item.price || 0,
            expiry_date: item.expiry_date || null,
            batch_number: item.batch_number || null,
            supplier_id,
            unit: item.unit || 'dona'
          })
          .select('id')
          .single();

        if (insertError) throw insertError;
        medId = newData.id;
        processedItems.push({ id: medId, action: 'inserted', details: item });
      }

      // Record strict movement
      await supabase.from('pharmacy_movements').insert({
        clinic_id,
        medicine_id: medId,
        type: 'IN',
        quantity: item.quantity,
        source: invoice_number ? `factura_${invoice_number}` : 'purchase_batch',
        reference_id: supplier_id,
        created_by: user.id
      });
    }

    // Single Audit Log for entire Purchase
    await logAudit({
      clinic_id,
      user_id: user.id,
      action: 'inventory.purchase_flow',
      entity_type: 'pharmacy_supplier',
      entity_id: supplier_id,
      details: { invoice_number, total_items: items.length, summary: processedItems }
    });

    return { processed_items: items.length, message: "Kirim muvaffaqiyatli saqlandi" };
  }
}
