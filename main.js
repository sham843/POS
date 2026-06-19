const { app, BrowserWindow, ipcMain, Menu, session, screen, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let win;
let defaultPrinterName = null;

async function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().size;
  win = new BrowserWindow({
    width,
    height,
    title: "HiTech Dairy POS",
    webPreferences: {
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false,
      webSecurity: false,
      preload: path.join(__dirname, 'preload.js')
    },
  });

  try {
    const allPrinters = await win.webContents.getPrintersAsync();
    let defaultPrinter = allPrinters.find(p => p.isDefault);
    if (defaultPrinter) {
      defaultPrinterName = defaultPrinter.name;
    } else {
      defaultPrinterName = allPrinters[0]?.name || null;
    }
  } catch (err) {
    console.error('Failed to get printers on initialization', err);
  }

  // Remove the default menu
  win.setMenu(null);

  // Clear cache and load the Angular build URL
  win.webContents.session.clearCache();
  
  win.loadURL(`file://${path.join(__dirname, 'dist/POS/browser/index.html')}`);

  win.on('closed', () => {
    win = null;
  });
}

app.whenReady().then(createWindow);

// IPC: Get Printers
ipcMain.on('get-printers', async (event) => {
  try {
    const printers = await win.webContents.getPrintersAsync();
    event.reply('printers-list', printers);
  } catch (err) {
    event.reply('printers-list', []);
  }
});

// Handle print request
ipcMain.on('print-data', (event, printOptions) => {
  console.log('Received print request:', JSON.stringify(printOptions, null, 2));
  
  let printWindow = new BrowserWindow({
    show: false, // Hidden window
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      devTools: false,
    },
  });

  const data = printOptions;

  const billTemplate = `
    <html>
    <head>
    <style>
      body {
        width: 80mm;
        font-family: 'Courier New', monospace;
        font-size: 13px;
        margin: 10px;
        color: #000;
        font-weight: 600;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .header, .footer {
        text-align: center;
      }
      .header h1, .header h4 {
        margin: 3px 0;
        font-weight: 700;
      }
      .header h4 {
        font-size: 11px;
      }
      table {
        width: 100%;
        margin-top: 5px;
        border-top: 1px dashed #000;
        border-collapse: collapse;
      }
      th {
        text-align: left;
        background-color: #f4f4f4;
        padding: 5px;
        border-bottom: 1px solid #ddd;
        font-weight: 800;
      }
      td {
        padding: 3px;
        font-size: 12px;
        text-align: center;
        font-weight: 700;
      }
      td.item-name {
        text-align: left;
        font-weight: 600;
      }
      .summary {
        margin-top: 5px;
        border-top: 1px dashed #000;
        padding-top: 5px;
      }
      .summary div {
        display: flex;
        justify-content: space-between;
        margin: 2px 0;
        font-weight: 700;
      }
      .footer {
        margin-top: 10px;
        font-size: 11px;
        font-weight: 700;
      }
    </style>
    </head>
    <body>
      <div class="header">
        <h4>${data.UnitName}</h4>
        <div>${data.UnitAdd}</div>
        <div>Phone: ${data.UnitMobile}</div>
        <div>GSTIN: ${data.GSTNo} | FSSAI: ${data.FssaiLicNo}</div>
        <div>Bill No: ${data.invoiceId}</div>
        <div>Date: ${new Date(data.timestamp).toLocaleString()}</div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Rate</th>
            <th>Amt</th>
          </tr>
        </thead>
        <tbody>
          ${data.items.map(item => `
            <tr>
              <td class="item-name">${item.name}</td>
              <td>${item.quantity}</td>
              <td>₹${item.rate}</td>
              <td>₹${item.price}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="summary">
        <div><span>Subtotal:</span><span>₹${data.totals.subTotal}</span></div>
        <div><span>Discount:</span><span>₹${data.totals.discount}</span></div>
        <div><span>SGST:</span><span>₹${data.totals.sgst}</span></div>
        <div><span>CGST:</span><span>₹${data.totals.cgst}</span></div>
        <div><span>IGST:</span><span>₹${data.totals.igst}</span></div>
        <div><span>Bill Amount:</span><span>₹${data.totals.billAmount}</span></div>
        <div><span>Round Off:</span><span>₹${data.totals.roundOff}</span></div>
        <div><strong>Total Payable:</strong><strong>₹${data.totals.totalPayable}</strong></div>
      </div>
      <div class="footer">
        <p>*** Thank You! Visit Again ***</p>
      </div>
    </body>
    </html>
  `;

  printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(billTemplate)}`);

  printWindow.webContents.on('did-finish-load', () => {
    setTimeout(() => {
      printWindow.webContents.print({
        silent: true, // Auto-print without dialog
        printBackground: true,
        deviceName: defaultPrinterName || undefined,
      }, (success, failureReason) => {
        if (!success) {
          console.error('Print failed:', failureReason);
          event.reply('print-error', failureReason);
        } else {
          console.log('Print job sent successfully.');
          event.reply('print-success');
        }
        printWindow.close();
      });
    }, 100);
  });

  printWindow.on('closed', () => {
    printWindow = null;
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
