import { BillState } from '@/lib/types';
import { supabase } from '@/lib/supabase';

export async function getBills() {
  return supabase
    .from('bills')
    .select('id, name, event_date, created_at, data')
    .order('created_at', { ascending: false });
}

/**
 * ดึง bill detail แบบไม่พึ่ง relational join
 * เพื่อเลี่ยง schema cache / relationship issue ของ Supabase
 */
export async function getBillDetail(id: string) {
  const billRes = await supabase
    .from('bills')
    .select('*')
    .eq('id', id)
    .single();

  if (billRes.error || !billRes.data) {
    return { data: null, error: billRes.error };
  }

  const peopleRes = await supabase
    .from('bill_people')
    .select('*')
    .eq('bill_id', id);

  const itemsRes = await supabase
    .from('bill_items')
    .select('*')
    .eq('bill_id', id);

  const participantsRes = await supabase
    .from('bill_item_participants')
    .select('*')
    .eq('bill_id', id);

  const people = peopleRes.data || [];
  const items = itemsRes.data || [];
  const participants = participantsRes.data || [];

  // map people db -> ui state
  const mappedPeople = people.map((p: any) => ({
    id: p.legacy_id || p.id,
    name: p.name,
    active: p.is_active ?? true,
    drinkTier: p.drink_tier || 'mid',
    note: p.note || '',
  }));

  // person db id -> legacy/ui id
  const personDbIdToLegacyId = Object.fromEntries(
    people.map((p: any) => [p.id, p.legacy_id || p.id])
  );

  // group participants by item db id
  const participantMap = participants.reduce((acc: Record<string, string[]>, row: any) => {
    const personLegacyId = personDbIdToLegacyId[row.person_id];
    if (!personLegacyId) return acc;

    if (!acc[row.item_id]) {
      acc[row.item_id] = [];
    }

    acc[row.item_id].push(personLegacyId);
    return acc;
  }, {});

  const mappedItems = items.map((item: any) => ({
    id: item.legacy_id || item.id,
    name: item.name,
    category: item.category || 'food',
    qty: item.qty ?? 1,
    unitPrice: Number(item.unit_price ?? 0),
    discountPercent: Number(item.discount_percent ?? 0),
    splitMode: item.split_mode || 'all',
    participantIds: participantMap[item.id] || [],
    ownerId: item.owner_person_id
      ? personDbIdToLegacyId[item.owner_person_id] || undefined
      : undefined,
    note: item.note || '',
  }));

  // ถ้ามี snapshot data เก็บไว้ใน bills.data ให้เอามาใช้ก่อน
  const snapshot = billRes.data.data;

  const finalState: BillState = snapshot
    ? {
        ...snapshot,
        id: billRes.data.id,
        name: billRes.data.name,
        eventDate: billRes.data.event_date || snapshot.eventDate,
      }
    : {
        id: billRes.data.id,
        name: billRes.data.name || '',
        eventDate: billRes.data.event_date || '',
        people: mappedPeople,
        items: mappedItems,
        settings: {
          taxPercent: 0,
          servicePercent: 0,
          overallDiscount: 0,
          sharedPool: 0,
          currency: 'THB',
        },
      };

  // ถ้า snapshot ไม่มี people/items ให้ fallback จาก normalized tables
  if (!finalState.people || finalState.people.length === 0) {
    finalState.people = mappedPeople;
  }

  if (!finalState.items || finalState.items.length === 0) {
    finalState.items = mappedItems;
  }

  return {
    data: finalState,
    error: peopleRes.error || itemsRes.error || participantsRes.error || null,
  };
}

export async function saveBill(state: BillState) {
  const billPayload = {
    name: state.name,
    event_date: state.eventDate || new Date().toISOString().slice(0, 10),
    data: state,
  };

  let billId = state.id;

  if (billId) {
    const { error } = await supabase
      .from('bills')
      .update(billPayload)
      .eq('id', billId);

    if (error) throw error;

    // ล้างลูกก่อน re-insert
    await supabase.from('bill_item_participants').delete().eq('bill_id', billId);
    await supabase.from('bill_items').delete().eq('bill_id', billId);
    await supabase.from('bill_people').delete().eq('bill_id', billId);
  } else {
    const { data, error } = await supabase
      .from('bills')
      .insert(billPayload)
      .select('id')
      .single();

    if (error) throw error;
    billId = data.id;
  }

  // people
  const peopleRows = state.people.map((p) => ({
    legacy_id: p.id,
    bill_id: billId,
    name: p.name,
    drink_tier: p.drinkTier,
    is_active: p.active,
    note: p.note || null,
  }));

  const { data: insertedPeople, error: peopleError } = await supabase
    .from('bill_people')
    .insert(peopleRows)
    .select('id, legacy_id');

  if (peopleError) throw peopleError;

  const peopleMap = Object.fromEntries(
    (insertedPeople || []).map((p: any) => [p.legacy_id, p.id])
  );

  // items
  const itemRows = state.items.map((item) => ({
    legacy_id: item.id,
    bill_id: billId,
    name: item.name,
    category: item.category,
    qty: item.qty,
    unit_price: item.unitPrice,
    discount_percent: item.discountPercent,
    split_mode: item.splitMode,
    owner_person_id: item.ownerId ? peopleMap[item.ownerId] ?? null : null,
    note: item.note || null,
  }));

  const { data: insertedItems, error: itemError } = await supabase
    .from('bill_items')
    .insert(itemRows)
    .select('id, legacy_id');

  if (itemError) throw itemError;

  const itemMap = Object.fromEntries(
    (insertedItems || []).map((i: any) => [i.legacy_id, i.id])
  );

  // participants
  const participantRows = state.items
    .flatMap((item) =>
      (item.participantIds || []).map((personId) => ({
        bill_id: billId,
        item_id: itemMap[item.id],
        person_id: peopleMap[personId],
      }))
    )
    .filter((x) => x.item_id && x.person_id);

  if (participantRows.length > 0) {
    const { error: partError } = await supabase
      .from('bill_item_participants')
      .insert(participantRows);

    if (partError) throw partError;
  }

  return billId;
}