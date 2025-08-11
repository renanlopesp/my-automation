import { TransferReceiveStatus, Surrealized, surql } from '#data'
import { logger } from '#utils'

/**
 * */
export async function getNextReceives(envName) {
  try {
    const surreal = await Surrealized(envName)

    const [receive] = await surreal.query(
      surql`SELECT *, $env FROM TransferReceive WHERE status = $pending OR status = $initial AND manual = false;`,
      {
        initial: String(TransferReceiveStatus.INITIAL),
        pending: String(TransferReceiveStatus.PENDING),
        env: String(envName),
      },
    )

    return receive
  } catch (err) {
    logger.error(`${err.toString()}`)
    return null
  }
}
