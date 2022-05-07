'use strict'
const SHIFT_KEY = 'shift'
const CTRL_KEY = 'control'
const ALT_KEY = 'alt'

class ChromeStorage {
  constructor() {
    this.storageKey = 'shortcuts'
  }

  get() {
    return new Promise((resolve) =>
      chrome.storage.sync.get([this.storageKey], result => {
        try {
          resolve(JSON.parse(result[this.storageKey]))
        } catch (e) {
          resolve([])
        }
      })
    )
  }
}

const chromeStorage = new ChromeStorage()
window.document.addEventListener(
  'keydown',
  async (event) => {
    const data = await chromeStorage.get()
    let currentEventKeys = []

    if (event.shiftKey) currentEventKeys.push(SHIFT_KEY)
    if (event.ctrlKey) currentEventKeys.push(CTRL_KEY)
    if (event.altKey) currentEventKeys.push(ALT_KEY)
    if (event.key) currentEventKeys.push(event.key.toLowerCase())
    
    currentEventKeys = Array.from(new Set(currentEventKeys))
    const foundShortcut = data?.find(
      ({ shortcut }) => shortcut.every(key => currentEventKeys.includes(key))
    )

    if (foundShortcut) window.open(foundShortcut.link)
  }
)