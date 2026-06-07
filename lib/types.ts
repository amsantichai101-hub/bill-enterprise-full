export type Category = 'food' | 'drink' | 'mixer' | 'shared' | 'personal';
export type SplitMode = 'all' | 'selected' | 'owner' | 'weighted-tier' | 'none';
export type DrinkTier = 'none' | 'low' | 'mid' | 'high' | 'heavy';

export interface Person {
  id: string;
  name: string;
  active: boolean;
  drinkTier: DrinkTier;
  note?: string;
}

export interface Item {
  id: string;
  name: string;
  category: Category;
  qty: number;
  unitPrice: number;
  discountPercent: number;
  splitMode: SplitMode;
  participantIds: string[];
  ownerId?: string;
  note?: string;
}

export interface AppSettings {
  taxPercent: number;
  servicePercent: number;
  overallDiscount: number;
  sharedPool: number;
  currency: string;
}

export interface BillState {
  id?: string;
  name: string;
  eventDate?: string;
  people: Person[];
  items: Item[];
  settings: AppSettings;
}

export interface PersonBreakdown {
  personId: string;
  name: string;
  shared: number;
  weighted: number;
  personal: number;
  total: number;
  details: string[];
}
