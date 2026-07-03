import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx-js-style';

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
   * Generates an HTML A4 printable layout in a new window/tab and triggers the PDF/Print dialog.
   */
  exportToPdf(options: PdfExportOptions): void {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print/export PDF.');
      return;
    }

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
      columnAlignments = []
    } = options;

    // Generate table header columns
    const headerColsHtml = headers.map((header, idx) => {
      const alignment = columnAlignments[idx] || 'left';
      return `<th style="text-align: ${alignment};">${header}</th>`;
    }).join('');

    // Generate table data rows
    const rowsHtml = rows.map((row) => {
      const cellsHtml = row.map((cell, colIdx) => {
        const alignment = columnAlignments[colIdx] || 'left';
        return `<td style="text-align: ${alignment};">${cell !== null && cell !== undefined ? cell : ''}</td>`;
      }).join('');
      return `<tr>${cellsHtml}</tr>`;
    }).join('');

    // Generate table footer row
    let footerRowHtml = '';
    if (footerRow && footerRow.length > 0) {
      const footerCellsHtml = footerRow.map((cell, colIdx) => {
        const alignment = columnAlignments[colIdx] || 'left';
        const isBold = cell !== '';
        return `<td style="text-align: ${alignment}; font-weight: ${isBold ? 'bold' : 'normal'};">${cell !== null && cell !== undefined ? cell : ''}</td>`;
      }).join('');
      footerRowHtml = `<tr class="totals-row">${footerCellsHtml}</tr>`;
    }

    // Build meta info block
    let metaInfoHtml = '';
    if (periodFrom || periodTo) {
      const formattedFrom = formatToDdMmYyyy(periodFrom);
      const formattedTo = formatToDdMmYyyy(periodTo);
      metaInfoHtml += `<div><strong>Period:</strong> ${formattedFrom} to ${formattedTo}</div>`;
    }
    metaInfo.forEach(meta => {
      metaInfoHtml += `<div><strong>${meta.label}:</strong> ${meta.value}</div>`;
    });
    metaInfoHtml += `<div><strong>Generated On:</strong> ${formatGeneratedOn()}</div>`;

    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body {
              font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif;
              color: #1F2937;
              padding: 20px;
              font-size: 11px;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
              border-bottom: 2px solid #E5E7EB;
              padding-bottom: 10px;
            }
            .header h1 {
              font-size: 26px;
              color: #1E3A8A;
              margin: 0 0 5px 0;
              font-weight: 800; /* Extra bold unit name */
            }
            .header p {
              margin: 0;
              color: #4B5563;
              font-size: 13px;
              font-weight: 600; /* Centered sub header text bold */
            }
            .meta-info {
              display: flex;
              justify-content: space-between;
              margin-bottom: 15px;
              font-size: 11px;
              color: #4B5563;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }
            th, td {
              border: 1px solid #D1D5DB;
              padding: 6px 8px;
              text-align: left;
            }
            th {
              background-color: #F3F4F6;
              color: #374151;
              font-weight: 600;
              font-size: 10px;
              text-transform: uppercase;
            }
            tr:nth-child(even) {
              background-color: #F9FAFB;
            }
            .totals-row {
              background-color: #EFF6FF !important;
            }
            .totals-row td {
              border-top: 2px solid #3B82F6;
              border-bottom: 2px solid #3B82F6;
            }
            @media print {
              body {
                padding: 0;
              }
              @page {
                size: A4 landscape;
                margin: 10mm;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${unitName}</h1>
            <p>${title}${subtitle ? ' - ' + subtitle : ''}</p>
          </div>
          <div class="meta-info">
            ${metaInfoHtml}
          </div>
          <table>
            <thead>
              <tr>
                ${headerColsHtml}
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
              ${footerRowHtml}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }
}
