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
    const menuButtonSelector = `${selectors.card} >div:nth-child(1) ${selectors.cardMenuButton}`
    await page.waitForSelector(menuButtonSelector, {
      timeout: 1000 * 2,
      visible: true,
    })
    await takeScreenshot(page, `filter-2-found`, options)
  } catch (err) {
    logger.warn(err)
    throw new Error(
      `filterTemplate Error: Template ${options.templateName} not found`,
    )
  }

  return page
}
