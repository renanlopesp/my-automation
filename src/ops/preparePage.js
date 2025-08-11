/** @typedef {import("puppeteer").Page} Page */
/** @typedef {import("puppeteer").Browser} Browser */

import { createSafePage } from '../utils/safePage.js'

/**
 * Prepares a new page with stealth configurations to avoid bot detection.
 * @param {Browser} browser - The browser instance to create a new page in.
 * @param {Object} options - Configuration options
 * @param {boolean} options.withCaptchaDetection - If true, returns a SafePage wrapper with automatic CAPTCHA detection
 * @returns {Promise<Page|SafePage>} A Promise that resolves to the new page object or SafePage wrapper.
 */
export async function preparePage(browser, options = {}) {
  const page = await browser.newPage()

  // Set a realistic viewport
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })

  // Set a realistic user agent (instead of headless Chrome user agent)
  await page.setUserAgent(
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  )

  // Override permissions to avoid bot detection
  const context = browser.defaultBrowserContext()
  await context.overridePermissions('https://webflow.com', [
    'geolocation',
    'notifications',
  ])

  // Inject scripts to hide automation traces
  await page.evaluateOnNewDocument(() => {
    // Remove webdriver property
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    })

    // Mock chrome property
    Object.defineProperty(window, 'chrome', {
      writable: true,
      enumerable: true,
      configurable: false,
      value: {
        app: {
          isInstalled: false,
        },
        webstore: {
          onInstallStageChanged: {},
          onDownloadProgress: {},
        },
        runtime: {
          PlatformOs: {
            MAC: 'mac',
            WIN: 'win',
            ANDROID: 'android',
            CROS: 'cros',
            LINUX: 'linux',
            OPENBSD: 'openbsd',
          },
          PlatformArch: {
            ARM: 'arm',
            X86_32: 'x86-32',
            X86_64: 'x86-64',
          },
          PlatformNaclArch: {
            ARM: 'arm',
            X86_32: 'x86-32',
            X86_64: 'x86-64',
          },
          RequestUpdateCheckStatus: {
            THROTTLED: 'throttled',
            NO_UPDATE: 'no_update',
            UPDATE_AVAILABLE: 'update_available',
          },
          OnInstalledReason: {
            INSTALL: 'install',
            UPDATE: 'update',
            CHROME_UPDATE: 'chrome_update',
            SHARED_MODULE_UPDATE: 'shared_module_update',
          },
          OnRestartRequiredReason: {
            APP_UPDATE: 'app_update',
            OS_UPDATE: 'os_update',
            PERIODIC: 'periodic',
          },
        },
      },
    })

    // Mock plugins
    Object.defineProperty(navigator, 'plugins', {
      writable: true,
      enumerable: true,
      configurable: true,
      value: [
        {
          0: {
            type: 'application/x-google-chrome-pdf',
            suffixes: 'pdf',
            description: 'Portable Document Format',
            enabledPlugin: Plugin,
          },
          description: 'Portable Document Format',
          filename: 'internal-pdf-viewer',
          length: 1,
          name: 'Chrome PDF Plugin',
        },
        {
          0: {
            type: 'application/pdf',
            suffixes: 'pdf',
            description: '',
            enabledPlugin: Plugin,
          },
          description: '',
          filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai',
          length: 1,
          name: 'Chrome PDF Viewer',
        },
        {
          0: {
            type: 'application/x-nacl',
            suffixes: '',
            description: 'Native Client Executable',
            enabledPlugin: Plugin,
          },
          1: {
            type: 'application/x-pnacl',
            suffixes: '',
            description: 'Portable Native Client Executable',
            enabledPlugin: Plugin,
          },
          description: '',
          filename: 'internal-nacl-plugin',
          length: 2,
          name: 'Native Client',
        },
      ],
    })

    // Mock languages
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en'],
    })

    // Mock connection
    Object.defineProperty(navigator, 'connection', {
      writable: true,
      enumerable: true,
      configurable: true,
      value: {
        downlink: 2.05,
        effectiveType: '4g',
        onchange: null,
        rtt: 50,
        saveData: false,
      },
    })

    // Mock hardware concurrency
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      writable: true,
      enumerable: true,
      configurable: true,
      value: 8,
    })

    // Mock device memory
    Object.defineProperty(navigator, 'deviceMemory', {
      writable: true,
      enumerable: true,
      configurable: true,
      value: 8,
    })
  })

  // Set extra HTTP headers to look more like a regular browser
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    Accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-User': '?1',
    'Sec-Fetch-Dest': 'document',
    'sec-ch-ua':
      '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Linux"',
  })

  // Return SafePage wrapper if requested
  if (options.withCaptchaDetection) {
    return createSafePage(page, options)
  }

  return page
}
