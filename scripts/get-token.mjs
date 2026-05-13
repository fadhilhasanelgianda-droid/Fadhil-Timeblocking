/**
 * Script satu kali untuk mendapatkan Google OAuth2 refresh token.
 *
 * Usage:
 *   node scripts/get-token.mjs /path/to/client_secret_xxx.json
 *
 * File JSON didownload dari Google Cloud Console →
 *   APIs & Services → Credentials → OAuth 2.0 Client IDs → Download JSON
 *
 * Setelah dapat token, tambahkan ke .env dan script ini tidak perlu dijalankan lagi.
 */

import { google } from 'googleapis';
import http from 'http';
import { exec } from 'child_process';
import { readFileSync } from 'fs';

// --- Baca client credentials dari file JSON yang di-pass sebagai argumen ---
const jsonPath = process.argv[2];

if (!jsonPath) {
  console.error('\n❌ Usage: node scripts/get-token.mjs <path-to-client-secret.json>');
  console.error('   Contoh: node scripts/get-token.mjs ~/Downloads/client_secret_xxx.json\n');
  process.exit(1);
}

let CLIENT_ID, CLIENT_SECRET;

try {
  const raw = JSON.parse(readFileSync(jsonPath, 'utf-8'));
  // File JSON dari Google bisa berformat { installed: {...} } atau { web: {...} }
  const creds = raw.installed || raw.web;
  if (!creds?.client_id || !creds?.client_secret) {
    throw new Error('Format JSON tidak valid.');
  }
  CLIENT_ID     = creds.client_id;
  CLIENT_SECRET = creds.client_secret;
} catch (err) {
  console.error(`\n❌ Gagal membaca file JSON: ${err.message}\n`);
  process.exit(1);
}

const REDIRECT_URI = 'http://localhost:3001';
const PORT         = 3001;

const oauth2 = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/spreadsheets'],
  prompt: 'consent',
});

// Buka browser otomatis
const opener = process.platform === 'darwin' ? 'open'
             : process.platform === 'win32'  ? 'start'
             : 'xdg-open';
exec(`${opener} "${authUrl}"`);

console.log('\n🔗 Browser sedang dibuka untuk authorization Google...');
console.log('\nKalau browser tidak terbuka otomatis, buka URL ini manual:');
console.log('\n' + authUrl + '\n');
console.log('⏳ Menunggu authorization...\n');

const server = http.createServer(async (req, res) => {
  const url  = new URL(req.url, REDIRECT_URI);
  const code = url.searchParams.get('code');

  if (!code) {
    res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h2>❌ Tidak ada kode authorization. Coba ulangi.</h2>');
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`
    <html><body style="font-family:sans-serif;padding:40px;text-align:center">
      <h1>✅ Authorization berhasil!</h1>
      <p>Tutup tab ini dan lihat terminal untuk refresh token kamu.</p>
    </body></html>
  `);

  try {
    const { tokens } = await oauth2.getToken(code);

    if (!tokens.refresh_token) {
      console.error('❌ refresh_token tidak diterima.');
      console.error('   Cabut akses di https://myaccount.google.com/permissions lalu jalankan ulang.\n');
      server.close();
      return;
    }

    console.log('✅ Berhasil! Tambahkan baris berikut ke file .env kamu:\n');
    console.log('─'.repeat(60));
    console.log(`GOOGLE_CLIENT_ID=${CLIENT_ID}`);
    console.log(`GOOGLE_CLIENT_SECRET=${CLIENT_SECRET}`);
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log(`GOOGLE_SPREADSHEET_ID=<isi_spreadsheet_id_kamu>`);
    console.log('─'.repeat(60));
    console.log('\n✅ Setelah .env diisi, jalankan: npm run dev\n');
  } catch (err) {
    console.error('❌ Gagal exchange token:', err.message);
  }

  server.close();
});

server.listen(PORT, () => {
  console.log(`Server menunggu di http://localhost:${PORT}`);
});
