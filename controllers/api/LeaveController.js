const { filter_string } = require("../../services/Utility");

module.exports = {
  addLeave: (req, res) => {
    const data = req.body;

    const leaveData = {
      team_id: req?.user?.id ? req?.user?.id : null,
      title: data?.title ? data?.title : null,
      description: data?.description ? filter_string(data?.description) : null,
      from_date: data?.from_date ? data?.from_date : null,
      to_date: data?.to_date ? data?.to_date : null,
      status: 1,
      is_deleted: 0,
      created_at: getCurrentDateAndTime(),
      created_by: req?.user?.id,
    };

    var sql = "INSERT INTO `team_leave` SET ?";

    db.query(sql, leaveData, (err, result) => {
      if (err) {
        res
          .status(200)
          .json({ message: err?.sqlMessage, error: true, data: {} });
      } else {
        res
          .status(200)
          .json({ message: "Leave applied", error: false, data: {} });
      }
    });
  },
  updateLeaveById: (req, res) => {
    //

    const data = req.body;

    const leaveData = {
      // team_id:req?.user?.id ? req?.user?.id : null,
      title: data?.title ? data?.title.trim() : null,
      description: data?.description
        ? filter_string(data?.description.trim())
        : null,
      status: 1,
      from_date: data?.from_date ? data?.from_date : null,
      to_date: data?.to_date ? data?.to_date : null,
      is_deleted: 0,
      updated_at: getCurrentDateAndTime(),
      updated_by: req?.user?.id,
    };

    const id = data?.id;

    var sql = "UPDATE `team_leave` SET ? WHERE `id`=" + id + "";

    db.query(sql, leaveData, (err, result) => {
      if (err) {
        res
          .status(200)
          .json({ message: err?.sqlMessage, error: true, data: {} });
      } else {
        res
          .status(200)
          .json({ message: "Changes saved!", error: false, data: {} });
      }
    });
  },
  deleteLeaveById: (req, res) => {
    const id = req?.params?.id;

    const data = {
      is_deleted: 1,
    };

    var sql = "UPDATE `team_leave` SET ? WHERE `id`=" + id + "";

    db.query(sql, data, (err, result) => {
      if (err) {
        res
          .status(200)
          .json({ message: err?.sqlMessage, error: true, data: {} });
      } else {
        res.status(200).json({ message: "Removed", error: false, data: {} });
      }
    });
  },

  getLeaveByTeamIdForTeam: (req, res) => {
    const id = req?.user?.id;

    var sql = `SELECT 
    id, 
    DATE_FORMAT(date, '%e %M %Y') AS date,
    CASE 
        WHEN att_type = 2 THEN 'Half Day' 
        WHEN att_type = 3 THEN 'Full Day' 
        ELSE 'Pending' 
    END AS att_type,
    reason, 
    notes, 
    CASE 
        WHEN status = 1 THEN 'Approved' 
        WHEN status = 2 THEN 'Rejected' 
        ELSE 'Pending' 
    END AS status_label
FROM attendance 
WHERE is_deleted = 0 
AND user_id = ? 
AND att_type IN (2, 3);
`;

    db.query(sql, [id], (err, result) => {
      if (err) {
        res
          .status(200)
          .json({ message: err?.sqlMessage, error: true, data: {} });
      } else {
        res
          .status(200)
          .json({ message: "Record Fetched", error: false, data: result });
      }
    });
  },

  getLeaveByTeamId: (req, res) => {
    const id = req?.params?.id;
    console.log("id--->", id);

    var sql =
      "SELECT `t`.`id`, `t`.`team_id`, CONCAT(`u`.`first_name`, ' ', `u`.`last_name`) AS `fullname`, `t`.`title`, `t`.`description`, `t`.`from_date`, `t`.`to_date`, `t`.`status`, `t`.`created_at` FROM `team_leave` AS `t` LEFT JOIN `users` AS `u` ON `u`.`id` = `t`.`team_id` WHERE `team_id` = " +
      id +
      " AND `t`.`is_deleted` = 0 ORDER BY `created_at` DESC";

    var sql2 =
      "SELECT CONCAT(`u`.`first_name`, ' ', `u`.`last_name`) AS `fullname` FROM `users` AS `u` WHERE `u`.`id` = " +
      id;

    db.query(sql, (err, result) => {
      if (err) {
        res
          .status(200)
          .json({ message: err?.sqlMessage, error: true, data: {} });
      } else {
        db.query(sql2, (err2, result2) => {
          if (err2) {
            res
              .status(200)
              .json({ message: err2?.sqlMessage, error: true, data: {} });
          } else {
            res.status(200).json({
              message: "Record Fetched",
              error: false,
              data: result,
              team: result2,
            });
          }
        });
      }
    });
  },

  getLeaveById: (req, res) => {
    const id = req.params?.id;

    var sql =
      "SELECT `t`.`id`,`t`.`team_id`,concat(`u`.`first_name`,' ',`u`.`last_name`) as `fullname`,`t`.`title`,`t`.`description`,`t`.`from_date`,`t`.`to_date`,`t`.`status`,`t`.`remarks`,`t`.`created_at` FROM `team_leave` as `t` LEFT JOIN `users` as `u` ON `u`.`id`=`t`.`team_id` where `t`.`id`=" +
      id +
      " and `t`.`is_deleted`=0 order by `created_at` desc";

    db.query(sql, (err, result) => {
      if (err) {
        res
          .status(200)
          .json({ message: err?.sqlMessage, error: true, data: {} });
      } else if (result.length > 0) {
        res
          .status(200)
          .json({ message: "Record fetched", error: false, data: result });
      } else {
        res.status(200).json({ message: "Not found", error: true, data: [] });
      }
    });
  },
  actionForLeave: (req, res) => {
    const data = {
      remarks: req?.body?.remarks ? req?.body?.remarks : null,
      status: req?.body?.status ? req?.body?.status : 0,
      updated_at: getCurrentDateAndTime(),
      updated_by: req?.user?.id,
    };

    console.log(data);

    var sql = "UPDATE `team_leave` SET ? where `id`=" + req?.body?.id + "";

    db.query(sql, data, (err, result) => {
      if (err) {
        res
          .status(200)
          .json({ message: err.sqlMessage, data: {}, error: true });
      } else {
        res
          .status(200)
          .json({ message: "Changes saved!", error: false, data: {} });
      }
    });
  },

  getAllattendance: async function (req, res) {
    // First query: Fetch attendance records with user details
    var sql = `SELECT a.*, 
       TIME_FORMAT(checkin, '%h:%i %p') AS formatted_checkin, 
       TIME_FORMAT(checkout, '%h:%i %p') AS formatted_checkout, 
       TIMESTAMPDIFF(MINUTE, breakin, breakout) AS total_break_minutes, 
       u.first_name, 
       u.last_name 
FROM attendance AS a 
LEFT JOIN users AS u ON u.id = a.user_id
WHERE a.att_type = 1 
   OR (a.att_type IN (2, 3) AND a.status IN (1, 2)) 
   OR (a.att_type IS NULL OR a.att_type = '')
ORDER BY a.date DESC;
`;

    // Second query: Count total active employees in group 2
    var sql2 = `
          SELECT COUNT(u.id) AS total_employee
          FROM users AS u
          LEFT JOIN users_groups AS ug
          ON ug.mst_user_id = u.id
          WHERE u.isdeleted = 0
          AND u.active = 1
          AND ug.mst_group_id = 2`;

    // Run both queries simultaneously
    db.query(sql, function (err, result1) {
      if (err) {
        var data = { error: true, message: err.sqlMessage, data: {} };
        return res.status(201).send(data);
      }

      db.query(sql2, function (err, result2) {
        if (err) {
          var data = { error: true, message: err.sqlMessage, data: {} };
          return res.status(201).send(data);
        }

        // Combine the results and send response
        var data = {
          error: false,
          message: "Record fetched successfully",
          attendance_data: result1,
          total_employee: result2[0].total_employee, // result2 will contain the count in the first row
        };

        return res.status(201).send(data);
      });
    });
  },

  getAttendancebyTeam: async function (req, res) {
    const user_id = req?.user?.id;
    var sql =
      "SELECT a.*, TIME_FORMAT(checkin, '%h:%i %p') AS formatted_checkin, TIME_FORMAT(checkout, '%h:%i %p') AS formatted_checkout, TIMESTAMPDIFF(MINUTE, breakin, breakout) AS total_break_minutes, u.first_name, u.last_name FROM attendance AS a LEFT JOIN users AS u ON u.id = a.user_id where a.user_id = ? ORDER BY a.date DESC";

    // Second query: Count total active employees in group 2
    var sql2 = `
         SELECT 
            YEAR(a.date) AS year, 
            SUM(CASE WHEN a.att_type = 2 THEN 1 ELSE 0 END) AS total_half_days,
            SUM(CASE WHEN a.att_type = 3 THEN 1 ELSE 0 END) AS total_leaves
        FROM attendance AS a
        WHERE a.is_deleted = 0 AND a.user_id = ?
        GROUP BY YEAR(a.date);`;

    // Run both queries simultaneously
    db.query(sql, [user_id], function (err, result1) {
      if (err) {
        var data = { error: true, message: err.sqlMessage, data: {} };
        return res.status(201).send(data);
      }

      db.query(sql2, [user_id], function (err, result2) {
        if (err) {
          var data = { error: true, message: err.sqlMessage, data: {} };
          return res.status(201).send(data);
        }

        // Combine the results and send response
        var data = {
          error: false,
          message: "Record fetched successfully",
          attendance_data: result1,
          total_employee: result2, // result2 will contain the count in the first row
        };

        return res.status(201).send(data);
      });
    });
  },

  fetchmonthattendancedata: async function (req, res) {
    const { year, id } = req.params;
    const currentDate = new Date();
    const selectedMonth = id ? parseInt(id) : currentDate.getMonth() + 1; // Months are 0-based in JS
    const selectedYear = year ? parseInt(year) : currentDate.getFullYear();

    var sql = `SELECT 
    a.user_id, 
    u.profile_picture,
    u.first_name,
    SUM(CASE WHEN a.att_type = 1 THEN 1 ELSE 0 END) AS total_present,
    SUM(CASE WHEN a.att_type = 2 THEN 0.5 ELSE 0 END) AS total_half_day,
    SUM(
        CASE 
            WHEN a.att_type = 1 THEN 1 
            WHEN a.att_type = 2 THEN 0.5 
            ELSE 0 
        END
    ) AS total_present_and_half
FROM attendance AS a
LEFT JOIN users AS u ON u.id = a.user_id
WHERE MONTH(a.date) = ?
  AND YEAR(a.date) = ?
GROUP BY a.user_id, u.profile_picture, u.first_name;
`;

        var sql2 = `
         SELECT
        a.date,
        a.att_type,
        a.user_id,
        u.profile_picture,
        u.first_name
    FROM attendance AS a
    LEFT JOIN users AS u ON u.id = a.user_id
    WHERE a.att_type IN (1, 2, 3,4)
    AND MONTH(a.date) = ?
    AND YEAR(a.date) = ?
    ORDER BY a.date, a.att_type`;

    db.query(sql, [selectedMonth, selectedYear], function (err, result1) {
      if (err) {
        var data = { error: true, message: err.sqlMessage, data: {} };
        return res.status(201).send(data);
      }

      db.query(sql2, [selectedMonth, selectedYear], function (err, result2) {
        if (err) {
          var data = { error: true, message: err.sqlMessage, data: {} };
          return res.status(201).send(data);
        }

        var data = {
          error: false,
          message: "Record fetched successfully",
          attendance_data: result1,
          monthwise: result2,
        };

        return res.status(201).send(data);
      });
    });
  },
};
