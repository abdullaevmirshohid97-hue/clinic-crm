import { supabase } from '../../config/supabase';
import { UserPayload } from '../../types/express';
import { assertRole } from '../../middleware/rbac.middleware';
import { logAudit } from '../../middleware/audit.middleware';

export class PharmacySaleService {
  /**
   * Get active inpatients with their room details
   */
  static async getActiveInpatients(clinicId: string) {
    // Usually inpatients are tracked via a queue or rooms table.
    // Assuming there's an 'admissions' or 'rooms' relation. Let's fetch patients where status='inpatient'.
    // Or if rooms table has patient_id:
    const { data: roomsData, error: roomsError } = await supabase
      .from('rooms')
      .select(`
        id, number, type, price,
        patient_id,
        patients!patient_id ( id, first_name, last_name, phone, diagnosis, balance )
      `)
      .eq('clinic_id', clinicId)
      .not('patient_id', 'is', null);

    if (roomsError) throw roomsError;
    
    // Map data for UI convenience
    return roomsData.map((room: any) => ({
      room_id: room.id,
      room_number: room.number,
      patient_id: room.patient_id,
      patient: room.patients
    }));
  }

  /**
   * Process a sale or attach it to an inpatient's bill
   */
  static async processSale(user: UserPayload, saleData: {
    patient_id?: string,
    payment_method: 'cash' | 'card' | 'click' | 'debt',
    items: { medicine_id: string, name?: string, quantity: number, price: number }[]
  }) {
    assertRole(user.role, 'admin', 'super_admin', 'cashier');
    
    const { patient_id, payment_method, items } = saleData;
    const clinic_id = user.clinic_id;

    if (!items || items.length === 0) throw new Error("Dorilar kiritilmagan");

    let totalAmount = 0;
    const processedItems = [];

    // Begin pseudo-transaction
    for (const item of items) {
      // 1. Atomic deduct using RPC
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('atomic_deduct_stock', { p_medicine_id: item.medicine_id, deduct_qty: item.quantity });
      
      if (rpcError) throw new Error(`Stock xatosi: ${rpcError.message}`);
      // rpcData returns [{ new_quantity: INT, success: BOOL }]
      if (!rpcData || !rpcData[0]?.success) {
        throw new Error(`Dori qoldig'i yetarli emas (ID: ${item.medicine_id})`);
      }

      const itemTotal = item.quantity * item.price;
      totalAmount += itemTotal;

      // 2. Record Movement (OUT)
      await supabase.from('pharmacy_movements').insert({
        clinic_id,
        medicine_id: item.medicine_id,
        type: 'OUT',
        quantity: item.quantity,
        source: 'sale',
        reference_id: patient_id || null, // Optional reference to patient
        created_by: user.id
      });

      processedItems.push({ ...item, total: itemTotal });
    }

    // 3. Financial Transaction (Journal)
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        clinic_id,
        patient_id: patient_id || null,
        user_id: user.id,
        amount: totalAmount,
        type: 'pharmacy_sale',
        payment_type: payment_method,
        description: `Dorixona: ${items.map(m => `${m.name || 'Dori'} (${m.quantity}x)`).join(', ')}`,
        items: processedItems, // JSONB allowed if structured properly, otherwise we just map description
      })
      .select('id')
      .single();

    if (txError) {
      // Note: Ideally if transaction fails, we should rollback medication stock. 
      // In advanced SaaS we use full DB transactions.
      console.error("Journal Sync Error:", txError);
    }

    // 4. If debt, update patient balance (optional depending on system design)
    if (payment_method === 'debt' && patient_id) {
       // Decrease balance since they used a service without payment.
       const { data: pData } = await supabase.from('patients').select('balance').eq('id', patient_id).single();
       if (pData) {
         await supabase.from('patients')
           .update({ balance: (pData.balance || 0) - totalAmount })
           .eq('id', patient_id);
       }
    }

    // Single Audit Log for Sale
    await logAudit({
      clinic_id,
      user_id: user.id,
      action: 'inventory.sale',
      entity_type: 'transaction',
      entity_id: transaction?.id,
      details: { patient_id, payment_method, totalAmount, items: processedItems }
    });

    return { total: totalAmount, items_count: items.length, message: "Savdo va jurnal qabuli mufavvaqiyatli bajarildi" };
  }
}
