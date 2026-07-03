import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx-js-style';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface PdfExportOptions {
  title: string;
  subtitle?: string;
  unitName?: string;
  periodFrom?: string;
  periodTo?: string;
  metaInfo?: { label: string; value: string }[];
  headers: string[];
  rows: any[][];
  footerRow?: any[];
  columnAlignments?: ('left' | 'center' | 'right')[];
  fileName?: string;
}

export interface ExcelExportOptions {
  title: string;
  subtitle?: string;
  unitName?: string;
  periodFrom?: string;
  periodTo?: string;
  metaInfo?: { label: string; value: string }[];
  headers: string[];
  rows: any[][];
  footerRow?: any[];
  fileName: string;
}

const formatToDdMmYyyy = (dateStr?: string): string => {
  if (!dateStr || dateStr === '-') return '-';
  const parts = dateStr.trim().split('-');
  if (parts.length === 3) {
    if (parts[0].length === 2 && parts[2].length === 4) {
      return dateStr;
    }
    if (parts[0].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }
  return dateStr;
};

const formatGeneratedOn = (): string => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();

  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const hoursStr = String(hours).padStart(2, '0');
  return `${day}-${month}-${year}, ${hoursStr}:${minutes}:${seconds} ${ampm}`;
};

@Injectable({
  providedIn: 'root'
})
export class ExportService {

  constructor() { }

