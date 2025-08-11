import { Surrealized, surql, jsonify } from '#data'
import { logger, idToRecord } from '#utils'

export async function setTransferStatus(
  envName,
  transferId,
  status,
  manual = false,
) {
  const surreal = await Surrealized(envName)

  try {
    logger.info(
      `setTransferStatus(transferId: ${transferId}, status: ${status}, manual: ${manual})`,
    )

    const response = await surreal.query(
      surql`
        BEGIN TRANSACTION;
          UPDATE type::thing($transferId) SET manual = $manual, status = $status;
          SELECT * FROM type::thing($transferId)
            FETCH
              fromUser,
              toUser,
              product
          ;
        COMMIT TRANSACTION;
      `,
      {
        transferId: idToRecord('TransferSend', transferId),
        status: String(status),
        manual: Boolean(manual),
      },
    )

    const transfer = response?.pop()?.shift() ?? null
    return jsonify(transfer)
  } catch (err) {
    logger.error(`${err.toString()}`)
    throw err
  }
}
