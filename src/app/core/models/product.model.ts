export interface Product {
  id: number;
  productId: number;
  materialCode: string | null;
  materialName: string;
  productImage: string | null;
  mensurationUnit: string;
  mensurationType: string;
  salePrice: number;
  gstPercent: number | null;
  primaryUnitId: number;
  taxPercentage: number;
  computationMethod: string | null;
  componentTaxList: any | null;
  stateCode: string;
  availableStock: number;

  // Additional properties used in UI components or DB indexing
  categoryName?: string | null;
  materialGroupName?: string | null;
  mrp?: number;
  rate?: number;
  price?: number;
  saleRate?: number;
}