  /**
   * Generates a native Excel (.xlsx) file with styled metadata, headers, and totals, then triggers client-side download.
   */
  exportToExcel(options: ExcelExportOptions): void {
    const {
      title,
      subtitle = '',
      unitName = 'Hi-Tech Dairy Shop',
      periodFrom = '',
      periodTo = '',
      metaInfo = [],
      headers,
      rows,
      footerRow = [],
      fileName
    } = options;

    if (!rows || rows.length === 0) {
      return;
    }

    const aoa: any[][] = [];

    // Add Brand Header (Extra Bold, Large 20pt, Blue text, Center-Aligned)
    aoa.push([{
      v: unitName,
      s: {
        font: { bold: true, size: 25, color: { rgb: '1E3A8A' } },
        alignment: { horizontal: 'center' }
      }
    }]);

    // Add Report Title (Bold 12pt, Center-Aligned)
    aoa.push([{
      v: title + (subtitle ? ' - ' + subtitle : ''),
      s: {
        font: { bold: true, size: 12 },
        alignment: { horizontal: 'center' }
      }
    }]);

    if (periodFrom || periodTo) {
      const formattedFrom = formatToDdMmYyyy(periodFrom);
      const formattedTo = formatToDdMmYyyy(periodTo);
      aoa.push([{
        v: `Period: ${formattedFrom} to ${formattedTo}`,
        s: {
          alignment: { horizontal: 'center' }
        }
      }]);
    }

    metaInfo.forEach(meta => {
      aoa.push([{
        v: `${meta.label}: ${meta.value}`,
        s: {
          alignment: { horizontal: 'center' }
        }
      }]);
    });

    aoa.push([{
      v: `Generated On: ${formatGeneratedOn()}`,
      s: {
        alignment: { horizontal: 'center' }
      }
    }]);
    aoa.push([]); // Spacer row before data table

    // Styled Table Headers (Grey Background Fill, Bold Text, Thin Borders)
    const styledHeaders = headers.map(header => ({
      v: header,
      s: {
        font: { bold: true, color: { rgb: '374151' } },
        fill: { fgColor: { rgb: 'F3F4F6' } }, // Grey background fill
        border: {
          top: { style: 'thin', color: { rgb: 'D1D5DB' } },
          bottom: { style: 'thin', color: { rgb: 'D1D5DB' } },
          left: { style: 'thin', color: { rgb: 'D1D5DB' } },
          right: { style: 'thin', color: { rgb: 'D1D5DB' } }
        }
      }
    }));
    aoa.push(styledHeaders);

    // Data Rows
    rows.forEach(row => {
      aoa.push(row.map(val => ({ v: val === null || val === undefined ? '' : val })));
    });

    // Footer Totals Row (Extra Bold, Deep Blue, Light Blue Background Fill)
    if (footerRow && footerRow.length > 0) {
      const styledFooter = footerRow.map(cell => ({
        v: cell,
        s: {
          font: { bold: true, color: { rgb: '1E3A8A' } }, // Deep Blue text
          fill: { fgColor: { rgb: 'EFF6FF' } }, // Light Blue fill
          border: {
            top: { style: 'thin', color: { rgb: 'BFDBFE' } },
            bottom: { style: 'double', color: { rgb: '1E3A8A' } } // Accounting double bottom border
          }
        }
      }));
      aoa.push(styledFooter);
    }

    // Create worksheet from AOA
    const worksheet = XLSX.utils.aoa_to_sheet(aoa);

    // Set Cell Merges for Center-Aligned Header Block across table columns
    const merges: any[] = [];
    merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }); // Unit Name
    merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } }); // Title

    let mergeRowIdx = 2;
    if (periodFrom || periodTo) {
      merges.push({ s: { r: mergeRowIdx, c: 0 }, e: { r: mergeRowIdx, c: headers.length - 1 } }); // Period
      mergeRowIdx++;
    }
    metaInfo.forEach(() => {
      merges.push({ s: { r: mergeRowIdx, c: 0 }, e: { r: mergeRowIdx, c: headers.length - 1 } }); // Meta Filter
      mergeRowIdx++;
    });
    merges.push({ s: { r: mergeRowIdx, c: 0 }, e: { r: mergeRowIdx, c: headers.length - 1 } }); // Generated On

    worksheet['!merges'] = merges;

    // Auto-calculate column widths
    const headerRowIdx = aoa.findIndex(row => row === styledHeaders);
    if (headerRowIdx !== -1) {
      const colWidths = headers.map((header, colIdx) => {
        let maxLen = header.length;
        for (let r = headerRowIdx + 1; r < aoa.length; r++) {
          const valObj = aoa[r][colIdx];
          const val = valObj && valObj.v !== undefined ? valObj.v : valObj;
          const strLen = val !== null && val !== undefined ? String(val).length : 0;
          if (strLen > maxLen) {
            maxLen = strLen;
          }
        }
        return { wch: Math.max(maxLen + 4, 12) }; // Minimum 12 char width, plus padding
      });
      worksheet['!cols'] = colWidths;
    }

    // Create new workbook
    const workbook = XLSX.utils.book_new();
    // Append worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');

    // Generate output file as native binary XLSX spreadsheet
    const cleanFileName = fileName.endsWith('.xlsx') ? fileName : `${fileName.replace(/\.csv$/, '')}.xlsx`;
    XLSX.writeFile(workbook, cleanFileName);
  }

  /**
   * Helper to load font binary from assets relative to baseHref and convert to base64.
   */
  private async loadFontBase64(url: string): Promise<string> {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const blob = await response.blob();
        return await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64data = reader.result as string;
            resolve(base64data.split(',')[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
    } catch (e) {
      console.error('Error fetching font from', url, e);
    }
    return '';
  }

  /**
   * Generates a PDF file from table data using jsPDF and jspdf-autotable, then downloads it directly.
   */
  async exportToPdf(options: PdfExportOptions): Promise<void> {
    const {
      title,
      subtitle = '',
      unitName = 'Hi-Tech Dairy Shop',
      periodFrom = '',
      periodTo = '',
      metaInfo = [],
      headers,
      rows,
      footerRow = [],
      columnAlignments = [],
      fileName = 'Report.pdf'
    } = options;

    // Create a new jsPDF instance (Landscape A4)
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();

    // Resolve base href dynamically to build safe absolute path for asset fetch
    const baseHref = document.getElementsByTagName('base')[0]?.getAttribute('href') || '/';
    const cleanBaseHref = baseHref.endsWith('/') ? baseHref : baseHref + '/';

    const [regularBase64, boldBase64] = await Promise.all([
      this.loadFontBase64(cleanBaseHref + 'assets/fonts/Poppins-Regular.ttf'),
      this.loadFontBase64(cleanBaseHref + 'assets/fonts/Poppins-Bold.ttf')
    ]);

    const activeFont = regularBase64 ? 'Poppins' : 'helvetica';

    if (regularBase64) {
      doc.addFileToVFS('Poppins-Regular.ttf', regularBase64);
      doc.addFont('Poppins-Regular.ttf', 'Poppins', 'normal');
    }
    if (boldBase64) {
      doc.addFileToVFS('Poppins-Bold.ttf', boldBase64);
      doc.addFont('Poppins-Bold.ttf', 'Poppins', 'bold');
    }

    // 1. Add Brand/Unit Name (Centered, Large, Bold, Blue text)
    doc.setFont(activeFont, 'bold');
    doc.setFontSize(22);
    doc.setTextColor(30, 58, 138); // #1E3A8A (Deep Blue)
    doc.text(unitName, pageWidth / 2, 18, { align: 'center' });

    // 2. Add Title & Subtitle (Centered, Bold)
    doc.setFontSize(13);
    doc.setTextColor(75, 85, 99); // #4B5563
    doc.text(title + (subtitle ? ' - ' + subtitle : ''), pageWidth / 2, 25, { align: 'center' });

    // Draw horizontal separator line
    doc.setDrawColor(229, 231, 235); // #E5E7EB
    doc.setLineWidth(0.5);
    doc.line(14, 29, pageWidth - 14, 29);

    // 3. Add Metadata / Filters (aligned nicely)
    doc.setFontSize(9);
    doc.setFont(activeFont, 'normal');
    doc.setTextColor(75, 85, 99);

    // Build filter string
    let filterString = '';
    if (periodFrom || periodTo) {
      const formattedFrom = formatToDdMmYyyy(periodFrom);
      const formattedTo = formatToDdMmYyyy(periodTo);
      filterString += `Period: ${formattedFrom} to ${formattedTo}`;
    }

    metaInfo.forEach(meta => {
      if (filterString) filterString += '   |   ';
      filterString += `${meta.label}: ${meta.value}`;
    });

    // Left aligned filters
    doc.setFont(activeFont, 'bold');
    doc.text(filterString, 14, 35);

    // Right aligned generated date
    doc.setFont(activeFont, 'normal');
    doc.text(`Generated On: ${formatGeneratedOn()}`, pageWidth - 14, 35, { align: 'right' });

    // 4. Build Table using jspdf-autotable
    // Map cell text values and clean HTML tags if any (convert <br/> to \n)
    const cleanRows = rows.map(row =>
      row.map(cell => {
        if (cell === null || cell === undefined) return '';
        return String(cell)
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<[^>]*>/g, '');
      })
    );

    const cleanBody = [...cleanRows];
    if (footerRow && footerRow.length > 0) {
      const cleanFooter = footerRow.map(cell => (cell !== null && cell !== undefined ? String(cell) : ''));
      cleanBody.push(cleanFooter);
    }

    autoTable(doc, {
      startY: 38,
      margin: { left: 14, right: 14 },
      head: [headers],
      body: cleanBody,
      theme: 'grid',
      headStyles: {
        font: activeFont,
        fillColor: [243, 244, 246], // #F3F4F6 (Light Grey)
        textColor: [55, 65, 81],    // #374151
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'left',
        valign: 'middle',
        lineColor: [209, 213, 219],
        lineWidth: 0.1
      },
      bodyStyles: {
        font: activeFont,
        fontSize: 7.5,
        textColor: [31, 41, 55],     // #1F2937
        valign: 'middle',
        lineColor: [209, 213, 219],
        lineWidth: 0.1
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251] // #F9FAFB
      },
      columnStyles: columnAlignments.reduce((acc, align, idx) => {
        acc[idx] = { halign: align };
        return acc;
      }, {} as any),
      didParseCell: (data) => {
        // Apply column-specific horizontal alignment to headers, body and footer
        const colIdx = data.column.index;
        const align = columnAlignments[colIdx];
        if (align) {
          data.cell.styles.halign = align;
        }

        // Style the totals row at the bottom
        if (footerRow && footerRow.length > 0 && data.row.index === cleanBody.length - 1) {
          data.cell.styles.font = activeFont;
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [239, 246, 255]; // #EFF6FF (Light Blue)
          data.cell.styles.textColor = [30, 58, 138];    // #1E3A8A (Deep Blue)
          data.cell.styles.lineColor = [59, 130, 246];   // #3B82F6
        }
      }
    });

    // Save and download directly
    const cleanFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
    doc.save(cleanFileName);
  }
}
