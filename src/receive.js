import { receiveTransfers } from '#actions'
import { selectors, transferHeader, xpath } from '#data'
import { uploadLogs } from '#dataActions'
import { preparePage } from '#ops'
import { logger, switchTransportTo } from '#utils'
import { WEBFLOW_USERNAME, WEBFLOW_PASSWORD } from '#config'
import systemState from './state.js'
import { tabManager } from './utils/tabManager.js'

const basePath = `data/receives`

export async function receive(browser) {
  logger.info('Starting Template Receiving operation')

  // Emit that we're checking the marketplace
  systemState.emit('marketplaceCheck', {
    status: 'checking',
    timestamp: new Date().toISOString()
  })

  const receiveDefaultTransferId = `__default-receive-logs__`
  const { transferDir, transferId, screenshotDir } = await transferHeader(
    receiveDefaultTransferId,
    basePath,
  )

  // prepare receives
  const options = {
    selectors,
    xpath,
    basePath,
    screenshotDir,
    transferDir,
    transferId,
    defaultTransferId: receiveDefaultTransferId,
    credentials: {
      username: WEBFLOW_USERNAME,
      password: WEBFLOW_PASSWORD,
    },
  }

  // Emit progress for starting receive process
  systemState.emitTransferProgress(
    transferId,
    'initializing_receive',
    10,
    { type: 'receive', basePath }
  )

  // Create a page for the receive operations
  const page = await preparePage(browser)
  
  try {
    const parcel = await receiveTransfers(page, browser, options)
  switchTransportTo('./general.log')

  // Emit completion or result
  if (parcel) {
    systemState.emitTransferProgress(
      transferId,
      'receive_complete',
      100,
      {
        type: 'receive',
        success: true,
        templatesReceived: parcel.templatesCount || 0
      }
    )

    // Add to history if we received templates
    if (parcel.templatesCount > 0) {
      systemState.addToHistory({
        id: transferId,
        type: 'receive',
        templatesCount: parcel.templatesCount,
        status: 'complete',
      })
    }
  } else {
    systemState.emitTransferProgress(
      transferId,
      'receive_no_templates',
      100,
      {
        type: 'receive',
        success: true,
        templatesReceived: 0
      }
    )
  }

  if (parcel && parcel?.options?.transferId) {
    try {
      await uploadLogs(
        `${basePath}/${options?.transferId}`,
        `${basePath.replace('data/', '')}/${options?.transferId}`,
      )
    } catch (error) {
      logger.warn(`Failed to upload logs to S3: ${error.message}`)
    }
  }
  } finally {
    // Release the tab back to the pool instead of closing
    if (page) {
      await tabManager.releaseTab(page)
      logger.info('Released tab back to pool after receive operation')
    }
  }

  // await closeChrome()
}
