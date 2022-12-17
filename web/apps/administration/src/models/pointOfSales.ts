export interface PointOfSale {
  id: number;
  name: string;
  kind: string;
}

export interface PointOfSaleConfig {
  id: number;
  name: string;
  productIds: number[];
}
