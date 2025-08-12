import { sleep } from '#utils';

export async function waitForNavigation(
  page,
  waitUntil = 'networkidle0',
  timeout = 1000,
  sleepout = 1000
) {
  try {
    // Convert Puppeteer waitUntil values to Patchright/Playwright values
    const state = waitUntil === 'networkidle0' || waitUntil === 'networkidle2' 
      ? 'networkidle' 
      : waitUntil;
    
    await page.waitForLoadState(state, { timeout });
  } catch (err) {
    await sleep(sleepout);
  }
}
