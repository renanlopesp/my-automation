import { logger } from '#utils'

export async function waitForSelector(
  page,
  selector,
  timeout = 2000,
  tries = 3,
  runIfFound = () => {},
) {
  for await (const i of Array.from(Array(tries)).map((_, index) => index)) {
    logger.info(`looking ${i}, for: ${selector}`)
    try {
      await page.locator(selector).waitFor({ timeout })
      logger.info(`found: ${selector}`)
      await runIfFound()
      break
    } catch (err) {
      logger.info(`${selector} not found`)
      continue
    }
  }

  return page.locator(selector).all()
}
