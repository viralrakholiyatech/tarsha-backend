require("dotenv").config();
const mysql = require("mysql2/promise");

async function check() {
  const required = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME", "MASTER_DB_NAME"];
  const missing = required.filter((key) => !process.env[key]?.trim());
  if (missing.length) throw new Error(`Missing settings: ${missing.join(", ")}`);
  if (["0.0.0.0", "::"].includes(process.env.DB_HOST.trim())) {
    throw new Error("DB_HOST must be the MySQL server hostname, not a listening address.");
  }
  const port = Number(process.env.DB_PORT || 3306);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid DB_PORT");
  const hints = {
    ENOTFOUND: "Check DB_HOST with your hosting provider.",
    ECONNREFUSED: "Check the MySQL host, port and whether remote connections are enabled.",
    ETIMEDOUT: "Ask your host to allow Render outbound IP ranges through the MySQL firewall.",
    ER_ACCESS_DENIED_ERROR: "Check DB_USER, DB_PASSWORD and the allowed connection hosts.",
    ER_DBACCESS_DENIED_ERROR: "Assign this MySQL user to both databases in cPanel.",
    ER_BAD_DB_ERROR: "Check full database names, including cPanel prefixes.",
    ER_NO_SUCH_TABLE: "Import the master database schema, including super_admins.",
  };
  for (const key of ["DB_NAME", "MASTER_DB_NAME"]) {
    let connection;
    try {
      connection = await mysql.createConnection({
        host: process.env.DB_HOST.trim(), port,
        user: process.env.DB_USER.trim(), password: process.env.DB_PASSWORD,
        database: process.env[key].trim(), connectTimeout: 10000,
      });
      await connection.query("SELECT 1");
      if (key === "MASTER_DB_NAME") await connection.query("SELECT 1 FROM super_admins LIMIT 1");
      console.log(`${key}: connection and checks passed`);
    } catch (error) {
      process.exitCode = 1;
      console.error(`${key}: ${error.code || "CONNECTION_FAILED"}. ${hints[error.code] || "Check the database server configuration, including TLS requirements."}`);
    } finally {
      if (connection) await connection.end();
    }
  }
}

check().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
