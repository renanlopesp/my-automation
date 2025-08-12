import 'dotenv/config'

export const NODE_ENV = process.env.NODE_ENV
export const ROUND_DELAY = parseInt(process.env.ROUND_DELAY ?? '1', 10)

export const MARKETPLACE_TOKEN = process.env.MARKETPLACE_TOKEN
export const AUTOMATION_APP_ID = process.env.AUTOMATION_APP_ID
export const HOST = process.env.HOST

// Chrome path with better server defaults
export const CHROME_PATH =
  process.env.CHROME_PATH ??
  (process.platform === 'linux'
    ? '/usr/bin/google-chrome'
    : process.platform === 'darwin'
      ? '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary'
      : 'google-chrome')

export const CHROME_PROFILE = process.env.CHROME_PROFILE ?? 'Default'
export const CHROME_DATA_DIR = process.env.CHROME_DATA_DIR || '/tmp/chrome-data'
export const CHROME_HEADLESS = process.env.CHROME_HEADLESS !== 'false' // Default to true unless explicitly set to 'false'
export const CHROME_STEALTH_MODE = process.env.CHROME_STEALTH_MODE ?? 'maximum' // 'basic', 'enhanced', 'maximum'
export const TEMPLACE_OPTION_ID = process.env.TEMPLACE_OPTION_ID

export const WEBFLOW_LOGIN_URL = `https://webflow.com/login`
export const WEBFLOW_USERNAME = process.env.WEBFLOW_USERNAME
export const WEBFLOW_PASSWORD = process.env.WEBFLOW_PASSWORD

export const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID
export const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY
export const S3_AUTOMATION_BUCKET = process.env.S3_AUTOMATION_BUCKET

export const SURREAL_URL = process.env.SURREAL_URL
export const SURREAL_USER = process.env.SURREAL_USER
export const SURREAL_PASSWORD = process.env.SURREAL_PASSWORD

export const DEV_SURREAL_URL = process.env.DEV_SURREAL_URL
export const DEV_SURREAL_USER = process.env.DEV_SURREAL_USER
export const DEV_SURREAL_PASSWORD = process.env.DEV_SURREAL_PASSWORD

export const PROD_SURREAL_URL = process.env.PROD_SURREAL_URL
export const PROD_SURREAL_USER = process.env.PROD_SURREAL_USER
export const PROD_SURREAL_PASSWORD = process.env.PROD_SURREAL_PASSWORD

export const CREDENTIALS = {
  local: {
    url: SURREAL_URL,
    username: SURREAL_USER,
    password: SURREAL_PASSWORD,
  },
  dev: {
    url: DEV_SURREAL_URL,
    username: DEV_SURREAL_USER,
    password: DEV_SURREAL_PASSWORD,
  },
  prod: {
    url: PROD_SURREAL_URL,
    username: PROD_SURREAL_USER,
    password: PROD_SURREAL_PASSWORD,
  },
}
