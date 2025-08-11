// Use puppeteer-extra with stealth plugin for anti-detection
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'

import { logger, sleep } from '#utils'

// Enable stealth plugin with all available evasions
puppeteer.use(StealthPlugin())

/** @typedef {import("puppeteer").Browser} Browser */

/**
 * Prepares a new browser with a specified set of options and plugins.
 * @returns {Promise<Browser>} A Promise that resolves to the new page object.
 */
export async function prepareBrowser({ port = 9922 } = {}) {
  logger.info('Preparing Chrome connection with stealth mode')

  let browserWSEndpoint

  for (let i = 0; i < 3; i++) {
    try {
      const response = await fetch(`http://localhost:${port}/json/version`)
      const json = await response.json()
      browserWSEndpoint = json.webSocketDebuggerUrl
      break
    } catch (error) {
      logger.info(`Attempt ${i + 1} failed to access Chrome at port ${port}`)
      if (i === 2) {
        throw error
      }
      await sleep(2000)
    }
  }

  logger.info(`Connecting to Chrome at: ${browserWSEndpoint}`)

  const browser = await puppeteer.connect({
    browserWSEndpoint,
  })

  logger.info(`Chrome connected with stealth mode enabled`)

  return browser
}
