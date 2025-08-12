/** @typedef {import("patchright").Page} Page */
/** @typedef {import("patchright").Browser} Browser */

import { logger } from './logger.js'
import { sleep } from './sleep.js'

class TabManager {
  constructor() {
    this.tabs = new Map()
    this.browser = null
    this.tabCounter = 0
  }

  /**
   * Initialize the tab manager with a browser instance
   * @param {Browser} browser - The browser instance
   */
  setBrowser(browser) {
    this.browser = browser
    logger.info('TabManager: Browser instance set')
  }

  /**
   * Get an available tab or create a new one
   * @param {Object} options - Options for tab preparation
   * @returns {Promise<Page>} A page instance
   */
  async getTab(options = {}) {
    if (!this.browser) {
      throw new Error('TabManager: Browser not initialized')
    }

    // Find an idle tab
    for (const [id, tab] of this.tabs.entries()) {
      if (tab.status === 'idle' && !tab.page.isClosed()) {
        tab.status = 'busy'
        logger.info(`TabManager: Reusing tab ${id}`)
        
        // Navigate to blank to clear any state
        try {
          await tab.page.goto('about:blank')
          await sleep(500)
        } catch (err) {
          logger.warn(`TabManager: Failed to clear tab ${id}: ${err.message}`)
        }
        
        return tab.page
      }
    }

    // Create a new tab if none available
    const tabId = `tab_${++this.tabCounter}`
    logger.info(`TabManager: Creating new tab ${tabId}`)
    
    const page = await this.browser.newPage()
    
    // Set viewport and headers
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    })
    
    // Add anti-detection script
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      })
      
      Object.defineProperty(window, 'chrome', {
        writable: true,
        enumerable: true,
        configurable: false,
        value: {
          app: { isInstalled: false },
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
          },
        },
      })
      
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      })
      
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        writable: true,
        enumerable: true,
        configurable: true,
        value: 8,
      })
      
      Object.defineProperty(navigator, 'deviceMemory', {
        writable: true,
        enumerable: true,
        configurable: true,
        value: 8,
      })
    })
    
    // Store tab reference
    this.tabs.set(tabId, {
      page,
      status: 'busy',
      createdAt: Date.now(),
      lastUsed: Date.now()
    })
    
    return page
  }

  /**
   * Release a tab back to the pool
   * @param {Page} page - The page to release
   */
  async releaseTab(page) {
    if (!page || page.isClosed()) {
      return
    }

    // Find the tab
    for (const [id, tab] of this.tabs.entries()) {
      if (tab.page === page) {
        logger.info(`TabManager: Releasing tab ${id}`)
        tab.status = 'idle'
        tab.lastUsed = Date.now()
        
        // Don't navigate here - just mark as idle
        // The tab will be navigated to about:blank when reused
        
        return
      }
    }
    
    // If tab not found in pool, close it
    logger.warn('TabManager: Tab not found in pool, closing')
    try {
      await page.close()
    } catch (err) {
      logger.warn(`TabManager: Failed to close orphan tab: ${err.message}`)
    }
  }

  /**
   * Close all tabs
   */
  async closeAll() {
    logger.info('TabManager: Closing all tabs')
    
    for (const [id, tab] of this.tabs.entries()) {
      try {
        if (!tab.page.isClosed()) {
          await tab.page.close()
        }
        logger.info(`TabManager: Closed tab ${id}`)
      } catch (err) {
        logger.warn(`TabManager: Failed to close tab ${id}: ${err.message}`)
      }
    }
    
    this.tabs.clear()
    this.tabCounter = 0
  }

  /**
   * Get statistics about tab usage
   */
  getStats() {
    const stats = {
      total: this.tabs.size,
      idle: 0,
      busy: 0,
      closed: 0
    }
    
    for (const tab of this.tabs.values()) {
      if (tab.page.isClosed()) {
        stats.closed++
      } else if (tab.status === 'idle') {
        stats.idle++
      } else {
        stats.busy++
      }
    }
    
    return stats
  }

  /**
   * Clean up closed tabs from the pool
   */
  cleanup() {
    const toRemove = []
    
    for (const [id, tab] of this.tabs.entries()) {
      if (tab.page.isClosed()) {
        toRemove.push(id)
      }
    }
    
    for (const id of toRemove) {
      this.tabs.delete(id)
      logger.info(`TabManager: Removed closed tab ${id}`)
    }
    
    return toRemove.length
  }
}

// Export singleton instance
export const tabManager = new TabManager()