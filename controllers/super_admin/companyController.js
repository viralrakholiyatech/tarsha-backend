const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const { masterDbConfig } = require("./authController");

const dbServerConfig = {
  host: "localhost",
  user: "root",
  password: process.env.DB_PASSWORD,
  dateStrings: true,
};

module.exports = {
  // 1. Get All Companies
  listCompanies: async (req, res) => {
    let connection;
    try {
      connection = await mysql.createConnection(masterDbConfig);
      const [rows] = await connection.query(`
        SELECT 
          id, code, name, logo, db_name, db_user, db_host, 
          features, subscription_months, start_date, expiry_date, 
          is_active, created_at, updated_at
        FROM companies 
        ORDER BY id DESC
      `);

      const formatted = rows.map((c) => {
        let parsedFeatures = [];
        try {
          parsedFeatures = typeof c.features === "string" ? JSON.parse(c.features) : c.features || [];
        } catch (e) {
          parsedFeatures = [];
        }

        const isExpired = c.expiry_date ? new Date(c.expiry_date) < new Date() : false;

        return {
          ...c,
          features: parsedFeatures,
          status: !c.is_active ? "inactive" : isExpired ? "expired" : "active",
        };
      });

      return res.status(200).json({
        error: false,
        message: "Companies retrieved successfully",
        data: formatted,
      });
    } catch (err) {
      console.error("listCompanies error:", err);
      return res.status(500).json({
        error: true,
        message: err.message,
      });
    } finally {
      if (connection) await connection.end();
    }
  },

  // 2. Create Company + Automatic DB + Template Tables + Admin Account
  createCompany: async (req, res) => {
    const {
      name,
      code,
      logo,
      admin_name,
      admin_email,
      admin_password,
      admin_phone,
      features,
      subscription_months = 1,
      expiry_date,
    } = req.body;

    if (!name || !code || !admin_email || !admin_password) {
      return res.status(400).json({
        error: true,
        message: "Company name, code, admin email, and admin password are required",
      });
    }

    const cleanCode = code.toLowerCase().trim().replace(/[^a-z0-9_]/g, "_");
    const dbName = `tarsha_${cleanCode}`;

    let masterConn;
    let newDbConn;

    try {
      masterConn = await mysql.createConnection(masterDbConfig);

      // Check if code or db_name already registered in master
      const [existing] = await masterConn.query(
        "SELECT id FROM companies WHERE code = ? OR db_name = ?",
        [cleanCode, dbName]
      );

      if (existing.length > 0) {
        return res.status(400).json({
          error: true,
          message: `Company code '${cleanCode}' or database '${dbName}' already exists`,
        });
      }

      // Calculate subscription dates
      const startDate = new Date();
      let calculatedExpiry;
      if (expiry_date) {
        calculatedExpiry = new Date(expiry_date);
      } else {
        calculatedExpiry = new Date();
        calculatedExpiry.setMonth(calculatedExpiry.getMonth() + parseInt(subscription_months || 1));
      }

      const featuresJson = Array.isArray(features)
        ? JSON.stringify(features)
        : typeof features === "string"
        ? features
        : JSON.stringify(["Meeting", "Team", "Work"]);

      // ── Step A: Create MySQL Database ──
      const serverConn = await mysql.createConnection(dbServerConfig);
      await serverConn.query(
        `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      );
      await serverConn.end();
      console.log(`[SUPER ADMIN] Created database: ${dbName}`);

      // ── Step B: Import Schema Template (All 195 empty tables) ──
      const templatePath = path.join(__dirname, "../../config/tarsha_template.sql");
      if (!fs.existsSync(templatePath)) {
        throw new Error("Schema template file 'tarsha_template.sql' not found in backend/config");
      }

      const templateSql = fs.readFileSync(templatePath, "utf8");

      newDbConn = await mysql.createConnection({
        ...dbServerConfig,
        database: dbName,
        multipleStatements: true,
      });

      await newDbConn.query(templateSql);
      console.log(`[SUPER ADMIN] All tables created in ${dbName}`);

      // ── Step C: Insert Company Admin into new database users table ──
      const salt = bcrypt.genSaltSync(10);
      const hashedPassword = bcrypt.hashSync(admin_password, salt);

      const [first_name = "Admin", ...lastParts] = (admin_name || "Company Admin").split(" ");
      const last_name = lastParts.join(" ") || "";

      // Check users table structure in new database
      const [userCols] = await newDbConn.query("DESCRIBE users");
      const colNames = userCols.map((c) => c.Field);

      const userFields = [];
      const userPlaceholders = [];
      const userValues = [];

      const addField = (col, val) => {
        if (colNames.includes(col)) {
          userFields.push(col);
          userPlaceholders.push("?");
          userValues.push(val);
        }
      };

      addField("first_name", first_name);
      addField("last_name", last_name);
      addField("username", admin_email);
      addField("email", admin_email);
      addField("password", hashedPassword);
      addField("phone", admin_phone || "");
      addField("active", 1);
      addField("isdeleted", 0);
      if (colNames.includes("role")) {
        addField("role", "admin");
      }

      // Seed roles into tenant mst_groups table so users_groups foreign key passes
      try {
        const [groupsTable] = await newDbConn.query("SHOW TABLES LIKE 'mst_groups'");
        if (groupsTable.length > 0) {
          await newDbConn.query(`
            INSERT IGNORE INTO mst_groups (id, name, description)
            VALUES 
              (1, 'admin', 'Administrator'),
              (2, 'Employees', 'Employees'),
              (3, 'Registered', 'Registered'),
              (4, 'Client', 'Client'),
              (5, 'subadmin', 'Sub-Administrator'),
              (6, 'cordinator', 'Cordinator'),
              (7, 'Hod', 'HoD')
          `);
        }
      } catch (grpErr) {
        console.log(`[SUPER ADMIN] Notice on mst_groups seed: ${grpErr.message}`);
      }

      const insertUserSql = `INSERT INTO users (${userFields.join(", ")}) VALUES (${userPlaceholders.join(", ")})`;
      const [userInsertResult] = await newDbConn.query(insertUserSql, userValues);
      const newUserId = userInsertResult.insertId;
      console.log(`[SUPER ADMIN] Admin user inserted into ${dbName} (id: ${newUserId})`);

      // Assign to users_groups (Admin group: mst_group_id = 1) if users_groups table exists
      try {
        const [tables] = await newDbConn.query("SHOW TABLES LIKE 'users_groups'");
        if (tables.length > 0 && newUserId) {
          await newDbConn.query(
            "INSERT INTO users_groups (mst_user_id, mst_group_id) VALUES (?, 1)",
            [newUserId]
          );
          console.log(`[SUPER ADMIN] Admin role mapped in ${dbName}.users_groups (user: ${newUserId}, group: 1)`);
        }
      } catch (ugErr) {
        console.log(`[SUPER ADMIN] Notice on users_groups: ${ugErr.message}`);
      }

      // Also register admin user in primary tarsha database so the main login endpoint recognizes them
      try {
        const mainDbConn = await mysql.createConnection({ ...dbServerConfig, database: "tarsha" });
        const [mainUserResult] = await mainDbConn.query(
          `INSERT INTO users (first_name, last_name, username, email, password, phone, active, isdeleted, created_at)
           VALUES (?, ?, ?, ?, ?, ?, 1, 0, NOW())
           ON DUPLICATE KEY UPDATE password = VALUES(password), active = 1, isdeleted = 0`,
          [first_name, last_name, admin_email, admin_email, hashedPassword, admin_phone || ""]
        );
        const mainUserId = mainUserResult.insertId;
        if (mainUserId) {
          await mainDbConn.query("INSERT IGNORE INTO users_groups (mst_user_id, mst_group_id) VALUES (?, 1)", [mainUserId]);
        }
        await mainDbConn.end();
        console.log(`[SUPER ADMIN] Admin user synced to primary tarsha.users`);
      } catch (mainErr) {
        console.log(`[SUPER ADMIN] Notice on main db sync: ${mainErr.message}`);
      }

      // ── Step C2: Insert company record into new tenant db mst_company ──
      try {
        await newDbConn.query(
          "INSERT INTO mst_company (comp_name, logo, start_date, isdeleted, created_by, created_at) VALUES (?, ?, ?, 0, 1, NOW())",
          [name, logo || null, startDate]
        );
        console.log(`[SUPER ADMIN] Company info & logo saved to ${dbName}.mst_company`);
      } catch (mstErr) {
        console.log(`[SUPER ADMIN] Notice on mst_company insert: ${mstErr.message}`);
      }

      // ── Step D: Register company in master_admin.companies ──
      const [insertResult] = await masterConn.query(
        `INSERT INTO companies 
          (code, name, logo, db_name, db_user, db_password, db_host, features, subscription_months, start_date, expiry_date, is_active)
         VALUES (?, ?, ?, ?, 'root', '12345678', 'localhost', ?, ?, ?, ?, 1)`,
        [
          cleanCode,
          name,
          logo || null,
          dbName,
          featuresJson,
          parseInt(subscription_months || 1),
          startDate,
          calculatedExpiry,
        ]
      );

      return res.status(201).json({
        error: false,
        message: `Company '${name}' and database '${dbName}' created successfully!`,
        data: {
          company_id: insertResult.insertId,
          name,
          code: cleanCode,
          logo: logo || null,
          db_name: dbName,
          admin_email,
          expiry_date: calculatedExpiry,
        },
      });
    } catch (err) {
      console.error("createCompany error:", err);
      return res.status(500).json({
        error: true,
        message: "Failed to create company: " + err.message,
      });
    } finally {
      if (newDbConn) await newDbConn.end();
      if (masterConn) await masterConn.end();
    }
  },

  // 3. Toggle Company Status (Active / Inactive)
  toggleStatus: async (req, res) => {
    const { id } = req.params;
    let connection;
    try {
      connection = await mysql.createConnection(masterDbConfig);
      const [rows] = await connection.query("SELECT is_active FROM companies WHERE id = ?", [id]);
      if (rows.length === 0) {
        return res.status(404).json({ error: true, message: "Company not found" });
      }

      const newStatus = rows[0].is_active ? 0 : 1;
      await connection.query("UPDATE companies SET is_active = ? WHERE id = ?", [newStatus, id]);

      return res.status(200).json({
        error: false,
        message: `Company ${newStatus ? "Activated" : "Suspended"} successfully`,
        data: { is_active: newStatus },
      });
    } catch (err) {
      return res.status(500).json({ error: true, message: err.message });
    } finally {
      if (connection) await connection.end();
    }
  },

  // 4. Update Subscription & Features
  updateSubscription: async (req, res) => {
    const { id } = req.params;
    const { expiry_date, subscription_months, features } = req.body;

    let connection;
    try {
      connection = await mysql.createConnection(masterDbConfig);

      let updateFields = [];
      let values = [];

      if (expiry_date) {
        updateFields.push("expiry_date = ?");
        values.push(new Date(expiry_date));
      }
      if (subscription_months) {
        updateFields.push("subscription_months = ?");
        values.push(parseInt(subscription_months));
      }
      if (features) {
        updateFields.push("features = ?");
        values.push(Array.isArray(features) ? JSON.stringify(features) : features);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ error: true, message: "No fields to update" });
      }

      values.push(id);
      await connection.query(
        `UPDATE companies SET ${updateFields.join(", ")} WHERE id = ?`,
        values
      );

      return res.status(200).json({
        error: false,
        message: "Subscription details updated successfully",
      });
    } catch (err) {
      return res.status(500).json({ error: true, message: err.message });
    } finally {
      if (connection) await connection.end();
    }
  },
};
