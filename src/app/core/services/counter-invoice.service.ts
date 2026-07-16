import { Injectable, inject } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import { ApiService } from './api.service';
import { SessionService } from './session.service';
import { ElectronService } from './electron.service';
import { CartItem } from './counter-sale.service';
import { MatSnackBar } from '@angular/material/snack-bar';

const DEFAULT_CONSTANTS = {
  VOUCHER_TYPE_SALE: 1,
  SERVER_ID: 0,
  F_YEAR_ID: 0,
  IS_DELETED: 0,
  IS_TALLY_EXPORT: 0
};

@Injectable({
  providedIn: 'root'
})
export class CounterInvoiceService {
  private apiService = inject(ApiService);
  private sessionService = inject(SessionService);
  private electronService = inject(ElectronService);
  private snackBar = inject(MatSnackBar);
  private paymentList$?: Observable<any>;

  get userDetails() {
    const userStr = localStorage.getItem('UserDetails');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (e) {
        console.error('Failed to parse UserDetails from localStorage:', e);
      }
    }
    return { id: 0 };
  }

  fetchSessionBillStats(userId: number): Observable<any> {
    return this.apiService.get<any>(`api/v1/session/bill/${userId}`);
  }

  loadInvoiceByBillNo(billNo: string): Observable<any> {
    return this.apiService.get<any>(`api/v1/invoice/byId_V1?billNo=${billNo}`);
  }

  computeTax(materialId: number, totalPrice: number, custStateCode: number, orgStateCode: number): Observable<any> {
    return this.apiService.get<any>(`api/v1/invoice/GetComputeTax?MaterialId=${materialId}&TotalPrice=${totalPrice}&CustStateCode=${custStateCode}&OrgStateCode=${orgStateCode}`);
  }

  getRateList(organizationId: number, customerId: number, materialId: number): Observable<any> {
    return this.apiService.get<any>(`api/v1/pricelist/GetRateList?OrganizationId=${organizationId}&CustomerId=${customerId}&MaterialId=${materialId}`);
  }

  private getParticularsText(mode: string): string {
    if (mode === 'Credit' || mode === 'Coupon') return 'Credit/Coupon Payment';
    if (mode === 'Online') return 'Bank Payment';
    return `${mode} Entry`;
  }

  async saveInvoice(
    cartItems: CartItem[],
    totals: {
      subTotal: number;
      totalDiscount: number;
      totalGst: number;
      billAmount: number;
      roundOff: number;
      totalPayable: number;
      totalCgst?: number;
      totalSgst?: number;
      totalIgst?: number;
    },
    selectedCustomer: any | null,
    paymentMode: 'cash' | 'online' | 'card',
    existingInvoiceHeader?: {
      invoiceId: number | null;
      invoiceNo: string | null;
      invoiceDate: string | null;
    },
    loadedOrder?: any | null
  ): Promise<any> {
    const isUpdate = !!existingInvoiceHeader?.invoiceId;
    const now = new Date().toISOString();
    const userDetails = this.userDetails;

    const unitId = userDetails?.unitid || userDetails?.unitId || 0;
    const userId = userDetails?.id || 0;
    const organizationId = userDetails?.organizationId || 0;

    // Determine counterSaleTypeId and Mode properties
    let counterSaleTypeId = 1; // 1=Cash
    let modeOfPaymentId = 1;
    let modeString = "Cash";
    let isPaymentReceived = 1;

    if (paymentMode === 'online') {
      counterSaleTypeId = 2;
      modeOfPaymentId = 4;
      modeString = "Online";
    } else if (paymentMode === 'card') {
      const billingType = selectedCustomer?.billingType?.toLowerCase();
      counterSaleTypeId = billingType === 'prepaid' ? 4 : 3;
      modeOfPaymentId = 0;
      modeString = billingType === 'prepaid' ? "Coupon" : "Credit";
      isPaymentReceived = 0;
    }

    const savedSettingsStr = localStorage.getItem('posSettings');
    let savedSettings: any = null;
    if (savedSettingsStr) {
      try {
        savedSettings = JSON.parse(savedSettingsStr);
      } catch (e) { }
    }

    if (!savedSettings || !savedSettings.saleLedger || !savedSettings.companyLedger || !savedSettings.cashAccount || !savedSettings.godown || !savedSettings.discountType) {
      this.snackBar.open("Please complete POS Settings first, then save the form.", "Close", { duration: 3000 });
      return Promise.reject("Please complete POS Settings first, then save the form.");
    }

    const customer = selectedCustomer;
    let partyId = 0;
    if (customer && customer.id) {
      partyId = customer.id;
    } else {
      partyId = savedSettings.saleLedger.id;
    }

    let companyLedgerId = savedSettings.companyLedger.id;

    let bankCashLedger = 0;
    let bankCashLedgerName = "";
    try {
      if (paymentMode === 'cash') {
        bankCashLedger = savedSettings.cashAccount.id;
        bankCashLedgerName = savedSettings.cashAccount.name || "";
      } else {
        if (savedSettings.bankAccount) {
          bankCashLedger = savedSettings.bankAccount.id || 0;
          bankCashLedgerName = savedSettings.bankAccount.name || "";
        }
      }
    } catch (e) {
      console.error('Failed to load BankAccounts from indexedDB', e);
    }

    const invoiceDetails = cartItems.map(item => {
      const discountAmount = parseFloat((item.amount * item.discount / 100).toFixed(2));
      const gstonAmount = parseFloat(((item.quantity * item.rate) - (discountAmount + item.gstAmount)).toFixed(2));
      const dynamicSubTotal = item.quantity * item.rate //(item.quantity * item.rate - discountAmount);

      return {
        id: 0,
        dcDetailsId: 0,
        invoiceId: isUpdate ? (existingInvoiceHeader?.invoiceId ?? 0) : 0,
        materialId: item.product?.id || item.product?.code || 0,
        materialUnitId: item.product?.unitId || item.product?.materialUnitId || 0,
        quantity: item.quantity,
        rate: item.rate,
        discount: item.discount,
        total: item.total,
        purchaseOrderId: 0,
        discountAmount: discountAmount,
        gstonAmount: gstonAmount,
        igst: (item.dynamicTaxes?.find(t => t.componentName.includes('IGST'))?.taxAmount || 0).toFixed(2),
        cgst: (item.dynamicTaxes?.find(t => t.componentName.includes('CGST'))?.taxAmount || (item.gstAmount / 2)).toFixed(2),
        sgst: (item.dynamicTaxes?.find(t => t.componentName.includes('SGST'))?.taxAmount || (item.gstAmount / 2)).toFixed(2),
        subTotal: parseFloat(dynamicSubTotal.toFixed(2)),
        unitId: unitId,
        serverId: 0,
        StockHistoryLocalId: savedSettings.godown.id || 0,
        invoiceDetailsTaxComponent: item.dynamicTaxes && item.dynamicTaxes.length > 0 ? item.dynamicTaxes.map(t => ({
          amount: t.taxAmount || 0,
          componentId: t.id || 1,
          taxLabel: t.componentName || 'CGST 0%'
        })) : []
      };
    });

    const payload = {
      sessionId: this.sessionService.getSessionId() ? parseInt(this.sessionService.getSessionId() || '0', 10) : null,
      createdDate: now,
      modifiedDate: now,
      isDeleted: false,
      id: isUpdate ? (existingInvoiceHeader?.invoiceId ?? 0) : userId,
      invoiceDate: isUpdate ? (existingInvoiceHeader?.invoiceDate ?? now) : now,
      partyId: partyId,
      companyLedgerId: companyLedgerId,
      createdBy: userId,
      modifiedBy: userId,
      orderId: +loadedOrder?.orderId || +selectedCustomer?.orderId || 0,
      organizationId: organizationId,
      voucherTypeId: 1,
      discountAmount: totals.totalDiscount.toFixed(2),
      totalAmount: totals.totalPayable.toFixed(2),
      roundOff: totals.roundOff.toFixed(2),
      paymentNote: "",
      deliveryNote: "",
      deliveryNoteDate: "",
      supplierBillNo: "",
      supplierBillDate: "",
      supplerRefNo: "",
      otherRefNo: "",
      buyerPONumber: "",
      buyerPODate: "",
      dispatchDetails: "",
      termsOfDelivery: "",
      purchaseOrderNo: "",
      purchaseOrderDate: "",
      isBillPaid: 1,
      invoiceType: 1,
      purchaseOrderId: 0,
      isTallyExport: 0,
      returnInvoiceId: 0,
      counterNo: 0,
      counterSaleTypeId: counterSaleTypeId,
      isCounterSale: 1,
      unitId: unitId,
      serverId: 0,
      chalanNo: 0,
      invoiceNo: isUpdate ? (existingInvoiceHeader?.invoiceNo ?? "") : "",
      fYearId: 0,
      igst: (totals.totalIgst || 0).toFixed(2),
      cgst: (totals.totalCgst || (totals.totalGst / 2)).toFixed(2),
      sgst: (totals.totalSgst || (totals.totalGst / 2)).toFixed(2),
      stateFlag: 1,
      isPaymentReceived: isPaymentReceived,
      isOrder: loadedOrder ? 1 : 0,
      isPrint: false, // Managed programmatically in print receipt
      spinvoicedetailsModel: invoiceDetails,
      ledgerTransaction: {
        id: 0,
        ledger1: partyId,
        ledger2: companyLedgerId,
        bankCashLedger: bankCashLedger,
        credit: parseFloat(totals.totalPayable.toFixed(2)),
        debit: parseFloat(totals.totalPayable.toFixed(2)),
        ledgerAmount: parseFloat(totals.totalPayable.toFixed(2)),
        transactionDate: now,
        modeOfPaymentId: modeOfPaymentId,
        modeOfPayment: modeString == 'Credit' || modeString == 'Coupon' ? "Credit/Coupon" : modeString,
        transactionTypeId: isUpdate ? (existingInvoiceHeader?.invoiceId ?? 0) : 0,
        transactionType: "",
        transactionId: isUpdate ? (existingInvoiceHeader?.invoiceId ?? 0) : 0,
        transactionNo: "",
        narration: this.getParticularsText(modeString),
        referenceId: 0,
        groupId: 0,
        chequeDate: now,
        isTallyExport: DEFAULT_CONSTANTS.IS_TALLY_EXPORT,
        tallyReferenceId: 0,
        particularsText: this.getParticularsText(modeString),
        voucherTypeId: DEFAULT_CONSTANTS.VOUCHER_TYPE_SALE,
        voucherSubTypeId: 0,
        voucherSubType: "",
        fYearId: DEFAULT_CONSTANTS.F_YEAR_ID,
        unitId: unitId,
        organizationId: organizationId,
        serverId: DEFAULT_CONSTANTS.SERVER_ID,
        createdBy: userId,
        createdDate: now,
        modifiedBy: userId,
        isOpeningBalance: 0,
        showDate: now,
        isDeleted: DEFAULT_CONSTANTS.IS_DELETED,
        billNumber: isUpdate ? (existingInvoiceHeader?.invoiceNo ?? "") : "",
        fBillId: 0,
        selectedPartyName: customer ? (customer.customerName || customer.name) : 'Daily Cash Counter Party',
        selectedBankName: paymentMode === 'cash' || modeString === 'Credit' || modeString == 'Coupon' ? 'Cash Sale' : modeString == 'Online' ? bankCashLedgerName : modeString,
        remarks: "",
        inFavorPartyId: 0,
        inFavorPartyName: "",
        groupIdForBulk: 0,
        upiId: ""
      }
    }

    console.log(payload);
    return;
    const endpoint = isUpdate ? 'api/v1/invoice/UpdateSale_V1' : 'api/v1/invoice/Sale_V1';
    return firstValueFrom(this.apiService.post<any>(endpoint, payload));
  }

  printReceipt(
    invoiceData: any,
    cartItems: CartItem[],
    totals: {
      subTotal: number;
      totalDiscount: number;
      totalGst: number;
      billAmount: number;
      roundOff: number;
      totalPayable: number;
      totalCgst?: number;
      totalSgst?: number;
      totalIgst?: number;
    }
  ) {
    const userDetails = this.userDetails;
    const now = new Date().toISOString();

    const itemsToPrint = cartItems.map(item => ({
      name: (item.product?.name || item.product?.code || 'Product') + " (" + (item.product?.mensurationUnit || item.product?.unit || '') + ")",
      rate: item.rate,
      quantity: item.quantity,
      discount: (item.rate * item.quantity * item.discount / 100).toFixed(2),
      price: item.total
    }));

    const totalSum = cartItems.reduce((sum, item) => sum + (item.rate || 0), 0);

    const printPayload = {
      UnitName: invoiceData.unitName || userDetails?.unitName || 'Hi-Tech Dairy',
      UnitAdd: invoiceData.unitAddress || userDetails?.unitAddress || '',
      UnitMobile: invoiceData.unitMobileNo || userDetails?.unitMobileNo || '',
      FssaiLicNo: userDetails?.fssailicNo || '',
      GSTNo: invoiceData.gstNo || userDetails?.gstNo || '',
      invoiceId: (invoiceData.id || '') + "/" + (invoiceData.invoiceNo || ''),
      title: 'Sales Receipt',
      timestamp: invoiceData.invoiceDate || now,
      items: itemsToPrint,
      totals: {
        total: totalSum.toFixed(2),
        subTotal: cartItems.reduce((sum, item) => sum + (item.rate * item.quantity), 0).toFixed(2),
        discountPercent: '',
        discount: totals.totalDiscount.toFixed(2),
        sgst: (totals.totalSgst || (totals.totalGst / 2)).toFixed(2),
        cgst: (totals.totalCgst || (totals.totalGst / 2)).toFixed(2),
        igst: (totals.totalIgst || 0).toFixed(2),
        billAmount: totals.billAmount.toFixed(2),
        roundOff: totals.roundOff.toFixed(2),
        totalPayable: totals.totalPayable.toFixed(2)
      }
    };

    this.electronService.sendPrintData(printPayload);
  }

  getOrderList(textSearch?: string, deliveryStatus: string = 'Upcoming'): Observable<any> {
    const userDetailsStr = localStorage.getItem('UserDetails');
    let userDetails: any = null;
    try { if (userDetailsStr) userDetails = JSON.parse(userDetailsStr); } catch (e) { }

    const organizationId = userDetails?.organizationId || 28;
    const unitId = userDetails?.unitid || userDetails?.unitId || 0;

    let url = `api/v1/Order/getOrderList?organizationId=${organizationId}&unitId=${unitId}&status=${deliveryStatus}`;
    if (textSearch) {
      url += `&textSearch=${encodeURIComponent(textSearch)}`;
    }
    return this.apiService.get<any>(url);
  }

  getOrderById(orderId: number, unitId: number = 0): Observable<any> {
    return this.apiService.get<any>(`api/v1/Order/getOrdersById?OrderId=${orderId}&unitId=${unitId}&status=Upcoming`);
  }

  updateOrderStatus(orderId: number, status: string = 'delivered'): Observable<any> {
    return this.apiService.get<any>(`api/v1/Order/GetOrdersbyId?OrderId=${orderId}&status=${status}`);
  }

  getCustomerLedger(params: {
    partyId: number;
    organizationId?: number;
    unitId?: number;
    userId?: number;
    fromDate?: string;
    toDate?: string;
    pageNo?: number;
    pageSize?: number;
  } | number, organizationId?: number, unitId?: number): Observable<any> {
    let partyId = 0;
    let orgId = organizationId || 28;
    let uId = unitId || 0;
    let usrId = 0;
    let from = new Date(new Date().setDate(new Date().getDate() - 30)).toISOString();
    let to = new Date().toISOString();
    let pNo = 1;
    let pSize = 1000;

    if (typeof params === 'object' && params !== null) {
      partyId = params.partyId;
      if (params.organizationId) orgId = params.organizationId;
      if (params.unitId) uId = params.unitId;
      if (params.userId) usrId = params.userId;
      if (params.fromDate) from = params.fromDate;
      if (params.toDate) to = params.toDate;
      if (params.pageNo) pNo = params.pageNo;
      if (params.pageSize) pSize = params.pageSize;
    } else {
      partyId = params;
    }

    const url = `api/v1/account/viewledger?OrgnizationId=${orgId}&UnitId=${uId}&UserId=${usrId}&FYearId=0&PartyId=${partyId}&VoucherTypeId=4&FromDate=${from}&ToDate=${to}&pageno=${pNo}&pagesize=${pSize}`;
    return this.apiService.get<any>(url);
  }

  addCustomerBalance(payload: any): Observable<any> {
    return this.apiService.post<any>('api/v1/account/addledger', payload);
  }

  getPaymentList(): Observable<any> {
    if (!this.paymentList$) {
      this.paymentList$ = this.apiService.get<any>(`api/v1/customer/paymentlist`).pipe(
        shareReplay(1)
      );
    }
    return this.paymentList$;
  }
}

