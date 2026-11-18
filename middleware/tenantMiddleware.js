const jwt = require("jsonwebtoken");
const { tenantStorage, getTenantPool } = require("../services/tenantDbManager");
const mysql = require("mysql2/promise");
const { masterDbConfig } = require("../controllers/super_admin/authController");

// Cache company codes -> db_name
let companyCache = {};
let lastCacheFetch = 0;

const fetchCompanies = async () => {
  const now = Date.now();
  if (now - lastCacheFetch < 30000 && Object.keys(companyCache).length > 0) {
    return companyCache;
  }
  try {
    const conn = await mysql.createConnection(masterDbConfig);
    const [rows] = await conn.query("SELECT code, db_name, is_active FROM companies WHERE is_active = 1");
    await conn.end();
    const map = {};
    for (const r of rows) {
      if (r.code && r.db_name) {
        map[r.code.toLowerCase()] = r.db_name;
      }
    }
    companyCache = map;
    lastCacheFetch = now;
    return companyCache;
  } catch (err) {
    console.error("[TENANT MIDDLEWARE] Error loading company cache:", err.message);
    return companyCache;
  }
};

const tenantMiddleware = async (req, res, next) => {
  let dbName = null;
  let companyCode = null;

  // 1. Check direct header x-tenant-db
  if (req.headers["x-tenant-db"]) {
    const headerDb = String(req.headers["x-tenant-db"]).trim();
    if (/^[a-zA-Z0-9_]+$/.test(headerDb)) {
      dbName = headerDb;
    }
  }

  // 2. Check x-company-code header or query ?company=
  const headerCode = req.headers["x-company-code"] || req.query.company || req.body?.company_code;
  if (!dbName && headerCode) {
    companyCode = String(headerCode).trim().toLowerCase();
    const companies = await fetchCompanies();
    if (companies[companyCode]) {
      dbName = companies[companyCode];
    }
  }

  // 3. Check Authorization Bearer Token
  if (!dbName && req.headers.authorization) {
    try {
      const parts = req.headers.authorization.split(" ");
      const token = parts.length === 2 ? parts[1] : parts[0];
      const decoded = jwt.decode(token);
      if (decoded && decoded.db_name) {
        dbName = decoded.db_name;
        companyCode = decoded.company_code || null;
      }
    } catch (e) {
      // Ignore token parse error
    }
  }

  // Default fallback
  if (!dbName) {
    dbName = "tarsha";
  }

  // Pre-warm the pool for this tenant
  getTenantPool(dbName);

  // Attach to req for direct inspection
  req.tenantDb = dbName;
  req.companyCode = companyCode;

  // Execute request in AsyncLocalStorage context
  tenantStorage.run({ dbName, companyCode }, () => {
    next();
  });
};

module.exports = {
  tenantMiddleware,
  fetchCompanies,
};
