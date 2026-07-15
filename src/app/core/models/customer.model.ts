export interface Customer {
  id: number;
  customerName: string | null;
  mobileNo: string | null;
  creditLimit: number | null;
  balance: number | null;
  stateCode: string | null;
  billingType: string | null;
  
  // Additional properties used in UI components
  name?: string | null;
  phone?: string | null;
  balanceAtDairy?: number | null;
}
