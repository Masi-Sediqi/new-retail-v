const express = require("express");
const cors = require("cors");
const fs = require("fs-extra");
const http = require("http");
const path = require("path");

const app = express();

const PORT = Number(process.env.ISP_API_PORT || 5000);
const HOST = process.env.ISP_API_HOST || "127.0.0.1";

const DATA_DIR = path.resolve(
  process.env.SMART_OFFICE_DATA_DIR ||
    process.env.ISP_DATA_DIR ||
    "C:/Smart Office Pro"
);

const BACKUP_DIR = path.join(DATA_DIR, "_backups");

const COLLECTIONS = new Set([
  "accounts",
  "assetCategories",
  "assetMovements",
  "assets",
  "billingInvoices",
  "bundles",
  "carRepairs",
  "cars",
  "customerDeviceBuybacks",
  "customerDevices",
  "customerPackages",
  "customerPayments",
  "customers",
  "customerTravels",
  "deletedItems",
  "deviceHistory",
  "deviceTransfers",
  "disconnections",
  "employeeEarnings",
  "employeePayments",
  "employeePayrolls",
  "employeeTypes",
  "expenseCategories",
  "expenses",
  "financeBudgets",
  "financeCategories",
  "godownEntries",
  "packages",
  "productCategories",
  "products",
  "reports",
  "securityDeposits",
  "settings",
  "staff",
  "supplierPayments",
  "supplierPurchases",
  "suppliers",
  "towerAssetTransfers",
  "towerAssets",
  "towerLinks",
  "transactions",
  "travelExpenses",
  "travels",
  "userRoles",
  "partnerInvestingAccounts",
]);

const writeQueues = new Map();

app.use(cors());

app.use(
  express.json({
    limit: "25mb",
    strict: true,
  })
);

function createHttpError(message, status = 500, extra = {}) {
  return Object.assign(new Error(message), {
    status,
    ...extra,
  });
}

function validateCollection(collection) {
  if (!COLLECTIONS.has(collection)) {
    throw createHttpError(
      `Unknown collection: ${collection}`,
      404
    );
  }
}

function dataFile(collection) {
  return path.join(DATA_DIR, `${collection}.json`);
}

function standardBackupFile(collection) {
  return path.join(DATA_DIR, `${collection}.json.bak`);
}

function timestampValue() {
  return new Date()
    .toISOString()
    .replace(/:/g, "-")
    .replace(/\./g, "-");
}

function timestampedBackupFile(collection, label = "backup") {
  return path.join(
    BACKUP_DIR,
    `${collection}.${label}.${timestampValue()}.json`
  );
}

async function ensureStorageDirectories() {
  await fs.ensureDir(DATA_DIR);
  await fs.ensureDir(BACKUP_DIR);
}

async function isValidCollectionFile(file) {
  try {
    if (!(await fs.pathExists(file))) {
      return false;
    }

    const data = await fs.readJson(file);
    return Array.isArray(data);
  } catch {
    return false;
  }
}

async function restoreFromStandardBackup(collection) {
  const file = dataFile(collection);
  const backupFile = standardBackupFile(collection);

  if (!(await isValidCollectionFile(backupFile))) {
    return false;
  }

  await fs.copy(backupFile, file, {
    overwrite: true,
  });

  console.warn(
    `[DATA RECOVERY] Restored ${collection}.json from ${path.basename(
      backupFile
    )}`
  );

  return true;
}

async function ensureCollectionFile(collection) {
  validateCollection(collection);
  await ensureStorageDirectories();

  const file = dataFile(collection);

  if (await fs.pathExists(file)) {
    return file;
  }

  const restored = await restoreFromStandardBackup(collection);

  if (restored) {
    return file;
  }

  await fs.writeJson(file, [], {
    spaces: 2,
  });

  console.log(
    `[DATA CREATED] ${collection}.json`
  );

  return file;
}

async function preserveBrokenFile(collection, file) {
  if (!(await fs.pathExists(file))) {
    return null;
  }

  await fs.ensureDir(BACKUP_DIR);

  const brokenBackup = timestampedBackupFile(
    collection,
    "broken"
  );

  await fs.copy(file, brokenBackup, {
    overwrite: true,
  });

  console.error(
    `[DATA ERROR] Invalid file preserved at: ${brokenBackup}`
  );

  return brokenBackup;
}

async function readCollection(collection) {
  validateCollection(collection);

  const file = await ensureCollectionFile(collection);

  try {
    const data = await fs.readJson(file);

    if (!Array.isArray(data)) {
      throw new Error(
        `${collection}.json must contain a JSON array`
      );
    }

    return data;
  } catch (error) {
    const brokenBackup = await preserveBrokenFile(
      collection,
      file
    );

    const standardBackup = standardBackupFile(collection);

    if (await isValidCollectionFile(standardBackup)) {
      await fs.copy(standardBackup, file, {
        overwrite: true,
      });

      console.warn(
        `[DATA RECOVERY] ${collection}.json was restored from its latest backup`
      );

      const restoredData = await fs.readJson(file);

      if (Array.isArray(restoredData)) {
        return restoredData;
      }
    }

    throw createHttpError(
      `Unable to read ${collection}.json. The original file was not replaced with empty data.`,
      500,
      {
        collection,
        brokenBackup,
        originalError: error.message,
      }
    );
  }
}

