import { CaptchaDetector } from './captchaDetector.js'
import { logger, sleep } from './index.js'

/**
 * Safe Page Navigation Utility
 * Automatically detects and handles CAPTCHAs when navigating to any page
 */
export class SafePage {
  constructor(page, options = {}) {
    this.page = page
    this.captchaDetector = new CaptchaDetector({
      adminEmail: process.env.ADMIN_EMAIL || 'admin@tem.place',
      serverUrl: process.env.EC2_SERVER_URL || '',
      waitTimeout: parseInt(process.env.CAPTCHA_WAIT_TIMEOUT) || 300000,
      ...options,
    })
  }

  /**
   * Safe page navigation with automatic CAPTCHA detection and handling
   * @param {string} url - URL to navigate to
   * @param {Object} options - Navigation options
   * @param {string} contextName - Context name for logging/screenshots (e.g., 'Login Page', 'Dashboard')
   * @param {number} maxRetries - Maximum retries if CAPTCHA blocks navigation
   * @returns {Promise<Object>} Navigation result
   */
  async goto(
    url,
    options = {},
    contextName = 'Page Navigation',
    maxRetries = 3,
  ) {
    let attempt = 0

    while (attempt < maxRetries) {
      try {
        attempt++
        logger.info(
          `🌐 Navigating to: ${url} (attempt ${attempt}/${maxRetries})`,
        )

        // Perform the navigation
        const response = await this.page.goto(url, {
          waitUntil: 'networkidle0',
          timeout: 30000,
          ...options,
        })

        // Wait a moment for the page to fully load
        await sleep(2000)

        // Check for CAPTCHA immediately after navigation
        logger.info(`🔍 Checking for CAPTCHA on ${contextName}...`)
        const captchaResult = await this.captchaDetector.detectCaptcha(
          this.page,
          contextName,
        )

        if (captchaResult.detected) {
          if (captchaResult.resolved) {
            logger.info('✅ CAPTCHA was resolved, continuing navigation...')

            // Wait for page to stabilize after CAPTCHA resolution
            await sleep(5000)

            // Verify we're on the correct page after CAPTCHA resolution
            const currentUrl = this.page.url()
            if (!currentUrl.includes(new URL(url).pathname)) {
              logger.info(
                '🔄 Not on target page after CAPTCHA resolution, re-navigating...',
              )
              // Recursive call with reduced retry count
              if (attempt < maxRetries) {
                continue // Try again
              } else {
                throw new Error(
                  `Failed to reach target page ${url} after CAPTCHA resolution`,
                )
              }
            }

            return {
              success: true,
              response,
              captchaDetected: true,
              captchaResolved: true,
              attempt,
            }
          } else {
            logger.error(
              '❌ CAPTCHA detected but not resolved during navigation',
            )
            throw new Error(
              `CAPTCHA detected but not resolved when navigating to ${url}`,
            )
          }
        }

        // No CAPTCHA detected, navigation successful
        logger.info(`✅ Successfully navigated to ${url}`)
        return {
          success: true,
          response,
          captchaDetected: false,
          attempt,
        }
      } catch (error) {
        logger.error(`❌ Navigation attempt ${attempt} failed:`, error.message)

        if (attempt >= maxRetries) {
          logger.error(
            `❌ All ${maxRetries} navigation attempts failed for ${url}`,
          )
          throw new Error(
            `Failed to navigate to ${url} after ${maxRetries} attempts: ${error.message}`,
          )
        }

        // Wait before retrying
        await sleep(3000)
        logger.info(`🔄 Retrying navigation to ${url}...`)
      }
    }
  }

