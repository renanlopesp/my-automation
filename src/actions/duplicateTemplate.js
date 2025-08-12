import { takeScreenshot } from '#ops'
import { sleep, logger } from '#utils'

export async function duplicateTemplate(page, options) {
  const { selectors } = options
  const cardSelector = `${selectors.card} >div:nth-child(1)`
  const menuButtonSelector = `${cardSelector} ${selectors.cardMenuButton}`

  try {
    // First check if the card exists
    try {
      await page.waitForSelector(cardSelector, { 
        timeout: 1000 * 2,
        visible: true
      })
    } catch (err) {
      logger.error('Card not found for duplication')
      throw new Error('duplicateTemplate Error: Template card not found')
    }
    
    // Hover over the card to reveal the menu button
    await page.hover(cardSelector)
    await sleep(500)
    
    // Try to find the menu button with increased timeout
    try {
      await page.waitForSelector(menuButtonSelector, { timeout: 1000 * 5 })
    } catch (err) {
      // Retry with another hover if first attempt fails
      logger.warn('Menu button not found in duplicate, retrying with hover...')
      await page.hover(cardSelector)
      await sleep(1000)
      await page.waitForSelector(menuButtonSelector, { timeout: 1000 * 3 })
    }
    
    await takeScreenshot(page, 'duplicate-0-menu-selector', options)
    await page.click(menuButtonSelector)
  } catch (err) {
    logger.error(err)
    throw new Error('duplicateTemplate Error: Menu button not found')
  }

  try {
    await sleep(500)
    const duplicateSelector = `${selectors.cardMenuButtonDuplicate}`
    await page.waitForSelector(duplicateSelector)
    await takeScreenshot(page, 'duplicate-1-duplicate-menu', options)
    await page.click(duplicateSelector)
  } catch (err) {
    logger.error(err)
    throw new Error('duplicateTemplate Error: Duplicate option not found')
  }

  try {
    await sleep(500)
    await page.waitForSelector(selectors.modalDuplicate, { timeout: 1000 * 2 })
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
