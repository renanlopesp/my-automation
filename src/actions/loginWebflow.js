import { WEBFLOW_LOGIN_URL } from '#config'
import { takeScreenshot } from '#ops'
import {
  humanType,
  simulateReading,
  addRandomMouseMovement,
  sleep,
  logger,
} from '#utils'
import { createSafePage } from '../utils/safePage.js'

export async function loginWebflow(page, browser, options) {
  const { selectors, credentials } = options
  // Use the existing page instead of creating a new one

  const safePage = createSafePage(page)

  try {
    await safePage.goto(WEBFLOW_LOGIN_URL, {}, 'Login Process')
    await takeScreenshot(page, 'pre-login', options)

    await simulateReading(200)
    await addRandomMouseMovement(page)

    await page.locator(selectors.loginUsername).waitFor()

    await humanType(page, selectors.loginUsername, credentials.username, {
      minDelay: 80,
      maxDelay: 200,
      clearFirst: true,
    })

    await sleep(800 + Math.random() * 1200)

    await humanType(page, selectors.loginPassword, credentials.password, {
      minDelay: 60,
      maxDelay: 180,
      clearFirst: false,
    })

    await simulateReading(50)

    await safePage.click(
      selectors.loginSubmit,
      {
        delay: 500 + Math.random() * 1000,
      },
      'Login Submit',
    )

    logger.info('Waiting for login to complete...')

    await sleep(3000 + Math.random() * 2000)
    logger.info('Login complete')

    await takeScreenshot(page, 'post-login', options)
    // Keep the page open to maintain the login session
  } catch (error) {
    logger.error('Login failed:', error)
    throw error
  }
}
