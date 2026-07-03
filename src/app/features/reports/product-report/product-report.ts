import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpHeaders } from '@angular/common/http';
import { LucideAngularModule, Package, Loader, Receipt, Calendar, Search, RotateCcw, FileSpreadsheet, FileText } from 'lucide-angular';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { DateAdapter, MAT_DATE_FORMATS } from '@angular/material/core';
import { CustomDateAdapter, CUSTOM_DATE_FORMATS } from '../../../core/adapters/custom-date-adapter';
import { MatTableModule } from '@angular/material/table';
import { ApiService } from '../../../core/services/api.service';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { ExportService } from '../../../core/services/export.service';

export interface ProductSaleItem {
  materialId: number;
  productName: string;
  rate: number;
  quantity: number;
  unit: string;
  subTotal: number;
  discount: number;
  taxableAmount: number;
  sgst: number;
  cgst: number;
  igst: number;
  totalAmount: number;
}

@Component({
  selector: 'app-product-report',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatTableModule,
    EmptyState
  ],
  providers: [
    { provide: DateAdapter, useClass: CustomDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: CUSTOM_DATE_FORMATS }
  ],
  templateUrl: './product-report.html',
  styleUrl: './product-report.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductReport implements OnInit {
  protected readonly Math = Math;

  private apiService = inject(ApiService);
  private exportService = inject(ExportService);

  readonly ProductIcon = Package;
  readonly LoaderIcon = Loader;
  readonly ReceiptIcon = Receipt;
  readonly CalendarIcon = Calendar;
  readonly SearchIcon = Search;
  readonly ClearIcon = RotateCcw;
  readonly ExcelIcon = FileSpreadsheet;
  readonly PdfIcon = FileText;

  // Filter Date Objects (for mat-datepicker)
  fromDateObj = signal<Date | null>(null);
  toDateObj = signal<Date | null>(null);

  // Formatted Filter Strings (for API payload)
  fromDate = signal<string>('');
  toDate = signal<string>('');
  selectedProduct = signal<number>(0);
  maxDate = new Date();

  // Report type state ('details' or 'summary')
  reportType = signal<'details' | 'summary'>('details');

  isLoading = signal<boolean>(false);
  currentUser = signal<any>(null);

  // Pagination State
  currentPage = signal<number>(0);
  pageSize = signal<number>(5);

  // Dynamic product list for dropdown selector
  productList = signal<any[]>([]);

  // Report results from API
  reportData = signal<any[]>([]);

  normalizeProductData(item: any): ProductSaleItem {
    return {
      materialId: Number(item.materialId ?? item.material_Id ?? item.productId ?? item.product_Id ?? item.id ?? 0),
      productName: item.product_Name || item.productName || item.materialName || item.material_Name || item.name || '',
      rate: Number(item.rate ?? item.Rate ?? 0),
      quantity: Number(item.quantity ?? item.Quantity ?? item.qty ?? item.Qty ?? 0),
      unit: item.unit || item.Unit || item.uom || item.Uom || '',
      subTotal: Number(item.sub_Total ?? item.subTotal ?? item.SubTotal ?? item.subtotal ?? 0),
      discount: Number(item.discount ?? item.Discount ?? 0),
      taxableAmount: Number(item.taxable_Amount ?? item.taxableAmount ?? item.TaxableAmount ?? item.taxableamount ?? 0),
      sgst: Number(item.sgst ?? item.Sgst ?? item.SGST ?? 0),
      cgst: Number(item.cgst ?? item.Cgst ?? item.CGST ?? 0),
      igst: Number(item.igst ?? item.Igst ?? item.IGST ?? 0),
      totalAmount: Number(item.total_Amount ?? item.totalAmount ?? item.TotalAmount ?? item.totalamount ?? 0)
    };
  }

  // Normalized report data
  normalizedData = computed<ProductSaleItem[]>(() => {
    return this.reportData().map(item => this.normalizeProductData(item));
  });

  // Computed totals for footers
  totalQuantity = computed(() => {
    return this.normalizedData().reduce((sum, item) => sum + item.quantity, 0);
  });

  totalSubTotal = computed(() => {
    return this.normalizedData().reduce((sum, item) => sum + item.subTotal, 0);
  });

  totalDiscount = computed(() => {
    return this.normalizedData().reduce((sum, item) => sum + item.discount, 0);
  });

  totalTaxableAmount = computed(() => {
    return this.normalizedData().reduce((sum, item) => sum + item.taxableAmount, 0);
  });

  totalSgst = computed(() => {
    return this.normalizedData().reduce((sum, item) => sum + item.sgst, 0);
  });

  totalCgst = computed(() => {
    return this.normalizedData().reduce((sum, item) => sum + item.cgst, 0);
  });

  totalIgst = computed(() => {
    return this.normalizedData().reduce((sum, item) => sum + item.igst, 0);
  });

  totalAmount = computed(() => {
    return this.normalizedData().reduce((sum, item) => sum + item.totalAmount, 0);
  });

  // Dynamic active report length
  activeReportLength = computed(() => {
    return this.normalizedData().length;
  });

  // Mat-table columns configuration
  displayedColumns = computed<string[]>(() => {
    if (this.reportType() === 'summary') {
      return [
        'productName',
        'quantity',
        'unit',
        'subTotal',
        'discount',
        'taxableAmount',
        'sgst',
        'cgst',
        'igst',
        'totalAmount'
      ];
    }
    return [
      'productName',
      'rate',
      'quantity',
      'unit',
      'subTotal',
      'discount',
      'taxableAmount',
      'sgst',
      'cgst',
      'igst',
      'totalAmount'
    ];
  });

  // Computed paginated view of active data
  paginatedData = computed(() => {
    const data = this.normalizedData();
    const size = this.pageSize();
    const pageIndex = this.currentPage();
    const start = pageIndex * size;
    const end = start + size;
    return data.slice(start, end);
  });

  // Toggle report type method
  setReportType(type: 'details' | 'summary') {
    this.reportType.set(type);
    this.currentPage.set(0);
    this.resetFiltersAndData();
  }

  resetFiltersAndData() {
    this.fromDateObj.set(null);
    this.toDateObj.set(null);
    this.fromDate.set('');
    this.toDate.set('');
    this.selectedProduct.set(0);
    this.reportData.set([]);
  }

  ngOnInit() {
    let orgId = 28;
    const userStr = localStorage.getItem('UserDetails');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.currentUser.set(user);
        orgId = user.organizationId || user.OrganizationId || 28;
      } catch (e) {
        console.error('Failed to parse user details:', e);
      }
    }

    this.fetchProductList(orgId);
  }

  fetchProductList(orgId: number) {
    this.apiService.get<any>(`api/v1/report/products?organizationId=${orgId}`).subscribe({
      next: (response) => {
        let productsData = [];
        if (response && response.data) {
          productsData = response.data;
        } else if (response && response.responseData) {
          productsData = response.responseData;
        } else if (response && Array.isArray(response)) {
          productsData = response;
        }

        if (productsData && productsData.length > 0) {
          const mappedProducts = productsData.map((p: any) => ({
            id: p.id || p.materialId || p.productId || 0,
            name: p.productVariant || p.materialName || p.productName || p.name || ''
          }));

          // De-duplicate products
          const uniqueProducts = [];
          const seenIds = new Set();
          for (const p of mappedProducts) {
            if (p.id && !seenIds.has(p.id)) {
              seenIds.add(p.id);
              uniqueProducts.push(p);
            }
          }

          // Sort products alphabetically
          uniqueProducts.sort((a, b) => a.name.localeCompare(b.name));
          this.productList.set(uniqueProducts);
        }
      },
      error: (err) => {
        console.error('Failed to fetch product list from API:', err);
      }
    });
  }

  fetchReport() {
    this.isLoading.set(true);
    const fromDate = this.fromDate();
    const toDate = this.toDate();
    const selectedMatId = this.selectedProduct();

    const headers = new HttpHeaders({
      'X-Skip-Loader': 'true'
    });

    if (this.reportType() === 'details') {
      const endpoint = `api/v1/report/product-wise-sale?FromDate=${fromDate}&ToDate=${toDate}&MaterialId=${selectedMatId}`;
      this.apiService.get<any>(endpoint).subscribe({
        next: (response) => {
          const list = response?.responseData || response?.data || response || [];
          this.reportData.set(Array.isArray(list) ? list : []);
          this.currentPage.set(0);
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Failed to fetch product wise sale report:', err);
          this.reportData.set([]);
          this.currentPage.set(0);
          this.isLoading.set(false);
        }
      });
    } else {
      const endpoint = 'api/v1/report/product-wise-summary';
      const payload = {
        FromDate: fromDate,
        ToDate: toDate,
        MaterialId: selectedMatId
      };
      this.apiService.post<any>(endpoint, payload, headers).subscribe({
        next: (response) => {
          const list = response?.responseData || response?.data || response || [];
          this.reportData.set(Array.isArray(list) ? list : []);
          this.currentPage.set(0);
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Failed to fetch product summary report:', err);
          this.reportData.set([]);
          this.currentPage.set(0);
          this.isLoading.set(false);
        }
      });
    }
  }

  searchReport() {
    this.fetchReport();
  }

  clearFilters() {
    this.fromDateObj.set(null);
    this.toDateObj.set(null);
    this.fromDate.set('');
    this.toDate.set('');
    this.selectedProduct.set(0);
    this.reportData.set([]);
  }

  onFromDateChange(date: Date | null) {
    this.fromDateObj.set(date);
    if (date) {
      this.fromDate.set(this.formatDate(date));
      const currentTo = this.toDateObj();
      if (currentTo && date > currentTo) {
        this.toDateObj.set(date);
        this.toDate.set(this.formatDate(date));
      }
    } else {
      this.fromDate.set('');
    }
  }

  onToDateChange(date: Date | null) {
    this.toDateObj.set(date);
    if (date) {
      this.toDate.set(this.formatDate(date));
      const currentFrom = this.fromDateObj();
      if (currentFrom && date < currentFrom) {
        this.fromDateObj.set(date);
        this.fromDate.set(this.formatDate(date));
      }
    } else {
      this.toDate.set('');
    }
  }

  formatDate(date: Date): string {
    const month = '' + (date.getMonth() + 1);
    const day = '' + date.getDate();
    const year = date.getFullYear();
    return [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
  }

  onPageChange(event: PageEvent) {
    this.pageSize.set(event.pageSize);
    this.currentPage.set(event.pageIndex);
  }

  exportToExcel() {
    const data = this.normalizedData();
    if (!data || data.length === 0) {
      return;
    }

    const isSummary = this.reportType() === 'summary';
    let headers: string[];
    let rows: any[][];
    let footerRow: any[];

    if (isSummary) {
      headers = [
        'Product Name',
        'Quantity',
        'Unit',
        'Sub Total (INR)',
        'Discount (INR)',
        'Taxable Amount (INR)',
        'SGST (INR)',
        'CGST (INR)',
        'IGST (INR)',
        'Total Amount (INR)'
      ];
      rows = data.map(item => [
        item.productName,
        item.quantity,
        item.unit,
        item.subTotal,
        item.discount,
        item.taxableAmount,
        item.sgst,
        item.cgst,
        item.igst,
        item.totalAmount
      ]);
      footerRow = [
        'Total:',
        this.totalQuantity(),
        '',
        this.totalSubTotal(),
        this.totalDiscount(),
        this.totalTaxableAmount(),
        this.totalSgst(),
        this.totalCgst(),
        this.totalIgst(),
        this.totalAmount()
      ];
    } else {
      headers = [
        'Product Name',
        'Rate (INR)',
        'Quantity',
        'Unit',
        'Sub Total (INR)',
        'Discount (INR)',
        'Taxable Amount (INR)',
        'SGST (INR)',
        'CGST (INR)',
        'IGST (INR)',
        'Total Amount (INR)'
      ];
      rows = data.map(item => [
        item.productName,
        item.rate,
        item.quantity,
        item.unit,
        item.subTotal,
        item.discount,
        item.taxableAmount,
        item.sgst,
        item.cgst,
        item.igst,
        item.totalAmount
      ]);
      footerRow = [
        'Total:',
        '',
        this.totalQuantity(),
        '',
        this.totalSubTotal(),
        this.totalDiscount(),
        this.totalTaxableAmount(),
        this.totalSgst(),
        this.totalCgst(),
        this.totalIgst(),
        this.totalAmount()
      ];
    }

    const selectedProductVal = this.selectedProduct();
    let selectedProductName = 'All Products';
    if (selectedProductVal > 0) {
      const foundProduct = this.productList().find(p => p.id === selectedProductVal);
      if (foundProduct) {
        selectedProductName = foundProduct.name;
      }
    }
    const unitName = this.currentUser()?.unitName || this.currentUser()?.UnitName || 'Hi-Tech Dairy Shop';

    this.exportService.exportToExcel({
      title: isSummary ? 'Product Sale Summary Report' : 'Product Wise Sale Report',
      unitName,
      periodFrom: this.fromDate() || '-',
      periodTo: this.toDate() || '-',
      metaInfo: [
        { label: 'Product Filter', value: selectedProductName }
      ],
      headers,
      rows,
      footerRow,
      fileName: isSummary
        ? `Product_Sale_Summary_Report_${this.fromDate() || 'all'}_to_${this.toDate() || 'all'}.xlsx`
        : `Product_Wise_Sale_Report_${this.fromDate() || 'all'}_to_${this.toDate() || 'all'}.xlsx`
    });
  }

  exportToPdf() {
    const data = this.normalizedData();
    if (!data || data.length === 0) {
      return;
    }

    const isSummary = this.reportType() === 'summary';
    let headers: string[];
    let rows: any[][];
    let footerRow: any[];
    let columnAlignments: ('left' | 'center' | 'right')[];

    if (isSummary) {
      headers = [
        'Sr',
        'Product Name',
        'Qty',
        'Unit',
        'Sub Total',
        'Disc',
        'Taxable Amt',
        'SGST',
        'CGST',
        'IGST',
        'Total Amt'
      ];
      rows = data.map((item, idx) => [
        idx + 1,
        item.productName,
        item.quantity.toString(),
        item.unit,
        `Rs. ${item.subTotal.toFixed(2)}`,
        `Rs. ${item.discount.toFixed(2)}`,
        `Rs. ${item.taxableAmount.toFixed(2)}`,
        `Rs. ${item.sgst.toFixed(2)}`,
        `Rs. ${item.cgst.toFixed(2)}`,
        `Rs. ${item.igst.toFixed(2)}`,
        `Rs. ${item.totalAmount.toFixed(2)}`
      ]);
      footerRow = [
        'Total:',
        '',
        this.totalQuantity().toString(),
        '',
        `Rs. ${this.totalSubTotal().toFixed(2)}`,
        `Rs. ${this.totalDiscount().toFixed(2)}`,
        `Rs. ${this.totalTaxableAmount().toFixed(2)}`,
        `Rs. ${this.totalSgst().toFixed(2)}`,
        `Rs. ${this.totalCgst().toFixed(2)}`,
        `Rs. ${this.totalIgst().toFixed(2)}`,
        `Rs. ${this.totalAmount().toFixed(2)}`
      ];
      columnAlignments = [
        'center', // Sr
        'left',   // Product Name
        'center', // Qty
        'center', // Unit
        'right',  // Sub Total
        'right',  // Disc
        'right',  // Taxable Amt
        'right',  // SGST
        'right',  // CGST
        'right',  // IGST
        'right'   // Total Amt
      ];
    } else {
      headers = [
        'Sr',
        'Product Name',
        'Rate',
        'Qty',
        'Unit',
        'Sub Total',
        'Disc',
        'Taxable Amt',
        'SGST',
        'CGST',
        'IGST',
        'Total Amt'
      ];
      rows = data.map((item, idx) => [
        idx + 1,
        item.productName,
        `Rs. ${item.rate.toFixed(2)}`,
        item.quantity.toString(),
        item.unit,
        `Rs. ${item.subTotal.toFixed(2)}`,
        `Rs. ${item.discount.toFixed(2)}`,
        `Rs. ${item.taxableAmount.toFixed(2)}`,
        `Rs. ${item.sgst.toFixed(2)}`,
        `Rs. ${item.cgst.toFixed(2)}`,
        `Rs. ${item.igst.toFixed(2)}`,
        `Rs. ${item.totalAmount.toFixed(2)}`
      ]);
      footerRow = [
        'Total:',
        '',
        '',
        this.totalQuantity().toString(),
        '',
        `Rs. ${this.totalSubTotal().toFixed(2)}`,
        `Rs. ${this.totalDiscount().toFixed(2)}`,
        `Rs. ${this.totalTaxableAmount().toFixed(2)}`,
        `Rs. ${this.totalSgst().toFixed(2)}`,
        `Rs. ${this.totalCgst().toFixed(2)}`,
        `Rs. ${this.totalIgst().toFixed(2)}`,
        `Rs. ${this.totalAmount().toFixed(2)}`
      ];
      columnAlignments = [
        'center', // Sr
        'left',   // Product Name
        'right',  // Rate
        'center', // Qty
        'center', // Unit
        'right',  // Sub Total
        'right',  // Disc
        'right',  // Taxable Amt
        'right',  // SGST
        'right',  // CGST
        'right',  // IGST
        'right'   // Total Amt
      ];
    }

    const selectedProductVal = this.selectedProduct();
    let selectedProductName = 'All Products';
    if (selectedProductVal > 0) {
      const foundProduct = this.productList().find(p => p.id === selectedProductVal);
      if (foundProduct) {
        selectedProductName = foundProduct.name;
      }
    }
    const unitName = this.currentUser()?.unitName || this.currentUser()?.UnitName || 'Hi-Tech Dairy Shop';

    this.exportService.exportToPdf({
      title: isSummary ? 'Product Sale Summary Report' : 'Product Wise Sale Report',
      unitName,
      periodFrom: this.fromDate() || '-',
      periodTo: this.toDate() || '-',
      metaInfo: [
        { label: 'Product Filter', value: selectedProductName }
      ],
      headers,
      rows,
      footerRow,
      columnAlignments,
      fileName: isSummary
        ? `Product_Sale_Summary_Report_${this.fromDate() || 'all'}_to_${this.toDate() || 'all'}.pdf`
        : `Product_Wise_Sale_Report_${this.fromDate() || 'all'}_to_${this.toDate() || 'all'}.pdf`
    });
  }
}
