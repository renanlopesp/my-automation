import { preparePage, takeScreenshot } from '#ops'
import { logger, sleep } from '#utils'
import { loginWebflow } from './loginWebflow.js'
import { createSafePage } from '../utils/safePage.js'

export async function checkAndLogin(browser, options) {
  const { selectors } = options
  const page = await preparePage(browser)

  const safePage = createSafePage(page)

  try {
    await safePage.goto('https://webflow.com/dashboard', {}, 'Dashboard Check')
    await sleep(2000)

    await takeScreenshot(page, 'login-check', options)

    try {
      await page.waitForSelector(selectors.container, { timeout: 5000 })
      logger.info('Already logged in to Webflow')
      return true
    } catch (err) {
      try {
        await page.waitForSelector(selectors.loginUsername, { timeout: 3000 })
        logger.info('Not logged in, redirected to login page')
      } catch (loginErr) {
        logger.info('Navigating to login page')
        await safePage.goto('https://webflow.com/login', {}, 'Login Page')

        await page.waitForSelector(selectors.loginUsername, { timeout: 5000 })
      }

      await page.close()

      logger.info('Logging in to Webflow...')
      await loginWebflow(browser, options)
      return true
    }
  } catch (err) {
    logger.error('Error during login check:', err)
    await page.close()
    throw err
  } finally {
    if (!page.isClosed()) {
      await page.close()
    }
  }
}
