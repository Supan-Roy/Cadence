/**
 * Logger utility for debugging
 */

import { LOG_CONFIG } from '../config/constants.js'

const LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
}

const LEVEL_VALUES = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
}

class Logger {
  constructor(name = 'Cadence') {
    this.name = name
    this.enabled = LOG_CONFIG.ENABLED
    this.logLevel = LEVEL_VALUES[LOG_CONFIG.LEVEL] || LEVEL_VALUES.debug
  }

  shouldLog(level) {
    return this.enabled && LEVEL_VALUES[level] <= this.logLevel
  }

  formatMessage(level, message, data) {
    const timestamp = new Date().toISOString()
    const prefix = `[${timestamp}] [${this.name}:${level.toUpperCase()}]`

    if (data) {
      return `${prefix} ${message}`, data
    }
    return `${prefix} ${message}`
  }

  error(message, error) {
    if (!this.shouldLog(LEVELS.ERROR)) return

    const formatted = this.formatMessage(LEVELS.ERROR, message, error)
    if (LOG_CONFIG.CONSOLE) {
      if (error) {
        console.error(...[formatted, error].filter(Boolean))
      } else {
        console.error(formatted)
      }
    }
  }

  warn(message, data) {
    if (!this.shouldLog(LEVELS.WARN)) return

    if (LOG_CONFIG.CONSOLE) {
      console.warn(this.formatMessage(LEVELS.WARN, message, data))
    }
  }

  info(message, data) {
    if (!this.shouldLog(LEVELS.INFO)) return

    if (LOG_CONFIG.CONSOLE) {
      console.info(this.formatMessage(LEVELS.INFO, message, data))
    }
  }

  debug(message, data) {
    if (!this.shouldLog(LEVELS.DEBUG)) return

    if (LOG_CONFIG.CONSOLE) {
      console.log(this.formatMessage(LEVELS.DEBUG, message, data))
    }
  }

  group(label) {
    if (this.enabled && LOG_CONFIG.CONSOLE) {
      console.group(`[${this.name}] ${label}`)
    }
  }

  groupEnd() {
    if (this.enabled && LOG_CONFIG.CONSOLE) {
      console.groupEnd()
    }
  }

  time(label) {
    if (this.enabled && LOG_CONFIG.CONSOLE) {
      console.time(`[${this.name}] ${label}`)
    }
  }

  timeEnd(label) {
    if (this.enabled && LOG_CONFIG.CONSOLE) {
      console.timeEnd(`[${this.name}] ${label}`)
    }
  }
}

// Export singleton instances for different modules
export const appLogger = new Logger('App')
export const apiLogger = new Logger('API')
export const playerLogger = new Logger('Player')
export const authLogger = new Logger('Auth')

export default Logger