  /**
   * Wait for selector with CAPTCHA awareness
   * @param {string} selector - CSS selector to wait for
   * @param {Object} options - Wait options
   * @param {string} contextName - Context name for logging
   * @returns {Promise<Element>} Found element
   */
  async waitForSelector(selector, options = {}, contextName = 'Element Wait') {
    try {
      logger.info(`⏳ Waiting for selector: ${selector}`)

      const element = await this.page.locator(selector).waitFor({
        timeout: 10000,
        ...options,
      })

      // Check for CAPTCHA if element not found within reasonable time
      if (!element && options.timeout > 5000) {
        logger.info('🔍 Element not found, checking for CAPTCHA...')
        const captchaResult = await this.captchaDetector.detectCaptcha(
          this.page,
          contextName,
        )

        if (captchaResult.detected && captchaResult.resolved) {
          logger.info('✅ CAPTCHA resolved, retrying selector wait...')
          await sleep(3000)
          return await this.page.locator(selector).waitFor(options)
        }
      }

      return element
    } catch (error) {
      // Before failing, check if a CAPTCHA is blocking us
      logger.info('🔍 Selector wait failed, checking for CAPTCHA...')
      const captchaResult = await this.captchaDetector.detectCaptcha(
        this.page,
        contextName,
      )

      if (captchaResult.detected && captchaResult.resolved) {
        logger.info('✅ CAPTCHA resolved, retrying selector wait...')
        await sleep(3000)
        return await this.page.locator(selector).waitFor(options)
      }

      throw error
    }
  }

  /**
   * Click with CAPTCHA awareness
   * @param {string} selector - CSS selector to click
   * @param {Object} options - Click options
   * @param {string} contextName - Context name for logging
   * @returns {Promise<void>}
   */
  async click(selector, options = {}, contextName = 'Click Action') {
    try {
      logger.info(`👆 Clicking: ${selector}`)
      await this.page.click(selector, options)

      // Wait after click and check for CAPTCHA
      await sleep(1000)
      const captchaResult = await this.captchaDetector.detectCaptcha(
        this.page,
        contextName,
      )

      if (captchaResult.detected && !captchaResult.resolved) {
        throw new Error(`CAPTCHA appeared after clicking ${selector}`)
      }
    } catch (error) {
      logger.error(`❌ Click failed on ${selector}:`, error.message)
      throw error
    }
  }

  /**
   * Type with CAPTCHA awareness
   * @param {string} selector - CSS selector to type in
   * @param {string} text - Text to type
   * @param {Object} options - Type options
   * @param {string} contextName - Context name for logging
   * @returns {Promise<void>}
   */
  async type(selector, text, options = {}, contextName = 'Type Action') {
    try {
      logger.info(`⌨️  Typing in: ${selector}`)
      await this.page.locator(selector).pressSequentially(text, options)

      // Check for CAPTCHA after typing (sometimes triggered by form interactions)
      const captchaResult = await this.captchaDetector.detectCaptcha(
        this.page,
        contextName,
      )

      if (captchaResult.detected && !captchaResult.resolved) {
        throw new Error(`CAPTCHA appeared after typing in ${selector}`)
      }
    } catch (error) {
      logger.error(`❌ Type failed on ${selector}:`, error.message)
      throw error
    }
  }

  /**
   * Get underlying Puppeteer page object for advanced operations
   * @returns {Page} Puppeteer page object
   */
  getPage() {
    return this.page
  }

  /**
   * Check for CAPTCHA manually
   * @param {string} contextName - Context name for logging
   * @returns {Promise<Object>} CAPTCHA detection result
   */
  async checkForCaptcha(contextName = 'Manual Check') {
    return await this.captchaDetector.detectCaptcha(this.page, contextName)
  }
}

/**
 * Create a safe page wrapper around a Puppeteer page
 * @param {Page} page - Puppeteer page object
 * @param {Object} options - SafePage options
 * @returns {SafePage} SafePage instance
 */
export function createSafePage(page, options = {}) {
  return new SafePage(page, options)
}

/**
 * Enhanced preparePage function that returns a SafePage wrapper
 * @param {Browser} browser - Puppeteer browser instance
 * @param {Object} options - Page preparation options
 * @returns {Promise<SafePage>} SafePage instance
 */
export async function prepareSafePage(browser, options = {}) {
  const page = await browser.newPage()

  // Set realistic viewport and user agent (same as original preparePage)
  await page.setViewport({
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
  })

  await page.setUserAgent(
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  )

  // Override permissions
  const context = browser.defaultBrowserContext()
  await context.overridePermissions('https://webflow.com', [
    'geolocation',
    'notifications',
  ])

  return new SafePage(page, options)
}