async function createBackupsBeforeWrite(
  collection,
  file
) {
  if (!(await fs.pathExists(file))) {
    return;
  }

  if (!(await isValidCollectionFile(file))) {
    await preserveBrokenFile(collection, file);

    throw createHttpError(
      `Refusing to overwrite invalid ${collection}.json`,
      500
    );
  }

  await fs.ensureDir(BACKUP_DIR);

  const standardBackup = standardBackupFile(collection);
  const historyBackup = timestampedBackupFile(
    collection,
    "backup"
  );

  await fs.copy(file, standardBackup, {
    overwrite: true,
  });

  await fs.copy(file, historyBackup, {
    overwrite: true,
  });
}

async function removeOldBackups(
  collection,
  keepCount = 20
) {
  try {
    await fs.ensureDir(BACKUP_DIR);

    const files = await fs.readdir(BACKUP_DIR);

    const collectionBackups = files
      .filter(
        (fileName) =>
          fileName.startsWith(`${collection}.backup.`) &&
          fileName.endsWith(".json")
      )
      .sort()
      .reverse();

    const filesToDelete =
      collectionBackups.slice(keepCount);

    await Promise.all(
      filesToDelete.map((fileName) =>
        fs.remove(path.join(BACKUP_DIR, fileName))
      )
    );
  } catch (error) {
    console.warn(
      `[BACKUP CLEANUP WARNING] ${collection}:`,
      error.message
    );
  }
}

async function atomicWriteJson(file, items) {
  const tempFile = `${file}.${process.pid}.${Date.now()}.tmp`;

  try {
    await fs.writeJson(tempFile, items, {
      spaces: 2,
    });

    const validation = await fs.readJson(tempFile);

    if (!Array.isArray(validation)) {
      throw new Error(
        "Temporary JSON validation failed"
      );
    }

    await fs.move(tempFile, file, {
      overwrite: true,
    });
  } catch (error) {
    if (await fs.pathExists(tempFile)) {
      await fs.remove(tempFile).catch(() => {});
    }

    throw error;
  }
}

async function writeCollection(collection, items) {
  validateCollection(collection);

  if (!Array.isArray(items)) {
    throw createHttpError(
      "Expected request body to be an array",
      400
    );
  }

  const previous =
    writeQueues.get(collection) || Promise.resolve();

  const next = previous.then(async () => {
    await ensureStorageDirectories();

    const file = await ensureCollectionFile(collection);

    await createBackupsBeforeWrite(
      collection,
      file
    );

    await atomicWriteJson(file, items);

    await removeOldBackups(collection);

    console.log(
      `[DATA SAVED] ${collection}.json — ${items.length} record(s)`
    );
  });

  writeQueues.set(
    collection,
    next.catch((error) => {
      console.error(
        `[WRITE ERROR] ${collection}:`,
        error
      );
    })
  );

  return next;
}

app.get("/api/health", async (req, res) => {
  try {
    await ensureStorageDirectories();

    res.json({
      ready: true,
      app: "Smart Office",
      host: HOST,
      port: PORT,
      dataDirectory: DATA_DIR,
      backupDirectory: BACKUP_DIR,
      collections: COLLECTIONS.size,
      processId: process.pid,
    });
  } catch (error) {
    res.status(500).json({
      ready: false,
      app: "Smart Office",
      error: error.message,
      dataDirectory: DATA_DIR,
    });
  }
});

app.get("/api/collections", (req, res) => {
  res.json([...COLLECTIONS].sort());
});

app.get(
  "/api/advanced-report/status",
  (req, res) => {
    res.json({
      ready: true,
      mode: "local",
      model: null,
    });
  }
);

app.post(
  "/api/advanced-report/chat",
  async (req, res) => {
    const question = String(
      req.body?.question || ""
    ).trim();

    res.json({
      answer: question
        ? "Advanced report is running in local mode. Use Reports, Financials, and Agent for detailed system summaries."
        : "Please enter a question.",
    });
  }
);

app.param(
  "collection",
  (req, res, next, collection) => {
    if (!COLLECTIONS.has(collection)) {
      return res.status(404).json({
        error: "Unknown collection",
        collection,
      });
    }

    next();
  }
);

app.get(
  "/api/:collection",
  async (req, res, next) => {
    try {
      const items = await readCollection(
        req.params.collection
      );

      res.json(items);
    } catch (error) {
      next(error);
    }
  }
);

app.put(
  "/api/:collection",
  async (req, res, next) => {
    try {
      if (!Array.isArray(req.body)) {
        throw createHttpError(
          "PUT request body must be an array",
          400
        );
      }

      await writeCollection(
        req.params.collection,
        req.body
      );

      res.json(req.body);
    } catch (error) {
      next(error);
    }
  }
);

