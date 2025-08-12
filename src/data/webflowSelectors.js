import { TEMPLACE_OPTION_ID } from '#config'

const modalFooter = 'div[data-sc="ModalFooter"]'

// data-automation-id="site-transfer-
// const receiveContainer = 'div[data-automation-id^="terracota-"]';
const receiveContainer = '//main[@data-automation-id="main-content"]'
const receiveZero = `(${receiveContainer}//div[@data-automation-id])[1]`
const receiveTitle = `${receiveContainer}//div[@data-automation-id]//p[@data-text="true"]`
const templaceOption = `//span[@data-automation-id="overlay"]//div/div/button[@data-automation-id="${TEMPLACE_OPTION_ID}"]`
const whatsNew = `//div[contains(text(), "What's new")]`
const whatsNewClose = `//button[@data-automation-id="modal-close-button"]`

export const selectors = {
  loginUsername: 'input[data-automation-id="login-email-input"]',
  loginPassword: 'input[data-automation-id="login-password-input"]',
  loginSubmit: 'button[data-automation-id="login-button"]',
  container: 'div[data-automation-id="projects-tab-container"]',
  card: 'div[data-automation-id="projects-tab-container"]',
  cardMenu: 'div[role="menu"]',
  cardMenuButton: 'button[data-automation-id="site-settings"]',
  cardMenuButtonDuplicate: 'button[data-automation-id="duplicate-site"]',
  cardMenuButtonSettings: 'button[data-automation-id="site-settings-link"]',
  modalFooter,
  modalDuplicate: `${modalFooter} button:nth-child(2):not([aria-disabled="false"])`,
  dashboardSearchBar: 'input[data-automation-id="home-search-sites-input"]',
  settingsNameInput: 'label[for="form-group-0-3"]',
  transferButton: 'button[data-automation-id="transfer-site"]',
  transferInput: 'input[data-automation-id="transfer-modal-user-email"]',

  // main[data-automation-id="main-content"] div[data-automation-id^="site-transfer"] >div:nth-child(2) >p[data-text="true"]
}

export const xpath = {
  // receive
  receiveContainer,
  receiveZero,
  receiveTitle,
  templaceOption,
  whatsNew,
  whatsNewClose,
}
