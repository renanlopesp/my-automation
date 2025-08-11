import { createSafePage } from './safePage.js'
import { logger } from './logger.js'

/**
 * Migration utilities for converting existing page operations to CAPTCHA-aware operations
 */

/**
 * Wrap an existing Puppeteer page with SafePage for automatic CAPTCHA detection
 * @param {Page} page - Existing Puppeteer page
 * @param {Object} options - SafePage options
 * @returns {SafePage} SafePage wrapper
 */
export function wrapPageWithCaptchaDetection(page, options = {}) {
  logger.info('🔒 Wrapping page with CAPTCHA detection capabilities')
  return createSafePage(page, options)
}

/**
 * Create a CAPTCHA-aware version of page.goto
 * @param {Page} page - Puppeteer page
 * @param {string} url - URL to navigate to
 * @param {Object} options - Navigation options
 * @param {string} contextName - Context name for logging/screenshots
 * @returns {Promise<Response>} Navigation response
 */
export async function safeGoto(
  page,
  url,
  options = {},
  contextName = 'Page Navigation',
) {
  const safePage = createSafePage(page)
  const result = await safePage.goto(url, options, contextName)
  return result.response
}

/**
 * Create a CAPTCHA-aware version of page.click
 * @param {Page} page - Puppeteer page
 * @param {string} selector - CSS selector to click
 * @param {Object} options - Click options
 * @param {string} contextName - Context name for logging
 * @returns {Promise<void>}
 */
export async function safeClick(
  page,
  selector,
  options = {},
  contextName = 'Click Action',
) {
  const safePage = createSafePage(page)
  await safePage.click(selector, options, contextName)
}

/**
 * Create a CAPTCHA-aware version of page.type
 * @param {Page} page - Puppeteer page
 * @param {string} selector - CSS selector to type in
 * @param {string} text - Text to type
 * @param {Object} options - Type options
 * @param {string} contextName - Context name for logging
 * @returns {Promise<void>}
 */
export async function safeType(
  page,
  selector,
  text,
  options = {},
  contextName = 'Type Action',
) {
  const safePage = createSafePage(page)
  await safePage.type(selector, text, options, contextName)
}

/**
 * Create a CAPTCHA-aware version of page.waitForSelector
 * @param {Page} page - Puppeteer page
 * @param {string} selector - CSS selector to wait for
 * @param {Object} options - Wait options
 * @param {string} contextName - Context name for logging
 * @returns {Promise<Element>} Found element
 */
export async function safeWaitForSelector(
  page,
  selector,
  options = {},
  contextName = 'Element Wait',
) {
  const safePage = createSafePage(page)
  return await safePage.waitForSelector(selector, options, contextName)
}

/**
 * Check for CAPTCHA on any page without taking action
 * @param {Page} page - Puppeteer page
 * @param {string} contextName - Context name for logging
 * @returns {Promise<Object>} CAPTCHA detection result
 */
export async function checkPageForCaptcha(page, contextName = 'Manual Check') {
  const safePage = createSafePage(page)
  return await safePage.checkForCaptcha(contextName)
}

/**
 * Migration helper: Replace page operations in a function with CAPTCHA-aware versions
 * @param {Page} page - Puppeteer page
 * @param {Function} pageFunction - Function that performs page operations
 * @param {string} contextName - Context name for logging
 * @returns {Promise<any>} Result of the page function
 */
export async function withCaptchaDetection(
  page,
  pageFunction,
  contextName = 'Page Operations',
) {
  const safePage = createSafePage(page)

  logger.info(
    `🔍 Executing page operations with CAPTCHA detection: ${contextName}`,
  )

  // Create a proxy object that provides safe page operations
  const safePageOperations = {
    page: page, // Original page for backward compatibility
    safePage: safePage, // SafePage wrapper
    goto: (url, options = {}) => safePage.goto(url, options, contextName),
    click: (selector, options = {}) =>
      safePage.click(selector, options, contextName),
    type: (selector, text, options = {}) =>
      safePage.type(selector, text, options, contextName),
    waitForSelector: (selector, options = {}) =>
      safePage.waitForSelector(selector, options, contextName),
    checkForCaptcha: () => safePage.checkForCaptcha(contextName),
  }

  return await pageFunction(safePageOperations)
}

