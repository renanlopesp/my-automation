export const SECOND = 1000
export const SECONDS_10 = SECOND * 10
export const SECONDS_30 = SECOND * 30
export const SECONDS_60 = SECOND * 60

export const TransferReceiveStatus = {
  INITIAL: 'TransferReceive/INITIAL',
  PROGRESS: 'TransferReceive/PROGRESS',
  PENDING: 'TransferReceive/PENDING',
  COMPLETE: 'TransferReceive/COMPLETE',
  UNKNOWN: 'TransferReceive/UNKNOWN',
  CANCELED: 'TransferReceive/CANCELED',
}

export const TransferSendStatus = {
  INITIAL: 'TransferSend/INITIAL',
  PROGRESS: 'TransferSend/PROGRESS',
  PENDING: 'TransferSend/PENDING',
  COMPLETE: 'TransferSend/COMPLETE',
  MULTIPLE: 'TransferSend/MULTIPLE',
  UNKNOWN: 'TransferSend/UNKNOWN',
  CANCELED: 'TransferSend/CANCELED',
}

export const TransferPlatform = {
  WEBFLOW: 'webflow',
}

export * from './surreal.js'
export * from './surql.js'
export * from './webflowSelectors.js'
export * from './transferHeader.js'
