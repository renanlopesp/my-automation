import { Surrealized, surql } from '#data'
import { logger, idToRecord } from '#utils'

export async function setTransferStake(envName, transferType, id, stake) {
  try {
    const surreal = await Surrealized(envName)

    const [receive] = await surreal.query(
      surql`UPDATE type::thing($id) SET stake = $stake;`,
      {
        id: idToRecord(transferType, id),
        stake: stake.map(item => String(item)),
      },
    )

    return receive?.shift()
  } catch (err) {
    logger.error(`${err.toString()}`)
    return null
  }
}
