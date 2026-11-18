var mdl_common = require("./../../models/mdl_common");
var asyncLoop = require("node-async-loop");

module.exports = {
  getTotalEmployee: (req, res) => {
    res.status(200).json({
      message: "Services are no longer available",
      error: true,
      data: {},
    });
  },
  getTotalFiles: (req, res) => {
    res.status(200).json({
      message: "Services are no longer available",
      error: true,
      data: {},
    });
  },
  getTotalCustomer: (req, res) => {
    res.status(200).json({
      message: "Services are no longer available",
      error: true,
      data: {},
    });
  },
  

  getTotalSoucebyClient: (req, res) => {
    try {
      var sql = `SELECT 
    COUNT(CASE WHEN u.source = 'Events' THEN 1 END) AS total_events,
    COUNT(CASE WHEN u.source = 'Website' THEN 1 END) AS total_website,
    COUNT(CASE WHEN u.source = 'References' THEN 1 END) AS total_references
FROM users AS u
LEFT JOIN users_groups AS mu ON mu.mst_user_id = u.id
LEFT JOIN mst_groups AS mg ON mg.id = mu.mst_group_id
WHERE u.isdeleted = 0 AND mg.name = 'Client';
`;

      db.query(sql, (err1, results) => {
        if (err1) {
          console.log("Error in SQL query 1: ", err1);
          res
            .status(200)
            .json({ message: "Something went wrong!", error: true, data: {} });
          return;
        }

        res.status(200).json({
          error: false,
          message: "Fetched!",
          data: results,
        });
      });
    } catch (err) {
      console.log("Server error: ", err);
      res.status(200).json({ message: "Server error", data: {}, error: true });
    }
  },



  getDashboardInfo: (req, res) => {
    const sql = `
      SELECT
        (SELECT COUNT(*) FROM users AS u 
         JOIN users_groups AS mu ON mu.mst_user_id = u.id 
         JOIN mst_groups AS mg ON mg.id = mu.mst_group_id 
         WHERE u.isdeleted = 0 AND mg.name = 'Employees') AS total_employees,

        (SELECT COUNT(*) FROM users AS u 
         JOIN users_groups AS mu ON mu.mst_user_id = u.id 
         JOIN mst_groups AS mg ON mg.id = mu.mst_group_id 
         WHERE u.isdeleted = 0 AND mg.name = 'Client') AS total_clients,

        (SELECT COUNT(*) FROM mst_file WHERE isdeleted = 0) AS total_files,

        (SELECT COUNT(*) FROM mst_file AS mf 
         JOIN status_file AS sf ON sf.id = mf.status 
         WHERE sf.status_file_name = 'approved' AND mf.isdeleted = 0) AS total_completed_file
    `;

    db.query(sql, (err, results) => {
      if (err) {
        console.error("getDashboardInfo error:", err);
        return res
          .status(500)
          .json({ message: "Something went wrong!", error: true, data: {} });
      }

      const row = (results && results[0]) || {};
      res.status(200).json({
        error: false,
        message: "Fetched!",
        data: {
          total_employees: row.total_employees || 0,
          total_clients: row.total_clients || 0,
          total_files: row.total_files || 0,
          total_completed_file: row.total_completed_file || 0,
        },
      });
    });
  },

getDashboardInfoForTeam: (req, res) => {
  const user_id = req.user ? req.user.id : null;

  if (!user_id) {
    return res.status(200).json({ message: "Unauthorized", error: true, data: {} });
  }

  try {
    const attendance = `
      SELECT COUNT(*) AS present_count
      FROM attendance
      WHERE is_deleted = 0
        AND user_id = ?
        AND att_type = 1
        AND MONTH(date) = MONTH(CURDATE())
        AND YEAR(date)  = YEAR(CURDATE())
    `;

    const task = `
      SELECT
        COUNT(*)                                   AS total_task,
        COUNT(CASE WHEN status = 1 THEN 1 END)     AS total_completed_task
      FROM todos
      WHERE is_deleted = 0
        AND DATE(due_date) = CURDATE()
        AND (
          assign_to = ?
          OR FIND_IN_SET(?, contributon)
        )
    `;

    const site = `
      SELECT COUNT(*) AS today_siteinspection
      FROM site_inspection
      WHERE is_deleted = 0
        AND DATE(created_at) = CURDATE()
        AND created_by = ?
    `;

    // Combine all 3 queries into one call (requires multipleStatements: true in db config)
    const combinedQuery = `${attendance}; ${task}; ${site}`;

    db.query(
      combinedQuery,
      [
        user_id,              // for attendance
        user_id, user_id,     // for task (assign_to + FIND_IN_SET)
        user_id,              // for site
      ],
      (err, results) => {
        if (err) {
          console.error("getDashboardInfoForTeam error:", err);
          return res.status(200).json({
            message: "Something went wrong!",
            error: true,
            data: {},
          });
        }

        const attendanceData = results[0][0] || {};
        const taskData       = results[1][0] || {};
        const siteData       = results[2][0] || {};

        res.status(200).json({
          error: false,
          message: "Fetched!",
          data: {
            attendanceData: {
              present_count: attendanceData.present_count || 0,
            },
            taskData: {
              total_task:           taskData.total_task           || 0,
              total_completed_task: taskData.total_completed_task || 0,
            },
            siteData: {
              today_siteinspection: siteData.today_siteinspection || 0,
            },
          },
        });
      }
    );
  } catch (err) {
    console.error("getDashboardInfoForTeam catch:", err);
    res.status(200).json({ message: "Server error", data: {}, error: true });
  }
},
  getNotificationByAssignId: (req, res) => {
    var userId = req?.user?.id;
    if (typeof userId != "undefined") {
      var sql =
        "SELECT `n`.`id`,CONCAT(`u`.`first_name`,' ',`u`.`last_name`) as `name`,`n`.`json_data`,`n`.`assign_to`,`n`.`is_seen`,`n`.`seen_at`,`n`.`created_by`,`n`.`created_at`,`mf`.`id` as `mst_file_id`,`mf`.`office_file_no`,`mf`.`file_name`,`mf`.`cus_id`,`mf`.`code` FROM `notification` as `n` LEFT JOIN `users` as `u` ON `n`.`created_by`=`u`.`id` LEFT JOIN `mst_file` as `mf` ON `n`.`mst_file_id`=`mf`.`id`  WHERE `assign_to`=" +
        parseInt(userId) +
        " and `n`.`is_seen`=0 order by `n`.`created_at` desc";
      db.query(sql, (err, result) => {
        if (err) {
          res
            .status(200)
            .json({ message: err.sqlMessage, error: true, data: {} });
        } else if (result.length > 0) {
          res.status(200).json({
            message: "Notification fetched",
            data: result,
            error: false,
          });
        } else {
          res
            .status(200)
            .json({ message: "You've nothing to do", data: [], error: false });
        }
      });
    } else {
      res
        .status(200)
        .json({ message: "Unable to get the data", data: {}, error: true });
    }
  },
};
