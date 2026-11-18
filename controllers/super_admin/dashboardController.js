const mysql = require("mysql2/promise");
const { masterDbConfig } = require("./authController");

module.exports = {
  getStats: async (req, res) => {
    let connection;
    try {
      connection = await mysql.createConnection(masterDbConfig);

      const [companies] = await connection.query(`
        SELECT id, code, name, db_name, is_active, expiry_date, created_at, features
        FROM companies 
        ORDER BY id DESC
      `);

      const now = new Date();
      const in7Days = new Date();
      in7Days.setDate(in7Days.getDate() + 7);

      let totalCompanies = companies.length;
      let activeCompanies = 0;
      let expiredCompanies = 0;
      let expiringSoon = 0;
      let suspendedCompanies = 0;

      companies.forEach((c) => {
        if (!c.is_active) {
          suspendedCompanies++;
        } else if (c.expiry_date && new Date(c.expiry_date) < now) {
          expiredCompanies++;
        } else {
          activeCompanies++;
          if (c.expiry_date && new Date(c.expiry_date) <= in7Days) {
            expiringSoon++;
          }
        }
      });

      return res.status(200).json({
        error: false,
        message: "Dashboard stats fetched successfully",
        data: {
          summary: {
            totalCompanies,
            activeCompanies,
            expiredCompanies,
            expiringSoon,
            suspendedCompanies,
          },
          recentCompanies: companies.slice(0, 5),
        },
      });
    } catch (err) {
      console.error("getStats error:", err);
      return res.status(500).json({
        error: true,
        message: err.message,
      });
    } finally {
      if (connection) await connection.end();
    }
  },
};
