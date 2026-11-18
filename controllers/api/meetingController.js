const { getImageWithFoldername } = require("../../services/FileService");
const notificationController = require("./notificationController");
const table_name = "todos";

const dashboardCache = {
  data: null,
  lastFetched: null,
  TTL: 60 * 1000,
  isFetching: false,
};

// Maps raw sub_function value to the correct project_name value for the query
function mapSubFunction(sf) {
  const n = Number(sf);

  if (n >= 0 && n <= 4) {
    return n + 1; // 0,1,2,3,4 -> 1,2,3,4,5
  }

  if (n >= 5 && n <= 12) {
    return n - 4; // 5,6,7,8,9,10,11,12 -> 1,2,3,4,5,6,7,8
  }

  return n; // fallback: unexpected value, pass through unchanged
}

// Parses "DD-MM-YYYY" into a real Date object safely
function parseDate(dateStr) {
  if (!dateStr) return null;

  let y, m, d;

  if (dateStr instanceof Date) {
    y = dateStr.getFullYear();
    m = dateStr.getMonth() + 1;
    d = dateStr.getDate();
  } else if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    // Take only the date part, ignore any time/timezone suffix
    [y, m, d] = dateStr.substring(0, 10).split("-").map(Number);
  } else {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      // DD-MM-YYYY
      [d, m, y] = parts.map(Number);
    } else {
      const fallback = new Date(dateStr);
      if (isNaN(fallback.getTime())) return null;
      y = fallback.getFullYear();
      m = fallback.getMonth() + 1;
      d = fallback.getDate();
    }
  }

  // Construct in LOCAL time at midnight — no UTC offset drift
  return new Date(y, m - 1, d);
}

// Formats a Date object (or date string) into "DD-MM-YYYY"
function formatDate(date) {
  const d = date instanceof Date ? date : parseDate(date);
  if (!d || isNaN(d.getTime())) return "";

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  return `${day}-${month}-${year}`;
}

