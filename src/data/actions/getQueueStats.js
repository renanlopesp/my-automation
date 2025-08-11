import { Surrealized, surql, TransferReceiveStatus, TransferSendStatus } from '#data'
import { logger } from '#utils'

/**
 * Get queue statistics for a specific environment
 * Returns counts of transfers in different states
 */
export async function getQueueStats(envName) {
  try {
    const surreal = await Surrealized(envName)

    // Query for TransferReceive statistics - individual queries
    const [receiveInitial] = await surreal.query(
      surql`SELECT count() as count FROM TransferReceive WHERE status = $initial AND manual = false GROUP ALL`,
      { initial: String(TransferReceiveStatus.INITIAL) }
    )

    const [receivePending] = await surreal.query(
      surql`SELECT count() as count FROM TransferReceive WHERE status = $pending AND manual = false GROUP ALL`,
      { pending: String(TransferReceiveStatus.PENDING) }
    )

    const [receiveProcessing] = await surreal.query(
      surql`SELECT count() as count FROM TransferReceive WHERE status = $processing AND manual = false GROUP ALL`,
      { processing: String(TransferReceiveStatus.PROCESSING) }
    )

    const [receiveComplete] = await surreal.query(
      surql`SELECT count() as count FROM TransferReceive WHERE status = $complete AND manual = false GROUP ALL`,
      { complete: String(TransferReceiveStatus.COMPLETE) }
    )

    const [receiveError] = await surreal.query(
      surql`SELECT count() as count FROM TransferReceive WHERE status = $error AND manual = false GROUP ALL`,
      { error: String(TransferReceiveStatus.ERROR) }
    )

    const receiveStats = [{
      receiveInitial: receiveInitial[0]?.count || 0,
      receivePending: receivePending[0]?.count || 0,
      receiveProcessing: receiveProcessing[0]?.count || 0,
      receiveComplete: receiveComplete[0]?.count || 0,
      receiveError: receiveError[0]?.count || 0,
    }]

    // Query for TransferSend statistics - individual queries
    const [sendInitial] = await surreal.query(
      surql`SELECT count() as count FROM TransferSend WHERE status = $initial AND manual = false GROUP ALL`,
      { initial: String(TransferSendStatus.INITIAL) }
    )

    const [sendPending] = await surreal.query(
      surql`SELECT count() as count FROM TransferSend WHERE status = $pending AND manual = false GROUP ALL`,
      { pending: String(TransferSendStatus.PENDING) }
    )

    const [sendProcessing] = await surreal.query(
      surql`SELECT count() as count FROM TransferSend WHERE status = $processing AND manual = false GROUP ALL`,
      { processing: String(TransferSendStatus.PROCESSING) }
    )

    const [sendComplete] = await surreal.query(
      surql`SELECT count() as count FROM TransferSend WHERE status = $complete AND manual = false GROUP ALL`,
      { complete: String(TransferSendStatus.COMPLETE) }
    )

    const [sendError] = await surreal.query(
      surql`SELECT count() as count FROM TransferSend WHERE status = $error AND manual = false GROUP ALL`,
      { error: String(TransferSendStatus.ERROR) }
    )

    const sendStats = [{
      sendInitial: sendInitial[0]?.count || 0,
      sendPending: sendPending[0]?.count || 0,
      sendProcessing: sendProcessing[0]?.count || 0,
      sendComplete: sendComplete[0]?.count || 0,
      sendError: sendError[0]?.count || 0,
    }]

    // Combine and format the results
    const stats = {
      env: envName,
      timestamp: new Date().toISOString(),
      receive: {
        total: (receiveStats[0]?.receiveInitial || 0) +
               (receiveStats[0]?.receivePending || 0) +
               (receiveStats[0]?.receiveProcessing || 0),
        initial: receiveStats[0]?.receiveInitial || 0,
        pending: receiveStats[0]?.receivePending || 0,
        processing: receiveStats[0]?.receiveProcessing || 0,
        complete: receiveStats[0]?.receiveComplete || 0,
        error: receiveStats[0]?.receiveError || 0,
      },
      rename: {
        // Rename uses the same TransferReceive table
        toRename: (receiveStats[0]?.receivePending || 0) +
                  (receiveStats[0]?.receiveInitial || 0),
      },
      send: {
        total: (sendStats[0]?.sendInitial || 0) +
               (sendStats[0]?.sendPending || 0) +
               (sendStats[0]?.sendProcessing || 0),
        initial: sendStats[0]?.sendInitial || 0,
        pending: sendStats[0]?.sendPending || 0,
        processing: sendStats[0]?.sendProcessing || 0,
        complete: sendStats[0]?.sendComplete || 0,
        error: sendStats[0]?.sendError || 0,
      }
    }

    return stats
  } catch (err) {
    logger.error(`Error getting queue stats for ${envName}: ${err.toString()}`)
    return null
  }
}

/**
 * Get active transfers currently being processed
 */
export async function getActiveTransfers(envName) {
  try {
    const surreal = await Surrealized(envName)

    // Get processing transfers from both tables
    const [receiveTransfers] = await surreal.query(
      surql`
        SELECT *, 'receive' as type, $env as env 
        FROM TransferReceive 
        WHERE status = $processing AND manual = false
        LIMIT 10
      `,
      {
        processing: String(TransferReceiveStatus.PROCESSING),
        env: String(envName),
      }
    )

    const [sendTransfers] = await surreal.query(
      surql`
        SELECT *, 'send' as type, $env as env
        FROM TransferSend 
        WHERE status = $processing AND manual = false
        LIMIT 10
        FETCH toUser, fromUser, product
      `,
      {
        processing: String(TransferSendStatus.PROCESSING),
        env: String(envName),
      }
    )

    return [...(receiveTransfers || []), ...(sendTransfers || [])]
  } catch (err) {
    logger.error(`Error getting active transfers for ${envName}: ${err.toString()}`)
    return []
  }
}

/**
 * Get recent transfer history
 */
export async function getTransferHistory(envName, limit = 20) {
  try {
    const surreal = await Surrealized(envName)

    const [history] = await surreal.query(
      surql`
        SELECT *, 'send' as type, $env as env
        FROM TransferSend 
        WHERE status = $complete AND manual = false
        ORDER BY updated_at DESC
        LIMIT $limit
        FETCH toUser, fromUser, product
      `,
      {
        complete: String(TransferSendStatus.COMPLETE),
        env: String(envName),
        limit: limit,
      }
    )

    return history || []
  } catch (err) {
    logger.error(`Error getting transfer history for ${envName}: ${err.toString()}`)
    return []
  }
}

/**
 * Get all queue stats for all environments
 */
export async function getAllQueuesStats(environments = ['local', 'dev', 'prod']) {
  const results = {}

  for (const env of environments) {
    try {
      results[env] = await getQueueStats(env)
    } catch (err) {
      logger.error(`Failed to get queue stats for ${env}: ${err.toString()}`)
      results[env] = null
    }
  }

  return results
}