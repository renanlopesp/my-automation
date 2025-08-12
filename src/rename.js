import { renameTransfer } from '#actions'
import { selectors, transferHeader, TransferReceiveStatus, xpath } from '#data'
import {
  getNextReceives,
  setReceiveStatus,
  setTransferStake,
  uploadLogs,
  getQueueStats,
} from '#dataActions'
import { preparePage } from '#ops'
import { logger, switchTransportTo } from '#utils'
import { WEBFLOW_USERNAME, WEBFLOW_PASSWORD } from '#config'
import systemState from './state.js'
import { tabManager } from './utils/tabManager.js'

export async function rename(envName, browser) {
  if (!envName) {
    const envError = 'No environment set'
    logger.error(envError)
    throw new Error(envError)
  }

  const basePath = `data/${envName}/renames`

  logger.info('Starting Template Renaming operation')

  // Emit queue check event
  systemState.emit('queueCheck', {
    env: envName,
    type: 'rename',
    status: 'checking'
  })

  const transfers = await getNextReceives(envName)

  // Update queue stats
  const queueStats = await getQueueStats(envName)
  if (queueStats) {
    systemState.updateQueue(envName, queueStats)
  }

  if (transfers?.length === 0) {
    logger.info('No transfers to do')
    systemState.emit('queueEmpty', {
      env: envName,
      type: 'rename'
    })
    return
  }

  // Emit queue found event
  systemState.emit('queueUpdate', {
    env: envName,
    type: 'rename',
    count: transfers.length,
    transfers: transfers.map(t => ({
      id: t.id,
      templateName: t.templateName || 'Unknown'
    }))
  })

  // Create a page for the rename operations
  const page = await preparePage(browser)
  
  try {
    for await (let transfer of transfers) {
    const { transferDir, transferId, screenshotDir } = await transferHeader(
      transfer,
      basePath,
    )

    // Emit starting rename for this transfer
    systemState.emitTransferProgress(
      transferId,
      'rename_starting',
      20,
      {
        env: envName,
        type: 'rename',
        templateName: transfer.templateName || 'Unknown',
        templateId: transfer.templateId
      }
    )

    // Set as active transfer
    systemState.setActiveTransfer({
      id: transferId,
      type: 'rename',
      env: envName,
      templateName: transfer.templateName,
      status: 'processing',
      startedAt: new Date().toISOString()
    })

    // prepare renames
    const options = {
      selectors,
      xpath,
      screenshotDir,
      transferDir,
      transferId,
      credentials: {
        username: WEBFLOW_USERNAME,
        password: WEBFLOW_PASSWORD,
      },
    }

    // transfer parcel
    transfer = {
      ...transfer,
      id: transferId.toString(),
      incomingId: transfer.incomingId.toString(),
    }

    try {
      // Emit progress for renaming
      systemState.emitTransferProgress(
        transferId,
        'rename_processing',
        50,
        {
          env: envName,
          type: 'rename',
          action: 'Renaming template...'
        }
      )

      const parcel = await renameTransfer(envName, page, browser, options, transfer)
      await setReceiveStatus(
        envName,
        transferId,
        parcel ? TransferReceiveStatus.COMPLETE : TransferReceiveStatus.PENDING,
      )

      if (parcel) {
        // Emit successful rename
        systemState.emitTransferProgress(
          transferId,
          'rename_complete',
          100,
          {
            env: envName,
            type: 'rename',
            success: true,
            newName: parcel.newName || transfer.templateName
          }
        )

        // Add to history
        systemState.addToHistory({
          id: transferId,
          type: 'rename',
          env: envName,
          templateName: transfer.templateName,
          newName: parcel.newName || transfer.templateName,
          status: 'complete'
        })

        // switching transport back
        switchTransportTo('./general.log')

        let stake = []
        try {
          stake = await uploadLogs(
            `${basePath}/${transferId}`,
            `${basePath.replace('data/', '')}/${transferId}`,
          )
        } catch (error) {
          logger.warn(`Failed to upload logs to S3: ${error.message}`)
        }

        await setTransferStake(envName, 'TransferReceive', transferId, stake)
      } else {
        // Emit rename pending/failed
        systemState.emitTransferProgress(
          transferId,
          'rename_pending',
          100,
          {
            env: envName,
            type: 'rename',
            success: false,
            reason: 'Rename postponed for later'
          }
        )
      }

      // Remove from active transfers
      systemState.removeActiveTransfer(transferId)
    } catch (err) {
      logger.error(err)
      await setReceiveStatus(
        envName,
        transferId,
        TransferReceiveStatus.CANCELED,
        true,
      )
    }
    }
  } finally {
    // Release the tab back to the pool instead of closing
    if (page) {
      await tabManager.releaseTab(page)
      logger.info('Released tab back to pool after rename operation')
    }
  }

  // await closeChrome()
}