function formatDateYMD(date) {
  const d = date instanceof Date ? date : parseDate(date);
  if (!d || isNaN(d.getTime())) return "";

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  return `${year}-${month}-${day}`;
}
module.exports = {
  add: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const participantsArray = this_data.participants;

    const meeting = {
      mst_department_id: this_data.department_name,
      date: this_data.date,
      facilator: this_data.facilator,
      participants: participantsArray.join(","),
      created_at: getCurrentDateAndTime(),
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };

    db.query("INSERT INTO op_meeting SET ?", meeting, function (err, result) {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      const meetingId = result.insertId; // Get the inserted meeting ID
      const participantRows = participantsArray.map((participant) => [
        meetingId,
        this_data.date,
        this_data.facilator,
        participant,
        getCurrentDateAndTime(),
        null,
        null,
        0,
      ]); // Prepare array for bulk insertion
      db.query(
        "INSERT INTO op_meeting_detail (meeting_id,date,facilator, user_id,created_at, updated_at, updated_by, is_deleted) VALUES ?",
        [participantRows],
        function (err) {
          if (err) {
            return res
              .status(500)
              .json({ error: true, message: err.sqlMessage, data: {} });
          }

          const data = {
            error: false,
            message: "operational meeting has been added successfully.",
            data: {
              id: result.insertId,
            },
          };
          res.status(201).json(data);
        },
      );
    });
  },

  getAllOperationalmeeting: async function (req, res) {
    const { date } = req.query;

    const selectedDate = date ? String(date).split(/[T ]/)[0] : getCurrentDate();

    let sql = `SELECT om.id, om.date, om.mst_department_id, 
        u.first_name AS facilitator_first_name, 
        u.last_name AS facilitator_last_name, 
        md.name as department_name,
        GROUP_CONCAT(DISTINCT p.profile_picture) AS participants_pictures,
        COALESCE(MAX(prev.prev_total_tasks), 0) AS prev_total_tasks,
        COALESCE(MAX(prev.prev_completed_tasks), 0) AS prev_completed_tasks,
        COALESCE(MAX(prev.prev_on_time_completed), 0) AS prev_on_time_completed,
        CASE 
          WHEN COALESCE(MAX(prev.prev_completed_tasks), 0) = 0 THEN 0
          ELSE ROUND((COALESCE(MAX(prev.prev_on_time_completed), 0) / MAX(prev.prev_completed_tasks)) * 100, 2)
      END AS prev_on_time_percentage,
        CASE 
            WHEN COALESCE(MAX(prev.prev_total_tasks), 0) = 0 THEN 0
            ELSE ROUND((COALESCE(MAX(prev.prev_completed_tasks), 0) / MAX(prev.prev_total_tasks)) * 5, 1)
        END AS team_performance
        FROM op_meeting AS om 
        LEFT JOIN users AS u ON u.id = om.facilator 
        LEFT JOIN users AS p ON FIND_IN_SET(p.id, om.participants) 
        LEFT JOIN mst_department AS md ON md.id = om.mst_department_id
        LEFT JOIN todos AS t ON t.mst_department_id = om.mst_department_id 
            AND DATE(t.created_at) = ?
        LEFT JOIN (
            SELECT om2.mst_department_id,
                om2.date as meeting_date,
                COUNT(DISTINCT t2.id) AS prev_total_tasks,
                SUM(CASE WHEN t2.status = 1 THEN 1 ELSE 0 END) AS prev_completed_tasks,
                SUM(CASE WHEN t2.status = 1 AND DATE(t2.updated_at) <= DATE(t2.due_date) THEN 1 ELSE 0 END) AS prev_on_time_completed,
                ROW_NUMBER() OVER (PARTITION BY om2.mst_department_id ORDER BY om2.date DESC) as rn
            FROM op_meeting AS om2
            LEFT JOIN todos AS t2 ON t2.mst_department_id = om2.mst_department_id 
                AND DATE(t2.created_at) = DATE(om2.date)
            WHERE om2.date < ?
            GROUP BY om2.mst_department_id, om2.date
        ) AS prev ON prev.mst_department_id = om.mst_department_id AND prev.rn = 1
        WHERE DATE(om.date) = ?
        GROUP BY om.id, om.date, om.mst_department_id, u.first_name, u.last_name, md.name
        ORDER BY om.id DESC`;

    const sql2 = `SELECT 
    COUNT(t.id) AS total_tasks,
    SUM(CASE WHEN t.status = 1 THEN 1 ELSE 0 END) AS completed_tasks,
    SUM(CASE WHEN t.status = 1 AND DATE(t.updated_at) <= DATE(t.due_date) THEN 1 ELSE 0 END) AS on_time_completed,
    ROUND(
        (SUM(CASE WHEN t.status = 1 AND DATE(t.updated_at) <= DATE(t.due_date) THEN 1 ELSE 0 END) / NULLIF(SUM(CASE WHEN t.status = 1 THEN 1 ELSE 0 END), 0)) * 100, 
        2
    ) AS on_time_rate_percentage,
    ROUND(
        (SUM(CASE WHEN t.status = 1 THEN 1 ELSE 0 END) / NULLIF(COUNT(t.id), 0)) * 5, 
        2
    ) AS avg_performance_out_of_5
FROM op_meeting AS om 
LEFT JOIN todos AS t ON t.mst_department_id = om.mst_department_id 
    AND t.is_deleted = 0
    AND DATE(t.due_date) <= om.date 
WHERE om.is_deleted = 0 
    AND om.date = ?`;

    const sql3 = `SELECT 
    COALESCE(msd.name, 'Other')   AS department_name,
    COUNT(t.id)                   AS pending_tasks
FROM todos AS t
LEFT JOIN mst_department AS msd ON msd.id = t.mst_department_id
WHERE 
    t.status = 0
    AND t.is_deleted = 0
GROUP BY 
    t.mst_department_id,
    msd.name
ORDER BY pending_tasks DESC`;

    db.query(
      sql,
      [selectedDate, selectedDate, selectedDate],
      function (err, result) {
        if (err) {
          return res
            .status(500)
            .send({ error: true, message: err.sqlMessage, data: {} });
        }

        db.query(sql2, [selectedDate], function (err2, aggregatedData) {
          if (err2) {
            return res
              .status(500)
              .send({ error: true, message: err2.sqlMessage, data: {} });
          }

          db.query(sql3, function (err3, departmentStats) {
            if (err3) {
              return res
                .status(500)
                .send({ error: true, message: err3.sqlMessage, data: {} });
            }

            const deptObject = {};
            departmentStats.forEach((row) => {
              deptObject[row.department_name] = row.pending_tasks;
            });

            return res.status(200).send({
              error: false,
              message: "Records fetched successfully",
              data: result,
              aggregated: aggregatedData[0] || {
                total_tasks: 0,
                completed_tasks: 0,
                on_time_completed: 0,
                on_time_rate_percentage: 0,
                avg_performance_out_of_5: 0,
              },
              department_stats: deptObject || [], // ✅ department-wise breakdown
            });
          });
        });
      },
    );
  },
  fetchTeamOpMeeting: async function (req, res) {
    const user_id = req.params.id;

    //get current user
    var sql = `SELECT 
    om.*, 
    u.first_name AS facilitator_first_name,
    u.last_name AS facilitator_last_name, 
    md.name AS department_name,
    GROUP_CONCAT(p.profile_picture) AS participants_pictures 
FROM op_meeting AS om 
LEFT JOIN users AS u ON u.id = om.facilator 
LEFT JOIN users AS p ON FIND_IN_SET(p.id, om.participants) 
LEFT JOIN mst_department AS md ON md.id = om.mst_department_id
WHERE FIND_IN_SET(?, om.participants) -- Fix: Corrected WHERE clause
GROUP BY om.id 
ORDER BY om.id DESC;
`;

    db.query(sql, [user_id], function (err, result) {
      if (err) {
        var data = { error: true, message: err.sqlMessage, data: {} };
        res.status(201).send(data);
      } else {
        if (result.length > 0) {
          var data = {
            error: false,
            message: "Recoard fetched successfully",
            data: result,
          };
          res.status(201).send(data);
        } else {
          var data = { error: false, message: "Not found", data: [] };
          res.status(201).json(data);
        }
      }
    });
  },

  getEmpOpMeeting: async function (req, res) {
    const user_id = req.user.id;
    const { date } = req.query;

    const selectedDate = date ? String(date).split(/[T ]/)[0] : getCurrentDate();

    let sql = `SELECT 
    om.id, 
    om.date, 
    om.mst_department_id, 
    u.first_name AS facilitator_first_name, 
    u.last_name AS facilitator_last_name, 
    md.name AS department_name,
    GROUP_CONCAT(DISTINCT p.profile_picture ORDER BY p.id SEPARATOR ',') AS participants_pictures,
    COALESCE(prev.prev_total_tasks, 0) AS prev_total_tasks,
    COALESCE(prev.prev_completed_tasks, 0) AS prev_completed_tasks,
    COALESCE(prev.prev_on_time_completed, 0) AS prev_on_time_completed,
    CASE 
        WHEN COALESCE(prev.prev_completed_tasks, 0) = 0 THEN 0
        ELSE ROUND((COALESCE(prev.prev_on_time_completed, 0) / prev.prev_completed_tasks) * 100, 2)
    END AS prev_on_time_percentage,
    CASE 
        WHEN COALESCE(prev.prev_total_tasks, 0) = 0 THEN 0
        ELSE ROUND((COALESCE(prev.prev_completed_tasks, 0) / prev.prev_total_tasks) * 5, 1)
    END AS team_performance
FROM op_meeting AS om 
LEFT JOIN users AS u ON u.id = om.facilator 
LEFT JOIN mst_department AS md ON md.id = om.mst_department_id
LEFT JOIN users AS p ON FIND_IN_SET(p.id, om.participants) > 0
LEFT JOIN (
    SELECT 
        om2.mst_department_id,
        om2.date AS meeting_date,
        COUNT(DISTINCT t2.id) AS prev_total_tasks,
        SUM(CASE WHEN t2.status = 1 THEN 1 ELSE 0 END) AS prev_completed_tasks,
        SUM(CASE WHEN t2.status = 1 AND DATE(t2.updated_at) <= DATE(t2.due_date) THEN 1 ELSE 0 END) AS prev_on_time_completed
    FROM op_meeting AS om2
    INNER JOIN (
        SELECT 
            mst_department_id,
            MAX(date) AS max_date
        FROM op_meeting
        WHERE date < ?
        GROUP BY mst_department_id
    ) AS latest ON om2.mst_department_id = latest.mst_department_id 
        AND om2.date = latest.max_date
    LEFT JOIN todos AS t2 ON t2.mst_department_id = om2.mst_department_id 
        AND DATE(t2.created_at) = DATE(om2.date)
    GROUP BY om2.mst_department_id, om2.date
) AS prev ON prev.mst_department_id = om.mst_department_id
WHERE DATE(om.date) = ? 
    AND FIND_IN_SET(?, om.participants) > 0
GROUP BY om.id, om.date, om.mst_department_id, u.first_name, u.last_name, md.name,
    prev.prev_total_tasks, prev.prev_completed_tasks, prev.prev_on_time_completed
ORDER BY om.id DESC`;

    const sql2 = `SELECT 
    COUNT(t.id) AS total_tasks,
    SUM(CASE WHEN t.status = 1 THEN 1 ELSE 0 END) AS completed_tasks,
    SUM(CASE WHEN t.status = 1 AND DATE(t.updated_at) <= DATE(t.due_date) THEN 1 ELSE 0 END) AS on_time_completed,
    ROUND(
        (SUM(CASE WHEN t.status = 1 AND DATE(t.updated_at) <= DATE(t.due_date) THEN 1 ELSE 0 END) / NULLIF(SUM(CASE WHEN t.status = 1 THEN 1 ELSE 0 END), 0)) * 100, 
        2
    ) AS on_time_rate_percentage,
    ROUND(
        (SUM(CASE WHEN t.status = 1 THEN 1 ELSE 0 END) / NULLIF(COUNT(t.id), 0)) * 5, 
        2
    ) AS avg_performance_out_of_5
FROM op_meeting AS om 
LEFT JOIN todos AS t ON t.mst_department_id = om.mst_department_id 
    AND t.is_deleted = 0
    AND DATE(t.due_date) <= om.date 
WHERE om.is_deleted = 0 
    AND om.date = ? and FIND_IN_SET(?, om.participants) > 0`;

    db.query(
      sql,
      [selectedDate, selectedDate, user_id],
      function (err, result) {
        if (err) {
          res
            .status(500)
            .send({ error: true, message: err.sqlMessage, data: {} });
        } else {
          // Execute second query to get aggregated data
          db.query(
            sql2,
            [selectedDate, user_id],
            function (err2, aggregatedData) {
              if (err2) {
                res
                  .status(500)
                  .send({ error: true, message: err2.sqlMessage, data: {} });
              } else {
                res.status(200).send({
                  error: false,
                  message: "Records fetched successfully",
                  data: result,
                  aggregated: aggregatedData[0] || {
                    total_tasks: 0,
                    completed_tasks: 0,
                    on_time_rate_percentage: 0,
                    avg_performance_out_of_5: 0,
                  },
                });
              }
            },
          );
        }
      },
    );
  },

  getHodOpMeeting: async function (req, res) {
    const user_id = req.user.id;
    const { date } = req.query;

    const selectedDate = date ? String(date).split(/[T ]/)[0] : getCurrentDate();

    let sql = `SELECT 
    om.id, 
    om.date, 
    om.mst_department_id, 
    u.first_name AS facilitator_first_name, 
    u.last_name AS facilitator_last_name, 
    md.name AS department_name,
    GROUP_CONCAT(DISTINCT p.profile_picture ORDER BY p.id SEPARATOR ',') AS participants_pictures,
    COALESCE(prev.prev_total_tasks, 0) AS prev_total_tasks,
    COALESCE(prev.prev_completed_tasks, 0) AS prev_completed_tasks,
    COALESCE(prev.prev_on_time_completed, 0) AS prev_on_time_completed,
    CASE 
        WHEN COALESCE(prev.prev_completed_tasks, 0) = 0 THEN 0
        ELSE ROUND((COALESCE(prev.prev_on_time_completed, 0) / prev.prev_completed_tasks) * 100, 2)
    END AS prev_on_time_percentage,
    CASE 
        WHEN COALESCE(prev.prev_total_tasks, 0) = 0 THEN 0
        ELSE ROUND((COALESCE(prev.prev_completed_tasks, 0) / prev.prev_total_tasks) * 5, 1)
    END AS team_performance
FROM op_meeting AS om 
LEFT JOIN users AS u ON u.id = om.facilator 
LEFT JOIN mst_department AS md ON md.id = om.mst_department_id
LEFT JOIN users AS p ON FIND_IN_SET(p.id, om.participants) > 0
LEFT JOIN (
    SELECT 
        om2.mst_department_id,
        om2.date AS meeting_date,
        COUNT(DISTINCT t2.id) AS prev_total_tasks,
        SUM(CASE WHEN t2.status = 1 THEN 1 ELSE 0 END) AS prev_completed_tasks,
        SUM(CASE WHEN t2.status = 1 AND DATE(t2.updated_at) <= DATE(t2.due_date) THEN 1 ELSE 0 END) AS prev_on_time_completed
    FROM op_meeting AS om2
    INNER JOIN (
        SELECT 
            mst_department_id,
            MAX(date) AS max_date
        FROM op_meeting
        WHERE date < ?
        GROUP BY mst_department_id
    ) AS latest ON om2.mst_department_id = latest.mst_department_id 
        AND om2.date = latest.max_date
    LEFT JOIN todos AS t2 ON t2.mst_department_id = om2.mst_department_id 
        AND DATE(t2.created_at) = DATE(om2.date)
    GROUP BY om2.mst_department_id, om2.date
) AS prev ON prev.mst_department_id = om.mst_department_id
WHERE DATE(om.date) = ? 
    AND (om.facilator = ? OR FIND_IN_SET(?, om.participants) > 0)
GROUP BY om.id, om.date, om.mst_department_id, u.first_name, u.last_name, md.name,
    prev.prev_total_tasks, prev.prev_completed_tasks, prev.prev_on_time_completed
ORDER BY om.id DESC`;

    const sql2 = `SELECT 
    COUNT(t.id) AS total_tasks,
    SUM(CASE WHEN t.status = 1 THEN 1 ELSE 0 END) AS completed_tasks,
    SUM(CASE WHEN t.status = 1 AND DATE(t.updated_at) <= DATE(t.due_date) THEN 1 ELSE 0 END) AS on_time_completed,
    ROUND(
        (SUM(CASE WHEN t.status = 1 AND DATE(t.updated_at) <= DATE(t.due_date) THEN 1 ELSE 0 END) / NULLIF(SUM(CASE WHEN t.status = 1 THEN 1 ELSE 0 END), 0)) * 100, 
        2
    ) AS on_time_rate_percentage,
    ROUND(
        (SUM(CASE WHEN t.status = 1 THEN 1 ELSE 0 END) / NULLIF(COUNT(t.id), 0)) * 5, 
        2
    ) AS avg_performance_out_of_5
FROM op_meeting AS om 
LEFT JOIN todos AS t ON t.mst_department_id = om.mst_department_id 
    AND t.is_deleted = 0
    AND DATE(t.due_date) <= om.date 
WHERE om.is_deleted = 0 
    AND om.date = ? and  (om.facilator = ? OR FIND_IN_SET(?, om.participants) > 0)`;

    db.query(
      sql,
      [selectedDate, selectedDate, user_id, user_id],
      function (err, result) {
        if (err) {
          res
            .status(500)
            .send({ error: true, message: err.sqlMessage, data: {} });
        } else {
          // Execute second query to get aggregated data
          db.query(
            sql2,
            [selectedDate, user_id, user_id],
            function (err2, aggregatedData) {
              if (err2) {
                res
                  .status(500)
                  .send({ error: true, message: err2.sqlMessage, data: {} });
              } else {
                res.status(200).send({
                  error: false,
                  message: "Records fetched successfully",
                  data: result,
                  aggregated: aggregatedData[0] || {
                    total_tasks: 0,
                    completed_tasks: 0,
                    on_time_rate_percentage: 0,
                    avg_performance_out_of_5: 0,
                  },
                });
              }
            },
          );
        }
      },
    );
  },

  getAllDepartment: async function (req, res) {
    const team_id = req?.body?.team_id;

    //get current user
    var sql = `select * from mst_department`;

    db.query(sql, function (err, result) {
      if (err) {
        var data = { error: true, message: err.sqlMessage, data: {} };
        res.status(201).send(data);
      } else {
        if (result.length > 0) {
          var data = {
            error: false,
            message: "Recoard fetched successfully",
            data: result,
          };
          res.status(201).send(data);
        } else {
          var data = { error: false, message: "Not found", data: [] };
          res.status(201).json(data);
        }
      }
    });
  },

  getTacticalmeetingbyid: (req, res) => {
    try {
      const id = req.params?.id;

      if (!isNaN(parseInt(id))) {
        // Fix condition to check valid number
        var sql = `SELECT 
                        tc.*, 
                        u.first_name AS facilitator_first_name, 
                        u.last_name AS facilitator_last_name, 
                        u.profile_picture, 
                        md.name AS department_name, 
                        GROUP_CONCAT(p.profile_picture) AS participants_pictures 
                    FROM tc_meeting AS tc
                    LEFT JOIN users AS u ON u.id = tc.facilator 
                    LEFT JOIN users AS p ON FIND_IN_SET(p.id, tc.participants)
                    LEFT JOIN mst_department AS md ON md.id = tc.mst_department_id
                    WHERE tc.id = ? AND tc.is_deleted = 0
                    GROUP BY tc.id
                    ORDER BY tc.id DESC`;

        db.query(sql, [id], (err, result) => {
          if (err) {
            res
              .status(200)
              .json({ message: err.sqlMessage, error: true, data: {} });
          } else if (result.length) {
            res
              .status(200)
              .json({ message: "Record fetched", error: false, data: result });
          } else {
            res
              .status(200)
              .json({ message: "Not found", error: false, data: [] });
          }
        });
      } else {
        res
          .status(200)
          .json({ message: "Invalid request", error: true, data: {} });
      }
    } catch (err) {
      res
        .status(200)
        .json({ message: "Invalid request", error: true, data: {} });
    }
  },

  gettotaldepartment: (req, res) => {
    try {
      var sql = `SELECT 
      md.id,
      md.name,
      COUNT(udp.user_id) as employee_count
    FROM user_department_post as udp
    LEFT JOIN mst_department as md ON md.id = udp.department_id
    LEFT JOIN users as u ON u.id = udp.user_id 
    WHERE u.active = 1 AND u.isdeleted = 0
    GROUP BY md.id, md.name
    ORDER BY employee_count DESC`;

      var sql2 = `SELECT COUNT(DISTINCT u.id) as total_employees
    FROM users as u
    LEFT JOIN users_groups as ug ON ug.mst_user_id = u.id
    WHERE ug.mst_group_id = 2 AND u.active = 1 AND u.isdeleted = 0`;

      // Execute first query
      db.query(sql, (err, departmentResult) => {
        if (err) {
          return res.status(200).json({
            message: err.sqlMessage,
            error: true,
            data: {},
          });
        }

        // Execute second query
        db.query(sql2, (err2, totalResult) => {
          if (err2) {
            return res.status(200).json({
              message: err2.sqlMessage,
              error: true,
              data: {},
            });
          }

          // Combine results
          const responseData = {
            departments: departmentResult,
            total_employees: totalResult[0]?.total_employees || 0,
          };

          res.status(200).json({
            message: "Record fetched",
            error: false,
            data: responseData,
          });
        });
      });
    } catch (err) {
      res.status(200).json({
        message: "Invalid request",
        error: true,
        data: {},
      });
    }
  },

  getdepartmentshowbyuserid: (req, res) => {
    try {
      const user_id = req.user ? req.user.id : null;

      var sql = `SELECT md.id FROM users as u
left join user_department_post as udp
on udp.user_id = u.id
left join mst_department as md
on md.id = udp.department_id
WHERE u.id = ?`;
      db.query(sql, [user_id], (err, result) => {
        if (err) {
          res
            .status(200)
            .json({ message: err.sqlMessage, error: true, data: {} });
        } else if (result.length) {
          res
            .status(200)
            .json({ message: "Record fetched", error: false, data: result });
        } else {
          res
            .status(200)
            .json({ message: "Not found", error: false, data: [] });
        }
      });
    } catch (err) {
      res
        .status(200)
        .json({ message: "Invalid request", error: true, data: {} });
    }
  },

  getopfillbyid: (req, res) => {
    try {
      const id = req.params?.id;
      if (parseInt(id) != NaN) {
        var sql = `SELECT 
    om.id AS meeting_id,
    u.id AS participant_id,
    u.profile_picture AS participant_profile_picture,
    CASE 
        WHEN TRIM(COALESCE(omd.clarity_1_key_highlight, '')) = '' 
         AND TRIM(COALESCE(omd.clarity_2_key_highlight, '')) = '' 
          AND TRIM(COALESCE(omd.clarity_1_key_action, '')) = '' 
         AND TRIM(COALESCE(omd.clarity_2_key_action, '')) = '' 
        THEN 0 
        ELSE 1 
    END AS clarity_status
FROM op_meeting AS om 
LEFT JOIN users AS u ON FIND_IN_SET(u.id, om.participants)
LEFT JOIN op_meeting_detail AS omd ON omd.user_id = u.id AND omd.meeting_id = om.id
WHERE om.id = ? AND om.is_deleted = 0;`;
        db.query(sql, [id], (err, result) => {
          if (err) {
            res
              .status(200)
              .json({ message: err.sqlMessage, error: true, data: {} });
          } else if (result.length) {
            res
              .status(200)
              .json({ message: "Record fetched", error: false, data: result });
          } else {
            res
              .status(200)
              .json({ message: "Not found", error: false, data: [] });
          }
        });
      } else {
        res
          .status(200)
          .json({ message: "Invalid request", error: true, data: {} });
      }
    } catch (err) {
      res
        .status(200)
        .json({ message: "Invalid request", error: true, data: {} });
    }
  },

  getTaskPercentages: (req, res) => {
    try {
      const id = req.params?.id;

      if (!isNaN(parseInt(id))) {
        // Step 1: Fetch the date from op_meeting based on the given ID
        const sqlDate = `
          SELECT DATE_FORMAT(date, '%Y-%m-%d') AS formatted_date 
          FROM op_meeting 
          WHERE id = ?;
        `;

        db.query(sqlDate, [id], (errDate, resultDate) => {
          if (errDate) {
            return res.status(500).json({
              message: errDate.sqlMessage,
              error: true,
              data: {},
            });
          }

          if (resultDate.length === 0) {
            return res.status(404).json({
              message: "No meeting found with the specified ID",
              error: true,
              data: {},
            });
          }

          const date = resultDate[0].formatted_date;

          // Step 2: Get users for the department
          const sql0 = `
            SELECT 
              users.*, 
              udp.department_id 
            FROM 
              users 
            LEFT JOIN 
              user_department_post AS udp 
              ON udp.user_id = users.id 
            WHERE 
              udp.department_id = ? AND users.isdeleted = 0;
          `;

          db.query(sql0, [id], (err0, result0) => {
            if (err0) {
              return res.status(500).json({
                message: err0.sqlMessage,
                error: true,
                data: {},
              });
            }

            const userIds = result0.map((user) => user.id);

            if (userIds.length === 0) {
              return res.status(404).json({
                message: "No users found for the specified department",
                error: true,
                data: {},
              });
            }

            // Step 3: Get tasks assigned to users on the specific date
            const userIdsCondition = userIds
              .map(() => `JSON_CONTAINS(t.assign_to, JSON_ARRAY(?))`)
              .join(" OR ");
            const sql1 = `
               SELECT 
              t.* 
            FROM 
              todos AS t 
            WHERE 
              t.date = ? 
              AND (${userIdsCondition});
            `;
            const queryParams = [date, ...userIds];

            db.query(sql1, queryParams, (err1, result1) => {
              if (err1) {
                return res.status(500).json({
                  message: err1.sqlMessage,
                  error: true,
                  data: {},
                });
              }
              // Step 4: Fetch meeting stats
              const sql2 = `
                SELECT 
                  COUNT(id) AS total_ok,
                  COUNT(CASE WHEN is_ok = 1 THEN 1 END) AS completed_ok,
                  COUNT(CASE WHEN is_ok = 0 THEN 1 END) AS uncompleted_ok,
                  ROUND((COUNT(CASE WHEN is_ok = 1 THEN 1 END) / NULLIF(COUNT(id), 0)) * 100, 2) AS completion_percentage,
                  ROUND((COUNT(CASE WHEN is_ok = 0 THEN 1 END) / NULLIF(COUNT(id), 0)) * 100, 2) AS uncompleted_percentage
                FROM 
                  op_meeting_detail
                WHERE 
                  meeting_id = ?;
              `;

              db.query(sql2, [id], (err2, result2) => {
                if (err2) {
                  return res.status(500).json({
                    message: err2.sqlMessage,
                    error: true,
                    data: {},
                  });
                }

                // Combine results from all queries
                res.status(200).json({
                  message: "Records fetched successfully",
                  error: false,
                  data: {
                    meetingDate: date,
                    userStats: result0,
                    taskStats: result1,
                    meetingStats: result2[0],
                  },
                });
              });
            });
          });
        });
      } else {
        res.status(400).json({
          message: "Invalid request: ID must be a number",
          error: true,
          data: {},
        });
      }
    } catch (err) {
      res.status(500).json({
        message: "Server error",
        error: true,
        data: {},
      });
    }
  },

  updateTacticalPerformance: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.editId);

    // Use parameterized queries to avoid SQL injection and syntax errors
    const selectSql =
      "SELECT id,DATE_FORMAT(date, '%Y-%m-%d') AS formatted_date,user_id,key_highlight,key_action,what_missing,what_learn,what_different,what_done_when FROM `tc_meeting_detail` WHERE `id` = ?";

    db.query(selectSql, [id], (err, result) => {
      if (err) {
        const data = { error: true, message: err.sqlMessage, data: {} };
        return res.status(500).json(data); // Use 500 for server errors
      }
      const meetingDate = result.length > 0 ? result[0].formatted_date : null;
      const employeeId = result.length > 0 ? result[0].user_id : null;

      const user_id = req?.user?.id;

      const clarity = {
        key_highlight: this_data.keyhighlight,
        key_action: this_data.keyaction,
        what_missing: this_data.what_missing,
        what_learn: this_data.what_learn,
        what_different: this_data.what_different,
        what_done_when: this_data.what_done_when,
        updated_at: getCurrentDateAndTime(),
        updated_by: user_id,
      };

      const updateSql =
        "UPDATE `tc_meeting_detail` SET " +
        "`key_highlight` = ?, " +
        "`key_action` = ?, " +
        "`what_missing` = ?, " +
        "`what_learn` = ?, " +
        "`what_different` = ?, " +
        "`what_done_when` = ?, " +
        "`updated_at` = ?, " +
        "`updated_by` = ? " +
        "WHERE `user_id` = ? and date =?";

      db.query(
        updateSql,
        [
          clarity.key_highlight,
          clarity.key_action,
          clarity.what_missing,
          clarity.what_learn,
          clarity.what_different,
          clarity.what_done_when,
          clarity.updated_at,
          parseInt(clarity.updated_by),
          employeeId,
          meetingDate,
        ],
        (err, result) => {
          if (err) {
            console.error("Database update error:", err);
            return res
              .status(500)
              .json({ error: true, message: err.sqlMessage, data: {} });
          }

          if (result.affectedRows === 0) {
            return res.status(404).json({
              error: true,
              message: "Participant not found",
              data: {},
            });
          }

          const response = {
            error: false,
            message: " Tactical Performance has been updated successfully.",
            data: { id },
          };
          res.status(200).json(response);
        },
      );
    });
  },

  updatePerformance: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.editId);

    // Use parameterized queries to avoid SQL injection and syntax errors
    const selectSql =
      "SELECT id,DATE_FORMAT(date, '%Y-%m-%d') AS formatted_date,user_id,clarity_1_key_highlight,clarity_1_key_action FROM `op_meeting_detail` WHERE `id` = ?";

    db.query(selectSql, [id], (err, result) => {
      if (err) {
        const data = { error: true, message: err.sqlMessage, data: {} };
        return res.status(500).json(data); // Use 500 for server errors
      }
      const meetingDate = result.length > 0 ? result[0].formatted_date : null;
      const employeeId = result.length > 0 ? result[0].user_id : null;

      const user_id = req?.user?.id;

      const clarity = {
        clarity_1_key_highlight: this_data.keyhighlight,
        clarity_1_key_action: this_data.keyaction,
        updated_at: getCurrentDateAndTime(),
        updated_by: user_id,
      };
      const updateSql =
        "UPDATE `op_meeting_detail` SET " +
        "`clarity_1_key_highlight` = ?, " +
        "`clarity_1_key_action` = ?, " +
        "`updated_at` = ?, " +
        "`updated_by` = ? " +
        "WHERE `user_id` = ? and date =?";

      db.query(
        updateSql,
        [
          clarity.clarity_1_key_highlight,
          clarity.clarity_1_key_action,
          clarity.updated_at,
          parseInt(clarity.updated_by),
          employeeId,
          meetingDate,
        ],
        (err, result) => {
          if (err) {
            console.error("Database update error:", err);
            return res
              .status(500)
              .json({ error: true, message: err.sqlMessage, data: {} });
          }

          if (result.affectedRows === 0) {
            return res.status(404).json({
              error: true,
              message: "Participant not found",
              data: {},
            });
          }

          const response = {
            error: false,
            message: "Performance has been updated successfully.",
            data: { id },
          };
          res.status(200).json(response);
        },
      );
    });
  },
  updateClarityFocus: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.editId);

    // Use parameterized queries to avoid SQL injection and syntax errors
    const selectSql =
      "SELECT id,DATE_FORMAT(date, '%Y-%m-%d') AS formatted_date,user_id,clarity_2_key_highlight,clarity_2_key_action FROM `op_meeting_detail` WHERE `id` = ?";

    db.query(selectSql, [id], (err, result) => {
      if (err) {
        const data = { error: true, message: err.sqlMessage, data: {} };
        return res.status(500).json(data); // Use 500 for server errors
      }
      const meetingDate = result.length > 0 ? result[0].formatted_date : null;
      const employeeId = result.length > 0 ? result[0].user_id : null;
      const user_id = req?.user?.id;

      const clarity = {
        clarity_2_key_highlight: this_data.keyhighlight,
        clarity_2_key_action: this_data.keyaction,
        updated_at: getCurrentDateAndTime(),
        updated_by: user_id,
      };

      const updateSql =
        "UPDATE `op_meeting_detail` SET " +
        "`clarity_2_key_highlight` = ?, " +
        "`clarity_2_key_action` = ?, " +
        "`updated_at` = ?, " +
        "`updated_by` = ? " +
        "WHERE `user_id` = ? and date =?";

      db.query(
        updateSql,
        [
          clarity.clarity_2_key_highlight,
          clarity.clarity_2_key_action,
          clarity.updated_at,
          parseInt(clarity.updated_by),
          employeeId,
          meetingDate,
        ],
        (err, result) => {
          if (err) {
            console.error("Database update error:", err);
            return res
              .status(500)
              .json({ error: true, message: err.sqlMessage, data: {} });
          }

          if (result.affectedRows === 0) {
            return res.status(404).json({
              error: true,
              message: "Participant not found",
              data: {},
            });
          }

          const response = {
            error: false,
            message: "Clarity has been updated successfully.",
            data: { id },
          };
          res.status(200).json(response);
        },
      );
    });
  },

  getPerformancebyId: (req, res) => {
    try {
      const id = req.params?.id;

      if (parseInt(id) != NaN) {
        var sql =
          "select id,clarity_1_key_highlight,clarity_1_key_action from op_meeting_detail where id = " +
          id +
          "";
        db.query(sql, (err, result) => {
          if (err) {
            res
              .status(200)
              .json({ message: err.sqlMessage, error: true, data: {} });
          } else if (result.length) {
            res
              .status(200)
              .json({ message: "Record fetched", error: false, data: result });
          } else {
            res
              .status(200)
              .json({ message: "Not found", error: false, data: [] });
          }
        });
      } else {
        res
          .status(200)
          .json({ message: "Invalid request", error: true, data: {} });
      }
    } catch (err) {
      res
        .status(200)
        .json({ message: "Invalid request", error: true, data: {} });
    }
  },

  getClarityFocusbyId: (req, res) => {
    try {
      const id = req.params?.id;

      if (parseInt(id) != NaN) {
        var sql =
          "select id,clarity_2_key_highlight,clarity_2_key_action from op_meeting_detail where id = " +
          id +
          "";
        db.query(sql, (err, result) => {
          if (err) {
            res
              .status(200)
              .json({ message: err.sqlMessage, error: true, data: {} });
          } else if (result.length) {
            res
              .status(200)
              .json({ message: "Record fetched", error: false, data: result });
          } else {
            res
              .status(200)
              .json({ message: "Not found", error: false, data: [] });
          }
        });
      } else {
        res
          .status(200)
          .json({ message: "Invalid request", error: true, data: {} });
      }
    } catch (err) {
      res
        .status(200)
        .json({ message: "Invalid request", error: true, data: {} });
    }
  },

  getparticipantsbyid: (req, res) => {
    try {
      const id = req.params?.id;

      if (!isNaN(parseInt(id))) {
        var sql = `SELECT 
    omd.*, 
    u.first_name, 
    u.last_name,  
    u.profile_picture,
    GROUP_CONCAT(DISTINCT t.task ORDER BY t.task SEPARATOR ', ') AS tasks_by_meeting,
    GROUP_CONCAT(DISTINCT t.id ORDER BY t.task SEPARATOR ', ') AS task_ids, 
    GROUP_CONCAT(DISTINCT t.status ORDER BY t.task SEPARATOR ', ') AS task_statuses, 
    COUNT(DISTINCT t.id) AS total_tasks,
    COUNT(DISTINCT CASE WHEN t.status = 1 THEN t.id END) AS completed_tasks,
    ROUND(
        (COUNT(DISTINCT CASE WHEN t.status = 1 THEN t.id END) / NULLIF(COUNT(DISTINCT t.id), 0)) * 100, 
        2
    ) AS completion_percentage
FROM 
    op_meeting_detail AS omd
LEFT JOIN 
    users AS u ON u.id = omd.user_id  
LEFT JOIN 
    todos AS t ON t.date = omd.date AND FIND_IN_SET(omd.user_id, REPLACE(REPLACE(t.assign_to, '[', ''), ']', '')) > 0 -- Matching task date and assign_to
LEFT JOIN 
    todos AS td ON FIND_IN_SET(omd.user_id, REPLACE(REPLACE(td.assign_to, '[', ''), ']', ''))
WHERE 
    omd.is_deleted = 0 
    AND omd.meeting_id = ?
GROUP BY 
    omd.id
`;

        db.query(sql, [id], (err, result) => {
          if (err) {
            return res.status(500).json({
              message: err.sqlMessage,
              error: true,
              data: {},
            });
          }
          if (result.length) {
            return res.status(200).json({
              message: "Record fetched",
              error: false,
              data: result,
            });
          } else {
            return res.status(404).json({
              message: "Not found",
              error: false,
              data: [],
            });
          }
        });
      } else {
        return res.status(400).json({
          message: "Invalid request",
          error: true,
          data: {},
        });
      }
    } catch (err) {
      return res.status(500).json({
        message: "Server error",
        error: true,
        data: {},
      });
    }
  },
  getTacticalparticipantsbyuserid: (req, res) => {
    try {
      const id = req.params?.id;

      if (!isNaN(parseInt(id))) {
        var sql = `
          SELECT 
            MAX(tmd.id)                          AS id,
            tmd.user_id,
            DATE(tmd.date)                       AS date,

            -- Pick latest meeting's narrative fields for that date
            MAX(tmd.key_highlight)               AS key_highlight,
            MAX(tmd.key_action)                  AS key_action,
            MAX(tmd.what_goal)                   AS what_goal,
            MAX(tmd.what_done)                   AS what_done,
            MAX(tmd.what_not_done)               AS what_not_done,
            MAX(tmd.what_missing)                AS what_missing,
            MAX(tmd.what_learn)                  AS what_learn,
            MAX(tmd.what_different)              AS what_different,
            MAX(tmd.what_done_when)              AS what_done_when,
            MAX(tmd.on_time)                     AS on_time,

            -- Sum task counts across all meetings on that date
            SUM(tmd.total_task)                  AS total_task,
            SUM(tmd.total_completed_tasks)       AS total_completed_tasks,
            SUM(tmd.total_uncompleted_tasks)     AS total_uncompleted_tasks,

            -- Recalculate percentages from summed totals
            ROUND(
              AVG(tmd.completed_percentage), 2
            )                                    AS completed_percentage,

            ROUND(
              AVG(tmd.on_time_task_comp_per), 2
            )                                    AS on_time_task_comp_per,

            CASE 
              WHEN SUM(tmd.total_task) > 0 
              THEN ROUND(
                (SUM(tmd.total_completed_tasks) / SUM(tmd.total_task)) * 100, 2
              )
              ELSE 0 
            END                                  AS completion_percentage

          FROM tc_meeting_detail AS tmd
          WHERE 
            tmd.is_deleted = 0 
            AND tmd.user_id = ?
          GROUP BY 
            tmd.user_id,
            DATE(tmd.date)        -- ✅ one record per date
          ORDER BY date DESC
        `;

        db.query(sql, [id], (err, result) => {
          if (err) {
            return res.status(500).json({
              message: err.sqlMessage,
              error: true,
              data: {},
            });
          }
          if (result.length) {
            return res.status(200).json({
              message: "Record fetched",
              error: false,
              data: result,
            });
          } else {
            return res.status(404).json({
              message: "Not found",
              error: false,
              data: [],
            });
          }
        });
      } else {
        return res.status(400).json({
          message: "Invalid request",
          error: true,
          data: {},
        });
      }
    } catch (err) {
      return res.status(500).json({
        message: "Server error",
        error: true,
        data: {},
      });
    }
  },

  getStrategicparticipantsbyuserid: (req, res) => {
    try {
      const id = req.params?.id;

      if (!isNaN(parseInt(id))) {
        var sql = `SELECT 
    MAX(tmd.id)                              AS id,
    tmd.user_id,
    DATE(tmd.date)                           AS date,

    MAX(tmd.what_did_u_well)                 AS what_did_u_well,
    MAX(tmd.what_did_u_not_well)             AS what_did_u_not_well,
    MAX(tmd.what_can_u_do_diff)              AS what_can_u_do_diff,

    SUM(tmd.total_task)                      AS total_task,
    SUM(tmd.total_completed_tasks)           AS total_completed_tasks,
    SUM(tmd.total_uncompleted_tasks)         AS total_uncompleted_tasks,

    MAX(tmd.on_time)                         AS on_time,              -- ✅ aggregated
    ROUND(AVG(tmd.on_time_task_comp_per), 2) AS on_time_task_comp_per, -- ✅ aggregated

    CASE 
        WHEN SUM(tmd.total_task) > 0 
        THEN ROUND(
            (SUM(tmd.total_completed_tasks) / SUM(tmd.total_task)) * 100, 2
        )
        ELSE 0 
    END                                      AS completion_percentage

FROM st_meeting_detail AS tmd
WHERE 
    tmd.is_deleted = 0 
    AND tmd.user_id = ?
GROUP BY 
    tmd.user_id,
    DATE(tmd.date)
ORDER BY date DESC
`;

        db.query(sql, [id], (err, result) => {
          if (err) {
            return res.status(500).json({
              message: err.sqlMessage,
              error: true,
              data: {},
            });
          }
          if (result.length) {
            return res.status(200).json({
              message: "Record fetched",
              error: false,
              data: result,
            });
          } else {
            return res.status(404).json({
              message: "Not found",
              error: false,
              data: [],
            });
          }
        });
      } else {
        return res.status(400).json({
          message: "Invalid request",
          error: true,
          data: {},
        });
      }
    } catch (err) {
      return res.status(500).json({
        message: "Server error",
        error: true,
        data: {},
      });
    }
  },

  getTacticalparticipantsbyid: (req, res) => {
    try {
      const { date: queryDateFromQuery, department: departmentFromQuery } =
        req.query || {};
      const { date: queryDateFromParams, department: departmentFromParams } =
        req.params || {};

      const queryDate = queryDateFromQuery || queryDateFromParams;
      const department = departmentFromQuery || departmentFromParams;

      // Validate required parameters
      if (!queryDate || !department) {
        return res.status(400).json({
          message: "Date and department are required",
          error: true,
          data: {},
        });
      }

      const sqlDate = `
SELECT 
  om.id
FROM tc_meeting om
WHERE om.is_deleted = 0 
  AND om.date = ? 
  AND om.mst_department_id = ?`;

      db.query(sqlDate, [queryDate, department], (errDate, resultDate) => {
        if (errDate) {
          return res.status(500).json({
            message: errDate.sqlMessage,
            error: true,
            data: {},
          });
        }

        if (resultDate.length === 0) {
          return res.status(404).json({
            message: "No meeting found for the given date and department",
            error: true,
            data: {},
          });
        }

        const meeting_id = resultDate[0].id;

        // Check if meeting_id is valid
        if (!meeting_id || isNaN(parseInt(meeting_id))) {
          return res.status(400).json({
            message: "Invalid meeting ID",
            error: true,
            data: {},
          });
        }

        const sql = `SELECT 
  tmd.*,
  u.first_name, 
  u.last_name,  
  u.profile_picture,
  CASE 
    WHEN tmd.total_task > 0 
    THEN ROUND((tmd.total_completed_tasks / tmd.total_task) * 100, 2) 
    ELSE 0 
  END AS completion_percentage
FROM tc_meeting_detail AS tmd
LEFT JOIN users AS u ON u.id = tmd.user_id 
WHERE tmd.is_deleted = 0 
  AND tmd.meeting_id = ? 
  AND tmd.date = ?`;

        db.query(sql, [meeting_id, queryDate], (err, result) => {
          if (err) {
            return res.status(500).json({
              message: err.sqlMessage,
              error: true,
              data: {},
            });
          }

          if (result.length) {
            return res.status(200).json({
              message: "Record fetched successfully",
              error: false,
              data: result,
              meetingInfo: {
                meeting_id: meeting_id,
                current_date: queryDate,
              },
            });
          } else {
            return res.status(404).json({
              message: "No participants found for this meeting",
              error: false,
              data: [],
            });
          }
        });
      });
    } catch (err) {
      return res.status(500).json({
        message: "Server error: " + err.message,
        error: true,
        data: {},
      });
    }
  },
  getTacticaloutecomebyid: (req, res) => {
    try {
      const id = req.params?.id;

      if (parseInt(id) != NaN) {
        var sql = "select * from tc_meeting_detail where id = " + id + "";
        db.query(sql, (err, result) => {
          if (err) {
            res
              .status(200)
              .json({ message: err.sqlMessage, error: true, data: {} });
          } else if (result.length) {
            res
              .status(200)
              .json({ message: "Record fetched", error: false, data: result });
          } else {
            res
              .status(200)
              .json({ message: "Not found", error: false, data: [] });
          }
        });
      } else {
        res
          .status(200)
          .json({ message: "Invalid request", error: true, data: {} });
      }
    } catch (err) {
      res
        .status(200)
        .json({ message: "Invalid request", error: true, data: {} });
    }
  },

  operationalmeetingupdate: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.id);

    // Use parameterized queries to avoid SQL injection and syntax errors
    const selectSql = "SELECT * FROM `meeting` WHERE `id` = ?";

    db.query(selectSql, [id], (err, result) => {
      if (err) {
        const data = { error: true, message: err.sqlMessage, data: {} };
        return res.status(500).json(data); // Use 500 for server errors
      }
      const user_id = req?.user?.id;
      const participantsString = this_data.participants.join(",");

      const meeting = {
        department_name: this_data.department_name,
        date: this_data.date,
        facilator: this_data.facilator,
        participants: participantsString,
        updated_at: getCurrentDateAndTime(),
        updated_by: user_id,
      };

      const updateSql =
        "UPDATE `meeting` SET " +
        "`department_name` = ?, " +
        "`date` = ?, " +
        "`facilator` = ?, " +
        "`participants` = ?, " +
        "`updated_at` = ?, " +
        "`updated_by` = ? " +
        "WHERE `id` = ?";

      db.query(
        updateSql,
        [
          meeting.department_name,
          meeting.date,
          meeting.facilator,
          meeting.participants,
          meeting.updated_at,
          parseInt(meeting.updated_by),
          id,
        ],
        (err, result) => {
          if (err) {
            const data = { error: true, message: err.sqlMessage, data: {} };
            return res.status(500).json(data); // Use 500 for server errors
          }

          const response = {
            error: false,
            message: "meeting has been updated...",
            data: {},
          };

          res.status(200).json(response); // Use 200 for successful updates
        },
      );
    });
  },

  gettaskByTeamid: async function (req, res) {
    const id = req.params?.id;

    //get current user
    var sql = `SELECT DISTINCT 
    t.id, 
    t.contributon,
    t.assign_to, 
    t.date, 
    t.status, 
    t.task, 
    t.priority,
    GROUP_CONCAT(DISTINCT at.profile_picture) AS assign_to_profiles,
    GROUP_CONCAT(DISTINCT cu.profile_picture) AS contribution_profiles
FROM 
    todos AS t
LEFT JOIN users AS at
    ON FIND_IN_SET(at.id, REPLACE(REPLACE(REPLACE(t.assign_to, '[', ''), ']', ''), ')', '')) > 0
LEFT JOIN users AS cu
    ON FIND_IN_SET(cu.id, REPLACE(REPLACE(REPLACE(t.contributon, '[', ''), ']', ''), ')', '')) > 0
WHERE 
    FIND_IN_SET(?, REPLACE(REPLACE(t.assign_to, '[', ''), ']', '')) > 0
    AND t.is_deleted = 0
GROUP BY 
    t.id, 
    t.contributon,
    t.assign_to, 
    t.date, 
    t.status, 
    t.task, 
    t.priority
ORDER BY 
    t.id DESC;
 `;

    db.query(sql, [id], function (err, result) {
      if (err) {
        var data = { error: true, message: err.sqlMessage, data: {} };
        res.status(201).send(data);
      } else {
        if (result.length > 0) {
          var data = {
            error: false,
            message: "Recoard fetched successfully",
            data: result,
          };
          res.status(201).send(data);
        } else {
          var data = { error: false, message: "Not found", data: [] };
          res.status(201).json(data);
        }
      }
    });
  },

  fetchtaskperformancelistbyid: (req, res) => {
    try {
      const id = req.params?.id;

      if (parseInt(id) != NaN) {
        var sql =
          "select p.*,  u.first_name,u.last_name  from participants as p  left join users as u on u.id = p.participant where p.is_deleted = 0   and p.participant=" +
          id +
          "";
        db.query(sql, (err, result) => {
          if (err) {
            res
              .status(200)
              .json({ message: err.sqlMessage, error: true, data: {} });
          } else if (result.length) {
            res
              .status(200)
              .json({ message: "Record fetched", error: false, data: result });
          } else {
            res
              .status(200)
              .json({ message: "Not found", error: false, data: [] });
          }
        });
      } else {
        res
          .status(200)
          .json({ message: "Invalid request", error: true, data: {} });
      }
    } catch (err) {
      res
        .status(200)
        .json({ message: "Invalid request", error: true, data: {} });
    }
  },
  getAllattendance: async function (req, res) {
    var sql =
      "select a.*,TIME_FORMAT(checkin, '%h:%i %p') AS formatted_checkin, TIME_FORMAT(checkout, '%h:%i %p') AS formatted_checkout, TIMESTAMPDIFF(MINUTE, breakin, breakout) AS total_break_minutes,u.first_name,u.last_name from attendance as a left join users as u on u.id = a.user_id ";

    db.query(sql, function (err, result) {
      if (err) {
        var data = { error: true, message: err.sqlMessage, data: {} };
        res.status(201).send(data);
      } else {
        if (result.length > 0) {
          var data = {
            error: false,
            message: "Recoard fetched successfully",
            data: result,
          };
          res.status(201).send(data);
        } else {
          var data = { error: false, message: "Not found", data: [] };
          res.status(201).json(data);
        }
      }
    });
  },

  generateOperatingMeeting: async function (req, res) {
    try {
      const todayDate = moment().format("YYYY-MM-DD");

      // Check if a meeting already exists for today
      const checkMeetingExistsSQL = `
        SELECT id FROM op_meeting 
        WHERE date = ? AND is_deleted = 0
        LIMIT 1
      `;

      db.query(
        checkMeetingExistsSQL,
        [todayDate],
        function (err, existingMeeting) {
          if (err) {
            return res
              .status(500)
              .json({ error: true, message: err.sqlMessage, data: {} });
          }

          if (existingMeeting.length > 0) {
            return res.status(400).json({
              error: true,
              message: "Meeting already generated for today.",
              data: {},
            });
          }

          // Fetch the last meeting date before today
          const fetchLastDateSQL = `
          SELECT DATE_FORMAT(date, '%Y-%m-%d') AS formatted_date
          FROM op_meeting
          WHERE is_deleted = 0 AND date < ?
          ORDER BY date DESC
          LIMIT 1
        `;

          db.query(
            fetchLastDateSQL,
            [todayDate],
            function (err, lastDateResult) {
              if (err) {
                return res
                  .status(500)
                  .json({ error: true, message: err.sqlMessage, data: {} });
              }

              const lastMeetingDate =
                lastDateResult.length > 0
                  ? lastDateResult[0].formatted_date
                  : null;

              if (!lastMeetingDate) {
                return res.status(404).json({
                  error: true,
                  message: "No previous meeting date found.",
                  data: {},
                });
              }

              // Fetch task stats from the last meeting date
              const fetchTaskStatsSQL = `
            SELECT 
              assign_to,
              COUNT(CASE WHEN status = 1 THEN 1 END) AS total_completed_tasks,
              COUNT(CASE WHEN status = 0 THEN 1 END) AS total_uncompleted_tasks
            FROM todos
            WHERE due_date = ? AND is_deleted = 0
            GROUP BY assign_to
          `;

              db.query(
                fetchTaskStatsSQL,
                [lastMeetingDate],
                function (err, taskStatsResult) {
                  if (err) {
                    return res
                      .status(500)
                      .json({ error: true, message: err.sqlMessage, data: {} });
                  }

                  // Fetch meeting templates from mst_meeting
                  const fetchMeetingsFromMasterSQL = `
              SELECT id, mst_department_id, facilator, participants, status 
              FROM mst_meeting 
              WHERE status = 0
            `;

                  db.query(
                    fetchMeetingsFromMasterSQL,
                    function (err, masterMeetings) {
                      if (err) {
                        return res.status(500).json({
                          error: true,
                          message: err.sqlMessage,
                          data: {},
                        });
                      }

                      if (masterMeetings.length === 0) {
                        return res.status(400).json({
                          error: true,
                          message: "No active meetings found in master list.",
                          data: {},
                        });
                      }

                      const insertValues = masterMeetings.map(
                        ({ mst_department_id, facilator, participants }) => [
                          mst_department_id,
                          todayDate,
                          facilator,
                          participants,
                          new Date(),
                          0,
                        ],
                      );

                      const insertSQL = `
                INSERT INTO op_meeting 
                (mst_department_id, date, facilator, participants, created_at, is_deleted)
                VALUES ?
              `;

                      db.query(
                        insertSQL,
                        [insertValues],
                        function (err, result) {
                          if (err) {
                            return res.status(500).json({
                              error: true,
                              message: err.sqlMessage,
                              data: {},
                            });
                          }

                          const firstMeetingId = result.insertId;
                          const affectedRows = result.affectedRows;
                          const meetingIds = Array.from(
                            { length: affectedRows },
                            (_, index) => firstMeetingId + index,
                          );

                          // Build participant data for op_meeting_detail
                          const meetingParticipants = masterMeetings.map(
                            (meeting, i) => ({
                              meetingId: meetingIds[i],
                              facilitator: meeting.facilator,
                              participants: meeting.participants.split(","),
                            }),
                          );

                          const participantRows = meetingParticipants.flatMap(
                            ({ meetingId, facilitator, participants }) => {
                              const uniqueUsers = new Set([
                                ...participants,
                                facilitator,
                              ]);
                              // participants.map((participant) => {
                              return Array.from(uniqueUsers).map((userId) => {
                                const taskStats = taskStatsResult.find(
                                  (stat) => stat.assign_to == userId,
                                );
                                const totalCompletedTasks = taskStats
                                  ? taskStats.total_completed_tasks
                                  : 0;
                                const totalUncompletedTasks = taskStats
                                  ? taskStats.total_uncompleted_tasks
                                  : 0;

                                return [
                                  meetingId,
                                  new Date(),
                                  facilitator,
                                  userId,
                                  new Date(),
                                  null,
                                  null,
                                  0,
                                  totalCompletedTasks,
                                  totalUncompletedTasks,
                                ];
                              });
                            },
                          );

                          db.query(
                            `INSERT INTO op_meeting_detail 
                  (meeting_id, date, facilator, user_id, created_at, updated_at, updated_by, is_deleted, total_completed_tasks, total_uncompleted_tasks) 
                  VALUES ?`,
                            [participantRows],
                            function (err) {
                              if (err) {
                                return res.status(500).json({
                                  error: true,
                                  message: err.sqlMessage,
                                  data: {},
                                });
                              }

                              res.status(201).json({
                                error: false,
                                message:
                                  "Operational meetings, participants, and task stats fetched successfully.",
                                data: {
                                  meetingIds,
                                  lastMeetingDate,
                                  taskStats: taskStatsResult,
                                },
                              });
                            },
                          );
                        },
                      );
                    },
                  );
                },
              );
            },
          );
        },
      );
    } catch (err) {
      res.status(500).json({ error: true, message: err.message, data: {} });
    }
  },

  getProject: async function (req, res) {
    var sql = "select * from mst_project_details where is_deleted = 0";

    db.query(sql, function (err, result) {
      if (err) {
        res
          .status(201)
          .json({ error: true, message: err.sqlMessage, data: {} });
      } else {
        if (result.length > 0) {
          res
            .status(201)
            .json({ error: false, message: "Record fetched", data: result });
        } else {
          res
            .status(201)
            .json({ error: false, message: "Not found", data: [] });
        }
      }
    });
  },

  getStage: async function (req, res) {
    var sql = `select nmf.id,nmf.case_id,u.first_name,u.last_name
from new_mst_file as nmf
left join users as u
on u.id= nmf.client_id
where nmf.is_deleted = 0
`;

    db.query(sql, function (err, result) {
      if (err) {
        res
          .status(201)
          .json({ error: true, message: err.sqlMessage, data: {} });
      } else {
        if (result.length > 0) {
          res
            .status(201)
            .json({ error: false, message: "Record fetched", data: result });
        } else {
          res
            .status(201)
            .json({ error: false, message: "Not found", data: [] });
        }
      }
    });
  },

  // Tactical Meeting

  getTacticalmeeting: async function (req, res) {
    const { date } = req.query;

    const parseDateToSQL = (input) => {
      if (!input) return getCurrentDate();
      const str = String(input).trim();
      if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.substring(0, 10);
      if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
        const [d, m, y] = str.split("-");
        return `${y}-${m}-${d}`;
      }
      const tryDate = new Date(input);
      if (!isNaN(tryDate.getTime())) {
        const yyyy = tryDate.getFullYear();
        const mm = String(tryDate.getMonth() + 1).padStart(2, "0");
        const dd = String(tryDate.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
      }
      const m = str.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
      if (m) {
        const day = String(m[1]).padStart(2, "0");
        const mon = m[2].slice(0, 3).toLowerCase();
        const months = {
          jan: 1,
          feb: 2,
          mar: 3,
          apr: 4,
          may: 5,
          jun: 6,
          jul: 7,
          aug: 8,
          sep: 9,
          oct: 10,
          nov: 11,
          dec: 12,
        };
        const monthNum = months[mon];
        if (monthNum) {
          return `${m[3]}-${String(monthNum).padStart(2, "0")}-${day}`;
        }
      }
      return null;
    };

    const selectedDate = parseDateToSQL(date);
    if (date && !selectedDate) {
      return res.status(400).send({
        error: true,
        message:
          "Invalid date format. Use YYYY-MM-DD or 'DD Mon YYYY' (e.g., '27 Dec 2025').",
        data: {},
      });
    }

    var sql = `SELECT id, DATE_FORMAT(date, '%Y-%m-%d') AS date
FROM tc_meeting
WHERE is_deleted = 0 
  AND date < ?
ORDER BY date DESC
LIMIT 1`;

    var sql2 = `SELECT  
    tm.*,
    u.first_name AS facilitator_first_name,
    md.name as department_name,
    u.last_name AS facilitator_last_name, 
    (SELECT GROUP_CONCAT(DISTINCT u2.profile_picture) 
     FROM users u2 
     WHERE FIND_IN_SET(u2.id, tm.participants)) AS participants_pictures,
    COUNT(DISTINCT t.id) AS total_tasks,
    SUM(CASE WHEN t.status = 1 THEN 1 ELSE 0 END) AS completed_tasks,
    SUM(CASE WHEN t.status = 1 AND DATE(t.updated_at) <= DATE(t.due_date) THEN 1 ELSE 0 END) AS on_time_completed,
    CASE 
        WHEN COUNT(DISTINCT t.id) = 0 THEN 0
        ELSE ROUND((SUM(CASE WHEN t.status = 1 THEN 1 ELSE 0 END) / COUNT(DISTINCT t.id)) * 100, 2)
    END AS completed_percentage,
    CASE 
        WHEN SUM(CASE WHEN t.status = 1 THEN 1 ELSE 0 END) = 0 THEN 0
        ELSE ROUND((SUM(CASE WHEN t.status = 1 AND DATE(t.updated_at) <= DATE(t.due_date) THEN 1 ELSE 0 END) / SUM(CASE WHEN t.status = 1 THEN 1 ELSE 0 END)) * 100, 2)
    END AS on_time_percentage
FROM tc_meeting AS tm 
LEFT JOIN users AS u ON u.id = tm.facilator 
LEFT JOIN mst_department AS md ON md.id = tm.mst_department_id
LEFT JOIN todos AS t ON t.mst_department_id = tm.mst_department_id
    AND t.is_deleted = 0
    AND DATE(t.created_at) > ?
    AND DATE(t.created_at) <= ? 
WHERE DATE(tm.date) = ?
GROUP BY tm.id, tm.date, tm.mst_department_id, tm.facilator, tm.participants, 
         u.first_name, u.last_name, md.name
ORDER BY tm.id DESC`;

    var sql3 = `SELECT 
    COUNT(t.id) AS total_tasks,
    SUM(CASE WHEN t.status = 1 THEN 1 ELSE 0 END) AS completed_tasks,
    SUM(CASE WHEN t.status = 1 AND DATE(t.updated_at) <= DATE(t.due_date) THEN 1 ELSE 0 END) AS on_time_completed,
      ROUND(
        (SUM(CASE WHEN t.status = 1 THEN 1 ELSE 0 END) / NULLIF(COUNT(t.id), 0)) * 100, 
        2
    ) AS completed_percentage,
    ROUND(
        (SUM(CASE WHEN t.status = 1 AND DATE(t.updated_at) <= DATE(t.due_date) THEN 1 ELSE 0 END) / NULLIF(SUM(CASE WHEN t.status = 1 THEN 1 ELSE 0 END), 0)) * 100, 
        2
    ) AS on_time_rate_percentage
FROM todos AS t
WHERE t.is_deleted = 0 
  AND DATE(t.date) > ?
  AND DATE(t.date) <= ?`;

    db.query(sql, [selectedDate], function (err, prevDateResult) {
      if (err) {
        return res
          .status(500)
          .send({ error: true, message: err.sqlMessage, data: {} });
      }

      const previousDate =
        prevDateResult.length > 0 ? prevDateResult[0].date : selectedDate;

      // Step 2: Get meeting details with tasks
      db.query(
        sql2,
        [previousDate, selectedDate, selectedDate],
        function (err2, meetingResult) {
          if (err2) {
            return res
              .status(500)
              .send({ error: true, message: err2.sqlMessage, data: {} });
          }

          // Step 3: Get aggregated task statistics
          db.query(
            sql3,
            [previousDate, selectedDate],
            function (err3, taskStats) {
              if (err3) {
                return res
                  .status(500)
                  .send({ error: true, message: err3.sqlMessage, data: {} });
              }

              if (meetingResult.length > 0) {
                res.status(200).send({
                  error: false,
                  message: "Record fetched successfully",
                  data: meetingResult,
                  previousMeetingDate: previousDate,
                  aggregatedStats: taskStats[0] || {
                    total_tasks: 0,
                    completed_tasks: 0,
                    on_time_completed: 0,
                    completed_percentage: 0,
                    on_time_percentage: 0,
                  },
                });
              } else {
                res.status(200).send({
                  error: false,
                  message: "Not found",
                  data: [],
                  previousMeetingDate: previousDate,
                  aggregatedStats: taskStats[0] || {
                    total_tasks: 0,
                    completed_tasks: 0,
                    on_time_completed: 0,
                    completed_percentage: 0,
                    on_time_percentage: 0,
                  },
                });
              }
            },
          );
        },
      );
    });
  },

  getEmpTacticalMeeting: async function (req, res) {
    const user_id = req.user.id;
    const { date } = req.query;

    const parseDateToSQL = (input) => {
      if (!input) return getCurrentDate();
      const str = String(input).trim();
      if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.substring(0, 10);
      if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
        const [d, m, y] = str.split("-");
        return `${y}-${m}-${d}`;
      }
      const tryDate = new Date(input);
      if (!isNaN(tryDate.getTime())) {
        const yyyy = tryDate.getFullYear();
        const mm = String(tryDate.getMonth() + 1).padStart(2, "0");
        const dd = String(tryDate.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
      }
      const m = str.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
      if (m) {
        const day = String(m[1]).padStart(2, "0");
        const mon = m[2].slice(0, 3).toLowerCase();
        const months = {
          jan: 1,
          feb: 2,
          mar: 3,
          apr: 4,
          may: 5,
          jun: 6,
          jul: 7,
          aug: 8,
          sep: 9,
          oct: 10,
          nov: 11,
          dec: 12,
        };
        const monthNum = months[mon];
        if (monthNum) {
          return `${m[3]}-${String(monthNum).padStart(2, "0")}-${day}`;
        }
      }
      return null;
    };

    const selectedDate = parseDateToSQL(date);
    if (date && !selectedDate) {
      return res.status(400).send({
        error: true,
        message:
          "Invalid date format. Use YYYY-MM-DD or 'DD Mon YYYY' (e.g., '27 Dec 2025').",
        data: {},
      });
    }

    var sql = `SELECT id, DATE_FORMAT(date, '%Y-%m-%d') AS date
FROM tc_meeting
WHERE is_deleted = 0 
  AND date < ?
ORDER BY date DESC
LIMIT 1`;

    //get current user
    var sql2 = `SELECT  
    tm.*,
    u.first_name AS facilitator_first_name,
    md.name as department_name,
    u.last_name AS facilitator_last_name, 
    (SELECT GROUP_CONCAT(DISTINCT u2.profile_picture) 
     FROM users u2 
     WHERE FIND_IN_SET(u2.id, tm.participants)) AS participants_pictures,
    COUNT(DISTINCT t.id) AS total_tasks,
    SUM(CASE WHEN t.status = 1 THEN 1 ELSE 0 END) AS completed_tasks,
    SUM(CASE WHEN t.status = 1 AND DATE(t.updated_at) <= DATE(t.due_date) THEN 1 ELSE 0 END) AS on_time_completed,
    CASE 
        WHEN COUNT(DISTINCT t.id) = 0 THEN 0
        ELSE ROUND((SUM(CASE WHEN t.status = 1 THEN 1 ELSE 0 END) / COUNT(DISTINCT t.id)) * 100, 2)
    END AS completed_percentage,
    CASE 
        WHEN SUM(CASE WHEN t.status = 1 THEN 1 ELSE 0 END) = 0 THEN 0
        ELSE ROUND((SUM(CASE WHEN t.status = 1 AND DATE(t.updated_at) <= DATE(t.due_date) THEN 1 ELSE 0 END) / SUM(CASE WHEN t.status = 1 THEN 1 ELSE 0 END)) * 100, 2)
    END AS on_time_percentage
FROM tc_meeting AS tm 
LEFT JOIN users AS u ON u.id = tm.facilator 
LEFT JOIN mst_department AS md ON md.id = tm.mst_department_id
LEFT JOIN todos AS t ON t.mst_department_id = tm.mst_department_id
    AND t.is_deleted = 0
    AND DATE(t.created_at) > ?
    AND DATE(t.created_at) <= ? 
WHERE DATE(tm.date) = ? AND  FIND_IN_SET(?, tm.participants) 
GROUP BY tm.id, tm.date, tm.mst_department_id, tm.facilator, tm.participants, 
         u.first_name, u.last_name, md.name
ORDER BY tm.id DESC`;

    var sql3 = `SELECT 
    COUNT(t.id) AS total_tasks,
    SUM(CASE WHEN t.status = 1 THEN 1 ELSE 0 END) AS completed_tasks,
    SUM(CASE WHEN t.status = 1 AND DATE(t.updated_at) <= DATE(t.due_date) THEN 1 ELSE 0 END) AS on_time_completed,
      ROUND(
        (SUM(CASE WHEN t.status = 1 THEN 1 ELSE 0 END) / NULLIF(COUNT(t.id), 0)) * 100, 
        2
    ) AS completed_percentage,
    ROUND(
        (SUM(CASE WHEN t.status = 1 AND DATE(t.updated_at) <= DATE(t.due_date) THEN 1 ELSE 0 END) / NULLIF(SUM(CASE WHEN t.status = 1 THEN 1 ELSE 0 END), 0)) * 100, 
        2
    ) AS on_time_rate_percentage
FROM todos AS t
WHERE t.is_deleted = 0 
  AND DATE(t.date) > ?
  AND DATE(t.date) <= ? AND t.assign_to = ?`;

    db.query(sql, [selectedDate], function (err, prevDateResult) {
      if (err) {
        return res
          .status(500)
          .send({ error: true, message: err.sqlMessage, data: {} });
      }

      const previousDate =
        prevDateResult.length > 0 ? prevDateResult[0].date : selectedDate;

      // Step 2: Get meeting details with tasks
      db.query(
        sql2,
        [previousDate, selectedDate, selectedDate, user_id, user_id],
        function (err2, meetingResult) {
          if (err2) {
            return res
              .status(500)
              .send({ error: true, message: err2.sqlMessage, data: {} });
          }

          // Step 3: Get aggregated task statistics
          db.query(
            sql3,
            [previousDate, selectedDate, user_id, user_id],
            function (err3, taskStats) {
              if (err3) {
                return res
                  .status(500)
                  .send({ error: true, message: err3.sqlMessage, data: {} });
              }

              if (meetingResult.length > 0) {
                res.status(200).send({
                  error: false,
                  message: "Record fetched successfully",
                  data: meetingResult,
                  previousMeetingDate: previousDate,
                  aggregatedStats: taskStats[0] || {
                    total_tasks: 0,
                    completed_tasks: 0,
                    on_time_completed: 0,
                    completed_percentage: 0,
                    on_time_percentage: 0,
                  },
                });
              } else {
                res.status(200).send({
                  error: false,
                  message: "Not found",
                  data: [],
                  previousMeetingDate: previousDate,
                  aggregatedStats: taskStats[0] || {
                    total_tasks: 0,
                    completed_tasks: 0,
                    on_time_completed: 0,
                    completed_percentage: 0,
                    on_time_percentage: 0,
                  },
                });
              }
            },
          );
        },
      );
    });
  },

  getHodTacticalMeeting: async function (req, res) {
    const user_id = req.user.id;
    const { date } = req.query;

    const parseDateToSQL = (input) => {
      if (!input) return getCurrentDate();
      const str = String(input).trim();
      if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.substring(0, 10);
      if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
        const [d, m, y] = str.split("-");
        return `${y}-${m}-${d}`;
      }
      const tryDate = new Date(input);
      if (!isNaN(tryDate.getTime())) {
        const yyyy = tryDate.getFullYear();
        const mm = String(tryDate.getMonth() + 1).padStart(2, "0");
        const dd = String(tryDate.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
      }
      const m = str.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
      if (m) {
        const day = String(m[1]).padStart(2, "0");
        const mon = m[2].slice(0, 3).toLowerCase();
        const months = {
          jan: 1,
          feb: 2,
          mar: 3,
          apr: 4,
          may: 5,
          jun: 6,
          jul: 7,
          aug: 8,
          sep: 9,
          oct: 10,
          nov: 11,
          dec: 12,
        };
        const monthNum = months[mon];
        if (monthNum) {
          return `${m[3]}-${String(monthNum).padStart(2, "0")}-${day}`;
        }
      }
      return null;
    };

    const selectedDate = parseDateToSQL(date);
    if (date && !selectedDate) {
      return res.status(400).send({
        error: true,
        message:
          "Invalid date format. Use YYYY-MM-DD or 'DD Mon YYYY' (e.g., '27 Dec 2025').",
        data: {},
      });
    }

    var sql = `SELECT id, DATE_FORMAT(date, '%Y-%m-%d') AS date
FROM tc_meeting
WHERE is_deleted = 0 
  AND date < ?
ORDER BY date DESC
LIMIT 1`;

    var sql2 = `SELECT  
    tm.*,
    u.first_name AS facilitator_first_name,
    md.name as department_name,
    u.last_name AS facilitator_last_name, 
    (SELECT GROUP_CONCAT(DISTINCT u2.profile_picture) 
     FROM users u2 
     WHERE FIND_IN_SET(u2.id, tm.participants)) AS participants_pictures,
    COUNT(DISTINCT t.id) AS total_tasks,
    SUM(CASE WHEN t.status = 1 THEN 1 ELSE 0 END) AS completed_tasks,
    SUM(CASE WHEN t.status = 1 AND DATE(t.updated_at) <= DATE(t.due_date) THEN 1 ELSE 0 END) AS on_time_completed,
    CASE 
        WHEN COUNT(DISTINCT t.id) = 0 THEN 0
        ELSE ROUND((SUM(CASE WHEN t.status = 1 THEN 1 ELSE 0 END) / COUNT(DISTINCT t.id)) * 100, 2)
    END AS completed_percentage,
    CASE 
        WHEN SUM(CASE WHEN t.status = 1 THEN 1 ELSE 0 END) = 0 THEN 0
        ELSE ROUND((SUM(CASE WHEN t.status = 1 AND DATE(t.updated_at) <= DATE(t.due_date) THEN 1 ELSE 0 END) / SUM(CASE WHEN t.status = 1 THEN 1 ELSE 0 END)) * 100, 2)
    END AS on_time_percentage
FROM tc_meeting AS tm 
LEFT JOIN users AS u ON u.id = tm.facilator 
LEFT JOIN mst_department AS md ON md.id = tm.mst_department_id
LEFT JOIN todos AS t ON t.mst_department_id = tm.mst_department_id
    AND t.is_deleted = 0
    AND DATE(t.created_at) > ?
    AND DATE(t.created_at) <= ? 
WHERE DATE(tm.date) = ? AND (tm.facilator = ? OR FIND_IN_SET(?, tm.participants) )
GROUP BY tm.id, tm.date, tm.mst_department_id, tm.facilator, tm.participants, 
         u.first_name, u.last_name, md.name
ORDER BY tm.id DESC`;

    var sql3 = `SELECT 
    COUNT(t.id) AS total_tasks,
    SUM(CASE WHEN t.status = 1 THEN 1 ELSE 0 END) AS completed_tasks,
    SUM(CASE WHEN t.status = 1 AND DATE(t.updated_at) <= DATE(t.due_date) THEN 1 ELSE 0 END) AS on_time_completed,
      ROUND(
        (SUM(CASE WHEN t.status = 1 THEN 1 ELSE 0 END) / NULLIF(COUNT(t.id), 0)) * 100, 
        2
    ) AS completed_percentage,
    ROUND(
        (SUM(CASE WHEN t.status = 1 AND DATE(t.updated_at) <= DATE(t.due_date) THEN 1 ELSE 0 END) / NULLIF(SUM(CASE WHEN t.status = 1 THEN 1 ELSE 0 END), 0)) * 100, 
        2
    ) AS on_time_rate_percentage
FROM todos AS t
WHERE t.is_deleted = 0 
  AND DATE(t.date) > ?
  AND DATE(t.date) <= ? AND  (t.userid = ? OR t.assign_to = ?)`;

    db.query(sql, [selectedDate], function (err, prevDateResult) {
      if (err) {
        return res
          .status(500)
          .send({ error: true, message: err.sqlMessage, data: {} });
      }

      const previousDate =
        prevDateResult.length > 0 ? prevDateResult[0].date : selectedDate;

      // Step 2: Get meeting details with tasks
      db.query(
        sql2,
        [previousDate, selectedDate, selectedDate, user_id, user_id],
        function (err2, meetingResult) {
          if (err2) {
            return res
              .status(500)
              .send({ error: true, message: err2.sqlMessage, data: {} });
          }

          // Step 3: Get aggregated task statistics
          db.query(
            sql3,
            [previousDate, selectedDate, user_id, user_id],
            function (err3, taskStats) {
              if (err3) {
                return res
                  .status(500)
                  .send({ error: true, message: err3.sqlMessage, data: {} });
              }

              if (meetingResult.length > 0) {
                res.status(200).send({
                  error: false,
                  message: "Record fetched successfully",
                  data: meetingResult,
                  previousMeetingDate: previousDate,
                  aggregatedStats: taskStats[0] || {
                    total_tasks: 0,
                    completed_tasks: 0,
                    on_time_completed: 0,
                    completed_percentage: 0,
                    on_time_percentage: 0,
                  },
                });
              } else {
                res.status(200).send({
                  error: false,
                  message: "Not found",
                  data: [],
                  previousMeetingDate: previousDate,
                  aggregatedStats: taskStats[0] || {
                    total_tasks: 0,
                    completed_tasks: 0,
                    on_time_completed: 0,
                    completed_percentage: 0,
                    on_time_percentage: 0,
                  },
                });
              }
            },
          );
        },
      );
    });
  },
  generateTacticalMeeting: async function (req, res) {
    try {
      const todayDate = moment().format("YYYY-MM-DD");

      const checkMeetingExistsSQL = `
      SELECT id, date
      FROM tc_meeting
      WHERE is_deleted = 0
      ORDER BY date DESC
      LIMIT 1
      `;
      db.query(checkMeetingExistsSQL, function (err, existingMeeting) {
        if (err) {
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }
        if (existingMeeting.length > 0) {
          const lastMeetingDate = moment(existingMeeting[0].date, "YYYY-MM-DD");
          const today = moment();

          const isSameDay = today.isSame(lastMeetingDate, "day");

          if (isSameDay) {
            return res.status(400).json({
              error: true,
              message: `Meeting has already been generated today.`,
              data: {},
            });
          }
        }

        const fetchTaskStatsSQL = `
        SELECT 
        assign_to,
        COUNT(*) AS total_tasks,
        COUNT(CASE WHEN status = 1 THEN 1 END) AS total_completed_tasks,
        COUNT(CASE WHEN status = 0 THEN 1 END) AS total_uncompleted_tasks,
        ROUND(
        (COUNT(CASE WHEN status = 1 THEN 1 END) / COUNT(*)) * 100, 
        2
        ) AS completed_percentage
        FROM todos
        WHERE due_date BETWEEN DATE_SUB(CURDATE(), INTERVAL 15 DAY) AND CURDATE()
        AND is_deleted = 0
        GROUP BY assign_to;

        `;

        db.query(fetchTaskStatsSQL, function (err, taskStatsResult) {
          if (err) {
            return res
              .status(500)
              .json({ error: true, message: err.sqlMessage, data: {} });
          }

          const fetchontime = `SELECT
          COUNT(t.id) AS total_task,
          t.assign_to,
            COUNT(CASE WHEN t.status = 1 AND DATE(t.due_date) = DATE(tc.created_at) THEN 1 END) AS on_time_completed_task,
            ROUND(
          (COUNT(CASE WHEN t.status = 1 AND DATE(t.due_date) = DATE(tc.created_at) THEN 1 END) /
          NULLIF(COUNT(t.id), 0)) * 100, 
          2
        ) AS on_time_completion_percentage
      FROM todos as t
      LEFT JOIN todos_counter AS tc ON tc.todos_id = t.id
      WHERE t.due_date BETWEEN DATE_SUB(CURDATE(), INTERVAL 15 DAY) AND CURDATE() AND
      t.is_deleted = 0 
          AND t.due_date <= CURDATE()
          GROUP BY t.assign_to`;

          db.query(fetchontime, function (err, taskonTimeResult) {
            if (err) {
              return res
                .status(500)
                .json({ error: true, message: err.sqlMessage, data: {} });
            }

            const fetchMeetingsFromMasterSQL = `
              SELECT id, mst_department_id, facilator, participants, status 
              FROM mst_meeting 
              WHERE status = 0
            `;

            db.query(
              fetchMeetingsFromMasterSQL,
              function (err, masterMeetings) {
                if (err) {
                  return res
                    .status(500)
                    .json({ error: true, message: err.sqlMessage, data: {} });
                }

                if (masterMeetings.length === 0) {
                  return res.status(400).json({
                    error: true,
                    message: "No active meetings found in master list.",
                    data: {},
                  });
                }

                const insertValues = masterMeetings.map(
                  ({ mst_department_id, facilator, participants }) => [
                    mst_department_id,
                    todayDate,
                    facilator,
                    participants,
                    new Date(),
                    0,
                  ],
                );

                const sql = `
            INSERT INTO tc_meeting 
            (mst_department_id, date, facilator, participants, created_at, is_deleted)
            VALUES ?
            `;

                db.query(sql, [insertValues], function (err, result) {
                  if (err) {
                    return res
                      .status(500)
                      .json({ error: true, message: err.sqlMessage, data: {} });
                  }
                  const firstMeetingId = result.insertId;
                  const affectedRows = result.affectedRows;

                  const meetingIds = Array.from(
                    { length: affectedRows },
                    (_, index) => firstMeetingId + index,
                  );

                  const meetingParticipants = masterMeetings.map(
                    (meeting, i) => ({
                      meetingId: meetingIds[i],
                      facilitator: meeting.facilator,
                      participants: meeting.participants.split(","),
                    }),
                  );

                  const participantRows = meetingParticipants.flatMap(
                    ({ meetingId, facilitator, participants }) => {
                      const uniqueUsers = new Set([
                        ...participants,
                        facilitator,
                      ]);
                      return Array.from(uniqueUsers).map((userId) => {
                        const taskStats = taskStatsResult.find(
                          (stat) => stat.assign_to == userId,
                        );
                        const taskOntime = taskonTimeResult.find(
                          (stat) => stat.assign_to == userId,
                        );

                        const totalTasks = taskStats
                          ? taskStats.total_tasks
                          : 0;
                        const totalCompletedTasks = taskStats
                          ? taskStats.total_completed_tasks
                          : 0;

                        const totalComppercentTasks = taskStats
                          ? taskStats.completed_percentage
                          : 0;
                        const totalUncompletedTasks = taskStats
                          ? taskStats.total_uncompleted_tasks
                          : 0;

                        const ontime = taskOntime
                          ? taskOntime.on_time_completion_percentage
                          : 0;
                        const ontimeComppercentTasks = taskStats
                          ? taskStats.completed_percentage
                          : 0;

                        return [
                          meetingId,
                          new Date(),
                          facilitator,
                          userId,
                          new Date(),
                          null,
                          null,
                          0,
                          totalTasks,
                          totalCompletedTasks,
                          totalComppercentTasks,
                          totalUncompletedTasks,
                          ontime,
                          ontimeComppercentTasks,
                        ];
                      });
                    },
                  );
                  db.query(
                    "INSERT INTO tc_meeting_detail (meeting_id,date,facilator, user_id, created_at, updated_at, updated_by, is_deleted,total_task,total_completed_tasks,completed_percentage, total_uncompleted_tasks,on_time,on_time_task_comp_per) VALUES ?",
                    [participantRows],
                    function (err) {
                      if (err) {
                        return res.status(500).json({
                          error: true,
                          message: err.sqlMessage,
                          data: {},
                        });
                      }
                      res.status(201).json({
                        error: false,
                        message:
                          "Tactical meetings and participants added successfully.",
                        data: meetingIds,
                      });
                    },
                  );
                });
              },
            );
          });
        });
      });
    } catch (err) {
      res.status(500).json({ error: true, message: err.message, data: {} });
    }
  },

  fetchdashboardtaskforAdmin: async function (req, res) {
    var sql = `SELECT DISTINCT 
      t.id, 
      t.contributon,
      t.assign_to,
      DATE_FORMAT(t.due_date, '%d %b %Y') AS due_date,
      t.counter,
      t.status, 
      t.task, 
      t.priority,
      nemf.case_id,
      snmf.case_id as caseId,
      nemf.project_name,
      ucd.first_name AS client_name,
      ceu.first_name as cllii_name,
      su.first_name as sclient_name,
      at.first_name AS assign_name,
      cu.first_name AS contributon_name,
      GROUP_CONCAT(DISTINCT at.profile_picture) AS assign_to_profiles,
      GROUP_CONCAT(DISTINCT cu.profile_picture) AS contribution_profiles
      FROM 
      todos AS t
      LEFT JOIN users AS at
      ON FIND_IN_SET(at.id, REPLACE(REPLACE(REPLACE(t.assign_to, '[', ''), ']', ''), ')', '')) > 0
      LEFT JOIN users AS cu
      ON FIND_IN_SET(cu.id, REPLACE(REPLACE(REPLACE(t.contributon, '[', ''), ']', ''), ')', '')) > 0
      LEFT JOIN new_mst_file AS nmf 
      ON nmf.id = t.project_id
      LEFT JOIN users AS ucd 
      ON ucd.id = nmf.client_id
      left join new_mst_file_details as nmfd
      on nmfd.id = t.file_id
      LEFT JOIN new_mst_file AS nemf 
      ON nemf.id =  nmfd.project_id
      left join users as ceu
      on ceu.id = nemf.client_id
      left join schedule as s
      on s.id = t.schedule_id
      left join new_mst_file as snmf
      on snmf.id = s.source_id
      left join users as su 
      on su.id = snmf.client_id
      WHERE 
      t.is_deleted = 0  AND t.due_date = CURDATE()
      GROUP BY 
      t.id, 
      t.contributon,
      t.assign_to, 
      t.due_date, 
      t.status,
      t.counter,
      t.task, 
      t.priority,
      ucd.first_name,
      at.first_name,
      cu.first_name
      ORDER BY 
      due_date asc;
 `;

    db.query(sql, function (err, result) {
      if (err) {
        var data = { error: true, message: err.sqlMessage, data: {} };
        res.status(201).send(data);
      } else {
        if (result.length > 0) {
          var data = {
            error: false,
            message: "Recoard fetched successfully",
            data: result,
          };
          res.status(201).send(data);
        } else {
          var data = { error: false, message: "Not found", data: [] };
          res.status(201).json(data);
        }
      }
    });
  },
  fetchtaskforAdmin: async function (req, res) {
    const { status, assign_to, contributon, start_date, end_date } = req.query;

    const where = ["t.is_deleted = 0"];
    const params = [];

    if (status !== undefined && status !== "" && status !== null) {
      where.push("t.status = ?");
      params.push(parseInt(status, 10));
    }

    if (assign_to) {
      where.push("(FIND_IN_SET(?, t.assign_to) OR t.userid = ?)");
      params.push(String(assign_to), assign_to);
    }

    if (contributon) {
      where.push("FIND_IN_SET(?, t.contributon)");
      params.push(String(contributon));
    }

    if (start_date) {
      where.push("t.due_date >= ?");
      params.push(`${start_date} 00:00:00`);
    }
    if (end_date) {
      where.push("t.due_date <= ?");
      params.push(`${end_date} 23:59:59`);
    }

    const whereSql = where.join(" AND ");

    const sql = `
    SELECT DISTINCT 
      t.id, 
      t.hours,
      t.minutes,
      COALESCE(ph.used_hours, 0) AS used_hours,
       COALESCE(ph.used_minutes, 0) AS used_minutes,
      t.contributon,
      t.assign_to, 
      DATE_FORMAT(t.start_date, '%d %b %Y') AS start_date,
      t.due_date, 
      DATE_FORMAT(t.due_date, '%d %b %Y') AS formatted_due_date,
      DATE_FORMAT(t.created_at, '%d %b %Y') AS formatted_created_date,
      t.counter,
      t.status, 
      t.task, 
      nemf.case_id,
      snmf.case_id AS caseId,
      nemf.project_name,
      t.priority,
      ucd.first_name AS client_name,
      ceu.first_name AS cllii_name,
      su.first_name  AS sclient_name,
      at.first_name  AS assign_name,
      cu.first_name  AS contributon_name,
      ast.profile_picture AS contri_assign_profile,
      GROUP_CONCAT(DISTINCT at.profile_picture) AS assign_to_profiles,
      GROUP_CONCAT(DISTINCT cu.profile_picture) AS contribution_profiles
    FROM todos AS t
      LEFT JOIN users AS at  ON at.id  = t.assign_to
      LEFT JOIN users AS cu  ON cu.id  = t.contributon
      LEFT JOIN users AS ast ON ast.id = t.userid
      LEFT JOIN new_mst_file AS nmf ON nmf.id = t.project_id
      LEFT JOIN users AS ucd ON ucd.id = nmf.client_id
      LEFT JOIN new_mst_file_details AS nmfd ON nmfd.id = t.file_id
      LEFT JOIN new_mst_file AS nemf ON nemf.id = nmfd.project_id
      LEFT JOIN users AS ceu ON ceu.id = nemf.client_id
      LEFT JOIN schedule AS s ON s.id = t.schedule_id
      LEFT JOIN new_mst_file AS snmf ON snmf.id = s.source_id
      LEFT JOIN users AS su ON su.id = snmf.client_id
      LEFT JOIN (
        SELECT task_id, SUM(hours) AS used_hours,SUM(minutes) AS used_minutes
        FROM pms
        WHERE is_deleted = 0
        GROUP BY task_id
      ) AS ph ON ph.task_id = t.id
    WHERE ${whereSql}
    GROUP BY
      t.id,
      t.hours,
      t.minutes,
      ph.used_hours,
      ph.used_minutes,
      t.contributon,
      t.assign_to,
      t.due_date,
      t.start_date,
      t.created_at,
      t.status,
      t.counter,
      t.task,
      t.priority,
      ucd.first_name,
      at.first_name,
      cu.first_name
    ORDER BY t.due_date ASC;
  `;

    db.query(sql, params, function (err, result) {
      if (err) {
        return res.status(201).send({
          error: true,
          message: err.sqlMessage,
          data: {},
        });
      }
      if (result.length > 0) {
        return res.status(201).send({
          error: false,
          message: "Record fetched successfully",
          data: result,
        });
      }
      return res.status(201).json({
        error: false,
        message: "Not found",
        data: [],
      });
    });
  },

  fetchTeamTaskbyId: async function (req, res) {
    const user_id = req.params.id;

    //get current user
    var sql = `SELECT DISTINCT 
        t.id, 
        t.contributon,
        t.assign_to, 
        t.due_date,
          t.start_date,
        t.counter,
        t.userid,
        t.status, 
        t.task, 
        t.priority,
        nemf.case_id,
        snmf.case_id as caseId,
        nemf.project_name,
        ucd.first_name AS client_name,
        ceu.first_name as cllii_name,
        su.first_name as sclient_name,
        GROUP_CONCAT(DISTINCT at.profile_picture) AS assign_to_profiles,
        GROUP_CONCAT(DISTINCT cu.profile_picture) AS contribution_profiles,
        uu.profile_picture as user_profile
        FROM 
        todos AS t
        LEFT JOIN users AS at
        ON FIND_IN_SET(at.id, REPLACE(REPLACE(REPLACE(t.assign_to, '[', ''), ']', ''), ')', '')) > 0
        LEFT JOIN users AS cu
        ON FIND_IN_SET(cu.id, REPLACE(REPLACE(REPLACE(t.contributon, '[', ''), ']', ''), ')', '')) > 0
        left join users as uu
        on uu.id = t.userid
        LEFT JOIN new_mst_file AS nmf 
        ON nmf.id = t.project_id
        left join new_mst_file_details as nmfd
        on nmfd.id = t.file_id
        left join new_mst_file as nemf
        on nemf.id = nmfd.project_id
        LEFT JOIN users AS ucd 
        ON ucd.id = nmf.client_id
        left join users as ceu
        on ceu.id = nemf.client_id
        left join schedule as s
        on s.id = t.schedule_id
        left join new_mst_file as snmf
        on snmf.id = s.source_id
        left join users as su 
        on su.id = snmf.client_id
        WHERE 
        t.is_deleted = 0
        and (t.assign_to = ? or t.contributon = ? or t.userid = ?)
        GROUP BY 
        t.id, 
        t.contributon,
        t.assign_to, 
        t.due_date, 
          t.start_date,
        t.status,
        t.counter,
        t.task, 
        ucd.first_name,
        t.priority
        ORDER BY 
        t.due_date desc;
 `;

    db.query(sql, [user_id, user_id, user_id], function (err, result) {
      if (err) {
        var data = { error: true, message: err.sqlMessage, data: {} };
        res.status(201).send(data);
      } else {
        if (result.length > 0) {
          var data = {
            error: false,
            message: "Recoard fetched successfully",
            data: result,
          };
          res.status(201).send(data);
        } else {
          var data = { error: false, message: "Not found", data: [] };
          res.status(201).json(data);
        }
      }
    });
  },

  fetchtaskforteam: async function (req, res) {
    const user_id = req.user.id;

    //get current user
    var sql = `SELECT DISTINCT 
        t.id, 
        t.contributon,
        t.assign_to,
              t.hours,
               t.minutes,
      COALESCE(ph.used_hours, 0) AS used_hours,
       COALESCE(ph.used_minutes, 0) AS used_minutes,
        DATE_FORMAT(t.start_date, '%d %b %Y') AS start_date,
        DATE_FORMAT(t.due_date, '%d %b %Y') AS due_date,
        t.counter,
        t.userid,
        t.status, 
        t.task, 
        t.priority,
        t.contributon,
        nemf.case_id,
        snmf.case_id as caseId,
        ucd.first_name AS client_name,
        ceu.first_name as cllii_name,
        su.first_name as sclient_name,
        GROUP_CONCAT(DISTINCT at.profile_picture) AS assign_to_profiles,
        GROUP_CONCAT(DISTINCT cu.profile_picture) AS contribution_profiles,
        uu.profile_picture as user_profile
        FROM 
        todos AS t
        LEFT JOIN users AS at
        ON FIND_IN_SET(at.id, REPLACE(REPLACE(REPLACE(t.assign_to, '[', ''), ']', ''), ')', '')) > 0
        LEFT JOIN users AS cu
        ON FIND_IN_SET(cu.id, REPLACE(REPLACE(REPLACE(t.contributon, '[', ''), ']', ''), ')', '')) > 0
        left join users as uu
        on uu.id = t.userid
        LEFT JOIN new_mst_file AS nmf 
        ON nmf.id = t.project_id
        LEFT JOIN users AS ucd 
        ON ucd.id = nmf.client_id
        left join new_mst_file_details as nmfd
        on nmfd.id = t.file_id
        left join new_mst_file as nemf
        on nemf.id = nmfd.project_id
        left join users as ceu
        on ceu.id = nemf.client_id
         left join schedule as s
          on s.id = t.schedule_id
          left join new_mst_file as snmf
          on snmf.id = s.source_id
          left join users as su 
          on su.id = snmf.client_id
           LEFT JOIN (
        SELECT task_id, SUM(hours) AS used_hours, SUM(minutes) AS used_minutes
        FROM pms
        WHERE is_deleted = 0
        GROUP BY task_id
      ) AS ph ON ph.task_id = t.id
        WHERE 
        t.is_deleted = 0
        AND (t.assign_to = ? OR t.contributon = ? OR t.userid = ?)  
        GROUP BY 
        t.id
        ORDER BY 
       (t.status = 0) DESC,
    t.due_date ASC;
 `;

    db.query(sql, [user_id, user_id, user_id], function (err, result) {
      if (err) {
        var data = { error: true, message: err.sqlMessage, data: {} };
        res.status(201).send(data);
      } else {
        if (result.length > 0) {
          var data = {
            error: false,
            message: "Recoard fetched successfully",
            data: result,
          };
          res.status(201).send(data);
        } else {
          var data = { error: false, message: "Not found", data: [] };
          res.status(201).json(data);
        }
      }
    });
  },
  fetchtaskforteamforreport: async function (req, res) {
    const id = req?.params?.id;

    //get current user
    var sql = `SELECT DISTINCT 
          (SELECT COUNT(id) 
          FROM todos 
          WHERE is_deleted = 0 
          AND due_date BETWEEN DATE_SUB(CURRENT_DATE(), INTERVAL 15 DAY) AND CURRENT_DATE()
          AND (FIND_IN_SET(?, REPLACE(REPLACE(REPLACE(assign_to, '[', ''), ']', ''), ')', '')) > 0
          OR FIND_IN_SET(?, REPLACE(REPLACE(REPLACE(contributon, '[', ''), ']', ''), ')', '')) > 0
          OR userid = ?)) AS total_tasks,

          (SELECT COUNT(id) 
          FROM todos 
          WHERE is_deleted = 0 
          AND status = 1
          AND due_date BETWEEN DATE_SUB(CURRENT_DATE(), INTERVAL 15 DAY) AND CURRENT_DATE()
          AND (FIND_IN_SET(?, REPLACE(REPLACE(REPLACE(assign_to, '[', ''), ']', ''), ')', '')) > 0
          OR FIND_IN_SET(?, REPLACE(REPLACE(REPLACE(contributon, '[', ''), ']', ''), ')', '')) > 0
          OR userid = ?)) AS completed_tasks,

          t.id,  
          t.contributon,
          t.assign_to, 
          t.due_date,
          t.counter,
          t.userid,
          t.status, 
          t.task, 
          t.priority,
          nemf.case_id,
           snmf.case_id as caseId,
          nemf.project_name,
          ucd.first_name AS client_name,
          ceu.first_name as cllii_name,
           su.first_name as sclient_name,
          uu.first_name as user_name,
          GROUP_CONCAT(DISTINCT at.profile_picture) AS assign_to_profiles,
          GROUP_CONCAT(DISTINCT cu.profile_picture) AS contribution_profiles,
          uu.profile_picture AS user_profile
          FROM 
          todos AS t
          LEFT JOIN users AS at
          ON FIND_IN_SET(at.id, REPLACE(REPLACE(REPLACE(t.assign_to, '[', ''), ']', ''), ')', '')) > 0
          LEFT JOIN users AS cu
          ON FIND_IN_SET(cu.id, REPLACE(REPLACE(REPLACE(t.contributon, '[', ''), ']', ''), ')', '')) > 0
          LEFT JOIN users AS uu
          ON uu.id = t.userid
          LEFT JOIN new_mst_file AS nmf 
          ON nmf.id = t.project_id
          LEFT JOIN users AS ucd 
          ON ucd.id = nmf.client_id
           left join new_mst_file_details as nmfd
            on nmfd.id = t.file_id
          LEFT JOIN new_mst_file AS nemf 
          ON nemf.id =   nmfd.project_id
          left join users as ceu
          on ceu.id = nemf.client_id
           left join schedule as s
        on s.id = t.schedule_id
        left join new_mst_file as snmf
        on snmf.id = s.source_id
        left join users as su 
        on su.id = snmf.client_id
          WHERE 
          t.is_deleted = 0
          AND t.due_date BETWEEN DATE_SUB(CURRENT_DATE(), INTERVAL 15 DAY) AND CURRENT_DATE()
          AND FIND_IN_SET(?, REPLACE(REPLACE(REPLACE(t.assign_to, '[', ''), ']', ''), ')', '')) > 0  
          GROUP BY 
          t.id, 
          t.contributon,
          t.assign_to, 
          t.due_date, 
          t.status,
          t.counter,
          t.task, 
          uu.first_name,
          ucd.first_name,
          t.priority,
          nemf.case_id,
          nemf.project_name
          ORDER BY 
          t.due_date DESC
 `;

    db.query(sql, [id, id, id, id, id, id, id, id, id], function (err, result) {
      if (err) {
        var data = { error: true, message: err.sqlMessage, data: {} };
        res.status(201).send(data);
      } else {
        if (result.length > 0) {
          var data = {
            error: false,
            message: "Recoard fetched successfully",
            data: result,
          };
          res.status(201).send(data);
        } else {
          var data = { error: false, message: "Not found", data: [] };
          res.status(201).json(data);
        }
      }
    });
  },
  getTaskForHod: async function (req, res) {
    const user_id = req.user.id;

    // Step 1: Get all department_ids for the current user
    const sql0 = `SELECT department_id FROM user_department_post WHERE user_id = ?`;

    db.query(sql0, [user_id], function (err, result0) {
      if (err) {
        return res
          .status(201)
          .send({ error: true, message: err.sqlMessage, data: {} });
      }

      if (result0.length === 0) {
        return res
          .status(404)
          .send({
            error: true,
            message: "User does not have a department",
            data: {},
          });
      }

      const department_ids = result0.map((row) => row.department_id);

      // Step 2: Read filters from query params (same as admin)
      const { status, assign_to, contributon, start_date, end_date } =
        req.query;

      const where = ["t.is_deleted = 0"];
      const params = [];

      if (status !== undefined && status !== "" && status !== null) {
        where.push("t.status = ?");
        params.push(parseInt(status, 10));
      }

      if (assign_to) {
        where.push("FIND_IN_SET(?, t.assign_to)");
        params.push(String(assign_to));
      } else {
        where.push(
          "(t.mst_department_id IN (?) OR t.assign_to = ? OR t.contributon = ?)",
        );
        params.push(department_ids, String(user_id), String(user_id));
      }

      if (contributon) {
        where.push("FIND_IN_SET(?, t.contributon)");
        params.push(String(contributon));
      }

      if (start_date) {
        where.push("t.due_date >= ?");
        params.push(`${start_date} 00:00:00`);
      }

      if (end_date) {
        where.push("t.due_date <= ?");
        params.push(`${end_date} 23:59:59`);
      }

      const whereSql = where.join(" AND ");

      const sql = `
      SELECT DISTINCT 
        t.id, 
        t.contributon,
         t.hours,
          t.minutes,
      COALESCE(ph.used_hours, 0) AS used_hours,
       COALESCE(ph.used_minutes, 0) AS used_minutes,
        t.assign_to, 
        DATE_FORMAT(t.start_date, '%d %b %Y') AS start_date,
        t.due_date, 
        DATE_FORMAT(t.due_date, '%d %b %Y') AS formatted_due_date,
        DATE_FORMAT(t.created_at, '%d %b %Y') AS formatted_created_date,
        t.counter,
        t.status, 
        t.task,
        t.priority,
        nemf.case_id,
        snmf.case_id AS caseId,
        ucd.first_name AS client_name,
        ceu.first_name AS cllii_name,
        su.first_name AS sclient_name,
        at.first_name AS assign_name,
        cu.first_name AS contributon_name,
        uu.profile_picture AS user_profile,
        GROUP_CONCAT(DISTINCT at.profile_picture) AS assign_to_profiles,
        GROUP_CONCAT(DISTINCT cu.profile_picture) AS contribution_profiles
      FROM todos AS t
      LEFT JOIN users AS at
        ON FIND_IN_SET(at.id, REPLACE(REPLACE(REPLACE(t.assign_to, '[', ''), ']', ''), ')', '')) > 0
      LEFT JOIN users AS cu
        ON FIND_IN_SET(cu.id, REPLACE(REPLACE(REPLACE(t.contributon, '[', ''), ']', ''), ')', '')) > 0
      LEFT JOIN new_mst_file AS nmf 
        ON nmf.id = t.project_id
      LEFT JOIN users AS ucd 
        ON ucd.id = nmf.client_id
      LEFT JOIN users AS uu
        ON uu.id = t.userid
      LEFT JOIN new_mst_file_details AS nmfd
        ON nmfd.id = t.file_id
      LEFT JOIN new_mst_file AS nemf
        ON nemf.id = nmfd.project_id
      LEFT JOIN users AS ceu
        ON ceu.id = nemf.client_id
      LEFT JOIN schedule AS s
        ON s.id = t.schedule_id
      LEFT JOIN new_mst_file AS snmf
        ON snmf.id = s.source_id
      LEFT JOIN users AS su 
        ON su.id = snmf.client_id
         LEFT JOIN (
        SELECT task_id, SUM(hours) AS used_hours,SUM(minutes) AS used_minutes
        FROM pms
        WHERE is_deleted = 0
        GROUP BY task_id
      ) AS ph ON ph.task_id = t.id
      WHERE ${whereSql}
      GROUP BY 
        t.id,   t.hours, t.minutes,ph.used_minutes,
      ph.used_hours, t.contributon, t.assign_to, t.start_date, t.created_at,
        t.due_date, t.status, t.task, t.counter, t.priority,
        ucd.first_name, at.first_name, cu.first_name, ceu.first_name, su.first_name
      ORDER BY t.due_date ASC
    `;

      db.query(sql, params, function (err, result) {
        if (err) {
          return res
            .status(201)
            .send({ error: true, message: err.sqlMessage, data: {} });
        }
        if (result.length > 0) {
          return res
            .status(201)
            .send({
              error: false,
              message: "Records fetched successfully",
              data: result,
            });
        }
        return res
          .status(201)
          .json({ error: false, message: "No records found", data: [] });
      });
    });
  },

  addTask: async function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const tasks = this_data.tasks.map((taskItem) => {
      const assignTo =
        this_data.assign_task === "myself"
          ? user_id
          : this_data.assign_task === "assignto"
            ? this_data.dropdown
            : null;

      const contribution =
        this_data.assign_task === "collabration" ? this_data.dropdown : null;

      return {
        date: getCurrentDateAndTime(),
        start_date: this_data.startdate,
        due_date: this_data.date,
        userid: user_id,
        task: taskItem.task,
        hours: taskItem.hours,
        minutes: taskItem.minutes,
        status: "0",
        project_id: taskItem.project || null,
        priority: this_data.priority,
        sub_function:
          taskItem.sub_function !== undefined &&
          taskItem.sub_function !== "" &&
          taskItem.sub_function !== null
            ? taskItem.sub_function
            : this_data.sub_function || null,
        mst_department_id: this_data.department,
        contributon: contribution,
        assign_to: assignTo,
        created_at: getCurrentDateAndTime(),
        created_by: user_id,
        updated_at: null,
        updated_by: null,
        is_deleted: 0,
      };
    });

    // --- STEP 1: Validate all tasks first, one by one, before inserting anything ---
    const validationErrors = [];
    let index = 0;

    function validateNext() {
      if (index >= tasks.length) {
        return runInsert();
      }

      const task = tasks[index];

       const isProjectRequired = !["4", "5"].includes(
    String(task.mst_department_id),
  );

  if (isProjectRequired && !task.project_id) {
        validationErrors.push(
          `Task "${task.task}" has no project_id, cannot validate.`,
        );
        index++;
        return validateNext();
      }

       if (!task.project_id) {
   // dept 4/5 — no project to validate against, move on
   index++;
   return validateNext();
 }

      // Skip project-limit validation entirely if sub_function is not provided
      if (
        task.sub_function === null ||
        task.sub_function === undefined ||
        task.sub_function === ""
      ) {
        index++;
        return validateNext();
      }

      db.query(
        "SELECT id, hours, assign_on, completed_by FROM new_mst_file_details WHERE project_id = ? AND source_type = ? AND project_name = ?",
        [
          task.project_id,
          task.mst_department_id,
          mapSubFunction(task.sub_function),
        ],
        (err, rows) => {
          if (err) {
            return res.status(500).json({
              error: true,
              message: err.sqlMessage || "Error validating tasks.",
            });
          }

          if (rows.length) {
            const limits = rows[0];

            if (
              limits.hours !== null &&
              Number(task.hours) > Number(limits.hours)
            ) {
              validationErrors.push(
                `Task "${task.task}": hours (${task.hours}) exceed allowed hours (${limits.hours})`,
              );
            }

            if (limits.assign_on && limits.completed_by) {
              const assignOn = parseDate(limits.assign_on);
              const completedBy = parseDate(limits.completed_by);
              const startDate = parseDate(task.start_date);
              const dueDate = parseDate(task.due_date);

              const startOk = startDate >= assignOn && startDate <= completedBy;
              const dueOk = dueDate >= assignOn && dueDate <= completedBy;

              if (!startOk || !dueOk) {
                validationErrors.push(
                  ` dates must fall between Assign On (${formatDate(assignOn)}) and Completed By (${formatDate(completedBy)}) `,
                );
              }
            }
          }

          index++;
          validateNext();
        },
      );
    }

    // --- STEP 2: Runs only after all validation checks are done ---
    function runInsert() {
      if (validationErrors.length) {
        return res.status(400).json({
          error: true,
          message: "One or more tasks violate project limits.",
          details: validationErrors,
        });
      }

      try {
        const insertPromises = tasks.map((task) => {
          return new Promise((resolve, reject) => {
            db.query("INSERT INTO todos SET ?", task, (err, result) => {
              if (err) {
                return reject(err);
              } else {
                notificationController.setNotification(
                  JSON.stringify({
                    message: task.task,
                    action: "New Todo has been assigned",
                  }),
                  task.assign_to || task.contributon,
                  task.created_by,
                  result.insertId,
                  null,
                  table_name,
                );
                resolve(result.insertId);
              }
            });
          });
        });

        Promise.all(insertPromises)
          .then((insertedIds) => {
            const counterPromises = insertedIds.map((taskId) => {
              const statusEntry = {
                todos_id: taskId,
                status: "0",
                remarks: null,
                due_date: this_data.date,
                created_at: getCurrentDateAndTime(),
                created_by: user_id,
              };

              return new Promise((resolve, reject) => {
                db.query(
                  "INSERT INTO todos_counter SET ?",
                  statusEntry,
                  (err, result) => {
                    if (err) {
                      return reject(err);
                    }
                    resolve(result.insertId);
                  },
                );
              });
            });

            Promise.all(counterPromises)
              .then((counterInsertedIds) => {
                res.status(201).json({
                  error: false,
                  message: "Tasks have been added successfully.",
                  data: {
                    insertedTaskIds: insertedIds,
                    insertedCounterIds: counterInsertedIds,
                  },
                });
              })
              .catch((err) => {
                console.error("Error inserting counters:", err);
                res.status(500).json({
                  error: true,
                  message: err.sqlMessage || "Error inserting counters.",
                });
              });
          })
          .catch((err) => {
            console.error("Error inserting tasks:", err);
            res.status(500).json({
              error: true,
              message: err.sqlMessage || "Error inserting tasks.",
            });
          });
      } catch (err) {
        console.error("Error inserting tasks or counters:", err);
        res.status(500).json({
          error: true,
          message: err.sqlMessage || "Error inserting tasks or counters.",
        });
      }
    }

    // Kick off validation
    validateNext();
  },

  getSubFunctionLimits: function (req, res) {
    const project_id = req.query.project_id || req.body.project_id;
    const department_id = req.query.department_id || req.body.department_id;
    const sub_function =
      req.query.sub_function !== undefined
        ? req.query.sub_function
        : req.body.sub_function;

    if (
      !project_id ||
      !department_id ||
      sub_function === undefined ||
      sub_function === ""
    ) {
      return res.status(200).json({ error: false, data: null });
    }

    const mappedName = mapSubFunction(sub_function);

    const sql =
      "SELECT id, hours, assign_on, completed_by FROM new_mst_file_details WHERE project_id = ? AND source_type = ? AND project_name = ? LIMIT 1";

    db.query(sql, [project_id, department_id, mappedName], (err, rows) => {
      if (err) {
        return res.status(500).json({
          error: true,
          message: err.sqlMessage || "Error fetching limits",
        });
      }

      if (rows && rows.length > 0) {
        const item = rows[0];
        return res.status(200).json({
          error: false,
          data: {
            id: item.id,
            hours: item.hours,
            assign_on: item.assign_on,
            completed_by: item.completed_by,
            formatted_assign_on: formatDate(item.assign_on),
            formatted_completed_by: formatDate(item.completed_by),
            start_date_ymd: formatDateYMD(item.assign_on),
            due_date_ymd: formatDateYMD(item.completed_by),
          },
        });
      }

      return res.status(200).json({ error: false, data: null });
    });
  },


  updateTask: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.id);

    const selectSql = "SELECT * FROM `todos` WHERE `id` = ?";

    db.query(selectSql, [id], (err, result) => {
      if (err) {
        const data = { error: true, message: err.sqlMessage, data: {} };
        return res.status(500).json(data);
      }

      const user_id = req?.user?.id;
      const assignTo =
        this_data.assign_task === "myself"
          ? user_id
          : this_data.assign_task === "assignto"
            ? this_data.dropdown
            : null;

      const contribution =
        this_data.assign_task === "collabration" ? this_data.dropdown : null;

      const Performance = {
        task: this_data.task,
        hours: this_data.hours,
         minutes: this_data.minutes,
        mst_department_id: this_data.department,
        status: this_data.status,
        project_id: this_data.project,
        priority: this_data.priority,
        sub_function: this_data.sub_function || null,
        contributon: contribution,
        assign_to: assignTo,
        updated_at: getCurrentDateAndTime(),
        updated_by: user_id,
      };
      const updateSql =
        "UPDATE `todos` SET " +
        "`task` = ?, " +
        "`hours`=?," +
        "`minutes`=?,"+
        "`mst_department_id` = ?, " +
        "`status` = ?, " +
        "`project_id` = ?, " +
        "`priority` = ?, " +
        "`sub_function` = ?, " +
        "`contributon` = ?, " +
        "`assign_to` = ?, " +
        "`updated_at` = ?, " +
        "`updated_by` = ? " +
        "WHERE `id` = ?";

      db.query(
        updateSql,
        [
          Performance.task,
          Performance.hours,
          Performance.minutes,
          Performance.mst_department_id,
          Performance.status,
          Performance.project_id,
          Performance.priority,
          Performance.sub_function,
          Performance.contributon,
          Performance.assign_to,
          Performance.updated_at,
          parseInt(Performance.updated_by),
          id,
        ],
        (err, result) => {
          if (err) {
            console.error("Database update error:", err);
            return res
              .status(500)
              .json({ error: true, message: err.sqlMessage, data: {} });
          }

          if (result.affectedRows === 0) {
            return res.status(404).json({
              error: true,
              message: "Task not found",
              data: {},
            });
          }

          notificationController.setNotification(
            JSON.stringify({
              message: `Task Updated : ${Performance.task}`,
              action: "Task updated",
            }),
            Performance.assign_to || Performance.contributon,
            Performance.updated_by,
            id,
            null,
            table_name,
          );

          const response = {
            error: false,
            message: "Task has been updated successfully.",
            data: { id },
          };
          res.status(200).json(response);
        },
      );
    });
  },
  updateStatus: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.id);

    const selectSql = "SELECT * FROM `todos` WHERE `id` = ?";
    db.query(selectSql, [id], (err, result) => {
      if (err) {
        return res.status(500).json({
          error: true,
          message: err.sqlMessage,
          data: {},
        });
      }

      if (result.length === 0) {
        return res.status(404).json({
          error: true,
          message: "Task not found",
          data: {},
        });
      }
      const dueDate = result[0].due_date
        ? new Date(result[0].due_date)
            .toISOString()
            .slice(0, 19)
            .replace("T", " ")
        : null;

      const user_id = req?.user?.id;
      const counterData = {
        todos_id: id,
        status: this_data.status,
        reason: this_data.reason || null,
        remarks: this_data.remarks || null,
        due_date: dueDate,
        created_at: getCurrentDateAndTime(),
        created_by: user_id,
      };
      const insertCounterSql =
        "INSERT INTO `todos_counter` (`todos_id`, `status`, `reason`, `remarks`,`due_date`, `created_at`, `created_by`) VALUES (?, ?, ?,?, ?, ?, ?)";
      db.query(
        insertCounterSql,
        [
          counterData.todos_id,
          counterData.status,
          counterData.reason,
          counterData.remarks,
          counterData.due_date,
          counterData.created_at,
          counterData.created_by,
        ],
        (err, result) => {
          if (err) {
            console.error("Database insert error:", err);
            return res.status(500).json({
              error: true,
              message: err.sqlMessage,
              data: {},
            });
          }
          const countSql =
            "SELECT COUNT(*) AS count FROM `todos_counter` WHERE `todos_id` = ? and  `reason` is not null and `remarks` !='' ";
          db.query(countSql, [id], (err, countResult) => {
            if (err) {
              console.error("Database count error:", err);
              return res.status(500).json({
                error: true,
                message: err.sqlMessage,
                data: {},
              });
            }

            const count = countResult[0].count;
            const status = {
              status: this_data.status,
              new_date: this_data.newDate
                ? new Date(this_data.newDate)
                    .toISOString()
                    .slice(0, 19)
                    .replace("T", " ")
                : null,
              updated_at: getCurrentDateAndTime(),
              updated_by: user_id,
              counter_count: count,
            };
            let updateSql =
              "UPDATE `todos` SET " +
              "`status` = ?, " +
              "`updated_at` = ?, " +
              "`updated_by` = ?, " +
              "`counter` = ?";

            const updateParams = [
              status.status,
              status.updated_at,
              parseInt(status.updated_by),
              status.counter_count,
            ];

            if (
              status.new_date !== null &&
              status.new_date !== undefined &&
              status.new_date !== ""
            ) {
              updateSql += ", `due_date` = ?";
              updateParams.push(status.new_date);
            }

            updateSql += " WHERE `id` = ?";
            updateParams.push(id);

            db.query(updateSql, updateParams, (err, result) => {
              if (err) {
                console.error("Database update error:", err);
                return res.status(500).json({
                  error: true,
                  message: err.sqlMessage,
                  data: {},
                });
              }

              if (result.affectedRows === 0) {
                return res.status(404).json({
                  error: true,
                  message: "Task not found",
                  data: {},
                });
              }

              const response = {
                error: false,
                message:
                  "Task status and counter count have been updated successfully.",
                data: { id, counter_count: count },
              };
              res.status(200).json(response);
            });
          });
        },
      );
    });
  },
  getTaskCounterDataId: (req, res) => {
    try {
      const id = req.params?.id;

      if (!isNaN(parseInt(id))) {
        const sql = `
          SELECT tc.*, u.first_name 
          FROM todos_counter as tc 
          LEFT JOIN users as u ON u.id = tc.created_by  
          WHERE tc.todos_id = ? 
            AND tc.status = 0  
               and (tc.reason is NOT Null  and tc.remarks != '')`;

        db.query(sql, [id], (err, result) => {
          if (err) {
            console.error("Database query error:", err);
            res.status(500).json({
              message: err.sqlMessage || "Database error",
              error: true,
              data: {},
            });
          } else if (result.length) {
            res.status(200).json({
              message: "Record fetched",
              error: false,
              data: result,
            });
          } else {
            res.status(404).json({
              message: "Not found",
              error: false,
              data: [],
            });
          }
        });
      } else {
        res.status(400).json({
          message: "Invalid request",
          error: true,
          data: {},
        });
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      res.status(500).json({
        message: "Server error",
        error: true,
        data: {},
      });
    }
  },

  getapplicationName: (req, res) => {
    try {
      const id = req.params?.id;

      // Mapping ID to application_name
      const applicationNameMap = {
        1: "approval_process",
        2: "architecture_design",
        3: "interior_design",
        7: "Tentative",
      };

      // 👉 CASE: If id = 7 → run different query
      if (Number(id) === 7) {
        const sql = `
        SELECT nmf.id, nmf.case_id, u.first_name, u.last_name
        FROM new_mst_file AS nmf
        LEFT JOIN users AS u ON u.id = nmf.client_id
        WHERE nmf.tentative_design = 'yes' AND nmf.is_deleted = 0
      `;

        db.query(sql, (err, result) => {
          if (err) {
            return res.status(500).json({
              message: err.sqlMessage || "Database error",
              error: true,
              data: {},
            });
          }

          return res.status(200).json({
            message: result.length ? "Record fetched" : "Not found",
            error: false,
            data: result,
          });
        });
      } else {
        // 👉 Normal flow
        const applicationName = applicationNameMap[id];

        if (!applicationName) {
          return res.status(400).json({
            message: "Invalid request",
            error: true,
            data: {},
          });
        }

        const sql = `
        SELECT nmf.id, nmf.case_id, u.first_name, u.last_name
        FROM new_mst_file_project_details AS nmfpd
        LEFT JOIN new_mst_file AS nmf ON nmf.id = nmfpd.project_id
        LEFT JOIN users AS u ON u.id = nmf.client_id
        WHERE nmfpd.application_name = ? 
          AND nmf.is_deleted = 0  
          AND nmfpd.is_deleted = 0
      `;

        db.query(sql, [applicationName], (err, result) => {
          if (err) {
            return res.status(500).json({
              message: err.sqlMessage || "Database error",
              error: true,
              data: {},
            });
          }

          return res.status(200).json({
            message: result.length ? "Record fetched" : "Not found",
            error: false,
            data: result,
          });
        });
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      res.status(500).json({
        message: "Server error",
        error: true,
        data: {},
      });
    }
  },
  verifiedTask: function (req, res) {
    const taskid = req.params.id;
    const id = req.user.id;
    const { remark } = req.body;

    const sql = `
      UPDATE op_meeting_detail 
      SET verified = 1,
          verified_by = ?,
          verified_at = ?,
          remark = ?
      WHERE id = ?
    `;

    const params = [
      parseInt(id),
      getCurrentDateAndTime(),
      remark ? remark.trim() : null,
      parseInt(taskid),
    ];

    db.query(sql, params, function (err, result) {
      if (err) {
        res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      } else {
        // Check if any row was actually updated
        if (result.affectedRows === 0) {
          res.status(404).json({
            error: true,
            message: "Task not found",
            data: {},
          });
        } else {
          res.status(200).json({
            error: false,
            message: "Task has been marked as verified!",
            data: {},
          });
        }
      }
    });
  },

  deleteTask: function (req, res) {
    const taskid = req.params.id;
    const id = req.user.id;

    var sql =
      "UPDATE `todos` SET `is_deleted`=1,`updated_by`=" +
      parseInt(id) +
      ",`updated_at`='" +
      getCurrentDateAndTime() +
      "' WHERE `id`=" +
      taskid +
      "";

    db.query(sql, function (err, result) {
      if (err) {
        res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      } else {
        res.status(200).json({
          error: false,
          message: "task has been marked as deleted!",
          data: {},
        });
      }
    });
  },
  getTaskTeamById: (req, res) => {
    try {
      const id = req.params?.id;

      if (parseInt(id) != NaN) {
        var sql = "select * from todos where id=" + id + "";
        db.query(sql, (err, result) => {
          if (err) {
            res
              .status(200)
              .json({ message: err.sqlMessage, error: true, data: {} });
          } else if (result.length) {
            res
              .status(200)
              .json({ message: "Record fetched", error: false, data: result });
          } else {
            res
              .status(200)
              .json({ message: "Not found", error: false, data: [] });
          }
        });
      } else {
        res
          .status(200)
          .json({ message: "Invalid request", error: true, data: {} });
      }
    } catch (err) {
      res
        .status(200)
        .json({ message: "Invalid request", error: true, data: {} });
    }
  },
  getTodoById: (req, res) => {
    try {
      const id = req?.params.id ? parseInt(req?.params?.id) : undefined;
      var sql = "select * from todos where id=" + id + "";
      db.query(sql, (err, result) => {
        if (err) {
          console.log(err);
          res
            .status(200)
            .json({ message: err.sqlMessage, error: true, data: [] });
        } else if (result.length > 0) {
          res
            .status(200)
            .json({ message: "Record fetched", error: false, data: result });
        } else {
          res
            .status(200)
            .json({ message: "Not found", error: false, data: [] });
        }
      });
    } catch (err) {
      console.log(err);
      res.status(200).json({
        error: true,
        message: "Server API error: Something went wrong",
        data: {},
      });
    }
  },

  getUserInformation: (req, res) => {
    try {
      const id = req.params?.id;

      if (parseInt(id) != NaN) {
        var sql =
          "select u.id,u.first_name,u.last_name,mg.description from users as u left join users_groups as ug on ug.mst_user_id = u.id left join mst_groups as mg on mg.id = ug.mst_group_id where u.id =" +
          id +
          "";
        db.query(sql, (err, result) => {
          if (err) {
            res
              .status(200)
              .json({ message: err.sqlMessage, error: true, data: {} });
          } else if (result.length) {
            res
              .status(200)
              .json({ message: "Record fetched", error: false, data: result });
          } else {
            res
              .status(200)
              .json({ message: "Not found", error: false, data: [] });
          }
        });
      } else {
        res
          .status(200)
          .json({ message: "Invalid request", error: true, data: {} });
      }
    } catch (err) {
      res
        .status(200)
        .json({ message: "Invalid request", error: true, data: {} });
    }
  },

  getTaskPercentageForTeamId: (req, res) => {
    try {
      const id = req.params?.id;

      if (!isNaN(parseInt(id))) {
        const sql1 = `
          SELECT 
            COUNT(id) AS total_tasks,
            COUNT(CASE WHEN status = 1 THEN 1 END) AS completed_tasks,
            ROUND((COUNT(CASE WHEN status = 1 THEN 1 END) / NULLIF(COUNT(id), 0)) * 100, 2) AS completion_percentage
          FROM 
            todos
          WHERE 
              JSON_CONTAINS(assign_to, ?)`;

        const sql2 = `
          SELECT 
            COUNT(id) AS total_ok,
            COUNT(CASE WHEN is_ok = 1 THEN 1 END) AS completed_ok,
             COUNT(CASE WHEN is_ok = 0 THEN 1 END) AS uncompleted_ok,
            ROUND((COUNT(CASE WHEN is_ok = 1 THEN 1 END) / NULLIF(COUNT(id), 0)) * 100, 2) AS completion_percentage,
              ROUND((COUNT(CASE WHEN is_ok = 0 THEN 1 END) / NULLIF(COUNT(id), 0)) * 100, 2) AS uncompleted_percentage
          FROM 
            op_meeting_detail
          WHERE 
            user_id = ?`;

        // Execute the first query
        db.query(sql1, [id], (err1, result1) => {
          if (err1) {
            return res.status(500).json({
              message: err1.sqlMessage,
              error: true,
              data: {},
            });
          }

          // Execute the second query
          db.query(sql2, [id], (err2, result2) => {
            if (err2) {
              return res.status(500).json({
                message: err2.sqlMessage,
                error: true,
                data: {},
              });
            }

            // Combine results from both queries
            res.status(200).json({
              message: "Records fetched successfully",
              error: false,
              data: {
                taskStats: result1[0],
                meetingStats: result2[0],
              },
            });
          });
        });
      } else {
        res.status(400).json({
          message: "Invalid request: ID must be a number",
          error: true,
          data: {},
        });
      }
    } catch (err) {
      res.status(500).json({
        message: "Server error",
        error: true,
        data: {},
      });
    }
  },

  addTactical: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const participantsArray = this_data.participants;

    const meeting = {
      mst_department_id: this_data.department_name,
      date: this_data.date,
      facilator: this_data.facilator,
      participants: participantsArray.join(","),
      created_at: getCurrentDateAndTime(),
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };

    db.query("INSERT INTO tc_meeting SET ?", meeting, function (err, result) {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      const meetingId = result.insertId; // Get the inserted meeting ID
      const participantRows = participantsArray.map((participant) => [
        meetingId,
        this_data.date,
        this_data.facilator,
        participant,
        getCurrentDateAndTime(),
        null,
        null,
        0,
      ]); // Prepare array for bulk insertion
      db.query(
        "INSERT INTO tc_meeting_detail (meeting_id,date,facilator, user_id,created_at, updated_at, updated_by, is_deleted) VALUES ?",
        [participantRows],
        function (err) {
          if (err) {
            return res
              .status(500)
              .json({ error: true, message: err.sqlMessage, data: {} });
          }

          const data = {
            error: false,
            message: "operational meeting has been added successfully.",
            data: {
              id: result.insertId,
            },
          };
          res.status(201).json(data);
        },
      );
    });
  },
  getoperationViewbyid: async function (req, res) {
    const { date: queryDateFromQuery, department: departmentFromQuery } =
      req.query || {};
    const { date: queryDateFromParams, department: departmentFromParams } =
      req.params || {};

    const queryDate = queryDateFromQuery || queryDateFromParams;
    const department = departmentFromQuery || departmentFromParams;
    if (!queryDate || !department) {
      return res.status(400).json({
        message:
          "Missing required parameters: date and department (expected as path params or query params)",
        error: true,
        data: {},
      });
    }

    const sqlDate = `
SELECT 
  om.id, 
  (
      SELECT DATE_FORMAT(date, '%Y-%m-%d')
      FROM op_meeting
      WHERE id = (
          SELECT MAX(id)
          FROM op_meeting
          WHERE id < om.id
            AND mst_department_id = om.mst_department_id
      )
  ) AS formatted_date
FROM op_meeting om
WHERE om.is_deleted = 0 and om.date = ? and om.mst_department_id = ?
    `;

    db.query(sqlDate, [queryDate, department], (errDate, resultDate) => {
      if (errDate) {
        return res.status(500).json({
          message: errDate.sqlMessage,
          error: true,
          data: {},
        });
      }

      if (resultDate.length === 0) {
        return res.status(404).json({
          message: "No previous meeting found",
          error: true,
          data: {},
        });
      }

      const date = resultDate[0].formatted_date;
      const meeting_id = resultDate[0].id;

      const sql2 = `
SELECT 
    COUNT(t.id) AS total_tasks,
    SUM(CASE WHEN t.status = 1 THEN 1 ELSE 0 END) AS completed_tasks,
    CASE 
        WHEN COUNT(t.id) = 0 THEN 0
        ELSE ROUND((SUM(CASE WHEN t.status = 1 THEN 1 ELSE 0 END) / COUNT(t.id)) * 100, 2)
    END AS completion_percentage
FROM op_meeting AS om 
LEFT JOIN todos AS t ON t.mst_department_id = om.mst_department_id 
    AND t.is_deleted = 0
    AND DATE(t.due_date) = om.date 
WHERE om.is_deleted = 0 
    AND om.date = ?
    AND om.mst_department_id = ?
      `;

      var sql = `SELECT 
    omd.*, 
    u.first_name, 
    u.last_name,  
    u.profile_picture,
    vu.first_name AS verified_name,

    -- ✅ Aggregate project info instead of grouping by it
    GROUP_CONCAT(DISTINCT COALESCE(nemf.case_id, nemft.case_id) SEPARATOR '|') AS case_ids,
    GROUP_CONCAT(DISTINCT COALESCE(nemf.project_name, nemft.project_name) SEPARATOR '|') AS project_names,
    GROUP_CONCAT(DISTINCT COALESCE(ceu.first_name, ceu2.first_name) SEPARATOR '|') AS client_names,

    -- Today tasks
    GROUP_CONCAT(CASE WHEN t.assign_to = omd.user_id AND t.due_date = omd.date THEN t.task END ORDER BY t.id SEPARATOR '|') AS tasks_by_meeting,
    GROUP_CONCAT(CASE WHEN t.assign_to = omd.user_id AND t.due_date = omd.date THEN t.status END ORDER BY t.id SEPARATOR '|') AS tasks_by_meeting_status,
    GROUP_CONCAT(CASE WHEN t.assign_to = omd.user_id AND t.due_date = omd.date THEN t.id END ORDER BY t.id SEPARATOR '|') AS today_task_ids,
    GROUP_CONCAT(CASE WHEN t.assign_to = omd.user_id AND t.due_date = omd.date THEN COALESCE(nemf.case_id, nemft.case_id, '') END ORDER BY t.id SEPARATOR '|') AS today_task_case_ids,
    GROUP_CONCAT(CASE WHEN t.assign_to = omd.user_id AND t.due_date = omd.date THEN COALESCE(nemf.project_name, nemft.project_name, '') END ORDER BY t.id SEPARATOR '|') AS today_task_project_names,
    GROUP_CONCAT(CASE WHEN t.assign_to = omd.user_id AND t.due_date = omd.date THEN COALESCE(ceu.first_name, ceu2.first_name, '') END ORDER BY t.id SEPARATOR '|') AS today_task_client_names,

    -- Today contributions
    GROUP_CONCAT(CASE WHEN t.contributon = omd.user_id AND t.due_date = omd.date THEN t.task END ORDER BY t.id SEPARATOR '|') AS contributions_by_meeting,
    GROUP_CONCAT(CASE WHEN t.contributon = omd.user_id AND t.due_date = omd.date THEN t.status END ORDER BY t.id SEPARATOR '|') AS contributions_by_meeting_status,
    GROUP_CONCAT(CASE WHEN t.contributon = omd.user_id AND t.due_date = omd.date THEN t.id END ORDER BY t.id SEPARATOR '|') AS today_contribution_ids,
    GROUP_CONCAT(CASE WHEN t.contributon = omd.user_id AND t.due_date = omd.date THEN COALESCE(nemf.case_id, nemft.case_id, '') END ORDER BY t.id SEPARATOR '|') AS today_contribution_case_ids,
    GROUP_CONCAT(CASE WHEN t.contributon = omd.user_id AND t.due_date = omd.date THEN COALESCE(nemf.project_name, nemft.project_name, '') END ORDER BY t.id SEPARATOR '|') AS today_contribution_project_names,
    GROUP_CONCAT(CASE WHEN t.contributon = omd.user_id AND t.due_date = omd.date THEN COALESCE(ceu.first_name, ceu2.first_name, '') END ORDER BY t.id SEPARATOR '|') AS today_contribution_client_names,

    -- Prev date tasks
    GROUP_CONCAT(CASE WHEN t.assign_to = omd.user_id AND t.due_date = ? THEN t.task END ORDER BY t.id SEPARATOR '|') AS prevdate_tasks,
    GROUP_CONCAT(CASE WHEN t.assign_to = omd.user_id AND t.due_date = ? THEN t.status END ORDER BY t.id SEPARATOR '|') AS prevdate_tasks_status,
    GROUP_CONCAT(CASE WHEN t.assign_to = omd.user_id AND t.due_date = ? THEN t.id END ORDER BY t.id SEPARATOR '|') AS prevdate_task_ids,
    GROUP_CONCAT(CASE WHEN t.assign_to = omd.user_id AND t.due_date = ? THEN COALESCE(nemf.case_id, nemft.case_id, '') END ORDER BY t.id SEPARATOR '|') AS prevdate_task_case_ids,
    GROUP_CONCAT(CASE WHEN t.assign_to = omd.user_id AND t.due_date = ? THEN COALESCE(nemf.project_name, nemft.project_name, '') END ORDER BY t.id SEPARATOR '|') AS prevdate_task_project_names,
    GROUP_CONCAT(CASE WHEN t.assign_to = omd.user_id AND t.due_date = ? THEN COALESCE(ceu.first_name, ceu2.first_name, '') END ORDER BY t.id SEPARATOR '|') AS prevdate_task_client_names,

    -- Prev date contributions
    GROUP_CONCAT(CASE WHEN t.contributon = omd.user_id AND t.due_date = ? THEN t.task END ORDER BY t.id SEPARATOR '|') AS prevdate_contributions,
    GROUP_CONCAT(CASE WHEN t.contributon = omd.user_id AND t.due_date = ? THEN t.status END ORDER BY t.id SEPARATOR '|') AS prevdate_contributions_status,
    GROUP_CONCAT(CASE WHEN t.contributon = omd.user_id AND t.due_date = ? THEN t.id END ORDER BY t.id SEPARATOR '|') AS prevdate_contribution_ids,
    GROUP_CONCAT(CASE WHEN t.contributon = omd.user_id AND t.due_date = ? THEN COALESCE(nemf.case_id, nemft.case_id, '') END ORDER BY t.id SEPARATOR '|') AS prevdate_contribution_case_ids,
    GROUP_CONCAT(CASE WHEN t.contributon = omd.user_id AND t.due_date = ? THEN COALESCE(nemf.project_name, nemft.project_name, '') END ORDER BY t.id SEPARATOR '|') AS prevdate_contribution_project_names,
    GROUP_CONCAT(CASE WHEN t.contributon = omd.user_id AND t.due_date =? THEN COALESCE(ceu.first_name, ceu2.first_name, '') END ORDER BY t.id SEPARATOR '|') AS prevdate_contribution_client_names,

    -- Counts
    COUNT(CASE WHEN t.due_date = ? AND t.status != 1 THEN t.id END) AS total_uncompleted_prevdate_tasks,
    COUNT(CASE WHEN t.due_date = ? AND t.status = 1 THEN t.id END) AS total_completed_prevdate_tasks,
    COUNT(t.id) AS total_tasks,
    COUNT(CASE WHEN t.status = 1 THEN t.id END) AS completed_tasks,
    ROUND((COUNT(CASE WHEN t.status = 1 THEN t.id END) / NULLIF(COUNT(t.id), 0)) * 100, 2) AS completion_percentage

FROM op_meeting_detail AS omd
LEFT JOIN users AS u ON u.id = omd.user_id  
LEFT JOIN users AS vu ON vu.id = omd.verified_by
LEFT JOIN todos AS t ON (
    (t.assign_to = omd.user_id OR t.contributon = omd.user_id)
    AND t.is_deleted = 0
    AND (t.due_date = omd.date OR t.due_date = ?)
)
-- Path 1: task linked via file_id
LEFT JOIN new_mst_file_details AS nmfd ON nmfd.id = t.file_id
LEFT JOIN new_mst_file AS nemf ON nemf.id = nmfd.project_id
LEFT JOIN users AS ceu ON ceu.id = nemf.client_id

-- Path 2: task linked directly via project_id
LEFT JOIN new_mst_file AS nemft ON nemft.id = t.project_id
LEFT JOIN users AS ceu2 ON ceu2.id = nemft.client_id

WHERE 
    omd.is_deleted = 0 
    AND omd.meeting_id = ?
GROUP BY omd.id`;

      //       var sql = `SELECT
      //     omd.*,
      //     u.first_name,
      //     u.last_name,
      //     u.profile_picture,
      //     vu.first_name AS verified_name,

      //     -- ✅ Aggregate project info instead of grouping by it
      //     GROUP_CONCAT(DISTINCT nemf.case_id SEPARATOR '|') AS case_ids,
      //     GROUP_CONCAT(DISTINCT nemf.project_name SEPARATOR '|') AS project_names,
      //     GROUP_CONCAT(DISTINCT ceu.first_name SEPARATOR '|') AS client_names,

      //     -- Today tasks
      //     GROUP_CONCAT(CASE WHEN t.assign_to = omd.user_id AND t.due_date = omd.date THEN t.task END ORDER BY t.task SEPARATOR '|') AS tasks_by_meeting,
      //     GROUP_CONCAT(CASE WHEN t.assign_to = omd.user_id AND t.due_date = omd.date THEN t.status END ORDER BY t.task SEPARATOR '|') AS tasks_by_meeting_status,
      //     GROUP_CONCAT(CASE WHEN t.assign_to = omd.user_id AND t.due_date = omd.date THEN t.id END ORDER BY t.task SEPARATOR '|') AS today_task_ids,
      //     GROUP_CONCAT(CASE WHEN t.assign_to = omd.user_id AND t.due_date = omd.date THEN nemf.case_id END ORDER BY t.task SEPARATOR '|') AS today_task_case_ids,
      //     GROUP_CONCAT(CASE WHEN t.assign_to = omd.user_id AND t.due_date = omd.date THEN nemf.project_name END ORDER BY t.task SEPARATOR '|') AS today_task_project_names,
      //     GROUP_CONCAT(CASE WHEN t.assign_to = omd.user_id AND t.due_date = omd.date THEN ceu.first_name END ORDER BY t.task SEPARATOR '|') AS today_task_client_names,

      //     -- Today contributions
      //     GROUP_CONCAT(CASE WHEN t.contributon = omd.user_id AND t.due_date = omd.date THEN t.task END ORDER BY t.task SEPARATOR '|') AS contributions_by_meeting,
      //     GROUP_CONCAT(CASE WHEN t.contributon = omd.user_id AND t.due_date = omd.date THEN t.status END ORDER BY t.task SEPARATOR '|') AS contributions_by_meeting_status,
      //     GROUP_CONCAT(CASE WHEN t.contributon = omd.user_id AND t.due_date = omd.date THEN t.id END ORDER BY t.task SEPARATOR '|') AS today_contribution_ids,
      //     GROUP_CONCAT(CASE WHEN t.contributon = omd.user_id AND t.due_date = omd.date THEN nemf.case_id END ORDER BY t.task SEPARATOR '|') AS today_contribution_case_ids,
      //     GROUP_CONCAT(CASE WHEN t.contributon = omd.user_id AND t.due_date = omd.date THEN nemf.project_name END ORDER BY t.task SEPARATOR '|') AS today_contribution_project_names,
      //     GROUP_CONCAT(CASE WHEN t.contributon = omd.user_id AND t.due_date = omd.date THEN ceu.first_name END ORDER BY t.task SEPARATOR '|') AS today_contribution_client_names,

      //     -- Prev date tasks
      //     GROUP_CONCAT(CASE WHEN t.assign_to = omd.user_id AND t.due_date = ? THEN t.task END ORDER BY t.task SEPARATOR '|') AS prevdate_tasks,
      //     GROUP_CONCAT(CASE WHEN t.assign_to = omd.user_id AND t.due_date = ? THEN t.status END ORDER BY t.task SEPARATOR '|') AS prevdate_tasks_status,
      //     GROUP_CONCAT(CASE WHEN t.assign_to = omd.user_id AND t.due_date = ? THEN t.id END ORDER BY t.task SEPARATOR '|') AS prevdate_task_ids,
      //     GROUP_CONCAT(CASE WHEN t.assign_to = omd.user_id AND t.due_date = ? THEN nemf.case_id END ORDER BY t.task SEPARATOR '|') AS prevdate_task_case_ids,
      //     GROUP_CONCAT(CASE WHEN t.assign_to = omd.user_id AND t.due_date = ? THEN nemf.project_name END ORDER BY t.task SEPARATOR '|') AS prevdate_task_project_names,
      //     GROUP_CONCAT(CASE WHEN t.assign_to = omd.user_id AND t.due_date = ? THEN ceu.first_name END ORDER BY t.task SEPARATOR '|') AS prevdate_task_client_names,

      //     -- Prev date contributions
      //     GROUP_CONCAT(CASE WHEN t.contributon = omd.user_id AND t.due_date = ? THEN t.task END ORDER BY t.task SEPARATOR '|') AS prevdate_contributions,
      //     GROUP_CONCAT(CASE WHEN t.contributon = omd.user_id AND t.due_date = ? THEN t.status END ORDER BY t.task SEPARATOR '|') AS prevdate_contributions_status,
      //     GROUP_CONCAT(CASE WHEN t.contributon = omd.user_id AND t.due_date = ? THEN t.id END ORDER BY t.task SEPARATOR '|') AS prevdate_contribution_ids,
      //     GROUP_CONCAT(CASE WHEN t.contributon = omd.user_id AND t.due_date = ? THEN nemf.case_id END ORDER BY t.task SEPARATOR '|') AS prevdate_contribution_case_ids,
      //     GROUP_CONCAT(CASE WHEN t.contributon = omd.user_id AND t.due_date = ? THEN nemf.project_name END ORDER BY t.task SEPARATOR '|') AS prevdate_contribution_project_names,
      //     GROUP_CONCAT(CASE WHEN t.contributon = omd.user_id AND t.due_date = ? THEN ceu.first_name END ORDER BY t.task SEPARATOR '|') AS prevdate_contribution_client_names,

      //     -- Counts
      //     COUNT(CASE WHEN t.due_date = ? AND t.status != 1 THEN t.id END) AS total_uncompleted_prevdate_tasks,
      //     COUNT(CASE WHEN t.due_date = ? AND t.status = 1 THEN t.id END) AS total_completed_prevdate_tasks,
      //     COUNT(t.id) AS total_tasks,
      //     COUNT(CASE WHEN t.status = 1 THEN t.id END) AS completed_tasks,
      //     ROUND((COUNT(CASE WHEN t.status = 1 THEN t.id END) / NULLIF(COUNT(t.id), 0)) * 100, 2) AS completion_percentage

      // FROM op_meeting_detail AS omd
      // LEFT JOIN users AS u ON u.id = omd.user_id
      // LEFT JOIN users AS vu ON vu.id = omd.verified_by
      // LEFT JOIN todos AS t ON (
      //     (t.assign_to = omd.user_id OR t.contributon = omd.user_id)
      //     AND t.is_deleted = 0
      //     AND (t.due_date = omd.date OR t.due_date = ?)
      // )
      // LEFT JOIN new_mst_file_details AS nmfd ON nmfd.id = t.file_id
      // LEFT JOIN new_mst_file AS nemf ON nemf.id = nmfd.project_id
      // LEFT JOIN users AS ceu ON ceu.id = nemf.client_id
      // WHERE
      //     omd.is_deleted = 0
      //     AND omd.meeting_id = ?
      // GROUP BY omd.id`;

      db.query(sql2, [queryDate, department], function (err2, result2) {
        if (err2) {
          return res.status(500).json({
            error: true,
            message: err2.sqlMessage,
            data: {},
          });
        }

        db.query(
          sql,
          [
            date,
            date,
            date,
            date,
            date,
            date,
            date,
            date,
            date,
            date,
            date,
            date,
            date,
            date,
            date,
            meeting_id,
          ],
          function (err, result) {
            if (err) {
              var data = { error: true, message: err.sqlMessage, data: {} };
              res.status(201).send(data);
            } else {
              if (result.length > 0) {
                var data = {
                  error: false,
                  message: "Recoard fetched successfully",
                  data: result,
                  departmentStats: result2[0] || {
                    total_tasks: 0,
                    completed_tasks: 0,
                    completion_percentage: 0,
                  },
                };
                res.status(201).send(data);
              } else {
                var data = { error: false, message: "Not found", data: [] };
                res.status(201).json(data);
              }
            }
          },
        );
      });
    });
  },
  // getPerformancebyUserId: async function (req, res) {
  //   const user_id = req?.params?.id;  // ← renamed from meeting_id for clarity

  //   var sql = `SELECT
  //     MAX(omd.id) AS id,
  //     omd.date,
  //     omd.clarity_1_key_highlight,
  //     omd.clarity_1_key_action,
  //     omd.clarity_2_key_highlight,
  //     omd.clarity_2_key_action,
  //     omd.user_id,
  //     u.first_name,
  //     u.last_name,
  //     u.profile_picture,
  //     MAX(vu.first_name) AS verified_name,

  //     -- Tasks assigned to the user for today
  //     GROUP_CONCAT(
  //         DISTINCT CASE
  //             WHEN t.assign_to = omd.user_id AND t.due_date = omd.date THEN t.task
  //         END
  //         ORDER BY t.task SEPARATOR '|'
  //     ) AS tasks_by_meeting,
  //     GROUP_CONCAT(
  //         DISTINCT CASE
  //             WHEN t.assign_to = omd.user_id AND t.due_date = omd.date THEN t.status
  //         END
  //         ORDER BY t.task SEPARATOR '|'
  //     ) AS tasks_by_meeting_status,

  //     -- Contributions by the user for today
  //     GROUP_CONCAT(
  //         DISTINCT CASE
  //             WHEN t.contributon = omd.user_id AND t.due_date = omd.date THEN t.task
  //         END
  //         ORDER BY t.task SEPARATOR '|'
  //     ) AS contributions_by_meeting,
  //     GROUP_CONCAT(
  //         DISTINCT CASE
  //             WHEN t.contributon = omd.user_id AND t.due_date = omd.date THEN t.status
  //         END
  //         ORDER BY t.task SEPARATOR '|'
  //     ) AS contributions_by_meeting_status,

  //     -- Tasks assigned from the previous date
  //     GROUP_CONCAT(
  //         DISTINCT CASE
  //             WHEN t.assign_to = omd.user_id AND t.due_date = omd.date - INTERVAL 1 DAY THEN t.task
  //         END
  //         ORDER BY t.task SEPARATOR '|'
  //     ) AS prevdate_tasks,
  //     GROUP_CONCAT(
  //         DISTINCT CASE
  //             WHEN t.assign_to = omd.user_id AND t.due_date = omd.date - INTERVAL 1 DAY THEN t.status
  //         END
  //         ORDER BY t.task SEPARATOR '|'
  //     ) AS prevdate_tasks_status,

  //     -- Contributions from the previous date
  //     GROUP_CONCAT(
  //         DISTINCT CASE
  //             WHEN t.contributon = omd.user_id AND t.due_date = omd.date - INTERVAL 1 DAY THEN t.task
  //         END
  //         ORDER BY t.task SEPARATOR '|'
  //     ) AS prevdate_contributions,
  //     GROUP_CONCAT(
  //         DISTINCT CASE
  //             WHEN t.contributon = omd.user_id AND t.due_date = omd.date - INTERVAL 1 DAY THEN t.status
  //         END
  //         ORDER BY t.task SEPARATOR '|'
  //     ) AS prevdate_contributions_status,

  //     -- Total uncompleted previous date tasks
  //     COUNT(
  //         DISTINCT CASE
  //             WHEN t.due_date = omd.date - INTERVAL 1 DAY AND t.status != 1 THEN t.id
  //         END
  //     ) AS total_uncompleted_prevdate_tasks,

  //     -- Total completed previous date tasks
  //     COUNT(
  //         DISTINCT CASE
  //             WHEN t.due_date = omd.date - INTERVAL 1 DAY AND t.status = 1 THEN t.id
  //         END
  //     ) AS total_completed_prevdate_tasks,

  //     -- Task IDs for all tasks assigned today
  //     GROUP_CONCAT(
  //         DISTINCT CASE
  //             WHEN t.due_date = omd.date AND t.assign_to = omd.user_id THEN t.id
  //         END
  //         ORDER BY t.task SEPARATOR '|'
  //     ) AS today_task_ids,

  //     -- Task IDs for all tasks assigned from the previous date
  //     GROUP_CONCAT(
  //         DISTINCT CASE
  //             WHEN t.due_date = omd.date - INTERVAL 1 DAY AND t.assign_to = omd.user_id THEN t.id
  //         END
  //         ORDER BY t.task SEPARATOR '|'
  //     ) AS prevdate_task_ids,

  //     -- Task IDs for all contributions today
  //     GROUP_CONCAT(
  //         DISTINCT CASE
  //             WHEN t.due_date = omd.date AND t.contributon = omd.user_id THEN t.id
  //         END
  //         ORDER BY t.task SEPARATOR '|'
  //     ) AS today_contribution_ids,

  //     -- Task IDs for all contributions from the previous date
  //     GROUP_CONCAT(
  //         DISTINCT CASE
  //             WHEN t.due_date = omd.date - INTERVAL 1 DAY AND t.contributon = omd.user_id THEN t.id
  //         END
  //         ORDER BY t.task SEPARATOR '|'
  //     ) AS prevdate_contribution_ids,

  //     -- Total unique tasks (avoid counting same task across multiple meetings)
  //     COUNT(DISTINCT t.id) AS total_tasks,

  //     -- Total completed unique tasks
  //     COUNT(DISTINCT CASE WHEN t.status = 1 THEN t.id END) AS completed_tasks,

  //     -- Completion percentage
  //     ROUND(
  //         (COUNT(DISTINCT CASE WHEN t.status = 1 THEN t.id END) / NULLIF(COUNT(DISTINCT t.id), 0)) * 100,
  //         2
  //     ) AS completion_percentage

  // FROM
  //     op_meeting_detail AS omd
  // LEFT JOIN
  //     users AS u ON u.id = omd.user_id
  // LEFT JOIN
  //     users AS vu ON vu.id = omd.verified_by
  // LEFT JOIN
  //     todos AS t ON (
  //         (t.assign_to = omd.user_id)
  //         OR (t.contributon = omd.user_id)
  //     )
  //     AND t.is_deleted = 0
  //     AND (
  //         t.due_date = omd.date
  //         OR t.due_date = omd.date - INTERVAL 1 DAY
  //     )
  // WHERE
  //     omd.is_deleted = 0
  //     AND omd.user_id = ?         -- ← correctly filters by user
  // GROUP BY
  //     omd.date,                   -- ← one record per date (deduplicates across meetings)
  //     omd.user_id,
  //     u.first_name,
  //     u.last_name,
  //     u.profile_picture,
  //           omd.clarity_1_key_highlight,
  //     omd.clarity_1_key_action,
  //     omd.clarity_2_key_highlight,
  //     omd.clarity_2_key_action
  // ORDER BY omd.date DESC
  // `;

  //   db.query(sql, [user_id], function (err, result) {
  //     if (err) {
  //       var data = { error: true, message: err.sqlMessage, data: {} };
  //       res.status(201).send(data);
  //     } else {
  //       if (result.length > 0) {
  //         var data = {
  //           error: false,
  //           message: "Record fetched successfully",
  //           data: result,
  //         };
  //         res.status(201).send(data);
  //       } else {
  //         var data = { error: false, message: "Not found", data: [] };
  //         res.status(201).json(data);
  //       }
  //     }
  //   });
  // },

  getPerformancebyUserId: async function (req, res) {
    const meeting_id = req?.params?.id;

    //get current user
    var sql = `SELECT
      omd.*,
      u.first_name,
      u.last_name,
      u.profile_picture,
       vu.first_name as verified_name,
      -- Tasks assigned to the user for the current meeting
      GROUP_CONCAT(
          CASE
              WHEN t.assign_to = omd.user_id AND t.due_date = omd.date THEN t.task
          END
          ORDER BY t.task SEPARATOR '|'
      ) AS tasks_by_meeting,
      GROUP_CONCAT(
          CASE
              WHEN t.assign_to = omd.user_id AND t.due_date = omd.date THEN t.status
          END
          ORDER BY t.task SEPARATOR '| '
      ) AS tasks_by_meeting_status,

      -- Contributions by the user for the current meeting
      GROUP_CONCAT(
          CASE
              WHEN t.contributon = omd.user_id AND t.due_date = omd.date THEN t.task
          END
          ORDER BY t.task SEPARATOR '|'
      ) AS contributions_by_meeting,
      GROUP_CONCAT(
          CASE
              WHEN t.contributon = omd.user_id AND t.due_date = omd.date THEN t.status
          END
          ORDER BY t.task SEPARATOR '| '
      ) AS contributions_by_meeting_status,

      -- Tasks assigned to the user from the previous date
      GROUP_CONCAT(
          CASE
              WHEN t.assign_to = omd.user_id AND t.due_date = omd.date - INTERVAL 1 DAY THEN t.task
          END
          ORDER BY t.task SEPARATOR '| '
      ) AS prevdate_tasks,
      GROUP_CONCAT(
          CASE
              WHEN t.assign_to = omd.user_id AND t.due_date = omd.date - INTERVAL 1 DAY THEN t.status
          END
          ORDER BY t.task SEPARATOR '| '
      ) AS prevdate_tasks_status,

      -- Contributions by the user from the previous date
      GROUP_CONCAT(
          CASE
              WHEN t.contributon = omd.user_id AND t.due_date = omd.date - INTERVAL 1 DAY THEN t.task
          END
          ORDER BY t.task SEPARATOR '| '
      ) AS prevdate_contributions,
      GROUP_CONCAT(
          CASE
              WHEN t.contributon = omd.user_id AND t.due_date = omd.date - INTERVAL 1 DAY THEN t.status
          END
          ORDER BY t.task SEPARATOR '|'
      ) AS prevdate_contributions_status,

      -- Total uncompleted previous date tasks
      COUNT(
          CASE
              WHEN t.due_date = omd.date - INTERVAL 1 DAY AND t.status != 1 THEN t.id
          END
      ) AS total_uncompleted_prevdate_tasks,

      -- Total completed previous date tasks
      COUNT(
          CASE
              WHEN t.due_date = omd.date - INTERVAL 1 DAY AND t.status = 1 THEN t.id
          END
      ) AS total_completed_prevdate_tasks,

      -- Task IDs for all tasks assigned today
      GROUP_CONCAT(
          CASE
              WHEN t.due_date = omd.date AND t.assign_to = omd.user_id THEN t.id
          END
          ORDER BY t.task SEPARATOR '|'
      ) AS today_task_ids,

      -- Task IDs for all tasks assigned from the previous date
      GROUP_CONCAT(
          CASE
              WHEN t.due_date = omd.date - INTERVAL 1 DAY AND t.assign_to = omd.user_id THEN t.id
          END
          ORDER BY t.task SEPARATOR '|'
      ) AS prevdate_task_ids,

      -- Task IDs for all contributions today
      GROUP_CONCAT(
          CASE
              WHEN t.due_date = omd.date AND t.contributon = omd.user_id THEN t.id
          END
          ORDER BY t.task SEPARATOR '|'
      ) AS today_contribution_ids,

      -- Task IDs for all contributions from the previous date
      GROUP_CONCAT(
          CASE
              WHEN t.due_date = omd.date - INTERVAL 1 DAY AND t.contributon = omd.user_id THEN t.id
          END
          ORDER BY t.task SEPARATOR '| '
      ) AS prevdate_contribution_ids,

      -- Total tasks for the current meeting
      COUNT(t.id) AS total_tasks,

      -- Total completed tasks for the current meeting
      COUNT(CASE WHEN t.status = 1 THEN t.id END) AS completed_tasks,

      -- Completion percentage for the current meeting
      ROUND(
          (COUNT(CASE WHEN t.status = 1 THEN t.id END) / NULLIF(COUNT(t.id), 0)) * 100,
          2
      ) AS completion_percentage

  FROM
      op_meeting_detail AS omd
  LEFT JOIN
      users AS u ON u.id = omd.user_id
          left join users as vu
      on vu.id = omd.verified_by
  LEFT JOIN
      todos AS t ON (
          (t.assign_to = omd.user_id)
          OR (t.contributon = omd.user_id)
      )
      AND t.is_deleted = 0
      AND (
          t.due_date = omd.date
          OR t.due_date = omd.date - INTERVAL 1 DAY
      )
  WHERE
      omd.is_deleted = 0
      AND omd.user_id = ?
  GROUP BY
      omd.id
      order by id desc
  `;

    db.query(sql, [meeting_id], function (err, result) {
      if (err) {
        var data = { error: true, message: err.sqlMessage, data: {} };
        res.status(201).send(data);
      } else {
        if (result.length > 0) {
          var data = {
            error: false,
            message: "Recoard fetched successfully",
            data: result,
          };
          res.status(201).send(data);
        } else {
          var data = { error: false, message: "Not found", data: [] };
          res.status(201).json(data);
        }
      }
    });
  },

  getperformanceTaskbyid: async function (req, res) {
    const id = req?.params?.id;

    //get current user
    var sql = `SELECT DISTINCT 
    t.id, 
    t.contributon,
    t.assign_to, 
    t.date, 
    t.status, 
    t.task, 
    t.priority,
    t.counter,
    DATE_FORMAT(t.due_date, '%d %b %Y') AS due_date,
     nemf.case_id,
    nemf.project_name,
      ucd.first_name AS client_name,
     ceu.first_name as cllii_name,
    GROUP_CONCAT(DISTINCT at.profile_picture) AS assign_to_profiles,
    GROUP_CONCAT(DISTINCT cu.profile_picture) AS contribution_profiles
FROM 
    todos AS t
              LEFT JOIN new_mst_file AS nmf 
            ON nmf.id = t.project_id
              left join new_mst_file_details as nmfd
            on nmfd.id = t.file_id
             LEFT JOIN new_mst_file AS nemf 
            ON nemf.id =  nmfd.project_id
       left join users as ceu
            on ceu.id = nemf.client_id
            LEFT JOIN users AS ucd 
            ON ucd.id = nmf.client_id
           
LEFT JOIN users AS at
    ON FIND_IN_SET(at.id, REPLACE(REPLACE(REPLACE(t.assign_to, '[', ''), ']', ''), ')', '')) > 0
LEFT JOIN users AS cu
    ON FIND_IN_SET(cu.id, REPLACE(REPLACE(REPLACE(t.contributon, '[', ''), ']', ''), ')', '')) > 0
WHERE 
    t.is_deleted = 0 
    AND (
        FIND_IN_SET(?, REPLACE(REPLACE(t.assign_to, '[', ''), ']', '')) > 0 OR
        FIND_IN_SET(?, REPLACE(REPLACE(t.contributon, '[', ''), ']', '')) > 0
    )
    AND t.due_date <= CURDATE()
    AND t.status = 0  
GROUP BY 
    t.id, 
    t.contributon,
    t.assign_to, 
    t.date, 
    t.status, 
    t.counter,
    t.task, 
    t.priority,
    t.due_date,
    ucd.first_name,
    ceu.first_name
ORDER BY 
    due_date;
  `;

    db.query(sql, [id, id], function (err, result) {
      if (err) {
        var data = { error: true, message: err.sqlMessage, data: {} };
        res.status(201).send(data);
      } else {
        if (result.length > 0) {
          var data = {
            error: false,
            message: "Recoard fetched successfully",
            data: result,
          };
          res.status(201).send(data);
        } else {
          var data = { error: false, message: "Not found", data: [] };
          res.status(201).json(data);
        }
      }
    });
  },

  getperformanceTaskpercentagebyid: (req, res) => {
    try {
      const id = req.params?.id;

      if (!isNaN(parseInt(id))) {
        const sql1 = `
          select u.first_name,u.last_name,GROUP_CONCAT(DISTINCT msd.name SEPARATOR ', ') as departmentName,
          GROUP_CONCAT(DISTINCT mg.name SEPARATOR ', ') as RolesName
           from users as u
left join users_groups as ug on ug.mst_user_id = u.id
left join mst_groups as mg on mg.id = ug.mst_group_id
LEFT JOIN user_department_post as udp ON udp.user_id = u.id
LEFT JOIN mst_department msd ON msd.id = udp.department_id
where u.id=?`;

        const sql2 = `
         SELECT
    COUNT(t.id) AS total_task,
    COUNT(CASE WHEN t.status = 1 THEN 1 END) AS completed_task,
    COUNT(CASE WHEN t.status = 0 THEN 1 END) AS uncompleted_task,
      COUNT(CASE WHEN t.status = 1 AND DATE(t.due_date) = DATE(tc.created_at) THEN 1 END) AS on_time_completed_task,
    ROUND((COUNT(CASE WHEN t.status = 1 THEN 1 END) / NULLIF(COUNT(t.id), 0)) * 100, 2) AS completion_percentage,
    ROUND((COUNT(CASE WHEN t.status = 0 THEN 1 END) / NULLIF(COUNT(t.id), 0)) * 100, 2) AS uncompleted_percentage,
      ROUND(
    (COUNT(CASE WHEN t.status = 1 AND DATE(t.due_date) = DATE(tc.created_at) THEN 1 END) /
    NULLIF(COUNT(t.id), 0)) * 100, 
    2
  ) AS on_time_completion_percentage
FROM todos as t
LEFT JOIN todos_counter AS tc ON tc.todos_id = t.id
WHERE t.is_deleted = 0 
    AND t.assign_to = ?
    AND t.due_date <= CURDATE()`;

        // Execute the first query
        db.query(sql1, [id], (err1, result1) => {
          if (err1) {
            return res.status(500).json({
              message: err1.sqlMessage,
              error: true,
              data: {},
            });
          }

          // Execute the second query
          db.query(sql2, [id], (err2, result2) => {
            if (err2) {
              return res.status(500).json({
                message: err2.sqlMessage,
                error: true,
                data: {},
              });
            }

            // Combine results from both queries
            res.status(200).json({
              message: "Records fetched successfully",
              error: false,
              data: {
                namestats: result1[0],
                taskstats: result2[0],
              },
            });
          });
        });
      } else {
        res.status(400).json({
          message: "Invalid request: ID must be a number",
          error: true,
          data: {},
        });
      }
    } catch (err) {
      res.status(500).json({
        message: "Server error",
        error: true,
        data: {},
      });
    }
  },

  getTaskPercentage: (req, res) => {
    try {
      const id = req.params?.id;

      // SQL query to fetch the date of the previous meeting
      const sqlDate = `
      SELECT 
    om.id, 
    (
        SELECT DATE_FORMAT(date, '%Y-%m-%d')
        FROM op_meeting
        WHERE id = (
            SELECT MAX(id)
            FROM op_meeting
            WHERE id < om.id
              AND mst_department_id = om.mst_department_id
        )
    ) AS formatted_date
FROM op_meeting om
WHERE om.id = ?;
      `;

      db.query(sqlDate, [id], (errDate, resultDate) => {
        if (errDate) {
          return res.status(500).json({
            message: errDate.sqlMessage,
            error: true,
            data: {},
          });
        }

        if (resultDate.length === 0) {
          return res.status(404).json({
            message: "No previous meeting found",
            error: true,
            data: {},
          });
        }

        const date = resultDate[0].formatted_date;

        // SQL query to fetch mst_department_id for the given meeting
        const sql0 = `SELECT mst_department_id FROM op_meeting WHERE id = ?`;

        db.query(sql0, [id], (err0, result0) => {
          if (err0) {
            return res.status(500).json({
              message: err0.sqlMessage,
              error: true,
              data: {},
            });
          }

          const department = result0[0].mst_department_id;

          // SQL query to fetch task completion data based on department and previous meeting date
          const sqlTasks = `
       SELECT
  COUNT(t.id) AS total_task,
  COUNT(CASE WHEN t.status = 1 THEN 1 END) AS completed_task,
  COUNT(CASE WHEN t.status = 0 THEN 1 END) AS uncompleted_task,
  COUNT(CASE WHEN t.status = 1 AND DATE(t.due_date) = DATE(tc.created_at) THEN 1 END) AS on_time_completed_task,
  ROUND(
    (COUNT(CASE WHEN t.status = 1 THEN 1 END) / NULLIF(COUNT(t.id), 0)) * 100, 
    2
  ) AS completion_percentage,
  ROUND(
    (COUNT(CASE WHEN t.status = 0 THEN 1 END) / NULLIF(COUNT(t.id), 0)) * 100, 
    2
  ) AS uncompleted_percentage,
  ROUND(
    (COUNT(CASE WHEN t.status = 1 AND DATE(t.due_date) = DATE(tc.created_at) THEN 1 END) /
    NULLIF(COUNT(t.id), 0)) * 100, 
    2
  ) AS on_time_completion_percentage
FROM todos AS t
LEFT JOIN todos_counter AS tc ON tc.todos_id = t.id
WHERE 
  t.is_deleted = 0 
  AND t.mst_department_id = ? 
  AND DATE(t.due_date) = ?
          `;

          db.query(sqlTasks, [department, date], (err, result) => {
            if (err) {
              return res
                .status(500)
                .json({ message: err.sqlMessage, error: true, data: {} });
            }

            if (result.length) {
              return res.status(200).json({
                message: "Record fetched",
                error: false,
                data: result,
              });
            } else {
              return res
                .status(200)
                .json({ message: "Not found", error: false, data: [] });
            }
          });
        });
      });
    } catch (err) {
      return res
        .status(500)
        .json({ message: "Internal server error", error: true, data: {} });
    }
  },

  checktaskbyclickCheckbox: function (req, res) {
    const { task_id, status } = req.body;

    const user_id = req?.user?.id;
    const task = {
      status,
      status_at: getCurrentDateAndTime(),
      status_by: user_id,
    };

    const updateSql = `
      UPDATE todos 
      SET status = ?, status_at = ?, status_by = ? 
      WHERE id = ?
    `;

    db.query(
      updateSql,
      [task.status, task.status_at, task.status_by, task_id],
      (err, result) => {
        if (err) {
          console.error("Database update error:", err);
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        if (result.affectedRows === 0) {
          return res
            .status(404)
            .json({ error: true, message: "Task not found", data: {} });
        }

        return res.status(200).json({
          error: false,
          message: "Task status updated successfully",
          data: task,
        });
      },
    );
  },

  AttendanceforTeamid: async function (req, res) {
    const id = req?.params?.id;

    // Query to fetch detailed attendance data
    var sql = `
        SELECT a.*, 
            TIME_FORMAT(checkin, '%h:%i %p') AS formatted_checkin, 
            TIME_FORMAT(checkout, '%h:%i %p') AS formatted_checkout, 
            TIMESTAMPDIFF(MINUTE, breakin, breakout) AS total_break_minutes 
        FROM attendance AS a 
        LEFT JOIN users AS u ON u.id = a.user_id 
        WHERE a.user_id = ? 
        ORDER BY a.date DESC`;

    // Query to fetch year-wise half day and leave count
    var sql2 = `
        SELECT 
            YEAR(a.date) AS year, 
            SUM(CASE WHEN a.att_type = 2 THEN 1 ELSE 0 END) AS total_half_days,
            SUM(CASE WHEN a.att_type = 3 THEN 1 ELSE 0 END) AS total_leaves
        FROM attendance AS a
        WHERE a.is_deleted = 0 AND a.user_id = ?
        GROUP BY YEAR(a.date);`;

    db.query(sql, [id], function (err, result1) {
      if (err) {
        return res
          .status(201)
          .send({ error: true, message: err.sqlMessage, data: {} });
      }

      db.query(sql2, [id], function (err, result2) {
        if (err) {
          return res
            .status(201)
            .send({ error: true, message: err.sqlMessage, data: {} });
        }

        // Send response with combined results
        return res.status(201).send({
          error: false,
          message: "Record fetched successfully",
          attendance_data: result1,
          total_employee: result2,
        });
      });
    });
  },

  fetchAllLeave: (req, res) => {
    try {
      var sql = `
      SELECT 
        a.id, 
        DATE_FORMAT(a.date, '%Y-%m-%d') as date,
        DATE_FORMAT(a.created_at, '%Y-%m-%d') as applied_at,
        a.notes, 
        a.reason, 
        u.first_name, 
        u.last_name, 
        u.profile_picture, 
        a.status,
        CASE 
          WHEN a.att_type = 3 THEN 'Full Day' 
          WHEN a.att_type = 2 THEN 'Half Day' 
          ELSE 'Unknown' 
        END AS leave_type 
      FROM attendance AS a
      LEFT JOIN users AS u ON u.id = a.user_id
      WHERE a.is_deleted = 0 
      AND (a.att_type = 3 OR a.att_type = 2) order by id desc`;

      db.query(sql, (err, result) => {
        if (err) {
          res
            .status(200)
            .json({ message: err.sqlMessage, error: true, data: {} });
        } else if (result.length) {
          res
            .status(200)
            .json({ message: "Record fetched", error: false, data: result });
        } else {
          res
            .status(200)
            .json({ message: "Not found", error: false, data: [] });
        }
      });
    } catch (err) {
      res
        .status(200)
        .json({ message: "Invalid request", error: true, data: {} });
    }
  },

  getTacticalDates: (req, res) => {
    try {
      var sql = `
SELECT DISTINCT date 
FROM tc_meeting 
ORDER BY date DESC`;

      db.query(sql, (err, result) => {
        if (err) {
          res
            .status(200)
            .json({ message: err.sqlMessage, error: true, data: {} });
        } else if (result.length) {
          res
            .status(200)
            .json({ message: "Record fetched", error: false, data: result });
        } else {
          res
            .status(200)
            .json({ message: "Not found", error: false, data: [] });
        }
      });
    } catch (err) {
      res
        .status(200)
        .json({ message: "Invalid request", error: true, data: {} });
    }
  },

  getStrategicDates: (req, res) => {
    try {
      var sql = `
SELECT DISTINCT date 
FROM st_meeting 
ORDER BY date DESC`;

      db.query(sql, (err, result) => {
        if (err) {
          res
            .status(200)
            .json({ message: err.sqlMessage, error: true, data: {} });
        } else if (result.length) {
          res
            .status(200)
            .json({ message: "Record fetched", error: false, data: result });
        } else {
          res
            .status(200)
            .json({ message: "Not found", error: false, data: [] });
        }
      });
    } catch (err) {
      res
        .status(200)
        .json({ message: "Invalid request", error: true, data: {} });
    }
  },

  ApprovedLeave: function (req, res) {
    const this_data = req.body;
    const id = req.body.id;
    const task = {
      notes: this_data.notes,
      status: this_data.status,
    };

    const updateSql = `
    UPDATE attendance 
    SET notes = ?, status = ?
    WHERE id = ?
  `;

    db.query(updateSql, [task.notes, task.status, id], (err, result) => {
      if (err) {
        console.error("Database update error:", err);
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      if (result.affectedRows === 0) {
        return res
          .status(404)
          .json({ error: true, message: "leave not found", data: {} });
      }

      return res.status(200).json({
        error: false,
        message: "leave status updated successfully",
        data: task,
      });
    });
  },

  getLeaveApprovedbyid: (req, res) => {
    try {
      const id = req.params?.id;
      if (parseInt(id) != NaN) {
        var sql = "select id,reason,status from attendance where id=" + id + "";
        db.query(sql, (err, result) => {
          if (err) {
            res
              .status(200)
              .json({ message: err.sqlMessage, error: true, data: {} });
          } else if (result.length) {
            res
              .status(200)
              .json({ message: "Record fetched", error: false, data: result });
          } else {
            res
              .status(200)
              .json({ message: "Not found", error: false, data: [] });
          }
        });
      } else {
        res
          .status(200)
          .json({ message: "Invalid request", error: true, data: {} });
      }
    } catch (err) {
      res
        .status(200)
        .json({ message: "Invalid request", error: true, data: {} });
    }
  },

  addDocumentforTeam: function (req, res) {
    const files = [];
    let adhar_card = req.body?.adhar_card || "";
    let graduation_certificate = req.body?.graduation_certificate || "";
    let offer_letter = req.body?.offer_letter || "";
    let bond_agreement = req.body?.bond_agreement || "";
    let signature = req.body?.signature || "";

    if (req.files && Array.isArray(req.files)) {
      req.files.forEach((file) => {
        if (file.fieldname === "adhar_card") {
          adhar_card = getImageWithFoldername(file.path);
          files.push(adhar_card);
        } else if (file.fieldname === "graduation_certificate") {
          graduation_certificate = getImageWithFoldername(file.path);
          files.push(graduation_certificate);
        } else if (file.fieldname === "offer_letter") {
          offer_letter = getImageWithFoldername(file.path);
          files.push(offer_letter);
        } else if (file.fieldname === "bond_agreement") {
          bond_agreement = getImageWithFoldername(file.path);
          files.push(bond_agreement);
        } else if (file.fieldname === "signature") {
          signature = getImageWithFoldername(file.path);
          files.push(signature);
        } else {
          // Unlink unnecessary files
          if (typeof unlinkSingleImage === "function") {
            unlinkSingleImage(getImageWithFoldername(file.path));
          }
        }
      });
    }

    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const document = {
      adhar_card: adhar_card,
      graduation_certificate: graduation_certificate,
      offer_letter: offer_letter,
      bond_agreement: bond_agreement,
      signature: signature,
    };

    if (this_data.id) {
      // Fetch existing document_file and pv_file if new ones are not uploaded
      const getExistingFilesQuery = `SELECT adhar_card, graduation_certificate,offer_letter,bond_agreement,signature FROM users WHERE id = ?`;

      db.query(getExistingFilesQuery, [this_data.id], function (err, results) {
        if (err) {
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        if (results.length > 0) {
          // Preserve old file paths if no new file is uploaded
          if (!adhar_card) document.adhar_card = results[0].adhar_card;
          if (!graduation_certificate)
            document.graduation_certificate = results[0].graduation_certificate;
          if (!offer_letter) document.offer_letter = results[0].offer_letter;
          if (!bond_agreement)
            document.bond_agreement = results[0].bond_agreement;
          if (!signature) document.signature = results[0].signature;
        }

        // Update the existing record
        const updateQuery = `UPDATE users SET ? WHERE id = ?`;

        db.query(updateQuery, [document, this_data.id], function (err, result) {
          if (err) {
            return res
              .status(500)
              .json({ error: true, message: err.sqlMessage, data: {} });
          }

          if (result.affectedRows === 0) {
            return res.status(404).json({
              error: true,
              message: "No record found to update.",
              data: {},
            });
          }

          return res.status(200).json({
            error: false,
            message: "document has been updated successfully.",
            data: { id: this_data.id },
          });
        });
      });
    } else {
      // Insert new record
      document.document_by = getCurrentDateAndTime();

      db.query("INSERT INTO users SET ?", document, function (err, result) {
        if (err) {
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        return res.status(201).json({
          error: false,
          message: "Users has been added successfully.",
          data: { id: result.insertId },
        });
      });
    }
  },

  fetchdocumentbyid: (req, res) => {
    try {
      const id = req.params?.id;
      if (parseInt(id) != NaN) {
        var sql =
          "select id,adhar_card,graduation_certificate,offer_letter,bond_agreement,signature from users where id=" +
          id +
          "";
        db.query(sql, (err, result) => {
          if (err) {
            res
              .status(200)
              .json({ message: err.sqlMessage, error: true, data: {} });
          } else if (result.length) {
            res
              .status(200)
              .json({ message: "Record fetched", error: false, data: result });
          } else {
            res
              .status(200)
              .json({ message: "Not found", error: false, data: [] });
          }
        });
      } else {
        res
          .status(200)
          .json({ message: "Invalid request", error: true, data: {} });
      }
    } catch (err) {
      res
        .status(200)
        .json({ message: "Invalid request", error: true, data: {} });
    }
  },

  deleteAdharcard: (req, res) => {
    try {
      const id = !isNaN(parseInt(req?.params?.id))
        ? parseInt(req?.params?.id)
        : undefined;

      if (id) {
        const data = {
          adhar_card: null, // Set to NULL instead of an empty string
          document_at: getCurrentDateAndTime(),
          document_by: !isNaN(parseInt(req?.user?.id))
            ? parseInt(req?.user?.id)
            : 0,
        };

        const sql =
          "UPDATE `users` SET `adhar_card` = ?, `document_at` = ?, `document_by` = ? WHERE `id` = ?";
        const values = [
          data.adhar_card,
          data.document_at,
          data.document_by,
          id,
        ];

        db.query(sql, values, (err, result) => {
          if (err) {
            console.log(err);
            res
              .status(200)
              .json({ message: err.sqlMessage, error: true, data: {} });
          } else {
            res
              .status(200)
              .json({ error: false, message: "Removed!", data: {} });
          }
        });
      } else {
        res
          .status(200)
          .json({ error: true, message: "Invalid request", data: {} });
      }
    } catch (err) {
      console.log(err);
      res.status(200).json({
        error: true,
        message: "Server API error: Something went wrong",
        data: {},
      });
    }
  },
  deleteGraduation: (req, res) => {
    try {
      const id = !isNaN(parseInt(req?.params?.id))
        ? parseInt(req?.params?.id)
        : undefined;

      if (id) {
        const data = {
          graduation_certificate: null, // Set to NULL instead of an empty string
          document_at: getCurrentDateAndTime(),
          document_by: !isNaN(parseInt(req?.user?.id))
            ? parseInt(req?.user?.id)
            : 0,
        };

        const sql =
          "UPDATE `users` SET `graduation_certificate` = ?, `document_at` = ?, `document_by` = ? WHERE `id` = ?";
        const values = [
          data.graduation_certificate,
          data.document_at,
          data.document_by,
          id,
        ];

        db.query(sql, values, (err, result) => {
          if (err) {
            console.log(err);
            res
              .status(200)
              .json({ message: err.sqlMessage, error: true, data: {} });
          } else {
            res
              .status(200)
              .json({ error: false, message: "Removed!", data: {} });
          }
        });
      } else {
        res
          .status(200)
          .json({ error: true, message: "Invalid request", data: {} });
      }
    } catch (err) {
      console.log(err);
      res.status(200).json({
        error: true,
        message: "Server API error: Something went wrong",
        data: {},
      });
    }
  },
  deleteOfferletter: (req, res) => {
    try {
      const id = !isNaN(parseInt(req?.params?.id))
        ? parseInt(req?.params?.id)
        : undefined;

      if (id) {
        const data = {
          offer_letter: null, // Set to NULL instead of an empty string
          document_at: getCurrentDateAndTime(),
          document_by: !isNaN(parseInt(req?.user?.id))
            ? parseInt(req?.user?.id)
            : 0,
        };

        const sql =
          "UPDATE `users` SET `offer_letter` = ?, `document_at` = ?, `document_by` = ? WHERE `id` = ?";
        const values = [
          data.offer_letter,
          data.document_at,
          data.document_by,
          id,
        ];

        db.query(sql, values, (err, result) => {
          if (err) {
            console.log(err);
            res
              .status(200)
              .json({ message: err.sqlMessage, error: true, data: {} });
          } else {
            res
              .status(200)
              .json({ error: false, message: "Removed!", data: {} });
          }
        });
      } else {
        res
          .status(200)
          .json({ error: true, message: "Invalid request", data: {} });
      }
    } catch (err) {
      console.log(err);
      res.status(200).json({
        error: true,
        message: "Server API error: Something went wrong",
        data: {},
      });
    }
  },
  deletebondAgreement: (req, res) => {
    try {
      const id = !isNaN(parseInt(req?.params?.id))
        ? parseInt(req?.params?.id)
        : undefined;

      if (id) {
        const data = {
          bond_agreement: null, // Set to NULL instead of an empty string
          document_at: getCurrentDateAndTime(),
          document_by: !isNaN(parseInt(req?.user?.id))
            ? parseInt(req?.user?.id)
            : 0,
        };

        const sql =
          "UPDATE `users` SET `bond_agreement` = ?, `document_at` = ?, `document_by` = ? WHERE `id` = ?";
        const values = [
          data.bond_agreement,
          data.document_at,
          data.document_by,
          id,
        ];

        db.query(sql, values, (err, result) => {
          if (err) {
            console.log(err);
            res
              .status(200)
              .json({ message: err.sqlMessage, error: true, data: {} });
          } else {
            res
              .status(200)
              .json({ error: false, message: "Removed!", data: {} });
          }
        });
      } else {
        res
          .status(200)
          .json({ error: true, message: "Invalid request", data: {} });
      }
    } catch (err) {
      console.log(err);
      res.status(200).json({
        error: true,
        message: "Server API error: Something went wrong",
        data: {},
      });
    }
  },
  deleteSignature: (req, res) => {
    try {
      const id = !isNaN(parseInt(req?.params?.id))
        ? parseInt(req?.params?.id)
        : undefined;

      if (id) {
        const data = {
          signature: null, // Set to NULL instead of an empty string
          document_at: getCurrentDateAndTime(),
          document_by: !isNaN(parseInt(req?.user?.id))
            ? parseInt(req?.user?.id)
            : 0,
        };

        const sql =
          "UPDATE `users` SET `signature` = ?, `document_at` = ?, `document_by` = ? WHERE `id` = ?";
        const values = [data.signature, data.document_at, data.document_by, id];

        db.query(sql, values, (err, result) => {
          if (err) {
            console.log(err);
            res
              .status(200)
              .json({ message: err.sqlMessage, error: true, data: {} });
          } else {
            res
              .status(200)
              .json({ error: false, message: "Removed!", data: {} });
          }
        });
      } else {
        res
          .status(200)
          .json({ error: true, message: "Invalid request", data: {} });
      }
    } catch (err) {
      console.log(err);
      res.status(200).json({
        error: true,
        message: "Server API error: Something went wrong",
        data: {},
      });
    }
  },

  updateTransfer: function (req, res) {
    const this_data = req.body;
    const user_id = req?.user?.id;
    const id = this_data.id;

    const task = {
      assign_to: this_data.transferto,
      updated_at: getCurrentDateAndTime(),
      updated_by: user_id,
    };

    const updateSql = `
        UPDATE todos 
        SET assign_to = ?, 
        updated_at = ?, 
        updated_by = ? 
        WHERE is_deleted = 0 
        AND status = 0 
        AND assign_to = ?`;

    db.query(
      updateSql,
      [task.assign_to, task.updated_at, parseInt(task.updated_by), id],
      (err, result) => {
        if (err) {
          console.error("Database update error:", err);
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({
            error: true,
            message: "Transfer todo not found",
            data: {},
          });
        }

        const response = {
          error: false,
          message: "Transfer task has been updated successfully.",
          data: { id },
        };
        res.status(200).json(response);
      },
    );
  },

  fetchAllemp: (req, res) => {
    try {
      const id = req.params?.id;

      if (parseInt(id) != NaN) {
        var sql = "select * from users";
        db.query(sql, (err, result) => {
          if (err) {
            res
              .status(200)
              .json({ message: err.sqlMessage, error: true, data: {} });
          } else if (result.length) {
            res
              .status(200)
              .json({ message: "Record fetched", error: false, data: result });
          } else {
            res
              .status(200)
              .json({ message: "Not found", error: false, data: [] });
          }
        });
      } else {
        res
          .status(200)
          .json({ message: "Invalid request", error: true, data: {} });
      }
    } catch (err) {
      res
        .status(200)
        .json({ message: "Invalid request", error: true, data: {} });
    }
  },

  getTacticalperformacepercentagebyuserid: (req, res) => {
    try {
      const id = req.params?.id;

      if (!isNaN(parseInt(id))) {
        const sql1 = `
            select u.first_name,u.last_name,GROUP_CONCAT(DISTINCT msd.name SEPARATOR ', ') as departmentName,
            GROUP_CONCAT(DISTINCT mg.name SEPARATOR ', ') as RolesName
            from users as u
left join users_groups as ug on ug.mst_user_id = u.id
left join mst_groups as mg on mg.id = ug.mst_group_id
LEFT JOIN user_department_post as udp ON udp.user_id = u.id
LEFT JOIN mst_department msd ON msd.id = udp.department_id
where u.id= ?`;

        const sql2 = `SELECT 
        SUM(tmd.total_task) AS total_task,
        SUM(tmd.total_completed_tasks) AS total_completed_tasks,
        SUM(tmd.total_uncompleted_tasks) AS total_uncompleted_tasks,
        ROUND((SUM(tmd.total_completed_tasks) / SUM(tmd.total_task)) * 100, 2) AS completed_percentage,
        ROUND((SUM(tmd.total_uncompleted_tasks) / SUM(tmd.total_task)) * 100, 2) AS uncompleted_percentage
        FROM 
        tc_meeting_detail AS tmd
        WHERE 
        tmd.is_deleted = 0 
        AND tmd.user_id = ?`;

        const sql3 = ` select id,on_time,completed_percentage from tc_meeting_detail where user_id = ? order by id desc`;

        // Execute the first query
        db.query(sql1, [id], (err1, result1) => {
          if (err1) {
            return res.status(500).json({
              message: err1.sqlMessage,
              error: true,
              data: {},
            });
          }

          // Execute the second query
          db.query(sql2, [id], (err2, result2) => {
            if (err2) {
              return res.status(500).json({
                message: err2.sqlMessage,
                error: true,
                data: {},
              });
            }

            db.query(sql3, [id], (err3, result3) => {
              if (err3) {
                return res.status(500).json({
                  message: err3.sqlMessage,
                  error: true,
                  data: {},
                });
              }

              res.status(200).json({
                message: "Records fetched successfully",
                error: false,
                data: {
                  namestats: result1[0],
                  taskstats: result2[0],
                  ontimestats: result3[0],
                },
              });
            });
          });
        });
      } else {
        res.status(400).json({
          message: "Invalid request: ID must be a number",
          error: true,
          data: {},
        });
      }
    } catch (err) {
      res.status(500).json({
        message: "Server error",
        error: true,
        data: {},
      });
    }
  },

  getstrategicperformacepercentagebyuserid: (req, res) => {
    try {
      const id = req.params?.id;

      if (!isNaN(parseInt(id))) {
        const sql1 = `
       select u.first_name,u.last_name,GROUP_CONCAT(DISTINCT msd.name SEPARATOR ', ') as departmentName,
       GROUP_CONCAT(DISTINCT mg.name SEPARATOR ', ') as RolesName
       from users as u
left join users_groups as ug on ug.mst_user_id = u.id
left join mst_groups as mg on mg.id = ug.mst_group_id
LEFT JOIN user_department_post as udp ON udp.user_id = u.id
LEFT JOIN mst_department msd ON msd.id = udp.department_id
where u.id= ?`;

        const sql2 = `SELECT 
  SUM(tmd.total_task) AS total_task,
  SUM(tmd.total_completed_tasks) AS total_completed_tasks,
  SUM(tmd.total_uncompleted_tasks) AS total_uncompleted_tasks,
  ROUND((SUM(tmd.total_completed_tasks) / SUM(tmd.total_task)) * 100, 2) AS completed_percentage,
  ROUND((SUM(tmd.total_uncompleted_tasks) / SUM(tmd.total_task)) * 100, 2) AS uncompleted_percentage
FROM 
  st_meeting_detail AS tmd
WHERE 
  tmd.is_deleted = 0 
  AND tmd.user_id = ?`;

        const sql3 = ` select id,on_time,completed_percentage from st_meeting_detail where user_id = ? order by id desc`;

        // Execute the first query
        db.query(sql1, [id], (err1, result1) => {
          if (err1) {
            return res.status(500).json({
              message: err1.sqlMessage,
              error: true,
              data: {},
            });
          }

          // Execute the second query
          db.query(sql2, [id], (err2, result2) => {
            if (err2) {
              return res.status(500).json({
                message: err2.sqlMessage,
                error: true,
                data: {},
              });
            }

            db.query(sql3, [id], (err3, result3) => {
              if (err3) {
                return res.status(500).json({
                  message: err3.sqlMessage,
                  error: true,
                  data: {},
                });
              }

              res.status(200).json({
                message: "Records fetched successfully",
                error: false,
                data: {
                  namestats: result1[0],
                  taskstats: result2[0],
                  ontimestats: result3[0],
                },
              });
            });
          });
        });
      } else {
        res.status(400).json({
          message: "Invalid request: ID must be a number",
          error: true,
          data: {},
        });
      }
    } catch (err) {
      res.status(500).json({
        message: "Server error",
        error: true,
        data: {},
      });
    }
  },

  fetchdashboardData: async (req, res) => {
    const now = Date.now();
    if (
      dashboardCache.data &&
      now - dashboardCache.lastFetched < dashboardCache.TTL
    ) {
      return res.status(200).json({
        message: "Record fetched",
        error: false,
        data: dashboardCache.data,
      });
    }

    if (dashboardCache.isFetching) {
      await new Promise((resolve) => {
        const interval = setInterval(() => {
          if (!dashboardCache.isFetching) {
            clearInterval(interval);
            resolve();
          }
        }, 100);
      });
      return res.status(200).json({
        message: "Record fetched",
        error: false,
        data: dashboardCache.data,
      });
    }

    dashboardCache.isFetching = true;

    const queryAsync = (sql) =>
      new Promise((resolve, reject) => {
        db.query(sql, (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });

    const transformProjectData = (rows) =>
      rows.reduce((acc, row) => {
        acc[row.status] = row.status_count;
        return acc;
      }, {});

    const replaceNullWithZero = (data) => {
      if (Array.isArray(data)) {
        return data.map((item) =>
          Object.fromEntries(
            Object.entries(item).map(([key, value]) => [key, value ?? "0"]),
          ),
        );
      } else if (typeof data === "object" && data !== null) {
        return Object.fromEntries(
          Object.entries(data).map(([key, value]) => [key, value ?? "0"]),
        );
      }
      return data;
    };

    const queries = {
      projectQuery: `
      SELECT 'approval_process_count' AS status, COUNT(*) AS status_count
      FROM (
          SELECT DISTINCT nmf.id
          FROM new_mst_file nmf
          JOIN new_mst_file_project_details nmfpd 
            ON nmfpd.project_id = nmf.id
          WHERE nmf.is_deleted = 0 
            AND nmfpd.is_deleted = 0
            AND nmfpd.application_name = 'approval_process'
      ) AS approval_process_count

      UNION ALL

      SELECT 'dc' AS status, COUNT(*) AS status_count
      FROM (
          SELECT 
              nmf.id,
              ANY_VALUE(dc_sub.completed_date) AS completed_date
          FROM new_mst_file AS nmf
          LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
          LEFT JOIN mst_project_details AS mpd ON mpd.id = nmfd.project_name
          LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
          LEFT JOIN (
              SELECT dc1.*
              FROM document_collection dc1
              INNER JOIN (
                  SELECT document_clearance_id, MIN(id) AS min_id
                  FROM document_collection
                  GROUP BY document_clearance_id
              ) dc_min ON dc1.id = dc_min.min_id
          ) AS dc_sub ON dc_sub.document_clearance_id = nmf.id
          WHERE mpd.title = 'D.C.'
            AND nmfpd.is_deleted = 0
            AND nmfpd.application_name = 'approval_process'
            AND nmfd.source_type = 1
          GROUP BY nmf.id
      ) AS dc_result
      WHERE completed_date IS NOT NULL

      UNION ALL

      SELECT 'pv' AS status, COUNT(*) AS status_count
      FROM (
          SELECT 
              nmf.id,
              ANY_VALUE(pv.pv_file) AS pv_file
          FROM new_mst_file AS nmf
          LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
          LEFT JOIN mst_project_details AS mpd ON mpd.id = nmfd.project_name
          LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
          LEFT JOIN pv ON pv.approval_id = nmf.id
          WHERE mpd.title = 'P.V.'
            AND nmfpd.is_deleted = 0
            AND nmfpd.application_name = 'approval_process'
            AND nmfd.source_type = 1
          GROUP BY nmf.id
      ) AS pv_result
      WHERE pv_file IS NOT NULL

      UNION ALL

      SELECT 'firenoc' AS status, COUNT(*) AS status_count
      FROM (
          SELECT 
              nmf.id,
              ANY_VALUE(fn.fire_noc_receipt) AS fire_noc_receipt
          FROM new_mst_file AS nmf
          LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
          LEFT JOIN mst_project_details AS mpd ON mpd.id = nmfd.project_name
          LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
          LEFT JOIN fire_noc AS fn ON fn.approval_id = nmf.id
          WHERE mpd.title = 'Fire NOC'
            AND nmfpd.is_deleted = 0
            AND nmfpd.application_name = 'approval_process'
            AND nmfd.source_type = 1
          GROUP BY nmf.id
      ) AS fn_result
      WHERE fire_noc_receipt IS NOT NULL

      UNION ALL

      SELECT 'bpermission' AS status, COUNT(*) AS status_count
      FROM (
          SELECT 
              nmf.id,
              ANY_VALUE(od.approval_plan) AS approval_plan
          FROM new_mst_file AS nmf
          LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
          LEFT JOIN mst_project_details AS mpd ON mpd.id = nmfd.project_name
          LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
          LEFT JOIN outward_details AS od ON od.approval_id = nmf.id
          WHERE mpd.title = 'B.Permission'
            AND nmfpd.is_deleted = 0
            AND nmfpd.application_name = 'approval_process'
            AND nmfd.source_type = 1
          GROUP BY nmf.id
      ) AS bp_result
      WHERE approval_plan IS NOT NULL;
    `,

      ArchQuery: `
      SELECT 'total_length' AS status, COUNT(*) AS status_count
      FROM (
          SELECT DISTINCT nmf.id
          FROM new_mst_file AS nmf
          LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
          LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
          WHERE nmfpd.is_deleted = 0 AND nmfpd.application_name = 'architecture_design'
      ) AS sub

      UNION ALL

      SELECT 'arch_basic_details_count' AS status, COUNT(*) AS status_count
      FROM (
          SELECT nmf.id, ANY_VALUE(abd.is_done) AS is_done
          FROM new_mst_file AS nmf
          LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
          LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
          LEFT JOIN arch_basic_details AS abd ON abd.arch_id = nmf.id
          WHERE nmfpd.is_deleted = 0 AND nmfpd.application_name = 'architecture_design' AND nmfd.project_name = 1
          GROUP BY nmf.id
      ) AS sub WHERE is_done = 1

      UNION ALL

      SELECT 'arch_space_planning_count' AS status, COUNT(*) AS status_count
      FROM (
          SELECT nmf.id, ANY_VALUE(asp.is_done) AS is_done
          FROM new_mst_file AS nmf
          LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
          LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
          LEFT JOIN arch_space_planning AS asp ON asp.arch_id = nmf.id
          WHERE nmfpd.is_deleted = 0 AND nmfpd.application_name = 'architecture_design' AND nmfd.project_name = 2
          GROUP BY nmf.id
      ) AS sub WHERE is_done = 1

      UNION ALL

      SELECT 'arch_material_count' AS status, COUNT(*) AS status_count
      FROM (
          SELECT nmf.id, ANY_VALUE(am.is_done) AS is_done
          FROM new_mst_file AS nmf
          LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
          LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
          LEFT JOIN mst_arch_fees AS am ON am.arch_id = nmf.id
          WHERE nmfpd.is_deleted = 0 AND nmfpd.application_name = 'architecture_design' AND nmfd.project_name = 3
          GROUP BY nmf.id
      ) AS sub WHERE is_done = 1

      UNION ALL

      SELECT 'arch_finald_count' AS status, COUNT(*) AS status_count
      FROM (
          SELECT nmf.id, ANY_VALUE(af.is_done) AS is_done
          FROM new_mst_file AS nmf
          LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
          LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
          LEFT JOIN arch_finald AS af ON af.arch_id = nmf.id
          WHERE nmfpd.is_deleted = 0 AND nmfpd.application_name = 'architecture_design' AND nmfd.project_name = 4
          GROUP BY nmf.id
      ) AS sub WHERE is_done = 1

      UNION ALL

      SELECT 'arch_consultant' AS status, COUNT(*) AS status_count
      FROM (
          SELECT nmf.id, ANY_VALUE(atd.is_done) AS is_done
          FROM new_mst_file AS nmf
          LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
          LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
          LEFT JOIN arch_threed AS atd ON atd.arch_id = nmf.id
          WHERE nmfpd.is_deleted = 0 AND nmfpd.application_name = 'architecture_design' AND nmfd.project_name = 5
          GROUP BY nmf.id
      ) AS sub WHERE is_done = 1

      UNION ALL

      SELECT 'arch_drawing_count' AS status, COUNT(*) AS status_count
      FROM (
          SELECT nmf.id, ANY_VALUE(ad.is_done) AS is_done
          FROM new_mst_file AS nmf
          LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
          LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
          LEFT JOIN arch_drawing AS ad ON ad.arch_id = nmf.id
          WHERE nmfpd.is_deleted = 0 AND nmfpd.application_name = 'architecture_design' AND nmfd.project_name = 6
          GROUP BY nmf.id
      ) AS sub WHERE is_done = 1

      UNION ALL

      SELECT 'arch_risk_matrix_count' AS status, COUNT(*) AS status_count
      FROM (
          SELECT nmf.id, ANY_VALUE(marm.is_done) AS is_done
          FROM new_mst_file AS nmf
          LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
          LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
          LEFT JOIN mst_arch_risk_matrix AS marm ON marm.arch_id = nmf.id
          WHERE nmfpd.is_deleted = 0 AND nmfpd.application_name = 'architecture_design' AND nmfd.project_name = 7
          GROUP BY nmf.id
      ) AS sub WHERE is_done = 1

      UNION ALL

      SELECT 'schedule' AS status, COUNT(*) AS status_count
      FROM (
          SELECT nmf.id, ANY_VALUE(s.is_done) AS is_done
          FROM new_mst_file AS nmf
          LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
          LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
          LEFT JOIN schedule AS s ON s.source_id = nmf.id AND s.source_type = 1
          WHERE nmfpd.is_deleted = 0 AND nmfpd.application_name = 'architecture_design' AND nmfd.project_name = 8
          GROUP BY nmf.id
      ) AS sub WHERE is_done = 1;
    `,

      interiorQuery: `
      SELECT 'total_length' AS status, COUNT(*) AS status_count
      FROM (
          SELECT DISTINCT nmf.id
          FROM new_mst_file AS nmf
          LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
          LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
          WHERE nmfpd.is_deleted = 0 AND nmfpd.application_name = 'interior_design'
      ) AS sub

      UNION ALL

      SELECT 'basic_details_count' AS status, COUNT(*) AS status_count
      FROM (
          SELECT nmf.id, ANY_VALUE(abd.is_done) AS is_done
          FROM new_mst_file AS nmf
          LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
          LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
          LEFT JOIN basic_details AS abd ON abd.interior_id = nmf.id
          WHERE nmfpd.is_deleted = 0 AND nmfpd.application_name = 'interior_design' AND nmfd.project_name = 1
          GROUP BY nmf.id
      ) AS sub WHERE is_done = 1

      UNION ALL

      SELECT 'space_planning_count' AS status, COUNT(*) AS status_count
      FROM (
          SELECT nmf.id, ANY_VALUE(asp.is_done) AS is_done
          FROM new_mst_file AS nmf
          LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
          LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
          LEFT JOIN space_planning AS asp ON asp.interior_id = nmf.id
          WHERE nmfpd.is_deleted = 0 AND nmfpd.application_name = 'interior_design' AND nmfd.project_name = 2
          GROUP BY nmf.id
      ) AS sub WHERE is_done = 1

      UNION ALL

      SELECT 'material_count' AS status, COUNT(*) AS status_count
      FROM (
          SELECT nmf.id, ANY_VALUE(am.is_done) AS is_done
          FROM new_mst_file AS nmf
          LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
          LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
          LEFT JOIN mst_fees AS am ON am.interior_id = nmf.id
          WHERE nmfpd.is_deleted = 0 AND nmfpd.application_name = 'interior_design' AND nmfd.project_name = 3
          GROUP BY nmf.id
      ) AS sub WHERE is_done = 1

      UNION ALL

      SELECT 'finald_count' AS status, COUNT(*) AS status_count
      FROM (
          SELECT nmf.id, ANY_VALUE(af.is_done) AS is_done
          FROM new_mst_file AS nmf
          LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
          LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
          LEFT JOIN final_d AS af ON af.interior_id = nmf.id
          WHERE nmfpd.is_deleted = 0 AND nmfpd.application_name = 'interior_design' AND nmfd.project_name = 4
          GROUP BY nmf.id
      ) AS sub WHERE is_done = 1

      UNION ALL

      SELECT 'consultant' AS status, COUNT(*) AS status_count
      FROM (
          SELECT nmf.id, ANY_VALUE(atd.is_done) AS is_done
          FROM new_mst_file AS nmf
          LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
          LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
          LEFT JOIN threed AS atd ON atd.interior_id = nmf.id
          WHERE nmfpd.is_deleted = 0 AND nmfpd.application_name = 'interior_design' AND nmfd.project_name = 5
          GROUP BY nmf.id
      ) AS sub WHERE is_done = 1

      UNION ALL

      SELECT 'drawing_count' AS status, COUNT(*) AS status_count
      FROM (
          SELECT nmf.id, ANY_VALUE(ad.is_done) AS is_done
          FROM new_mst_file AS nmf
          LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
          LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
          LEFT JOIN technicaldrawing AS ad ON ad.interior_id = nmf.id
          WHERE nmfpd.is_deleted = 0 AND nmfpd.application_name = 'interior_design' AND nmfd.project_name = 6
          GROUP BY nmf.id
      ) AS sub WHERE is_done = 1

      UNION ALL

      SELECT 'risk_matrix_count' AS status, COUNT(*) AS status_count
      FROM (
          SELECT nmf.id, ANY_VALUE(marm.is_done) AS is_done
          FROM new_mst_file AS nmf
          LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
          LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
          LEFT JOIN risk_matrix AS marm ON marm.interior_id = nmf.id
          WHERE nmfpd.is_deleted = 0 AND nmfpd.application_name = 'interior_design' AND nmfd.project_name = 7
          GROUP BY nmf.id
      ) AS sub WHERE is_done = 1

      UNION ALL

      SELECT 'schedule' AS status, COUNT(*) AS status_count
      FROM (
          SELECT nmf.id, ANY_VALUE(s.is_done) AS is_done
          FROM new_mst_file AS nmf
          LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
          LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
          LEFT JOIN schedule AS s ON s.source_id = nmf.id AND s.source_type = 2
          WHERE nmfpd.is_deleted = 0 AND nmfpd.application_name = 'interior_design' AND nmfd.project_name = 8
          GROUP BY nmf.id
      ) AS sub WHERE is_done = 1;
    `,

      trackTeamQuery: `
      SELECT a.id, a.user_id, a.latitude, a.longitude, u.first_name  
      FROM attendance AS a
      LEFT JOIN users AS u ON u.id = a.user_id
      WHERE a.is_deleted = 0 AND DATE(a.date) = CURDATE();
    `,

      attendanceQuery: `
      SELECT 
        COUNT(DISTINCT CASE 
            WHEN (att_type IS NULL OR att_type = 1) AND DATE(attendance.date) = CURDATE() 
            THEN attendance.user_id 
        END) AS present_count,
        COUNT(DISTINCT CASE 
            WHEN att_type = 3 AND DATE(attendance.date) = CURDATE() 
            THEN attendance.user_id 
        END) AS absent_count,
        CAST(COUNT(DISTINCT u.id) AS CHAR) AS total_employees
      FROM users AS u
      LEFT JOIN users_groups AS ug ON ug.mst_user_id = u.id 
      LEFT JOIN attendance ON u.id = attendance.user_id AND DATE(attendance.date) = CURDATE()
      WHERE u.isdeleted = 0 AND ug.mst_group_id = 2 AND u.active = 1;
    `,

      taskQuery: `
      SELECT 
        CAST(COUNT(*) AS CHAR) AS total_task,
        CAST(COUNT(CASE WHEN status = 1 THEN 1 END) AS CHAR) AS total_completed_task
      FROM todos
      WHERE is_deleted = 0 AND DATE(due_date) = CURDATE();
    `,

      clientQuery: `
      SELECT CAST(COUNT(u.id) AS CHAR) AS total_client
      FROM users AS u
      LEFT JOIN users_groups AS ug ON ug.mst_user_id = u.id
      WHERE u.isdeleted = 0 AND ug.mst_group_id = 4 AND u.active = 0;
    `,

      siteinspectionQuery: `
      SELECT CAST(COUNT(*) AS CHAR) AS total_siteinspection
      FROM site_inspection
      WHERE is_deleted = 0 AND YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1);
    `,

      depositQuery: `
      SELECT CAST(SUM(amount) AS CHAR) AS total_amount
      FROM deposit_expense
      WHERE isdeleted = 0 AND expense_type = 1
        AND MONTH(date) = MONTH(CURDATE()) AND YEAR(date) = YEAR(CURDATE());
    `,

      projectExpenseQuery: `
      SELECT CAST(SUM(amount) AS CHAR) AS total_amount
      FROM deposit_expense
      WHERE isdeleted = 0 AND expense_type = 2
        AND MONTH(date) = MONTH(CURDATE()) AND YEAR(date) = YEAR(CURDATE());
    `,

      officeQuery: `
      SELECT CAST(SUM(amount) AS CHAR) AS total_amount
      FROM deposit_expense
      WHERE isdeleted = 0 AND expense_type = 3
        AND MONTH(date) = MONTH(CURDATE()) AND YEAR(date) = YEAR(CURDATE());
    `,
    };

    try {
      const [
        projectResults,
        tentativeResults,
        interiorResults,
        trackTeamResults,
        attendanceResults,
        taskResults,
        clientResults,
        siteResults,
        depositResults,
        projectexpenseResults,
        officeResults,
      ] = await Promise.all([
        queryAsync(queries.projectQuery),
        queryAsync(queries.ArchQuery),
        queryAsync(queries.interiorQuery),
        queryAsync(queries.trackTeamQuery),
        queryAsync(queries.attendanceQuery),
        queryAsync(queries.taskQuery),
        queryAsync(queries.clientQuery),
        queryAsync(queries.siteinspectionQuery),
        queryAsync(queries.depositQuery),
        queryAsync(queries.projectExpenseQuery),
        queryAsync(queries.officeQuery),
      ]);

      const response = {
        projectData: replaceNullWithZero(transformProjectData(projectResults)),
        ArchData: replaceNullWithZero(transformProjectData(tentativeResults)),
        interiorData: replaceNullWithZero(
          transformProjectData(interiorResults),
        ),
        trackTeamData: replaceNullWithZero(trackTeamResults),
        attendanceData: replaceNullWithZero(attendanceResults[0]),
        taskData: replaceNullWithZero(taskResults[0]),
        clientData: replaceNullWithZero(clientResults[0]),
        siteData: replaceNullWithZero(siteResults[0]),
        depositData: replaceNullWithZero(depositResults[0]),
        projectExpenseData: replaceNullWithZero(projectexpenseResults[0]),
        officeData: replaceNullWithZero(officeResults[0]),
      };

      // Save to cache
      dashboardCache.data = response;
      dashboardCache.lastFetched = Date.now();
      dashboardCache.isFetching = false;

      res
        .status(200)
        .json({ message: "Record fetched", error: false, data: response });
    } catch (err) {
      dashboardCache.isFetching = false;
      console.error("Dashboard query error:", err);
      res
        .status(500)
        .json({ message: "Error fetching dashboard data", error: true });
    }
  },

  //   fetchdashboardData: (req, res) => {
  //     const queries = {
  //       projectQuery: `
  // SELECT 'approval_process_count' AS status, COUNT(*) AS status_count
  // FROM (
  //     SELECT DISTINCT nmf.id
  //     FROM new_mst_file nmf
  //     JOIN new_mst_file_project_details nmfpd
  //       ON nmfpd.project_id = nmf.id
  //     WHERE nmf.is_deleted = 0
  //       AND nmfpd.is_deleted = 0
  //       AND nmfpd.application_name = 'approval_process'
  // ) AS approval_process_count

  // UNION ALL

  // SELECT 'dc' AS status, COUNT(*) AS status_count
  // FROM (
  //     SELECT
  //         nmf.id,
  //         ANY_VALUE(dc_sub.completed_date) AS completed_date
  //     FROM new_mst_file AS nmf
  //     LEFT JOIN new_mst_file_details AS nmfd
  //            ON nmfd.project_id = nmf.id
  //     LEFT JOIN mst_project_details AS mpd
  //            ON mpd.id = nmfd.project_name
  //     LEFT JOIN new_mst_file_project_details AS nmfpd
  //            ON nmfpd.project_id = nmf.id
  //     LEFT JOIN (
  //         SELECT * FROM document_collection dc1
  //         WHERE dc1.id = (
  //             SELECT MIN(dc2.id)
  //             FROM document_collection dc2
  //             WHERE dc2.document_clearance_id = dc1.document_clearance_id
  //         )
  //     ) AS dc_sub ON dc_sub.document_clearance_id = nmf.id
  //     WHERE mpd.title = 'D.C.'
  //       AND nmfpd.is_deleted = 0
  //       AND nmfpd.application_name = 'approval_process'
  //       AND nmfd.source_type = 1
  //     GROUP BY nmf.id
  // ) AS dc_result
  // WHERE completed_date IS NOT NULL

  // UNION ALL

  // SELECT 'pv' AS status, COUNT(*) AS status_count
  // FROM (
  //     SELECT
  //         nmf.id,
  //         ANY_VALUE(pv.pv_file) AS pv_file
  //     FROM new_mst_file AS nmf
  //     LEFT JOIN new_mst_file_details AS nmfd
  //            ON nmfd.project_id = nmf.id
  //     LEFT JOIN mst_project_details AS mpd
  //            ON mpd.id = nmfd.project_name
  //     LEFT JOIN new_mst_file_project_details AS nmfpd
  //            ON nmfpd.project_id = nmf.id
  //     LEFT JOIN pv ON pv.approval_id = nmf.id
  //     WHERE mpd.title = 'P.V.'
  //       AND nmfpd.is_deleted = 0
  //       AND nmfpd.application_name = 'approval_process'
  //       AND nmfd.source_type = 1
  //     GROUP BY nmf.id
  // ) AS pv_result
  // WHERE pv_file IS NOT NULL

  // UNION ALL

  // SELECT 'firenoc' AS status, COUNT(*) AS status_count
  // FROM (
  //     SELECT
  //         nmf.id,
  //         ANY_VALUE(fn.fire_noc_receipt) AS fire_noc_receipt
  //     FROM new_mst_file AS nmf
  //     LEFT JOIN new_mst_file_details AS nmfd
  //            ON nmfd.project_id = nmf.id
  //     LEFT JOIN mst_project_details AS mpd
  //            ON mpd.id = nmfd.project_name
  //     LEFT JOIN new_mst_file_project_details AS nmfpd
  //            ON nmfpd.project_id = nmf.id
  //     LEFT JOIN fire_noc AS fn ON fn.approval_id = nmf.id
  //     WHERE mpd.title = 'Fire NOC'
  //       AND nmfpd.is_deleted = 0
  //       AND nmfpd.application_name = 'approval_process'
  //       AND nmfd.source_type = 1
  //     GROUP BY nmf.id
  // ) AS fn_result
  // WHERE fire_noc_receipt IS NOT NULL

  // UNION ALL

  // SELECT 'bpermission' AS status, COUNT(*) AS status_count
  // FROM (
  //     SELECT
  //         nmf.id,
  //         ANY_VALUE(od.approval_plan) AS approval_plan
  //     FROM new_mst_file AS nmf
  //     LEFT JOIN new_mst_file_details AS nmfd
  //            ON nmfd.project_id = nmf.id
  //     LEFT JOIN mst_project_details AS mpd
  //            ON mpd.id = nmfd.project_name
  //     LEFT JOIN new_mst_file_project_details AS nmfpd
  //            ON nmfpd.project_id = nmf.id
  //     LEFT JOIN outward_details AS od ON od.approval_id = nmf.id
  //     WHERE mpd.title = 'B.Permission'
  //       AND nmfpd.is_deleted = 0
  //       AND nmfpd.application_name = 'approval_process'
  //       AND nmfd.source_type = 1
  //     GROUP BY nmf.id
  // ) AS bp_result
  // WHERE approval_plan IS NOT NULL;
  //       `,

  //       ArchQuery: `
  //      SELECT 'total_length' AS status, COUNT(*) AS status_count
  // FROM (
  //     SELECT DISTINCT nmf.id
  //     FROM new_mst_file AS nmf
  //     LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
  //     LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
  //     WHERE nmfpd.is_deleted = 0 AND nmfpd.application_name = 'architecture_design'
  // ) AS sub

  // UNION ALL

  // SELECT 'arch_basic_details_count' AS status, COUNT(*) AS status_count
  // FROM (
  //     SELECT nmf.id, ANY_VALUE(abd.is_done) AS is_done
  //     FROM new_mst_file AS nmf
  //     LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
  //     LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
  //     LEFT JOIN arch_basic_details AS abd ON abd.arch_id = nmf.id
  //     WHERE nmfpd.is_deleted = 0 AND nmfpd.application_name = 'architecture_design' AND nmfd.project_name = 1
  //     GROUP BY nmf.id
  // ) AS sub WHERE is_done = 1

  // UNION ALL

  // SELECT 'arch_space_planning_count' AS status, COUNT(*) AS status_count
  // FROM (
  //     SELECT nmf.id, ANY_VALUE(asp.is_done) AS is_done
  //     FROM new_mst_file AS nmf
  //     LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
  //     LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
  //     LEFT JOIN arch_space_planning AS asp ON asp.arch_id = nmf.id
  //     WHERE nmfpd.is_deleted = 0 AND nmfpd.application_name = 'architecture_design' AND nmfd.project_name = 2
  //     GROUP BY nmf.id
  // ) AS sub WHERE is_done = 1

  // UNION ALL

  // SELECT 'arch_material_count' AS status, COUNT(*) AS status_count
  // FROM (
  //     SELECT nmf.id, ANY_VALUE(am.is_done) AS is_done
  //     FROM new_mst_file AS nmf
  //     LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
  //     LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
  //     LEFT JOIN mst_arch_fees AS am ON am.arch_id = nmf.id
  //     WHERE nmfpd.is_deleted = 0 AND nmfpd.application_name = 'architecture_design' AND nmfd.project_name = 3
  //     GROUP BY nmf.id
  // ) AS sub WHERE is_done = 1

  // UNION ALL

  // SELECT 'arch_finald_count' AS status, COUNT(*) AS status_count
  // FROM (
  //     SELECT nmf.id, ANY_VALUE(af.is_done) AS is_done
  //     FROM new_mst_file AS nmf
  //     LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
  //     LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
  //     LEFT JOIN arch_finald AS af ON af.arch_id = nmf.id
  //     WHERE nmfpd.is_deleted = 0 AND nmfpd.application_name = 'architecture_design' AND nmfd.project_name = 4
  //     GROUP BY nmf.id
  // ) AS sub WHERE is_done = 1

  // UNION ALL

  // SELECT 'arch_consultant' AS status, COUNT(*) AS status_count
  // FROM (
  //     SELECT nmf.id, ANY_VALUE(atd.is_done) AS is_done
  //     FROM new_mst_file AS nmf
  //     LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
  //     LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
  //     LEFT JOIN arch_threed AS atd ON atd.arch_id = nmf.id
  //     WHERE nmfpd.is_deleted = 0 AND nmfpd.application_name = 'architecture_design' AND nmfd.project_name = 5
  //     GROUP BY nmf.id
  // ) AS sub WHERE is_done = 1

  // UNION ALL

  // SELECT 'arch_drawing_count' AS status, COUNT(*) AS status_count
  // FROM (
  //     SELECT nmf.id, ANY_VALUE(ad.is_done) AS is_done
  //     FROM new_mst_file AS nmf
  //     LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
  //     LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
  //     LEFT JOIN arch_drawing AS ad ON ad.arch_id = nmf.id
  //     WHERE nmfpd.is_deleted = 0 AND nmfpd.application_name = 'architecture_design' AND nmfd.project_name = 6
  //     GROUP BY nmf.id
  // ) AS sub WHERE is_done = 1

  // UNION ALL

  // SELECT 'arch_risk_matrix_count' AS status, COUNT(*) AS status_count
  // FROM (
  //     SELECT nmf.id, ANY_VALUE(marm.is_done) AS is_done
  //     FROM new_mst_file AS nmf
  //     LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
  //     LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
  //     LEFT JOIN mst_arch_risk_matrix AS marm ON marm.arch_id = nmf.id
  //     WHERE nmfpd.is_deleted = 0 AND nmfpd.application_name = 'architecture_design' AND nmfd.project_name = 7
  //     GROUP BY nmf.id
  // ) AS sub WHERE is_done = 1

  // UNION ALL

  // SELECT 'schedule' AS status, COUNT(*) AS status_count
  // FROM (
  //     SELECT nmf.id, ANY_VALUE(s.is_done) AS is_done
  //     FROM new_mst_file AS nmf
  //     LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
  //     LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
  //     LEFT JOIN schedule AS s ON s.source_id = nmf.id AND s.source_type = 1
  //     WHERE nmfpd.is_deleted = 0 AND nmfpd.application_name = 'architecture_design' AND nmfd.project_name = 8
  //     GROUP BY nmf.id
  // ) AS sub WHERE is_done = 1;`,

  //       interiorQuery: ` SELECT 'total_length' AS status, COUNT(*) AS status_count
  // FROM (
  //     SELECT DISTINCT nmf.id
  //     FROM new_mst_file AS nmf
  //     LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
  //     LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
  //     WHERE nmfpd.is_deleted = 0 AND nmfpd.application_name = 'interior_design'
  // ) AS sub

  // UNION ALL

  // SELECT 'basic_details_count' AS status, COUNT(*) AS status_count
  // FROM (
  //     SELECT nmf.id, ANY_VALUE(abd.is_done) AS is_done
  //     FROM new_mst_file AS nmf
  //     LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
  //     LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
  //     LEFT JOIN basic_details AS abd ON abd.interior_id = nmf.id
  //     WHERE nmfpd.is_deleted = 0 AND nmfpd.application_name = 'interior_design' AND nmfd.project_name = 1
  //     GROUP BY nmf.id
  // ) AS sub WHERE is_done = 1

  // UNION ALL

  // SELECT 'space_planning_count' AS status, COUNT(*) AS status_count
  // FROM (
  //     SELECT nmf.id, ANY_VALUE(asp.is_done) AS is_done
  //     FROM new_mst_file AS nmf
  //     LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
  //     LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
  //     LEFT JOIN space_planning AS asp ON asp.interior_id = nmf.id
  //     WHERE nmfpd.is_deleted = 0 AND nmfpd.application_name = 'interior_design' AND nmfd.project_name = 2
  //     GROUP BY nmf.id
  // ) AS sub WHERE is_done = 1

  // UNION ALL

  // SELECT 'material_count' AS status, COUNT(*) AS status_count
  // FROM (
  //     SELECT nmf.id, ANY_VALUE(am.is_done) AS is_done
  //     FROM new_mst_file AS nmf
  //     LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
  //     LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
  //     LEFT JOIN mst_fees AS am ON am.interior_id = nmf.id
  //     WHERE nmfpd.is_deleted = 0 AND nmfpd.application_name = 'interior_design' AND nmfd.project_name = 3
  //     GROUP BY nmf.id
  // ) AS sub WHERE is_done = 1

  // UNION ALL

  // SELECT 'finald_count' AS status, COUNT(*) AS status_count
  // FROM (
  //     SELECT nmf.id, ANY_VALUE(af.is_done) AS is_done
  //     FROM new_mst_file AS nmf
  //     LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
  //     LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
  //     LEFT JOIN final_d AS af ON af.interior_id = nmf.id
  //     WHERE nmfpd.is_deleted = 0 AND nmfpd.application_name = 'interior_design' AND nmfd.project_name = 4
  //     GROUP BY nmf.id
  // ) AS sub WHERE is_done = 1

  // UNION ALL

  // SELECT 'consultant' AS status, COUNT(*) AS status_count
  // FROM (
  //     SELECT nmf.id, ANY_VALUE(atd.is_done) AS is_done
  //     FROM new_mst_file AS nmf
  //     LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
  //     LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
  //     LEFT JOIN threed AS atd ON atd.interior_id = nmf.id
  //     WHERE nmfpd.is_deleted = 0 AND nmfpd.application_name = 'interior_design' AND nmfd.project_name = 5
  //     GROUP BY nmf.id
  // ) AS sub WHERE is_done = 1

  // UNION ALL

  // SELECT 'drawing_count' AS status, COUNT(*) AS status_count
  // FROM (
  //     SELECT nmf.id, ANY_VALUE(ad.is_done) AS is_done
  //     FROM new_mst_file AS nmf
  //     LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
  //     LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
  //     LEFT JOIN technicaldrawing AS ad ON ad.interior_id = nmf.id
  //     WHERE nmfpd.is_deleted = 0 AND nmfpd.application_name = 'interior_design' AND nmfd.project_name = 6
  //     GROUP BY nmf.id
  // ) AS sub WHERE is_done = 1

  // UNION ALL

  // SELECT 'risk_matrix_count' AS status, COUNT(*) AS status_count
  // FROM (
  //     SELECT nmf.id, ANY_VALUE(marm.is_done) AS is_done
  //     FROM new_mst_file AS nmf
  //     LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
  //     LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
  //     LEFT JOIN risk_matrix AS marm ON marm.interior_id = nmf.id
  //     WHERE nmfpd.is_deleted = 0 AND nmfpd.application_name = 'interior_design' AND nmfd.project_name = 7
  //     GROUP BY nmf.id
  // ) AS sub WHERE is_done = 1

  // UNION ALL

  // SELECT 'schedule' AS status, COUNT(*) AS status_count
  // FROM (
  //     SELECT nmf.id, ANY_VALUE(s.is_done) AS is_done
  //     FROM new_mst_file AS nmf
  //     LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
  //     LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
  //     LEFT JOIN schedule AS s ON s.source_id = nmf.id AND s.source_type = 2
  //     WHERE nmfpd.is_deleted = 0 AND nmfpd.application_name = 'interior_design' AND nmfd.project_name = 8
  //     GROUP BY nmf.id
  // ) AS sub WHERE is_done = 1
  // `,

  //       trackTeamQuery: `
  //         SELECT a.id, a.user_id, a.latitude, a.longitude, u.first_name
  //         FROM attendance AS a
  //         LEFT JOIN users AS u ON u.id = a.user_id
  //         WHERE a.is_deleted = 0 AND DATE(a.date) = CURDATE();
  //       `,

  //       attendanceQuery: `
  //      SELECT
  //     COUNT(DISTINCT CASE
  //         WHEN (att_type IS NULL OR att_type = 1)
  //              AND DATE(attendance.date) = CURDATE()
  //         THEN attendance.user_id
  //     END) AS present_count,

  //     COUNT(DISTINCT CASE
  //         WHEN att_type = 3
  //              AND DATE(attendance.date) = CURDATE()
  //         THEN attendance.user_id
  //     END) AS absent_count,

  //    CAST(COUNT(DISTINCT u.id) AS CHAR) AS total_employees
  // FROM users AS u
  // LEFT JOIN users_groups AS ug
  //     ON ug.mst_user_id = u.id
  // LEFT JOIN attendance
  //     ON u.id = attendance.user_id
  //     AND DATE(attendance.date) = CURDATE()
  // WHERE u.isdeleted = 0
  // AND ug.mst_group_id = 2
  // AND u.active = 1;

  //       `,

  //       taskQuery: `
  //         SELECT
  //         CAST(COUNT(*) AS CHAR) AS total_task,
  //         CAST(COUNT(CASE WHEN status = 1 THEN 1 END) AS CHAR) AS total_completed_task
  //         FROM todos
  //         WHERE is_deleted = 0 AND DATE(due_date) = CURDATE();
  //       `,

  //       clientQuery: `
  //         SELECT
  //         CAST(COUNT(u.id) AS CHAR) AS total_client
  //         FROM users AS u
  //         LEFT JOIN users_groups AS ug ON ug.mst_user_id = u.id
  //         WHERE u.isdeleted = 0 AND ug.mst_group_id = 4 AND u.active = 0;
  //       `,

  //       siteinspectionQuery: `
  //       SELECT CAST(COUNT(*) AS CHAR) AS total_siteinspection
  // FROM site_inspection
  // WHERE is_deleted = 0
  // AND YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1);
  //       `,

  //       depositQuery: `
  //         SELECT CAST(SUM(amount) AS CHAR) AS total_amount
  //         FROM deposit_expense
  //         WHERE isdeleted = 0
  //         AND expense_type = 1
  //         AND MONTH(date) = MONTH(CURDATE())
  //         AND YEAR(date) = YEAR(CURDATE());
  //       `,

  //       projectExpenseQuery: `
  //         SELECT CAST(SUM(amount) AS CHAR) AS total_amount
  //         FROM deposit_expense
  //         WHERE isdeleted = 0
  //         AND expense_type = 2
  //         AND MONTH(date) = MONTH(CURDATE())
  //         AND YEAR(date) = YEAR(CURDATE());
  //       `,

  //       officeQuery: `
  //         SELECT CAST(SUM(amount) AS CHAR) AS total_amount
  //         FROM deposit_expense
  //         WHERE isdeleted = 0
  //         AND expense_type = 3
  //         AND MONTH(date) = MONTH(CURDATE())
  //         AND YEAR(date) = YEAR(CURDATE());
  //       `,
  //     };
  //     // Add this helper function above replaceNullWithZero
  // const transformProjectData = (rows) => {
  //     return rows.reduce((acc, row) => {
  //         acc[row.status] = row.status_count;
  //         return acc;
  //     }, {});
  // };

  //     const replaceNullWithZero = (data) => {
  //       if (Array.isArray(data)) {
  //         return data.map((item) =>
  //           Object.fromEntries(
  //             Object.entries(item).map(([key, value]) => [key, value ?? "0"]),
  //           ),
  //         );
  //       } else if (typeof data === "object" && data !== null) {
  //         return Object.fromEntries(
  //           Object.entries(data).map(([key, value]) => [key, value ?? "0"]),
  //         );
  //       }
  //       return data;
  //     };

  //     db.query(queries.projectQuery, (err, projectResults) => {
  //       if (err)
  //         return res
  //           .status(500)
  //           .json({ message: "Error executing project data query" });

  //       db.query(queries.ArchQuery, (err, tentativeResults) => {
  //         if (err)
  //           return res
  //             .status(500)
  //             .json({ message: "Error executing tentative data query" });

  //         db.query(queries.interiorQuery, (err, interiorResults) => {
  //           if (err)
  //             return res
  //               .status(500)
  //               .json({ message: "Error executing tentative data query" });

  //           db.query(queries.trackTeamQuery, (err, trackTeamResults) => {
  //             if (err)
  //               return res
  //                 .status(500)
  //                 .json({ message: "Error executing track team query" });

  //             db.query(queries.attendanceQuery, (err, attendanceResults) => {
  //               if (err)
  //                 return res
  //                   .status(500)
  //                   .json({ message: "Error executing attendance query" });

  //               db.query(queries.taskQuery, (err, taskResults) => {
  //                 if (err)
  //                   return res
  //                     .status(500)
  //                     .json({ message: "Error executing task query" });

  //                 db.query(queries.clientQuery, (err, clientResults) => {
  //                   if (err)
  //                     return res
  //                       .status(500)
  //                       .json({ message: "Error executing client query" });

  //                   db.query(queries.siteinspectionQuery, (err, siteResults) => {
  //                     if (err)
  //                       return res.status(500).json({
  //                         message: "Error executing site inspection query",
  //                       });

  //                     db.query(queries.depositQuery, (err, depositResults) => {
  //                       if (err)
  //                         return res
  //                           .status(500)
  //                           .json({ message: "Error executing deposit query" });

  //                       db.query(
  //                         queries.projectExpenseQuery,
  //                         (err, projectexpenseResults) => {
  //                           if (err)
  //                             return res.status(500).json({
  //                               message: "Error executing project expense query",
  //                             });

  //                           db.query(
  //                             queries.officeQuery,
  //                             (err, officeResults) => {
  //                               if (err)
  //                                 return res.status(500).json({
  //                                   message:
  //                                     "Error executing office expense query",
  //                                 });

  //                               // Combine all results and replace null with "0"
  //                               const response = {
  //                                 projectData: replaceNullWithZero(transformProjectData(projectResults),
  //                                 ),
  //                                   ArchData: replaceNullWithZero(transformProjectData(tentativeResults)), // ✅ Same as projectData

  //                                 interiorData: replaceNullWithZero(transformProjectData
  //                                   (interiorResults),
  //                                 ),
  //                                 trackTeamData:
  //                                   replaceNullWithZero(trackTeamResults),
  //                                 attendanceData: replaceNullWithZero(
  //                                   attendanceResults[0],
  //                                 ),
  //                                 taskData: replaceNullWithZero(taskResults[0]),
  //                                 clientData: replaceNullWithZero(
  //                                   clientResults[0],
  //                                 ),
  //                                 siteData: replaceNullWithZero(siteResults[0]),
  //                                 depositData: replaceNullWithZero(
  //                                   depositResults[0],
  //                                 ),
  //                                 projectExpenseData: replaceNullWithZero(
  //                                   projectexpenseResults[0],
  //                                 ),
  //                                 officeData: replaceNullWithZero(
  //                                   officeResults[0],
  //                                 ),
  //                               };

  //                               res.status(200).json({
  //                                 message: "Record fetched",
  //                                 error: false,
  //                                 data: response,
  //                               });
  //                             },
  //                           );
  //                         },
  //                       );
  //                     });
  //                   });
  //                 });
  //               });
  //             });
  //           });
  //         });
  //       });
  //     });
  //   },

  getProjectdata: (req, res) => {
    try {
      const sql = `
          SELECT nmf.id, nmf.case_id,u.first_name,u.last_name
          FROM new_mst_file_project_details AS nmfpd
          LEFT JOIN new_mst_file AS nmf ON nmf.id = nmfpd.project_id
           left join users as u on u.id = nmf.client_id
          WHERE  nmf.is_deleted = 0`;

      db.query(sql, (err, result) => {
        if (err) {
          console.error("Database query error:", err);
          res.status(500).json({
            message: err.sqlMessage || "Database error",
            error: true,
            data: {},
          });
        } else if (result.length) {
          res.status(200).json({
            message: "Record fetched",
            error: false,
            data: result,
          });
        } else {
          res.status(404).json({
            message: "Not found",
            error: false,
            data: [],
          });
        }
      });
    } catch (err) {
      console.error("Unexpected error:", err);
      res.status(500).json({
        message: "Server error",
        error: true,
        data: {},
      });
    }
  },

  generateStrategicMeeting: async function (req, res) {
    try {
      const todayDate = moment().format("YYYY-MM-DD");
      const checkMeetingExistsSQL = `
      SELECT id,date
      FROM st_meeting 
      where is_deleted = 0
      LIMIT 1 `;
      db.query(checkMeetingExistsSQL, function (err, existingMeeting) {
        if (err) {
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        if (existingMeeting.length > 0) {
          const lastMeetingDate = moment(existingMeeting[0].date, "YYYY-MM-DD");
          const today = moment();

          const isSameDay = today.isSame(lastMeetingDate, "day");

          if (isSameDay) {
            return res.status(400).json({
              error: true,
              message: `Meeting has already been generated today.`,
              data: {},
            });
          }
        }

        const fetchTaskStatsSQL = `
          SELECT 
          assign_to,
          COUNT(*) AS total_tasks,
          COUNT(CASE WHEN status = 1 THEN 1 END) AS total_completed_tasks,
          COUNT(CASE WHEN status = 0 THEN 1 END) AS total_uncompleted_tasks,
           ROUND(
        (COUNT(CASE WHEN status = 1 THEN 1 END) / COUNT(*)) * 100, 
        2
        ) AS completed_percentage
          FROM todos
          WHERE is_deleted = 0 and due_date BETWEEN DATE_SUB(CURDATE(), INTERVAL 45 DAY) AND CURDATE()
          GROUP BY assign_to;
 `;

        db.query(fetchTaskStatsSQL, function (err, taskStatsResult) {
          if (err) {
            return res
              .status(500)
              .json({ error: true, message: err.sqlMessage, data: {} });
          }

          const fetchontime = `SELECT
          COUNT(t.id) AS total_task,
          t.assign_to,
            COUNT(CASE WHEN t.status = 1 AND DATE(t.due_date) = DATE(tc.created_at) THEN 1 END) AS on_time_completed_task,
            ROUND(
          (COUNT(CASE WHEN t.status = 1 AND DATE(t.due_date) = DATE(tc.created_at) THEN 1 END) /
          NULLIF(COUNT(t.id), 0)) * 100, 
          2
        ) AS on_time_completion_percentage
      FROM todos as t
      LEFT JOIN todos_counter AS tc ON tc.todos_id = t.id
      WHERE t.due_date BETWEEN DATE_SUB(CURDATE(), INTERVAL 45 DAY) AND CURDATE() AND
      t.is_deleted = 0  AND t.due_date <= CURDATE() GROUP BY t.assign_to`;

          db.query(fetchontime, function (err, taskonTimeResult) {
            if (err) {
              return res
                .status(500)
                .json({ error: true, message: err.sqlMessage, data: {} });
            }

            const fetchAttendanceSql = `SELECT 
            user_id,
            COUNT(CASE WHEN att_type = 1 THEN 1 END) AS full_days,
            COUNT(CASE WHEN att_type = 2 THEN 1 END) AS half_days,
            COUNT(CASE WHEN att_type = 1 THEN 1 END) * 1 +
            COUNT(CASE WHEN att_type = 2 THEN 1 END) * 0.5 AS total_attendance
            FROM attendance
            WHERE is_deleted = 0
            AND date >= CURDATE() - INTERVAL 45 DAY  group by user_id
`;

            db.query(
              fetchAttendanceSql,

              function (err, AttendanceResult) {
                if (err) {
                  return res
                    .status(500)
                    .json({ error: true, message: err.sqlMessage, data: {} });
                }

                const fetchMeetingSql = `SELECT 
                    user_id,
                    CASE 
                    WHEN SUM(incomplete_flag) > 0 THEN 0
                    ELSE COUNT(*) 
                    END AS marks
                    FROM (
                    SELECT 
                    user_id,
                    DATE(date) AS meeting_date,
                    MIN(
                    CASE 
                    WHEN TRIM(COALESCE(key_highlight, '')) = '' 
                    OR TRIM(COALESCE(key_action, '')) = '' 
                    OR TRIM(COALESCE(what_missing, '')) = '' 
                    OR TRIM(COALESCE(what_learn, '')) = '' 
                    THEN 1 ELSE 0 
                    END
                    ) AS incomplete_flag
                    FROM tc_meeting_detail
                    WHERE is_deleted = 0
                    AND date >= CURDATE() - INTERVAL 45 DAY
                    GROUP BY user_id, DATE(date) 
                    ) t
                    GROUP BY user_id;
                    `;

                db.query(fetchMeetingSql, function (err, MeetingResult) {
                  if (err) {
                    return res.status(500).json({
                      error: true,
                      message: err.sqlMessage,
                      data: {},
                    });
                  }

                  const ContriSql = `SELECT contributon,count(contributon) AS total_contribution
                        FROM todos
                        WHERE is_deleted = 0
                        AND due_date >= CURDATE() - INTERVAL 45 DAY  group by contributon`;

                  db.query(ContriSql, function (err, ContriResult) {
                    if (err) {
                      return res.status(500).json({
                        error: true,
                        message: err.sqlMessage,
                        data: {},
                      });
                    }
                    const fetchMeetingsFromMasterSQL = `
                          SELECT id, mst_department_id, facilator, participants, status 
                          FROM mst_meeting 
                          WHERE status = 0
                        `;

                    db.query(
                      fetchMeetingsFromMasterSQL,
                      function (err, masterMeetings) {
                        if (err) {
                          return res.status(500).json({
                            error: true,
                            message: err.sqlMessage,
                            data: {},
                          });
                        }

                        if (masterMeetings.length === 0) {
                          return res.status(400).json({
                            error: true,
                            message: "No active meetings found in master list.",
                            data: {},
                          });
                        }
                        const insertValues = masterMeetings.map(
                          ({ mst_department_id, facilator, participants }) => [
                            mst_department_id,
                            // todayDate,
                            new Date(),
                            facilator,
                            participants,
                            new Date(),
                            0,
                          ],
                        );

                        // SQL query to insert multiple rows
                        const sql = `
                            INSERT INTO st_meeting 
                            (mst_department_id, date, facilator, participants, created_at, is_deleted)
                            VALUES ?`;

                        // Execute the query
                        db.query(sql, [insertValues], function (err, result) {
                          if (err) {
                            return res.status(500).json({
                              error: true,
                              message: err.sqlMessage,
                              data: {},
                            });
                          }

                          const firstMeetingId = result.insertId;
                          const affectedRows = result.affectedRows;

                          const meetingIds = Array.from(
                            { length: affectedRows },
                            (_, index) => firstMeetingId + index,
                          );

                          const meetingParticipants = masterMeetings.map(
                            (meeting, i) => ({
                              meetingId: meetingIds[i],
                              facilitator: meeting.facilator,
                              participants: meeting.participants.split(","),
                            }),
                          );

                          const participantRows = meetingParticipants.flatMap(
                            ({ meetingId, facilitator, participants }) => {
                              const uniqueUsers = new Set([
                                ...participants,
                                facilitator,
                              ]);
                              return Array.from(uniqueUsers).map((userId) => {
                                const taskStats = taskStatsResult.find(
                                  (stat) => stat.assign_to == userId,
                                );
                                const taskOntime = taskonTimeResult.find(
                                  (stat) => stat.assign_to == userId,
                                );
                                const totalTasks = taskStats
                                  ? taskStats.total_tasks
                                  : 0;
                                const totalCompletedTasks = taskStats
                                  ? taskStats.total_completed_tasks
                                  : 0;
                                const totalComppercentTasks = taskStats
                                  ? taskStats.completed_percentage
                                  : 0;
                                const totalUncompletedTasks = taskStats
                                  ? taskStats.total_uncompleted_tasks
                                  : 0;

                                const ontime = taskOntime
                                  ? taskOntime.on_time_completion_percentage
                                  : 0;

                                const marks =
                                  totalTasks > 0
                                    ? parseFloat(
                                        (
                                          (totalCompletedTasks / totalTasks) *
                                          70
                                        ).toFixed(2),
                                      )
                                    : 0;

                                const task_percent =
                                  totalTasks > 0
                                    ? parseFloat(
                                        ((marks / 70) * 100).toFixed(2),
                                      )
                                    : 0;

                                const attendanceStats = AttendanceResult.find(
                                  (att) => att.user_id == userId,
                                );
                                const totalAttendance = attendanceStats
                                  ? attendanceStats.total_attendance
                                  : 0;
                                const attendanceScore =
                                  totalAttendance > 0
                                    ? parseFloat(
                                        ((totalAttendance / 43.5) * 10).toFixed(
                                          2,
                                        ),
                                      )
                                    : 0;
                                const att_percent =
                                  totalAttendance > 0
                                    ? parseFloat(
                                        ((attendanceScore / 10) * 100).toFixed(
                                          2,
                                        ),
                                      )
                                    : 0;

                                const MeetingStats = MeetingResult.find(
                                  (att) => att.user_id == userId,
                                );
                                const meetingMarks = MeetingStats
                                  ? MeetingStats.marks
                                  : 0;

                                const ContriStats = ContriResult.find(
                                  (att) => att.contributon == userId,
                                );
                                const totalContribution = ContriStats
                                  ? ContriStats.total_contribution
                                  : 0;

                                const baseMarks = 5;
                                const lowerLimit = 10;
                                const upperLimit = 30;
                                let penalty = 0;

                                if (totalContribution < lowerLimit) {
                                  penalty =
                                    (lowerLimit - totalContribution) * 0.5;
                                } else if (totalContribution > upperLimit) {
                                  penalty =
                                    (totalContribution - upperLimit) * 0.5;
                                }

                                const finalMarks = Math.max(
                                  baseMarks - penalty,
                                  0,
                                );
                                const contri_percent =
                                  totalAttendance > 0
                                    ? parseFloat(
                                        ((finalMarks / 5) * 100).toFixed(2),
                                      )
                                    : 0;

                                const totalMarksData = parseFloat(
                                  (
                                    Number(marks) +
                                    Number(finalMarks) +
                                    Number(attendanceScore) +
                                    Number(meetingMarks)
                                  ).toFixed(2),
                                );

                                return [
                                  meetingId,
                                  new Date(),
                                  facilitator,
                                  userId,
                                  new Date(),
                                  null,
                                  null,
                                  0,
                                  totalTasks,
                                  totalCompletedTasks,
                                  totalComppercentTasks,
                                  totalUncompletedTasks,
                                  ontime,
                                  marks,
                                  attendanceScore,
                                  meetingMarks,
                                  0,
                                  finalMarks,
                                  totalAttendance,
                                  totalContribution,
                                  totalTasks,
                                  totalCompletedTasks,
                                  task_percent,
                                  43.5,
                                  att_percent,
                                  contri_percent,
                                  totalMarksData,
                                  totalComppercentTasks,
                                ];
                              });
                            },
                          );

                          // Insert participants into the `participants` table
                          db.query(
                            "INSERT INTO st_meeting_detail (meeting_id,date,facilator, user_id, created_at, updated_at, updated_by, is_deleted,total_task,total_completed_tasks,completed_percentage, total_uncompleted_tasks,on_time,task_mark,attendance,meeting,software,collabation,total_attendance,total_contribution,out_of_task,com_task,task_percentage,out_of_attendance,attendance_percentage,collbration_per,total_marks_data,on_time_task_comp_per) VALUES ?",
                            [participantRows],
                            function (err) {
                              if (err) {
                                return res.status(500).json({
                                  error: true,
                                  message: err.sqlMessage,
                                  data: {},
                                });
                              }

                              // Send success response
                              res.status(201).json({
                                error: false,
                                message:
                                  "Strategical meetings and participants added successfully.",
                                data: meetingIds, // Return the array of meeting IDs
                              });
                            },
                          );
                        });
                      },
                    );
                  });
                });
              },
            );
          });
        });
      });
    } catch (err) {
      res.status(500).json({ error: true, message: err.message, data: {} });
    }
  },

  getStrategicmeeting: async function (req, res) {
    const { date } = req.query;
    const parseDateToSQL = (input) => {
      if (!input) return new Date().toISOString().split("T")[0];
      if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
      const tryDate = new Date(input);
      if (!isNaN(tryDate.getTime())) {
        const yyyy = tryDate.getFullYear();
        const mm = String(tryDate.getMonth() + 1).padStart(2, "0");
        const dd = String(tryDate.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
      }
      const m = input.trim().match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
      if (m) {
        const day = String(m[1]).padStart(2, "0");
        const mon = m[2].slice(0, 3).toLowerCase();
        const months = {
          jan: 1,
          feb: 2,
          mar: 3,
          apr: 4,
          may: 5,
          jun: 6,
          jul: 7,
          aug: 8,
          sep: 9,
          oct: 10,
          nov: 11,
          dec: 12,
        };

        const monthNum = months[mon];
        if (monthNum) {
          return `${m[3]}-${String(monthNum).padStart(2, "0")}-${day}`;
        }
      }
      return null;
    };

    const selectedDate = parseDateToSQL(date);
    if (date && !selectedDate) {
      return res.status(400).send({
        error: true,
        message:
          "Invalid date format. Use YYYY-MM-DD or 'DD Mon YYYY' (e.g., '27 Dec 2025').",
        data: {},
      });
    }

    var sql = `SELECT id, DATE_FORMAT(date, '%Y-%m-%d') AS date
FROM st_meeting
WHERE is_deleted = 0 
  AND date < ?
ORDER BY date DESC
LIMIT 1`;
    //get current user

    var sql2 = `SELECT  
    tm.*,
    u.first_name AS facilitator_first_name,
    md.name as department_name,
    u.last_name AS facilitator_last_name, 
    (SELECT GROUP_CONCAT(DISTINCT u2.profile_picture) 
     FROM users u2 
     WHERE FIND_IN_SET(u2.id, tm.participants)) AS participants_pictures,
    COUNT(DISTINCT t.id) AS total_tasks,
    SUM(CASE WHEN t.status = 1 THEN 1 ELSE 0 END) AS completed_tasks,
    SUM(CASE WHEN t.status = 1 AND DATE(t.updated_at) <= DATE(t.due_date) THEN 1 ELSE 0 END) AS on_time_completed,
    CASE 
        WHEN COUNT(DISTINCT t.id) = 0 THEN 0
        ELSE ROUND((SUM(CASE WHEN t.status = 1 THEN 1 ELSE 0 END) / COUNT(DISTINCT t.id)) * 100, 2)
    END AS completed_percentage,
    CASE 
        WHEN SUM(CASE WHEN t.status = 1 THEN 1 ELSE 0 END) = 0 THEN 0
        ELSE ROUND((SUM(CASE WHEN t.status = 1 AND DATE(t.updated_at) <= DATE(t.due_date) THEN 1 ELSE 0 END) / SUM(CASE WHEN t.status = 1 THEN 1 ELSE 0 END)) * 100, 2)
    END AS on_time_percentage
FROM st_meeting AS tm 
LEFT JOIN users AS u ON u.id = tm.facilator 
LEFT JOIN mst_department AS md ON md.id = tm.mst_department_id
LEFT JOIN todos AS t ON t.mst_department_id = tm.mst_department_id
    AND t.is_deleted = 0
    AND DATE(t.created_at) > ?
    AND DATE(t.created_at) <= ? 
WHERE DATE(tm.date) = ?
GROUP BY tm.id, tm.date, tm.mst_department_id, tm.facilator, tm.participants, 
         u.first_name, u.last_name, md.name
ORDER BY tm.id DESC`;

    var sql3 = `SELECT 
    COUNT(t.id) AS total_tasks,
    SUM(CASE WHEN t.status = 1 THEN 1 ELSE 0 END) AS completed_tasks,
    SUM(CASE WHEN t.status = 1 AND DATE(t.updated_at) <= DATE(t.due_date) THEN 1 ELSE 0 END) AS on_time_completed,
      ROUND(
        (SUM(CASE WHEN t.status = 1 THEN 1 ELSE 0 END) / NULLIF(COUNT(t.id), 0)) * 100, 
        2
    ) AS completed_percentage,
    ROUND(
        (SUM(CASE WHEN t.status = 1 AND DATE(t.updated_at) <= DATE(t.due_date) THEN 1 ELSE 0 END) / NULLIF(SUM(CASE WHEN t.status = 1 THEN 1 ELSE 0 END), 0)) * 100, 
        2
    ) AS on_time_rate_percentage
FROM todos AS t
WHERE t.is_deleted = 0 
  AND DATE(t.date) > ?
  AND DATE(t.date) <= ?`;

    db.query(sql, [selectedDate], function (err, prevDateResult) {
      if (err) {
        return res
          .status(500)
          .send({ error: true, message: err.sqlMessage, data: {} });
      }

      const previousDate =
        prevDateResult.length > 0 ? prevDateResult[0].date : selectedDate;

      // Step 2: Get meeting details with tasks
      db.query(
        sql2,
        [previousDate, selectedDate, selectedDate],
        function (err2, meetingResult) {
          if (err2) {
            return res
              .status(500)
              .send({ error: true, message: err2.sqlMessage, data: {} });
          }

          // Step 3: Get aggregated task statistics
          db.query(
            sql3,
            [previousDate, selectedDate],
            function (err3, taskStats) {
              if (err3) {
                return res
                  .status(500)
                  .send({ error: true, message: err3.sqlMessage, data: {} });
              }

              if (meetingResult.length > 0) {
                res.status(200).send({
                  error: false,
                  message: "Record fetched successfully",
                  data: meetingResult,
                  previousMeetingDate: previousDate,
                  aggregatedStats: taskStats[0] || {
                    total_tasks: 0,
                    completed_tasks: 0,
                    on_time_completed: 0,
                    completed_percentage: 0,
                    on_time_percentage: 0,
                  },
                });
              } else {
                res.status(200).send({
                  error: false,
                  message: "Not found",
                  data: [],
                  previousMeetingDate: previousDate,
                  aggregatedStats: taskStats[0] || {
                    total_tasks: 0,
                    completed_tasks: 0,
                    on_time_completed: 0,
                    completed_percentage: 0,
                    on_time_percentage: 0,
                  },
                });
              }
            },
          );
        },
      );
    });
  },

  getHodStrategicMeeting: async function (req, res) {
    const user_id = req.user.id;
    const { date } = req.query;

    const parseDateToSQL = (input) => {
      if (!input) return new Date().toISOString().split("T")[0];
      if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
      const tryDate = new Date(input);
      if (!isNaN(tryDate.getTime())) {
        const yyyy = tryDate.getFullYear();
        const mm = String(tryDate.getMonth() + 1).padStart(2, "0");
        const dd = String(tryDate.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
      }
      const m = input.trim().match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
      if (m) {
        const day = String(m[1]).padStart(2, "0");
        const mon = m[2].slice(0, 3).toLowerCase();
        const months = {
          jan: 1,
          feb: 2,
          mar: 3,
          apr: 4,
          may: 5,
          jun: 6,
          jul: 7,
          aug: 8,
          sep: 9,
          oct: 10,
          nov: 11,
          dec: 12,
        };
        const monthNum = months[mon];
        if (monthNum) {
          return `${m[3]}-${String(monthNum).padStart(2, "0")}-${day}`;
        }
      }
      return null;
    };

    const selectedDate = parseDateToSQL(date);
    if (date && !selectedDate) {
      return res.status(400).send({
        error: true,
        message:
          "Invalid date format. Use YYYY-MM-DD or 'DD Mon YYYY' (e.g., '27 Dec 2025').",
        data: {},
      });
    }

    var sql = `SELECT id, DATE_FORMAT(date, '%Y-%m-%d') AS date
FROM st_meeting
WHERE is_deleted = 0 
  AND date < ?
ORDER BY date DESC
LIMIT 1`;

    var sql2 = `SELECT  
    tm.*,
    u.first_name AS facilitator_first_name,
    md.name as department_name,
    u.last_name AS facilitator_last_name, 
    (SELECT GROUP_CONCAT(DISTINCT u2.profile_picture) 
     FROM users u2 
     WHERE FIND_IN_SET(u2.id, tm.participants)) AS participants_pictures,
    COUNT(DISTINCT t.id) AS total_tasks,
    SUM(CASE WHEN t.status = 1 THEN 1 ELSE 0 END) AS completed_tasks,
    SUM(CASE WHEN t.status = 1 AND DATE(t.updated_at) <= DATE(t.due_date) THEN 1 ELSE 0 END) AS on_time_completed,
    CASE 
        WHEN COUNT(DISTINCT t.id) = 0 THEN 0
        ELSE ROUND((SUM(CASE WHEN t.status = 1 THEN 1 ELSE 0 END) / COUNT(DISTINCT t.id)) * 100, 2)
    END AS completed_percentage,
    CASE 
        WHEN SUM(CASE WHEN t.status = 1 THEN 1 ELSE 0 END) = 0 THEN 0
        ELSE ROUND((SUM(CASE WHEN t.status = 1 AND DATE(t.updated_at) <= DATE(t.due_date) THEN 1 ELSE 0 END) / SUM(CASE WHEN t.status = 1 THEN 1 ELSE 0 END)) * 100, 2)
    END AS on_time_percentage
FROM st_meeting AS tm 
LEFT JOIN users AS u ON u.id = tm.facilator 
LEFT JOIN mst_department AS md ON md.id = tm.mst_department_id
LEFT JOIN todos AS t ON t.mst_department_id = tm.mst_department_id
    AND t.is_deleted = 0
    AND DATE(t.created_at) > ?
    AND DATE(t.created_at) <= ? 
WHERE DATE(tm.date) = ? 
  AND (tm.facilator = ? OR FIND_IN_SET(?, tm.participants))
GROUP BY tm.id, tm.date, tm.mst_department_id, tm.facilator, tm.participants, 
         u.first_name, u.last_name, md.name
ORDER BY tm.id DESC`;

    var sql3 = `SELECT 
    COUNT(t.id) AS total_tasks,
    SUM(CASE WHEN t.status = 1 THEN 1 ELSE 0 END) AS completed_tasks,
    SUM(CASE WHEN t.status = 1 AND DATE(t.updated_at) <= DATE(t.due_date) THEN 1 ELSE 0 END) AS on_time_completed,
      ROUND(
        (SUM(CASE WHEN t.status = 1 THEN 1 ELSE 0 END) / NULLIF(COUNT(t.id), 0)) * 100, 
        2
    ) AS completed_percentage,
    ROUND(
        (SUM(CASE WHEN t.status = 1 AND DATE(t.updated_at) <= DATE(t.due_date) THEN 1 ELSE 0 END) / NULLIF(SUM(CASE WHEN t.status = 1 THEN 1 ELSE 0 END), 0)) * 100, 
        2
    ) AS on_time_rate_percentage
FROM todos AS t
WHERE t.is_deleted = 0 
  AND DATE(t.date) > ?
  AND DATE(t.date) <= ? AND  (t.userid = ? OR t.assign_to = ?)`;

    db.query(sql, [selectedDate], function (err, prevDateResult) {
      if (err) {
        return res
          .status(500)
          .send({ error: true, message: err.sqlMessage, data: {} });
      }

      const previousDate =
        prevDateResult.length > 0 ? prevDateResult[0].date : selectedDate;

      // Step 2: Get meeting details with tasks
      db.query(
        sql2,
        [previousDate, selectedDate, selectedDate, user_id, user_id],
        function (err2, meetingResult) {
          if (err2) {
            return res
              .status(500)
              .send({ error: true, message: err2.sqlMessage, data: {} });
          }

          // Step 3: Get aggregated task statistics
          db.query(
            sql3,
            [previousDate, selectedDate, user_id, user_id],
            function (err3, taskStats) {
              if (err3) {
                return res
                  .status(500)
                  .send({ error: true, message: err3.sqlMessage, data: {} });
              }

              if (meetingResult.length > 0) {
                res.status(200).send({
                  error: false,
                  message: "Record fetched successfully",
                  data: meetingResult,
                  previousMeetingDate: previousDate,
                  aggregatedStats: taskStats[0] || {
                    total_tasks: 0,
                    completed_tasks: 0,
                    on_time_completed: 0,
                    completed_percentage: 0,
                    on_time_percentage: 0,
                  },
                });
              } else {
                res.status(200).send({
                  error: false,
                  message: "Not found",
                  data: [],
                  previousMeetingDate: previousDate,
                  aggregatedStats: taskStats[0] || {
                    total_tasks: 0,
                    completed_tasks: 0,
                    on_time_completed: 0,
                    completed_percentage: 0,
                    on_time_percentage: 0,
                  },
                });
              }
            },
          );
        },
      );
    });
  },

  getEmpstrategicMeeting: async function (req, res) {
    const user_id = req.user.id;
    const { date } = req.query;

    const parseDateToSQL = (input) => {
      if (!input) return new Date().toISOString().split("T")[0];
      if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
      const tryDate = new Date(input);
      if (!isNaN(tryDate.getTime())) {
        const yyyy = tryDate.getFullYear();
        const mm = String(tryDate.getMonth() + 1).padStart(2, "0");
        const dd = String(tryDate.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
      }
      const m = input.trim().match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
      if (m) {
        const day = String(m[1]).padStart(2, "0");
        const mon = m[2].slice(0, 3).toLowerCase();
        const months = {
          jan: 1,
          feb: 2,
          mar: 3,
          apr: 4,
          may: 5,
          jun: 6,
          jul: 7,
          aug: 8,
          sep: 9,
          oct: 10,
          nov: 11,
          dec: 12,
        };
        const monthNum = months[mon];
        if (monthNum) {
          return `${m[3]}-${String(monthNum).padStart(2, "0")}-${day}`;
        }
      }
      return null;
    };

    const selectedDate = parseDateToSQL(date);
    if (date && !selectedDate) {
      return res.status(400).send({
        error: true,
        message:
          "Invalid date format. Use YYYY-MM-DD or 'DD Mon YYYY' (e.g., '27 Dec 2025').",
        data: {},
      });
    }

    var sql = `SELECT id, DATE_FORMAT(date, '%Y-%m-%d') AS date
FROM st_meeting
WHERE is_deleted = 0 
  AND date < ?
ORDER BY date DESC
LIMIT 1`;

    var sql2 = `SELECT  
    tm.*,
    u.first_name AS facilitator_first_name,
    md.name as department_name,
    u.last_name AS facilitator_last_name, 
    (SELECT GROUP_CONCAT(DISTINCT u2.profile_picture) 
     FROM users u2 
     WHERE FIND_IN_SET(u2.id, tm.participants)) AS participants_pictures,
    COUNT(DISTINCT t.id) AS total_tasks,
    SUM(CASE WHEN t.status = 1 THEN 1 ELSE 0 END) AS completed_tasks,
    SUM(CASE WHEN t.status = 1 AND DATE(t.updated_at) <= DATE(t.due_date) THEN 1 ELSE 0 END) AS on_time_completed,
    CASE 
        WHEN COUNT(DISTINCT t.id) = 0 THEN 0
        ELSE ROUND((SUM(CASE WHEN t.status = 1 THEN 1 ELSE 0 END) / COUNT(DISTINCT t.id)) * 100, 2)
    END AS completed_percentage,
    CASE 
        WHEN SUM(CASE WHEN t.status = 1 THEN 1 ELSE 0 END) = 0 THEN 0
        ELSE ROUND((SUM(CASE WHEN t.status = 1 AND DATE(t.updated_at) <= DATE(t.due_date) THEN 1 ELSE 0 END) / SUM(CASE WHEN t.status = 1 THEN 1 ELSE 0 END)) * 100, 2)
    END AS on_time_percentage
FROM st_meeting AS tm 
LEFT JOIN users AS u ON u.id = tm.facilator 
LEFT JOIN mst_department AS md ON md.id = tm.mst_department_id
LEFT JOIN todos AS t ON t.mst_department_id = tm.mst_department_id
    AND t.is_deleted = 0
    AND DATE(t.created_at) > ?
    AND DATE(t.created_at) <= ? 
WHERE DATE(tm.date) = ? 
  AND  FIND_IN_SET(?, tm.participants)
GROUP BY tm.id, tm.date, tm.mst_department_id, tm.facilator, tm.participants, 
         u.first_name, u.last_name, md.name
ORDER BY tm.id DESC`;

    //get current user
    var sql3 = `SELECT 
    COUNT(t.id) AS total_tasks,
    SUM(CASE WHEN t.status = 1 THEN 1 ELSE 0 END) AS completed_tasks,
    SUM(CASE WHEN t.status = 1 AND DATE(t.updated_at) <= DATE(t.due_date) THEN 1 ELSE 0 END) AS on_time_completed,
      ROUND(
        (SUM(CASE WHEN t.status = 1 THEN 1 ELSE 0 END) / NULLIF(COUNT(t.id), 0)) * 100, 
        2
    ) AS completed_percentage,
    ROUND(
        (SUM(CASE WHEN t.status = 1 AND DATE(t.updated_at) <= DATE(t.due_date) THEN 1 ELSE 0 END) / NULLIF(SUM(CASE WHEN t.status = 1 THEN 1 ELSE 0 END), 0)) * 100, 
        2
    ) AS on_time_rate_percentage
FROM todos AS t
WHERE t.is_deleted = 0 
  AND DATE(t.date) > ?
  AND DATE(t.date) <= ? AND  t.assign_to = ?`;

    db.query(sql, [selectedDate], function (err, prevDateResult) {
      if (err) {
        return res
          .status(500)
          .send({ error: true, message: err.sqlMessage, data: {} });
      }

      const previousDate =
        prevDateResult.length > 0 ? prevDateResult[0].date : selectedDate;

      // Step 2: Get meeting details with tasks
      db.query(
        sql2,
        [previousDate, selectedDate, selectedDate, user_id],
        function (err2, meetingResult) {
          if (err2) {
            return res
              .status(500)
              .send({ error: true, message: err2.sqlMessage, data: {} });
          }

          // Step 3: Get aggregated task statistics
          db.query(
            sql3,
            [previousDate, selectedDate, user_id],
            function (err3, taskStats) {
              if (err3) {
                return res
                  .status(500)
                  .send({ error: true, message: err3.sqlMessage, data: {} });
              }

              if (meetingResult.length > 0) {
                res.status(200).send({
                  error: false,
                  message: "Record fetched successfully",
                  data: meetingResult,
                  previousMeetingDate: previousDate,
                  aggregatedStats: taskStats[0] || {
                    total_tasks: 0,
                    completed_tasks: 0,
                    on_time_completed: 0,
                    completed_percentage: 0,
                    on_time_percentage: 0,
                  },
                });
              } else {
                res.status(200).send({
                  error: false,
                  message: "Not found",
                  data: [],
                  previousMeetingDate: previousDate,
                  aggregatedStats: taskStats[0] || {
                    total_tasks: 0,
                    completed_tasks: 0,
                    on_time_completed: 0,
                    completed_percentage: 0,
                    on_time_percentage: 0,
                  },
                });
              }
            },
          );
        },
      );
    });
  },

  getStrategicmeetingbyid: (req, res) => {
    try {
      const id = req.params?.id;

      if (!isNaN(parseInt(id))) {
        // Fix condition to check valid number
        var sql = `SELECT 
                        tc.*, 
                        u.first_name AS facilitator_first_name, 
                        u.last_name AS facilitator_last_name, 
                        u.profile_picture, 
                        md.name AS department_name, 
                        GROUP_CONCAT(p.profile_picture) AS participants_pictures 
                    FROM st_meeting AS tc
                    LEFT JOIN users AS u ON u.id = tc.facilator 
                    LEFT JOIN users AS p ON FIND_IN_SET(p.id, tc.participants)
                    LEFT JOIN mst_department AS md ON md.id = tc.mst_department_id
                    WHERE tc.id = ? AND tc.is_deleted = 0
                    GROUP BY tc.id
                    ORDER BY tc.id DESC`;

        db.query(sql, [id], (err, result) => {
          if (err) {
            res
              .status(200)
              .json({ message: err.sqlMessage, error: true, data: {} });
          } else if (result.length) {
            res
              .status(200)
              .json({ message: "Record fetched", error: false, data: result });
          } else {
            res
              .status(200)
              .json({ message: "Not found", error: false, data: [] });
          }
        });
      } else {
        res
          .status(200)
          .json({ message: "Invalid request", error: true, data: {} });
      }
    } catch (err) {
      res
        .status(200)
        .json({ message: "Invalid request", error: true, data: {} });
    }
  },

  getStrategicparticipantsbyid: (req, res) => {
    try {
      const { date: queryDateFromQuery, department: departmentFromQuery } =
        req.query || {};
      const { date: queryDateFromParams, department: departmentFromParams } =
        req.params || {};

      const queryDate = queryDateFromQuery || queryDateFromParams;
      const department = departmentFromQuery || departmentFromParams;

      if (!queryDate || !department) {
        return res.status(400).json({
          message: "Date and department are required",
          error: true,
          data: {},
        });
      }

      const sqlDate = `
SELECT 
  om.id
FROM st_meeting om
WHERE om.is_deleted = 0 
  AND om.date = ? 
  AND om.mst_department_id = ?`;

      db.query(sqlDate, [queryDate, department], (errDate, resultDate) => {
        if (errDate) {
          return res.status(500).json({
            message: errDate.sqlMessage,
            error: true,
            data: {},
          });
        }

        if (resultDate.length === 0) {
          return res.status(404).json({
            message: "No meeting found for the given date and department",
            error: true,
            data: {},
          });
        }

        const meeting_id = resultDate[0].id;

        if (!meeting_id || isNaN(parseInt(meeting_id))) {
          return res.status(400).json({
            message: "Invalid meeting ID",
            error: true,
            data: {},
          });
        }

        var sql = `select st.*,
  u.first_name, 
    u.last_name,  
    u.profile_picture
    from st_meeting_detail as st
    LEFT JOIN 
    users AS u ON u.id = st.user_id 
    WHERE 
    st.is_deleted = 0 
    AND st.meeting_id = ?
     AND st.date = ?
     order by st.total_marks_data desc
`;

        db.query(sql, [meeting_id, queryDate], (err, result) => {
          if (err) {
            return res.status(500).json({
              message: err.sqlMessage,
              error: true,
              data: {},
            });
          }

          if (result.length) {
            return res.status(200).json({
              message: "Record fetched successfully",
              error: false,
              data: result,
              meetingInfo: {
                meeting_id: meeting_id,
                current_date: queryDate,
              },
            });
          } else {
            return res.status(404).json({
              message: "No participants found for this meeting",
              error: false,
              data: [],
            });
          }
        });
      });
    } catch (err) {
      return res.status(500).json({
        message: "Server error: " + err.message,
        error: true,
        data: {},
      });
    }
  },

  getstrategicoutecomebyid: (req, res) => {
    try {
      const id = req.params?.id;

      if (parseInt(id) != NaN) {
        var sql =
          "select id,what_did_u_well,what_did_u_not_well,what_can_u_do_diff from st_meeting_detail where id = " +
          id +
          "";
        db.query(sql, (err, result) => {
          if (err) {
            res
              .status(200)
              .json({ message: err.sqlMessage, error: true, data: {} });
          } else if (result.length) {
            res
              .status(200)
              .json({ message: "Record fetched", error: false, data: result });
          } else {
            res
              .status(200)
              .json({ message: "Not found", error: false, data: [] });
          }
        });
      } else {
        res
          .status(200)
          .json({ message: "Invalid request", error: true, data: {} });
      }
    } catch (err) {
      res
        .status(200)
        .json({ message: "Invalid request", error: true, data: {} });
    }
  },

  updateStrategicPerformance: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.editId);

    // Use parameterized queries to avoid SQL injection and syntax errors
    const selectSql =
      "SELECT id,DATE_FORMAT(date, '%Y-%m-%d') AS formatted_date,user_id,what_did_u_well,what_did_u_not_well,what_can_u_do_diff FROM `st_meeting_detail` WHERE `id` = ?";

    db.query(selectSql, [id], (err, result) => {
      if (err) {
        const data = { error: true, message: err.sqlMessage, data: {} };
        return res.status(500).json(data); // Use 500 for server errors
      }
      const meetingDate = result.length > 0 ? result[0].formatted_date : null;
      const employeeId = result.length > 0 ? result[0].user_id : null;

      const user_id = req?.user?.id;

      const clarity = {
        what_did_u_well: this_data.what_did_u_well,
        what_did_u_not_well: this_data.what_did_u_not_well,
        what_can_u_do_diff: this_data.what_can_u_do_diff,
        updated_at: getCurrentDateAndTime(),
        updated_by: user_id,
      };

      const updateSql =
        "UPDATE `st_meeting_detail` SET " +
        "`what_did_u_well` = ?, " +
        "`what_did_u_not_well` = ?, " +
        "`what_can_u_do_diff` = ?, " +
        "`updated_at` = ?, " +
        "`updated_by` = ? " +
        "WHERE `user_id` = ? and date =?";

      db.query(
        updateSql,
        [
          clarity.what_did_u_well,
          clarity.what_did_u_not_well,
          clarity.what_can_u_do_diff,
          clarity.updated_at,
          parseInt(clarity.updated_by),
          employeeId,
          meetingDate,
        ],
        (err, result) => {
          if (err) {
            console.error("Database update error:", err);
            return res
              .status(500)
              .json({ error: true, message: err.sqlMessage, data: {} });
          }

          if (result.affectedRows === 0) {
            return res.status(404).json({
              error: true,
              message: "Participant not found",
              data: {},
            });
          }

          const response = {
            error: false,
            message: " Strategic Performance has been updated successfully.",
            data: { id },
          };
          res.status(200).json(response);
        },
      );
    });
  },

  fetchtaskforstrategic: async function (req, res) {
    const id = req?.params?.id;

    //get current user
    var sql = `SELECT DISTINCT 
    (SELECT COUNT(id) 
     FROM todos 
     WHERE is_deleted = 0 
     AND due_date BETWEEN DATE_SUB(CURRENT_DATE(), INTERVAL 45 DAY) AND CURRENT_DATE()
     AND (FIND_IN_SET(?, REPLACE(REPLACE(REPLACE(assign_to, '[', ''), ']', ''), ')', '')) > 0
          OR FIND_IN_SET(?, REPLACE(REPLACE(REPLACE(contributon, '[', ''), ']', ''), ')', '')) > 0
          OR userid = ?)) AS total_tasks,
    
    (SELECT COUNT(id) 
     FROM todos 
     WHERE is_deleted = 0 
     AND status = 1
     AND due_date BETWEEN DATE_SUB(CURRENT_DATE(), INTERVAL 45 DAY) AND CURRENT_DATE()
     AND (FIND_IN_SET(?, REPLACE(REPLACE(REPLACE(assign_to, '[', ''), ']', ''), ')', '')) > 0
          OR FIND_IN_SET(?, REPLACE(REPLACE(REPLACE(contributon, '[', ''), ']', ''), ')', '')) > 0
          OR userid = ?)) AS completed_tasks,

    t.id,  
    t.contributon,
    t.assign_to, 
    t.due_date,
    t.counter,
    t.userid,
    t.status, 
    t.task, 
    t.priority,
     nemf.case_id,
     snmf.case_id as caseId,
    ucd.first_name AS client_name,
    uu.first_name as user_name,
    su.first_name as sclient_name,
    GROUP_CONCAT(DISTINCT at.profile_picture) AS assign_to_profiles,
    GROUP_CONCAT(DISTINCT cu.profile_picture) AS contribution_profiles,
    uu.profile_picture AS user_profile
FROM 
    todos AS t
LEFT JOIN users AS at
    ON FIND_IN_SET(at.id, REPLACE(REPLACE(REPLACE(t.assign_to, '[', ''), ']', ''), ')', '')) > 0
LEFT JOIN users AS cu
    ON FIND_IN_SET(cu.id, REPLACE(REPLACE(REPLACE(t.contributon, '[', ''), ']', ''), ')', '')) > 0
LEFT JOIN users AS uu
    ON uu.id = t.userid
LEFT JOIN new_mst_file AS nmf 
    ON nmf.id = t.project_id
LEFT JOIN users AS ucd 
    ON ucd.id = nmf.client_id
     left join new_mst_file_details as nmfd
        on nmfd.id = t.file_id
    left join new_mst_file as nemf
        on nemf.id = nmfd.project_id
        left join users as ceu
        on ceu.id = nemf.client_id
        left join schedule as s
        on s.id = t.schedule_id
        left join new_mst_file as snmf
        on snmf.id = s.source_id
        left join users as su 
        on su.id = snmf.client_id
WHERE 
    t.is_deleted = 0
    AND t.due_date BETWEEN DATE_SUB(CURRENT_DATE(), INTERVAL 45 DAY) AND CURRENT_DATE()
    AND FIND_IN_SET(?, REPLACE(REPLACE(REPLACE(t.assign_to, '[', ''), ']', ''), ')', '')) > 0  
GROUP BY 
    t.id, 
    t.contributon,
    t.assign_to, 
    t.due_date, 
    t.status,
    t.counter,
    t.task, 
     uu.first_name,
    ucd.first_name,
    t.priority
ORDER BY 
    t.due_date DESC;

 `;

    db.query(sql, [id, id, id, id, id, id, id], function (err, result) {
      if (err) {
        var data = { error: true, message: err.sqlMessage, data: {} };
        res.status(201).send(data);
      } else {
        if (result.length > 0) {
          var data = {
            error: false,
            message: "Recoard fetched successfully",
            data: result,
          };
          res.status(201).send(data);
        } else {
          var data = { error: false, message: "Not found", data: [] };
          res.status(201).json(data);
        }
      }
    });
  },

  getStrategicmeetingPercentage: (req, res) => {
    try {
      const id = req.params?.id;

      if (!isNaN(parseInt(id))) {
        const sqlDate = `
          SELECT DATE_FORMAT(date, '%Y-%m-%d') AS formatted_date, mst_department_id 
          FROM st_meeting 
          WHERE id = ?;
        `;

        db.query(sqlDate, [id], (errDate, resultDate) => {
          if (errDate) {
            return res.status(500).json({
              message: errDate.sqlMessage,
              error: true,
              data: {},
            });
          }

          if (resultDate.length === 0) {
            return res.status(404).json({
              message: "No previous meeting found",
              error: true,
              data: {},
            });
          }

          const date = resultDate[0].formatted_date;
          const departmentId = resultDate[0].mst_department_id;

          const sqldata = `
            SELECT 
              COUNT(*) AS total_tasks,
              ROUND((COUNT(CASE WHEN t.status = 1 THEN 1 END) / COUNT(*)) * 100, 2) AS completed_percentage,
              ROUND((COUNT(CASE WHEN t.status = 0 THEN 1 END) / COUNT(*)) * 100, 2) AS uncompleted_percentage,
              COUNT(CASE WHEN t.status = 1 AND DATE(t.due_date) = DATE(tc.created_at) THEN 1 END) AS on_time_completed_task,
              ROUND((
                COUNT(CASE WHEN t.status = 1 AND DATE(t.due_date) = DATE(tc.created_at) THEN 1 END) /
                NULLIF(COUNT(CASE WHEN t.status = 1 THEN 1 END), 0)
              ) * 100, 2) AS on_time_completed_percentage
            FROM 
              todos AS t
            LEFT JOIN 
              todos_counter AS tc ON tc.todos_id = t.id
            WHERE 
              t.is_deleted = 0 
              AND t.assign_to IS NOT NULL
              AND t.due_date BETWEEN DATE_SUB(?, INTERVAL 15 DAY) AND ?
              AND t.mst_department_id = ?
          `;

          db.query(
            sqldata,
            [date, date, departmentId],
            (errTask, resultTask) => {
              if (errTask) {
                return res.status(500).json({
                  message: errTask.sqlMessage,
                  error: true,
                  data: {},
                });
              }

              const sqlPerformance = `
              SELECT 
                COUNT(DISTINCT user_id) AS total_users,
                ROUND(IFNULL(SUM(task_mark), 0) / (1.0 * COUNT(DISTINCT user_id)), 2) AS avg_task_mark,
                ROUND(IFNULL(SUM(attendance), 0) / (1.0 * COUNT(DISTINCT user_id)), 2) AS avg_attendance,
                ROUND(IFNULL(SUM(software), 0) / (1.0 * COUNT(DISTINCT user_id)), 2) AS avg_software,
                ROUND(IFNULL(SUM(conflict), 0) / (1.0 * COUNT(DISTINCT user_id)), 2) AS avg_conflict,
                ROUND(IFNULL(SUM(meeting), 0) / (1.0 * COUNT(DISTINCT user_id)), 2) AS avg_meeting,
                ROUND(IFNULL(SUM(collabation), 0) / (1.0 * COUNT(DISTINCT user_id)), 2) AS avg_collabation,
                ROUND((
                  IFNULL(SUM(task_mark), 0) +
                  IFNULL(SUM(attendance), 0) +
                  IFNULL(SUM(software), 0) +
                  IFNULL(SUM(conflict), 0) +
                  IFNULL(SUM(meeting), 0) +
                  IFNULL(SUM(collabation), 0)
                ) / (1.0 * COUNT(DISTINCT user_id)), 2) AS avg_total
              FROM 
                st_meeting_detail
              WHERE 
                is_deleted = 0 
                AND meeting_id = ?
                AND user_id IS NOT NULL;
            `;

              db.query(sqlPerformance, [id], (errPerf, resultPerf) => {
                if (errPerf) {
                  return res.status(500).json({
                    message: errPerf.sqlMessage,
                    error: true,
                    data: {},
                  });
                }

                return res.status(200).json({
                  message: "Record fetched",
                  error: false,
                  data: {
                    task_stats: resultTask[0],
                    performance_stats: resultPerf[0] || {},
                  },
                });
              });
            },
          );
        });
      } else {
        res.status(400).json({
          message: "Invalid meeting ID",
          error: true,
          data: {},
        });
      }
    } catch (err) {
      res.status(500).json({
        message: "Server error",
        error: true,
        data: {},
      });
    }
  },
  updateMarks: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.editId);

    // Use parameterized queries to avoid SQL injection and syntax errors
    const selectSql =
      "SELECT id,software,conflict,total_marks_data FROM `st_meeting_detail` WHERE `user_id` = ? LIMIT 1";

    db.query(selectSql, [id], (err, result) => {
      if (err) {
        const data = { error: true, message: err.sqlMessage, data: {} };
        return res.status(500).json(data); // Use 500 for server errors
      }
      if (result.length === 0) {
        return res
          .status(404)
          .json({ error: true, message: "Record not found", data: {} });
      }

      const user_id = req?.user?.id;
      const software = parseFloat(this_data.software);
      const conflict = parseFloat(this_data.conflict);
      const total_marks_data = parseFloat(result[0].total_marks_data || 0);

      // Calculate percentages
      const software_percent = (software / 5) * 100;
      const conflict_percent = (conflict / 5) * 100;
      const final_total_marks = software + conflict + total_marks_data;

      const clarity = {
        software: this_data.software,
        conflict: this_data.conflict,
        soft_percent: software_percent,
        con_percent: conflict_percent,
        total_marks_data: final_total_marks,
        updated_at: getCurrentDateAndTime(),
        updated_by: user_id,
      };

      const updateSql =
        "UPDATE `st_meeting_detail` SET " +
        "`software` = ?, " +
        "`conflict` = ?, " +
        "`soft_percent` = ?, " +
        "`con_percent` = ?, " +
        "`total_marks_data` = ?, " +
        "`updated_at` = ?, " +
        "`updated_by` = ? " +
        "WHERE `user_id` = ?";

      db.query(
        updateSql,
        [
          clarity.software,
          clarity.conflict,
          clarity.soft_percent,
          clarity.con_percent,
          clarity.total_marks_data,
          clarity.updated_at,
          parseInt(clarity.updated_by),
          id,
        ],
        (err, result) => {
          if (err) {
            console.error("Database update error:", err);
            return res
              .status(500)
              .json({ error: true, message: err.sqlMessage, data: {} });
          }

          if (result.affectedRows === 0) {
            return res.status(404).json({
              error: true,
              message: "Participant not found",
              data: {},
            });
          }

          const response = {
            error: false,
            message: " Marks has been updated successfully.",
            data: { id },
          };
          res.status(200).json(response);
        },
      );
    });
  },

  getmarksbyid: (req, res) => {
    try {
      const id = req.params?.id;

      if (parseInt(id) != NaN) {
        var sql =
          "select id,software,conflict from st_meeting_detail where id = " +
          id +
          "";
        db.query(sql, (err, result) => {
          if (err) {
            res
              .status(200)
              .json({ message: err.sqlMessage, error: true, data: {} });
          } else if (result.length) {
            res
              .status(200)
              .json({ message: "Record fetched", error: false, data: result });
          } else {
            res
              .status(200)
              .json({ message: "Not found", error: false, data: [] });
          }
        });
      } else {
        res
          .status(200)
          .json({ message: "Invalid request", error: true, data: {} });
      }
    } catch (err) {
      res
        .status(200)
        .json({ message: "Invalid request", error: true, data: {} });
    }
  },
  FetchTopPerformer: (req, res) => {
    try {
      const sql = `
        SELECT date 
        FROM st_meeting_detail
        ORDER BY date DESC 
        LIMIT 1
      `;

      db.query(sql, (err, dateResult) => {
        if (err) {
          return res.status(500).json({
            message: err.sqlMessage,
            error: true,
            data: {},
          });
        }

        if (dateResult.length === 0) {
          return res.status(404).json({
            message: "No meeting date found",
            error: false,
            data: [],
          });
        }

        const latestDate = dateResult[0].date;

        const sql1 = `
          SELECT 
            DISTINCT(st.user_id) AS user_id,
            st.software,
            st.conflict,
            st.total_marks_data,
            st.task_mark,
            st.attendance,
            st.software,
            st.meeting,
            st.on_time,
            st.collabation,
            u.first_name, 
            u.last_name,  
            u.profile_picture
          FROM st_meeting_detail AS st
          LEFT JOIN users AS u ON u.id = st.user_id 
          WHERE st.is_deleted = 0 AND st.date = ?
          ORDER BY st.total_marks_data DESC
        `;

        db.query(sql1, [latestDate], (err, result) => {
          if (err) {
            return res.status(500).json({
              message: err.sqlMessage,
              error: true,
              data: {},
            });
          }

          if (result.length) {
            return res.status(200).json({
              message: "Record fetched",
              error: false,
              data: result,
            });
          } else {
            return res.status(404).json({
              message: "No performer data found for the latest date",
              error: false,
              data: [],
            });
          }
        });
      });
    } catch (err) {
      return res.status(500).json({
        message: "Server error",
        error: true,
        data: {},
      });
    }
  },

  fetchmstMeeting: (req, res) => {
    try {
      var sql = `
        SELECT 
          mm.id,
          mm.facilator,
          mm.participants,
          mm.status,
          md.name AS department_name,
          u.profile_picture AS facilator_profile,
          u.first_name AS facilator_name,
          GROUP_CONCAT(p.profile_picture ORDER BY FIND_IN_SET(p.id, mm.participants)) AS participants_pictures,
          GROUP_CONCAT(p.first_name ORDER BY FIND_IN_SET(p.id, mm.participants)) AS participants_name
        FROM mst_meeting AS mm
        LEFT JOIN mst_department AS md ON md.id = mm.mst_department_id
        LEFT JOIN users AS u ON u.id = mm.facilator
        LEFT JOIN users AS p ON FIND_IN_SET(p.id, mm.participants)
        GROUP BY mm.id, mm.facilator, mm.participants, mm.status, md.name, u.profile_picture, u.first_name
      `;

      db.query(sql, (err, result) => {
        if (err) {
          return res.status(500).json({
            message: err.sqlMessage,
            error: true,
            data: {},
          });
        }
        if (result.length) {
          return res.status(200).json({
            message: "Record fetched",
            error: false,
            data: result,
          });
        } else {
          return res.status(404).json({
            message: "Not found",
            error: false,
            data: [],
          });
        }
      });
    } catch (err) {
      return res.status(500).json({
        message: "Server error",
        error: true,
        data: {},
      });
    }
  },
  getmstmeetingbyid: (req, res) => {
    try {
      const id = req.params?.id;

      if (parseInt(id) != NaN) {
        var sql = "select * from mst_meeting where id =" + id + "";
        db.query(sql, (err, result) => {
          if (err) {
            res
              .status(200)
              .json({ message: err.sqlMessage, error: true, data: {} });
          } else if (result.length) {
            res
              .status(200)
              .json({ message: "Record fetched", error: false, data: result });
          } else {
            res
              .status(200)
              .json({ message: "Not found", error: false, data: [] });
          }
        });
      } else {
        res
          .status(200)
          .json({ message: "Invalid request", error: true, data: {} });
      }
    } catch (err) {
      res
        .status(200)
        .json({ message: "Invalid request", error: true, data: {} });
    }
  },

  updatemstMeeting: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.id);

    // Use parameterized queries to avoid SQL injection and syntax errors
    const selectSql = "SELECT * FROM `mst_meeting` WHERE `id` = ?";

    db.query(selectSql, [id], (err, result) => {
      if (err) {
        const data = { error: true, message: err.sqlMessage, data: {} };
        return res.status(500).json(data);
      }

      const user_id = req?.user?.id;

      // ✅ Handle both array and string formats
      const participantsString = Array.isArray(this_data.participants)
        ? this_data.participants.join(",")
        : String(this_data.participants);

      const meeting = {
        mst_department_id: this_data.department_name,
        facilator: this_data.facilator,
        participants: participantsString,
        status: this_data.status,
        updated_at: getCurrentDateAndTime(),
        updated_by: user_id,
      };

      const updateSql =
        "UPDATE `mst_meeting` SET " +
        "`mst_department_id` = ?, " +
        "`facilator` = ?, " +
        "`participants` = ?, " +
        "`status` = ?, " +
        "`updated_at` = ?, " +
        "`updated_by` = ? " +
        "WHERE `id` = ?";

      db.query(
        updateSql,
        [
          meeting.mst_department_id,
          meeting.facilator,
          meeting.participants,
          meeting.status,
          meeting.updated_at,
          parseInt(meeting.updated_by),
          id,
        ],
        (err, result) => {
          if (err) {
            const data = { error: true, message: err.sqlMessage, data: {} };
            return res.status(500).json(data);
          }

          const response = {
            error: false,
            message: "meeting has been updated...",
            data: {},
          };

          res.status(200).json(response);
        },
      );
    });
  },
  fetchHolidays: async function (req, res) {
    var sql = `select * from mst_holidays
 `;

    db.query(sql, function (err, result) {
      if (err) {
        var data = { error: true, message: err.sqlMessage, data: {} };
        res.status(201).send(data);
      } else {
        if (result.length > 0) {
          var data = {
            error: false,
            message: "Recoard fetched successfully",
            data: result,
          };
          res.status(201).send(data);
        } else {
          var data = { error: false, message: "Not found", data: [] };
          res.status(201).json(data);
        }
      }
    });
  },

  getLivelocation: async function (req, res) {
    // If date comes from params use it, otherwise use today's date
    const date = req.params.date
      ? req.params.date
      : new Date().toISOString().split("T")[0];

    const sql = `
     SELECT a.id, a.user_id, a.date, a.checkin, a.checkout, a.breakin, a.breakout, a.latitude, a.longitude,u.first_name,u.last_name
    FROM attendance as a
    left join users as u
    on u.id = a.user_id
     WHERE a.date = ?
  `;

    db.query(sql, [date], function (err, result) {
      if (err) {
        return res.status(500).json({
          error: true,
          message: err.sqlMessage,
          data: {},
        });
      }

      if (result.length > 0) {
        return res.status(200).json({
          error: false,
          message: "Record fetched successfully",
          date: date,
          data: result,
        });
      } else {
        return res.status(200).json({
          error: false,
          message: "Not found",
          date: date,
          data: [],
        });
      }
    });
  },

  getWorkflowTeamMembers: async function (req, res) {
    try {
      const user_id = req.user ? req.user.id : null;
      if (!user_id) {
        return res.status(401).json({ error: true, message: "Unauthorized", data: [] });
      }

      // Check role of current user
      const roleSql = `
        SELECT mg.name as role 
        FROM users_groups ug 
        JOIN mst_groups mg ON mg.id = ug.mst_group_id 
        WHERE ug.mst_user_id = ?
      `;

      db.query(roleSql, [user_id], (errRole, roles) => {
        if (errRole) {
          return res.status(500).json({ error: true, message: errRole.sqlMessage, data: [] });
        }

        const roleNames = (roles || []).map((r) => r.role);
        const isAdmin = roleNames.includes("admin") || roleNames.includes("subadmin");

        if (isAdmin) {
          // Admin sees all active employees & hods (deduplicated by u.id)
          const allEmpSql = `
            SELECT 
              u.id, 
              ANY_VALUE(u.first_name) AS first_name, 
              ANY_VALUE(u.last_name) AS last_name, 
              ANY_VALUE(u.profile_picture) AS profile_picture,
              ANY_VALUE(md.id) AS department_id,
              GROUP_CONCAT(DISTINCT md.name SEPARATOR ', ') AS department_name
            FROM users AS u
            LEFT JOIN users_groups AS mu ON mu.mst_user_id = u.id 
            LEFT JOIN mst_groups AS mg ON mg.id = mu.mst_group_id 
            LEFT JOIN user_department_post AS udp ON udp.user_id = u.id
            LEFT JOIN mst_department AS md ON md.id = udp.department_id
            WHERE u.isdeleted = 0 AND mg.name IN ('Employees', 'Hod') AND u.active = 1 
            GROUP BY u.id
            ORDER BY first_name ASC
          `;
          db.query(allEmpSql, (errAll, resultAll) => {
            if (errAll) {
              return res.status(500).json({ error: true, message: errAll.sqlMessage, data: [] });
            }
            return res.status(200).json({
              error: false,
              message: "Record fetched",
              isAdmin: true,
              data: resultAll || [],
            });
          });
        } else {
          // HOD: find HOD's department(s) and only return their department team members (deduplicated by u.id)
          const deptSql = `SELECT department_id FROM user_department_post WHERE user_id = ?`;
          db.query(deptSql, [user_id], (errDept, deptRows) => {
            if (errDept) {
              return res.status(500).json({ error: true, message: errDept.sqlMessage, data: [] });
            }
            const deptIds = (deptRows || []).map((d) => d.department_id).filter(Boolean);

            if (deptIds.length === 0) {
              return res.status(200).json({
                error: false,
                message: "No department assigned to HOD",
                isAdmin: false,
                department_ids: [],
                data: [],
              });
            }

            const hodEmpSql = `
              SELECT 
                u.id, 
                ANY_VALUE(u.first_name) AS first_name, 
                ANY_VALUE(u.last_name) AS last_name, 
                ANY_VALUE(u.profile_picture) AS profile_picture,
                ANY_VALUE(md.id) AS department_id,
                GROUP_CONCAT(DISTINCT md.name SEPARATOR ', ') AS department_name
              FROM users AS u
              JOIN user_department_post AS udp ON udp.user_id = u.id
              LEFT JOIN mst_department AS md ON md.id = udp.department_id
              WHERE u.isdeleted = 0 
                AND u.active = 1
                AND udp.department_id IN (?)
              GROUP BY u.id
              ORDER BY first_name ASC
            `;
            db.query(hodEmpSql, [deptIds], (errHodEmp, resultHodEmp) => {
              if (errHodEmp) {
                return res.status(500).json({ error: true, message: errHodEmp.sqlMessage, data: [] });
              }
              return res.status(200).json({
                error: false,
                message: "Record fetched",
                isAdmin: false,
                department_ids: deptIds,
                data: resultHodEmp || [],
              });
            });
          });
        }
      });
    } catch (err) {
      return res.status(500).json({ error: true, message: err.message, data: [] });
    }
  },

  getWorkflowMeetingClarity: async function (req, res) {
    try {
      const current_user_id = req.user ? req.user.id : null;
      const { date, user_id } = req.query;

      // Check role of current user
      const roleSql = `
        SELECT mg.name as role 
        FROM users_groups ug 
        JOIN mst_groups mg ON mg.id = ug.mst_group_id 
        WHERE ug.mst_user_id = ?
      `;

      db.query(roleSql, [current_user_id], (errRole, roles) => {
        const roleNames = (roles || []).map((r) => r.role);
        const isAdmin = roleNames.includes("admin") || roleNames.includes("subadmin");

        const executeQuery = (hodDeptIds = null) => {
          let where = ["omd.is_deleted = 0"];
          let params = [];

          if (date) {
            where.push("DATE(omd.date) = ?");
            params.push(date);
          }

          if (user_id) {
            where.push("omd.user_id = ?");
            params.push(user_id);
          }

          if (!isAdmin && hodDeptIds && hodDeptIds.length > 0) {
            where.push(`(
              om.mst_department_id IN (?) 
              OR omd.user_id IN (
                SELECT user_id FROM user_department_post WHERE department_id IN (?)
              )
            )`);
            params.push(hodDeptIds, hodDeptIds);
          } else if (!isAdmin && (!hodDeptIds || hodDeptIds.length === 0)) {
            return res.status(200).json({ error: false, message: "No departments", data: [] });
          }

          const sql = `
            SELECT 
              omd.id,
              omd.meeting_id,
              DATE_FORMAT(omd.date, '%Y-%m-%d') AS date,
              omd.user_id,
              omd.clarity_1_key_highlight,
              omd.clarity_1_key_action,
              omd.clarity_2_key_highlight,
              omd.clarity_2_key_action,
              omd.verified,
              omd.remark,
              u.first_name,
              u.last_name,
              u.profile_picture,
              md.name AS department_name,
              vu.first_name AS verified_first_name,
              vu.last_name AS verified_last_name
            FROM op_meeting_detail AS omd
            LEFT JOIN op_meeting AS om ON om.id = omd.meeting_id
            LEFT JOIN mst_department AS md ON md.id = om.mst_department_id
            LEFT JOIN users AS u ON u.id = omd.user_id
            LEFT JOIN users AS vu ON vu.id = omd.verified_by
            WHERE ${where.join(" AND ")}
            ORDER BY u.first_name ASC
          `;

          db.query(sql, params, (err, result) => {
            if (err) {
              return res.status(200).json({
                error: true,
                message: err.sqlMessage,
                data: [],
              });
            }
            return res.status(200).json({
              error: false,
              message: "Record fetched",
              data: result || [],
            });
          });
        };

        if (isAdmin) {
          executeQuery();
        } else {
          // Get HOD's department IDs
          const deptSql = `SELECT department_id FROM user_department_post WHERE user_id = ?`;
          db.query(deptSql, [current_user_id], (errDept, deptRows) => {
            if (errDept) {
              return res.status(500).json({ error: true, message: errDept.sqlMessage, data: [] });
            }
            const deptIds = (deptRows || []).map((d) => d.department_id).filter(Boolean);
            executeQuery(deptIds);
          });
        }
      });
    } catch (err) {
      return res.status(200).json({
        error: true,
        message: err.message,
        data: [],
      });
    }
  },
};
