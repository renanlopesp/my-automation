// Use patchright for undetected browser automation
import { chromium } from 'patchright'

import { logger } from '#utils'

/** @typedef {import("patchright").Browser} Browser */

/**
 * Prepares a new browser with a specified set of options and plugins.
 * @returns {Promise<Browser>} A Promise that resolves to the new page object.
 */
export async function prepareBrowser({ port = 9922 } = {}) {
  logger.info('Preparing Chrome connection with Patchright (undetected mode)')

  const endpointURL = `http://localhost:${port}`

  // Connect to existing Chrome instance
  try {
    const response = await fetch(`${endpointURL}/json/version`)
    const json = await response.json()
    logger.info(`Chrome found: ${json.Browser}`)
    
    logger.info(`Connecting to Chrome at: ${endpointURL}`)
    const browser = await chromium.connectOverCDP({
      endpointURL,
    })
    
    logger.info(`Connected to Chrome with Patchright undetected mode`)
    return browser
    
  } catch (error) {
    logger.error(`Failed to connect to Chrome at ${endpointURL}:`, error.message)
    logger.error('Make sure Chrome is running with --remote-debugging-port=9922')
    logger.error('You can start Chrome with: npm run start:chrome')
    throw new Error(`Chrome connection failed: ${error.message}`)
  }
}
