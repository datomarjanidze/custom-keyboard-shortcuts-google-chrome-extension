'use strict'
const SHIFT_KEY = 'shift'
const CTRL_KEY = 'control'
const ALT_KEY = 'alt'
let listeningId = null

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

  set(data) {
    chrome.storage.sync.set({
      [this.storageKey]: JSON.stringify(data)
    })
  }
}

class ShortcutsList {
  constructor() {
    this.ulHTMLElement = window.document.querySelector('ul')
  }

  get htmlLisArray() {
    return Array.from(this.ulHTMLElement.children)
  }
  
  pushLiElement(
    input,
    button,
    deleteButton,
    link
  ) {
    const li = this.generateLiHTMLElement(link)
    li.appendChild(input)
    li.appendChild(button)
    li.appendChild(deleteButton)
    this.ulHTMLElement.appendChild(li)
  }

  generateLiHTMLElement(link) {
    const li = window.document.createElement('li')
    li.id = link
    return li
  }

  update(liHTMLElement, link) {
    const [input, shortcutButton, deleteButton] = Array.from(liHTMLElement.children)

    liHTMLElement.id = link
    input.id = link
    input.value = link
    shortcutButton.id = link
    deleteButton.id = link
  }


  delete(link) {
    this.htmlLisArray.find(({ id }) => id === link).remove()
    
  }
}

class ShortcutInput {
  constructor(
    link,
    placeholder,
    chromeStorage,
    shortcutsList
  ) {
    this.inputHTMLElement = this.generateInput(link, placeholder)
    this.chromeStorage = chromeStorage
    this.shortcutsList = shortcutsList
    this.registerChangeListener()
  }

  generateInput(
    link,
    placeholder
  ) {
    const input = window.document.createElement('input')
    input.id = link
    input.value = link
    input.placeholder = placeholder
    return input
  }

  registerChangeListener() {
    this.inputHTMLElement.addEventListener('change', async () => {
      const data = await this.chromeStorage.get()
      const dataItem = data.find(({ link }) => link === this.inputHTMLElement.id)

      if (dataItem) {
        dataItem.link = this.inputHTMLElement.value
        this.shortcutsList.update(this.inputHTMLElement.parentElement, this.inputHTMLElement.value)
      } else {
        this.shortcutsList.update(this.inputHTMLElement.parentElement, this.inputHTMLElement.value)
        data.push({ link: this.inputHTMLElement.value, shortcut: [] })
      }

      this.chromeStorage.set(data)
    })
  }
}

class ShortcutButton {
  constructor(link, shortcut, placeholder) {
    this.buttonHTMLElement = this.generateButton(link, shortcut, placeholder)
    this.registerClickListener()
  }

  generateButton(
    link,
    shortcut,
    placeholder
  ) {
    const button = window.document.createElement('button')
    button.id = link
    button.className = 'shortcut'
    button.innerText = ShortcutButton.shortcutTextGenerator(shortcut) || placeholder
    return button
  }

  registerClickListener() {
    this.buttonHTMLElement.addEventListener('click', () => {
      listeningId = this.buttonHTMLElement.id
    })
  }

  static shortcutTextGenerator(shortcut) {
    return (shortcut || [])
      .map(key => `${key[0].toUpperCase()}${key.substring(1)}`)
      .join(' ')
  }
}

class ShortcutDeleteButton {
  constructor(link, shortcutsList, chromeStorage) {
    this.buttonHTMLElement = this.generateButton(link)
    this.shortcutsList = shortcutsList
    this.chromeStorage = chromeStorage
    this.registerClickListener()
  }

  generateButton(link) {
    const button = window.document.createElement('button')
    button.id = link
    button.className = 'delete'
    button.innerText = 'x'
    return button
  }

  registerClickListener() {
    this.buttonHTMLElement.addEventListener('click', async () => {
      const data = await this.chromeStorage.get()
      data.splice(data.findIndex(({ link }) => this.buttonHTMLElement.id === link), 1)
      this.shortcutsList.delete(this.buttonHTMLElement.id)
      this.chromeStorage.set(data)
    })
  }
}

window.document.addEventListener('DOMContentLoaded', async () => {
  const chromeStorage = new ChromeStorage()
  const shortcutsList = new ShortcutsList()
  const data = await chromeStorage.get()
  const pushLiElement = (
    shortcutsList,
    chromeStorage,
    dataItem = { link: '', shortcut: [] }
  ) => {
    const input = new ShortcutInput(dataItem.link, 'Type shortcut link', chromeStorage, shortcutsList)
    const shortcutButton = new ShortcutButton(dataItem.link, dataItem.shortcut, 'Press')
    const deleteButton = new ShortcutDeleteButton(dataItem.link, shortcutsList, chromeStorage)
  
    shortcutsList.pushLiElement(
      input.inputHTMLElement,
      shortcutButton.buttonHTMLElement,
      deleteButton.buttonHTMLElement,
      dataItem.link
    )
  }

  if (data.length)
    data.forEach(dataItem => pushLiElement(shortcutsList, chromeStorage, dataItem))
  else pushLiElement(shortcutsList, chromeStorage)

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

      if (
        listeningId &&
        shortcutsList.htmlLisArray.some(({ children }) => children[1] === event.target)
      ) {
        event.target.innerText = ShortcutButton.shortcutTextGenerator(currentEventKeys) 
        data.find(({ link }) => link === event.target.id).shortcut = currentEventKeys
        chromeStorage.set(data)
      } else {
        const foundShortcut = data?.find(
          ({ shortcut }) => shortcut.every(key => currentEventKeys.includes(key))
        )

        if (foundShortcut) window.open(foundShortcut.link)
      }
    })

    window.document.querySelector('#add-shortcut').addEventListener(
      'click',
      () => pushLiElement(shortcutsList, chromeStorage)
    )
})