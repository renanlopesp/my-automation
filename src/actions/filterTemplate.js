import { takeScreenshot } from '#ops'
import { logger, ONE_SECOND, sleep } from '#utils'

export async function filterTemplate(page, options, name) {
  const { selectors } = options

  try {
    await page.waitForSelector(selectors.card, { timeout: ONE_SECOND * 5 })
    await page.waitForSelector(selectors.dashboardSearchBar, {
      timeout: ONE_SECOND * 5,
    })

    await takeScreenshot(page, `filter-0-click`, options)

    await page.click(selectors.dashboardSearchBar)
  } catch (err) {
    logger.error(err)
    throw new Error(`filterTemplate Error: Search bar error`)
  }

  const nameToType = name || options.templateName
  try {
    await page.type(selectors.dashboardSearchBar, nameToType, {
      delay: 33,
    })
    await takeScreenshot(page, `filter-1-type`, options)
    await page.keyboard.press('Enter')
    await sleep(1000)
  } catch (err) {
    logger.error(err)
    throw new Error(`filterTemplate Error: Typing ${nameToType} went wrong`)
  }

  try {
    const cardSelector = `${selectors.card} >div:nth-child(1)`
    const menuButtonSelector = `${cardSelector} ${selectors.cardMenuButton}`
    
    // First check if the card exists (template was found in search)
    try {
      await page.waitForSelector(cardSelector, { 
        timeout: ONE_SECOND * 2,
        visible: true
      })
    } catch (err) {
      logger.warn('No template card found after filtering')
      throw new Error(
        `filterTemplate Error: Template ${options.templateName} not found in search results`,
      )
    }
    
    // Hover over the card to reveal the menu button
    await page.hover(cardSelector)
    await sleep(500)
    
    // Try to find the menu button with increased timeout
    try {
      await page.waitForSelector(menuButtonSelector, {
        timeout: ONE_SECOND * 5,
        visible: true,
      })
    } catch (err) {
      // Retry with another hover if first attempt fails
      logger.warn('Menu button not found, retrying with hover...')
      await page.hover(cardSelector)
      await sleep(1000)
      await page.waitForSelector(menuButtonSelector, {
        timeout: ONE_SECOND * 3,
        visible: true,
      })
    }
    
    await takeScreenshot(page, `filter-2-found`, options)
  } catch (err) {
    logger.warn(err)
    if (err.message && err.message.includes('not found in search results')) {
      throw err
    }
    throw new Error(
      `filterTemplate Error: Template ${options.templateName} not found`,
    )
  }

  return page
}