app.post(
  "/api/:collection",
  async (req, res, next) => {
    try {
      if (
        !req.body ||
        typeof req.body !== "object" ||
        Array.isArray(req.body)
      ) {
        throw createHttpError(
          "POST request body must be an object",
          400
        );
      }

      const items = await readCollection(
        req.params.collection
      );

      const now = new Date().toISOString();

      const item = {
        ...req.body,
        id:
          req.body.id ||
          `${req.params.collection}-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 8)}`,
        createdAt: req.body.createdAt || now,
        updatedAt: now,
      };

      await writeCollection(
        req.params.collection,
        [...items, item]
      );

      res.status(201).json(item);
    } catch (error) {
      next(error);
    }
  }
);

app.delete(
  "/api/:collection/:id",
  async (req, res, next) => {
    try {
      const id = String(req.params.id);

      const items = await readCollection(
        req.params.collection
      );

      const nextItems = items.filter(
        (item) => String(item?.id) !== id
      );

      if (nextItems.length === items.length) {
        return res.status(404).json({
          success: false,
          error: "Record not found",
          id,
        });
      }

      await writeCollection(
        req.params.collection,
        nextItems
      );

      res.json({
        success: true,
        deletedId: id,
      });
    } catch (error) {
      next(error);
    }
  }
);

app.use((error, req, res, next) => {
  void next;

  console.error(
    "Smart Office server error:",
    error
  );

  res.status(error.status || 500).json({
    error: "Unable to access data file",
    message: error.message,
    collection:
      error.collection ||
      req.params?.collection ||
      null,
    backup:
      error.brokenBackup || null,
  });
});

function normalizeDataDir(value) {
  return path
    .normalize(String(value || ""))
    .replace(/\\/g, "/")
    .replace(/\/$/, "")
    .toLowerCase();
}

function checkExistingServer(port, host) {
  return new Promise((resolve) => {
    const request = http.get(
      {
        host,
        port,
        path: "/api/health",
        timeout: 1200,
      },
      (response) => {
        let body = "";

        response.setEncoding("utf8");

        response.on("data", (chunk) => {
          body += chunk;
        });

        response.on("end", () => {
          try {
            const health = JSON.parse(body);

            const sameDirectory =
              normalizeDataDir(
                health?.dataDirectory
              ) === normalizeDataDir(DATA_DIR);

            resolve(
              Boolean(health?.ready) &&
                sameDirectory
            );
          } catch {
            resolve(false);
          }
        });
      }
    );

    request.on("timeout", () => {
      request.destroy();
      resolve(false);
    });

    request.on("error", () => {
      resolve(false);
    });
  });
}

function keepProcessAliveForExistingServer() {
  const interval = setInterval(
    () => {},
    2147483647
  );

  const stop = () => {
    clearInterval(interval);
    process.exit(0);
  };

  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);

  return interval;
}

function printServerInformation({
  host,
  port,
  existing = false,
}) {
  console.log("");
  console.log("==============================================");
  console.log(
    existing
      ? "Smart Office server is already running"
      : "Smart Office server started successfully"
  );
  console.log("----------------------------------------------");
  console.log(
    `API URL:          http://${host}:${port}`
  );
  console.log(
    `Health check:     http://${host}:${port}/api/health`
  );
  console.log(
    `Data directory:   ${DATA_DIR}`
  );
  console.log(
    `Backup directory: ${BACKUP_DIR}`
  );
  console.log(
    `Process ID:       ${process.pid}`
  );
  console.log("==============================================");
  console.log("");
}

function startServer(options = {}) {
  const port = options.port ?? PORT;
  const host = options.host ?? HOST;

  return new Promise((resolve, reject) => {
    const server = app.listen(
      port,
      host,
      async () => {
        try {
          await ensureStorageDirectories();

          printServerInformation({
            host,
            port,
            existing: false,
          });

          resolve({
            server,
            port,
            host,
            dataDir: DATA_DIR,
            backupDir: BACKUP_DIR,
          });
        } catch (error) {
          server.close();
          reject(error);
        }
      }
    );

    server.on("error", async (error) => {
      if (error.code === "EADDRINUSE") {
        const existingServerIsCompatible =
          await checkExistingServer(port, host);

        if (existingServerIsCompatible) {
          keepProcessAliveForExistingServer();

          printServerInformation({
            host,
            port,
            existing: true,
          });

          resolve({
            server: null,
            port,
            host,
            dataDir: DATA_DIR,
            backupDir: BACKUP_DIR,
            existing: true,
          });

          return;
        }

        reject(
          createHttpError(
            `Port ${port} is already being used by another server or by a Smart Office server using a different data directory.`,
            500
          )
        );

        return;
      }

      reject(error);
    });
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error(
      "Unable to start Smart Office server:",
      error
    );

    process.exit(1);
  });
}

module.exports = {
  app,
  startServer,
  DATA_DIR,
  BACKUP_DIR,
  COLLECTIONS,
};