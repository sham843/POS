import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { DbService } from './db.service';
import { SessionService } from './session.service';
import { ElectronService } from './electron.service';
import { CartItem } from './counter-sale.service';

@Injectable({
  providedIn: 'root'
})
export class CounterInvoiceService {
  private apiService = inject(ApiService);
  private dbService = inject(DbService);
  private sessionService = inject(SessionService);
  private electronService = inject(ElectronService);

  get Userdetails() {
    const userStr = localStorage.getItem('UserDetails');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (e) { }
    }
    return { id: 0 };
  }

  fetchSessionBillStats(userId: number): Observable<any> {
    return this.apiService.get<any>(`api/v1/session/bill/${userId}`);
  }

  loadInvoiceByBillNo(billNo: string): Observable<any> {
    return this.apiService.get<any>(`api/v1/invoice/byId?billNo=${billNo}`);
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
    },
    selectedCustomer: any | null,
    paymentMode: 'cash' | 'online' | 'card',
    existingInvoiceHeader?: {
      invoiceId: number | null;
      invoiceNo: string | null;
      invoiceDate: string | null;
    }
  ): Promise<any> {
    const isUpdate = !!existingInvoiceHeader?.invoiceId;
    const now = new Date().toISOString();
    const userDetails = this.Userdetails;

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

    const customer = selectedCustomer;
    let partyId = 0;
    if (customer && customer.id) {
      partyId = customer.id;
    } else {
      try {
        const saleLedgers = await this.dbService.saleLedgerList.toArray();
        if (saleLedgers && saleLedgers.length > 0) {
          partyId = saleLedgers[0].id || 0;
        }
      } catch (e) {
        console.error('Failed to load SaleLedgerList from indexedDB', e);
      }
    }
    let companyLedgerId = 0;
    try {
      const companyLedgers = await this.dbService.companyLedgerList.toArray();
      if (companyLedgers && companyLedgers.length > 0) {
        companyLedgerId = companyLedgers[0].id || 0;
      }
    } catch (e) {
      console.error('Failed to load CompanyLedgerList from indexedDB', e);
    }
    let bankCashLedger = 0;
    let bankCashLedgerName = "";
    try {
      if (paymentMode === 'cash') {
        const cashLedgers = await this.dbService.cashLedger.toArray();
        if (cashLedgers && cashLedgers.length > 0) {
          bankCashLedger = cashLedgers[0].id || 0;
          bankCashLedgerName = cashLedgers[0].customerName || "";
        }
      } else {
        const bankAccountsList = await this.dbService.bankAccounts.toArray();
        if (bankAccountsList && bankAccountsList.length > 0) {
          bankCashLedger = bankAccountsList[0].id || 0;
          bankCashLedgerName = bankAccountsList[0].customerName || "";
        }
      }
    } catch (e) {
      console.error('Failed to load bank/cash ledger from indexedDB', e);
    }

    const invoiceDetails = cartItems.map(item => {
      const discountAmount = parseFloat((item.amount * item.discount / 100).toFixed(2));
      const gstonAmount = parseFloat(((item.quantity * item.rate) - (discountAmount + item.gstAmount)).toFixed(2));

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
        igst: "0.00",
        cgst: (item.gstAmount / 2).toFixed(2),
        sgst: (item.gstAmount / 2).toFixed(2),
        subTotal: totals.totalPayable.toFixed(2),
        unitId: unitId,
        serverId: 0,
        StockHistoryLocalId: 0
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
      igst: 0,
      cgst: (totals.totalGst / 2).toFixed(2),
      sgst: (totals.totalGst / 2).toFixed(2),
      stateFlag: 1,
      isPaymentReceived: isPaymentReceived,
      isPrint: false, // Managed programmatically in print receipt
      spinvoicedetailsModel: invoiceDetails,
      ledgerTransaction: {
        id: 0,
        ledger1: partyId,
        ledger2: companyLedgerId,
        bankCashLedger: bankCashLedger,
        credit: 0,
        debit: 0,
        ledgerAmount: parseFloat(totals.totalPayable.toFixed(2)),
        transactionDate: now,
        modeOfPaymentId: modeOfPaymentId,
        modeOfPayment: modeString == 'Credit' || modeString == 'Coupon' ? "Credit/Coupon" : modeString,
        transactionTypeId: isUpdate ? (existingInvoiceHeader?.invoiceId ?? 0) : 0,
        transactionType: "",
        transactionId: isUpdate ? (existingInvoiceHeader?.invoiceId ?? 0) : 0,
        transactionNo: "",
        narration: modeString == 'Credit' || modeString == 'Coupon' ? "Credit/Coupon Payment" : modeString == 'Online' ? "Bank Payment" : modeString + " Entry",
        referenceId: 0,
        groupId: 0,
        chequeDate: now,
        isTallyExport: 0,
        tallyReferenceId: 0,
        particularsText: modeString == 'Credit' || modeString == 'Coupon' ? "Credit/Coupon Payment" : modeString == 'Online' ? "Bank Payment" : modeString + " Entry",
        voucherTypeId: 1,
        voucherSubTypeId: 0,
        voucherSubType: "",
        fYearId: 0,
        unitId: unitId,
        organizationId: organizationId,
        serverId: 0,
        createdBy: userId,
        createdDate: now,
        modifiedBy: userId,
        isOpeningBalance: 0,
        showDate: now,
        isDeleted: 0,
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
    };

    const endpoint = isUpdate ? 'api/v1/invoice/update-sale' : 'api/v1/invoice/sale';
    return this.apiService.post<any>(endpoint, payload).toPromise();
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
    }
  ) {
    const userDetails = this.Userdetails;
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
        subTotal: totals.subTotal.toFixed(2),
        discountPercent: '',
        discount: totals.totalDiscount.toFixed(2),
        sgst: (totals.totalGst / 2).toFixed(2),
        cgst: (totals.totalGst / 2).toFixed(2),
        igst: '0.00',
        billAmount: totals.billAmount.toFixed(2),
        roundOff: totals.roundOff.toFixed(2),
        totalPayable: totals.totalPayable.toFixed(2)
      }
    };

    this.electronService.sendPrintData(printPayload);
  }

  getOrderList(): Observable<any> {
    const userDetailsStr = localStorage.getItem('UserDetails');
    let userDetails: any = null;
    try { if (userDetailsStr) userDetails = JSON.parse(userDetailsStr); } catch (e) {}

    const organizationId = userDetails?.organizationId || 28;
    const unitId = userDetails?.unitid || userDetails?.unitId || 0;
    
    return this.apiService.get<any>(`api/v1/Order/getOrderList?organizationId=${organizationId}&unitId=${unitId}&deliveryStatus=Upcoming`);
  }
}
