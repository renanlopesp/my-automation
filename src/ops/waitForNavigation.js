import { sleep } from "#utils";

export async function waitForNavigation(
  page,
  waitUntil = "networkidle0",
  timeout = 1000,
  sleepout = 1000
) {
  try {
    await page.waitForNavigation({ waitUntil, timeout });
  } catch (err) {
    await sleep(sleepout);
  }
}
