// import { takeScreenshot } from "#ops";
import { sleep } from '#utils'
import { createSafePage } from '../utils/safePage.js'

export async function doTransfer(page, options, url) {
  const { selectors } = options

  const safePage = createSafePage(page)

  // click transfer button
  try {
    await safePage.goto(url, {}, 'Transfer Page')
    await page.locator(selectors.transferButton).waitFor()
    await page.click(selectors.transferButton)
  } catch (err) {
    throw new Error('Transfer button not found')
  }

  // type destination email
  const targetEmail = options.transfer.toUser.profile.webflow.email
  try {
    await page.locator(selectors.transferInput).waitFor()
    await page.click(selectors.transferInput)
    if (!targetEmail) {
      throw new Error('Missing target email')
    }

    await page.locator(selectors.transferInput).pressSequentially(targetEmail, { delay: 33 })
  } catch (err) {
    throw new Error('Transfer field not found')
  }

  // click to transfer
  try {
    const xpathTransfer = `xpath=//button[contains(span/span/text(),'Transfer to ${targetEmail}')]`
    await page.locator(xpathTransfer).waitFor({ timeout: 1000 * 3 })
    await page.click(xpathTransfer)
    await sleep(1000 * 3)
  } catch (err) {
    throw new Error('Executing transfer failed')
  }
}
