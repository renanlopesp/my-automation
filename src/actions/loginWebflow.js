import { WEBFLOW_LOGIN_URL } from '#config'
import { preparePage, takeScreenshot } from '#ops'
import {
  humanType,
  humanClick,
  simulateReading,
  addRandomMouseMovement,
  sleep,
  logger,
} from '#utils'
import { createSafePage } from '../utils/safePage.js'

export async function loginWebflow(browser, options) {
  const { selectors, credentials } = options
  const page = await preparePage(browser)

  const safePage = createSafePage(page)

  try {
    await safePage.goto(WEBFLOW_LOGIN_URL, {}, 'Login Process')
    await takeScreenshot(page, 'pre-login', options)

    await simulateReading(200)
    await addRandomMouseMovement(page)

    await page.waitForSelector(selectors.loginUsername)

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
  } finally {
    // Always close the login page
    if (!page.isClosed()) {
      await page.close()
    }
  }
}
