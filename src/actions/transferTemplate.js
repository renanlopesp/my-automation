import { takeScreenshot } from '#ops'
import { logger, sleep } from '#utils'
import { SECOND, SECONDS_30 } from '#data'
import {
  renameTemplate,
  doTransfer,
  duplicateTemplate,
  filterTemplate,
  closeWhatsNewDialog,
  checkAndLogin,
} from '#actions'
import { createSafePage } from '../utils/safePage.js'

export async function transferTemplate(page, browser, options) {
  const { selectors } = options

  await checkAndLogin(page, browser, options)

  // Use the existing page instead of creating a new one

  const safePage = createSafePage(page)

  try {
    await safePage.goto(
      'https://webflow.com/dashboard',
      {},
      options.templateName || 'Transfer Dashboard',
    )
    await page.locator(selectors.container).waitFor({
      timeout: SECONDS_30,
    })

    await takeScreenshot(page, '0-start', options)

    await closeWhatsNewDialog(page, options)

    await filterTemplate(page, options)

    await safePage.checkForCaptcha(options.templateName + ' Filter')

    await takeScreenshot(page, '1-filter', options)

    await duplicateTemplate(page, options)

    await safePage.checkForCaptcha(options.templateName + ' Duplicate')

    await takeScreenshot(page, '2-duplicate', options)

    await sleep(SECOND * 5)
    const { templateInternalUrl } = await renameTemplate(page, options)

    await safePage.checkForCaptcha(options.templateName + ' Pre-Transfer')

    await doTransfer(page, options, templateInternalUrl)

    // Keep the page open to maintain session
    return options
  } catch (err) {
    await takeScreenshot(page, '99-transfer-error', options)
    // Keep the page open to maintain session

    logger.error(err)
    throw new Error(
      `transferTemplate Error: ${options?.id}, on item: ${options?.templateName}`,
    )
  }
}
