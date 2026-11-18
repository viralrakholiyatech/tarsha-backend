var mdl_common = require("./../../models/mdl_common");
var asyncLoop = require("node-async-loop");
const {
  getImageWithFoldername,
  unlinkSingleImage,
  unlinkMultipleImages,
} = require("../../services/FileService");
const {
  filter_string,
  isValidJson,
  skipStagesMessage,
} = require("../../services/Utility");
const commonController = require("./commonController");
const notificationController = require("./notificationController");
const messageController = require("./messageController");
const {
  sendEmail,
  fileStageEmailTemplate,
} = require("../../services/MailService");
const { frontEndUrl } = require("../../helpers/constants");
const { closePath } = require("pdfkit");
const table_name = "file";
module.exports = {
  getRoleName: () => {
    return {
      ADMIN: "admin",
      TEAM: "Employees",
      REGISTERED: "Registered",
      CLIENT: "Client",
    };
  },
  // add: async function (req, res) {
  //   const filePath = req?.file ? getImageWithFoldername(req.file.path) : "";

  //   const this_data = JSON.parse(JSON.stringify(req.body));
  //   var user_id = req?.user?.id ? req?.user?.id : 0;

  //   req.assert("office_file_no", "Office file no. is required").notEmpty();
  //   req.assert("client_name", "Client name is required").notEmpty();
  //   req.assert("file_name", "File name is required").notEmpty();
  //   req.assert("file_type", "File type is required").notEmpty();
  //   req.assert("code", "Code is required").notEmpty();
  //   req.assert("Category", "Category is required").notEmpty();
  //   req.assert("BUC", "BUC is required").notEmpty();
  //   req.assert("Status", "Status is required").notEmpty();
  //   req.assert("Process", "Process is required").notEmpty();
  //   req.assert("Show_in_Expense", "Show_in_Expense is required").notEmpty();
  //   req.assert("Show_in_Todo", "Show_in_Todo is required").notEmpty();

  //   var errors = req.validationErrors();

  //   if (errors) {
  //     /*If there is some error image will not be uploaded.*/
  //     unlinkSingleImage(filePath);
  //     var data = {
  //       error: true,
  //       field: errors[0].param,
  //       message: errors[0].msg,
  //       data: new Object(),
  //     };
  //     res.status(201).send(data);
  //   } else {
  //     let file_data = {
  //       office_file_no: this_data.office_file_no,
  //       cus_id: parseInt(this_data.client_name),
  //       file_name: this_data.file_name,
  //       file_type: parseInt(this_data.file_type),
  //       code: this_data.code,
  //       dates: !this_data.dates ? getCurrentDateAndTime() : this_data.dates,
  //       images: typeof filePath !== "undefined" || !filePath ? filePath : "",
  //       category: this_data.Category,
  //       buc: this_data.BUC,
  //       status: this_data.Status,
  //       process: this_data.Process,
  //       show_exp: this_data.Show_in_Expense,
  //       show_todo: this_data.Show_in_Todo,
  //       comp_id:
  //         this_data.comp_id === "undefined" || !this_data.comp_id ? 1 : "",
  //       team_id:
  //         parseInt(this_data?.team_id) != NaN
  //           ? parseInt(this_data?.team_id)
  //           : null,
  //       isdeleted: 0,
  //       created_by: user_id,
  //       created_at: getCurrentDateAndTime(),
  //       updated_at: null,
  //       updated_by: null,
  //     };

  //     db.query("INSERT INTO `mst_file` SET ?", file_data, (err, result) => {
  //       if (err) {
  //         /*If there is some error image will not be uploaded.*/
  //         unlinkSingleImage(file_data.images);
  //         console.log(err);
  //         var data = {
  //           error: true,
  //           message: "Unable to insert the record",
  //           data: new Object(),
  //         };
  //         res.status(201).send(data);
  //       } else {
  //         /*Sending notification*/
  //         notificationController.setNotification(
  //         	JSON.stringify({message:`${file_data?.file_name} added by`,
  //         	action:"New File created",mst_file_id:result?.insertId}),

  //         	parseInt(file_data.cus_id),
  //         	file_data.created_by,
  //         	result?.insertId,
  //         	parseInt(file_data.cus_id),
  //           table_name
  //         );

  //         var data = {
  //           error: false,
  //           message: "File has been added",
  //           data: file_data,
  //         };
  //         res.status(201).send(data);
  //       }
  //     });
  //   }
  // },
  add: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    console.log("this_data==>", this_data);
    const hodValue = Array.isArray(this_data.hod)
      ? this_data.hod.join(", ")
      : this_data.hod;

    const project = {
      cus_id: this_data.client_id,
      category: this_data.category_id,
      dates: this_data.project_date,
      file_name: this_data.file_name,
      project_name: this_data.project_name,
      file_type: this_data.approval_place,
      code: this_data.file_type,
      process: this_data.process,
      land_detail: this_data.land_detail,
      hod: this_data.hod,
      departments: this_data.departments.join(", "),
      team_id:
        parseInt(this_data?.assign_to) != NaN
          ? parseInt(this_data?.assign_to)
          : null,
      comp_id: 1,
      show_exp: this_data.show_in_expense === "Yes" ? 1 : 0,
      show_todo: this_data.show_in_todo === "Yes" ? 1 : 0,
      isdeleted: 0,
      created_by: user_id,
      created_at: getCurrentDateAndTime(),
      updated_at: null,
      updated_by: null,
    };
    console.log("project==>", project);

    db.query("INSERT INTO mst_file SET ?", project, function (err, result) {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }
      /*Sending notification*/
      notificationController.setNotification(
        JSON.stringify({
          message: `${project?.file_name} added by`,
          action: "New File created",
          mst_file_id: result?.insertId,
        }),

        parseInt(project.cus_id),
        project.created_by,
        result?.insertId,
        parseInt(project.cus_id),
        table_name
      );
      // If insertion is successful, you can send a success response here
      const data = {
        error: false,
        message: "Project Details has been added successfully.",
        data: {
          id: result.insertId,
          // Include any other relevant data you want to send
        },
      };
      res.status(201).json(data);
    });
  },
  getFile: async function (req, res) {
    const team_id = req?.body?.team_id;
    const id = req?.body?.id;
    var where = " `mf`.`isdeleted`=0";
    // var sql = "SELECT `mf`.*,CONCAT(`u`.`first_name`,' ',`u`.`last_name`) as `cust_name`,`ms`.`title` as `stage_title`,`fd`.`tps_stage` from `mst_file`as `mf` LEFT JOIN `users` as `u` ON `u`.`id`=`mf`.`cus_id` LEFT JOIN `mst_stage` as `ms` ON `ms`.`id`=`mf`.`mst_stage_id` LEFT JOIN `users_groups` as `ug` ON `ug`.`mst_user_id`=`u`.`id` LEFT JOIN `mst_groups` as `mg` ON `mg`.`id`=`ug`.`mst_group_id` LEFT JOIN `file_details` as `fd` on `fd`.`mst_file_id`=`mf`.`id`  WHERE `mg`.`name`='Client' and `mf`.`isdeleted`=0";
    if (id) {
      where += " and `mf`.`id`=" + id;
    }

    if (team_id) {
      where += " and `mf`.`team_id`=" + team_id;
    }

    var sql =
      "SELECT `mf`.*,CONCAT(`u`.`first_name`,' ',`u`.`last_name`) as `cust_name`,CONCAT(`u2`.`first_name`,' ',`u2`.`last_name`) as `team`,`mf`.`team_id`,`ms`.`title` as `stage_title`,`fd`.`tps_stage` from `mst_file`as `mf` LEFT JOIN `users` as `u` ON `u`.`id`=`mf`.`cus_id` LEFT JOIN `users` as `u2` ON `u2`.`id`=`mf`.`team_id` LEFT JOIN `mst_stage` as `ms` ON `ms`.`id`=`mf`.`mst_stage_id` LEFT JOIN `users_groups` as `ug` ON `ug`.`mst_user_id`=`u`.`id` LEFT JOIN `mst_groups` as `mg` ON `mg`.`id`=`ug`.`mst_group_id` LEFT JOIN `file_details` as `fd` on `fd`.`mst_file_id`=`mf`.`id` WHERE " +
      where;

    db.query(sql, function (err, result) {
      if (err) {
        res
          .status(201)
          .send({ error: true, message: err.sqlMessage, data: {} });
      } else {
        if (result.length > 0) {
          res
            .status(201)
            .send({ error: false, message: "Record fetched", data: result });
        } else {
          res
            .status(201)
            .send({ error: false, message: "Not found", data: [] });
        }
      }
    });
  },

  getFileByTeamId: (req, res) => {
    try {
      const userId = req?.user?.id;

      if (parseInt(userId) != NaN) {
        var sql =
          "SELECT `mf`.*,CONCAT(`u`.`first_name`,' ',`u`.`last_name`) as `cust_name`,CONCAT(`u2`.`first_name`,' ',`u2`.`last_name`) as `team`,`mf`.`team_id`,`ms`.`title` as `stage_title`,`fd`.`tps_stage` from `mst_file`as `mf` LEFT JOIN `users` as `u` ON `u`.`id`=`mf`.`cus_id` LEFT JOIN `users` as `u2` ON `u2`.`id`=`mf`.`team_id` LEFT JOIN `mst_stage` as `ms` ON `ms`.`id`=`mf`.`mst_stage_id` LEFT JOIN `users_groups` as `ug` ON `ug`.`mst_user_id`=`u`.`id` LEFT JOIN `mst_groups` as `mg` ON `mg`.`id`=`ug`.`mst_group_id` LEFT JOIN `file_details` as `fd` on `fd`.`mst_file_id`=`mf`.`id` WHERE `mf`.`isdeleted`=0 and `mf`.`team_id`=" +
          userId +
          "";
        //var sql = "SELECT `mf`.*,CONCAT(`u`.`first_name`,' ',`u`.`last_name`) as `cust_name`,CONCAT(`u2`.`first_name`,' ',`u2`.`last_name`) as `team`,`mf`.`team_id`,`ms`.`title` as `stage_title`,`fd`.`tps_stage` from `mst_file`as `mf` LEFT JOIN `users` as `u` ON `u`.`id`=`mf`.`cus_id` LEFT JOIN `users` as `u2` ON `u2`.`id`=`mf`.`team_id` LEFT JOIN `mst_stage` as `ms` ON `ms`.`id`=`mf`.`mst_stage_id` LEFT JOIN `users_groups` as `ug` ON `ug`.`mst_user_id`=`u`.`id` LEFT JOIN `mst_groups` as `mg` ON `mg`.`id`=`ug`.`mst_group_id` LEFT JOIN `file_details` as `fd` on `fd`.`mst_file_id`=`mf`.`id` WHERE `mf`.`isdeleted`=0";
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
  getAllFilesByTeamId: (req, res) => {
    try {
      const userId = req.params?.id;

      if (parseInt(userId) != NaN) {
        var sql =
          "SELECT `mf`.*,CONCAT(`u`.`first_name`,' ',`u`.`last_name`) as `cust_name`,CONCAT(`u2`.`first_name`,' ',`u2`.`last_name`) as `team`,`mf`.`team_id`,`ms`.`title` as `stage_title`,`fd`.`tps_stage` from `mst_file`as `mf` LEFT JOIN `users` as `u` ON `u`.`id`=`mf`.`cus_id` LEFT JOIN `users` as `u2` ON `u2`.`id`=`mf`.`team_id` LEFT JOIN `mst_stage` as `ms` ON `ms`.`id`=`mf`.`mst_stage_id` LEFT JOIN `users_groups` as `ug` ON `ug`.`mst_user_id`=`u`.`id` LEFT JOIN `mst_groups` as `mg` ON `mg`.`id`=`ug`.`mst_group_id` LEFT JOIN `file_details` as `fd` on `fd`.`mst_file_id`=`mf`.`id` WHERE `mf`.`isdeleted`=0 and `mf`.`team_id`=" +
          userId +
          "";
        //var sql = "SELECT `mf`.*,CONCAT(`u`.`first_name`,' ',`u`.`last_name`) as `cust_name`,CONCAT(`u2`.`first_name`,' ',`u2`.`last_name`) as `team`,`mf`.`team_id`,`ms`.`title` as `stage_title`,`fd`.`tps_stage` from `mst_file`as `mf` LEFT JOIN `users` as `u` ON `u`.`id`=`mf`.`cus_id` LEFT JOIN `users` as `u2` ON `u2`.`id`=`mf`.`team_id` LEFT JOIN `mst_stage` as `ms` ON `ms`.`id`=`mf`.`mst_stage_id` LEFT JOIN `users_groups` as `ug` ON `ug`.`mst_user_id`=`u`.`id` LEFT JOIN `mst_groups` as `mg` ON `mg`.`id`=`ug`.`mst_group_id` LEFT JOIN `file_details` as `fd` on `fd`.`mst_file_id`=`mf`.`id` WHERE `mf`.`isdeleted`=0";
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
  getFileOfOnline: async function (req, res) {
    try {
      var sql =
        "SELECT `mf`.*,`fd`.`office_file_no` as `office_no`,`fd`.`google_location`,`mfc`.`title` as `code_title`,CONCAT(`u`.`first_name`,' ',`u`.`last_name`) as `cust_name`,`mt`.`type_name` as `file_type_name`,CONCAT(`u2`.`first_name`,' ',`u2`.`last_name`) as `team`,`mf`.`team_id`,`ms`.`title` as `stage_title`,`fd`.`tps_stage`, (SELECT COUNT(*) FROM `site_inspection` WHERE `mst_file_project_id` = `mf`.`id`) AS `project_count` from `mst_file`as `mf` LEFT JOIN `users` as `u` ON `u`.`id`=`mf`.`cus_id` LEFT JOIN `users` as `u2` ON `u2`.`id`=`mf`.`team_id` LEFT JOIN `mst_stage` as `ms` ON `ms`.`id`=`mf`.`mst_stage_id` LEFT JOIN `users_groups` as `ug` ON `ug`.`mst_user_id`=`u`.`id` LEFT JOIN `mst_groups` as `mg` ON `mg`.`id`=`ug`.`mst_group_id` LEFT JOIN `file_details` as `fd` on `fd`.`mst_file_id`=`mf`.`id` LEFT JOIN `status_file` as `sf` ON `sf`.`id`=`mf`.`process`   LEFT JOIN `mst_type` as `mt` on `mt`.`id` = `mf`.`file_type`  LEFT JOIN `mst_file_code`as `mfc` ON `mfc`.`id`=`mf`.`code` WHERE `mf`.`isdeleted`=0 and `sf`.`status_file_name`='Online' ORDER BY `mf`.`id` DESC";

      db.query(sql, function (err, result) {
        if (err) {
          res
            .status(201)
            .send({ error: true, message: err.sqlMessage, data: {} });
        } else {
          if (result.length > 0) {
            res
              .status(201)
              .send({ error: false, message: "Record fetched", data: result });
          } else {
            res
              .status(201)
              .send({ error: false, message: "Not found", data: [] });
          }
        }
      });
    } catch (err) {
      res
        .status(200)
        .json({ message: "Invalid request", error: true, data: {} });
    }
  },
  getFileOfOnlineForTeam: async function (req, res) {
    try {
      var sql =
        "SELECT `mf`.*,`mfc`.`title` as `code_title`,CONCAT(`u`.`first_name`,' ',`u`.`last_name`) as `cust_name`,CONCAT(`u2`.`first_name`,' ',`u2`.`last_name`) as `team`,`mf`.`team_id`,`ms`.`title` as `stage_title`,`fd`.`tps_stage` from `mst_file`as `mf` LEFT JOIN `users` as `u` ON `u`.`id`=`mf`.`cus_id` LEFT JOIN `users` as `u2` ON `u2`.`id`=`mf`.`team_id` LEFT JOIN `mst_stage` as `ms` ON `ms`.`id`=`mf`.`mst_stage_id` LEFT JOIN `users_groups` as `ug` ON `ug`.`mst_user_id`=`u`.`id` LEFT JOIN `mst_groups` as `mg` ON `mg`.`id`=`ug`.`mst_group_id` LEFT JOIN `file_details` as `fd` on `fd`.`mst_file_id`=`mf`.`id` LEFT JOIN `status_file` as `sf` ON `sf`.`id`=`mf`.`process` LEFT JOIN `mst_file_code`as `mfc` ON `mfc`.`id`=`mf`.`code` WHERE `mf`.`isdeleted`=0 and `sf`.`status_file_name`='Online' and `mf`.`team_id`=" +
        req.user?.id +
        "";
      db.query(sql, function (err, result) {
        if (err) {
          res
            .status(201)
            .send({ error: true, message: err.sqlMessage, data: {} });
        } else {
          if (result.length > 0) {
            res
              .status(201)
              .send({ error: false, message: "Record fetched", data: result });
          } else {
            res
              .status(201)
              .send({ error: false, message: "Not found", data: [] });
          }
        }
      });
    } catch (err) {
      res
        .status(200)
        .json({ message: "Invalid request", error: true, data: {} });
    }
  },
  getFileOfOffline: async function (req, res) {
    try {
      var sql =
        "SELECT `mf`.*,`mfc`.`title` as `code_title`,CONCAT(`u`.`first_name`,' ',`u`.`last_name`) as `cust_name`,CONCAT(`u2`.`first_name`,' ',`u2`.`last_name`) as `team`,`mf`.`team_id`,`ms`.`title` as `stage_title`,`fd`.`tps_stage`,(SELECT COUNT(*) FROM `site_inspection` WHERE `mst_file_project_id` = `mf`.`id`) AS `project_count` from `mst_file`as `mf` LEFT JOIN `users` as `u` ON `u`.`id`=`mf`.`cus_id` LEFT JOIN `users` as `u2` ON `u2`.`id`=`mf`.`team_id` LEFT JOIN `mst_stage` as `ms` ON `ms`.`id`=`mf`.`mst_stage_id` LEFT JOIN `users_groups` as `ug` ON `ug`.`mst_user_id`=`u`.`id` LEFT JOIN `mst_groups` as `mg` ON `mg`.`id`=`ug`.`mst_group_id` LEFT JOIN `file_details` as `fd` on `fd`.`mst_file_id`=`mf`.`id` LEFT JOIN `status_file` as `sf` ON `sf`.`id`=`mf`.`process` LEFT JOIN `mst_file_code` as `mfc` ON `mfc`.`id`=`mf`.`code`  WHERE `mf`.`isdeleted`=0  and `sf`.`status_file_name`='Offline'";

      db.query(sql, function (err, result) {
        if (err) {
          res
            .status(201)
            .send({ error: true, message: err.sqlMessage, data: {} });
        } else {
          if (result.length > 0) {
            res
              .status(201)
              .send({ error: false, message: "Record fetched", data: result });
          } else {
            res
              .status(201)
              .send({ error: false, message: "Not found", data: [] });
          }
        }
      });
    } catch (err) {
      res
        .status(200)
        .json({ message: "Invalid request", error: true, data: {} });
    }
  },
  getFileOfOfflineForTeam: (req, res) => {
    try {
      var sql =
        "SELECT `mf`.*,`mfc`.`title` as `code_title`,CONCAT(`u`.`first_name`,' ',`u`.`last_name`) as `cust_name`,CONCAT(`u2`.`first_name`,' ',`u2`.`last_name`) as `team`,`mf`.`team_id`,`ms`.`title` as `stage_title`,`fd`.`tps_stage` from `mst_file`as `mf` LEFT JOIN `users` as `u` ON `u`.`id`=`mf`.`cus_id` LEFT JOIN `users` as `u2` ON `u2`.`id`=`mf`.`team_id` LEFT JOIN `mst_stage` as `ms` ON `ms`.`id`=`mf`.`mst_stage_id` LEFT JOIN `users_groups` as `ug` ON `ug`.`mst_user_id`=`u`.`id` LEFT JOIN `mst_groups` as `mg` ON `mg`.`id`=`ug`.`mst_group_id` LEFT JOIN `file_details` as `fd` on `fd`.`mst_file_id`=`mf`.`id` LEFT JOIN `status_file` as `sf` ON `sf`.`id`=`mf`.`process` LEFT JOIN `mst_file_code` as `mfc` ON `mfc`.`id`=`mf`.`code` WHERE `mf`.`isdeleted`=0 and `sf`.`status_file_name`='Offline' and `mf`.`status`=7 and `mf`.`team_id`=" +
        req.user?.id +
        "";

      db.query(sql, function (err, result) {
        if (err) {
          res
            .status(201)
            .send({ error: true, message: err.sqlMessage, data: {} });
        } else {
          if (result.length > 0) {
            res
              .status(201)
              .send({ error: false, message: "Record fetched", data: result });
          } else {
            res
              .status(201)
              .send({ error: false, message: "Not found", data: [] });
          }
        }
      });
    } catch (err) {
      res.status(200).json({ message: "Server Error", error: true, data: {} });
    }
  },
  getFileOfBUC: async function (req, res) {
    try {
      var sql =
        "SELECT `mf`.*,`mfc`.`title` as `code_title`,CONCAT(`u`.`first_name`,' ',`u`.`last_name`) as `cust_name`,CONCAT(`u2`.`first_name`,' ',`u2`.`last_name`) as `team`,`mf`.`team_id`,`ms`.`title` as `stage_title`,`fd`.`tps_stage`, (SELECT COUNT(*) FROM `site_inspection` WHERE `mst_file_project_id` = `mf`.`id`) AS `project_count`from `mst_file`as `mf` LEFT JOIN `users` as `u` ON `u`.`id`=`mf`.`cus_id` LEFT JOIN `users` as `u2` ON `u2`.`id`=`mf`.`team_id` LEFT JOIN `mst_stage` as `ms` ON `ms`.`id`=`mf`.`mst_stage_id` LEFT JOIN `users_groups` as `ug` ON `ug`.`mst_user_id`=`u`.`id` LEFT JOIN `mst_groups` as `mg` ON `mg`.`id`=`ug`.`mst_group_id` LEFT JOIN `file_details` as `fd` on `fd`.`mst_file_id`=`mf`.`id` LEFT JOIN `status_file` as `sf` ON `sf`.`id`=`mf`.`buc` LEFT JOIN `mst_file_code` as `mfc` ON `mfc`.`id`=`mf`.`code` WHERE `mf`.`isdeleted`=0 and `sf`.`status_file_name`='Yes'";

      db.query(sql, function (err, result) {
        if (err) {
          console.log(err);
          res
            .status(201)
            .send({ error: true, message: err.sqlMessage, data: {} });
        } else {
          if (result.length > 0) {
            res
              .status(201)
              .send({ error: false, message: "Record fetched", data: result });
          } else {
            res
              .status(201)
              .send({ error: false, message: "Not found", data: [] });
          }
        }
      });
    } catch (err) {
      res
        .status(200)
        .json({ message: "Invalid request", error: true, data: {} });
    }
  },
  getFileOfBUCForTeam: async function (req, res) {
    try {
      var sql =
        "SELECT `mf`.*,`mfc`.`title` as `code_title`,CONCAT(`u`.`first_name`,' ',`u`.`last_name`) as `cust_name`,CONCAT(`u2`.`first_name`,' ',`u2`.`last_name`) as `team`,`mf`.`team_id`,`ms`.`title` as `stage_title`,`fd`.`tps_stage` from `mst_file`as `mf` LEFT JOIN `users` as `u` ON `u`.`id`=`mf`.`cus_id` LEFT JOIN `users` as `u2` ON `u2`.`id`=`mf`.`team_id` LEFT JOIN `mst_stage` as `ms` ON `ms`.`id`=`mf`.`mst_stage_id` LEFT JOIN `users_groups` as `ug` ON `ug`.`mst_user_id`=`u`.`id` LEFT JOIN `mst_groups` as `mg` ON `mg`.`id`=`ug`.`mst_group_id` LEFT JOIN `file_details` as `fd` on `fd`.`mst_file_id`=`mf`.`id` LEFT JOIN `status_file` as `sf` ON `sf`.`id`=`mf`.`buc` LEFT JOIN `mst_file_code` as `mfc` ON `mfc`.`id`=`mf`.`code` WHERE `mf`.`isdeleted`=0 and `sf`.`status_file_name`='Yes' and `mf`.`team_id`=" +
        req.user?.id +
        "";

      db.query(sql, function (err, result) {
        if (err) {
          res
            .status(201)
            .send({ error: true, message: err.sqlMessage, data: {} });
        } else {
          if (result.length > 0) {
            res
              .status(201)
              .send({ error: false, message: "Record fetched", data: result });
          } else {
            res
              .status(201)
              .send({ error: false, message: "Not found", data: [] });
          }
        }
      });
    } catch (err) {
      res
        .status(200)
        .json({ message: "Invalid request", error: true, data: {} });
    }
  },
  getFileOfApproved: async function (req, res) {
    try {
      var sql =
        "SELECT `mf`.*,`mfc`.`title` as `code_title`,CONCAT(`u`.`first_name`,' ',`u`.`last_name`) as `cust_name`,CONCAT(`u2`.`first_name`,' ',`u2`.`last_name`) as `team`,`mf`.`team_id`,`ms`.`title` as `stage_title`,`fd`.`tps_stage`,(SELECT COUNT(*) FROM `site_inspection` WHERE `mst_file_project_id` = `mf`.`id`) AS `project_count` from `mst_file`as `mf` LEFT JOIN `users` as `u` ON `u`.`id`=`mf`.`cus_id` LEFT JOIN `users` as `u2` ON `u2`.`id`=`mf`.`team_id` LEFT JOIN `mst_stage` as `ms` ON `ms`.`id`=`mf`.`mst_stage_id` LEFT JOIN `users_groups` as `ug` ON `ug`.`mst_user_id`=`u`.`id` LEFT JOIN `mst_groups` as `mg` ON `mg`.`id`=`ug`.`mst_group_id` LEFT JOIN `file_details` as `fd` on `fd`.`mst_file_id`=`mf`.`id` LEFT JOIN `status_file` as `sf` ON `sf`.`id`=`mf`.`status` LEFT JOIN `mst_file_code` as `mfc` ON `mfc`.`id`=`mf`.`code`  WHERE `mf`.`isdeleted`=0 and `sf`.`status_file_name`='Approved'";

      db.query(sql, function (err, result) {
        if (err) {
          res
            .status(201)
            .send({ error: true, message: err.sqlMessage, data: {} });
        } else {
          if (result.length > 0) {
            res
              .status(201)
              .send({ error: false, message: "Record fetched", data: result });
          } else {
            res
              .status(201)
              .send({ error: false, message: "Not found", data: [] });
          }
        }
      });
    } catch (err) {
      res
        .status(200)
        .json({ message: "Invalid request", error: true, data: {} });
    }
  },
  getFileOfApprovedForTeam: async function (req, res) {
    try {
      var sql =
        "SELECT `mf`.*,`mfc`.`title` as `code_title`,CONCAT(`u`.`first_name`,' ',`u`.`last_name`) as `cust_name`,CONCAT(`u2`.`first_name`,' ',`u2`.`last_name`) as `team`,`mf`.`team_id`,`ms`.`title` as `stage_title`,`fd`.`tps_stage` from `mst_file`as `mf` LEFT JOIN `users` as `u` ON `u`.`id`=`mf`.`cus_id` LEFT JOIN `users` as `u2` ON `u2`.`id`=`mf`.`team_id` LEFT JOIN `mst_stage` as `ms` ON `ms`.`id`=`mf`.`mst_stage_id` LEFT JOIN `users_groups` as `ug` ON `ug`.`mst_user_id`=`u`.`id` LEFT JOIN `mst_groups` as `mg` ON `mg`.`id`=`ug`.`mst_group_id` LEFT JOIN `file_details` as `fd` on `fd`.`mst_file_id`=`mf`.`id` LEFT JOIN `status_file` as `sf` ON `sf`.`id`=`mf`.`status` LEFT JOIN `mst_file_code` as `mfc` ON `mfc`.`id`=`mf`.`code` WHERE `mf`.`isdeleted`=0 and `sf`.`status_file_name`='Approved' and `mf`.`team_id`=" +
        req.user?.id +
        "";

      db.query(sql, function (err, result) {
        if (err) {
          res
            .status(201)
            .send({ error: true, message: err.sqlMessage, data: {} });
        } else {
          if (result.length > 0) {
            res
              .status(201)
              .send({ error: false, message: "Record fetched", data: result });
          } else {
            res
              .status(201)
              .send({ error: false, message: "Not found", data: [] });
          }
        }
      });
    } catch (err) {
      res
        .status(200)
        .json({ message: "Invalid request", error: true, data: {} });
    }
  },
  getFileOfReject: async function (req, res) {
    try {
      var sql =
        "SELECT `mf`.*,`mfc`.`title` as `code_title`,CONCAT(`u`.`first_name`,' ',`u`.`last_name`) as `cust_name`,CONCAT(`u2`.`first_name`,' ',`u2`.`last_name`) as `team`,`mf`.`team_id`,`ms`.`title` as `stage_title`,`fd`.`tps_stage` from `mst_file`as `mf` LEFT JOIN `users` as `u` ON `u`.`id`=`mf`.`cus_id` LEFT JOIN `users` as `u2` ON `u2`.`id`=`mf`.`team_id` LEFT JOIN `mst_stage` as `ms` ON `ms`.`id`=`mf`.`mst_stage_id` LEFT JOIN `users_groups` as `ug` ON `ug`.`mst_user_id`=`u`.`id` LEFT JOIN `mst_groups` as `mg` ON `mg`.`id`=`ug`.`mst_group_id` LEFT JOIN `file_details` as `fd` on `fd`.`mst_file_id`=`mf`.`id` LEFT JOIN `status_file` as `sf` ON `sf`.`id`=`mf`.`status` LEFT JOIN `mst_file_code` as `mfc` ON `mfc`.`id`=`mf`.`code` WHERE `mf`.`isdeleted`=0 and `sf`.`status_file_name`='Reject'";

      db.query(sql, function (err, result) {
        if (err) {
          res
            .status(201)
            .send({ error: true, message: err.sqlMessage, data: {} });
        } else {
          if (result.length > 0) {
            res
              .status(201)
              .send({ error: false, message: "Record fetched", data: result });
          } else {
            res
              .status(201)
              .send({ error: false, message: "Not found", data: [] });
          }
        }
      });
    } catch (err) {
      res
        .status(200)
        .json({ message: "Invalid request", error: true, data: {} });
    }
  },
  getFileOfRejectForTeam: async function (req, res) {
    try {
      var sql =
        "SELECT `mf`.*,`mfc`.`title` as `code_title`,CONCAT(`u`.`first_name`,' ',`u`.`last_name`) as `cust_name`,CONCAT(`u2`.`first_name`,' ',`u2`.`last_name`) as `team`,`mf`.`team_id`,`ms`.`title` as `stage_title`,`fd`.`tps_stage` from `mst_file`as `mf` LEFT JOIN `users` as `u` ON `u`.`id`=`mf`.`cus_id` LEFT JOIN `users` as `u2` ON `u2`.`id`=`mf`.`team_id` LEFT JOIN `mst_stage` as `ms` ON `ms`.`id`=`mf`.`mst_stage_id` LEFT JOIN `users_groups` as `ug` ON `ug`.`mst_user_id`=`u`.`id` LEFT JOIN `mst_groups` as `mg` ON `mg`.`id`=`ug`.`mst_group_id` LEFT JOIN `file_details` as `fd` on `fd`.`mst_file_id`=`mf`.`id` LEFT JOIN `status_file` as `sf` ON `sf`.`id`=`mf`.`status` LEFT JOIN `mst_file_code` as `mfc` ON `mfc`.`id`=`mf`.`code` WHERE `mf`.`isdeleted`=0 and `sf`.`status_file_name`='Reject' and `mf`.`team_id`=" +
        req.user?.id +
        "";

      db.query(sql, function (err, result) {
        if (err) {
          res
            .status(201)
            .send({ error: true, message: err.sqlMessage, data: {} });
        } else {
          if (result.length > 0) {
            res
              .status(201)
              .send({ error: false, message: "Record fetched", data: result });
          } else {
            res
              .status(201)
              .send({ error: false, message: "Not found", data: [] });
          }
        }
      });
    } catch (err) {
      res
        .status(200)
        .json({ message: "Invalid request", error: true, data: {} });
    }
  },
  getFileById: async (req, res) => {
    var user_id = req.user?.id;
    var id = parseInt(req.params.id);

    // var sql = "SELECT `office_file_no`,`cus_id`,`file_name`,`file_type`,`code`,`dates`,`images`,`category`,`buc`,`status`,`process`,`show_exp`,`show_todo`,`mst_stage_id`,`team_id` FROM `mst_file` where `id`=" + id + "";

    var sql =
      "SELECT `mf`.`office_file_no`,`mf`.`cus_id`,CONCAT(`u`.`first_name`,' ',`u`.`last_name`) as `hod_name`,`mf`.`project_name`,`mf`.`land_detail`,`mf`.`departments`,`mf`.`hod`,`mf`.`file_name`,`mf`.`file_type`,`mf`.`code`,`mf`.`dates`,`mf`.`images`,`mf`.`category`,`mf`.`buc`,`mf`.`status`,`mf`.`process`,`sf`.`status_file_name`,`mf`.`show_exp`,`mf`.`show_todo`,`mf`.`mst_stage_id`,`mf`.`team_id` FROM `mst_file` as `mf`  LEFT JOIN `users` as `u` ON `u`.`id`=`mf`.`hod` LEFT JOIN `status_file` as `sf` ON `sf`.`id`=`mf`.`process` where `mf`.`id`=" +
      id +
      "";

    db.query(sql, (err, result) => {
      if (err) {
        var data = { error: true, message: err.sqlMessage, data: new Object() };
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
          var data = { error: false, message: "Not found", data: {} };
          res.status(201).send(data);
        }
      }
    });
  },
  
  update: function (req, res) {
    const this_data = JSON.parse(JSON.stringify(req.body));
    const requestData = req.body;
    console.log("Request Body:", requestData);

    var sql =
      "SELECT *from `mst_file ` WHERE `id`=" + parseInt(this_data.id) + "";

    db.query(sql, (err, result) => {
      const user_id = req?.user?.id;
      const id = this_data?.id;

      const Project = {
        cus_id: this_data.cus_id,
        dates: !this_data.dates ? getCurrentDateAndTime() : this_data.dates,
        code: this_data.code,
        project_name: this_data.project_name,
        process: this_data.process,
        file_type: parseInt(this_data.file_type),
        land_detail: this_data.land_detail,
        hod: this_data.hod,
        team_id:
          parseInt(this_data?.team_id) != NaN
            ? parseInt(this_data?.team_id)
            : result[0]?.team_id,
        departments: this_data.departments,
        show_exp: this_data.show_exp,
        show_todo: this_data.show_todo,
        updated_at: getCurrentDateAndTime(),
        updated_by: user_id,
      };
      console.log("ID:", this_data.id); // Just before the db.query call

      console.log("Project===>", Project);
      const updateSql =
        "UPDATE `mst_file` SET " +
        "`cus_id`=" +
        parseInt(Project.cus_id) +
        ", `dates`='" + // Removed parseInt() and added single quotes
        Project.dates +
        "', `code`='" + // Removed parseInt() and added single quotes
        Project.code +
        "', `project_name`='" +
        Project.project_name +
        "'," +
        "`process`='" +
        Project.process +
        "'," +
        "`land_detail`='" +
        Project.land_detail +
        "'," +
        "`hod`='" + // Removed parseInt() and added single quotes
        Project.hod +
        "'," +
        "`departments`='" +
        Project.departments +
        "'," +
        "`show_exp`='" +
        Project.show_exp +
        "'," +
        "`show_todo`='" +
        Project.show_todo +
        "'," +
        "`file_type`='" +
        Project.file_type +
        "'," +
        "`team_id`='" +
        Project.team_id +
        "'," +
        "`updated_at`='" +
        Project.updated_at +
        "'," +
        "`updated_by`=" +
        parseInt(Project.updated_by) +
        " WHERE `id`=" +
        id;

      db.query(updateSql, (err, result) => {
        if (err) {
          const data = { error: true, message: err.sqlMessage, data: {} };
          res.status(500).json(data);
        } else {
          const response = {
            error: false,
            message: "File has been updated...",
            data: {},
          };

          res.status(201).json(response);
        }
      });
    });
  },
  delete: function (req, res) {
    var id = req.body.id;
    req.assert("id", "File Id required.").notEmpty();
    var errors = req.validationErrors();
    if (errors) {
      var data = { error: true, message: errors[0].msg, data: new Object() };
      res.status(201).send(data);
    } else {
      var user_id = req.user?.id;
      //var sql = "UPDATE `mst_file` SET `isdeleted`="+Number(1)+",`updated_at`='"+getCurrentDateAndTime()+"',`updated_by`="+user_id+" WHERE `id`="+id+"";
      var sql = `UPDATE \`mst_file\`  SET  \`isdeleted\`=${Number(1)},\`updated_at\`='${getCurrentDateAndTime()}',\`updated_by\`=${user_id} where \`id\`=${id}`;
      db.query(sql, function (err, result) {
        if (err) {
          var data = {
            error: true,
            message: err.sqlMessage,
            data: new Object(),
          };
          res.status(201).send(data);
        } else {
          var data = {
            error: false,
            message: "File has been deleted successfully.",
            data: new Object(),
          };
          res.status(201).send(data);
        }
      });
    }
  },
  GetJSONDocumentById: (req, res) => {
    const id = req.params.id;
    var sql =
      "SELECT `file_document_json`,`is_save`,`approved_by_hod`,`remark_by_hod`,`remark_by_emp`,`card` from `mst_file` where `id`=" +
      id +
      "";
    db.query(sql, (err, result) => {
      if (err) {
        res
          .status(201)
          .json({ error: true, message: err.sqlMessage, data: {} });
      } else if (result.length) {
        res
          .status(201)
          .json({ error: false, message: "Record fetched", data: result[0] });
      } else {
        res
          .status(201)
          .json({ error: true, mesage: "Record not found...", data: {} });
      }
    });
  },
  CheckJson: function (json_string) {
    try {
      JSON.parse(json_string);
    } catch (err) {
      return false;
    }
    return true;
  },
  changeJsonDocument: async (req, res) => {
    req.assert("id", "id is required").notEmpty();
    req
      .assert("file_document_json", "file_document_json is required")
      .notEmpty();
    req.assert("is_save", "is_save is required").notEmpty();
    var errors = req.validationErrors();

    if (errors) {
      res.status(201).json({ error: true, message: errors[0].msg, data: {} });
    } else if (module.exports.CheckJson(req.body.file_document_json)) {
      res.status(201).json({
        error: true,
        message: "Invalid input of file_document_json",
        data: {},
      });
    } else {
      var jsonData = req.body.file_document_json;
      console.log("req.bodyy===>", req.body);
      var sql =
        "SELECT *from `mst_file` where id=" +
        req.body.id +
        " and file_document_json is null";

      console.log("SQL Query1:", sql);

      const fileDate = new Date(req.body.date);
      console.log("req.body==>",req.body)
      const createdDate = new Date(getCurrentDateAndTime());
      console.log("createdDate-->",createdDate)
      
      // Calculate the difference in milliseconds between the two dates
      const timeDifference = Math.abs(createdDate - fileDate);
      console.log("timeDifference-->",timeDifference)
      
      // Convert the time difference from milliseconds to days
      const differenceInDays = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));
      console.log("differenceInDays-->",differenceInDays)
      
      // Assign red or green card based on the condition
      let cardColor;
      if (differenceInDays <= 2) { 
        // If the difference is 0 or 1 days, give a green card
        cardColor = "green";
      } else if (differenceInDays > 2) {
        // If the difference is greater than 2 days, give a red card
        cardColor = "red";
      } else {
       
        cardColor = "red";
      }
      

      db.query(sql, async (err, result) => {
        if (err) {
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else if (result.length) {
          //insert json

          const arr = [];

          for (const key of Object.keys(jsonData)) {
            arr.push({
              mst_document_id: parseInt(key),
              checked: jsonData[key],
              remark_by_hod: req.body.remark_by_hod,
              remark_by_emp: req.body.remark_by_emp,
              approved_by_hod: req.body.approved_by_hod === "Yes" ? 1 : 0,
              created_by: req.user.id,
              card:cardColor,
              created_at: getCurrentDateAndTime(),
              updated_at: null,
              updated_by: null,
            });
          }
          console.log("Constructed Array:", arr);

          const updatedData = {
            is_save: Number(
              typeof req.body?.is_save !== "undefined" ? req.body?.is_save : 0
            ),
            file_document_json: JSON.stringify(arr),
            remark_by_hod: req.body.remark_by_hod,
            remark_by_emp: req.body.remark_by_emp,
            approved_by_hod: req.body.approved_by_hod === "Yes" ? 1 : 0,
            mst_stage_id: 3,
            card: req.body.card ? req.body.card : cardColor,
            updated_by: req.user.id,
            updated_at: getCurrentDateAndTime(),
          };

          if (updatedData.is_save != 1) {
            delete updatedData.is_save;
            delete updatedData.mst_stage_id;
          }

          console.log("updatedData", updatedData);

          var sql = "UPDATE `mst_file` SET ? WHERE `id`=" + req.body.id + "";
          console.log("SQL Query:", sql);

          db.query(sql, updatedData, async (err, result) => {
            if (err) {
              res
                .status(201)
                .json({ error: true, mesage: err.sqlMessage, data: {} });
            } else {
              if (req.body?.is_save == 1) {
                try {
                  const stage = await commonController.getStageStageId(2);
                  const fileData = await commonController.getMstFileByMstFileId(
                    parseInt(req?.body?.id)
                  );
                  if (fileData.length > 0) {
                    /*Sending Notification*/
                    // notificationController.setNotification
                    // (
                    // 	JSON.stringify({message:`${stage[0]?.title} has been updated on ${fileData[0]?.file_name} by`}),
                    // 	fileData[0]?.cus_id,
                    // 	parseInt(req?.user?.id),
                    // 	parseInt(req?.body?.id),
                    // 	fileData[0]?.cus_id,
                    // );

                    /*Send Email*/
                    await sendEmail({
                      subject: "File stage Updated",
                      html: fileStageEmailTemplate({
                        file_name: fileData[0]?.file_name,
                        from_stage: "Required Document List",
                        to_stage: "Send Message To Client",
                        url: `${frontEndUrl.FileStageRouteUrl}/${req?.body?.id}`,
                      }),
                    });
                  }
                } catch (err) {
                  console.log(err);
                }
              }
              res
                .status(201)
                .json({ error: false, message: "Changes saved", data: arr });
            }
          });
        } else {
          var sql =
            "SELECT `file_document_json` from `mst_file` where `id`=" +
            req.body.id +
            "";

          db.query(sql, (err, result) => {
            if (err) {
              res
                .status(201)
                .json({ error: true, mesage: err.sqlMessage, data: {} });
            } else if (result.length) {
              const oldArray = JSON.parse(result[0].file_document_json);
              const updatedArray = [];

              const allVal = oldArray.map((obj) => {
                return obj["mst_document_id"];
              });

              for (const key of Object.keys(jsonData)) {
                if (allVal.includes(parseInt(key))) {
                  var newObj = oldArray[allVal.indexOf(parseInt(key))];
                  // console.log(newObj);
                  updatedArray.push({
                    ...newObj,
                    ["checked"]: jsonData[newObj["mst_document_id"]],
                    ["updated_by"]: req.user.id,
                    ["updated_at"]: getCurrentDateAndTime(),
                  });
                } else {
                  updatedArray.push({
                    mst_document_id: parseInt(key),
                    checked: jsonData[key],
                    created_by: req.user.id,
                    remark_by_hod: req.body.remark_by_hod,
                    remark_by_emp: req.body.remark_by_emp,
                    approved_by_hod: req.body.approved_by_hod === "Yes" ? 1 : 0,
                    created_at: getCurrentDateAndTime(),
                    card: req.body.card ? req.body.card : cardColor,
                    updated_at: null,
                    updated_by: null,
                  });
                }
              }

              const updatedData = {
                is_save: Number(
                  typeof req.body?.is_save !== "undefined"
                    ? req.body?.is_save
                    : 0
                ),
                remark_by_hod: req.body.remark_by_hod,
                remark_by_emp: req.body.remark_by_emp,
                approved_by_hod: req.body.approved_by_hod === "Yes" ? 1 : 0,
                file_document_json: JSON.stringify(updatedArray),
                mst_stage_id: 3,
                card: req.body.card ? req.body.card : cardColor,
                updated_by: req.user.id,
                updated_at: getCurrentDateAndTime(),
              };

              if (updatedData.is_save != 1) {
                delete updatedData.is_save;
                delete updatedData.mst_stage_id;
              }

              var sql =
                "UPDATE `mst_file` SET ? WHERE `id`=" + req.body.id + "";

              // var sql = "UPDATE `mst_file` SET `is_save`=" + Number((typeof req.body?.is_save !== "undefined") ? req.body?.is_save : 0) + ",`file_document_json`='" + JSON.stringify(updatedArray) + "',`mst_stage_id`=" + mst_stage_id + ",`updated_by`=" + req.user.id + ",`updated_at`='" + getCurrentDateAndTime() + "' WHERE `id`=" + req.body.id + " ";

              db.query(sql, updatedData, async (err, result) => {
                if (err) {
                  res
                    .status(201)
                    .json({ error: true, mesage: err.sqlMessage, data: {} });
                } else {
                  if (req.body?.is_save == 1) {
                    try {
                      const stage = await commonController.getStageStageId(2);
                      const fileData =
                        await commonController.getMstFileByMstFileId(
                          parseInt(req?.body?.id)
                        );
                      if (fileData.length > 0) {
                        /*Sending Notification*/
                        // notificationController.setNotification
                        // (
                        // 	JSON.stringify({message:`${stage[0]?.title} has been updated on ${fileData[0]?.file_name} by`}),
                        // 	fileData[0]?.cus_id,
                        // 	parseInt(req?.user?.id),
                        // 	parseInt(req?.body?.id),
                        // 	fileData[0]?.cus_id
                        // );

                        /*Send Email*/
                        await sendEmail({
                          subject: "File stage Updated",
                          html: fileStageEmailTemplate({
                            file_name: fileData[0]?.file_name,
                            from_stage: "Required Document List",
                            to_stage: "Send Message To Client",
                            url: `${frontEndUrl.FileStageRouteUrl}/${req?.body?.id}`,
                          }),
                        });
                      }
                    } catch (err) {
                      console.log(err);
                    }
                  }
                  res.status(201).json({
                    error: false,
                    message: "Changes saved",
                    data: updatedArray,
                  });
                }
              });
            } else {
              res
                .status(201)
                .json({ error: true, mesage: "Record not found...", data: {} });
            }
          });
        }
      });
    }
  },
  skipSendMessageToClient: (req, res) => {
    try {
      const mst_file_id = req.params?.id;

      const data = {
        is_skip: 1,
        is_save: 1,
        created_at: getCurrentDateAndTime(),
        created_by: req.user?.id,
      };

      var sql =
        "SELECT *from `file_client_msg` WHERE `mst_file_id`=" +
        mst_file_id +
        "";

      db.query(sql, (err, result) => {
        if (err) {
          res
            .status(200)
            .json({ message: err.sqlMessage, error: true, data: {} });
        } else if (result.length > 0) {
          let updatedData = {};

          let shouldMoveToNext = 0;

          if (result[0]?.is_skip == 1 || result[0]?.is_save == 1) {
            updatedData = {
              is_skip: 1,
              is_save: 1,
              updated_at: getCurrentDateAndTime(),
              updated_by: req.user?.id,
            };
          } else {
            shouldMoveToNext = 1;
            updatedData = {
              is_skip: 1,
              is_save: 1,
              updated_at: getCurrentDateAndTime(),
              updated_by: req.user?.id,
            };
          }

          var sql =
            "UPDATE `file_client_msg` SET ? WHERE `mst_file_id`=" +
            mst_file_id +
            "";

          db.query(sql, updatedData, (err, result) => {
            if (err) {
              res
                .status(200)
                .json({ message: err.sqlMessage, error: true, data: {} });
            } else {
              if (shouldMoveToNext) {
                commonController.initialEntry_to_file_plot_validation(
                  mst_file_id,
                  req.user?.id
                );
                commonController.updateMstFileStage(4, mst_file_id);
              }
              res.status(200).json({
                message: "You've skipped",
                data: { skip: shouldMoveToNext },
                error: false,
              });
            }
          });
        } else {
          var sql = "INSERT INTO `file_client_msg` SET ? ";

          db.query(
            sql,
            { ...data, mst_file_id: mst_file_id },
            (err, result) => {
              if (err) {
                res
                  .status(200)
                  .json({ message: err.sqlMessage, error: false, data: {} });
              } else {
                commonController.initialEntry_to_file_plot_validation(
                  mst_file_id,
                  req.user?.id
                );
                commonController.updateMstFileStage(4, mst_file_id);
                res.status(200).json({
                  message: "You've skipped",
                  data: { skip: 1 },
                  error: false,
                });
              }
            }
          );
        }
      });
    } catch (err) {
      res.status(200).json({ message: "Server error", data: {}, error: false });
    }
  },
  sendMessageToClient: (req, res) => {
    req.assert("mst_file_id", "mst_file_id is required").notEmpty();
    req.assert("message", "Message is required").notEmpty();
    req
      .assert("file_received_date", "file_received_date is required")
      .notEmpty();
    req.assert("hod_liasoner_id", "hod_liasoner_id is required").notEmpty();
    req
      .assert("is_save", "is_save which action method did you save")
      .notEmpty();

    var errors = req.validationErrors();

    console.log(req.body);

    if (errors) {
      res.status(201).json({ error: true, message: errors[0].msg, data: {} });
    } else {
      const mst_stage_id =
        typeof req.body.mst_stage_id != "undefined" &&
        typeof parseInt(req.body.mst_stage_id) == "number"
          ? parseInt(req.body.mst_stage_id)
          : 2;

          const fileDate = new Date(req.body.date);
          console.log("req.body==>",req.body)
          const createdDate = new Date(getCurrentDateAndTime());
          console.log("createdDate-->",createdDate)
          
          // Calculate the difference in milliseconds between the two dates
          const timeDifference = Math.abs(createdDate - fileDate);
          console.log("timeDifference-->",timeDifference)
          
          // Convert the time difference from milliseconds to days
          const differenceInDays = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));
          console.log("differenceInDays-->",differenceInDays)
          
          // Assign red or green card based on the condition
          let cardColor;
          if (differenceInDays <= 2) { 
            // If the difference is 0 or 1 days, give a green card
            cardColor = "green";
          } else if (differenceInDays > 2) {
            // If the difference is greater than 2 days, give a red card
            cardColor = "red";
          } else {
           
            cardColor = "red";
          }
          

      var data = {
        mst_company_id: 1,
        mst_file_id: req.body.mst_file_id,
        message: filter_string(req.body.message),
        file_received_date: req.body.file_received_date,
        hod_liasoner_id: req.body.hod_liasoner_id,
        remark_by_hod: req.body.remark_by_hod,
        remark_by_emp: req.body.remark_by_emp,
        approved_by_hod: req.body.approved_by_hod === "Yes" ? 1 : 0,
        is_save: req.body.is_save,
        created_by: req.user.id,
        card:cardColor,
        created_at: getCurrentDateAndTime(),
      };
      //
      var sql =
        "SELECT *FROM `file_client_msg` where `mst_file_id`=" +
        Number(req.body.mst_file_id) +
        "";
      db.query(sql, (err, result) => {
        if (err) {
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else if (result.length > 0) {
          //do update

          const updatedData = {
            mst_company_id: 1,
            message: filter_string(req.body.message),
            file_received_date: req.body.file_received_date,
            hod_liasoner_id: req.body.hod_liasoner_id,
            remark_by_hod: req.body.remark_by_hod,
            remark_by_emp: req.body.remark_by_emp,
            approved_by_hod: req.body.approved_by_hod === "Yes" ? 1 : 0,
            is_save: req.body.is_save,
            updated_by: req.user.id,
            card: req.body.card ? req.body.card : cardColor,
            updated_at: getCurrentDateAndTime(),
          };

          if (updatedData.is_save != 1) {
            delete updatedData.is_save;
          }

          var sql =
            "UPDATE `file_client_msg` SET ? where mst_file_id=" +
            Number(data.mst_file_id) +
            "";
          // var sql = "UPDATE `file_client_msg` SET `mst_company_id`=" + data.mst_company_id + ",`message`='" + data.message + "',`file_received_date`='" + data.file_received_date + "',`hod_liasoner_id`=" + data.hod_liasoner_id + ",`is_save`=" + data.is_save + ",updated_by=" + req.user.id + ",updated_at='" + getCurrentDateAndTime() + "' where mst_file_id=" + Number(data.mst_file_id) + "";

          db.query(sql, updatedData, async (err, result) => {
            if (err) {
              console.log(sql);
              res
                .status(201)
                .json({ error: true, message: err.sqlMessage, data: {} });
            } else {
              if (req.body?.is_save == 1) {
                try {
                  commonController.updateMstFileStage(4, data.mst_file_id);
                  const stage = await commonController.getStageStageId(3);
                  const fileData = await commonController.getMstFileByMstFileId(
                    parseInt(data?.mst_file_id)
                  );
                  if (fileData.length > 0) {
                    /*Sending Notification*/

                    /*Notification for client*/
                    // notificationController.setNotification
                    // (
                    // 	JSON.stringify({message:`${stage[0]?.title} has been updated on ${fileData[0]?.file_name} by`}),
                    // 	fileData[0]?.cus_id,
                    // 	parseInt(req?.user?.id),
                    // 	parseInt(data?.mst_file_id),
                    // 	fileData[0]?.cus_id,
                    // );

                    /*Notification for employee*/
                    // notificationController.setNotification
                    // (
                    // 	JSON.stringify({message:`${fileData[0]?.file_name} has been assigned by`}),
                    // 	data.hod_liasoner_id,
                    // 	parseInt(req?.user?.id),
                    // 	parseInt(data?.mst_file_id),
                    // 	data.hod_liasoner_id,
                    // );

                    /*Send Email*/
                    await sendEmail({
                      subject: "File stage Updated",
                      html: fileStageEmailTemplate({
                        file_name: fileData[0]?.file_name,
                        from_stage: "Send Message To Client",
                        to_stage: "Plot Validation Certificate",
                        url: `${frontEndUrl.FileStageRouteUrl}/${data?.mst_file_id}`,
                      }),
                    });
                  }
                } catch (err) {
                  console.log(err);
                }
                commonController.setTeamToMstFile(
                  data.hod_liasoner_id,
                  data.mst_file_id
                );
                commonController.initialEntry_to_file_plot_validation(
                  data.mst_file_id,
                  req.user?.id
                );
              }
              res
                .status(201)
                .json({ error: false, message: "Message saved", data: {} });
            }
          });
        } else {
          //do insert
          db.query(
            "INSERT INTO `file_client_msg` SET ?",
            data,
            async (err, result) => {
              if (err) {
                res
                  .status(201)
                  .json({ error: true, message: err.sqlMessage, data: {} });
              } else {
                if (req.body?.is_save == "1") {
                  try {
                    commonController.updateMstFileStage(4, data.mst_file_id);
                    const stage = await commonController.getStageStageId(3);
                    const fileData =
                      await commonController.getMstFileByMstFileId(
                        parseInt(data?.mst_file_id)
                      );
                    if (fileData.length > 0) {
                      /*Sending Notification*/

                      /*Notification for client*/
                      // notificationController.setNotification
                      // (
                      // 	JSON.stringify({message:`${stage[0]?.title} has been updated on ${fileData[0]?.file_name} by`}),
                      // 	fileData[0]?.cus_id,
                      // 	parseInt(req?.user?.id),
                      // 	parseInt(data?.mst_file_id),
                      // 	fileData[0]?.cus_id,
                      // );

                      /*Notification for employee*/
                      // notificationController.setNotification
                      // (
                      // 	JSON.stringify({message:`${fileData[0]?.file_name} has been assigned by`}),
                      // 	data.hod_liasoner_id,
                      // 	parseInt(req?.user?.id),
                      // 	parseInt(data?.mst_file_id),
                      // 	data.hod_liasoner_id,
                      // );

                      /*Send Email*/
                      await sendEmail({
                        subject: "File stage Updated",
                        html: fileStageEmailTemplate({
                          file_name: fileData[0]?.file_name,
                          from_stage: "Send Message To Client",
                          to_stage: "Plot Validation Certificate",
                          url: `${frontEndUrl.FileStageRouteUrl}/${data?.mst_file_id}`,
                        }),
                      });
                    }
                  } catch (err) {
                    console.log(err);
                  }
                  commonController.setTeamToMstFile(
                    data.hod_liasoner_id,
                    data.mst_file_id
                  );
                  commonController.initialEntry_to_file_plot_validation(
                    data.mst_file_id,
                    req.user?.id
                  );
                  // commonController.add_file_plot_validation(data.mst_file_id);
                }
                res
                  .status(201)
                  .json({ error: false, message: "Message saved", data: {} });
              }
            }
          );
        }
      });
    }
  },
  lisoner: (req, res) => {
    //

    var sql =
      "SELECT `u`.`id`,`u`.`first_name`,`u`.`last_name`,`u`.`comp_id` FROM `users` as `u`  JOIN `users_groups` as `ug` ON `ug`.`mst_user_id`=`u`.`id` JOIN `user_department_post` as `udp` ON `udp`.`user_id`=`u`.`id`  JOIN `mst_groups` as `mg` ON `mg`.`id`=`ug`.`mst_group_id`  join `mst_department` as `d` on `udp`.`department_id`=`d`.`id` join `mst_post` as `p` on `udp`.`post_id`=`p`.`id` where `d`.`name`='liasoning' and `p`.`name`='HOD' and `u`.`isdeleted`=0 and `mg`.`name`='Employees'";

    db.query(sql, (err, result) => {
      if (err) {
        console.log(sql);
        res
          .status(201)
          .json({ error: true, message: err.sqlMessage, data: "Not" });
      } else {
        res
          .status(201)
          .json({ error: false, message: "Record fetched", data: result });
      }
    });
  },
  planner: (req, res) => {
    // var sql = "SELECT `u`.`id`,`u`.`first_name`,`u`.`last_name`,`u`.`comp_id` FROM `users` as `u`  JOIN `users_groups` as `ug` ON `ug`.`mst_user_id`=`u`.`id` JOIN `mst_groups` as `mg` ON `mg`.`id`=`ug`.`mst_group_id` join `mst_department` as `d` on `u`.`department_id`=`d`.`id` join `mst_post` as `p` on `u`.`post_id`=`p`.`id` where `d`.`name`='Planner' and `p`.`name`='HOD' and `u`.`isdeleted`=0 and `mg`.`name`='Employees'";

    var sql =
      "SELECT `u`.`id`,`u`.`first_name`,`u`.`last_name`,`u`.`comp_id` FROM `users` as `u` JOIN `users_groups` as `ug` ON `ug`.`mst_user_id`=`u`.`id` JOIN `user_department_post` as `udp` ON `udp`.`user_id`=`u`.`id` JOIN `mst_groups` as `mg` ON `mg`.`id`=`ug`.`mst_group_id` join `mst_department` as `d` on `udp`.`department_id`=`d`.`id` join `mst_post` as `p` on `udp`.`post_id`=`p`.`id` where `d`.`name`='planner' and `p`.`name`='HOD' and `u`.`isdeleted`=0 and `mg`.`name`='Employees'";

    db.query(sql, (err, result) => {
      if (err) {
        console.log(sql);
        res
          .status(201)
          .json({ error: true, message: err.sqlMessage, data: "Not" });
      } else {
        res
          .status(201)
          .json({ error: false, message: "Record fetched", data: result });
      }
    });
  },
  messagetoclient: (req, res) => {
    var sql =
      "SELECT *FROM `file_client_msg` where `mst_file_id`=" +
      Number(req.params.id) +
      "";
    db.query(sql, (err, result) => {
      if (err) {
        console.log(sql);
        res
          .status(201)
          .json({ error: true, message: err.sqlMessage, data: {} });
      } else if (!result.length) {
        res.status(201).json({ error: true, message: "Not found", data: {} });
      } else {
        res
          .status(201)
          .json({ error: false, message: "Record fetched", data: result[0] });
      }
    });
  },
  getStageList: (req, res) => {
    var sql = "SELECT `id`,`title` from `mst_stage` order by `id` asc";
    db.query(sql, (err, result) => {
      if (err) {
        res
          .status(201)
          .json({ error: true, message: err.sqlMessage, data: {} });
      } else {
        const data = result.map((element) => {
          return { ...element, active: false };
        });
        res.status(201).json({ error: false, message: "Record fetched", data });
      }
    });
  },
  getStageListByFileProcess: async (req, res) => {
    const mst_file_id = parseInt(req?.params?.id);
    var mainSql = "SELECT `id`,`title` from `mst_stage` order by `id` asc";
    if (mst_file_id) {
      var sql =
        "SELECT `mf`.`id`,`mf`.`process`,`sf`.`status_file_name` FROM `mst_file` as `mf` LEFT JOIN `status_file` as `sf` ON `sf`.`id`=`mf`.`process` WHERE `mf`.`id`=" +
        mst_file_id +
        "";
      db.query(sql, (err, result) => {
        if (err) {
          console.log(`${err}`);
          res
            .status(201)
            .json({ message: err.sqlMessage, error: true, data: {} });
        } else if (result.length) {
          if (result[0]?.status_file_name.toLowerCase() == "online") {
            mainSql = "SELECT `id`,`title` from `mst_stage` order by `id` asc";
          } else if (result[0]?.status_file_name.toLowerCase() == "offline") {
            // mainSql = "SELECT `id`,`title` from `mst_stage` where LCASE(`title`)<>'e-nagar portal' order by `id` asc";
            mainSql =
              "SELECT `id`,`title` from `mst_stage` where LCASE(`title`)<>'e-nagar portal' and LCASE(`title`)<>'owner portal' order by `id` asc";
          } else {
            mainSql = "SELECT `id`,`title` from `mst_stage` order by `id` asc";
          }
        } else {
        }

        db.query(mainSql, (err, result) => {
          if (err) {
            console.log(`${err}`);
            res
              .status(201)
              .json({ message: err.sqlMessage, error: true, data: {} });
          } else {
            if (result.length) {
              res
                .status(200)
                .json({ data: result, error: false, message: "Stage fetched" });
            } else {
              res
                .status(200)
                .json({ data: [], error: false, message: "Not found" });
            }
          }
        });
      });
    } else {
      db.query(mainSql, (err, result) => {
        if (err) {
          console.log(`${err}`);
          res
            .status(201)
            .json({ message: err.sqlMessage, error: true, data: {} });
        } else {
          if (result.length) {
            res
              .status(200)
              .json({ data: result, error: false, message: "Stage fetched" });
          } else {
            res
              .status(200)
              .json({ data: [], error: false, message: "Not found" });
          }
        }
      });
    }
  },
  checkNotUndefined: (data) => {
    return !(typeof data === "undefined");
  },

  skip_enagarportal: (req, res) => {
    try {
      const mst_file_id = req?.params?.id;

      var sql =
        "SELECT *from `file_enagar_portal` WHERE `mst_file_id`=" +
        mst_file_id +
        " and `is_rejected`=0";

      db.query(sql, (err, result) => {
        if (err) {
          console.log(err);
        } else if (result.length > 0) {
          const jsonObject = isValidJson(result[0]?.type_save);
          let skipJsonObject = isValidJson(result[0]?.is_skip);

          if (skipJsonObject == null) {
            skipJsonObject = {
              type1: { is_skip: 0 },
              type2: { is_skip: 0 },
              type3: { is_skip: 0 },
              type4: { is_skip: 0 },
              type5: { is_skip: 0 },
              type6: { is_skip: 0 },
            };
          }

          if (jsonObject != null) {
            // console.log(jsonObject.type1.is_save);

            let skipData = {
              ...jsonObject,
            };

            let nextStage = 0;

            if (jsonObject?.type1?.is_save == 0) {
              skipData = { ...jsonObject, type1: { is_save: 1 } };
              skipJsonObject = { ...skipJsonObject, type1: { is_skip: 1 } };
            } else if (jsonObject?.type2?.is_save == 0) {
              skipData = { ...jsonObject, type2: { is_save: 1 } };
              skipJsonObject = { ...skipJsonObject, type2: { is_skip: 1 } };
            } else if (jsonObject?.type3?.is_save == 0) {
              skipData = { ...jsonObject, type3: { is_save: 1 } };
              skipJsonObject = { ...skipJsonObject, type3: { is_skip: 1 } };
            } else if (jsonObject?.type4?.is_save == 0) {
              skipData = { ...jsonObject, type4: { is_save: 1 } };
              skipJsonObject = { ...skipJsonObject, type4: { is_skip: 1 } };
            } else if (jsonObject?.type5?.is_save == 0) {
              skipData = { ...jsonObject, type5: { is_save: 1 } };
              skipJsonObject = { ...skipJsonObject, type5: { is_skip: 1 } };
            } else if (jsonObject?.type6?.is_save == 0) {
              nextStage = 1;
              skipData = { ...jsonObject, type6: { is_save: 1 } };
              skipJsonObject = { ...skipJsonObject, type6: { is_skip: 1 } };
            } else {
              nextStage = 0;
            }

            const jsonString = JSON.stringify(skipData);
            const skipJsonString = JSON.stringify(skipJsonObject);

            const updatedData = {
              type_save: jsonString,
              is_skip: skipJsonString,
              updated_at: getCurrentDateAndTime(),
              updated_by: req?.user?.id,
            };

            var sql =
              "UPDATE `file_enagar_portal` SET ? WHERE `mst_file_id`=" +
              mst_file_id +
              " and `is_rejected`=0";

            db.query(sql, updatedData, (err, result) => {
              if (err) {
                res
                  .status(200)
                  .json({ message: err.sqlMessage, error: true, data: {} });
              } else {
                if (nextStage) {
                  commonController.updateMstFileStage(6, mst_file_id);
                }

                res.status(200).json({
                  message: "Skipped",
                  error: false,
                  data: { nextStage: nextStage },
                });
              }
            });
          } else {
            res
              .status(200)
              .json({ message: "Unable to Skip", error: true, data: {} });
          }
        } else {
          console.log("Data does not existed");
          res
            .status(200)
            .json({ message: "Unable to Skip", error: true, data: {} });
        }
      });
    } catch (err) {
      console.log(err);
      res.status(200).json({ message: "Server error", error: true, data: {} });
    }
  },
  enagarportal: (req, res) => {
    console.log(req.body);

    var team_id = 0;

    if (!req.body.type_save) {
      res.status(201).json({ error: true, message: "Invalid data", data: {} });
    } else {
      try {
        const typeObj = JSON.parse(req.body.type_save);

        var commonData = {
          mst_file_id: parseInt(req.body.mst_file_id),
          mst_company_id: parseInt(req.user.comp_id),
          updated_by: parseInt(req.user.id),
          updated_at: getCurrentDateAndTime(),
        };

        var data = {};

        console.log(
          module.exports.checkNotUndefined(req.body?.should_type2_save)
        );

        if (
          (typeObj?.type1?.is_save || !typeObj?.type1?.is_save) &&
          module.exports.checkNotUndefined(req.body?.should_type1_save) &&
          !typeObj?.type2?.is_save &&
          !typeObj?.type3?.is_save &&
          !typeObj?.type4?.is_save &&
          !typeObj?.type5?.is_save
        ) {
          var data = {
            ...commonData,
            drawing_assign_date: req.body.drawing_assign_date,
            completed_date: req.body.completed_date,
            assign_planner: parseInt(req.body.assign_planner),
            type_save: req.body.type_save,
            is_save: 0,
          };

          console.log("My dATA---" + data);

          team_id = data.assign_planner;

          var sql =
            "UPDATE `file_enagar_portal` SET `drawing_assign_date`=?,`completed_date`=?,`assign_planner`=?,`type_save`=?,`updated_by`=?,`updated_at`=? WHERE `mst_file_id`=? and `mst_company_id`=? and `is_rejected`=0";
          var thatData = [
            data.drawing_assign_date,
            data.completed_date,
            data.assign_planner,
            data.type_save,
            data.updated_by,
            data.updated_at,
            data.mst_file_id,
            data.mst_company_id,
          ];
        } else if (
          module.exports.checkNotUndefined(req.body?.should_type2_save)
        ) {
          // else if (((typeObj?.type2?.is_save || !typeObj?.type2?.is_save) && module.exports.checkNotUndefined(req.body?.should_type2_save)) && (typeObj?.type1?.is_save && !typeObj?.type3?.is_save && !typeObj?.type4?.is_save && !typeObj?.type5?.is_save && !typeObj?.type6?.is_save)) {
          var data = {
            ...commonData,
            completed_date2: req.body.completed_date2,
            assign_liasoner: req.body.assign_liasoner,
            type_save: req.body.type_save,
            is_save: 0,
          };

          team_id = data.assign_liasoner;

          var sql =
            "UPDATE `file_enagar_portal` SET `completed_date2`=?,`assign_liasoner`=?,`type_save`=?,`updated_by`=?,`updated_at`=? WHERE `mst_file_id`=? and `mst_company_id`=? and `is_rejected`=0";
          var thatData = [
            data.completed_date2,
            data.assign_liasoner,
            data.type_save,
            data.updated_by,
            data.updated_at,
            data.mst_file_id,
            data.mst_company_id,
          ];
        } else if (
          module.exports.checkNotUndefined(req.body?.should_type3_save)
        ) {
          // else if ((typeObj?.type3?.is_save && module.exports.checkNotUndefined(req.body?.should_type3_save)) && (typeObj?.type1?.is_save && typeObj?.type2?.is_save && !typeObj.type4.is_save && !typeObj.type5.is_save && !typeObj.type6.is_save)) {
          var data = {
            ...commonData,
            application_number: req.body.application_number,
            assign_application_number:
              parseInt(req.body.assign_application_number) != NaN
                ? parseInt(req.body.assign_application_number)
                : 0,
            login: req.body.login,
            password: req.body.password,
            upload_date: req.body.upload_date,
            type_save: req.body.type_save,
            is_save: 0,
          };

          team_id = data?.assign_application_number;

          var sql =
            "UPDATE `file_enagar_portal` SET `application_number`=?,`is_save`=?,`login`=?,`password`=?,`upload_date`=?,`assign_application_number`=?,`type_save`=?,`updated_by`=?,`updated_at`=? WHERE `mst_file_id`=? and `mst_company_id`=? and `is_rejected`=0";
          var thatData = [
            data.application_number,
            data.is_save,
            data.login,
            data.password,
            data.upload_date,
            data?.assign_application_number,
            data.type_save,
            data.updated_by,
            data.updated_at,
            data.mst_file_id,
            data.mst_company_id,
          ];
        } else if (
          module.exports.checkNotUndefined(req.body?.should_type4_save)
        ) {
          // else if ((typeObj?.type4?.is_save && module.exports.checkNotUndefined(req.body?.should_type4_save))&& (typeObj?.type1?.is_save && typeObj?.type2?.is_save && typeObj?.type3?.is_save && !typeObj?.type5?.is_save && !typeObj?.type6?.is_save)) {
          var data = {
            ...commonData,
            pdf_received_date: req.body.pdf_received_date,
            assign_pdf_received_date:
              parseInt(req.body.assign_pdf_received_date) != NaN
                ? parseInt(req.body.assign_pdf_received_date)
                : 0,
            type_save: req.body.type_save,
            is_save: 0,
          };

          team_id = data.assign_pdf_received_date;

          var sql =
            "UPDATE `file_enagar_portal` SET `is_save`=?,`pdf_received_date`=?,`assign_pdf_received_date`=?,`type_save`=?,`updated_by`=?,`updated_at`=? WHERE `mst_file_id`=? and `mst_company_id`=? and `is_rejected`=0";
          var thatData = [
            data?.is_save,
            data.pdf_received_date,
            data?.assign_pdf_received_date,
            data.type_save,
            data.updated_by,
            data.updated_at,
            data.mst_file_id,
            data.mst_company_id,
          ];
        } else if (
          module.exports.checkNotUndefined(req.body?.should_type5_save)
        ) {
          // else if((typeObj?.type5?.is_save && module.exports.checkNotUndefined(req.body?.should_type5_save)) && (typeObj?.type1?.is_save && typeObj?.type2?.is_save && typeObj?.type3?.is_save && typeObj?.type4?.is_save && !typeObj?.type6?.is_save))
          var data = {
            ...commonData,
            smc_checking_date: req.body.smc_checking_date,
            assign_smc_checking_date:
              parseInt(req.body.assign_smc_checking_date) != NaN
                ? parseInt(req.body.assign_smc_checking_date)
                : 0,
            type_save: req.body.type_save,
            is_save: 0,
          };

          team_id = data.assign_smc_checking_date;

          var sql =
            "UPDATE `file_enagar_portal` SET `is_save`=?,`smc_checking_date`=?,`assign_smc_checking_date`=?,`type_save`=?,`updated_by`=?,`updated_at`=? WHERE `mst_file_id`=? and `mst_company_id`=? and `is_rejected`=0";
          var thatData = [
            data.is_save,
            data.smc_checking_date,
            data?.assign_smc_checking_date,
            data.type_save,
            data.updated_by,
            data.updated_at,
            data.mst_file_id,
            data.mst_company_id,
          ];
        } else if (
          module.exports.checkNotUndefined(req.body?.should_type6_save)
        ) {
          // else if((typeObj?.type6?.is_save || module.exports.checkNotUndefined(req.body?.should_type6_save)) && (typeObj?.type1?.is_save && typeObj?.type2?.is_save && typeObj?.type3?.is_save && typeObj?.type4.is_save && typeObj?.type5?.is_save))
          var data = {
            ...commonData,
            approve_date: req.body.approve_date,
            smc_upload_date: req?.body?.smc_upload_date,
            assign_approve_date:
              parseInt(req.body.assign_approve_date) != NaN
                ? parseInt(req.body.assign_approve_date)
                : 0,
            type_save: req.body.type_save,
            is_save:
              parseInt(req.body?.should_type6_save) != NaN
                ? parseInt(req.body?.should_type6_save)
                : 0,
          };

          team_id = data.assign_approve_date;

          var sql =
            "UPDATE `file_enagar_portal` SET `is_save`=?,`approve_date`=?,`assign_approve_date`=?,`type_save`=?,`updated_by`=?,`updated_at`=? WHERE `mst_file_id`=? and `mst_company_id`=? and `is_rejected`=0";
          var thatData = [
            data.is_save,
            data.approve_date,
            data?.assign_approve_date,
            data.type_save,
            data.updated_by,
            data.updated_at,
            data.mst_file_id,
            data.mst_company_id,
          ];
        }

        db.query(sql, thatData, async (err, result) => {
          if (err) {
            console.log(err);
            res
              .status(201)
              .json({ error: true, message: err.sqlMessage, data: {} });
          } else {
            if (data.is_save) {
              /*Sending Notification*/
              try {
                const stage = await commonController.getStageStageId(5);
                const fileData = await commonController.getMstFileByMstFileId(
                  parseInt(commonData.mst_file_id)
                );
                // notificationController.setNotification
                // (
                // 	JSON.stringify({message:`${stage[0]?.title} has been updated on ${fileData[0]?.file_name} by`,action:"File assigned",mst_file_id:parseInt(commonData.mst_file_id)}),
                // 	fileData[0]?.cus_id,
                // 	parseInt(req?.user?.id),
                // 	parseInt(commonData.mst_file_id),
                // 	fileData[0]?.cus_id
                // );
              } catch (err) {
                console.log(err);
                console.log(`${line}Enable to Send Notification\n${line}`);
              }

              commonController.updateMstFileStage(6, commonData.mst_file_id);
            } else {
              if (team_id) {
                /*Sending Notification*/
                try {
                  const fileData = await commonController.getMstFileByMstFileId(
                    parseInt(commonData.mst_file_id)
                  );
                  // notificationController.setNotification
                  // (
                  // 	JSON.stringify({message:`You've been assigned the file ${fileData[0]?.file_name} by`,action:"File assigned",mst_file_id:parseInt(commonData.mst_file_id)}),
                  // 	parseInt(team_id),
                  // 	parseInt(req?.user?.id),
                  // 	parseInt(commonData.mst_file_id),
                  // 	fileData[0]?.cus_id
                  // );
                } catch (err) {
                  console.log(err);
                  console.log(`${line}Enable to Send Notification\n${line}`);
                }
              }
            }
            commonController.setTeamToMstFile(team_id, commonData.mst_file_id);
            res
              .status(201)
              .json({ error: false, message: "changes saved", data: {} });
          }
        });
      } catch (err) {
        console.log(err);
        res
          .status(201)
          .json({ error: true, message: "Invalid data", data: {} });
      }
    }
  },
  getEnagarportalByMstFileId: (req, res) => {
    var mst_file_id = parseInt(req.params.id);
    if (typeof mst_file_id != "undefined" && typeof mst_file_id == "number") {
      var sql0 =
        "SELECT MAX(`is_rejected`) as `last_rejected_number` FROM `file_enagar_portal` WHERE `mst_file_id`=" +
        mst_file_id;
      var sql1 =
        "SELECT * FROM `file_enagar_portal` WHERE `mst_file_id`=" +
        mst_file_id +
        " AND `is_rejected`=(SELECT MAX(`is_rejected`) FROM `file_enagar_portal` WHERE `mst_file_id`=" +
        mst_file_id +
        ")";
      var sql2 =
        "SELECT * FROM `file_enagar_portal` WHERE `mst_file_id`=" +
        mst_file_id +
        " AND `is_rejected`=0";

      db.query(sql0, (err, result0) => {
        if (err) {
          console.log(err);
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else {
          db.query(sql1, (err, result1) => {
            if (err) {
              console.log(err);
              res
                .status(201)
                .json({ error: true, message: err.sqlMessage, data: {} });
            } else {
              db.query(sql2, (err, result2) => {
                if (err) {
                  console.log(err);
                  res
                    .status(201)
                    .json({ error: true, message: err.sqlMessage, data: {} });
                } else {
                  res.status(201).json({
                    error: false,
                    message: "Record fetched",
                    maxvalue: result0[0].last_rejected_number,
                    data1: result1,
                    data2: result2,
                  });
                }
              });
            }
          });
        }
      });
    } else {
      console.log(mst_file_id);
      res
        .status(201)
        .json({ error: true, message: "Invalid request", data: {} });
    }
  },

  // getEnagarportalByMstFileId: (req, res) => {

  // 	var mst_file_id = parseInt(req.params.id)
  // 	if (typeof mst_file_id != "undefined" && typeof mst_file_id == "number") {
  // 		var sql0 = "SELECT MAX(`is_rejected`) as `last_rejected_number` FROM `file_enagar_portal` where `mst_file_id`=" + mst_file_id + "";
  // 		var sql1 = "SELECT *from `file_enagar_portal` where `mst_file_id`=" + mst_file_id + " and `is_rejected`=(SELECT MAX(`is_rejected`) FROM `file_enagar_portal` where `mst_file_id`=" + mst_file_id + ")";
  // 		var sql2 = "SELECT *from `file_enagar_portal` where `mst_file_id`=" + mst_file_id + " and `is_rejected`=0";

  // 		db.query(sql0 + ";" + sql1 + ";" + sql2, (err, result) => {
  // 			if (err) {
  // 				console.log(err);
  // 				res.status(201).json({ error: true, message: err.sqlMessage, data: {} });
  // 			}
  // 			else {
  // 				res.status(201).json({ error: false, message: "Record fetched", maxvalue: result[0][0].last_rejected_number, data1: result[1], data2: result[2] })
  // 			}
  // 		});

  // 	}
  // 	else {
  // 		console.log(mst_file_id);
  // 		res.status(201).json({ error: true, message: "Invalid request", data: {} })
  // 	}

  // 	// var sql = "SELECT *from `file_enagar_portal` where `mst_file_id`="+req.params.id+" and `is_rejected`=0";

  // 	// db.query(sql,(err,result)=>{
  // 	// 	if(err){

  // 	// 	}else if(result.length){
  // 	// 		res.status(201).json({error:false,message:"Record fetched",data:result[0]})
  // 	// 	}
  // 	// 	else{
  // 	// 		res.status(201).json({error:true,message:"Not found",data:{}})
  // 	// 	}
  // 	// })

  // },
  skip_ownerPortal: (req, res) => {
    try {
      const mst_file_id = req.params?.id;
      var sql =
        "SELECT * FROM `file_enagar_owner_portal` WHERE `mst_file_id`=" +
        mst_file_id +
        "";

      db.query(sql, (err, result) => {
        if (err) {
          res
            .status(200)
            .json({ message: err.sqlMessage, error: true, data: {} });
        } else if (result.length > 0) {
          if (result[0]?.is_save == 1 || result[0]?.is_skip == 1) {
            updatedData = {
              is_save: 1,
              updated_by: req?.user?.id,
              updated_at: getCurrentDateAndTime(),
            };
          } else {
            updatedData = {
              is_save: 1,
              is_skip: 1,
              updated_by: req?.user?.id,
              updated_at: getCurrentDateAndTime(),
            };
          }

          var sql =
            "UPDATE `file_enagar_owner_portal` SET ? WHERE `mst_file_id`=" +
            mst_file_id +
            "";

          db.query(sql, updatedData, (err, result) => {
            if (err) {
              res
                .status(200)
                .json({ message: err.sqlMessage, error: true, data: {} });
            } else {
              if (updatedData?.is_skip == 1) {
                commonController.updateMstFileStage(7, mst_file_id);
              }
              res.status(200).json({
                message: skipStagesMessage(),
                data: { nextStage: updatedData?.is_skip == 1 ? 1 : 0 },
                error: false,
              });
            }
          });
        } else {
          //Insert new blank row

          const data = {
            mst_file_id: mst_file_id,
            mst_company_id: req?.user?.comp_id ? req?.user?.comp_id : 0,
            is_save: 1,
            is_skip: 1,
            created_by: req?.user?.id,
            created_at: getCurrentDateAndTime(),
          };

          var sql = "INSERT INTO `file_enagar_owner_portal` SET ?";

          db.query(sql, data, (err, result) => {
            if (err) {
              res
                .status(200)
                .json({ message: err.sqlMessage, error: true, data: {} });
            } else {
              commonController.updateMstFileStage(7, mst_file_id);
              res.status(200).json({
                message: skipStagesMessage(),
                data: { nextStage: 1 },
                error: false,
              });
            }
          });
        }
      });
    } catch (err) {
      res.status(200).json({ message: "Server error", data: {}, error: true });
    }
  },
  ownerPortal: (req, res) => {
    req.assert("mst_file_id", "mst_file_id is required").notEmpty();
    req.assert("upload_date", "upload_date is required").notEmpty();
    req
      .assert("application_number", "application_number is required")
      .notEmpty();
    req.assert("approve_date", "approve_date is required").notEmpty();
    req.assert("login", "login is required").notEmpty();
    req.assert("password", "password is required").notEmpty();
    req.assert("is_save", "is_save is required").notEmpty();

    var errors = req.validationErrors();

    if (errors) {
      res.status(201).json({ errors: true, message: errors[0].msg, data: {} });
    } else {

      console.log("reaaa-->",req.body)
      const fileDate = new Date(req.body.date); // Assuming 'd' represents each object in the 'data' array

      console.log("fileDate==>", fileDate);

      const createdDate = new Date(getCurrentDateAndTime());
      console.log("createdDate-->", createdDate);

      // Calculate the difference in milliseconds between the two dates
      const timeDifference = Math.abs(createdDate - fileDate);
      console.log("timeDifference-->", timeDifference);

      // Convert the time difference from milliseconds to days
      const differenceInDays = Math.ceil(
        timeDifference / (1000 * 60 * 60 * 24)
      );
      console.log("differenceInDays-->", differenceInDays);

      // Assign red or green card based on the condition
      let cardColor;
      if (differenceInDays <= 2 ) {
        // If the difference is 0 or 17  days, give a green card
        cardColor = "green";
      } else if (differenceInDays > 2 ) {
        // If the difference is greater than 17  days, give a red card
        cardColor = "red";
      } else {
        cardColor = "red";
      }
      let data = {
        mst_company_id:
          typeof req.body.comp_id == "undefined" ? 1 : req.body.comp_id,
        mst_file_id: req.body.mst_file_id,
        upload_date: req.body.upload_date,
        application_number: req.body.application_number,
        approve_date: req.body.approve_date,
        remark_by_hod: req.body.remark_by_hod,
        remark_by_emp: req.body.remark_by_emp,
        approved_by_hod: req.body.approved_by_hod === "Yes" ? 1 : 0,
        login: req.body.login,
        password: req.body.password,
        is_save: req.body.is_save,
        card:cardColor,
        created_by: req.user.id,
        created_at: getCurrentDateAndTime(),
      };

      const mst_stage_id = data.is_save ? 7 : 6;

      var sql =
        "SELECT *from `file_enagar_owner_portal` where `mst_file_id`=" +
        data.mst_file_id +
        "";

      db.query(sql, (err, result) => {
        if (err) {
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else if (result.length) {
          //update

          const updatedData = {
            mst_company_id: 1,
            upload_date: req.body.upload_date,
            application_number: req.body.application_number,
            approve_date: req.body.approve_date,
            login: req.body.login,
            remark_by_hod: req.body.remark_by_hod,
            remark_by_emp: req.body.remark_by_emp,
            approved_by_hod: req.body.approved_by_hod === "Yes" ? 1 : 0,
            password: req.body.password,
            is_save: req.body.is_save,
            updated_by: req.user.id,
            card: req.body.card ? req.body.card : cardColor,
            updated_at: getCurrentDateAndTime(),
          };

          if (updatedData.is_save != 1) {
            delete updatedData.is_save;
          }

          // var sql = "UPDATE `file_enagar_owner_portal` SET `mst_company_id`=?,`upload_date`=?,`application_number`=?,`approve_date`=?,`login`=?,`password`=?,`is_save`=?,`updated_by`=?,`updated_at`=? WHERE `mst_file_id`=?";
          // const updated_data = [data.mst_company_id, data.upload_date, data.application_number, data.approve_date, data.login, data.password, data.is_save, data.created_by, data.created_at, data.mst_file_id];

          var sql =
            "UPDATE `file_enagar_owner_portal` SET ? WHERE `mst_file_id`=" +
            data?.mst_file_id +
            "";

          db.query(sql, updatedData, async (err, result) => {
            if (err) {
              console.log(err.sql);
              res
                .status(201)
                .json({ error: true, message: err.sqlMessage, data: {} });
            } else {
              if (updatedData?.is_save == 1) {
                const fileData = await commonController.getMstFileByMstFileId(
                  parseInt(data?.mst_file_id)
                );
                /*Send Email*/
                await sendEmail({
                  subject: "File stage Updated",
                  html: fileStageEmailTemplate({
                    file_name: fileData[0]?.file_name,
                    from_stage: "Owner Portal",
                    to_stage: "Document Upload",
                    url: `${frontEndUrl.FileStageRouteUrl}/${data?.mst_file_id}`,
                  }),
                });
                commonController.updateMstFileStage(7, data.mst_file_id);
              }

              res
                .status(201)
                .json({ error: false, message: "Changes saved", data: {} });
            }
          });
        } else {
          //insert
          var sql = "INSERT INTO `file_enagar_owner_portal` SET ?";
          db.query(sql, data, async (err, result) => {
            if (err) {
              res
                .status(201)
                .json({ error: true, message: err.sqlMessage, data: {} });
            } else {
              if (data?.is_save == 1) {
                const fileData = await commonController.getMstFileByMstFileId(
                  parseInt(data?.mst_file_id)
                );
                /*Send Email*/
                await sendEmail({
                  subject: "File stage Updated",
                  html: fileStageEmailTemplate({
                    file_name: fileData[0]?.file_name,
                    from_stage: "Owner Portal",
                    to_stage: "Document Upload",
                    url: `${frontEndUrl.FileStageRouteUrl}/${data?.mst_file_id}`,
                  }),
                });
                commonController.updateMstFileStage(7, data.mst_file_id);
              }
              res
                .status(201)
                .json({ error: false, message: "Changes saved", data: {} });
            }
          });
        }
      });
    }
  },
  getOwnerPortal: (req, res) => {
    var sql =
      "SELECT *from `file_enagar_owner_portal` where `mst_file_id`=" +
      req.params.id +
      "";

    db.query(sql, (err, result) => {
      if (err) {
        res
          .status(201)
          .json({ error: true, message: err.sqlMessage, data: {} });
      } else if (result.length) {
        res
          .status(201)
          .json({ error: false, message: "Record fetched", data: result[0] });
      } else {
        res.status(201).json({ error: true, message: "Not found", data: {} });
      }
    });
  },
  getTypesOfPlotValidation: (req, res) => {
    var sql =
      "SELECT * FROM `mst_type` where `types`='plot_validation_draft' or `types`='plot_validation_final' ORDER BY `id` ASC";
    db.query(sql, (err, result) => {
      if (err) {
        res
          .status(201)
          .json({ error: true, message: err.sqlMessage, data: {} });
      } else if (result.length) {
        res
          .status(201)
          .json({ error: false, message: "Record fetched", data: result });
      } else {
        res.status(201).json({ error: true, message: "Not found", data: {} });
      }
    });
  },
  file_plot_validation: async (req, res) => {
    const data_arr = JSON.parse(req.body.plotData);
  
    

    var file_id = 0;
    var mst_file_id = 0;

    if (Array.isArray(data_arr)) {
      for (let data of data_arr) {
        mst_file_id = data.mst_file_id;
        file_id = mst_file_id;
        var mst_type_id = data.mst_type_id;

        let commonData = {
          mst_company_id:
            typeof req.user.comp_id != "undefined" &&
            typeof parseInt(req.user.comp_id) == "number"
              ? parseInt(req.user.comp_id)
              : 1,
          mst_file_id: data.mst_file_id,
          is_rejected: 0,
          created_by: parseInt(req.user.id),
          created_at: getCurrentDateAndTime(),
        };

        if (parseInt(data.type) === 1) {
          let inwardTypeData = {
            ...commonData,
            mst_type_id: data.mst_type_id,
            inward_no: data.inward_no,
            inward_date: data.inward_date,
            is_save: 1,
            assign_to: data.assign_to,
          };

          var sql =
            "select *from `file_plot_validation` where `mst_file_id`=" +
            mst_file_id +
            " and `mst_type_id`=" +
            mst_type_id +
            " and `type`=1 and `is_rejected`=0";

          db.query(sql, (err, result) => {
            if (err) {
              console.log(err);
              res
                .status(201)
                .json({ error: true, message: err.sqlMessage, data: {} });
            } else {
              var sql =
                "UPDATE `file_plot_validation` SET `mst_company_id`=?, `inward_no`=? ,`inward_date`=?,`assign_to`=?,`is_save`=?,`updated_by`=?,`updated_at`=? where `mst_file_id`=? and `mst_type_id`=? and type=1 and `is_rejected`=0";
              var thatData = [
                inwardTypeData.mst_company_id,
                inwardTypeData.inward_no,
                inwardTypeData.inward_date,
                inwardTypeData.assign_to,
                inwardTypeData.is_save,
                inwardTypeData.created_by,
                inwardTypeData.created_at,
                inwardTypeData.mst_file_id,
                inwardTypeData.mst_type_id,
              ];

              db.query(sql, thatData, (err, result) => {
                if (err) {
                  console.log(err);
                  res
                    .status(201)
                    .json({ error: true, message: err.sqlMessage, data: {} });
                }
              });
            }
          });
        } else if (parseInt(data.type) === 2) {
          let outwardTypeData = {
            ...commonData,
            mst_type_id: data.mst_type_id,
            outward_no: data.outward_no,
            outward_date: !data.outward_date ? null : data.outward_date,
            is_save: 1,
            documents: "",
            assign_to: data.assign_to,
            document_upload_date: data?.document_upload_date
              ? data?.document_upload_date
              : getCurrentDateAndTime(),
          };

          if (req.file && data.isDocument) {
            outwardTypeData.documents = getImageWithFoldername(req.file.path);
          }

          var sql =
            "select *from `file_plot_validation` where `mst_file_id`=" +
            mst_file_id +
            " and `mst_type_id`=" +
            mst_type_id +
            " and `type`=2 and `is_rejected`=0";

          db.query(sql, (err, result) => {
            if (err) {
              console.log(err);
              outwardTypeData?.documents
                ? unlinkSingleImage(outwardTypeData?.documents)
                : "";
              res
                .status(201)
                .json({ error: true, message: err.sqlMessage, data: {} });
            } else {
              var oldFile = "";

              !outwardTypeData.assign_to
                ? (outwardTypeData.assign_to = result.assign_to)
                : "";
              console.log("Assign to " + outwardTypeData.assign_to);

              if (!outwardTypeData?.documents) {
                var sql =
                  "UPDATE `file_plot_validation` SET `mst_company_id`=?, `outward_no`=? ,`outward_date`=?,`document_upload_date`=?,`assign_to`=?,`is_save`=?,`updated_by`=?,`updated_at`=? where `mst_file_id`=? and `mst_type_id`=? and type=2";
                var thatData = [
                  outwardTypeData.mst_company_id,
                  outwardTypeData.outward_no,
                  outwardTypeData.outward_date,
                  outwardTypeData?.document_upload_date,
                  outwardTypeData.assign_to,
                  outwardTypeData.is_save,
                  outwardTypeData.created_by,
                  outwardTypeData.created_at,
                  outwardTypeData.mst_file_id,
                  outwardTypeData.mst_type_id,
                ];
              } else {
                var sql =
                  "UPDATE `file_plot_validation` SET `mst_company_id`=?, `outward_no`=?,`documents`=?,`document_upload_date`=?,`outward_date`=?,`assign_to`=?,`is_save`=?,`updated_by`=?,`updated_at`=? where `mst_file_id`=? and `mst_type_id`=? and type=2";
                var thatData = [
                  outwardTypeData.mst_company_id,
                  outwardTypeData.outward_no,
                  outwardTypeData.documents,
                  outwardTypeData?.document_upload_date,
                  outwardTypeData.outward_date,
                  outwardTypeData.assign_to,
                  outwardTypeData.is_save,
                  outwardTypeData.created_by,
                  outwardTypeData.created_at,
                  outwardTypeData.mst_file_id,
                  outwardTypeData.mst_type_id,
                ];
                oldFile = result.documents;
              }

              db.query(sql, thatData, (err, result) => {
                if (err) {
                  console.log(err);
                  outwardTypeData?.documents
                    ? unlinkSingleImage(outwardTypeData?.documents)
                    : "";
                  res
                    .status(201)
                    .json({ error: true, message: err.sqlMessage, data: {} });
                } else {
                  // Uncomment the following line if you want to remove old File at the time of update
                  // if(oldFile) { unlinkSingleImage(oldFile) }
                }
              });
            }
          });
        }
      }

      if (req.body?.assign_planner != undefined) {
        db.query(
          "SELECT *from `file_enagar_portal` WHERE `mst_file_id`=" +
            parseInt(mst_file_id) +
            "",
          (err, result) => {
            if (err) {
              console.log(err);
            } else if (result.length == 0) {
              commonController.initialEntry_to_enagar_portal(
                req?.user?.comp_id,
                parseInt(mst_file_id),
                req?.user?.id,
                parseInt(req.body?.assign_planner)
              );
            }
          }
        );
      }

      if (req.body.team_id) {
        commonController.setTeamToMstFile(
          parseInt(req.body.team_id),
          parseInt(mst_file_id)
        );
        /*Sending Notification*/
        try {
          const fileData = await commonController.getMstFileByMstFileId(
            parseInt(mst_file_id)
          );
          // notificationController.setNotification
          // (
          // 	JSON.stringify({message:`You've been assigned the file ${fileData[0]?.file_name} by`,action:"File is assigned from plot validation certificate",mst_file_id:parseInt(mst_file_id)}),
          // 	parseInt(req.body?.team_id),
          // 	parseInt(req?.user?.id),
          // 	parseInt(mst_file_id),
          // 	fileData[0]?.cus_id
          // );
        } catch (err) {
          console.log(err);
          console.log(`${line}Enable to Send Notification\n${line}`);
        }
      }

      var defaultStageId = 0;

      if (
        typeof parseInt(req.body.isLastStage) == "number" &&
        parseInt(req.body.isLastStage)
      ) {
        defaultStageId = 5;

        try {
          const processName = await commonController.getProcessNameOfFile(
            mst_file_id
          );
          if (processName.toLowerCase() == "online") {
            defaultStageId = 5;
          } else if (processName.toLowerCase() == "offline") {
            defaultStageId = 6;
          }
        } catch (err) {}

        commonController.updateMstFileStage(defaultStageId, mst_file_id);

        var sqlCheck =
          "SELECT *from `file_enagar_portal` WHERE  `mst_file_id`=" +
          mst_file_id +
          "";
        db.query(sqlCheck, (err, result) => {
          if (err) {
            console.log(err);
          } else if (result.length == 0) {
            commonController.initialEntry_to_enagar_portal(
              req.user.comp_id,
              mst_file_id,
              req.user.id
            );
          }
        });

        /*Sending Notification*/
        try {
          // const stage = await commonController.getStageStageId(1);
          // const fileData = await commonController.getMstFileByMstFileId(parseInt(mst_file_id));
          // notificationController.setNotification
          // (
          // 	JSON.stringify({message:`${stage[0]?.title} has been updated on ${fileData[0]?.file_name} by`,action:"Plot validation stage is completed",mst_file_id:parseInt(mst_file_id)}),
          // 	parseInt(req.body?.team_id),
          // 	parseInt(req?.user?.id),
          // 	parseInt(mst_file_id),
          // 	fileData[0]?.cus_id
          // );
        } catch (err) {
          console.log(err);
          console.log(`${line}Enable to Send Notification\n${line}`);
        }
      }

      defaultStageId
        ? res.status(201).json({
            error: false,
            message: "Changes saved",
            data: { newStageId: defaultStageId },
          })
        : res
            .status(201)
            .json({ error: false, message: "Changes saved", data: {} });
    } else {
      res.status(201).json({ error: true, message: "Invalid data", data: {} });
    }
  },


  get_file_plot_validation: (req, res) => {
    const mst_file_id = req.params.id;
    if (
      typeof mst_file_id != "undefined" &&
      typeof parseInt(mst_file_id) == "number"
    ) {
      var sql =
        "SELECT `tps_stage` FROM `file_details` WHERE `mst_file_id`=" +
        parseInt(mst_file_id) +
        "";

      db.query(sql, (err, stage) => {
        if (err) {
          console.log(err);
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else {
          const stageNo = parseInt(stage[0].tps_stage);
          if (stageNo === 1 || stageNo === 2) {
            var sql =
              "SELECT * FROM `mst_type` where `types`='plot_validation_draft' or `types`='plot_validation_final' ORDER BY `id` ASC";
            db.query(sql, (err, type_data) => {
              if (err) {
                console.log(err);
                res
                  .status(201)
                  .json({ error: true, message: err.sqlMessage, data: {} });
              } else {
                const typeList = type_data.filter((value) => {
                  return (
                    value.types.split("_")[2] ==
                    (stageNo === 1 ? "draft" : "final")
                  );
                });

                if (typeList.length) {
                  var sql =
                    "SELECT Count(is_rejected) as `total_row` from `file_plot_validation` where `is_rejected`=0 and `mst_file_id`=" +
                    parseInt(mst_file_id) +
                    "";
                  db.query(sql, (err, total_rows) => {
                    if (err) {
                      console.log(err);
                      res.status(201).json({
                        error: true,
                        message: err.sqlMessage,
                        data: {},
                      });
                    } else {
                      const totalRow = total_rows[0].total_row;
                      if (typeList.length * 2 === parseInt(totalRow)) {
                        //main query
                        var sql0 =
                          "SELECT MAX(`is_rejected`) as `is_zero` from `file_plot_validation` WHERE `mst_file_id`=" +
                          mst_file_id +
                          "";
                        // var sql1 = "SELECT `fpv`.*,concat(u.first_name,' ',u.last_name) as assign_name FROM `file_plot_validation` as `fpv` LEFT JOIN `users` as `u` ON `u`.`id`=`fpv`.`assign_to` LEFT JOIN `users_groups` as `ug` ON `ug`.`mst_user_id`=`u`.`id` LEFT JOIN `mst_groups` as `mg` ON `mg`.`id`=`ug`.`mst_group_id` WHERE `mg`.`name`='Employees' and `mst_file_id`="+mst_file_id+" having `fpv`.`is_rejected`=(SELECT MAX(`is_rejected`) from `file_plot_validation` WHERE `mst_file_id`="+mst_file_id+")";
                        // var sql2 = "SELECT `fpv`.*,concat(u.first_name,' ',u.last_name) as assign_name FROM `file_plot_validation` as `fpv` LEFT JOIN `users` as `u` ON `u`.`id`=`fpv`.`assign_to` LEFT JOIN `users_groups` as `ug` ON `ug`.`mst_user_id`=`u`.`id` LEFT JOIN `mst_groups` as `mg` ON `mg`.`id`=`ug`.`mst_group_id` WHERE `mg`.`name`='Employees' and `mst_file_id`="+mst_file_id+" having `fpv`.`is_rejected`=0";
                        // var sql1 = "SELECT `file_plot_validation`.*,concat(mst_employee.first_name,' ',mst_employee.last_name) as assign_name from `file_plot_validation` LEFT JOIN mst_employee on file_plot_validation.assign_to=mst_employee.id where `mst_file_id`="+mst_file_id+" having `file_plot_validation`.`is_rejected`=(SELECT MAX(`is_rejected`) from `file_plot_validation` where `mst_file_id`="+mst_file_id+")";
                        // var sql2 = "SELECT `file_plot_validation`.*,concat(mst_employee.first_name,' ',mst_employee.last_name) as assign_name from `file_plot_validation` LEFT JOIN mst_employee on file_plot_validation.assign_to=mst_employee.id where `mst_file_id`="+mst_file_id+" and `is_rejected`=0";

                        var sql1 =
                          "SELECT `fpv`.*,concat(u.first_name,' ',u.last_name) as assign_name FROM `file_plot_validation` as `fpv` LEFT JOIN `users` as `u` ON `u`.`id`=`fpv`.`assign_to` WHERE `mst_file_id`=" +
                          mst_file_id +
                          " having `fpv`.`is_rejected`=(SELECT MAX(`is_rejected`) from `file_plot_validation` WHERE `mst_file_id`=" +
                          mst_file_id +
                          ") order by `mst_type_id`,`type` asc";
                        var sql2 =
                          "SELECT `fpv`.*,concat(u.first_name,' ',u.last_name) as assign_name FROM `file_plot_validation` as `fpv` LEFT JOIN `users` as `u` ON `u`.`id`=`fpv`.`assign_to` WHERE `mst_file_id`=" +
                          mst_file_id +
                          " and `fpv`.`is_rejected`=0 order by `mst_type_id`,`type` asc";

                        db.query(
                          sql0 + ";" + sql1 + ";" + sql2,
                          (err, result, fields) => {
                            if (err) {
                              console.log(err);
                              res.status(201).json({
                                error: true,
                                message: err.sqlMessage,
                                data: {},
                              });
                            } else {
                              res.status(201).json({
                                error: false,
                                message: "Record fetched",
                                maxvalue: result[0][0].is_zero,
                                data1: result[1],
                                data2: result[2],
                              });
                            }
                          }
                        );
                      } else {
                        console.log(totalRow + "-" + typeList.length * 2);
                        res.status(201).json({
                          error: true,
                          message:
                            "1 Database error occured please do contact to Admin",
                          dberror: true,
                          data: {},
                        });
                      }
                    }
                  });
                } else {
                  res.status(201).json({
                    error: true,
                    message: "Something went wrong",
                    data: {},
                  });
                }
              }
            });
          } else {
            console.log(stage[0].tps_stage);
            res.status(201).json({
              error: true,
              message: "2 Database error occured please do contact to Admin",
              dberror: true,
              data: {},
            });
          }
        }
      });
    } else {
      res
        .status(201)
        .json({ error: true, message: "Invalid request", data: {} });
    }
  },
  reject_file_plot: async (req, res) => {
    req.assert("mst_file_id", "mst_file_id is required").notEmpty();

    var errors = req.validationErrors();

    if (errors) {
      res.status(201).json({ error: true, message: errors[0].msg, data: {} });
    } else {
      var data = {
        mst_file_id: parseInt(req.body.mst_file_id),
        reason: req?.body?.reason,
        is_rejected: 1,
        is_save: 0,
      };
      commonController.revertTeamToMstFile(
        data?.mst_file_id,
        async (teamId) => {
          commonController.Set_isReject_zero_file_plot_validation(
            data?.mst_file_id,
            data?.reason
          );
          commonController.add_file_plot_validation(data?.mst_file_id);
          console.log("Previous team_id: " + teamId);

          try {
            const fileData = await commonController.getMstFileByMstFileId(
              parseInt(data?.mst_file_id)
            );
            /*Sending Notification*/
            // notificationController.setNotification
            // (
            // 	JSON.stringify({message:`${fileData[0]?.file_name} has been rejected by`,action:"Plot validation certificate Rejected",mst_file_id:parseInt(data?.mst_file_id)}),
            // 	teamId,
            // 	parseInt(req?.user?.id),
            // 	parseInt(data?.mst_file_id),
            // 	fileData[0]?.cus_id
            // );
          } catch (err) {
            console.log(err);
            console.log(`${line}Error while sending the notification\n${line}`);
          }

          try {
            res.status(201).json({
              error: false,
              message: "Changes rejected",
              data: { team_id: teamId },
            });
          } catch (err) {
            console.log(err);
            res.status(201).json({
              error: false,
              message: "Changes rejected",
              data: { team_id: 0 },
            });
          }
        }
      );
    }
  },
  reject_enagar_portal: (req, res) => {
    // var mst_file_id = req.params.id;

    var mst_file_id = req?.body?.mst_file_id;
    var reason = req?.body?.reason;

    if (!mst_file_id) {
      res
        .status(201)
        .json({ error: true, message: "ID is required", data: {} });
    } else {
      var sql =
        "SELECT MAX(`is_rejected`) as `last_rejected_number` FROM `file_enagar_portal` where `mst_file_id`=" +
        parseInt(mst_file_id) +
        "";
      db.query(sql, (err, max) => {
        if (err) {
          console.log(err);
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else {
          var lastRejectedValue = parseInt(max[0].last_rejected_number);
          console.log("lastRejectedValue-" + lastRejectedValue);
          // var sql = "UPDATE `file_enagar_portal` SET `is_rejected`=?,`updated_by`=?,`updated_at`=? WHERE `mst_file_id`=? and `is_rejected`=0";
          // const data = [(lastRejectedValue + 1), parseInt(req.user.id), getCurrentDateAndTime(), parseInt(mst_file_id)];
          const data = {
            is_rejected: lastRejectedValue + 1,
            updated_by: req?.user?.id,
            reason: reason ? reason : null,
            updated_at: getCurrentDateAndTime(),
          };
          var sql =
            "UPDATE `file_enagar_portal` SET ? WHERE `mst_file_id`=" +
            mst_file_id +
            " and `is_rejected`=0";
          db.query(sql, data, async (err, result) => {
            if (err) {
              console.log(err);
              res
                .status(201)
                .json({ error: true, message: err.sqlMessage, data: {} });
            } else {
              commonController.initialEntry_to_enagar_portal(
                parseInt(req.user.comp_id),
                parseInt(mst_file_id),
                parseInt(req.user.id)
              );
              commonController.revertTeamToMstFile(
                parseInt(mst_file_id),
                async (teamId) => {
                  /*Sending Notification*/
                  try {
                    const fileData =
                      await commonController.getMstFileByMstFileId(
                        parseInt(mst_file_id)
                      );
                    // notificationController.setNotification
                    // (
                    // 	JSON.stringify({message:`${fileData[0]?.file_name} has been rejected by`,action:"Plot validation certificate Rejected",mst_file_id:parseInt(mst_file_id)}),
                    // 	teamId,
                    // 	parseInt(req?.user?.id),
                    // 	parseInt(mst_file_id),
                    // 	fileData[0]?.cus_id
                    // );
                  } catch (err) {
                    console.log(err);
                    console.log(
                      `${line}Error while sending the notification\n${line}`
                    );
                  }

                  try {
                    res.status(201).json({
                      error: false,
                      message: "Changes rejected",
                      data: { team_id: teamId },
                    });
                  } catch (err) {
                    console.log(err);
                    res.status(201).json({
                      error: false,
                      message: "Changes rejected",
                      data: { team_id: 0 },
                    });
                  }
                }
              );
            }
          });
        }
      });
    }
  },
  test: (req, res) => {
    console.log(req.file);
    console.log("------------");
    console.log(JSON.parse(req.body.plotData));
    res.status(201).json({ error: false, message: "Tested", data: {} });
  },
  get_document_upload: (req, res) => {
    try {
      const mst_file_id = parseInt(req.params.id);
      if (typeof mst_file_id == "number" && typeof mst_file_id != "undefined") {
        var sql =
          "SELECT `file_document_json` from `mst_file` where `id`=" +
          mst_file_id +
          "";
        db.query(sql, (err, result) => {
          if (err) {
            console.log(err);
            res
              .status(201)
              .json({ error: true, message: err.sqlMessage, data: {} });
          } else if (result.length > 0) {
            const obj = JSON.parse(result[0].file_document_json);

            const arr = [];
            for (let value of obj) {
              if (value?.checked) {
                arr.push(value?.mst_document_id);
              }
            }

            if (arr.length) {
              var sql0 =
                "SELECT * FROM `mst_document` where `id` in(" +
                arr.toString() +
                ")";
              var sql1 =
                "SELECT * FROM `file_document_upload` where `mst_file_id`=" +
                mst_file_id +
                " order by `id` ASC";
              db.query(sql0 + ";" + sql1, (err, result) => {
                if (err) {
                  console.log(err);
                  res
                    .status(201)
                    .json({ error: true, message: err.sqlMessage, data: {} });
                } else {
                  res.status(201).json({
                    error: false,
                    message: "Record found...",
                    data1: result[0],
                    data2: result[1],
                  });
                }
              });
            } else {
              res
                .status(201)
                .json({ error: true, message: "Not found", data: {} });
            }
          } else {
            res
              .status(201)
              .json({ error: true, message: "Not found", data: {} });
          }
        });
      } else {
        res
          .status(201)
          .json({ error: true, message: "Invalid request", data: {} });
      }
    } catch (err) {
      res.status(201).json({ error: true, message: "Request error", data: {} });
    }
  },
  skip_document_upload: (req, res) => {
    try {
      const mst_file_id = req.params?.id;

      var sql =
        "SELECT *FROM `file_document_upload` WHERE `id`=" + mst_file_id + "";

      db.query(sql, (err, result) => {
        if (err) {
          res
            .status(200)
            .json({ message: err.sqlMessage, error: true, data: {} });
        } else if (result.length > 0) {
          let updatedData = {
            is_skip: 1,
            is_save: 1,
            updated_at: getCurrentDateAndTime(),
            updated_by: req?.user?.id,
          };

          const shouldUpdateStage = result.some((r) => r?.is_skip == 1);

          var sql =
            "UPDATE `file_document_upload` SET ? WHERE `mst_file_id`=" +
            updatedData +
            "";

          db.query(sql, updatedData, (err, result) => {
            if (err) {
              res
                .status(200)
                .json({ message: err.sqlMessage, error: true, data: {} });
            } else {
              if (!shouldUpdateStage) {
                commonController.updateMstFileStage(8, mst_file_id);
              }

              res.status(200).json({
                message: skipStagesMessage(),
                error: false,
                data: { nextStage: shouldUpdateStage ? 1 : 0 },
              });
            }
          });
        } else {
          //Insert

          var sql =
            "SELECT `file_document_json` from `mst_file` where `id`=" +
            mst_file_id +
            "";

          db.query(sql, (err, result) => {
            if (err) {
              res
                .status(200)
                .json({ message: err.sqlMessage, error: true, data: {} });
            } else if (result.length > 0) {
              let data = [];

              const jsonObject = isValidJson(result[0]?.file_document_json);

              if (jsonObject != null) {
                for (const e in jsonObject) {
                  if (e?.checked) {
                    data.push({
                      mst_file_id: mst_file_id,
                      mst_document_id: e?.mst_document_id,
                      document_name: "",
                    });
                  }
                }
              } else {
                data.push({
                  mst_document_id: null,
                  mst_company_id: req?.user?.comp_id ? req?.user?.comp_id : 0,
                  document_name: "Google Image Link",
                  mst_file_id: mst_file_id,
                  show_website: 0,
                  document_path: "",
                  is_save: 1,
                  is_skip: 1,
                  created_at: getCurrentDateAndTime(),
                  created_by: req?.user?.id,
                });
              }
            } else {
              res
                .status(200)
                .json({ message: "Unable to skip", data: {}, error: true });
            }
          });

          // let data = {
          // 	mst_company_id:req?.user?.comp_id ? req?.user?.comp_id : 0,
          // 	mst_file_id : mst_file_id,

          // 	created_at : getCurrentDateAndTime(),
          // 	created_by : req?.user?.id
          // }
        }
      });
    } catch (err) {
      res.status(200).json({ message: "Server error", data: {}, error: true });
    }
  },
  document_upload: (req, res) => {
    console.log(req.files);

    const thisData = JSON.parse(req.body.document_upload);

    const mst_file_id = req.body.mst_file_id;
    const is_save = parseInt(req.body.is_save);

    console.log("Status-----" + is_save);

    const allFilesPath = [];
    const filesWithDocumentName = [];

    for (let file of req.files) {
      allFilesPath.push(getImageWithFoldername(file.path));
      filesWithDocumentName.push({
        fieldname: file.fieldname,
        path: getImageWithFoldername(file.path),
      });
    }

    console.log(allFilesPath);

    console.log(thisData);

    //if(1===2)
    if (typeof parseInt(mst_file_id) == "number") {
      for (let value of thisData) {
        let document_path = filesWithDocumentName.filter((element) => {
          if (element.fieldname.trim() === value.document_name.trim()) {
            return element;
          } else {
            return "";
          }
        });

        let data = {
          is_deleted: value.is_deleted,
          id: value.id,
          mst_company_id: req.user.comp_id ? parseInt(req.user.comp_id) : 1,
          mst_file_id: parseInt(mst_file_id),
          mst_document_id: value.mst_document_id,
          document_name: value.document_name,
          document_path: document_path.length ? document_path[0].path : "",
          show_website:
            typeof parseInt(value.show_website) == "number"
              ? parseInt(value.show_website)
              : 0,
          is_save: parseInt(is_save),
          created_by: parseInt(req.user.id),
          created_at: getCurrentDateAndTime(),
        };

        console.log(data);

        if (data.id) {
          let arrData = [];

          if (data.is_deleted) {
            module.exports.remove_document(data.id);
          } else {
            if (data.document_path) {
              var oldImage = "";
              var selectQuery =
                "SELECT * FROM `file_document_upload` WHERE `id`=" +
                parseInt(data.id) +
                "";

              db.query(selectQuery, (err, record) => {
                if (err) {
                  console.log(err);
                  oldImage = "";
                } else if (record.length) {
                  oldImage = record[0].document_path;
                }
              });

              var sql =
                "UPDATE `file_document_upload` SET `mst_company_id`=?,`mst_file_id`=?,`mst_document_id`=?,`document_name`=?,`show_website`=?,`document_path`=?,`is_save`=?,`updated_by`=?,`updated_at`=? WHERE `id`=" +
                parseInt(data.id) +
                "";
              arrData = [
                data.mst_company_id,
                data.mst_file_id,
                data.mst_document_id,
                data.document_name,
                data.show_website,
                data.document_path,
                data.is_save,
                data.created_by,
                data.created_at,
              ];
            } else {
              var sql =
                "UPDATE `file_document_upload` SET `mst_company_id`=?,`mst_file_id`=?,`mst_document_id`=?,`document_name`=?,`show_website`=?,`is_save`=?,`updated_by`=?,`updated_at`=? WHERE `id`=" +
                parseInt(data.id) +
                "";
              arrData = [
                data.mst_company_id,
                data.mst_file_id,
                data.mst_document_id,
                data.document_name,
                data.show_website,
                data.is_save,
                data.created_by,
                data.created_at,
              ];
            }

            db.query(sql, arrData, (err, result) => {
              if (err) {
                console.log(err);
                if (data.document_path) {
                  unlinkSingleImage(data.document_path);
                }
              } else {
                //uncomment the following line if you wanna delete the old image at updation time
                // if(oldImage) {unlinkSingleImage(oldImage)}
              }
            });
          }
        } else {
          delete data.is_deleted;
          var sql = "INSERT INTO `file_document_upload` SET ?";
          db.query(sql, data, (err, result) => {
            if (err) {
              console.log(err);
              if (data.document_path) {
                unlinkSingleImage(data.document_path);
              }
            }
          });
        }
      }

      if (typeof is_save == "number" && is_save) {
        commonController.updateMstFileStage(8, parseInt(mst_file_id));
      }

      res
        .status(201)
        .json({ error: false, message: "Changes saved!", data: {} });
    } else {
      if (allFilesPath.length) {
        unlinkMultipleImages(allFilesPath);
      }
      res
        .status(201)
        .json({ error: true, message: "Invalid request", data: {} });
    }
  },
  remove_document: (id) => {
    if (typeof id != "undefined") {
      var sql = "SELECT *FROM `file_document_upload` WHERE `id`=" + id + "";
      let document_path = "";
      db.query(sql, (err, result) => {
        if (err) {
          console.log(err);
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else if (result.length > 0) {
          var sql = "DELETE FROM `file_document_upload` WHERE `id`=" + id + "";
          document_path = result[0].document_path
            ? result[0].document_path
            : "";

          db.query(sql, (err, result) => {
            if (err) {
              console.log(err);
            } else {
              //uncomment the following line if you wanna delete the old image at updation time
              // if(document_path) { unlinkSingleImage(document_path) }
            }
          });
        }
      });
    }
  },
  remove_document_upload: (req, res) => {
    const id = parseInt(req.params.id);
    if (typeof id != "undefined") {
      var sql = "SELECT *FROM `file_document_upload` WHERE `id`=" + id + "";
      let document_path = "";
      db.query(sql, (err, result) => {
        if (err) {
          console.log(err);
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else if (result.length > 0) {
          var sql = "DELETE FROM `file_document_upload` WHERE `id`=" + id + "";
          document_path = result[0].document_path
            ? result[0].document_path
            : "";

          db.query(sql, (err, result) => {
            if (err) {
              console.log(err);
              res
                .status(201)
                .json({ error: true, message: err.sqlMessage, data: {} });
            } else {
              //uncomment the following line if you wanna delete the old image at updation time
              // if(document_path) { unlinkSingleImage(document_path) }
              res
                .status(201)
                .json({ error: false, message: "Removed!", data: {} });
            }
          });
        } else {
          res.status(201).json({
            error: true,
            message: "Record is already deleted or doesn't exist anymore",
            data: {},
          });
        }
      });
    } else {
      res
        .status(201)
        .json({ error: true, message: "Invalid request", data: {} });
    }
  },
  getMstFileCode: (req, res) => {
    try {
      var sql =
        "SELECT `id`,`title` FROM `mst_file_code` WHERE `is_deleted`=0 and `is_active`=1";

      db.query(sql, (err, result) => {
        if (err) {
          console.log(err);
          res
            .status(200)
            .json({ message: err.sqlMessage, error: true, data: [] });
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
      res.status(200).json({ message: "Server error", error: true, data: {} });
    }
  },
};
