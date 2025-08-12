import { getAttributeFromSelector, takeScreenshot } from '#ops'
import { sleep, logger } from '#utils'
import { closeWhatsNewDialog, filterTemplate } from '#actions'
import { SECOND, SECONDS_30 } from '#data'
import { createSafePage } from '../utils/safePage.js'

export async function renameTemplate(page, options) {
  const { selectors } = options
  const copyName = options.notCopy
    ? options.templateName
    : `Copy of ${options.templateName}`

  const safePage = createSafePage(page)

  try {
    await sleep(SECOND * 2)
    await safePage.goto('https://webflow.com/dashboard', {}, 'Rename Dashboard')
    await page.locator(selectors.container).waitFor({
      timeout: SECONDS_30,
    })
    await takeScreenshot(page, `rename-0-dash`, options)

    await closeWhatsNewDialog(page, options)

    const filterEmpty = await filterTemplate(page, options, copyName)
    if (!filterEmpty) {
      return false
    }

    await takeScreenshot(page, `rename-1-filtered`, options)
  } catch (err) {
    const message = `Can not get back to dashboard and filter, template: ${options.id}, on item: ${options.templateName}`
    logger.error(message)
    logger.error(err.message)
    throw new Error(message)
  }

  try {
    await sleep(500)
    const menuButtonSelector = `${selectors.card} >div:nth-child(1) ${selectors.cardMenuButton}`
    await page.locator(menuButtonSelector).waitFor({ timeout: 1000 * 2 })
    await page.click(menuButtonSelector)
    await takeScreenshot(page, `rename-2-menu`, options)
  } catch (err) {
    const message = `Can not access rename menu, template: ${options.id}, on item: ${options.templateName}`
    logger.error(message)
    logger.error(err.message)
    throw new Error(message)
  }

  try {
    await sleep(500)
    const settingsSelector = `${selectors.cardMenuButtonSettings}`
    await page.locator(settingsSelector).waitFor()
    await page.click(settingsSelector)
    await takeScreenshot(page, `rename-3-settings`, options)
  } catch (err) {
    const message = `Can not access settings option, template: ${options.id}, on item: ${options.templateName}`
    logger.error(message)
    logger.error(err.message)
    throw new Error(message)
  }

  try {
    const fieldSelector = `input[value*="${copyName}"]`
    await page.locator(fieldSelector).waitFor()
    await page.click(fieldSelector)
    await takeScreenshot(page, `rename-4-field`, options)

    const input = await page.locator(fieldSelector).first()
    const [currentValue] = await getAttributeFromSelector(
      page,
      fieldSelector,
      'value',
    )
    await page.keyboard.press('End', { delay: 11 })
    for await (const _ of Array(currentValue.length)) {
      await page.keyboard.press('Backspace', { delay: 11 })
    }
    await takeScreenshot(page, `rename-5-clear`, options)
    await input.pressSequentially(options.templateTransferName, { delay: 13 })
    await takeScreenshot(page, `rename-6-typed`, options)
  } catch (err) {
    const message = `Can not populate the field, template: ${options.id}, on item: ${options.templateName}`
    logger.error(message)
    logger.error(err.message)
    throw new Error(message)
  }

  try {
    const templateInternalUrl = await page.url()
    const xpathSave = `xpath///button[contains(span/span/text(),'Save')]`
    await page.locator(xpathSave).waitFor({ timeout: 1000 * 3 })
    await page.click(xpathSave)
    await takeScreenshot(page, `rename-7-save`, options)

    return { templateInternalUrl }
  } catch (err) {
    const message = `Error on renaming template: ${options.id}, on item: ${options.templateName}`
    logger.error(message)
    logger.error(err.message)
    throw new Error(message)
  }
}
