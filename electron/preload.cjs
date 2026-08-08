const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld(
  "ispDesktop",
  {
    isElectron: true,

    platform: process.platform,

    apiRoot: "http://127.0.0.1:5000/api",
  }
);