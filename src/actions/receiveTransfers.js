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
  await checkAndLogin(browser, options)

  await safePage.goto(
    'https://webflow.com/dashboard/sites/transfers',
    {},
    'Receive Transfers Page',
  )

  try {
    await page.waitForSelector(`xpath/${xpath.receiveContainer}`, {
      timeout: SECONDS_30,
    })
  } catch (err) {
    logger.error(
      'Failed to find receiveContainer, taking screenshot for debugging...',
    )
    await takeScreenshot(page, 'debug-receive-container-missing', options)
    throw new Error(`receiveContainer not found: ${xpath.receiveContainer}`)
  }

  await closeWhatsNewDialog(page, options)

  try {
    await page.waitForSelector(`xpath/${xpath.receiveZero}`, {
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
    `xpath/${foundXpath}//p[@data-text="true"]`,
    'innerText',
  )
  logger.info(`Receiving receivingId:, ${receivingId}`)

  // open select menu
  const selectButton = `xpath/${foundXpath}//button[@role="combobox"]`
  await page.waitForSelector(selectButton, {
    timeout: SECONDS_30,
  })
  await page.click(selectButton)

  await takeScreenshot(page, `receive${indexString}-2-select-menu`, options)
  await sleep(200)

  // select templace
  const templaceOption = `xpath/${xpath.templaceOption}`
  await page.waitForSelector(templaceOption, { timeout: SECONDS_30 })
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
  const acceptButton = `xpath/${foundXpath}//button[span/span[contains(text(), "Accept")]]`
  await page.waitForSelector(acceptButton, { timeout: SECONDS_30 })
  await page.click(acceptButton)
  await takeScreenshot(page, `receive${indexString}-4-accept`, options)

  await talk('Receiving a new template')
  await sleep(SECOND * 3)
}

/** */
export async function receiveTransfers(browser, options) {
  const page = await preparePage(browser)
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

      await nagivateToReceive(page, browser, options, atIndex)

      receivedTemplates = await getAttributeFromSelector(
        page,
        `xpath/${xpath.receiveTitle}`,
        'innerText',
      )
      logger.info(`Transfers left: ${receivedTemplates.length}`)

      transferLeft = receivedTemplates.length > 0
      if (!transferLeft) {
        logger.info(`Transfer list empty, closing`)
        await page.close()
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
    await page.close()
    logger.error(`TransferReceive error: ${err.message}`)
    throw new Error(
      `Error on receiving: ${options.id}, on item: ${options.templateName}`,
    )
  } finally {
    if (!page.isClosed) {
      await page.close()
    }
  }
}
