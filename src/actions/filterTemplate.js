import { takeScreenshot } from '#ops'
import { logger, ONE_SECOND, sleep } from '#utils'

export async function filterTemplate(page, options, name) {
  const { selectors } = options

  try {
    await page.locator(selectors.card).waitFor({ timeout: ONE_SECOND * 5 })
    await page.locator(selectors.dashboardSearchBar).waitFor({
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
    await page.locator(selectors.dashboardSearchBar).pressSequentially(nameToType, {
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
    await page.locator(menuButtonSelector).waitFor({
      timeout: 1000 * 2,
      state: 'visible',
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
