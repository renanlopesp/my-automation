import { transferTemplate } from '#actions'
import { WEBFLOW_PASSWORD, WEBFLOW_USERNAME } from '#config'
import {
  selectors,
  xpath,
  transferHeader,
  TransferPlatform,
  TransferSendStatus,
} from '#data'
import {
  getLatestTransfer,
  setTransferStake,
  setTransferStatus,
  uploadLogs,
  getQueueStats,
} from '#dataActions'
import { logger, switchTransportTo } from '#utils'
import systemState from './state.js'

export async function send(envName, browser) {
  if (!envName) {
    const envError = 'No environment set'
    logger.error(envError)
    throw new Error(envError)
  }

  const basePath = `data/${envName}/sends`

  logger.info('Starting Template Sending operation')

  // Emit queue check event
  systemState.emit('queueCheck', {
    env: envName,
    type: 'send',
    status: 'checking'
  })

  const transfer = await getLatestTransfer(envName)

  // Update queue stats
  const queueStats = await getQueueStats(envName)
  if (queueStats) {
    systemState.updateQueue(envName, queueStats)
  }

  if (!transfer?.id) {
    logger.info('No transfers to do')
    systemState.emit('queueEmpty', {
      env: envName,
      type: 'send'
    })
    return null
  }

  // Check if user was not found in database
  if (transfer?.userNotFound) {
    logger.error(`Cannot process transfer - user not found in database`)
    await setTransferStatus(
      envName,
      transfer.id,
      TransferSendStatus.CANCELED,
      false
    )
    systemState.emit('transferError', {
      env: envName,
      type: 'send',
      error: 'User not found in database',
      transferId: transfer.id
    })
    return null
  }

  // Check if product was not found in database
  if (transfer?.productNotFound) {
    logger.error(`Cannot process transfer - product not found in database`)
    await setTransferStatus(
      envName,
      transfer.id,
      TransferSendStatus.CANCELED,
      false
    )
    systemState.emit('transferError', {
      env: envName,
      type: 'send',
      error: 'Product not found in database',
      transferId: transfer.id
    })
    return null
  }

  // Emit transfer found event
  systemState.emit('transferFound', {
    env: envName,
    type: 'send',
    transfer: {
      id: transfer.id,
      templateName: transfer.product?.name || 'Unknown',
      toUser: transfer.toUser?.email || 'Unknown',
      fromUser: transfer.fromUser?.email || 'Unknown'
    }
  })

  const { transferDir, transferId, screenshotDir } = await transferHeader(
    transfer,
    basePath,
  )

  // Emit starting send for this transfer
  systemState.emitTransferProgress(
    transferId,
    'send_starting',
    10,
    {
      env: envName,
      type: 'send',
      templateName: transfer.product?.name || 'Unknown',
      toUser: transfer.toUser?.email,
      fromUser: transfer.fromUser?.email
    }
  )

  // Set as active transfer
  systemState.setActiveTransfer({
    id: transferId,
    type: 'send',
    env: envName,
    templateName: transfer.product?.name,
    toUser: transfer.toUser?.email,
    fromUser: transfer.fromUser?.email,
    status: 'processing',
    startedAt: new Date().toISOString()
  })

  try {
    const options = {
      id: transferId,
      transferDir,
      transfer,
      selectors,
      xpath,
      credentials: {
        username: WEBFLOW_USERNAME,
        password: WEBFLOW_PASSWORD,
      },
      screenshotDir,
    }

    await setTransferStatus(envName, transferId, TransferSendStatus.PROGRESS)
    logger.info(`Transfer: \n ${JSON.stringify(transfer, null, 2)}\n\n`)

    // Emit validation progress
    systemState.emitTransferProgress(
      transferId,
      'send_validating',
      20,
      {
        env: envName,
        type: 'send',
        action: 'Validating transfer details...'
      }
    )

    if (!transfer?.toUser?.profile?.webflow?.email) {
      await setTransferStatus(
        envName,
        transferId,
        TransferSendStatus.PENDING,
        true,
      )

      const error = 'Missing target webflow email, setting to PENDING'
      logger.error(error)
      throw new Error(error)
    }

    if (!transfer?.product?.platforms?.[TransferPlatform.WEBFLOW]) {
      await setTransferStatus(
        envName,
        transferId,
        TransferSendStatus.PENDING,
        true,
      )

      const error = 'Missing target platform, setting to PENDING'
      logger.error(error)
      throw new Error(error)
    }

    let transferStatus = TransferSendStatus.PENDING
    try {
      const templateTransferName = [
        transfer.product.slug,
        transfer.paymentLog.id.toString().split(':').pop(),
        crypto.randomUUID(),
      ].join('-')

      // Emit transfer processing
      systemState.emitTransferProgress(
        transferId,
        'send_processing',
        50,
        {
          env: envName,
          type: 'send',
          action: 'Transferring template to user...',
          templateName: templateTransferName
        }
      )

      await transferTemplate(browser, {
        ...options,
        templateName: `${envName}:::${transfer.product.owner.email}:::${transfer.product.id.toString()}`,
        templateTransferName,
      })

      transferStatus = TransferSendStatus.COMPLETE

      // Emit successful send
      systemState.emitTransferProgress(
        transferId,
        'send_complete',
        100,
        {
          env: envName,
          type: 'send',
          success: true,
          templateName: transfer.product?.name,
          toUser: transfer.toUser?.email
        }
      )

      // Add to history
      systemState.addToHistory({
        id: transferId,
        type: 'send',
        env: envName,
        templateName: transfer.product?.name,
        toUser: transfer.toUser?.email,
        fromUser: transfer.fromUser?.email,
        status: 'complete'
      })
    } catch (err) {
      transferStatus = TransferSendStatus.PENDING
      logger.error(err)

      // Emit send error
      systemState.emitTransferProgress(
        transferId,
        'send_error',
        100,
        {
          env: envName,
          type: 'send',
          success: false,
          error: err.message
        }
      )
    } finally {
      // await closeChrome()

      await setTransferStatus(envName, transferId, transferStatus)

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

      await setTransferStake(envName, 'TransferSend', transferId, stake)

      // Remove from active transfers
      systemState.removeActiveTransfer(transferId)
    }
  } catch (err) {
    await setTransferStatus(envName, transferId, TransferSendStatus.PENDING)

    // Emit validation error
    systemState.emitTransferProgress(
      transferId,
      'send_validation_error',
      100,
      {
        env: envName,
        type: 'send',
        success: false,
        error: err.message
      }
    )

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

    await setTransferStake(envName, 'TransferSend', transferId, stake)

    // Remove from active transfers even on error
    systemState.removeActiveTransfer(transferId)
  }
}
