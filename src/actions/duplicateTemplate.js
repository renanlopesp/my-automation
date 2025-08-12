import { takeScreenshot } from '#ops'
import { sleep, logger } from '#utils'

export async function duplicateTemplate(page, options) {
  const { selectors } = options
  const menuButtonSelector = `${selectors.card} >div:nth-child(1) ${selectors.cardMenuButton}`

  try {
    await page.locator(menuButtonSelector).waitFor({ timeout: 1000 * 2 })
    await takeScreenshot(page, 'duplicate-0-menu-selector', options)
    await page.click(menuButtonSelector)
  } catch (err) {
    logger.error(err)
    throw new Error('duplicateTemplate Error: Menu button not found')
  }

  try {
    await sleep(500)
    const duplicateSelector = `${selectors.cardMenuButtonDuplicate}`
    await page.locator(duplicateSelector).waitFor()
    await takeScreenshot(page, 'duplicate-1-duplicate-menu', options)
    await page.click(duplicateSelector)
  } catch (err) {
    logger.error(err)
    throw new Error('duplicateTemplate Error: Duplicate option not found')
  }

  try {
    await sleep(500)
    await page.locator(selectors.modalDuplicate).waitFor({ timeout: 1000 * 2 })
    await takeScreenshot(page, 'duplicate-2-duplicate-button', options)
    await page.click(selectors.modalDuplicate)
    await sleep(500)
    await takeScreenshot(page, 'duplicate-3-duplicate-started', options)
  } catch (err) {
    logger.error(err)
    throw new Error(
      'duplicateTemplate Error: Duplicate button disabled or not found',
    )
  }
}
