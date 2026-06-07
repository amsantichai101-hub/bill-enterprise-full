import { BillState, DrinkTier, PersonBreakdown } from '@/lib/types';

const tierWeightMap: Record<DrinkTier, number> = {
  none: 0,
  low: 0.5,
  mid: 1,
  high: 1.5,
  heavy: 2,
};

const round2 = (val: number) => Math.round((val + Number.EPSILON) * 100) / 100;

export function getNetItemTotal(qty: number, unitPrice: number, discountPercent: number) {
  const gross = qty * unitPrice;
  return round2(gross - gross * (discountPercent / 100));
}

export function calculateBill(state: BillState) {
  const activePeople = state.people.filter((p) => p.active);
  const breakdownMap: Record<string, PersonBreakdown> = Object.fromEntries(
    activePeople.map((p) => [
      p.id,
      { personId: p.id, name: p.name, shared: 0, weighted: 0, personal: 0, total: 0, details: [] },
    ])
  );

  const sharedPool = round2(state.settings.sharedPool);
  const serviceRate = state.settings.servicePercent / 100;
  const taxRate = state.settings.taxPercent / 100;

  if (activePeople.length > 0 && sharedPool > 0) {
    const perHead = round2(sharedPool / activePeople.length);
    activePeople.forEach((p) => {
      breakdownMap[p.id].shared += perHead;
      breakdownMap[p.id].details.push(`กองกลาง ${perHead.toFixed(2)}`);
    });
  }

  state.items.forEach((item) => {
    const net = getNetItemTotal(item.qty, item.unitPrice, item.discountPercent);
    if (net <= 0 || item.splitMode === 'none') return;

    if (item.splitMode === 'all') {
      const targets = activePeople;
      if (!targets.length) return;
      const each = round2(net / targets.length);
      targets.forEach((p) => {
        breakdownMap[p.id].shared += each;
        breakdownMap[p.id].details.push(`${item.name} ${each.toFixed(2)}`);
      });
      return;
    }

    if (item.splitMode === 'selected') {
      const targets = activePeople.filter((p) => item.participantIds.includes(p.id));
      if (!targets.length) return;
      const each = round2(net / targets.length);
      targets.forEach((p) => {
        breakdownMap[p.id].personal += each;
        breakdownMap[p.id].details.push(`${item.name} ${each.toFixed(2)}`);
      });
      return;
    }

    if (item.splitMode === 'owner' && item.ownerId && breakdownMap[item.ownerId]) {
      breakdownMap[item.ownerId].personal += net;
      breakdownMap[item.ownerId].details.push(`${item.name} ${net.toFixed(2)}`);
      return;
    }

    if (item.splitMode === 'weighted-tier') {
      const targets = activePeople.filter((p) => p.drinkTier !== 'none');
      const totalWeight = targets.reduce((sum, p) => sum + tierWeightMap[p.drinkTier], 0);
      if (!targets.length || totalWeight <= 0) return;
      targets.forEach((p) => {
        const amount = round2((net * tierWeightMap[p.drinkTier]) / totalWeight);
        breakdownMap[p.id].weighted += amount;
        breakdownMap[p.id].details.push(`${item.name} (${p.drinkTier}) ${amount.toFixed(2)}`);
      });
      return;
    }
  });

  const rows = Object.values(breakdownMap).map((row) => {
    row.total = round2(row.shared + row.weighted + row.personal);
    return row;
  });

  const subTotal = round2(rows.reduce((sum, row) => sum + row.total, 0));
  const serviceCharge = round2(subTotal * serviceRate);
  const taxCharge = round2((subTotal + serviceCharge) * taxRate);
  const overallDiscount = round2(state.settings.overallDiscount);

  rows.forEach((row) => {
    const ratio = subTotal > 0 ? row.total / subTotal : 0;
    const extra = round2(serviceCharge * ratio + taxCharge * ratio - overallDiscount * ratio);
    row.total = round2(row.total + extra);
    if (extra !== 0) row.details.push(`SC/VAT/Discount ${extra.toFixed(2)}`);
  });

  return {
    rows: rows.sort((a, b) => b.total - a.total),
    summary: {
      activePeople: activePeople.length,
      itemCount: state.items.length,
      rawSubTotal: round2(state.items.reduce((sum, item) => sum + getNetItemTotal(item.qty, item.unitPrice, item.discountPercent), 0)),
      serviceCharge,
      taxCharge,
      overallDiscount,
      grandTotal: round2(rows.reduce((sum, row) => sum + row.total, 0)),
    },
  };
}
