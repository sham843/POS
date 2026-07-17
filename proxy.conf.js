const fs = require('fs');
const path = require('path');

let targetUrl = 'https://demoposapi.hitechdairy.in'; // DeV
// let targetUrl = 'https://uatposapi.hitechdairy.in'; // UAT
// let targetUrl = 'https://posapi.hitechdairy.in'; // Production

try {
  const configPath = path.join(__dirname, 'public/assets/config/app-config.json');
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (config.proxyTarget) {
      targetUrl = config.proxyTarget;
    } else if (config.apiUrl) {
      targetUrl = config.apiUrl;
    }
  }
} catch (e) {
  console.error('[Proxy Config] Error reading app-config.json', e);
}

console.log(`[Dev Proxy] Forwarding /api/ to ${targetUrl}`);

const PROXY_CONFIG = {
  "/api": {
    "target": targetUrl,
    "secure": false,
    "changeOrigin": true,
    "logLevel": "debug"
  }
};

module.exports = PROXY_CONFIG;
