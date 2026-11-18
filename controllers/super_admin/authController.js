const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { jwtInfo } = require("../../helpers/constants");

const masterDbConfig = {
  host: "localhost",
  user: "root",
  password: process.env.DB_PASSWORD,
  database: "master_admin",
  dateStrings: true,
};

const SUPER_ADMIN_SECRET = jwtInfo?.secret_key || "tarsha_super_admin_secret_2026";

module.exports = {
  masterDbConfig,

  // 1. Super Admin Login
  login: async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: true,
        message: "Email and password are required",
      });
    }

    let connection;
    try {
      connection = await mysql.createConnection(masterDbConfig);

      const [rows] = await connection.query(
        "SELECT * FROM super_admins WHERE email = ?",
        [email.trim()]
      );

      if (rows.length === 0) {
        return res.status(401).json({
          error: true,
          message: "Invalid email or password",
        });
      }

      const admin = rows[0];
      const isMatch = bcrypt.compareSync(password, admin.password);

      if (!isMatch) {
        return res.status(401).json({
          error: true,
          message: "Invalid email or password",
        });
      }

      // Generate JWT
      const token = jwt.sign(
        {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          role: "super_admin",
        },
        SUPER_ADMIN_SECRET,
        { expiresIn: "7d" }
      );

      return res.status(200).json({
        error: false,
        message: "Super Admin logged in successfully!",
        data: {
          token,
          user: {
            id: admin.id,
            name: admin.name,
            email: admin.email,
            role: "super_admin",
          },
        },
      });
    } catch (err) {
      console.error("Super Admin login error:", err);
      return res.status(500).json({
        error: true,
        message: "Server error: " + err.message,
      });
    } finally {
      if (connection) await connection.end();
    }
  },

  // 2. Middleware to protect super admin endpoints
  verifySuperAdmin: (req, res, next) => {
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
      return res.status(401).json({
        error: true,
        message: "Authorization token required",
      });
    }

    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : authHeader;

    try {
      const decoded = jwt.verify(token, SUPER_ADMIN_SECRET);
      if (decoded.role !== "super_admin") {
        return res.status(403).json({
          error: true,
          message: "Forbidden: Super Admin access required",
        });
      }
      req.superAdmin = decoded;
      next();
    } catch (err) {
      return res.status(401).json({
        error: true,
        message: "Invalid or expired token",
      });
    }
  },
};
