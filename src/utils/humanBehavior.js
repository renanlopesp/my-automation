import { sleep } from './sleep.js'

/**
 * Generate a random delay between min and max milliseconds
 * @param {number} min - Minimum delay in milliseconds
 * @param {number} max - Maximum delay in milliseconds
 * @returns {number} Random delay
 */
export function randomDelay(min = 100, max = 300) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Simulate human-like typing with random delays between keystrokes
 * @param {import("puppeteer").Page} page - Puppeteer page
 * @param {string} selector - CSS selector for the input field
 * @param {string} text - Text to type
 * @param {Object} options - Options for typing behavior
 */
export async function humanType(page, selector, text, options = {}) {
  const {
    minDelay = 50,
    maxDelay = 150,
    clearFirst = false,
    pressEnter = false,
  } = options

  // Clear the field first if requested
  if (clearFirst) {
    await page.click(selector, { clickCount: 3 })
    await sleep(randomDelay(100, 200))
  }

  // Type each character with human-like delays
  for (let i = 0; i < text.length; i++) {
    await page.type(selector, text[i], {
      delay: randomDelay(minDelay, maxDelay),
    })

    // Occasional longer pauses (like thinking)
    if (Math.random() < 0.1) {
      await sleep(randomDelay(200, 500))
    }
  }

  if (pressEnter) {
    await sleep(randomDelay(200, 400))
    await page.keyboard.press('Enter')
  }
}

/**
 * Simulate human-like mouse movement before clicking
 * @param {import("puppeteer").Page} page - Puppeteer page
 * @param {string} selector - CSS selector for the element to click
 * @param {Object} options - Options for click behavior
 */
export async function humanClick(page, selector, options = {}) {
  const {
    delay = randomDelay(100, 300),
    moveFirst = true,
    doubleClick = false,
  } = options

  const element = await page.$(selector)
  if (!element) {
    throw new Error(`Element not found: ${selector}`)
  }

  // Get element position
  const box = await element.boundingBox()
  if (!box) {
    throw new Error(`Element not visible: ${selector}`)
  }

  // Move mouse to element first (more human-like)
  if (moveFirst) {
    // Add some randomness to the click position
    const x = box.x + box.width / 2 + (Math.random() - 0.5) * 10
    const y = box.y + box.height / 2 + (Math.random() - 0.5) * 10

    await page.mouse.move(x, y, { steps: Math.floor(Math.random() * 10) + 5 })
    await sleep(randomDelay(50, 150))
  }

  // Wait before clicking
  await sleep(delay)

  if (doubleClick) {
    await page.click(selector, { clickCount: 2 })
  } else {
    await page.click(selector)
  }

  // Small delay after click
  await sleep(randomDelay(50, 150))
}

/**
 * Simulate human-like scrolling behavior
 * @param {import("puppeteer").Page} page - Puppeteer page
 * @param {Object} options - Options for scrolling behavior
 */
export async function humanScroll(page, options = {}) {
  const { direction = 'down', distance = 300, steps = 3 } = options

  const stepDistance = distance / steps
  const deltaY = direction === 'down' ? stepDistance : -stepDistance

  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel({ deltaY })
    await sleep(randomDelay(100, 300))
  }
}

/**
 * Add random mouse movements to make behavior more human-like
 * @param {import("puppeteer").Page} page - Puppeteer page
 */
export async function addRandomMouseMovement(page) {
  const viewport = page.viewport()
  const x = Math.random() * viewport.width
  const y = Math.random() * viewport.height

  await page.mouse.move(x, y, {
    steps: Math.floor(Math.random() * 10) + 5,
  })

  await sleep(randomDelay(500, 1500))
}

/**
 * Simulate reading behavior by adding random delays
 * @param {number} textLength - Length of text being "read"
 * @param {Object} options - Options for reading simulation
 */
export async function simulateReading(textLength = 100, options = {}) {
  const { wordsPerMinute = 200, variability = 0.3 } = options

  // Calculate base reading time (assuming average 5 characters per word)
  const words = textLength / 5
  const baseTime = (words / wordsPerMinute) * 60 * 1000 // Convert to milliseconds

  // Add variability
  const variation = baseTime * variability * (Math.random() - 0.5)
  const readingTime = Math.max(1000, baseTime + variation) // Minimum 1 second

  await sleep(readingTime)
}

/**
 * Wait for page load with human-like behavior
 * @param {import("puppeteer").Page} page - Puppeteer page
 */
export async function waitForPageLoadHuman(page) {
  // Wait for initial load
  await page.waitForNavigation({ waitUntil: 'networkidle0' })

  // Add human-like delay
  await sleep(randomDelay(1000, 2000))

  // Optional small mouse movement
  if (Math.random() < 0.3) {
    await addRandomMouseMovement(page)
  }
}
