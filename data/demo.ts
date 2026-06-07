import { BillState } from '@/lib/types';

export const demoState: BillState = {
  name: 'พฤษภาทมิฬ',
  eventDate: '2026-05-23',
  settings: {
    taxPercent: 0,
    servicePercent: 0,
    overallDiscount: 427.60,
    sharedPool: 207.69 * 10,
    currency: 'THB',
  },
  people: [
    { id: 'p1', name: 'ต้น', active: true, drinkTier: 'high' },
    { id: 'p2', name: 'วี่', active: true, drinkTier: 'mid' },
    { id: 'p3', name: 'กัน', active: true, drinkTier: 'mid' },
    { id: 'p4', name: 'พลอย', active: true, drinkTier: 'mid' },
    { id: 'p5', name: 'แมน', active: true, drinkTier: 'high' },
    { id: 'p6', name: 'เอิง', active: true, drinkTier: 'mid' },
    { id: 'p7', name: 'บิ๊ก', active: true, drinkTier: 'high' },
    { id: 'p8', name: 'ฟส', active: true, drinkTier: 'heavy' },
    { id: 'p9', name: 'อูม', active: true, drinkTier: 'low' },
    { id: 'p10', name: 'แนน', active: true, drinkTier: 'high' }
  ],
  items: [
    { id: 'i1', name: 'เอซิโรล', category: 'food', qty: 1, unitPrice: 129, discountPercent: 10, splitMode: 'owner', participantIds: [], ownerId: 'p4' },
    { id: 'i2', name: 'เฟรนฟราย', category: 'food', qty: 4, unitPrice: 99, discountPercent: 10, splitMode: 'selected', participantIds: ['p4','p5','p6'] },
    { id: 'i3', name: 'ชุดของทอด', category: 'food', qty: 1, unitPrice: 259, discountPercent: 10, splitMode: 'all', participantIds: [] },
    { id: 'i4', name: 'โปรเหล้า+มิกเซอร์', category: 'drink', qty: 1, unitPrice: 7995, discountPercent: 0, splitMode: 'weighted-tier', participantIds: [] },
    { id: 'i5', name: 'Jinro เซ็น', category: 'drink', qty: 1, unitPrice: 699, discountPercent: 0, splitMode: 'weighted-tier', participantIds: [] },
    { id: 'i6', name: 'น้ำแข็งใหญ่', category: 'mixer', qty: 17, unitPrice: 65, discountPercent: 10, splitMode: 'all', participantIds: [] },
    { id: 'i7', name: 'น้ำ', category: 'mixer', qty: 8, unitPrice: 45, discountPercent: 10, splitMode: 'all', participantIds: [] },
    { id: 'i8', name: 'ข้าวไข่เจียว', category: 'food', qty: 1, unitPrice: 70, discountPercent: 10, splitMode: 'owner', participantIds: [], ownerId: 'p6' }
  ]
};
