import { takeScreenshot } from '#ops'
import { logger, sleep } from '#utils'
import { loginWebflow } from './loginWebflow.js'
import { createSafePage } from '../utils/safePage.js'

export async function checkAndLogin(page, browser, options) {
  const { selectors } = options
  // Use the existing page instead of creating a new one

  const safePage = createSafePage(page)

  try {
    await safePage.goto('https://webflow.com/dashboard', {}, 'Dashboard Check')
    await sleep(2000)

    await takeScreenshot(page, 'login-check', options)

    try {
      await page.locator(selectors.container).waitFor({ timeout: 5000 })
      logger.info('Already logged in to Webflow')
      return true
    } catch (err) {
      try {
        await page.locator(selectors.loginUsername).waitFor({ timeout: 3000 })
        logger.info('Not logged in, redirected to login page')
      } catch (loginErr) {
        logger.info('Navigating to login page')
        await safePage.goto('https://webflow.com/login', {}, 'Login Page')

        await page.locator(selectors.loginUsername).waitFor({ timeout: 5000 })
      }

      // Keep the page open to maintain session

      logger.info('Logging in to Webflow...')
      await loginWebflow(page, browser, options)
      return true
    }
  } catch (err) {
    logger.error('Error during login check:', err)
    // Keep the page open to maintain session
    throw err
  }
}
