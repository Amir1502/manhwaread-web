#!/usr/bin/env node

/**
 * ManhwaRead Auto-Pinger
 * Keeps Render.com free instance awake by sending periodic HTTP requests.
 */

const https = require('https');
const http = require('http');

const TARGET_URL = process.env.PING_URL || process.argv[2] || 'https://manhwaread-web.onrender.com/api/health';
const INTERVAL_MIN = Math.max(1, parseInt(process.env.PING_INTERVAL_MINUTES || '10', 10));
const INTERVAL_MS = INTERVAL_MIN * 60 * 1000;

let pingCount = 0;
let successCount = 0;
let failureCount = 0;

function log(msg) {
  const time = new Date().toLocaleTimeString('ru-RU');
  console.log(`[${time}] ${msg}`);
}

function ping() {
  pingCount++;
  const start = Date.now();
  const urlObj = new URL(TARGET_URL);
  const client = urlObj.protocol === 'https:' ? https : http;

  const req = client.get(
    TARGET_URL,
    {
      timeout: 45000,
      headers: {
        'User-Agent': 'ManhwaRead-Pinger/1.0',
        'Cache-Control': 'no-cache',
      },
      rejectUnauthorized: false, // In case of custom cert issues
    },
    res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        const elapsed = Date.now() - start;
        if (res.statusCode >= 200 && res.statusCode < 400) {
          successCount++;
          log(`✅ Ping #${pingCount}: HTTP ${res.statusCode} in ${elapsed}ms | Успешно: ${successCount}, Ошибок: ${failureCount}`);
        } else {
          failureCount++;
          log(`⚠️ Ping #${pingCount}: HTTP ${res.statusCode} in ${elapsed}ms (нестандартный статус)`);
        }
      });
    }
  );

  req.on('timeout', () => {
    req.destroy();
    failureCount++;
    log(`⏱️ Ping #${pingCount}: Таймаут запроса (>45с). Сервис просыпается...`);
  });

  req.on('error', err => {
    failureCount++;
    log(`❌ Ping #${pingCount}: Ошибка соединения (${err.message})`);
  });
}

console.log('='.repeat(55));
console.log('🚀 ManhwaRead Auto-Pinger запущен');
console.log(`🎯 Целевой URL:   ${TARGET_URL}`);
console.log(`⏰ Интервал:      каждые ${INTERVAL_MIN} минут`);
console.log('='.repeat(55));

// Initial ping immediately
ping();

// Recurring timer
const timer = setInterval(ping, INTERVAL_MS);

// Handle graceful exit
process.on('SIGINT', () => {
  clearInterval(timer);
  console.log('\n🛑 Пингер остановлен пользователем.');
  process.exit(0);
});

process.on('SIGTERM', () => {
  clearInterval(timer);
  process.exit(0);
});
