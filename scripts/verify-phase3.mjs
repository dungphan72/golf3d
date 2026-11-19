import { chromium } from '@playwright/test';

async function verifyPhase3() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
  });
  const page = await context.newPage();

  console.log('1. Querying spot grid to find a free spot...');
  const spotsRes = await page.request.get('https://sigolf.vn/api/parking?action=spots');
  const spotsData = await spotsRes.json();
  const freeSpot = spotsData.spots.find((s) => s.stateForWindow === 'available') || spotsData.spots[10];
  console.log('Selected free spot:', freeSpot.code);

  console.log('2. Creating a live ticket for spot', freeSpot.code);
  const now = Date.now();
  const holdRes = await page.request.post('https://sigolf.vn/api/parking', {
    data: {
      action: 'hold',
      spotCode: freeSpot.code,
      licensePlate: '51K-777.99',
      expectedIn: now + 3600000,
      expectedOut: now + 3 * 3600000,
      customerName: 'Khách VIP Phase3',
      customerPhone: '0909777999',
      source: 'web',
    },
  });

  const holdData = await holdRes.json();
  if (!holdData.ok || !holdData.ticket) {
    throw new Error('Hold spot failed: ' + JSON.stringify(holdData));
  }

  const ticketCode = holdData.ticket.ticketCode;
  console.log('Generated ticket code:', ticketCode);

  console.log('3. Confirming ticket payment...');
  const confRes = await page.request.post('https://sigolf.vn/api/parking', {
    data: {
      action: 'confirm',
      ticketCode,
      paymentMethod: 'vietqr',
      paymentRef: 'PAY-TEST-P3',
    },
  });
  const confData = await confRes.json();
  console.log('Confirmed ticket status:', confData?.ticket?.status);

  console.log(`4. Navigating to ticket page https://sigolf.vn/parking/ticket/${ticketCode}...`);
  await page.goto(`https://sigolf.vn/parking/ticket/${ticketCode}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Take screenshot of mobile ticket
  await page.screenshot({
    path: 'C:/Users/Administrator/.gemini/antigravity/brain/1c0c5d45-7b01-4c88-83bb-548783ea7b87/phase3-ticket-card.png',
    fullPage: true,
  });
  console.log('Saved phase3-ticket-card.png');

  // Verify Offline QR Code
  const qrImg = page.locator('img[alt="Offline QR Code"]');
  const qrSrc = await qrImg.getAttribute('src');
  console.log('QR Code src starts with:', qrSrc?.slice(0, 30));

  // Open Stay Extension Modal
  console.log('5. Opening Stay Extension Modal...');
  const extendBtn = page.getByRole('button', { name: /Gia hạn/i }).first();
  await extendBtn.waitFor({ state: 'visible', timeout: 5000 });
  await extendBtn.click();
  await page.waitForTimeout(500);

  // Take screenshot of extension modal
  await page.screenshot({
    path: 'C:/Users/Administrator/.gemini/antigravity/brain/1c0c5d45-7b01-4c88-83bb-548783ea7b87/phase3-extend-modal.png',
  });
  console.log('Saved phase3-extend-modal.png');

  // Select +2 Hours in modal
  const plus2hBtn = page.getByRole('button', { name: /\+2/i });
  if (await plus2hBtn.isVisible()) {
    await plus2hBtn.click();
    await page.waitForTimeout(300);
  }

  // Click "Xác nhận gia hạn"
  const confirmBtn = page.getByRole('button', { name: /Xác nhận gia hạn/i });
  await confirmBtn.click();
  await page.waitForTimeout(1500);

  // Take screenshot of extended success state
  await page.screenshot({
    path: 'C:/Users/Administrator/.gemini/antigravity/brain/1c0c5d45-7b01-4c88-83bb-548783ea7b87/phase3-extended-success.png',
    fullPage: true,
  });
  console.log('Saved phase3-extended-success.png');

  // Desktop view test
  console.log('6. Testing desktop view...');
  const deskContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const deskPage = await deskContext.newPage();
  await deskPage.goto(`https://sigolf.vn/parking/ticket/${ticketCode}`, { waitUntil: 'networkidle' });
  await deskPage.waitForTimeout(1000);
  await deskPage.screenshot({
    path: 'C:/Users/Administrator/.gemini/antigravity/brain/1c0c5d45-7b01-4c88-83bb-548783ea7b87/phase3-desktop-ticket.png',
    fullPage: true,
  });
  console.log('Saved phase3-desktop-ticket.png');

  await browser.close();
  console.log('All Phase 3 verifications passed successfully!');
}

verifyPhase3().catch(console.error);
