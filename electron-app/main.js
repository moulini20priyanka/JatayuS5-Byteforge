const { app, BrowserWindow } = require("electron")
const path = require("path")

let win

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    fullscreen: true,
    kiosk: true,
    frame: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      devTools: false
    }
  })

  win.removeMenu()

  // ✅ FIXED PATH — adjust if your structure differs
win.loadFile(path.join(__dirname, "../frontend/build/index.html"))

  win.webContents.on("did-fail-load", (event, code, desc) => {
    console.error("Failed to load:", code, desc)
  })

  // BLOCK DEVTOOLS
  win.webContents.on("devtools-opened", () => {
    win.webContents.closeDevTools()
  })

  // BLOCK RIGHT CLICK
  win.webContents.on("context-menu", (e) => {
    e.preventDefault()
  })

  // BLOCK ALL DANGEROUS SHORTCUTS
  win.webContents.on("before-input-event", (event, input) => {
    const key = input.key.toLowerCase()

    // Block DevTools
    if (key === "f12") event.preventDefault()
    if (input.control && input.shift && ["i", "j", "c"].includes(key)) event.preventDefault()

    // Block Refresh
    if (key === "f5") event.preventDefault()
    if (input.control && key === "r") event.preventDefault()
    if (input.control && input.shift && key === "r") event.preventDefault()

    // Block Copy/Paste/Cut
    if (input.control && ["c", "v", "x"].includes(key)) event.preventDefault()

    // Block View Source
    if (input.control && key === "u") event.preventDefault()

    // Block Save
    if (input.control && key === "s") event.preventDefault()

    // Block Print
    if (input.control && key === "p") event.preventDefault()

    // Block Find
    if (input.control && key === "f") event.preventDefault()

    // Block zoom
    if (input.control && ["+", "-", "=", "0"].includes(key)) event.preventDefault()
  })
}

app.whenReady().then(createWindow)

app.on("window-all-closed", () => {
  app.quit()
})