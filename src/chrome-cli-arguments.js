import { CHROME_DATA_DIR, CHROME_PROFILE, CHROME_HEADLESS } from '#config'

// Base Chrome arguments
const baseArguments = [
  '--remote-debugging-port=9922',
  `--profile-directory=${CHROME_PROFILE}`,
  `--user-data-dir=${CHROME_DATA_DIR}`,
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--disable-software-rasterizer',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding',
  '--disable-ipc-flooding-protection',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-web-security',
  '--disable-features=VizDisplayCompositor',
  '--window-size=1680,900',
  '--force-device-scale-factor=1',
  '--new-window',
  '--disable-extensions',
  '--disable-plugins',
  '--disable-images',
  '--mute-audio',
  // Disable Google sync and cloud services to prevent GCM deprecated endpoint warning
  '--disable-sync',
  '--disable-background-networking',
  '--disable-component-update',
  '--disable-component-extensions-with-background-pages',
  '--disable-client-side-phishing-detection',
  '--disable-default-apps',
  '--disable-domain-reliability',
  '--disable-features=ChromeWhatsNewUI,OptimizationHints,Translate,InterestFeedContentSuggestions,CertificateTransparencyComponentUpdater,AutofillServerCommunication',
  '--disable-features=MediaRouter,DialMediaRouteProvider,CalculateNativeWinOcclusion',
  '--disable-features=ImprovedCookieControls,LazyFrameLoading,GlobalMediaControls',
  '--disable-features=AudioServiceOutOfProcess,NetworkService,NetworkServiceInProcess',
  '--disable-field-trial-config',
  '--disable-hang-monitor',
  '--disable-popup-blocking',
  '--disable-prompt-on-repost',
  '--disable-sync-preferences',
  '--metrics-recording-only',
  '--no-service-autorun',
  '--password-store=basic',
  '--use-mock-keychain',
  '--disable-blink-features=AutomationControlled',
  '--safebrowsing-disable-auto-update',
]

// Additional arguments for headless mode
const headlessArguments = CHROME_HEADLESS
  ? [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--disable-background-timer-throttling',
      '--virtual-time-budget=1000',
    ]
  : []

export const chromeCliArguments = [...baseArguments, ...headlessArguments]
