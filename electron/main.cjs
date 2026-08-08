const { app, BrowserWindow, shell } = require("electron");
const path = require("path");

const isDevelopment = !app.isPackaged;

let mainWindow = null;
let backendServer = null;

async function startBackend() {
  try {
    const backendPath = path.join(
      __dirname,
      "../transport-backend/server.cjs"
    );

    const { startServer } = require(backendPath);

    const result = await startServer({
      host: "127.0.0.1",
      port: 5000,
    });

    backendServer = result.server;

    console.log(
      "Backend ready:",
      `http://${result.host}:${result.port}`
    );
  } catch (error) {
    console.error("Unable to start backend:", error);

    throw error;
  }
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,

    minWidth: 1100,
    minHeight: 700,

    show: false,

    backgroundColor: "#000000",

    icon: path.join(__dirname, "../build/icon.png"),

    autoHideMenuBar: true,

    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),

      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.maximize();

  if (isDevelopment) {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.loadFile(
      path.join(__dirname, "../dist/index.html")
    );
  }

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.on(
    "did-fail-load",
    (
      event,
      errorCode,
      errorDescription,
      validatedURL
    ) => {
      console.error("Electron page failed:", {
        errorCode,
        errorDescription,
        validatedURL,
      });
    }
  );

  mainWindow.webContents.on(
    "console-message",
    (
      event,
      level,
      message,
      line,
      sourceId
    ) => {
      console.log(
        `[Renderer ${level}] ${message}`,
        sourceId,
        line
      );
    }
  );

  mainWindow.webContents.setWindowOpenHandler(
    ({ url }) => {
      if (
        url.startsWith("http://") ||
        url.startsWith("https://")
      ) {
        shell.openExternal(url);
      }

      return {
        action: "deny",
      };
    }
  );
}

app.whenReady().then(async () => {
  try {
    await startBackend();
    createMainWindow();
  } catch (error) {
    console.error(
      "Smart Office could not start:",
      error
    );

    app.quit();
  }

  app.on("activate", () => {
    if (
      BrowserWindow.getAllWindows().length === 0
    ) {
      createMainWindow();
    }
  });
});

app.on("before-quit", () => {
  if (backendServer) {
    backendServer.close();
    backendServer = null;
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});