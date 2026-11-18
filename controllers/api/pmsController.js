module.exports = {
add: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const taskId = this_data.id;
    const enteredHours = Number(this_data.hours) || 0;
    const enteredMinutes = Number(this_data.minutes) || 0;
    const enteredTotalMinutes = enteredHours * 60 + enteredMinutes;

    if (!taskId) {
      return res
        .status(500)
        .json({ error: true, message: "Missing task id", data: {} });
    }
    if (
      enteredTotalMinutes <= 0 ||
      isNaN(enteredHours) ||
      isNaN(enteredMinutes) ||
      enteredMinutes >= 60 ||
      enteredMinutes < 0 ||
      enteredHours < 0
    ) {
      return res
        .status(500)
        .json({
          error: true,
          message: "Enter a valid duration",
          data: {},
        });
    }

    // ── Check remaining time before inserting ──
    const checkSql = `
    SELECT
      t.hours AS total_hours,
      t.minutes AS total_minutes,
      COALESCE(SUM(p.hours), 0) AS used_hours,
      COALESCE(SUM(p.minutes), 0) AS used_minutes
    FROM todos t
    LEFT JOIN pms p ON p.task_id = t.id AND p.is_deleted = 0
    WHERE t.id = ?
    GROUP BY t.id, t.hours, t.minutes
  `;

    db.query(checkSql, [taskId], function (err, rows) {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      const row = rows[0];
      const totalHours = row ? Number(row.total_hours) : 0;
      const totalMinutes = row ? Number(row.total_minutes) : 0;
      const usedHours = row ? Number(row.used_hours) : 0;
      const usedMinutes = row ? Number(row.used_minutes) : 0;

      const totalInMinutes = totalHours * 60 + totalMinutes;
      const usedInMinutes = usedHours * 60 + usedMinutes;

      if (totalInMinutes > 0 && usedInMinutes + enteredTotalMinutes > totalInMinutes) {
        const remainingInMinutes = Math.max(totalInMinutes - usedInMinutes, 0);
        const remH = Math.floor(remainingInMinutes / 60);
        const remM = remainingInMinutes % 60;
        return res.status(500).json({
          error: true,
          message: `Only ${remH}h ${remM}m remaining out of ${totalHours}h ${totalMinutes}m`,
          data: {},
        });
      }

      // ── Proceed with insert ──
      const pms = {
        task_id: taskId,
        task: this_data.task,
        category:this_data.category,
        hours: enteredHours,
        minutes: enteredMinutes,
        created_at: getCurrentDateAndTime(),
        created_by: user_id,
        updated_at: null,
        updated_by: null,
        is_deleted: 0,
      };

      db.query("INSERT INTO pms SET ?", pms, function (err, result) {
        if (err) {
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        const data = {
          error: false,
          message: "Pms has been added successfully.",
          data: {
            id: result.insertId,
          },
        };
        res.status(201).json(data);
      });
    });
  },

  getPms: async function (req, res) {
    const { user_id, date, created_by } = req.query || {};
    const current_user_id = req.user ? req.user.id : null;
    let whereClauses = ["p.is_deleted = 0"];
    let params = [];

    const targetUser = user_id || created_by;
    if (targetUser) {
      whereClauses.push("p.created_by = ?");
      params.push(targetUser);
    }
    if (date) {
      whereClauses.push("DATE(p.created_at) = ?");
      params.push(date);
    }

    const roleSql = `
      SELECT mg.name as role 
      FROM users_groups ug 
      JOIN mst_groups mg ON mg.id = ug.mst_group_id 
      WHERE ug.mst_user_id = ?
    `;

    db.query(roleSql, [current_user_id], (errRole, roles) => {
      const roleNames = (roles || []).map((r) => r.role);
      const isAdmin = roleNames.includes("admin") || roleNames.includes("subadmin");

      const executePmsQuery = (deptUserIds = null) => {
        if (!isAdmin && !targetUser && deptUserIds) {
          if (deptUserIds.length > 0) {
            whereClauses.push("p.created_by IN (?)");
            params.push(deptUserIds);
          } else {
            return res.status(200).json({ error: false, message: "Not found", data: [] });
          }
        }

        var sql = `SELECT 
          p.id,
          p.task,
          p.category,
          t.task as work,
          p.hours,
          p.minutes,
          t.sub_function,
          DATE_FORMAT(p.created_at,'%d %b %Y') as created_at,
          DATE_FORMAT(p.created_at, '%Y-%m-%d') as date_raw,
          p.created_by,
          u.id as user_id,
          u.first_name,
          u.last_name,
          u.profile_picture,
          nmf.case_id,
          cu.first_name as client_name 
        FROM pms as p 
        LEFT JOIN users as u on u.id = p.created_by 
        LEFT JOIN todos as t on t.id = p.task_id
        LEFT JOIN new_mst_file as nmf on nmf.id = t.project_id
        LEFT JOIN users as cu on cu.id = nmf.client_id
        WHERE ${whereClauses.join(" AND ")} 
        ORDER BY p.id ASC`;

        db.query(sql, params, function (err, result) {
          if (err) {
            res.status(200).json({ error: true, message: err.sqlMessage, data: [] });
          } else {
            if (result && result.length > 0) {
              res.status(200).json({ error: false, message: "Record fetched", data: result });
            } else {
              res.status(200).json({ error: false, message: "Not found", data: [] });
            }
          }
        });
      };

      if (isAdmin || targetUser || !current_user_id) {
        executePmsQuery();
      } else {
        // HOD without targetUser: get all users in HOD's departments
        const deptUsersSql = `
          SELECT DISTINCT user_id 
          FROM user_department_post 
          WHERE department_id IN (
            SELECT department_id FROM user_department_post WHERE user_id = ?
          )
        `;
        db.query(deptUsersSql, [current_user_id], (errDeptUsers, userRows) => {
          if (errDeptUsers) {
            return res.status(200).json({ error: true, message: errDeptUsers.sqlMessage, data: [] });
          }
          const userIds = (userRows || []).map((r) => r.user_id).filter(Boolean);
          executePmsQuery(userIds);
        });
      }
    });
  },

  getEmpPms: async function (req, res) {
    const user_id = req.user ? req.user.id : null;
    var sql = `SELECT p.id,p.task,p.category,t.task as work,p.hours,p.minutes,t.sub_function,DATE_FORMAT(p.created_at,'%d %b %Y') as created_at,u.first_name,nmf.case_id,cu.first_name as client_name from pms as p left join users as u on u.id = p.created_by 
left join todos as t on t.id = p.task_id
left join new_mst_file as nmf on nmf.id = t.project_id
left join users as cu on cu.id = nmf.client_id
where p.is_deleted = 0 and p.created_by = ?  order by p.id asc`;

    db.query(sql, [user_id], function (err, result) {
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

  getPmstaskById: (req, res) => {
    var id = parseInt(req.params.id);
    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql =
        "SELECT id,category,task,hours,minutes from pms WHERE `is_deleted`=0 and task_id=" +
        parseInt(id) +
        "";
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
            res.status(201).json({
              error: true,
              message: "Requesting record not found",
              data: {},
            });
          }
        }
      });
    }
  },

  getPmsById: (req, res) => {
    var id = parseInt(req.params.id);
    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql =
        "SELECT * from pms WHERE `is_deleted`=0 and id=" + parseInt(id) + "";
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
            res.status(201).json({
              error: true,
              message: "Requesting record not found",
              data: {},
            });
          }
        }
      });
    }
  },

  update: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.id);
    const newHours = Number(this_data.hours);

    if (!this_data.task || !this_data.task.trim()) {
      return res
        .status(500)
        .json({ error: true, message: "Task is required", data: {} });
    }
    if (!newHours || isNaN(newHours) || newHours <= 0) {
      return res
        .status(500)
        .json({
          error: true,
          message: "Enter a valid number of hours",
          data: {},
        });
    }

    const selectSql = "SELECT * FROM `pms` WHERE `id` = ?";

    db.query(selectSql, [id], (err, result) => {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      if (!result.length) {
        return res
          .status(500)
          .json({ error: true, message: "Record not found", data: {} });
      }

      const existingPms = result[0];
      const taskId = existingPms.task_id;

      // ── Check remaining hours, excluding this row's own current hours ──
      const checkSql = `
      SELECT
        t.hours AS total_hours,
        COALESCE(SUM(p.hours), 0) AS used_hours
      FROM todos t
      LEFT JOIN pms p ON p.task_id = t.id AND p.is_deleted = 0 AND p.id != ?
      WHERE t.id = ?
      GROUP BY t.id, t.hours
    `;

      db.query(checkSql, [id, taskId], (err, checkResult) => {
        if (err) {
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        const row = checkResult[0];
        const totalHours = row ? Number(row.total_hours) : 0;
        const usedHours = row ? Number(row.used_hours) : 0;

        if (totalHours > 0 && usedHours + newHours > totalHours) {
          const remaining = totalHours - usedHours;
          return res.status(500).json({
            error: true,
            message: `Only ${remaining} hour${remaining === 1 ? "" : "s"} remaining out of ${totalHours}`,
            data: {},
          });
        }

        // ── Proceed with update ──
        const user_id = req?.user?.id;

        const pms = {
          task: this_data.task,
          category:this_data.category,
          hours: this_data.hours,
          minutes:this_data.minutes,
          updated_at: getCurrentDateAndTime(),
          updated_by: user_id,
        };

        const updateSql =
          "UPDATE `pms` SET " +
          "`task` = ?, " +
          "`category`=?,"+
          "`hours` = ?, " +
            "`minutes` = ?, " +
          "`updated_at` = ?, " +
          "`updated_by` = ? " +
          "WHERE `id` = ?";

        db.query(
          updateSql,
          [pms.task,pms.category, pms.hours,pms.minutes, pms.updated_at, parseInt(pms.updated_by), id],
          (err, result) => {
            if (err) {
              return res
                .status(500)
                .json({ error: true, message: err.sqlMessage, data: {} });
            }

            const response = {
              error: false,
              message: "Pms has been updated...",
              data: {},
            };

            res.status(200).json(response);
          },
        );
      });
    });
  },

  deletePms: function (req, res) {
    const pmsId = req.params.id;

    const id = req.user.id;

    var sql =
      "UPDATE `pms` SET `is_deleted`=1,`updated_by`=" +
      parseInt(id) +
      ",`updated_at`='" +
      getCurrentDateAndTime() +
      "' WHERE `id`=" +
      pmsId +
      "";

    db.query(sql, function (err, result) {
      if (err) {
        res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      } else {
        res.status(200).json({
          error: false,
          message: "Pms has been marked as deleted!",
          data: {},
        });
      }
    });
  },
};
