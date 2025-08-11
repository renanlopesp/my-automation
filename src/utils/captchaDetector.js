import { sendCaptchaAlert } from './sendCaptchaAlert.js'

/**
 * CAPTCHA Detection Utility
 * Detects various types of CAPTCHAs on Webflow pages
 */
export class CaptchaDetector {
  constructor(options = {}) {
    this.adminEmail =
      options.adminEmail || process.env.ADMIN_EMAIL || 'admin@tem.place'
    this.serverUrl = options.serverUrl || process.env.EC2_SERVER_URL || ''
    this.waitTimeout = options.waitTimeout || 300000 // 5 minutes default wait for manual resolution
  }

  /**
   * Common CAPTCHA selectors to check for
   */
  getCaptchaSelectors() {
    return [
      // Cloudflare Challenge (from the screenshot)
      'div[id="px-captcha-wrapper"]',
      'div[class*="px-captcha-container"]',
      'div[class*="px-captcha-header"]',
      'div[id="px-captcha"]',
      'div[class*="px-captcha-message"]',

      // General Cloudflare patterns
      '.cf-challenge-form',
      '.cf-browser-verification',
      '#challenge-form',
      'div[class*="cf-"]',

      // reCAPTCHA v2
      '.g-recaptcha',
      '#recaptcha-element',
      '[data-sitekey]',
      'iframe[src*="recaptcha"]',

      // reCAPTCHA v3
      '.grecaptcha-badge',

      // hCaptcha
      '.h-captcha',
      'iframe[src*="hcaptcha"]',

      // Generic CAPTCHA patterns
      '[class*="captcha"]',
      '[id*="captcha"]',
      '[class*="challenge"]',
      '[id*="challenge"]',

      // Webflow specific
      '.w-form-fail[style*="captcha"]',
    ]
  }

  /**
   * Text patterns that indicate CAPTCHA presence
   */
  getCaptchaTextPatterns() {
    return [
      'before we continue',
      'press & hold to confirm',
      'verify you are human',
      'prove you are not a robot',
      'complete the captcha',
      'security check',
      'verify your identity',
      'human verification',
      'are you a robot',
      'checking your browser',
    ]
  }

  /**
   * Check if CAPTCHA is present on the current page
   * @param {Page} page - Puppeteer page object
   * @returns {Promise<Object>} Detection result
   */
  async detectCaptcha(page, templateName = 'Unknown Template') {
    try {
      console.log('🔍 Checking for CAPTCHA on current page...')

      const selectors = this.getCaptchaSelectors()
      let captchaFound = false
      let captchaType = 'unknown'
      let captchaElement = null

      // Check each selector
      for (const selector of selectors) {
        try {
          const element = await page.$(selector)
          if (element) {
            // Additional check to ensure element is visible
            const isVisible = await page.evaluate(el => {
              const rect = el.getBoundingClientRect()
              return (
                rect.width > 0 &&
                rect.height > 0 &&
                window.getComputedStyle(el).visibility !== 'hidden' &&
                window.getComputedStyle(el).display !== 'none'
              )
            }, element)

            if (isVisible) {
              captchaFound = true
              captchaElement = element
              captchaType = this.determineCaptchaType(selector)
              console.log(
                `🚨 CAPTCHA detected: ${captchaType} (selector: ${selector})`,
              )
              break
            }
          }
        } catch (err) {
          // Continue checking other selectors
          continue
        }
      }

      // Enhanced text-based detection
      if (!captchaFound) {
        const captchaTexts = this.getCaptchaTextPatterns()

        for (const text of captchaTexts) {
          try {
            // Check for text content in the page
            const hasText = await page.evaluate(searchText => {
              const bodyText = document.body.innerText.toLowerCase()
              return bodyText.includes(searchText.toLowerCase())
            }, text)

            if (hasText) {
              captchaFound = true
              captchaType = 'text-based'
              console.log(`🚨 CAPTCHA detected via text: "${text}"`)
              break
            }
          } catch (err) {
            continue
          }
        }
      }

      // Special check for Cloudflare "Before we continue" page
      if (!captchaFound) {
        try {
          const isCloudflareChallenge = await page.evaluate(() => {
            const title = document.title
            const bodyText = document.body.innerText.toLowerCase()
            return (
              title.includes('Just a moment') ||
              bodyText.includes('before we continue') ||
              bodyText.includes('checking your browser') ||
              bodyText.includes('press & hold')
            )
          })

          if (isCloudflareChallenge) {
            captchaFound = true
            captchaType = 'Cloudflare Challenge'
            console.log(
              '🚨 CAPTCHA detected: Cloudflare "Before we continue" page',
            )
          }
        } catch (err) {
          // Continue with other detection methods
        }
      }

      if (captchaFound) {
        return await this.handleCaptchaDetection(
          page,
          templateName,
          captchaType,
        )
      }

      return { detected: false }
    } catch (error) {
      console.error('❌ Error during CAPTCHA detection:', error)
      return { detected: false, error: error.message }
    }
  }

  /**
   * Determine CAPTCHA type based on selector
   * @param {string} selector - CSS selector that matched
   * @returns {string} CAPTCHA type
   */
  determineCaptchaType(selector) {
    if (selector.includes('px-captcha') || selector.includes('px-'))
      return 'Cloudflare (PX)'
    if (selector.includes('recaptcha')) return 'reCAPTCHA'
    if (selector.includes('hcaptcha')) return 'hCAPTCHA'
    if (selector.includes('cf-') || selector.includes('cloudflare'))
      return 'Cloudflare'
    if (selector.includes('challenge')) return 'Challenge'
    return 'Generic CAPTCHA'
  }

