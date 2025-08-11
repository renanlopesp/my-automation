import { mkdir } from 'fs/promises'
import { logger, sleep, switchTransportTo } from '#utils'

export async function transferHeader(transfer, basePath) {
  const transferId =
    typeof transfer === 'string' ? transfer : transfer.id.toString()
  const transferDir = `./${basePath}/${transferId}`

  // moving logs
  switchTransportTo(`${transferDir}/transfer.log`)
  await sleep(100) // wait file to kicking in

  logger.info(`Creating transfer dir: ${transferDir}`)
  await mkdir(transferDir, { recursive: true })

  // creating screenshots dir
  const screenshotDir = `${transferDir}/screenshots`
  logger.info(`Creating screenshots dir: ${screenshotDir}`)
  await mkdir(screenshotDir, { recursive: true })

  return { transferDir, transferId, screenshotDir }
}
