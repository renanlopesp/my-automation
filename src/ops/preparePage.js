/** @typedef {import("patchright").Page} Page */
/** @typedef {import("patchright").Browser} Browser */

import { createSafePage } from '../utils/safePage.js'
import { tabManager } from '../utils/tabManager.js'

/**
 * Gets a page from the tab pool with stealth configurations.
 * Tab manager handles all anti-detection setup including:
 * - Viewport settings
 * - User agent headers
 * - Webdriver removal
 * - Chrome mocking
 * - Plugin/language spoofing
 * 
 * @param {Browser} browser - The browser instance (not used directly, kept for compatibility)
 * @param {Object} options - Configuration options
 * @param {boolean} options.withCaptchaDetection - If true, returns a SafePage wrapper with automatic CAPTCHA detection
 * @param {Function} options.customScripts - Additional scripts to inject
 * @param {Object} options.extraHeaders - Additional HTTP headers to set
 * @returns {Promise<Page|SafePage>} A Promise that resolves to the page object or SafePage wrapper.
 */
export async function preparePage(browser, options = {}) {
  // Get a tab from the pool (tab manager handles all stealth setup)
  const page = await tabManager.getTab(options)

  // Apply any custom scripts if provided
  if (options.customScripts) {
    await page.addInitScript(options.customScripts)
  }

  // Apply any custom headers if provided
  if (options.extraHeaders) {
    await page.setExtraHTTPHeaders(options.extraHeaders)
  }

  // Return SafePage wrapper if requested
  if (options.withCaptchaDetection) {
    return createSafePage(page, options)
  }

  return page
}