// https://webflow.com/dashboard/sites/transfers

import { SECOND } from '#data'
import { preparePage } from '#ops'
import { logger, sleep } from '#utils'
import { renameTemplate } from '#actions'

export async function renameTransfer(envName, browser, options, transfer) {
  const page = await preparePage(browser)

  try {
    if (!transfer.renameTo) {
      logger.error(`No "renameTo" value on transfer: ${transfer.id}`)
      throw new Error(`No "renameTo" value on transfer: ${transfer.id}`)
    }

    const renamed = await renameTemplate(page, {
      ...options,
      id: transfer.id,
      notCopy: true,
      templateName: transfer.incomingId,
      templateTransferName: `${envName}:::${transfer.renameTo.replace(/Product:Product/g, 'Product')}`,
    })

    await sleep(SECOND * 3)

    await page.close()
    return renamed
  } catch (err) {
    logger.error(`Transfer Error: ${err.message}`)
    const message = `Error on transfer: ${options.id}, on item: ${options.templateName}`

    await page.close()
    return false
    throw new Error(message)
  } finally {
    if (!page.isClosed) {
      await page.close()
    }
  }
}
