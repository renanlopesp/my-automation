// https://webflow.com/dashboard/sites/transfers

import { closeWhatsNewDialog, checkAndLogin } from '#actions'
import { SECOND, SECONDS_30, transferHeader } from '#data'
import { getAttributeFromSelector, preparePage, takeScreenshot } from '#ops'
import { logger, ni, sleep, talk } from '#utils'
import { createSafePage } from '../utils/safePage.js'

async function nagivateToReceive(page, browser, options, atIndex = undefined) {
  logger.info(`Navigating to receive page`)

  const safePage = createSafePage(page)

  const { xpath } = options
  await checkAndLogin(page, browser, options)

  await safePage.goto(
    'https://webflow.com/dashboard/sites/transfers',
    {},
    'Receive Transfers Page',
  )

  try {
    await page.locator(`xpath=${xpath.receiveContainer}`).waitFor({
      timeout: SECONDS_30,
    })
  } catch (err) {
    // No pending transfers - this is a normal situation
    logger.info('No pending transfers found (receiveContainer not present)')
    
    // Return false to indicate no templates available
    return false
  }

  await closeWhatsNewDialog(page, options)

  try {
    await page.locator(`xpath=${xpath.receiveZero}`).waitFor({
      timeout: SECOND * 10, // Increase timeout slightly
    })
  } catch (err) {
    logger.error(
      'Failed to find receiveZero, taking screenshot for debugging...',
    )
    await takeScreenshot(page, 'debug-receive-zero-missing', options)
    // Don't throw error here, just log it as this might be expected if no transfers
    logger.warn(`receiveZero not found: ${xpath.receiveZero}`)
  }

  if (atIndex !== undefined) {
    logger.info(`Received zero found: ${atIndex}`)
  } else {
    logger.info(`Cannot reach transfers page`)
  }
  
  // Return true to indicate templates are available
  return true
}

async function transferIn(page, options, atIndex) {
  const { xpath } = options
  const indexString = atIndex !== undefined ? `-${atIndex}` : ''

  // [data-automation-id^="site-transfer"]
  const foundXpath = `(${
    xpath.receiveContainer
  }/div[starts-with(@data-automation-id, "site-transfer")])[1]`

  // double-checking id
  const [receivingId] = await getAttributeFromSelector(
    page,
    `xpath=${foundXpath}//p[@data-text="true"]`,
    'innerText',
  )
  logger.info(`Receiving receivingId:, ${receivingId}`)

  // open select menu
  const selectButton = `xpath=${foundXpath}//button[@role="combobox"]`
  await page.locator(selectButton).waitFor({
    timeout: SECONDS_30,
  })
  await page.click(selectButton)

  await takeScreenshot(page, `receive${indexString}-2-select-menu`, options)
  await sleep(200)

  // select templace
  const templaceOption = `xpath=${xpath.templaceOption}`
  await page.locator(templaceOption).waitFor({ timeout: SECONDS_30 })
  await page.click(templaceOption)
  await sleep(200)
  const [optionOpen] = await getAttributeFromSelector(
    page,
    templaceOption,
    'innerText',
  )
  if (optionOpen) {
    await page.click(templaceOption)
  }

  await takeScreenshot(page, `receive${indexString}-3-select-templace`, options)

  // accepting transfer
  const acceptButton = `xpath=${foundXpath}//button[span/span[contains(text(), "Accept")]]`
  await page.locator(acceptButton).waitFor({ timeout: SECONDS_30 })
  await page.click(acceptButton)
  await takeScreenshot(page, `receive${indexString}-4-accept`, options)

  await talk('Receiving a new template')
  await sleep(SECOND * 3)
}

/** */
export async function receiveTransfers(page, browser, options) {
  // Use the existing page instead of creating a new one
  const { xpath } = options
  let transferLeft = true
  let receivedTemplates = []
  let atIndex = 0

  try {
    while (transferLeft) {
      const {
        transferDir: defaultTransferDir,
        transferId: defaultTransferId,
        screenshotDir: defaultScreenshotDir,
      } = await transferHeader(options.defaultTransferId, options.basePath)

      options = {
        ...options,
        transferDir: defaultTransferDir,
        transferId: defaultTransferId,
        screenshotDir: defaultScreenshotDir,
      }

      const hasTemplates = await nagivateToReceive(page, browser, options, atIndex)
      if (!hasTemplates) {
        // No templates available, return empty
        return { receivedTemplates: [], options }
      }

      receivedTemplates = await getAttributeFromSelector(
        page,
        `xpath=${xpath.receiveTitle}`,
        'innerText',
      )
      logger.info(`Transfers left: ${receivedTemplates.length}`)

      transferLeft = receivedTemplates.length > 0
      if (!transferLeft) {
        logger.info(`Transfer list empty`)
        // Keep the page open to maintain session
        return { receivedTemplates, options }
      }

      const transfer = `trec_t${ni(10)}`
      const { transferDir, transferId, screenshotDir } = await transferHeader(
        transfer,
        options.basePath,
      )

      options = {
        ...options,
        transferDir,
        transferId,
        screenshotDir,
      }

      await transferIn(page, options, atIndex)
      atIndex = atIndex + 1
    }

    return { receivedTemplates, options }
  } catch (err) {
    // Keep the page open to maintain session
    logger.error(`TransferReceive error: ${err.message}`)
    throw new Error(
      `Error on receiving: ${options?.transferId || 'unknown'}, error: ${err.message}`,
    )
  }
}