/**
 * Batch migration utility: Apply CAPTCHA detection to multiple page operations
 * @param {Page} page - Puppeteer page
 * @param {Array} operations - Array of operation objects
 * @param {string} contextName - Context name for logging
 * @returns {Promise<Array>} Results of all operations
 */
export async function executeSafeOperations(
  page,
  operations,
  contextName = 'Batch Operations',
) {
  const safePage = createSafePage(page)
  const results = []

  logger.info(
    `🔍 Executing ${operations.length} safe operations: ${contextName}`,
  )

  for (let i = 0; i < operations.length; i++) {
    const operation = operations[i]
    const opContext = `${contextName} - ${operation.name || `Operation ${i + 1}`}`

    try {
      let result

      switch (operation.type) {
        case 'goto':
          result = await safePage.goto(
            operation.url,
            operation.options || {},
            opContext,
          )
          break

        case 'click':
          result = await safePage.click(
            operation.selector,
            operation.options || {},
            opContext,
          )
          break

        case 'type':
          result = await safePage.type(
            operation.selector,
            operation.text,
            operation.options || {},
            opContext,
          )
          break

        case 'waitForSelector':
          result = await safePage.waitForSelector(
            operation.selector,
            operation.options || {},
            opContext,
          )
          break

        case 'checkCaptcha':
          result = await safePage.checkForCaptcha(opContext)
          break

        default:
          throw new Error(`Unknown operation type: ${operation.type}`)
      }

      results.push({ success: true, result, operation })
    } catch (error) {
      logger.error(`❌ Operation failed: ${opContext}`, error)
      results.push({ success: false, error: error.message, operation })

      // If it's a critical operation, stop the batch
      if (operation.critical !== false) {
        throw error
      }
    }
  }

  return results
}

/**
 * Example usage and migration patterns
 */
export const migrationExamples = {
  // Before: Direct page.goto
  before_goto: `
    await page.goto('https://webflow.com/dashboard')
  `,

  // After: CAPTCHA-aware navigation
  after_goto: `
    const safePage = createSafePage(page)
    await safePage.goto('https://webflow.com/dashboard', {}, 'Dashboard')
    
    // OR using utility:
    await safeGoto(page, 'https://webflow.com/dashboard', {}, 'Dashboard')
  `,

  // Before: Multiple page operations
  before_multiple: `
    await page.goto('https://webflow.com/login')
    await page.click('#email')
    await page.type('#email', 'user@example.com')
    await page.click('#submit')
  `,

  // After: CAPTCHA-aware operations
  after_multiple: `
    const operations = [
      { type: 'goto', url: 'https://webflow.com/login', name: 'Login Page' },
      { type: 'click', selector: '#email', name: 'Click Email Field' },
      { type: 'type', selector: '#email', text: 'user@example.com', name: 'Type Email' },
      { type: 'click', selector: '#submit', name: 'Submit Login' }
    ]
    
    await executeSafeOperations(page, operations, 'Login Process')
  `,

  // Using withCaptchaDetection wrapper
  wrapper_example: `
    await withCaptchaDetection(page, async (safe) => {
      await safe.goto('https://webflow.com/dashboard')
      await safe.click('.some-button')
      await safe.type('#input', 'some text')
      
      // Check for CAPTCHA manually at any point
      const captchaResult = await safe.checkForCaptcha()
      
      if (!captchaResult.detected) {
        await safe.click('#submit')
      }
    }, 'Complex Page Operations')
  `,
}

/**
 * Quick migration helper for common patterns
 */
export const quickMigration = {
  /**
   * Convert a simple page.goto call
   */
  goto: (page, url, contextName) => safeGoto(page, url, {}, contextName),

  /**
   * Convert login flow with CAPTCHA detection
   */
  login: async (page, credentials, selectors, contextName = 'Login') => {
    return await withCaptchaDetection(
      page,
      async safe => {
        await safe.goto('https://webflow.com/login')
        await safe.click(selectors.username)
        await safe.type(selectors.username, credentials.username)
        await safe.type(selectors.password, credentials.password)
        await safe.click(selectors.submit)
      },
      contextName,
    )
  },

  /**
   * Convert dashboard navigation with CAPTCHA detection
   */
  dashboard: async (page, contextName = 'Dashboard') => {
    return await withCaptchaDetection(
      page,
      async safe => {
        await safe.goto('https://webflow.com/dashboard')
        await safe.checkForCaptcha()
      },
      contextName,
    )
  },
}
