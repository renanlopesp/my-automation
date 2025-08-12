// https://webflow.com/dashboard/sites/transfers

import { SECOND } from '#data'
import { logger, sleep } from '#utils'
import { renameTemplate } from '#actions'

export async function renameTransfer(envName, page, browser, options, transfer) {
  // Use the existing page instead of creating a new one

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

    // Keep the page open to maintain session
    return renamed
  } catch (err) {
    logger.error(`Transfer Error: ${err.message}`)
    const message = `Error on transfer: ${options.id}, on item: ${options.templateName}`

    // Keep the page open to maintain session
    return false
    throw new Error(message)
  }
}
