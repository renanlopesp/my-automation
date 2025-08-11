import Surreal from 'surrealdb'
import jwt from 'jsonwebtoken'

import { logger } from '#utils'
import { CREDENTIALS } from '#config'

class SurrealizedSingleton extends Surreal {
  static get CONFIG() {
    return {
      TIMEOUT: 20 * 60 * 1000,
      DEFAULT_NAMESPACE: 'dsm',
      DEFAULT_DATABASE: 'dsm',
    }
  }

  static get shelf() {
    if (!this._shelf) {
      this._shelf = new Map()
    }
    return this._shelf
  }

  get connectionStatus() {
    if (!this._connectionStatus) {
      this._connectionStatus = {
        isExecutingQuery: false,
        token: undefined,
      }
    }
    return this._connectionStatus
  }

  get timer() {
    return this._timer
  }

  set timer(value) {
    this._timer = value
  }

  constructor(...params) {
    super(...params)
  }

  async query(...args) {
    this.connectionStatus.isExecutingQuery = true
    try {
      const result = await super.query(...args)
      return result
    } finally {
      this.connectionStatus.isExecutingQuery = false
    }
  }

  calculateTimeout() {
    const tokenExp = this.connectionStatus.token?.exp
    if (!tokenExp) {
      return 10 * 60 * 1000
    }

    const timeout =
      tokenExp * 1000 - SurrealizedSingleton.CONFIG.TIMEOUT - Date.now()
    return Math.max(timeout, 30000)
  }

  async handleConnectionClose() {
    const token = this.connection?.connection.token

    await this.close()

    if (this.timer) {
      clearInterval(this.timer)
      this.timer = undefined
    }

    if (token) {
      SurrealizedSingleton.shelf.delete(token)
    }

    logger.info(`Surreal connection closed`)
  }

  setTimer() {
    clearInterval(this.timer)
    this.timer = undefined

    logger.info(`Timeout: ${SurrealizedSingleton.CONFIG.TIMEOUT}`)
    const timeout = this.calculateTimeout()

    this.timer = setInterval(() => {
      ;(async () => {
        if (
          this?.status === 'connected' &&
          !this.connectionStatus.isExecutingQuery
        ) {
          await this.handleConnectionClose()
        }
      })()
    }, timeout)
  }

  async handleConnection(authData) {
    await this.connect(authData.url, {
      namespace: SurrealizedSingleton.CONFIG.DEFAULT_NAMESPACE,
      database: SurrealizedSingleton.CONFIG.DEFAULT_DATABASE,
    })

    await this.signin(authData)

    await this.allReady()
  }

  async allReady() {
    await this.ready
    await this.connection?.ready
  }

  decodeToken() {
    this.connectionStatus.token = this.connection?.connection.token
      ? jwt.decode(this.connection.connection.token)
      : undefined
  }

  async init(credentialsName) {
    const authData = CREDENTIALS[credentialsName]
    await this.handleConnection(authData)
    this.decodeToken()
    this.setTimer()
    logger.info(`Surreal connection: ${this.status}`)
  }

  static tokenWithCredentials(credentialsName, token) {
    if (token) {
      return `${credentialsName}:::${token}`
    }

    return null
  }

  static getFirstAvailable(credentialsName) {
    if (SurrealizedSingleton.shelf.size === 0) return null

    const list = Array.from(SurrealizedSingleton.shelf.keys())
    const found = list.reduce((acc, token) => {
      if (acc) return acc

      if (token.startsWith(credentialsName)) {
        const instance = SurrealizedSingleton.shelf.get(token)
        if (instance?.status === 'connected') {
          return instance
        }
      }

      return null
    }, null)

    return found || null
  }

  static async getInstance(credentialsName) {
    let instance = SurrealizedSingleton.getFirstAvailable(credentialsName)
    if (instance) {
      return instance
    }

    instance = new SurrealizedSingleton()
    await instance.init(credentialsName)
    const token = instance.connection?.connection.token

    if (token) {
      const tokenAndCredentials = SurrealizedSingleton.tokenWithCredentials(
        credentialsName,
        token,
      )

      SurrealizedSingleton.shelf.set(tokenAndCredentials, instance)
    }

    return instance
  }
}

export const Surrealized = async credentialsName =>
  await SurrealizedSingleton.getInstance(credentialsName)

export { jsonify } from 'surrealdb'
export { surql } from '#data'
