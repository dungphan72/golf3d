import { chromium } from '@playwright/test';

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });

  await page.goto('https://sigolf.vn/parking', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Click My Tickets
  const myTicketsBtn = page.locator('.pk-bottom-nav button').filter({ hasText: /Vé của tôi/i });
  if (await myTicketsBtn.isVisible()) {
    await myTicketsBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: 'C:/Users/Administrator/.gemini/antigravity/brain/1c0c5d45-7b01-4c88-83bb-548783ea7b87/audit-mob-mytickets-clean.png' });
  }

  // Click Info
  const infoBtn = page.locator('.pk-bottom-nav button').filter({ hasText: /Thông tin bãi/i });
  if (await infoBtn.isVisible()) {
    await infoBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: 'C:/Users/Administrator/.gemini/antigravity/brain/1c0c5d45-7b01-4c88-83bb-548783ea7b87/audit-mob-info-clean.png' });
  }

  await browser.close();
  console.log('Saved clean mytickets and info.');
}

main().catch(console.error);
