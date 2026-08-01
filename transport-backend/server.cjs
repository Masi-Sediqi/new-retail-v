const express = require("express");
const cors = require("cors");
const fs = require("fs-extra");
const http = require("http");
const path = require("path");

const app = express();

const PORT = Number(process.env.ISP_API_PORT || 5000);
const HOST = process.env.ISP_API_HOST || "127.0.0.1";
const DATA_DIR = process.env.SMART_OFFICE_DATA_DIR || process.env.ISP_DATA_DIR || "C:/Smart Office Pro";

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
]);

const writeQueues = new Map();

app.use(cors());
app.use(express.json({ limit: "25mb" }));

function dataFile(collection) {
  return path.join(DATA_DIR, `${collection}.json`);
}

async function ensureCollectionFile(collection) {
  await fs.ensureDir(DATA_DIR);
  const file = dataFile(collection);
  if (!(await fs.pathExists(file))) {
    await fs.writeJson(file, [], { spaces: 2 });
  }
  return file;
}

async function readCollection(collection) {
  if (!COLLECTIONS.has(collection)) {
    throw Object.assign(new Error(`Unknown collection: ${collection}`), { status: 404 });
  }

  const file = await ensureCollectionFile(collection);
  try {
    const data = await fs.readJson(file);
    if (Array.isArray(data)) return data;

    await fs.copy(file, `${file}.broken-${Date.now()}`, { overwrite: true });
    await writeCollection(collection, []);
    return [];
  } catch {
    if (await fs.pathExists(file)) {
      await fs.copy(file, `${file}.broken-${Date.now()}`, { overwrite: true });
    }
    await writeCollection(collection, []);
    return [];
  }
}

async function writeCollection(collection, items) {
  if (!COLLECTIONS.has(collection)) {
    throw Object.assign(new Error(`Unknown collection: ${collection}`), { status: 404 });
  }
  if (!Array.isArray(items)) {
    throw Object.assign(new Error("Expected an array"), { status: 400 });
  }

  const previous = writeQueues.get(collection) || Promise.resolve();
  const next = previous.then(async () => {
    await fs.ensureDir(DATA_DIR);
    const file = dataFile(collection);
    const tempFile = `${file}.${process.pid}.tmp`;
    const backupFile = `${file}.bak`;

    if (await fs.pathExists(file)) {
      await fs.copy(file, backupFile, { overwrite: true });
    }

    await fs.writeJson(tempFile, items, { spaces: 2 });
    await fs.move(tempFile, file, { overwrite: true });
  });

  writeQueues.set(collection, next.catch(() => {}));
  return next;
}

app.get("/api/health", (req, res) => {
  res.json({
    ready: true,
    app: "Smart Office",
    dataDirectory: DATA_DIR,
  });
});

app.get("/api/collections", (req, res) => {
  res.json([...COLLECTIONS].sort());
});

app.get("/api/advanced-report/status", (req, res) => {
  res.json({ ready: true, mode: "local", model: null });
});

app.post("/api/advanced-report/chat", async (req, res) => {
  const question = String(req.body?.question || "").trim();
  res.json({
    answer: question
      ? "Advanced report is running in local mode. Use Reports, Financials, and Agent for detailed system summaries."
      : "Please enter a question.",
  });
});

app.param("collection", (req, res, next, collection) => {
  if (!COLLECTIONS.has(collection)) {
    return res.status(404).json({ error: "Unknown collection", collection });
  }
  next();
});

app.get("/api/:collection", async (req, res, next) => {
  try {
    res.json(await readCollection(req.params.collection));
  } catch (error) {
    next(error);
  }
});

app.put("/api/:collection", async (req, res, next) => {
  try {
    await writeCollection(req.params.collection, req.body);
    res.json(req.body);
  } catch (error) {
    next(error);
  }
});

app.post("/api/:collection", async (req, res, next) => {
  try {
    const items = await readCollection(req.params.collection);
    const item = {
      id: req.body?.id || Date.now(),
      ...req.body,
      createdAt: req.body?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await writeCollection(req.params.collection, [...items, item]);
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/:collection/:id", async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const items = await readCollection(req.params.collection);
    await writeCollection(
      req.params.collection,
      items.filter((item) => String(item.id) !== id)
    );
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.use((error, req, res, next) => {
  void next;
  console.error("Smart Office server error:", error);
  res.status(error.status || 500).json({
    error: "Unable to access data file",
    message: error.message,
  });
});

function normalizeDataDir(value) {
  return path.normalize(String(value || "")).replace(/\\/g, "/").replace(/\/$/, "").toLowerCase();
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
            resolve(Boolean(health?.ready) && normalizeDataDir(health?.dataDirectory) === normalizeDataDir(DATA_DIR));
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
    request.on("error", () => resolve(false));
  });
}

function keepProcessAliveForExistingServer() {
  const interval = setInterval(() => {}, 2147483647);
  const stop = () => {
    clearInterval(interval);
    process.exit(0);
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  return interval;
}

function startServer(options = {}) {
  const port = options.port ?? PORT;
  const host = options.host ?? HOST;
  return new Promise((resolve, reject) => {
    const server = app.listen(port, host, () => {
      console.log(`Smart Office server running on http://${host}:${port}; data directory: ${DATA_DIR}`);
      resolve({ server, port, host, dataDir: DATA_DIR });
    });
    server.on("error", async (error) => {
      if (error.code === "EADDRINUSE" && (await checkExistingServer(port, host))) {
        keepProcessAliveForExistingServer();
        console.log(`Smart Office server already running on http://${host}:${port}; data directory: ${DATA_DIR}`);
        resolve({ server: null, port, host, dataDir: DATA_DIR, existing: true });
        return;
      }

      reject(error);
    });
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error("Unable to start Smart Office server:", error);
    process.exit(1);
  });
}

module.exports = { app, startServer };