  /**
   * Handle CAPTCHA detection - send alert and wait for resolution
   * @param {Page} page - Puppeteer page object
   * @param {string} templateName - Current template name
   * @param {string} captchaType - Type of CAPTCHA detected
   * @returns {Promise<Object>} Resolution result
   */
  async handleCaptchaDetection(page, templateName, captchaType) {
    try {
      const currentUrl = page.url()
      console.log(`🚨 CAPTCHA DETECTED: ${captchaType} on ${currentUrl}`)

      // Take screenshot for reference
      const screenshotPath = await this.takeScreenshot(page, templateName)

      // Send email alert
      console.log('📧 Sending CAPTCHA alert email...')
      const emailResult = await sendCaptchaAlert({
        adminEmail: this.adminEmail,
        templateName: templateName,
        webflowUrl: currentUrl,
        screenshotPath: screenshotPath,
        serverUrl: this.serverUrl,
      })

      if (emailResult.success) {
        console.log('✅ CAPTCHA alert email sent successfully')
      } else {
        console.error(
          '❌ Failed to send CAPTCHA alert email:',
          emailResult.error,
        )
      }

      // Wait for manual resolution
      console.log('⏳ Waiting for manual CAPTCHA resolution...')
      console.log('   The automation is now PAUSED.')
      console.log(
        '   Please access the EC2 server and solve the CAPTCHA manually.',
      )
      console.log(
        '   The automation will continue automatically once resolved.',
      )

      const resolved = await this.waitForCaptchaResolution(page)

      if (resolved) {
        console.log('✅ CAPTCHA resolved! Continuing automation...')
        return {
          detected: true,
          resolved: true,
          captchaType: captchaType,
          screenshotPath: screenshotPath,
        }
      } else {
        console.log(
          '⏰ CAPTCHA resolution timeout. Manual intervention may still be needed.',
        )
        return {
          detected: true,
          resolved: false,
          timeout: true,
          captchaType: captchaType,
          screenshotPath: screenshotPath,
        }
      }
    } catch (error) {
      console.error('❌ Error handling CAPTCHA detection:', error)
      return { detected: true, resolved: false, error: error.message }
    }
  }

  /**
   * Take screenshot when CAPTCHA is detected
   * @param {Page} page - Puppeteer page object
   * @param {string} templateName - Template name for filename
   * @returns {Promise<string>} Screenshot file path
   */
  async takeScreenshot(page, templateName) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `captcha_${templateName.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.png`
      const screenshotPath = `./data/screenshots/${filename}`

      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
      })

      console.log(`📸 Screenshot saved: ${screenshotPath}`)
      return screenshotPath
    } catch (error) {
      console.error('❌ Error taking screenshot:', error)
      return ''
    }
  }

  /**
   * Wait for CAPTCHA to be resolved manually
   * @param {Page} page - Puppeteer page object
   * @returns {Promise<boolean>} True if resolved, false if timeout
   */
  async waitForCaptchaResolution(page) {
    const checkInterval = 5000 // Check every 5 seconds
    const maxWaitTime = this.waitTimeout
    let elapsed = 0

    while (elapsed < maxWaitTime) {
      try {
        // Wait before checking
        await new Promise(resolve => setTimeout(resolve, checkInterval))
        elapsed += checkInterval

        // Check if we've navigated away from the CAPTCHA page
        const currentUrl = page.url()
        const isStillOnCaptchaPage = await page.evaluate(() => {
          const bodyText = document.body.innerText.toLowerCase()
          const title = document.title.toLowerCase()
          return (
            bodyText.includes('before we continue') ||
            bodyText.includes('press & hold') ||
            bodyText.includes('verify you are human') ||
            title.includes('just a moment') ||
            document.querySelector('div[id*="captcha"]') !== null ||
            document.querySelector('div[class*="captcha"]') !== null
          )
        })

        // If we're no longer on a CAPTCHA page, it's likely resolved
        if (!isStillOnCaptchaPage) {
          console.log(
            '✅ CAPTCHA appears to be resolved! Page content changed.',
          )

          // Wait a bit more to ensure page has stabilized
          await new Promise(resolve => setTimeout(resolve, 3000))
          return true
        }

        // Re-check for CAPTCHA presence using selectors
        const selectors = this.getCaptchaSelectors()
        let stillPresent = false

        for (const selector of selectors) {
          try {
            const element = await page.$(selector)
            if (element) {
              const isVisible = await page.evaluate(el => {
                const rect = el.getBoundingClientRect()
                return (
                  rect.width > 0 &&
                  rect.height > 0 &&
                  window.getComputedStyle(el).visibility !== 'hidden' &&
                  window.getComputedStyle(el).display !== 'none'
                )
              }, element)

              if (isVisible) {
                stillPresent = true
                break
              }
            }
          } catch (err) {
            continue
          }
        }

        // If no CAPTCHA elements are visible anymore, it's likely resolved
        if (!stillPresent) {
          console.log('✅ CAPTCHA elements no longer visible!')

          // Wait a bit more to ensure page has stabilized
          await new Promise(resolve => setTimeout(resolve, 3000))
          return true
        }

        // Show progress
        const remaining = Math.ceil((maxWaitTime - elapsed) / 1000)
        if (elapsed % 30000 === 0) {
          // Every 30 seconds
          console.log(
            `⏳ Still waiting for CAPTCHA resolution... (${remaining}s remaining)`,
          )
        }
      } catch (error) {
        console.error('❌ Error while waiting for CAPTCHA resolution:', error)
        return false
      }
    }

    console.log('⏰ CAPTCHA resolution timeout reached')
    return false
  }
}
