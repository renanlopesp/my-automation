import { SECOND } from '#data'
import { waitForSelector } from '#ops'
import { logger } from '#utils'

export async function closeWhatsNewDialog(page, options) {
  const { xpath } = options

  logger.info(`closeWhatsNewDialog: Looking for What's new dialog`)

  await waitForSelector(
    page,
    `xpath/${xpath.whatsNew}`,
    SECOND,
    3,
    async () => {
      logger.info(`closeWhatsNewDialog: What's new found`)
      await page.click(`xpath/${xpath.whatsNewClose}`)
    },
  )
}
