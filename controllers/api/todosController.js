const {
  filter_string,
  getOnlyDateFromMySql,
  isDateInBetween,
  validJson,
} = require("../../services/Utility");
const notificationController = require("./notificationController");
const table_name = "todos";
module.exports = {
  getCardObject: (card_no) => {
    switch (card_no) {
      case 1:
        return { card_no: 1, card_type: "green" };
      case 2:
        return { card_no: 2, card_type: "yellow" };
      case 3:
        return { card_no: 3, card_type: "red" };
      case 4:
        return { card_no: 4, card_type: "cyan" };
      default:
        return null;
    }
  },
  getTodoStatus: (card_no) => {
    switch (card_no) {
      case 0:
        return "Pending";
      case 1:
        return "Approved";
      case 2:
        return "Rejected";
      default:
        return "None";
    }
  },


  addTodo: async (req, res) => {
    try {
      const data = req.body;
     
      const todos = data.boxes;

      const department = data.department;
      const hod = data.hod;
      const team_id = data.team_id;

      
      await Promise.all(
        todos.map(async (todoData) => {
          const todo = {
            title: todoData.title ? filter_string(todoData.title.trim()) : "",
            description: todoData.description
              ? filter_string(todoData.description.trim())
              : "",
            team_id: team_id,
            hod_id: hod,
            department_id: department,
            mst_file_id: parseInt(todoData.mst_file_id) || 0,
            remarks: todoData.remarks
              ? filter_string(todoData.remarks.trim())
              : "",
            work_done: todoData.work_done
              ? filter_string(todoData.work_done.trim())
              : "",
            work_pending: todoData.work_pending
              ? filter_string(todoData.work_pending.trim())
              : "",
            execution_date: todoData.execution_date
              ? todoData.execution_date
              : null,
            completed_date: todoData.completed_date
              ? todoData.completed_date
              : null,
            extended_date: todoData.extended_date
              ? todoData.extended_date
              : null,
            is_deleted: 0,
            is_approved: 0,
            mark_as_done: 0,
            created_at: getCurrentDateAndTime(),
            created_by: parseInt(req?.user?.id) || 0,
          };

          try {
            console.log("SQL Query:", "INSERT INTO `todos` SET ?", todo);
            const result = await new Promise((resolve, reject) => {
              db.query("INSERT INTO `todos` SET ? ", todo, (err, result) => {
                if (err) {
                  console.error(err);
                  reject(err);
                } else {
                  /* Sending Notification */
                  notificationController.setNotification(
                    JSON.stringify({
                      message: todo.title,
                      action: "New Todo has been assigned",
                    }),
                    todo.team_id,
                    todo.created_by,
                    result.insertId,
                    null,
                    table_name
                  );

                  resolve(result);
                }
              });
            });

            return result;
          } catch (error) {
            console.error("Error in database insertion:", error);
            throw error;
          }
        })
      );

      res.status(200).json({ error: false, message: "Todos added", data: {} });
    } catch (err) {
      console.error("Error in addTodo:", err);
      res.status(500).json({
        error: true,
        message: `Server API error: ${err.message}`,
        data: {},
      });
    }
  },

  updateTodo: (req, res) => {
    try {
      var errors = false;
      const data = req.body;
      console.log(data);
      if (errors) {
        res.status(200).json({
          error: true,
          message: "Server API error: Something went wrong",
          data: {},
        });
      } else {
        var sql =
          "SELECT *FROM `todos` WHERE `id`=" + data?.id + " and `is_deleted`=0";
        db.query(sql, (err, result) => {
          if (err) {
            console.log(err);
            res
              .status(200)
              .json({ message: err.sqlMessage, error: true, data: {} });
          } else if (result.length > 0) {
            const todoData = {
              title: data?.title ? filter_string(data?.title.trim()) : "",
              description: data?.description
                ? filter_string(data?.description.trim())
                : "",
              team_id:
                parseInt(data?.team_id) != NaN ? parseInt(data?.team_id) : 0,
              mst_file_id:
                parseInt(data?.mst_file_id) != NaN
                  ? parseInt(data?.mst_file_id)
                  : 0,
              execution_date: data?.execution_date
                ? data?.execution_date
                : null,
              completed_date: data?.completed_date
                ? data?.completed_date
                : null,
              extended_date: data?.extended_date ? data?.extended_date : null,
              updated_at: getCurrentDateAndTime(),
              updated_by:
                parseInt(req?.user?.id) != NaN
                  ? parseInt(req?.user?.id)
                  : result[0]?.updated_by,
            };

            var sql = "UPDATE `todos` SET ? WHERE `id`=" + data?.id + "";

            db.query(sql, todoData, (err, result) => {
              if (err) {
                console.log(err);
                res
                  .status(200)
                  .json({ message: err.sqlMessage, error: true, data: {} });
              } else {
                notificationController.setNotification(
                  JSON.stringify({
                    message: `Task Updated : ${todoData?.title}`,
                    action: "Task updated",
                  }),
                  todoData?.team_id,
                  req.user?.id,
                  data?.id,
                  null,
                  "todos"
                );

                res
                  .status(200)
                  .json({ message: "Changes saved!", error: false, data: {} });
              }
            });
          } else {
            res.status(200).json({
              message: "Record doesn't existed or removed",
              error: true,
              data: {},
            });
          }
        });
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

  getTodo: (req, res) => {
    try {
      const { startDate, endDate, selectedTeam } = req.query;

      var sql =
        "SELECT `t`.`id`,`t`.`remainder_date`,`au`.`profile_picture` as `admin_profile`,`u`.`profile_picture` as `hod_profile`,`t`.`todo_status`,`t`.`admin_id`,`au`.`first_name`,`au`.`last_name`,concat(`au`.`first_name`,' ',`au`.`last_name`) as `admin_name`,`t`.`title`,`t`.`remainder`,`t`.`hod_comment`,`t`.`hod_comment_date`,`t`.`admin_comment_date`, `msd`.`name` as `DepartmentName`,`t`.`description`,`t`.`team_id`,`u`.`first_name`,`u`.`last_name`,concat(`u`.`first_name`,' ',`u`.`last_name`) as `team_fullname`,`t`.`created_at`, `uhod`.`first_name` AS `hod_first_name`, `uhod`.`last_name` AS `hod_last_name`, CONCAT(`uhod`.`first_name`, ' ', `uhod`.`last_name`) AS`hod_name`,`t`.`mst_file_id`,`mf`.`office_file_no`,`mf`.`file_name`,`t`.`remarks`,`t`.`hod_remarks`,`t`.`admin_remarks`,`t`.`admin_card`,`t`.`execution_date`,`t`.`completed_date`,`t`.`extended_date`,`t`.`actual_completed_date`,`t`.`reason`,`t`.`work_done`,`t`.`work_pending`,`t`.`is_deleted`,`t`.`is_approved`,`t`.`approved_date`,`t`.`card`,`t`.`mark_as_done`,`t`.`updated_at` FROM `todos` as `t` LEFT JOIN `users` as `u` on `u`.`id`=`t`.`team_id` LEFT JOIN `mst_file` as `mf` ON `t`.`mst_file_id`=`mf`.`id`    LEFT JOIN `user_department_post` AS `udp` ON `udp`.`id` = `t`.`hod_id` LEFT JOIN  `users` AS `uhod` ON `uhod`.`id` = `udp`.`user_id` LEFT JOIN `mst_department` as `msd` on `msd`.`id`=`udp`.`department_id` LEFT JOIN  `users` AS `au` ON `au`.`id` = `t`.`admin_id` WHERE `t`.`is_deleted`=0";

      if (selectedTeam) {
        sql += ` AND t.team_id = ${selectedTeam}`;
      }

      if (startDate && endDate) {
        // Assuming your date columns in the database are in the format 'YYYY-MM-DD'
        sql += ` AND DATE(t.execution_date) BETWEEN '${startDate}' AND '${endDate}'`;
      }

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

  getTodoOfTeamId: (req, res) => {
    try {
      const id = req?.user.id ? parseInt(req?.user?.id) : undefined;
      var sql =
        "SELECT `t`.`id`,`t`.`todo_status`,`t`.`remainder`,`t`.`title`,`t`.`description`,`t`.`created_at`,`t`.`team_id`,`u`.`first_name`,`u`.`last_name`,concat(`u`.`first_name`,' ',`u`.`last_name`) as `team_fullname`, `uhod`.`first_name` AS `hod_first_name`,  `uhod`.`last_name` AS `hod_last_name`,    CONCAT(`uhod`.`first_name`, ' ', `uhod`.`last_name`) AS`hod_name`,`t`.`mst_file_id`,`mf`.`office_file_no`,`mf`.`file_name`,`t`.`remarks`,`t`.`execution_date`,`t`.`completed_date`,`t`.`extended_date`,`t`.`actual_completed_date`,`t`.`reason`,`t`.`work_done`,`t`.`department_id`,`t`.`work_pending`,`t`.`is_deleted`,`t`.`is_approved`,`t`.`approved_date`,`t`.`card`,`t`.`mark_as_done` FROM `todos` as `t` LEFT JOIN `users` as `u` on `u`.`id`=`t`.`team_id` LEFT JOIN `mst_file` as `mf` ON `t`.`mst_file_id`=`mf`.`id` LEFT JOIN `user_department_post` AS `udp` ON `udp`.`id` = `t`.`hod_id` LEFT JOIN  `users` AS `uhod` ON `uhod`.`id` = `udp`.`user_id` WHERE `t`.`is_deleted`=0 and `t`.`team_id`=" +
        id +
        "";
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

  getTodoByTeamId: (req, res) => {
    try {
      const id = req.params?.id;
      var sql =
        "SELECT `t`.`id`,`t`.`title`,`t`.`description`,`t`.`team_id`,`u`.`first_name`,`u`.`last_name`,concat(`u`.`first_name`,' ',`u`.`last_name`) as `team_fullname`,`t`.`mst_file_id`,`mf`.`office_file_no`,`mf`.`file_name`,`t`.`remarks`,`t`.`execution_date`,`t`.`completed_date`,`t`.`extended_date`,`t`.`actual_completed_date`,`t`.`reason`,`t`.`work_done`,`t`.`work_pending`,`t`.`is_deleted`,`t`.`is_approved`,`t`.`approved_date`,`t`.`card`,`t`.`mark_as_done` FROM `todos` as `t` LEFT JOIN `users` as `u` on `u`.`id`=`t`.`team_id` LEFT JOIN `mst_file` as `mf` ON `t`.`mst_file_id`=`mf`.`id` WHERE `t`.`is_deleted`=0 and `t`.`team_id`=" +
        id +
        "";
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
  getoldTodoById: (req, res) => {
    try {
      const id = req?.params.id ? parseInt(req?.params?.id) : undefined;
      var sql =
        "SELECT `t`.`id`, concat(`au`.`first_name`,' ',`au`.`last_name`) as `admin_name`,`t`.`hod_comment`,`t`.`hod_comment_date`,`t`.`admin_comment_date`,`t`.`admin_id`,`au`.`first_name`,`t`.`hod_remarks`,`au`.`last_name`,`t`.`remainder_date`,`t`.`remainder`,`t`.`todo_status`,`t`.`hod_remarks`,`t`.`admin_card`,`t`.`admin_remarks`,`t`.`title`,`t`.`description`,`uhod`.`first_name` AS `hod_first_name`, `t`.`created_at`, `uhod`.`last_name` AS `hod_last_name`,    CONCAT(`uhod`.`first_name`, ' ', `uhod`.`last_name`) AS`hod_name`,`t`.`team_id`,`u`.`first_name`,`u`.`last_name`,concat(`u`.`first_name`,' ',`u`.`last_name`) as `team_fullname`,`t`.`mst_file_id`,`mf`.`office_file_no`,`mf`.`file_name`,`t`.`remarks`,`t`.`execution_date`,`t`.`completed_date`,`t`.`extended_date`,`t`.`actual_completed_date`,`t`.`reason`,`t`.`work_done`,`t`.`work_pending`,`t`.`is_deleted`,`t`.`is_approved`,`t`.`approved_date`,`t`.`card`,`t`.`mark_as_done` FROM `todos` as `t` LEFT JOIN `users` as `u` on `u`.`id`=`t`.`team_id` LEFT JOIN `mst_file` as `mf` ON `t`.`mst_file_id`=`mf`.`id`  LEFT JOIN `user_department_post` AS `udp` ON `udp`.`id` = `t`.`hod_id`  LEFT JOIN  `users` AS `uhod` ON `uhod`.`id` = `udp`.`user_id`   LEFT JOIN  `users` AS `au` ON `au`.`id` = `t`.`admin_id` WHERE `t`.`is_deleted`=0 and `t`.`id`=" +
        id +
        "";
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

  deleteTodo: (req, res) => {
    try {
      const id =
        parseInt(req?.params?.id) != NaN
          ? parseInt(req?.params?.id)
          : undefined;

      if (id) {
        const data = {
          is_deleted: 1,
          updated_at: getCurrentDateAndTime(),
          updated_by:
            parseInt(req?.user?.id) != NaN ? parseInt(req?.user?.id) : 0,
        };

        var sql = "UPDATE `todos` SET ? WHERE `id`=" + id + "";
        db.query(sql, data, (err, result) => {
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

  deleteHodComment: (req, res) => {
    try {
      const id =
        parseInt(req?.params?.id) != NaN
          ? parseInt(req?.params?.id)
          : undefined;

      if (id) {
        const data = {
          hod_remarks: "  ",
          updated_at: getCurrentDateAndTime(),
          updated_by:
            parseInt(req?.user?.id) != NaN ? parseInt(req?.user?.id) : 0,
        };

        var sql = "UPDATE `todos` SET ? WHERE `id`=" + id + "";
        db.query(sql, data, (err, result) => {
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
  deleteadmincomment: (req, res) => {
    try {
      const id =
        parseInt(req?.params?.id) != NaN
          ? parseInt(req?.params?.id)
          : undefined;

      if (id) {
        const data = {
          admin_remarks: "  ",
          updated_at: getCurrentDateAndTime(),
          updated_by:
            parseInt(req?.user?.id) != NaN ? parseInt(req?.user?.id) : 0,
        };

        var sql = "UPDATE `todos` SET ? WHERE `id`=" + id + "";
        db.query(sql, data, (err, result) => {
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
  checkTodoTask: (req, res) => {
    try {
      const data = req?.body;
      console.log("data==>", data);

      const id = data?.id;
      const card_no = data?.card_no;

      var sql = "SELECT *FROM `todos` WHERE `id`=" + id + "";
      db.query(sql, (err, xresult) => {
        if (err) {
          console.log(err);
          res
            .status(200)
            .json({ message: err.sqlMessage, error: true, data: {} });
        } else if (xresult.length > 0) {
          const todoData = {
            remarks: data?.remarks
              ? filter_string(data?.remarks.trim())
              : xresult[0]?.remarks,
            card: xresult[0]?.card,
            is_approved:
              parseInt(data?.is_approved) === 0 ||
              parseInt(data?.is_approved) === 1 ||
              parseInt(data?.is_approved) === 2
                ? parseInt(data?.is_approved)
                : xresult[0]?.is_approved,
            hod_remarks: data?.hod_remarks,
            approved_date: getCurrentDate(),
            mark_as_done: xresult[0]?.mark_as_done,
            hod_remarks: data?.hod_remarks,
            remainder: data?.remainder,
            completed_date: data?.completed_date,
            todo_status: data?.is_approved,
            updated_at: getCurrentDateAndTime(),
            updated_by:
              parseInt(req?.user?.id) != NaN ? parseInt(req?.user?.id) : 0,
          };
          if (data?.remainder && data?.remainder !== xresult[0]?.remainder) {
            todoData.remainder_date = getCurrentDate(); // Set remainder_date to today's date
          }
          if (todoData.is_approved == 1) {
            todoData.mark_as_done = 1;
          } else if (todoData.is_approved == 2) {
            todoData.mark_as_done = 0;
          }

          if (card_no >= 1 || card_no <= 3) {
            const obj = module.exports.getCardObject(parseInt(card_no));
            if (obj != null) {
              const cardData = {
                ...obj,
                created_at: getCurrentDateAndTime(),
                created_by: parseInt(req?.user?.id),
              };
              console.log(cardData);
              const newCardData = module.exports.manage_card_bulk(
                todoData?.card ? todoData?.card : undefined,
                cardData
              );
              console.log(newCardData);
              todoData.card = JSON.stringify(newCardData);
            }
          }

          var sql = "UPDATE `todos` SET ? WHERE `id`=" + id + "";

          db.query(sql, todoData, (err, result) => {
            if (err) {
              console.log(err);
              res
                .status(200)
                .json({ message: err.sqlMessage, error: true, data: {} });
            } else {
              const status = module.exports.getTodoStatus(
                todoData?.is_approved
              );
              /*Sending notification*/
              notificationController.setNotification(
                JSON.stringify({
                  message: `Your todo has been reviewed with status ${status}`,
                  title: todoData?.remarks,
                  action: "Reviewed the todo",
                }),
                xresult[0]?.team_id,
                parseInt(req?.user?.id) != NaN ? parseInt(req?.user?.id) : 0,
                id,
                null,
                table_name
              );

              res
                .status(200)
                .json({ message: "Changes saved!", error: false, data: {} });
            }
          });
        } else {
          res
            .status(200)
            .json({ error: false, message: "Record doesn't exist", data: {} });
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

    checkHodTodoTask: (req, res) => {
    try {
      const data = req?.body;
      const id = data?.id;
      const card_no = data?.card_no;
      console.log("data==>", data);

      var sql = "SELECT *FROM `todos` WHERE `id`=" + id + "";
      db.query(sql, (err, xresult) => {
        if (err) {
          console.log(err);
          res
            .status(200)
            .json({ message: err.sqlMessage, error: true, data: {} });
        } else if (xresult.length > 0) {
          const adminRemarks = data?.admin_remarks?.trim();
          const adminComment = adminRemarks ? 1 : undefined;
          const todoData = {
            
            remarks: data?.remarks
              ? filter_string(data?.remarks.trim())
              : xresult[0]?.remarks,
            admin_card: xresult[0]?.card,
            is_approved:
              parseInt(data?.is_approved) === 0 ||
              parseInt(data?.is_approved) === 1 ||
              parseInt(data?.is_approved) === 2
                ? parseInt(data?.is_approved)
                : xresult[0]?.is_approved,
            approved_date: getCurrentDate(),

            mark_as_done: xresult[0]?.mark_as_done,
            
            // admin_remarks: data?.admin_remarks,
            admin_remarks: adminRemarks,
            admin_comment:adminComment,
            // admin_comment_date: getCurrentDateAndTime(),
            admin_comment_date: adminRemarks ? getCurrentDateAndTime() : undefined,
            completed_date: data?.completed_date,
            remainder: data?.remainder,
            full_completed_date: undefined,
            updated_at: getCurrentDateAndTime(),
            updated_by:
              parseInt(req?.user?.id) != NaN ? parseInt(req?.user?.id) : 0,
            admin_id:
              parseInt(req?.user?.id) != NaN ? parseInt(req?.user?.id) : 0,
          };

          if (data?.remainder && data?.remainder !== xresult[0]?.remainder) {
            todoData.remainder_date = getCurrentDate(); // Set remainder_date to today's date
          }

          if (todoData.is_approved == 1) {
            todoData.mark_as_done = 1;
          } else if (todoData.is_approved == 2) {
            todoData.mark_as_done = 0;
            todoData.full_completed_date = getCurrentDateAndTime(); 
          }

          if (card_no >= 1 || card_no <= 3) {
            const obj = module.exports.getCardObject(parseInt(card_no));
            if (obj != null) {
              const cardData = {
                ...obj,
                created_at: getCurrentDateAndTime(),
                created_by: parseInt(req?.user?.id),
              };
              console.log(cardData);
              const newCardData = module.exports.manage_card_bulk(
                todoData?.admin_card ? todoData?.admin_card : undefined,
                cardData
              );
              console.log(newCardData);
              todoData.admin_card = JSON.stringify(newCardData);
            }
          }

          var sql = "UPDATE `todos` SET ? WHERE `id`=" + id + "";

          db.query(sql, todoData, (err, result) => {
            if (err) {
              console.log(err);
              res
                .status(200)
                .json({ message: err.sqlMessage, error: true, data: {} });
            } else {
              const status = module.exports.getTodoStatus(
                todoData?.is_approved
              );
              /*Sending notification*/
              notificationController.setNotification(
                JSON.stringify({
                  message: `Your todo has been reviewed with status ${status}`,
                  title: todoData?.remarks,
                  action: "Reviewed the todo",
                }),
                xresult[0]?.team_id,
                parseInt(req?.user?.id) != NaN ? parseInt(req?.user?.id) : 0,
                id,
                null,
                table_name
              );

              res
                .status(200)
                .json({ message: "Changes saved!", error: false, data: {} });
            }
          });
        } else {
          res
            .status(200)
            .json({ error: false, message: "Record doesn't exist", data: {} });
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
  verifyTodo: (req, res) => {
    try {
      const id = req.body?.id;
      const data = {
        is_approved: parseInt(req?.body?.is_approved),
        updated_at: getCurrentDateAndTime(),
        updated_by:
          parseInt(req?.user?.id) != NaN ? parseInt(req?.user?.id) : 0,
      };

      var sql = "UPDATE `todos` SET ? WHERE `id`=" + id + "";

      db.query(sql, data, (err, result) => {
        if (err) {
          console.log(err);
          res
            .status(200)
            .json({ message: err.sqlMessage, error: true, data: {} });
        } else {
          res
            .status(200)
            .json({ error: false, message: "Changes saved", data: {} });
        }
      });

      /*var sql = "SELECT *FROM `todos` WHERE `id`="+id+"";
				  db.query(sql,(err,xresult)=>{
					  if(err)
					  {
						  console.log(err);
						  res.status(200).json({message:err.sqlMessage,error:true,data:{}});
					  }
					  else if(xresult.length>0)
					  {

					  }
					  else
					  {
						  res.status(200).json({error:false,message:"Record doesn't exist",data:{}})
					  }
				  })*/
    } catch (err) {
      console.log(err);
      res.status(200).json({
        error: true,
        message: "Server API error: Something went wrong",
        data: {},
      });
    }
  },
  MarkAsDone: (req, res) => {
    //Input: actual_completed_date,reason,
    try {
      const data = req.body;
      console.log("data===>", data);

      var sql =
        "SELECT * FROM `todos` WHERE `id`=" + data.id + " and `is_deleted`=0";
      db.query(sql, (err, xresult) => {
        if (err) {
          console.log("err==>", err);
          res
            .status(200)
            .json({ message: err.sqlMessage, error: true, data: {} });
        } else if (xresult.length > 0) {
          const todoData = {
            // actual_completed_date: getCurrentDate(),
            mark_as_done: 1,
            reason: data?.reason.trim()
              ? filter_string(data?.reason.trim())
              : xresult[0]?.reason,

            updated_at: getCurrentDateAndTime(),
            updated_by:
              parseInt(req?.user?.id) != NaN ? parseInt(req?.user?.id) : 0,
          };
          console.log("todoData=====>", todoData);

          var sql = "UPDATE `todos` SET ? WHERE `id`=" + data.id + "";

          db.query(sql, { ...todoData }, (err, result) => {
            if (err) {
              res
                .status(200)
                .json({ message: err.sqlMessage, error: true, data: {} });
            } else {
              /*Setting notification*/
              notificationController.setNotification(
                JSON.stringify({
                  message: todoData.reason,
                  title: xresult[0]?.title,
                  action: "Todo task completed",
                }),
                null,
                req?.user?.id ? req?.user?.id : 0,
                data?.id,
                null,
                table_name
              );

              res.status(200).json({
                message: "Changes saved!",
                error: false,
                data: {},
              });
            }
          });
        } else {
          res
            .status(200)
            .json({ error: false, message: "Record doesn't exist", data: {} });
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
  manage_card_bulk: (oldCardChunks, newCard) => {
    var newCardArray = [];
    if (!oldCardChunks) {
      newCardArray.push(newCard);
    } else {
      if (validJson(oldCardChunks)) {
        const oldCardDataObj = JSON.parse(oldCardChunks);
        if (Array.isArray(oldCardDataObj) && oldCardDataObj.length) {
          const pickedLastElement = oldCardDataObj[oldCardDataObj.length - 1];
          if (pickedLastElement?.card_no == newCard?.card_no) {
            newCardArray = [...oldCardDataObj];
          } else {
            newCardArray = [...oldCardDataObj];
            newCardArray.push(newCard);
          }
        } else {
          newCardArray.push(newCard);
        }
      } else {
        newCardArray.push(newCard);
      }
    }

    return newCardArray;
  },
  getTodoByFileId: (req, res) => {
    try {
      const mst_file_id = req.params?.id;

      var sql =
        "SELECT `t`.`id`,`t`.`title`,`t`.`team_id`,concat(`u`.`first_name`,' ',`u`.`last_name`) as `team_fullname`,`t`.`mst_file_id`,`mf`.`file_name`,`t`.`description`,`t`.`remarks`,`t`.`reason`,`t`.`work_done`,`t`.`work_pending`,`t`.`execution_date`,`t`.`completed_date`,`t`.`extended_date`,`t`.`actual_completed_date`,`t`.`is_approved`,`t`.`card`,`t`.`mark_as_done` FROM `todos` as `t` LEFT JOIN `users` as `u` ON `u`.`id`=`t`.`team_id` LEFT JOIN `mst_file` as `mf` ON `mf`.`id`=`t`.`mst_file_id` WHERE `mst_file_id`=" +
        mst_file_id +
        "";

      db.query(sql, (err, result) => {
        if (err) {
          res
            .status(200)
            .json({ message: err.sqlMessage, error: false, data: result });
        } else if (result.length > 0) {
          res
            .status(200)
            .json({ message: "Record fetched", data: result, error: false });
        } else {
          res
            .status(200)
            .json({ message: "Not found", data: [], error: false });
        }
      });
    } catch (err) {
      console.log(err);
      res.status(200).json({ message: "Server  error", data: {}, error: true });
    }
  },

  getdepartment: async function (req, res) {
    const team_id = req?.body?.team_id;

    //get current user
    var sql = "select * from mst_department";

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

  // getHOD: async function (req, res) {
  //   const department_id = req?.params?.selectedDeptId;
  //   console.log(" req?.body==>", department_id);

  //   //get current user
  //   var sql =
  //     "select ud.id,u.first_name,u.last_name,ud.user_id,ud.department_id  from user_department_post as ud  left join users as u  on u.id = ud.user_id  where ud.department_id = " +
  //     department_id +
  //     " and  u.active = 1";

  //   db.query(sql, function (err, result) {
  //     if (err) {
  //       var data = { error: true, message: err.sqlMessage, data: {} };
  //       res.status(201).send(data);
  //     } else {
  //       if (result.length > 0) {
  //         var data = {
  //           error: false,
  //           message: "Recoard fetched successfully",
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
  getHOD: async function (req, res) {
    const department_id = req?.params?.selectedDeptId;
    console.log(" req?.body==>", department_id);

    let hod_id = null;
    switch (department_id) {
      case "1":
        hod_id = 8;
        break;
      case "2":
        hod_id = 16;
        break;
      case "3":
        hod_id = 19;
        break;
    }

    if (hod_id !== null) {
      //get current user
      var sql =
        "select ud.id,u.first_name,u.last_name,ud.user_id,ud.department_id  from user_department_post as ud  left join users as u  on u.id = ud.user_id  where ud.department_id = " +
        department_id +
        " and ud.user_id = " +
        hod_id +
        " and  u.active = 1";
      // console.log("SQL Query:", sql);

      db.query(sql, function (err, result) {
        if (err) {
          var data = { error: true, message: err.sqlMessage, data: {} };
          res.status(201).send(data);
        } else {
          if (result.length > 0) {
            var data = {
              error: false,
              message: "Record fetched successfully",
              data: result,
            };
            res.status(201).send(data);
          } else {
            var data = { error: false, message: "Not found", data: [] };
            res.status(201).json(data);
          }
        }
      });
    } else {
      var data = { error: false, message: "Invalid department ID", data: [] };
      res.status(201).json(data);
    }
  },

  getDpartmentempoloyee: async function (req, res) {
    const department_id = req?.params?.selectedDeptId;
    console.log(" req?.body==>", department_id);

    //get current user
    var sql =
      "SELECT `u`.`id`,`u`.`first_name`,`u`.`last_name`,`u`.`email`,`u`.`username`,`u`.`phone`,`u`.`profile_picture`,`u`.`created_at`,`u`.`active` FROM `users` as u LEFT JOIN `users_groups` as `mu` ON `mu`.`mst_user_id`=`u`.`id` LEFT JOIN `mst_groups` as `mg` ON `mg`.`id`=`mu`.`mst_group_id` Left join `user_department_post` as `ud` on `ud`.`user_id` = `u`.`id` WHERE `u`.`isdeleted`=0 AND `mg`.`name`='Employees' and `ud`.`department_id`= " +
      department_id +
      " and  u.active = 1";

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

  getDepartmentTeam: (req, res) => {
    try {
      const id = req?.user.id ? parseInt(req?.user?.id) : undefined;
      let department_id;
      switch (id) {
        case 8:
          department_id = 1;
          break;
        case 16:
          department_id = 2;
          break;
        case 19:
          department_id = 3;
          break;
        default:
          department_id = id; // Assuming id maps directly to department_id if it's not 8, 16, or 19
          break;
      }

      var sql =
        "SELECT `t`.`id`,`t`.`todo_status`,`t`.`remainder`,`t`.`title`,`t`.`description`,`t`.`created_at`,`t`.`team_id`,`u`.`first_name`,`u`.`last_name`,concat(`u`.`first_name`,' ',`u`.`last_name`) as `team_fullname`, `uhod`.`first_name` AS `hod_first_name`,  `uhod`.`last_name` AS `hod_last_name`,    CONCAT(`uhod`.`first_name`, ' ', `uhod`.`last_name`) AS`hod_name`,`t`.`mst_file_id`,`mf`.`office_file_no`,`mf`.`file_name`,`t`.`remarks`,`t`.`execution_date`,`t`.`completed_date`,`t`.`extended_date`,`t`.`actual_completed_date`,`t`.`reason`,`t`.`work_done`,`t`.`department_id`,`t`.`work_pending`,`t`.`is_deleted`,`t`.`is_approved`,`t`.`approved_date`,`t`.`card`,`t`.`mark_as_done` FROM `todos` as `t` LEFT JOIN `users` as `u` on `u`.`id`=`t`.`team_id` LEFT JOIN `mst_file` as `mf` ON `t`.`mst_file_id`=`mf`.`id` LEFT JOIN `user_department_post` AS `udp` ON `udp`.`id` = `t`.`hod_id` LEFT JOIN  `users` AS `uhod` ON `uhod`.`id` = `udp`.`user_id` WHERE `t`.`is_deleted`=0 and `t`.`department_id`=" +
        department_id +
        "";
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
};
