const mysql = require("mysql2");
const { AsyncLocalStorage } = require("async_hooks");

const tenantStorage = new AsyncLocalStorage();
const { defaultDbName } = require("../config/runtime");

const baseDbConfig = {
  ...require('../config/runtime').dbConnection,
  multipleStatements: true,
  dateStrings: true,
  timezone: "+05:30",
  typeCast: function (field, next) {
    if (field.type === "DATE" || field.type === "NEWDATE") {
      const val = field.string();
      return val === null ? null : val;
    }
    if (field.type === "DATETIME" || field.type === "TIMESTAMP") {
      const val = field.string();
      return val ? val.replace(" ", "T") : null;
    }
    return next();
  },
};

// Cached pools per tenant database
const pools = {};

const getTenantPool = (dbName = defaultDbName) => {
  const targetDb = (dbName || defaultDbName).trim();
  if (pools[targetDb]) {
    return pools[targetDb];
  }

  const pool = mysql.createPool({
    ...baseDbConfig,
    database: targetDb,
    waitForConnections: true,
    connectionLimit: 15,
    queueLimit: 0,
  });

  pools[targetDb] = pool;
  console.log(`[TENANT DB] Initialized connection pool for database: ${targetDb}`);
  return pool;
};

// Initialize default pool
const defaultPool = getTenantPool(defaultDbName);

// Dynamic Proxy for global db
const dbProxy = new Proxy(defaultPool, {
  get(target, prop) {
    const store = tenantStorage.getStore();
    const activeDb = store && store.dbName ? store.dbName : defaultDbName;
    const activePool = getTenantPool(activeDb);

    const val = activePool[prop];
    if (typeof val === "function") {
      return function (...args) {
        return val.apply(activePool, args);
      };
    }
    return val;
  },
});

module.exports = {
  tenantStorage,
  getTenantPool,
  dbProxy,
  defaultPool,
};
