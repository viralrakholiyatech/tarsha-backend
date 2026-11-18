const fs = require("fs");
const path = require("path");
const { randomBytes } = require("crypto");

function readLocal(name) {
  const file = path.join(__dirname, name);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
}

const local = readLocal("config.json");
const sessionSecret = process.env.SESSION_SECRET || process.env.JWT_SECRET || local.session_key || randomBytes(32).toString("hex");
if (!process.env.SESSION_SECRET && !process.env.JWT_SECRET && !local.session_key) {
  console.warn("Set SESSION_SECRET to keep sessions valid across restarts.");
}

module.exports = {
  meta: {
    NAME: "API", SERVER_LOG: true, perPage: 10, ...local,
    session_key: sessionSecret,
    AUTH_KEY: process.env.AUTH_KEY || local.AUTH_KEY,
    thekey: process.env.ENCRYPTION_KEY || local.thekey,
  },
  databaseConfig: readLocal("db.json"),
  dbConnection: {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD,
  },
};
