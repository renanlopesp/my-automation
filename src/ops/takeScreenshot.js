/** @typedef {import("puppeteer").Page} Page */
/** @typedef {import("puppeteer").Browser} Browser */
/** @typedef {} TransferOptions */

import { logger } from '#utils'

/**
 * Prepares a new page with a specified viewport in a browser.
 * @param {Page} page - The browser instance to create a new page in.
 * @param {String} name - The browser instance to create a new page in.
 * @param {import("../data/index.js").TransferOptions} options - Transfer options;
 * @returns {Promise<Page>} A Promise that resolves to the new page object.
 */
export async function takeScreenshot(page, name, options) {
  const path = `${options.screenshotDir}/${Date.now()}-${name}.jpg`
  logger.info(`Screenshot: ${path}`)
  await page.screenshot({ fullPage: true, path })
}
