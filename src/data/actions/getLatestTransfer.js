import { Surrealized, TransferSendStatus, surql } from '#data'
import { logger } from '#utils'

/**
 * */
export async function getLatestTransfer(envName) {
  try {
    const surreal = await Surrealized(envName)

    const [transfers] = await surreal.query(
      surql`
        SELECT *, $env FROM TransferSend
          WHERE status NOT IN $statuses AND manual = false LIMIT 1
            FETCH
            paymentLog,
            product,
            product.owner
        ;`,
      {
        statuses: [
          String(TransferSendStatus.COMPLETE),
          String(TransferSendStatus.CANCELED)
        ],
        env: String(envName),
      },
    )

    const transfer = transfers.pop()
    if (!transfer) return null

    // Check if product exists
    if (transfer.product) {
      if (typeof transfer.product === 'string') {
        // Product is just an ID, need to fetch it
        const [productData] = await surreal.query(
          `SELECT * FROM ${transfer.product} FETCH owner;`
        )
        if (productData && productData[0]) {
          transfer.product = productData[0]
        } else {
          logger.error(`Product not found in database: ${transfer.product}`)
          transfer.productNotFound = true
        }
      }
      // If product is already an object, it was fetched successfully
    } else {
      logger.error(`Transfer has no product associated`)
      transfer.productNotFound = true
    }

    // Fetch toUser and fromUser separately with their profiles
    if (transfer.toUser) {
      const [toUserData] = await surreal.query(
        `SELECT * FROM ${transfer.toUser} FETCH profile;`
      )
      if (toUserData && toUserData[0]) {
        transfer.toUser = toUserData[0]
      } else {
        logger.error(`User not found in database: ${transfer.toUser}`)
        // Mark transfer as error since the user doesn't exist
        transfer.userNotFound = true
      }
    }

    if (transfer.fromUser) {
      const [fromUserData] = await surreal.query(
        `SELECT * FROM ${transfer.fromUser} FETCH profile;`
      )
      if (fromUserData && fromUserData[0]) {
        transfer.fromUser = fromUserData[0]
      }
    }

    return transfer
  } catch (err) {
    logger.error(`${err.toString()}`)
    return null
  }
}
