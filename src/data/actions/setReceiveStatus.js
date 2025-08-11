import { Surrealized, surql, jsonify } from '#data'
import { logger, idToRecord } from '#utils'

export async function setReceiveStatus(
  envName,
  transferId,
  status,
  manual = false,
) {
  const surreal = await Surrealized(envName)

  try {
    logger.info(
      `setReceiveStatus(transferId: ${transferId}, status: ${status}, manual: ${manual})`,
    )

    const response = await surreal.query(
      surql`
          BEGIN TRANSACTION;
            UPDATE type::thing($transferId) SET manual = $manual, status = $status, updated = time::now();
            SELECT * FROM type::thing($transferId);
          COMMIT TRANSACTION;
        `,
      {
        transferId: idToRecord('TransferReceive', transferId),
        status: String(status),
        manual,
      },
    )

    const transfer = response?.pop()?.shift() ?? null
    return jsonify(transfer)
  } catch (err) {
    logger.error(`${err.toString()}`)
    throw err
  }
}
