import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

const ADMIN_TOKEN = 'kd_admin_KrishiDrishti2026';
const BASE_URL = 'http://localhost:3001';
const SCREENS_DIR = 'c:\\Users\\bhage\\Desktop\\Krishi-Drishti\\screens';

if (!fs.existsSync(SCREENS_DIR)) {
  fs.mkdirSync(SCREENS_DIR, { recursive: true });
  console.log('Created screens directory:', SCREENS_DIR);
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function run() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
    defaultViewport: { width: 1440, height: 900 }
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    console.log('Navigating to', BASE_URL);
    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(3000);

    // Inject admin token to skip login modal
    await page.evaluate((token) => {
      localStorage.setItem('kd_admin_token', token);
    }, ADMIN_TOKEN);

    await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(4000);

    async function clickNav(label) {
      const clicked = await page.evaluate((lbl) => {
        const buttons = Array.from(document.querySelectorAll('button, nav button'));
        const match = buttons.find(b => b.textContent.trim().includes(lbl));
        if (match) { match.click(); return true; }
        return false;
      }, label);
      if (!clicked) console.warn('  Could not find nav:', label);
      await sleep(3500);
    }

    // Screenshot 1: Overview / Admin Dashboard
    console.log('Screenshot 1: Admin Dashboard (Overview)');
    await clickNav('Overview');
    await sleep(2000);
    await page.screenshot({ path: path.join(SCREENS_DIR, '01_Admin_Dashboard.png'), fullPage: false });
    console.log('  Saved: 01_Admin_Dashboard.png');

    // Screenshot 2: Farmer Registry
    console.log('Screenshot 2: Farmer Registry');
    await clickNav('Farmer Registry');
    await sleep(2000);
    await page.screenshot({ path: path.join(SCREENS_DIR, '02_User_Roles_Permissions.png'), fullPage: false });
    console.log('  Saved: 02_User_Roles_Permissions.png');

    // Screenshot 3: Carbon Queue
    console.log('Screenshot 3: Carbon Queue');
    await clickNav('Carbon Queue');
    await sleep(2000);
    await page.screenshot({ path: path.join(SCREENS_DIR, '03_Carbon_Credit_Management.png'), fullPage: false });
    console.log('  Saved: 03_Carbon_Credit_Management.png');

    // Screenshot 4: Audit Log
    console.log('Screenshot 4: Audit Log');
    await clickNav('Audit Log');
    await sleep(2000);
    await page.screenshot({ path: path.join(SCREENS_DIR, '04_System_Logs_API_Status.png'), fullPage: false });
    console.log('  Saved: 04_System_Logs_API_Status.png');

    // Screenshot 5: Public view (AgritechDashboard)
    console.log('Screenshot 5: Public AgritechDashboard');
    await page.evaluate(() => localStorage.removeItem('kd_admin_token'));
    await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(4000);
    await page.screenshot({ path: path.join(SCREENS_DIR, '05_Database_Management.png'), fullPage: false });
    console.log('  Saved: 05_Database_Management.png');

    console.log('All 5 screenshots captured!');

  } finally {
    await browser.close();
  }
}

run().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
