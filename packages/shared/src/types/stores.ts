
export enum StoreCategory {
  LUNCH = 'LUNCH',
  DINNER = 'DINNER',
  COFFEE = 'COFFEE',
  TEA = 'TEA',
  DESSERT = 'DESSERT',
  FAST_FOOD = 'FAST_FOOD',
}

export interface Store {
  id: string;
  name: string;
  description: string | null;
  category: StoreCategory;
  logoUrl: string | null;
  coverUrl: string | null;
  rating: number;
  totalOrders: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
