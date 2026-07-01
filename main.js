process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';
const { app, BrowserWindow, ipcMain, Menu, session, screen, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { autoUpdater } = require('electron-updater');

let win;
let defaultPrinterName = null;
let server = null;
let serverPort = null;
const fileCache = new Map();

function startLocalServer() {
  return new Promise((resolve, reject) => {
    server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent(req.url.split('?')[0]);

      // Handle Proxy request (starts with /api)
      if (urlPath.startsWith('/api/')) {
        const targetUrlStr = 'https://uatposapi.hitechdairy.in';
        const parsedTarget = new URL(targetUrlStr);
        const options = {
          hostname: parsedTarget.hostname,
          port: parsedTarget.port || 80,
          path: req.url,
          method: req.method,
          headers: {
            ...req.headers,
            host: parsedTarget.hostname,
          }
        };

        const proxyReq = http.request(options, (proxyRes) => {
          res.writeHead(proxyRes.statusCode, proxyRes.headers);
          proxyRes.pipe(res, { end: true });
        });

        proxyReq.on('error', (err) => {
          console.error('[Proxy Error]:', err);
          res.writeHead(502);
          res.end('Bad Gateway');
        });

        req.pipe(proxyReq, { end: true });
        return;
      }

      // Serve static files from dist/POS/browser
      let filePath = path.join(__dirname, 'dist/POS/browser', urlPath);

      // If directory, append index.html
      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }

      // Fallback to index.html for Angular routing
      if (!fs.existsSync(filePath)) {
        filePath = path.join(__dirname, 'dist/POS/browser/index.html');
      }

      // Check in-memory cache first
      if (fileCache.has(filePath)) {
        const cached = fileCache.get(filePath);
        res.writeHead(200, { 'Content-Type': cached.contentType });
        res.end(cached.content);
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2',
        '.ttf': 'font/ttf',
        '.otf': 'font/otf',
        '.eot': 'application/vnd.ms-fontobject',
        '.webmanifest': 'application/manifest+json',
      };
      const contentType = mimeTypes[ext] || 'application/octet-stream';

      fs.readFile(filePath, (err, content) => {
        if (err) {
          res.writeHead(500);
          res.end('Error loading file');
        } else {
          // Cache the content
          fileCache.set(filePath, { contentType, content });
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(content);
        }
      });
    });

    server.listen(0, '127.0.0.1', () => {
      serverPort = server.address().port;
      console.log(`[Local Server] Running at http://127.0.0.1:${serverPort}`);
      resolve(serverPort);
    });

    server.on('error', (err) => {
      reject(err);
    });
  });
}

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
      webSecurity: true,
      sandbox: false,
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

  win.webContents.on('console-message', (event, ...args) => {
    if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
      const { level, message, line, sourceId } = args[0];
      console.log(`[RENDERER CONSOLE] Level:${level} | ${message} | ${sourceId}:${line}`);
    } else {
      const [level, message, line, sourceId] = args;
      console.log(`[RENDERER CONSOLE] Level:${level} | ${message} | ${sourceId}:${line}`);
    }
  });

  if (serverPort) {
    win.loadURL(`http://127.0.0.1:${serverPort}`);
  } else {
    console.error('Local server port is not set. Unable to load URL.');
  }

  win.on('closed', () => {
    win = null;
  });
}

app.whenReady().then(async () => {
  try {
    await startLocalServer();
    createWindow();
    autoUpdater.checkForUpdatesAndNotify();

    // Check for updates every 2 hours (2 * 60 * 60 * 1000)
    setInterval(() => {
      autoUpdater.checkForUpdatesAndNotify();
    }, 2 * 60 * 1000);
  } catch (err) {
    console.error('Failed to start local server:', err);
    app.quit();
  }
});

// IPC: Get App Version
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// Auto-updater Events
autoUpdater.on('update-available', (info) => {
  if (win && win.webContents) {
    win.webContents.send('update-available', info.version);
  }
});

autoUpdater.on('update-not-available', () => {
  if (win && win.webContents) {
    win.webContents.send('no_update_available');
  }
});

autoUpdater.on('update-downloaded', (info) => {
  if (win && win.webContents) {
    win.webContents.send('update-downloaded', info.version);
  }
});

// IPC: Check for updates manually
ipcMain.on('check_for_update', () => {
  autoUpdater.checkForUpdatesAndNotify();
});

// IPC: Install Update
ipcMain.handle('install-update', () => {
  autoUpdater.quitAndInstall();
});

// IPC: Get Printers
ipcMain.on('get-printers', async (event) => {
  try {
    const printers = await win.webContents.getPrintersAsync();
    event.reply('printers-list', printers);
  } catch (err) {
    event.reply('printers-list', []);
  }
});

// IPC: Set Default Printer
ipcMain.on('set-default-printer', (event, printerName) => {
  defaultPrinterName = printerName;
  console.log(`Default printer set to: ${printerName}`);
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
        width: 48mm;
        font-family: 'Courier New', monospace;
        font-size: 9px;
        margin: 0;
        padding: 0;
        color: #000;
        font-weight: 600;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .header, .footer {
        text-align: center;
      }
      .header h4 {
        margin: 2px 0;
        font-size: 11px;
        font-weight: 700;
      }
      .header div {
        font-size: 8px;
        line-height: 1.2;
        margin-bottom: 1px;
      }
      table {
        width: 100%;
        margin-top: 5px;
        border-top: 1px dashed #000;
        border-collapse: collapse;
      }
      th {
        font-size: 9px;
        font-weight: 800;
        padding: 3px 1px;
        border-bottom: 1px dashed #000;
      }
      td {
        padding: 3px 1px;
        font-size: 8px;
        font-weight: 700;
        vertical-align: top;
      }
      .col-item {
        text-align: left;
      }
      .col-qty {
        text-align: center;
      }
      .col-rate {
        text-align: right;
      }
      .col-amt {
        text-align: right;
      }
      .summary {
        margin-top: 5px;
        border-top: 1px dashed #000;
        padding-top: 3px;
      }
      .summary div {
        display: flex;
        justify-content: space-between;
        margin: 1px 0;
        font-size: 8px;
        font-weight: 700;
      }
      .summary .total-payable {
        font-size: 10px;
        border-top: 1px dashed #000;
        padding-top: 2px;
        margin-top: 2px;
      }
      .footer {
        margin-top: 8px;
        border-top: 1px dashed #000;
        padding-top: 4px;
        font-size: 8px;
        font-weight: 700;
      }
      .footer p {
        margin: 0;
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
            <th class="col-item">Item</th>
            <th class="col-qty">Qty</th>
            <th class="col-rate">Rate</th>
            <th class="col-amt">Amt</th>
          </tr>
        </thead>
        <tbody>
          ${data.items.map(item => `
            <tr>
              <td class="col-item">${item.name}</td>
              <td class="col-qty">${item.quantity}</td>
              <td class="col-rate">₹${item.rate}</td>
              <td class="col-amt">₹${item.price}</td>
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
        <div class="total-payable"><strong>Total Payable:</strong><strong>₹${data.totals.totalPayable}</strong></div>
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
  if (server) {
    server.close();
  }
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
